<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\ConvertsPesos;
use App\Enums\DiscountType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PromoCodeRequest;
use App\Models\PromoCode;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class PromoCodeController extends Controller
{
    use ConvertsPesos;

    /**
     * List promo codes, newest first.
     */
    public function index(): Response
    {
        return Inertia::render('admin/promo-codes/index', [
            'promoCodes' => PromoCode::query()->latest()->latest('id')->get()->map(fn (PromoCode $promoCode): array => [
                'id' => $promoCode->id,
                'code' => $promoCode->code,
                'description' => $promoCode->description,
                'discount_type' => $promoCode->discount_type->value,
                'discount_value' => $promoCode->discount_value,
                'min_subtotal' => $promoCode->min_subtotal,
                'max_uses' => $promoCode->max_uses,
                'uses' => $promoCode->uses,
                'held' => $promoCode->max_uses !== null ? $promoCode->heldUses() : null,
                'starts_at' => $promoCode->starts_at?->setTimezone((string) config('taptale.timezone'))->toDateString(),
                'ends_at' => $promoCode->ends_at?->setTimezone((string) config('taptale.timezone'))->toDateString(),
                'is_active' => $promoCode->is_active,
                'is_redeemable' => $promoCode->rejectionReason(PHP_INT_MAX) === null,
            ]),
        ]);
    }

    /**
     * Create a promo code.
     */
    public function store(PromoCodeRequest $request): RedirectResponse
    {
        PromoCode::create($this->attributes($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promo code added.')]);

        return to_route('admin.promo-codes.index');
    }

    /**
     * Update a promo code.
     */
    public function update(PromoCodeRequest $request, PromoCode $promoCode): RedirectResponse
    {
        $promoCode->update($this->attributes($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promo code updated.')]);

        return to_route('admin.promo-codes.index');
    }

    /**
     * Delete a promo code. Orders keep the code and discount they used.
     */
    public function destroy(PromoCode $promoCode): RedirectResponse
    {
        $promoCode->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promo code deleted.')]);

        return to_route('admin.promo-codes.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function attributes(PromoCodeRequest $request): array
    {
        $validated = $request->validated();
        $isPercent = $validated['discount_type'] === DiscountType::Percent->value;

        $timezone = (string) config('taptale.timezone');

        return [
            ...$validated,
            'discount_value' => $isPercent ? (int) $validated['discount_value'] : $this->toCentavos($validated['discount_value']),
            'min_subtotal' => $this->toCentavos($validated['min_subtotal'] ?? 0),
            'starts_at' => filled($validated['starts_at'] ?? null) ? Carbon::parse($validated['starts_at'], $timezone)->startOfDay()->utc() : null,
            'ends_at' => filled($validated['ends_at'] ?? null) ? Carbon::parse($validated['ends_at'], $timezone)->endOfDay()->utc() : null,
        ];
    }
}
