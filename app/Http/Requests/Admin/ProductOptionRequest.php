<?php

namespace App\Http\Requests\Admin;

use App\Concerns\ConvertsPesos;
use App\Enums\OptionGroup;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductOptionRequest extends FormRequest
{
    use ConvertsPesos;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'group' => ['required', Rule::enum(OptionGroup::class)],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'price_modifier' => ['required', 'numeric', 'min:-100000', 'max:100000'],
            'swatch' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'enables_digital_experience' => ['boolean'],
            'is_default' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:10000'],
        ];
    }

    /**
     * The attributes to persist, with the price modifier in centavos.
     *
     * @return array<string, mixed>
     */
    public function optionData(): array
    {
        $data = $this->validated();
        $data['price_modifier'] = $this->toCentavos($data['price_modifier']);

        return $data;
    }
}
