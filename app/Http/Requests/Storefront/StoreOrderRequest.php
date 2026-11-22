<?php

namespace App\Http\Requests\Storefront;

use App\Enums\DesignMode;
use App\Enums\ExperienceTemplate;
use App\Models\Category;
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

            'customer_name' => ['required', 'string', 'max:120'],
            'customer_email' => ['required', 'email', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:32', 'regex:/^[0-9+()\-\s]{7,32}$/'],
            'address_line' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:120'],
            'province' => ['required', 'string', 'max:120'],
            'postal_code' => ['required', 'string', 'max:16'],
            'customer_notes' => ['nullable', 'string', 'max:2000'],
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
            'customer_phone.regex' => 'Please enter a valid contact number.',
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
            'payment_method_id' => 'payment method',
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
