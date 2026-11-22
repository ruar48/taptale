<?php

namespace App\Actions\Payments;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Validation\ValidationException;

class ClosePayMongoCheckout
{
    public function __construct(
        private PayMongoClient $payMongo,
        private ConfirmPayMongoPayment $confirmPayment,
    ) {}

    /**
     * Stop offering an open PayMongo checkout (cs_) or QR Ph code (pi_).
     *
     * Checkout sessions are expired at PayMongo. A QR Ph code cannot be
     * revoked, so it is only retired here; if it is still paid before it
     * lapses, ConfirmPayMongoPayment records the money anyway.
     *
     * Returns false when the payment turned out to be paid already (it is
     * recorded instead of being lost).
     *
     * @throws ValidationException when a checkout payment is still being processed.
     */
    public function handle(Payment $payment): bool
    {
        $gatewayId = $payment->gateway_checkout_id;

        if ($payment->status !== PaymentStatus::Pending || $gatewayId === null) {
            return true;
        }

        if (str_starts_with($gatewayId, 'pi_')) {
            if ($this->confirmPayment->handle($payment, $this->payMongo->retrievePaymentIntent($gatewayId))) {
                return false;
            }
        } elseif (! $this->payMongo->expireCheckoutSession($gatewayId)) {
            $session = $this->payMongo->retrieveCheckoutSession($gatewayId);

            if ($this->confirmPayment->handle($payment, $session)) {
                return false;
            }

            if (data_get($session, 'attributes.status') !== 'expired') {
                throw ValidationException::withMessages([
                    'payment' => 'An online payment for this order is still being processed. Please wait a minute and refresh the page.',
                ]);
            }
        }

        $payment->update(['status' => PaymentStatus::Expired, 'checkout_url' => null, 'qr_code' => null]);

        return true;
    }
}
