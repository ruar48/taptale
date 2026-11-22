<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\PromoCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Checks a promo code in the order wizard so the customer sees the discount
 * before placing the order. The order itself re-checks the code.
 */
class PromoCodeController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:40'],
            'subtotal' => ['required', 'integer', 'min:0'],
        ]);

        $promoCode = PromoCode::findByCode($validated['code']);
        $reason = $promoCode === null
            ? 'This promo code does not exist.'
            : $promoCode->rejectionReason((int) $validated['subtotal'], $request->user());

        if ($reason !== null) {
            throw ValidationException::withMessages(['code' => $reason]);
        }

        return response()->json([
            'code' => $promoCode->code,
            'description' => $promoCode->description,
            'discount_type' => $promoCode->discount_type->value,
            'discount_value' => $promoCode->discount_value,
            'min_subtotal' => $promoCode->min_subtotal,
        ]);
    }
}
