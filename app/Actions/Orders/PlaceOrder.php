<?php

namespace App\Actions\Orders;

use App\Enums\ActivityType;
use App\Enums\DesignMode;
use App\Enums\ExperienceTemplate;
use App\Enums\OrderFileKind;
use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\DigitalExperience;
use App\Models\Order;
use App\Models\Product;
use App\Models\Template;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class PlaceOrder
{
    public function __construct(
        private PriceOrder $priceOrder,
        private StoreOrderFile $storeOrderFile,
    ) {}

    /**
     * Create a personalized order from the validated checkout data.
     *
     * @param  array<string, mixed>  $data
     * @param  list<UploadedFile>  $photos
     */
    public function handle(User $customer, array $data, array $photos): Order
    {
        $category = Category::query()->whereKey($data['category_id'])->firstOrFail();
        $product = Product::query()->whereKey($data['product_id'])->firstOrFail();
        $template = isset($data['template_id']) ? Template::query()->whereKey($data['template_id'])->first() : null;
        $designMode = DesignMode::from($data['design_mode']);
        $quantity = (int) $data['quantity'];

        $pricing = $this->priceOrder->handle($product, $data['option_ids'] ?? [], $quantity, $designMode);

        $order = DB::transaction(function () use ($customer, $data, $category, $product, $template, $designMode, $quantity, $pricing): Order {
            $order = $customer->orders()->create([
                'status' => OrderStatus::AwaitingPayment,
                'category_id' => $category->id,
                'product_id' => $product->id,
                'template_id' => $template?->id,
                'product_name' => $product->name,
                'template_name' => $template?->name,
                'selected_options' => $pricing['selected_options'],
                'design_mode' => $designMode,
                'personalization' => $this->personalization($data['personalization'] ?? []),
                'preview_approved_at' => $designMode === DesignMode::SelfCustomized ? now() : null,
                'quantity' => $quantity,
                'unit_price' => $pricing['unit_price'],
                'subtotal' => $pricing['subtotal'],
                'customization_fee' => $pricing['customization_fee'],
                'delivery_fee' => $pricing['delivery_fee'],
                'total' => $pricing['total'],
                'customer_name' => $data['customer_name'],
                'customer_email' => $data['customer_email'],
                'customer_phone' => $data['customer_phone'],
                'address_line' => $data['address_line'],
                'city' => $data['city'],
                'province' => $data['province'],
                'postal_code' => $data['postal_code'],
                'customer_notes' => $data['customer_notes'] ?? null,
                'payment_method_id' => $data['payment_method_id'],
            ]);

            $order->recordActivity(
                ActivityType::Placed,
                $designMode === DesignMode::SelfCustomized
                    ? 'Order placed. You approved your live design preview at checkout.'
                    : 'Order placed. Our designers will prepare your design for approval after payment is verified.',
                $customer,
            );

            if ($pricing['enables_digital_experience']) {
                $template = ExperienceTemplate::forCategory($category->slug);

                $experience = new DigitalExperience([
                    'template' => $template,
                    'theme' => $template->defaultTheme(),
                    'title' => $order->personalization['names'] ?? $product->name,
                    'song_title' => $order->personalization['song_title'] ?? null,
                    'song_artist' => $order->personalization['artist'] ?? null,
                    'message' => $order->personalization['message'] ?? null,
                    'event_date' => $order->personalization['date'] ?? null,
                    'photos' => [],
                ]);
                $experience->user()->associate($customer);
                $order->experience()->save($experience);
            }

            if (! empty($data['save_details'])) {
                $customer->update([
                    'phone' => $data['customer_phone'],
                    'address_line' => $data['address_line'],
                    'city' => $data['city'],
                    'province' => $data['province'],
                    'postal_code' => $data['postal_code'],
                ]);
            }

            return $order;
        });

        $kind = $designMode === DesignMode::SelfCustomized ? OrderFileKind::Photo : OrderFileKind::Reference;

        foreach ($photos as $photo) {
            $this->storeOrderFile->handle($order, $photo, $kind, $customer);
        }

        return $order;
    }

    /**
     * Keep only the known personalization fields.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, string>
     */
    private function personalization(array $input): array
    {
        $fields = ['names', 'date', 'message', 'song_title', 'artist', 'color', 'design_brief', 'instructions'];

        return collect($fields)
            ->mapWithKeys(fn (string $field): array => [$field => isset($input[$field]) ? trim((string) $input[$field]) : ''])
            ->filter(fn (string $value): bool => $value !== '')
            ->all();
    }
}
