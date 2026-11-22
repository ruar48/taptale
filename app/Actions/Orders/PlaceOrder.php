<?php

namespace App\Actions\Orders;

use App\Actions\DigitalExperiences\StoreExperiencePhoto;
use App\Enums\ActivityType;
use App\Enums\DesignMode;
use App\Enums\ExperienceTemplate;
use App\Enums\OrderFileKind;
use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\DigitalExperience;
use App\Models\Order;
use App\Models\Product;
use App\Models\PromoCode;
use App\Models\Template;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PlaceOrder
{
    public function __construct(
        private PriceOrder $priceOrder,
        private StoreOrderFile $storeOrderFile,
        private StoreExperiencePhoto $storeExperiencePhoto,
    ) {}

    /**
     * Create a personalized order from the validated checkout data.
     *
     * @param  array<string, mixed>  $data
     * @param  list<UploadedFile>  $photos
     */
    public function handle(User $customer, array $data, array $photos): Order
    {
        $product = Product::query()->whereKey($data['product_id'])->firstOrFail();
        $category = isset($data['category_id'])
            ? Category::query()->whereKey($data['category_id'])->firstOrFail()
            : $product->categories()->where('is_active', true)->orderBy('sort_order')->first();
        $template = isset($data['template_id']) ? Template::query()->whereKey($data['template_id'])->first() : null;
        $designMode = DesignMode::from($data['design_mode']);
        $personalizeLater = ! empty($data['personalize_later']);
        $quantity = (int) $data['quantity'];

        $promoCode = $this->resolvePromoCode($data['promo_code'] ?? null);
        $pricing = $this->priceOrder->handle($product, $data['option_ids'] ?? [], $quantity, $designMode, $promoCode, $customer);

        $order = DB::transaction(function () use ($customer, $data, $category, $product, $template, $designMode, $personalizeLater, $quantity, $pricing, $promoCode): Order {
            if ($promoCode !== null) {
                $this->redeem($promoCode, $customer);
            }

            $order = $customer->orders()->create([
                'status' => OrderStatus::AwaitingPayment,
                'category_id' => $category?->id,
                'product_id' => $product->id,
                'template_id' => $template?->id,
                'product_name' => $product->name,
                'template_name' => $template?->name,
                'selected_options' => $pricing['selected_options'],
                'design_mode' => $designMode,
                'personalization' => $this->personalization($data['personalization'] ?? []),
                'preview_approved_at' => $designMode === DesignMode::SelfCustomized && ! $personalizeLater ? now() : null,
                'quantity' => $quantity,
                'unit_price' => $pricing['unit_price'],
                'subtotal' => $pricing['subtotal'],
                'customization_fee' => $pricing['customization_fee'],
                'delivery_fee' => $pricing['delivery_fee'],
                'promo_code_id' => $promoCode?->id,
                'promo_code' => $promoCode?->code,
                'discount' => $pricing['discount'],
                'total' => $pricing['total'],
                'customer_name' => $data['customer_name'],
                'customer_email' => $data['customer_email'],
                'customer_phone' => $data['customer_phone'],
                'address_line' => $data['address_line'],
                'city' => $data['city'],
                'province' => $data['province'],
                'postal_code' => $data['postal_code'],
                'customer_notes' => $data['customer_notes'] ?? null,
                'is_gift' => ! empty($data['is_gift']),
                'gift_message' => ! empty($data['is_gift']) && filled($data['gift_message'] ?? null) ? trim((string) $data['gift_message']) : null,
                'payment_method_id' => $data['payment_method_id'],
            ]);

            $order->recordActivity(
                ActivityType::Placed,
                match (true) {
                    $personalizeLater => 'Order placed. Add your photos and details from this page whenever you are ready — we will send your design for approval before anything is made.',
                    $designMode === DesignMode::SelfCustomized => 'Order placed. You approved your live design preview at checkout.',
                    default => 'Order placed. Our designers will prepare your design for approval after payment is verified.',
                },
                $customer,
            );

            if ($pricing['enables_digital_experience']) {
                $template = ExperienceTemplate::tryFrom((string) ($data['experience_template'] ?? ''))
                    ?? ExperienceTemplate::forCategory($category?->slug);

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

            // Nothing to pay (a 100% promo with free delivery): there is no
            // payment to wait for, so the order moves straight on.
            if ($order->total === 0) {
                $order->advanceAfterPayment();
            }

            return $order;
        });

        $kind = $designMode === DesignMode::SelfCustomized ? OrderFileKind::Photo : OrderFileKind::Reference;

        foreach ($photos as $photo) {
            $this->storeOrderFile->handle($order, $photo, $kind, $customer);
        }

        $this->addPhotosToExperience($order, $photos);

        return $order;
    }

    /**
     * The promo code the customer entered, if any.
     *
     * @throws ValidationException
     */
    private function resolvePromoCode(mixed $code): ?PromoCode
    {
        if (! is_string($code) || trim($code) === '') {
            return null;
        }

        return PromoCode::findByCode($code)
            ?? throw ValidationException::withMessages(['promo_code' => 'This promo code does not exist.']);
    }

    /**
     * Take one use of the code, re-checking its limits under a row lock so
     * two simultaneous checkouts cannot both take the last use, and one
     * customer cannot use the code twice by submitting twice at once.
     *
     * @throws ValidationException
     */
    private function redeem(PromoCode $promoCode, User $customer): void
    {
        $locked = PromoCode::query()->lockForUpdate()->findOrFail($promoCode->id);

        if ($locked->wasUsedBy($customer)) {
            throw ValidationException::withMessages(['promo_code' => 'You have already used this promo code.']);
        }

        if ($locked->max_uses !== null && $locked->heldUses() >= $locked->max_uses) {
            throw ValidationException::withMessages(['promo_code' => 'This promo code has been fully used.']);
        }

        $locked->increment('uses');
    }

    /**
     * Put the photos added while ordering on the memory page as well, so the
     * tap page is ready the moment the keepsake arrives.
     *
     * @param  list<UploadedFile>  $photos
     */
    private function addPhotosToExperience(Order $order, array $photos): void
    {
        $experience = $order->experience;

        if ($experience === null || $photos === []) {
            return;
        }

        $paths = [];

        foreach (array_slice($photos, 0, DigitalExperience::MAX_PHOTOS) as $photo) {
            $stored = $this->storeExperiencePhoto->handle($experience, $photo);

            if ($stored !== false) {
                $paths[] = $stored;
            }
        }

        $experience->update(['photos' => $paths]);
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
