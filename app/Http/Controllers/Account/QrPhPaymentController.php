<?php

namespace App\Http\Controllers\Account;

use App\Actions\Payments\ConfirmPayMongoPayment;
use App\Actions\Payments\PayMongoClient;
use App\Actions\Payments\StartPayMongoQrPh;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentMethod;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class QrPhPaymentController extends Controller
{
    /**
     * Seconds between payment status checks with PayMongo while the
     * customer's payment page polls.
     */
    private const STATUS_CHECK_INTERVAL = 8;

    /**
     * Generate (or reuse) the order's QR Ph code.
     */
    public function store(Request $request, Order $order, StartPayMongoQrPh $startQrPh): RedirectResponse
    {
        Gate::authorize('update', $order);

        $request->validate([
            'payment_method_id' => [
                'required',
                'integer',
                Rule::exists('payment_methods', 'id')->where('is_active', true)->where('driver', 'paymongo_qrph'),
            ],
        ]);

        $startQrPh->handle($order, PaymentMethod::query()->findOrFail($request->integer('payment_method_id')));

        return to_route('account.orders.qrph.show', $order);
    }

    /**
     * Taptale's branded "scan to pay" page. The page polls this action;
     * until PayMongo's webhook arrives, the payment is re-checked with
     * PayMongo's API at most every few seconds.
     */
    public function show(Request $request, Order $order, PayMongoClient $payMongo, ConfirmPayMongoPayment $confirmPayment): Response|RedirectResponse
    {
        Gate::authorize('update', $order);

        $payment = $order->payments()->whereNotNull('expires_at')->latest('id')->first();

        if ($payment === null) {
            return to_route('account.orders.show', $order);
        }

        $isDueForCheck = $payment->status === PaymentStatus::Pending
            && Cache::add("paymongo.qrph-check.{$payment->id}", true, self::STATUS_CHECK_INTERVAL);

        if ($isDueForCheck) {
            try {
                $confirmPayment->handle($payment, $payMongo->retrievePaymentIntent((string) $payment->gateway_checkout_id));
                $payment->refresh();
            } catch (RequestException|ConnectionException $exception) {
                report($exception);
            }
        }

        if ($payment->status === PaymentStatus::Verified) {
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Payment received — thank you! We will get started on your order.')]);

            return to_route('account.orders.show', $order);
        }

        if (! $order->status->acceptsPayment()) {
            return to_route('account.orders.show', $order);
        }

        $isActive = $payment->status === PaymentStatus::Pending && $payment->expires_at?->isFuture() === true;

        return Inertia::render('account/orders/pay-qr', [
            'order' => [
                'reference' => $order->reference,
                'product_name' => $order->product_name,
            ],
            'payment' => [
                'amount' => $payment->amount,
                'payment_method_id' => $payment->payment_method_id,
                'qr_code' => $isActive ? $payment->qr_code : null,
                'expires_at' => $payment->expires_at?->toIso8601String(),
                'is_active' => $isActive,
            ],
        ]);
    }
}
