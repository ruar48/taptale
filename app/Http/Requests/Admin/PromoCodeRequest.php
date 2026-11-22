<?php

namespace App\Http\Requests\Admin;

use App\Enums\DiscountType;
use App\Models\PromoCode;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PromoCodeRequest extends FormRequest
{
    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => PromoCode::normalize((string) $this->input('code')),
        ]);
    }

    /**
     * Get the validation rules that apply to the request. Amounts are in
     * pesos here and stored in centavos.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var PromoCode|null $promoCode */
        $promoCode = $this->route('promoCode');
        $isPercent = $this->input('discount_type') === DiscountType::Percent->value;

        return [
            'code' => ['required', 'string', 'max:40', 'regex:/^[A-Z0-9_-]+$/', Rule::unique('promo_codes', 'code')->ignore($promoCode)],
            'description' => ['nullable', 'string', 'max:255'],
            'discount_type' => ['required', Rule::enum(DiscountType::class)],
            'discount_value' => $isPercent
                ? ['required', 'integer', 'min:1', 'max:100']
                : ['required', 'numeric', 'min:1', 'max:1000000'],
            'min_subtotal' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'max_uses' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['boolean'],
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
            'code.regex' => 'Use only letters, numbers, dashes and underscores.',
        ];
    }
}
