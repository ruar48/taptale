<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PaymentMethodRequest;
use App\Http\Resources\PaymentMethodResource;
use App\Models\PaymentMethod;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PaymentMethodController extends Controller
{
    /**
     * List configurable payment methods.
     */
    public function index(): Response
    {
        return Inertia::render('admin/payment-methods/index', [
            'paymentMethods' => PaymentMethodResource::collection(
                PaymentMethod::query()->orderBy('sort_order')->orderBy('id')->get()
            ),
            'drivers' => PaymentMethod::DRIVERS,
        ]);
    }

    /**
     * Create a payment method.
     */
    public function store(PaymentMethodRequest $request): RedirectResponse
    {
        PaymentMethod::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Payment method added.')]);

        return to_route('admin.payment-methods.index');
    }

    /**
     * Update a payment method.
     */
    public function update(PaymentMethodRequest $request, PaymentMethod $paymentMethod): RedirectResponse
    {
        $paymentMethod->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Payment method updated.')]);

        return to_route('admin.payment-methods.index');
    }

    /**
     * Delete a payment method. Orders keep their history.
     */
    public function destroy(PaymentMethod $paymentMethod): RedirectResponse
    {
        $paymentMethod->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Payment method deleted.')]);

        return to_route('admin.payment-methods.index');
    }
}
