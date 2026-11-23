<?php

namespace App\Http\Requests\Admin;

use App\Concerns\ConvertsPesos;
use App\Models\Product;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    use ConvertsPesos;

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'slug' => Str::slug((string) ($this->input('slug') ?: $this->input('name'))),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Product|null $product */
        $product = $this->route('product');

        return [
            'name' => ['required', 'string', 'max:160'],
            'slug' => ['required', 'string', 'max:180', Rule::unique('products', 'slug')->ignore($product)],
            'short_description' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'art_style' => ['required', Rule::in(Product::ART_STYLES)],
            'base_price' => ['required', 'numeric', 'min:0', 'max:1000000'],
            'design_fee' => ['required', 'numeric', 'min:0', 'max:1000000'],
            'production_days_min' => ['required', 'integer', 'min:1', 'max:90'],
            'production_days_max' => ['required', 'integer', 'gte:production_days_min', 'max:120'],
            'min_quantity' => ['required', 'integer', 'min:1', 'max:10000'],
            'max_quantity' => ['required', 'integer', 'gte:min_quantity', 'max:100000'],
            'max_photos' => ['required', 'integer', 'min:1', 'max:10'],
            'has_digital_experience' => ['boolean'],
            'is_active' => ['boolean'],
            'is_featured' => ['boolean'],
            'is_bestseller' => ['boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:10000'],
            'category_ids' => ['required', 'array', 'min:1'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
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
            'category_ids.required' => 'Assign the product to at least one category.',
        ];
    }

    /**
     * The attributes to persist on the product, with prices in centavos.
     *
     * @return array<string, mixed>
     */
    public function productData(): array
    {
        $data = $this->safe()->except(['category_ids']);
        $data['base_price'] = $this->toCentavos($data['base_price']);
        $data['design_fee'] = $this->toCentavos($data['design_fee']);

        return $data;
    }
}
