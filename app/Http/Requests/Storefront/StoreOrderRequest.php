<?php

namespace App\Http\Requests\Storefront;

use App\Enums\DesignMode;
use App\Enums\ExperienceTemplate;
use App\Enums\FlowerRain;
use App\Enums\FlowerStyle;
use App\Enums\OrderStatus;
use App\Enums\PhotoRainLayer;
use App\Http\Controllers\Account\ExperienceSectionController;
use App\Http\Controllers\Account\ExperienceVideoController;
use App\Models\Category;
use App\Models\DigitalExperience;
use App\Models\Product;
use App\Models\Template;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\Validator;

class StoreOrderRequest extends FormRequest
{
    private ?Product $resolvedProduct = null;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $product = $this->product();
        $isSelf = $this->input('design_mode') === DesignMode::SelfCustomized->value;
        $later = $this->boolean('personalize_later');

        return [
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('is_active', true)],
            'product_id' => ['required', 'integer', Rule::exists('products', 'id')->where('is_active', true)],
            'template_id' => [Rule::requiredIf($isSelf && ! $later), 'nullable', 'integer', Rule::exists('templates', 'id')->where('is_active', true)],
            'design_mode' => ['required', Rule::enum(DesignMode::class)],
            'option_ids' => ['array'],
            'option_ids.*' => ['integer'],
            'quantity' => ['required', 'integer', 'min:'.($product->min_quantity ?? 1), 'max:'.($product->max_quantity ?? 500)],

            'personalization' => ['array'],
            'personalization.names' => [Rule::requiredIf($isSelf && ! $later), 'nullable', 'string', 'max:120'],
            'personalization.date' => ['nullable', 'string', 'max:60'],
            'personalization.message' => ['nullable', 'string', 'max:300'],
            'personalization.song_title' => ['nullable', 'string', 'max:80'],
            'personalization.artist' => ['nullable', 'string', 'max:80'],
            'personalization.color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'personalization.design_brief' => [Rule::requiredIf(! $isSelf && ! $later), 'nullable', 'string', 'max:2000'],
            'personalization.instructions' => ['nullable', 'string', 'max:2000'],

            'photos' => ['array', 'max:'.max(1, $product->max_photos ?? 3)],
            'photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max((int) config('taptale.max_upload_kilobytes'))],
            'approve_preview' => [Rule::excludeIf(! $isSelf || $later), 'accepted'],
            'personalize_later' => ['boolean'],
            'experience_template' => ['nullable', Rule::enum(ExperienceTemplate::class)],
            'flower_addon' => ['boolean'],

            /*
             * The memory page the customer edited on a demo before ordering.
             * Its photos stayed in their browser until now.
             */
            'page' => ['nullable', 'array'],
            'page.title' => ['nullable', 'string', 'max:120'],
            'page.subtitle' => ['nullable', 'string', 'max:160'],
            'page.recipient_name' => ['nullable', 'string', 'max:80'],
            'page.sender_name' => ['nullable', 'string', 'max:80'],
            'page.message' => ['nullable', 'string', 'max:5000'],
            'page.quote' => ['nullable', 'string', 'max:255'],
            'page.flowers_note' => ['nullable', 'string', 'max:500'],
            'page.event_date' => ['nullable', 'string', 'max:60'],
            'page.song_title' => ['nullable', 'string', 'max:120'],
            'page.song_artist' => ['nullable', 'string', 'max:120'],
            'page.music_url' => ['nullable', 'url:https', 'max:500'],
            'page.video_url' => ['nullable', 'url:https', 'max:500'],
            'page.flower_style' => ['nullable', Rule::enum(FlowerStyle::class)],
            'page.flower_rain' => ['nullable', Rule::enum(FlowerRain::class)],
            'page.photo_rain_layer' => ['nullable', Rule::enum(PhotoRainLayer::class)],
            'page.song_ornament' => ['nullable', 'string', 'in:none,hearts'],
            'page.song_background' => ['nullable', 'string', 'in:theme,hearts'],
            'page.moments' => ['array', 'max:'.DigitalExperience::MAX_MOMENTS],
            'page.moments.*.date' => ['nullable', 'string', 'max:60'],
            'page.moments.*.title' => ['nullable', 'string', 'max:80'],
            'page.moments.*.caption' => ['nullable', 'string', 'max:300'],
            'page.moments.*.photo' => ['nullable', 'integer', 'min:0'],
            'page.custom_sections' => ['array', 'max:'.DigitalExperience::MAX_CUSTOM_SECTIONS],
            'page.custom_sections.*.id' => ['required', 'string', 'regex:/^[a-z0-9]{1,20}$/', 'distinct'],
            'page.custom_sections.*.type' => ['required', Rule::in(array_keys(ExperienceSectionController::TYPES))],
            'page.custom_sections.*.position' => ['required', 'integer', 'min:0', 'max:50'],
            'page.custom_sections.*.title' => ['nullable', 'string', 'max:80'],
            'page.custom_sections.*.text' => ['nullable', 'string', 'max:2000'],
            'page.custom_sections.*.background' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'page.custom_sections.*.slots' => ['array', 'max:'.DigitalExperience::MAX_SECTION_SLOTS],
            'page.custom_sections.*.slots.*.photo' => ['nullable', 'integer', 'min:0'],
            'page.custom_sections.*.slots.*.caption' => ['nullable', 'string', 'max:80'],
            'page_photos' => ['array', 'max:'.DigitalExperience::MAX_PHOTOS],
            'page_photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max((int) config('taptale.max_upload_kilobytes'))],
            'page_rain_photos' => ['array', 'max:'.DigitalExperience::MAX_RAIN_PHOTOS],
            'page_rain_photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max((int) config('taptale.max_upload_kilobytes'))],
            'page_video' => ExperienceVideoController::rules(required: false),

