<?php

namespace App\Actions\Orders;

use App\Concerns\ConvertsPesos;
use App\Enums\ActivityType;
use App\Enums\DesignMode;
use App\Enums\ExperienceTemplate;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Models\DigitalExperience;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Creates an order the studio took for a customer outside the online shop: a
 * walk-in, or someone who ordered over Messenger. The order belongs to no
 * account; the studio designs it and shares an approval link with the
 * customer so they can approve the design.
 */
class CreateManualOrder
{
    use ConvertsPesos;

    public function __construct(private PriceOrder $priceOrder) {}

    /**
     * @param  array<string, mixed>  $data  Validated by StoreManualOrderRequest
     *
     * @throws ValidationException
     */
    public function handle(User $admin, array $data): Order
    {
        $product = Product::query()->findOrFail($data['product_id']);
        $category = $product->categories()->where('is_active', true)->orderBy('sort_order')->first();
        $channel = OrderChannel::from($data['channel']);
        $paymentMethod = isset($data['payment_method_id']) ? PaymentMethod::query()->find($data['payment_method_id']) : null;

        $pricing = $this->priceOrder->handle($product, $data['option_ids'] ?? [], (int) $data['quantity'], DesignMode::TaptaleDesigned);

        $customizationFee = ! empty($data['charge_design_fee']) ? $pricing['customization_fee'] : 0;
        $deliveryFee = $this->toCentavos($data['delivery_fee']);
        $personalization = $this->personalization($data['personalization'] ?? []);

        return DB::transaction(function () use ($admin, $data, $product, $category, $channel, $paymentMethod, $pricing, $customizationFee, $deliveryFee, $personalization): Order {
            $order = new Order([
                'channel' => $channel,
                'status' => OrderStatus::AwaitingPayment,
                'category_id' => $category?->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'selected_options' => $pricing['selected_options'],
                'design_mode' => DesignMode::TaptaleDesigned,
                'personalization' => $personalization,
                'quantity' => (int) $data['quantity'],
                'unit_price' => $pricing['unit_price'],
                'subtotal' => $pricing['subtotal'],
                'customization_fee' => $customizationFee,
                'flowers_fee' => 0,
                'delivery_fee' => $deliveryFee,
                'discount' => 0,
                'customer_name' => trim((string) $data['customer_name']),
                'customer_email' => trim((string) ($data['customer_email'] ?? '')),
                'customer_phone' => trim((string) ($data['customer_phone'] ?? '')),
                'address_line' => trim((string) ($data['address_line'] ?? '')),
                'city' => trim((string) ($data['city'] ?? '')),
                'province' => trim((string) ($data['province'] ?? '')),
                'postal_code' => trim((string) ($data['postal_code'] ?? '')),
                'customer_notes' => filled($data['customer_notes'] ?? null) ? trim((string) $data['customer_notes']) : null,
                'payment_method_id' => $paymentMethod?->id,
            ]);
            $order->recalculateTotal();
            $order->approval_token = Str::random(40);
            $order->save();

            $order->recordActivity(
                ActivityType::Placed,
                "Order taken by the studio ({$channel->label()}).",
                $admin,
            );

            if ($pricing['enables_digital_experience']) {
                $template = ExperienceTemplate::forCategory($category?->slug);

                $order->experience()->save(new DigitalExperience([
                    'template' => $template,
                    'theme' => $template->defaultTheme(),
                    'title' => $personalization['names'] ?? $product->name,
                    'message' => $personalization['message'] ?? null,
                    'event_date' => $personalization['date'] ?? null,
                    'photos' => [],
                ]));
            }

            if (! empty($data['is_paid']) && $order->total > 0) {
                $order->payments()->create([
                    'kind' => PaymentKind::Payment,
                    'status' => PaymentStatus::Verified,
                    'amount' => $order->total,
                    'notes' => 'Paid when the order was taken.',
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                    'payment_method_id' => $paymentMethod?->id,
                ]);
                $order->recordActivity(ActivityType::PaymentVerified, 'Payment received. Thank you!', $admin);
                $order->advanceAfterPayment($admin);
            } elseif ($order->total === 0) {
                $order->advanceAfterPayment($admin);
            } elseif ($paymentMethod?->isCashOnDelivery() === true) {
                $order->moveTo(OrderStatus::PendingDesign, $admin, 'Cash on delivery: please have the exact amount ready for the courier when your gift arrives.');
            }

            return $order;
        });
    }

    /**
     * Keep only the filled-in personalization fields.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, string>
     */
    private function personalization(array $input): array
    {
        return collect(['names', 'date', 'message', 'design_brief'])
            ->mapWithKeys(fn (string $field): array => [$field => trim((string) ($input[$field] ?? ''))])
            ->filter(fn (string $value): bool => $value !== '')
            ->all();
    }
}
