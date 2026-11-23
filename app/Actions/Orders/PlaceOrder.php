<?php

namespace App\Actions\Orders;

use App\Actions\DigitalExperiences\StoreExperiencePhoto;
use App\Enums\ActivityType;
use App\Enums\DesignMode;
use App\Enums\ExperienceTemplate;
use App\Enums\OrderFileKind;
use App\Enums\OrderStatus;
use App\Http\Controllers\Account\ExperienceSectionController;
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
     * @param  list<UploadedFile>  $pagePhotos  Photos of the memory page designed on a demo
     * @param  list<UploadedFile>  $pageRainPhotos  Photos chosen on the demo to rain over the flowers
     * @param  UploadedFile|null  $pageVideo  A short video added to the page on the demo
     */
    public function handle(User $customer, array $data, array $photos, array $pagePhotos = [], array $pageRainPhotos = [], ?UploadedFile $pageVideo = null): Order
    {
        $product = Product::query()->whereKey($data['product_id'])->firstOrFail();
        $category = isset($data['category_id'])
            ? Category::query()->whereKey($data['category_id'])->firstOrFail()
            : $product->categories()->where('is_active', true)->orderBy('sort_order')->first();
        $template = isset($data['template_id']) ? Template::query()->whereKey($data['template_id'])->first() : null;
        $designMode = DesignMode::from($data['design_mode']);
        $personalizeLater = ! empty($data['personalize_later']);
        $quantity = (int) $data['quantity'];

        $pageTemplate = ExperienceTemplate::tryFrom((string) ($data['experience_template'] ?? ''))
            ?? ExperienceTemplate::forCategory($category?->slug);

        // "A Bouquet For You" already has the flowers; any other page design
        // can have them added for a fee.
        $withFlowers = ! empty($data['flower_addon']) && $pageTemplate !== ExperienceTemplate::DigitalBouquet;

        $promoCode = $this->resolvePromoCode($data['promo_code'] ?? null);
        $pricing = $this->priceOrder->handle($product, $data['option_ids'] ?? [], $quantity, $designMode, $promoCode, $customer, $data['customer_phone'], $withFlowers);

        $order = DB::transaction(function () use ($customer, $data, $category, $product, $template, $designMode, $personalizeLater, $quantity, $pricing, $promoCode, $pageTemplate, $withFlowers): Order {
            if ($promoCode !== null) {
                $this->redeem($promoCode, $customer, $data['customer_phone'], $pricing['subtotal']);
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
                'flowers_fee' => $pricing['flowers_fee'],
                'delivery_fee' => $pricing['delivery_fee'],
                'promo_code_id' => $promoCode?->id,
                'promo_code' => $promoCode?->code,
                'promo_identity' => $promoCode !== null ? PromoCode::customerIdentity($customer->email) : null,
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
                $experience = new DigitalExperience([
                    'template' => $pageTemplate,
                    'theme' => $pageTemplate->defaultTheme(),
                    'flower_addon' => $withFlowers,
                    'title' => $order->personalization['names'] ?? $product->name,
                    'song_title' => $order->personalization['song_title'] ?? null,
                    'song_artist' => $order->personalization['artist'] ?? null,
                    'message' => $order->personalization['message'] ?? null,
                    'event_date' => $order->personalization['date'] ?? null,
                    'photos' => [],
                    ...$this->designedPage($data['page'] ?? null, $withFlowers),
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

        $this->addPhotosToExperience($order, $pagePhotos, $photos, $pageRainPhotos);
        $this->addVideoToExperience($order, $pageVideo);

        return $order;
    }

    /**
     * The memory page the customer designed on a demo, limited to the fields
     * they could edit there. Text they cleared stays empty; the headline
     * falls back to the order's names when left blank. The spot chosen for
     * the flowers is kept only when the flowers add-on is being paid for.
     *
     * @return array<string, mixed>
     */
    private function designedPage(mixed $page, bool $withFlowers): array
    {
        if (! is_array($page)) {
            return [];
        }

        $textFields = ['title', 'subtitle', 'recipient_name', 'sender_name', 'message', 'quote', 'flowers_note', 'event_date', 'song_title', 'song_artist', 'music_url', 'video_url'];
        $choiceFields = ['flower_style', 'flower_rain', 'photo_rain_layer', 'song_ornament', 'song_background', 'video_frame'];
        $clean = fn (mixed $value): ?string => trim((string) $value) === '' ? null : trim((string) $value);

        $content = [];

        foreach ($textFields as $field) {
            if (array_key_exists($field, $page)) {
                $content[$field] = $clean($page[$field]);
            }
        }

        if (($content['title'] ?? null) === null) {
            unset($content['title']);
        }

        foreach ($choiceFields as $field) {
            if (filled($page[$field] ?? null)) {
                $content[$field] = $page[$field];
            }
        }

        if (is_array($page['moments'] ?? null)) {
            $content['moments'] = array_values(array_map(fn (array $moment): array => [
                'date' => $clean($moment['date'] ?? null),
                'title' => $clean($moment['title'] ?? null),
                'caption' => $clean($moment['caption'] ?? null),
                'photo' => is_numeric($moment['photo'] ?? null) ? (int) $moment['photo'] : null,
            ], $page['moments']));
        }

        if (is_array($page['custom_sections'] ?? null)) {
            $hasFlowers = false;
            $sections = array_filter($page['custom_sections'], function (array $section) use ($withFlowers, &$hasFlowers): bool {
                if (($section['type'] ?? null) !== ExperienceSectionController::FLOWERS) {
                    return true;
                }

                $keep = $withFlowers && ! $hasFlowers;
                $hasFlowers = true;

                return $keep;
            });

            $content['custom_sections'] = array_values(array_map(fn (array $section): array => [
                'id' => (string) $section['id'],
                'type' => (string) $section['type'],
                'position' => (int) $section['position'],
                'title' => $clean($section['title'] ?? null),
                'text' => $clean($section['text'] ?? null),
                'background' => filled($section['background'] ?? null) ? strtolower((string) $section['background']) : null,
                'slots' => array_values(array_map(fn (array $slot): array => [
                    'photo' => is_numeric($slot['photo'] ?? null) ? (int) $slot['photo'] : null,
                    'caption' => $clean($slot['caption'] ?? null),
                ], is_array($section['slots'] ?? null) ? $section['slots'] : [])),
            ], $sections));
        }

        return $content;
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
    private function redeem(PromoCode $promoCode, User $customer, string $phone, int $subtotal): void
    {
        $locked = PromoCode::query()->lockForUpdate()->findOrFail($promoCode->id);
        $reason = $locked->rejectionReason($subtotal, $customer, $phone);

        if ($reason !== null) {
            throw ValidationException::withMessages(['promo_code' => $reason]);
        }

        $locked->increment('uses');
    }

    /**
     * Keep the short video added to the page on the demo.
     */
    private function addVideoToExperience(Order $order, ?UploadedFile $video): void
    {
        $experience = $order->experience;

        if ($experience === null || $video === null) {
            return;
        }

        $path = $video->store("experiences/{$experience->id}/video", (string) config('taptale.uploads_disk'));

        if ($path !== false) {
            $experience->update(['video_path' => $path]);
        }
    }

    /**
     * Put the photos of the page designed on a demo, then the photos added
     * while ordering, on the memory page, so the tap page is ready the moment
     * the keepsake arrives. Moments and extra section slots keep pointing at
     * their own page photo, or lose it when that photo could not be read.
     * The photos chosen to rain over the flowers are kept on their own.
     *
     * @param  list<UploadedFile>  $pagePhotos
     * @param  list<UploadedFile>  $photos
     * @param  list<UploadedFile>  $rainPhotos
     */
    private function addPhotosToExperience(Order $order, array $pagePhotos, array $photos, array $rainPhotos): void
    {
        $experience = $order->experience;

        if ($experience === null) {
            return;
        }

        $paths = [];
        $storedPagePhotoIndexes = [];

        foreach ([...$pagePhotos, ...$photos] as $position => $photo) {
            if (count($paths) >= DigitalExperience::MAX_PHOTOS) {
                break;
            }

            $stored = $this->storeExperiencePhoto->handle($experience, $photo);

            if ($stored === false) {
                continue;
            }

            if ($position < count($pagePhotos)) {
                $storedPagePhotoIndexes[$position] = count($paths);
            }

            $paths[] = $stored;
        }

        $storedIndex = fn (mixed $photo): ?int => is_int($photo) ? ($storedPagePhotoIndexes[$photo] ?? null) : null;

        $moments = array_map(fn (array $moment): array => [
            ...$moment,
            'photo' => $storedIndex($moment['photo'] ?? null),
        ], $experience->moments ?? []);

        $sections = array_map(fn (array $section): array => [
            ...$section,
            'slots' => array_map(fn (array $slot): array => [
                ...$slot,
                'photo' => $storedIndex($slot['photo'] ?? null),
            ], $section['slots'] ?? []),
        ], $experience->custom_sections ?? []);

        $rainPaths = [];

        foreach (array_slice($rainPhotos, 0, DigitalExperience::MAX_RAIN_PHOTOS) as $photo) {
            $stored = $this->storeExperiencePhoto->handle($experience, $photo);

            if ($stored !== false) {
                $rainPaths[] = $stored;
            }
        }

        $experience->update([
            'photos' => $paths,
            'rain_photos' => $rainPaths,
            'moments' => $moments,
            'custom_sections' => $sections,
        ]);
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
