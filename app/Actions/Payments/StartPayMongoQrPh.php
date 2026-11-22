<?php

namespace App\Actions\Payments;

use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentMethod;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class StartPayMongoQrPh
{
    /**
     * Seconds before PayMongo's expiry that Taptale stops showing a code,
     * so customers are never left scanning one that is about to lapse.
     */
    private const EXPIRY_BUFFER_SECONDS = 30;

    public function __construct(
        private PayMongoClient $payMongo,
        private ClosePayMongoCheckout $closeCheckout,
    ) {}

    /**
     * Get a QR Ph code for the order's balance to show on Taptale's own
     * payment page, reusing the current code while it is still valid.
     *
     * The amount always comes from the order on the server. A per-order lock
     * stops double clicks from generating several codes.
     *
     * @throws ValidationException
     */
    public function handle(Order $order, PaymentMethod $method): Payment
    {
        try {
            return Cache::lock("orders.{$order->id}.paymongo-checkout", 30)
                ->block(10, fn (): Payment => $this->generate($order, $method));
        } catch (LockTimeoutException) {
            throw ValidationException::withMessages(['payment' => 'Your QR code is already being prepared. Please try again in a moment.']);
        }
    }

    /**
     * @throws ValidationException
     */
    private function generate(Order $order, PaymentMethod $method): Payment
    {
        $order->refresh()->load('payments');
        $amount = $order->balanceDue();

        if (! $order->status->acceptsPayment() || $amount === 0) {
            throw ValidationException::withMessages(['payment' => 'This order is not awaiting payment.']);
        }

        if ($order->payments->contains(fn (Payment $payment): bool => $payment->status === PaymentStatus::Submitted)) {
            throw ValidationException::withMessages(['payment' => 'A payment is already awaiting verification.']);
        }

        $openPayments = $order->payments->filter(
            fn (Payment $payment): bool => $payment->status === PaymentStatus::Pending && $payment->gateway_checkout_id !== null,
        );

        $reusable = $openPayments->first(fn (Payment $payment): bool => $payment->qr_code !== null
            && $payment->amount === $amount
            && $payment->expires_at?->isAfter(now()->addMinute()) === true);

        if ($reusable !== null) {
            return $reusable;
        }

        foreach ($openPayments as $stalePayment) {
            if (! $this->closeCheckout->handle($stalePayment)) {
                throw ValidationException::withMessages(['payment' => 'Good news — your earlier online payment just went through. Refresh the page to see it.']);
            }
        }

        $expirySeconds = max(60, min(9000, (int) config('services.paymongo.qr_expiry_seconds')));

        $payment = $order->payments()->create([
            'payment_method_id' => $method->id,
            'kind' => PaymentKind::Payment,
            'status' => PaymentStatus::Pending,
            'amount' => $amount,
        ]);

        try {
            $intent = $this->payMongo->createQrPhPayment(
                $amount,
                config('app.name')." order {$order->reference}",
                ['order_reference' => $order->reference, 'payment_id' => (string) $payment->id],
                ['name' => $order->customer_name, 'email' => $order->customer_email],
                $expirySeconds,
            );

            $qrCode = $this->qrImage(data_get($intent, 'attributes.next_action.code.image_url'));

            if ($qrCode === null) {
                throw new RuntimeException('PayMongo did not return a QR Ph image for payment intent '.$intent['id'].'.');
            }
        } catch (Throwable $exception) {
            $payment->delete();
            report($exception);

            throw ValidationException::withMessages(['payment' => 'We could not create your QR code right now. Please try again in a moment.']);
        }

        $payment->update([
            'gateway_checkout_id' => $intent['id'],
            'qr_code' => $qrCode,
            'expires_at' => now()->addSeconds($expirySeconds - self::EXPIRY_BUFFER_SECONDS),
        ]);
        $order->update(['payment_method_id' => $method->id]);

        return $payment;
    }

    /**
     * Accept only a base64 PNG/JPEG image, so nothing but an image can ever
     * be rendered from the stored value.
     */
    private function qrImage(mixed $image): ?string
    {
        if (! is_string($image)) {
            return null;
        }

        $image = preg_replace('/\s+/', '', $image) ?? '';

        if (preg_match('#^data:image/(png|jpeg);base64,[A-Za-z0-9+/]+=*$#', $image) === 1) {
            return $image;
        }

        if (preg_match('#^[A-Za-z0-9+/]+=*$#', $image) === 1) {
            return 'data:image/png;base64,'.$image;
        }

        return null;
    }
}