            'customer_name' => ['required', 'string', 'max:120'],
            'customer_email' => ['required', 'email', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:32', 'regex:/^[0-9+()\-\s]{7,32}$/'],
            'address_line' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:120'],
            'province' => ['required', 'string', 'max:120'],
            'postal_code' => ['required', 'string', 'max:16'],
            'customer_notes' => ['nullable', 'string', 'max:2000'],
            'is_gift' => ['boolean'],
            'gift_message' => ['nullable', 'string', 'max:300'],
            'promo_code' => ['nullable', 'string', 'max:40'],
            'payment_method_id' => ['required', 'integer', Rule::exists('payment_methods', 'id')->where('is_active', true)],
            'save_details' => ['boolean'],
        ];
    }

    /**
     * Get the "after" validation callables for the request.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $this->user()->hasVerifiedEmail()) {
                    $validator->errors()->add('email_verification', 'Please confirm your email address before placing your order.');
                }
            },
            function (Validator $validator): void {
                // Every order still in the payment stage counts, including one
                // whose receipt is waiting to be checked: a ₱1 junk receipt
                // must not free a slot for another unpaid order.
                $limit = (int) config('taptale.max_unpaid_orders');
                $unpaid = $this->user()->orders()->whereIn('status', OrderStatus::paymentStage())->count();

                if ($limit > 0 && $unpaid >= $limit) {
                    $validator->errors()->add('order', "You have {$unpaid} orders waiting for payment. Please pay for or cancel one of them before placing another.");

                    return;
                }

                // Cancelled orders count too, so placing and cancelling over
                // and over cannot get around the cap above.
                $dailyLimit = (int) config('taptale.max_orders_per_day');
                $placedToday = $this->user()->orders()->where('created_at', '>=', now()->subDay())->count();

                if ($dailyLimit > 0 && $placedToday >= $dailyLimit) {
                    $validator->errors()->add('order', "You have placed {$placedToday} orders in the last 24 hours. Please try again tomorrow, or contact us if you need a bigger order.");
                }
            },
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['category_id', 'product_id', 'template_id'])) {
                    return;
                }

                $product = $this->product();
                $category = $this->filled('category_id') ? Category::find($this->integer('category_id')) : null;

                if ($product === null) {
                    return;
                }

                if ($category !== null && ! $product->categories()->whereKey($category->id)->exists()) {
                    $validator->errors()->add('product_id', 'This product is not available in the selected category.');

                    return;
                }

                if ($this->filled('template_id')) {
                    $isAvailable = Template::active()
                        ->availableFor($category, $product)
                        ->whereKey($this->integer('template_id'))
                        ->exists();

                    if (! $isAvailable) {
                        $validator->errors()->add('template_id', 'This template is not available for the selected product.');
                    }
                }
            },
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'template_id.required' => 'Please choose a template for your design.',
            'personalization.names.required' => 'Please enter the names to feature on your design.',
            'personalization.design_brief.required' => 'Please describe the design you would like us to create.',
            'approve_preview.accepted' => 'Please approve your design preview before placing the order.',
            'photos.max' => 'You can upload up to :max photos for this product.',
            'page_photos.max' => 'Your memory page can hold up to :max photos.',
            'page_rain_photos.max' => 'Up to :max photos can rain down on your page.',
            'page.custom_sections.max' => 'Your page can have at most :max extra sections.',
            'customer_phone.regex' => 'Please enter a valid contact number.',
            ...ExperienceVideoController::messages('page_video'),
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'photos.*' => 'photo',
            'page_photos.*' => 'page photo',
            'page_rain_photos.*' => 'raining photo',
            'payment_method_id' => 'payment method',
            'gift_message' => 'gift message',
            'personalization.message' => 'message',
            'personalization.date' => 'date',
            'personalization.song_title' => 'song title',
            'personalization.artist' => 'artist',
        ];
    }

    /**
     * The product being ordered, if it exists.
     */
    public function product(): ?Product
    {
        return $this->resolvedProduct ??= Product::find($this->integer('product_id'));
    }
}
