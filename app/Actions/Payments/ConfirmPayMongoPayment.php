<?php

namespace App\Actions\Payments;

use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ConfirmPayMongoPayment
{
    /**
     * Mark a PayMongo payment as received.
     *
     * $session is the checkout session (cs_) or payment intent (pi_) the
     * payment was opened with. It must come from PayMongo's API
     * (PayMongoClient), never from the browser or a webhook body, so a forged
     * request cannot mark an order paid. The payment row is locked so
     * concurrent webhooks, redirects and polling credit it exactly once.
     *
     * @param  array{id: string, attributes: array<string, mixed>}  $session
     */
    public function handle(Payment $payment, array $session): bool
    {
        return DB::transaction(function () use ($payment, $session): bool {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);

            if ($payment->status === PaymentStatus::Verified) {
                return true;
            }

            $isOpenCheckout = in_array($payment->status, [PaymentStatus::Pending, PaymentStatus::Expired], true);

            if (! $isOpenCheckout || $payment->gateway_checkout_id === null || $session['id'] !== $payment->gateway_checkout_id) {
                return false;
            }

            $paid = $this->paidPayment($session);

            if ($paid === null) {
                return false;
            }

            ['id' => $gatewayPaymentId, 'amount' => $amount, 'currency' => $currency] = $paid;
            $order = $payment->order;

            if ($amount !== $payment->amount || $currency !== strtoupper((string) config('taptale.currency'))) {
                Log::critical('PayMongo payment does not match the amount requested.', [
                    'payment_id' => $payment->id,
                    'checkout_session' => $session['id'],
                    'expected' => $payment->amount,
                    'received' => $amount,
                    'currency' => $currency,
                ]);

                $order->recordActivity(
                    ActivityType::Note,
                    "PayMongo reported a payment ({$currency} ".number_format($amount / 100, 2).') that does not match the amount requested. Check checkout '.$session['id'].' in the PayMongo dashboard before releasing this order.',
                    internal: true,
                );

                return false;
            }

            $payment->update([
                'status' => PaymentStatus::Verified,
                'reviewed_at' => now(),
                'reference_number' => $gatewayPaymentId,
                'gateway_payment_id' => $gatewayPaymentId,
                'checkout_url' => null,
                'qr_code' => null,
            ]);

            $order->update(['payment_method_id' => $payment->payment_method_id]);
            $order->recordActivity(
                ActivityType::PaymentVerified,
                'Online payment of '.config('taptale.currency_symbol').number_format($amount / 100, 2).' received through PayMongo. Thank you!',
            );

            if ($order->status === OrderStatus::Cancelled) {
                $order->recordActivity(ActivityType::Note, 'This payment arrived after the order was cancelled. Refund the customer.', internal: true);

                return true;
            }

            $order->advanceAfterPayment();

            return true;
        });
    }

    /**
     * The completed PayMongo payment inside a checkout session or payment
     * intent, if there is one.
     *
     * @param  array{id: string, attributes: array<string, mixed>}  $session
     * @return array{id: string, amount: int, currency: string}|null
     */
    private function paidPayment(array $session): ?array
    {
        $payments = data_get($session, 'attributes.payments');

        $paid = is_array($payments)
            ? collect($payments)->first(fn (mixed $item): bool => data_get($item, 'attributes.status') === 'paid')
            : null;

        if ($paid === null && str_starts_with($session['id'], 'pi_') && data_get($session, 'attributes.status') === 'succeeded') {
            $paid = $session;
        }

        $id = data_get($paid, 'id');

        if (! is_string($id) || $id === '') {
            return null;
        }

        return [
            'id' => $id,
            'amount' => (int) data_get($paid, 'attributes.amount'),
            'currency' => strtoupper((string) data_get($paid, 'attributes.currency')),
        ];
    }
}
