<?php

namespace App\Http\Controllers\Account;

use App\Actions\Payments\ConfirmPayMongoPayment;
use App\Actions\Payments\PayMongoClient;
use App\Actions\Payments\StartPayMongoCheckout;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentMethod;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class OnlinePaymentController extends Controller
{
    /**
     * Send the customer to PayMongo's secure hosted checkout.
     */
    public function store(Request $request, Order $order, StartPayMongoCheckout $startCheckout): Response
    {
        Gate::authorize('update', $order);

        $request->validate([
            'payment_method_id' => [
                'required',
                'integer',
                Rule::exists('payment_methods', 'id')->where('is_active', true)->where('driver', 'paymongo'),
            ],
        ]);

        $checkoutUrl = $startCheckout->handle($order, PaymentMethod::query()->findOrFail($request->integer('payment_method_id')));

        return Inertia::location($checkoutUrl);
    }

    /**
     * Where PayMongo returns the customer after paying.
     *
     * The redirect itself proves nothing (anyone can open this URL), so the
     * order's open checkouts are re-checked with PayMongo's API.
     */
    public function complete(Request $request, Order $order, PayMongoClient $payMongo, ConfirmPayMongoPayment $confirmPayment): RedirectResponse
    {
        Gate::authorize('update', $order);

        $openCheckouts = $order->payments()
            ->where('status', PaymentStatus::Pending)
            ->whereNotNull('gateway_checkout_id')
            ->get();

        $isConfirmed = false;

        foreach ($openCheckouts as $payment) {
            try {
                $session = $payMongo->retrieve((string) $payment->gateway_checkout_id);
                $isConfirmed = $confirmPayment->handle($payment, $session) || $isConfirmed;
            } catch (RequestException|ConnectionException $exception) {
                report($exception);
            }
        }

        $isFullyPaid = $order->load('payments')->balanceDue() === 0;

        Inertia::flash('toast', $isConfirmed || ($openCheckouts->isEmpty() && $isFullyPaid)
            ? ['type' => 'success', 'message' => __('Payment received — thank you! We will get started on your order.')]
            : ['type' => 'info', 'message' => __('We are waiting for PayMongo to confirm your payment. This page will update once it does.')]);

        return to_route('account.orders.show', $order);
    }
}
