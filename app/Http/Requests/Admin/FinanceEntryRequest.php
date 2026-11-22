<?php

namespace App\Http\Requests\Admin;

use App\Concerns\ConvertsPesos;
use App\Enums\ExpenseCategory;
use App\Enums\FinanceEntryType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FinanceEntryRequest extends FormRequest
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
            'type' => ['required', Rule::enum(FinanceEntryType::class)],
            'category' => [
                Rule::requiredIf($this->input('type') === FinanceEntryType::Expense->value),
                'nullable',
                Rule::enum(ExpenseCategory::class),
            ],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:100000000'],
            'description' => ['required', 'string', 'max:160'],
            'occurred_on' => ['required', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:2000'],
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
            'category.required' => 'Choose what the expense was for.',
            'occurred_on.before_or_equal' => 'The date cannot be in the future.',
        ];
    }

    /**
     * The attributes to persist on the entry, with the amount in centavos.
     * Only expenses carry a category.
     *
     * @return array<string, mixed>
     */
    public function entryData(): array
    {
        $data = $this->validated();
        $data['amount'] = $this->toCentavos($data['amount']);

        if ($data['type'] !== FinanceEntryType::Expense->value) {
            $data['category'] = null;
        }

        return $data;
    }
}
