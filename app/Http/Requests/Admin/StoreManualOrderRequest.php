<?php

namespace App\Http\Requests\Admin;

use App\Enums\ExperienceTemplate;
use App\Enums\OrderChannel;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * An order the studio takes for a walk-in or chat customer. Only a name and a
 * way to reach the customer are required; the address can be left out for
 * pickups. Amounts are in pesos here and stored in centavos.
 */
class StoreManualOrderRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'channel' => ['required', Rule::in(array_column(OrderChannel::manualOptions(), 'value'))],
            'product_id' => ['required', 'integer', Rule::exists('products', 'id')],
            'experience_template' => ['required', Rule::enum(ExperienceTemplate::class)],
            'option_ids' => ['array'],
            'option_ids.*' => ['integer'],
            'quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            'charge_design_fee' => ['boolean'],
            'delivery_fee' => ['required', 'numeric', 'min:0', 'max:100000'],
            'personalization' => ['array'],
            'personalization.names' => ['nullable', 'string', 'max:120'],
            'personalization.date' => ['nullable', 'string', 'max:60'],
            'personalization.message' => ['nullable', 'string', 'max:500'],
            'personalization.design_brief' => ['nullable', 'string', 'max:2000'],
            'customer_name' => ['required', 'string', 'max:120'],
            'customer_phone' => ['nullable', 'string', 'max:40', 'required_without:customer_email'],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'address_line' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'province' => ['nullable', 'string', 'max:120'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'customer_notes' => ['nullable', 'string', 'max:2000'],
            'payment_method_id' => ['nullable', 'integer', Rule::exists('payment_methods', 'id')],
            'is_paid' => ['boolean'],
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
            'customer_phone.required_without' => 'Add a phone number or an email so you can reach the customer.',
            'product_id.required' => 'Please choose a product.',
            'experience_template.required' => 'Please choose a website template.',
        ];
    }
}
