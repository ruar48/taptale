<?php

namespace App\Actions\Payments;

use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentMethod;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class StartPayMongoCheckout
{
    public function __construct(
        private PayMongoClient $payMongo,
        private ClosePayMongoCheckout $closeCheckout,
    ) {}

    /**
     * Open a PayMongo hosted checkout for the order's balance and return
     * the URL to send the customer to.
     *
     * The amount always comes from the order on the server, never from the
     * browser. A per-order lock stops double clicks from opening several
     * checkouts, and an open checkout for the same amount is reused.
     *
     * @throws ValidationException
     */
    public function handle(Order $order, PaymentMethod $method): string
    {
        try {
            return Cache::lock("orders.{$order->id}.paymongo-checkout", 30)
                ->block(10, fn (): string => $this->open($order, $method));
        } catch (LockTimeoutException) {
            throw ValidationException::withMessages(['payment' => 'Your checkout is already being prepared. Please try again in a moment.']);
        }
    }

    /**
     * @throws ValidationException
     */
    private function open(Order $order, PaymentMethod $method): string
    {
        $order->refresh()->load('payments');
        $amount = $order->balanceDue();

        if (! $order->status->acceptsPayment() || $amount === 0) {
            throw ValidationException::withMessages(['payment' => 'This order is not awaiting payment.']);
        }

        if ($order->payments->contains(fn (Payment $payment): bool => $payment->status === PaymentStatus::Submitted)) {
            throw ValidationException::withMessages(['payment' => 'A payment is already awaiting verification.']);
        }

        $openCheckouts = $order->payments->filter(
            fn (Payment $payment): bool => $payment->status === PaymentStatus::Pending && $payment->gateway_checkout_id !== null,
        );

        $reusable = $openCheckouts->first(fn (Payment $payment): bool => $payment->amount === $amount && $payment->checkout_url !== null);

        if ($reusable !== null) {
            return (string) $reusable->checkout_url;
        }

        foreach ($openCheckouts as $staleCheckout) {
            if (! $this->closeCheckout->handle($staleCheckout)) {
                throw ValidationException::withMessages(['payment' => 'Good news — your earlier online payment just went through. Refresh the page to see it.']);
            }
        }

        $payment = $order->payments()->create([
            'payment_method_id' => $method->id,
            'kind' => PaymentKind::Payment,
            'status' => PaymentStatus::Pending,
            'amount' => $amount,
        ]);

        try {
            $session = $this->payMongo->createCheckoutSession($this->attributes($order, $payment));
        } catch (Throwable $exception) {
            $payment->delete();
            report($exception);

            throw ValidationException::withMessages(['payment' => 'We could not open the secure checkout right now. Please try again in a moment.']);
        }

        $checkoutUrl = (string) data_get($session, 'attributes.checkout_url');

        $payment->update([
            'gateway_checkout_id' => $session['id'],
            'checkout_url' => $checkoutUrl,
        ]);
        $order->update(['payment_method_id' => $method->id]);

        return $checkoutUrl;
    }

    /**
     * @return array<string, mixed>
     */
    private function attributes(Order $order, Payment $payment): array
    {
        return [
            'line_items' => [[
                'name' => Str::limit("{$order->product_name} — Order {$order->reference}", 250),
                'amount' => $payment->amount,
                'currency' => (string) config('taptale.currency'),
                'quantity' => 1,
            ]],
            'payment_method_types' => config('services.paymongo.payment_method_types'),
            'description' => config('app.name')." order {$order->reference}",
            'reference_number' => $order->reference,
            'metadata' => [
                'order_reference' => $order->reference,
                'payment_id' => (string) $payment->id,
            ],
            'billing' => [
                'name' => $order->customer_name,
                'email' => $order->customer_email,
            ],
            'send_email_receipt' => true,
            'show_description' => true,
            'show_line_items' => true,
            'success_url' => route('account.orders.checkout.complete', $order),
            'cancel_url' => route('account.orders.show', $order),
        ];
    }
}
