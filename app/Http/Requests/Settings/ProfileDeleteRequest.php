<?php

namespace App\Http\Requests\Settings;

use App\Concerns\PasswordValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ProfileDeleteRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'password' => $this->currentPasswordRules(),
        ];
    }

    /**
     * Get the "after" validation callables for the request.
     *
     * Deleting a user deletes their orders, payments, design proofs and
     * memory pages with them. A shop must keep its order and payment records,
     * and a recipient's keepsake must keep working, so customers who have
     * ordered ask the studio instead (which can remove personal details while
     * keeping the records).
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isEmpty() && $this->user()->orders()->exists()) {
                    $validator->errors()->add('password', 'Your account has orders, so it can\'t be deleted here. Please contact us and we will remove your personal details for you.');
                }
            },
        ];
    }
}
