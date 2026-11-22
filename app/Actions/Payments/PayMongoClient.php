<?php

namespace App\Actions\Payments;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * Thin, server-side wrapper around the PayMongo Checkout API.
 *
 * The secret key only ever leaves the server inside the HTTPS Authorization
 * header sent to api.paymongo.com. Card and wallet details are entered on
 * PayMongo's hosted checkout page and never touch this application.
 */
class PayMongoClient
{
    private const BASE_URL = 'https://api.paymongo.com/v1';

    /**
     * Whether PayMongo credentials are configured.
     */
    public function isConfigured(): bool
    {
        return filled(config('services.paymongo.secret_key'));
    }

    /**
     * Whether the configured secret key belongs to live (real money) mode.
     */
    public function isLiveMode(): bool
    {
        return str_starts_with((string) config('services.paymongo.secret_key'), 'sk_live_');
    }

    /**
     * Create a hosted Checkout Session.
     *
     * Not retried automatically: PayMongo has no idempotency key for
     * checkout sessions, so a retry could open a second session.
     *
     * @param  array<string, mixed>  $attributes
     * @return array{id: string, attributes: array<string, mixed>}
     *
     * @throws RequestException|ConnectionException
     */
    public function createCheckoutSession(array $attributes): array
    {
        return $this->request()
            ->post('/checkout_sessions', ['data' => ['attributes' => $attributes]])
            ->throw()
            ->json('data');
    }

    /**
     * Fetch a Checkout Session straight from PayMongo, the source of truth
     * for whether it has been paid.
     *
     * @return array{id: string, attributes: array<string, mixed>}
     *
     * @throws RequestException|ConnectionException
     */
    public function retrieveCheckoutSession(string $checkoutSessionId): array
    {
        $this->ensureSessionId($checkoutSessionId);

        return $this->request()
            ->retry([200, 600, 1500], 0, fn (Throwable $exception): bool => $exception instanceof ConnectionException
                || ($exception instanceof RequestException
                    && ($exception->response->serverError() || $exception->response->status() === 429)))
            ->get('/checkout_sessions/'.$checkoutSessionId)
            ->throw()
            ->json('data');
    }

    /**
     * Close a Checkout Session so it can no longer be paid.
     *
     * PayMongo refuses (400) when the session is already expired, paid, or a
     * payment is in progress, so callers must re-check it afterwards.
     *
     * @throws ConnectionException
     */
    public function expireCheckoutSession(string $checkoutSessionId): bool
    {
        $this->ensureSessionId($checkoutSessionId);

        return $this->request()->post('/checkout_sessions/'.$checkoutSessionId.'/expire')->successful();
    }

    /**
     * Create a Payment Intent that only accepts QR Ph, attach a QR Ph
     * payment method to it and return the intent, whose
     * attributes.next_action.code.image_url holds the QR code image.
     *
     * Not retried automatically, for the same reason as checkout sessions.
     *
     * @param  array<string, string>  $metadata
     * @param  array{name: string, email: string}  $billing
     * @return array{id: string, attributes: array<string, mixed>}
     *
     * @throws RequestException|ConnectionException
     */
    public function createQrPhPayment(int $amount, string $description, array $metadata, array $billing, int $expirySeconds): array
    {
        $intent = $this->request()
            ->post('/payment_intents', ['data' => ['attributes' => [
                'amount' => $amount,
                'currency' => (string) config('taptale.currency'),
                'payment_method_allowed' => ['qrph'],
                'description' => $description,
                'metadata' => $metadata,
            ]]])
            ->throw()
            ->json('data');

        $paymentMethod = $this->request()
            ->post('/payment_methods', ['data' => ['attributes' => [
                'type' => 'qrph',
                'expiry_seconds' => $expirySeconds,
                'billing' => $billing,
            ]]])
            ->throw()
            ->json('data');

        $this->ensureId((string) data_get($intent, 'id'), 'pi');

        return $this->request()
            ->post('/payment_intents/'.data_get($intent, 'id').'/attach', ['data' => ['attributes' => [
                'payment_method' => data_get($paymentMethod, 'id'),
                'client_key' => data_get($intent, 'attributes.client_key'),
            ]]])
            ->throw()
            ->json('data');
    }

    /**
     * Fetch a Payment Intent straight from PayMongo.
     *
     * @return array{id: string, attributes: array<string, mixed>}
     *
     * @throws RequestException|ConnectionException
     */
    public function retrievePaymentIntent(string $paymentIntentId): array
    {
        $this->ensureId($paymentIntentId, 'pi');

        return $this->request()
            ->retry([200, 600, 1500], 0, fn (Throwable $exception): bool => $exception instanceof ConnectionException
                || ($exception instanceof RequestException
                    && ($exception->response->serverError() || $exception->response->status() === 429)))
            ->get('/payment_intents/'.$paymentIntentId)
            ->throw()
            ->json('data');
    }

    /**
     * Fetch whatever a payment was opened with: a checkout session (cs_)
     * or a QR Ph payment intent (pi_).
     *
     * @return array{id: string, attributes: array<string, mixed>}
     *
     * @throws RequestException|ConnectionException
     */
    public function retrieve(string $gatewayId): array
    {
        return str_starts_with($gatewayId, 'pi_')
            ? $this->retrievePaymentIntent($gatewayId)
            : $this->retrieveCheckoutSession($gatewayId);
    }

    private function request(): PendingRequest
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('PayMongo is not configured. Set PAYMONGO_SECRET_KEY.');
        }

        return Http::baseUrl(self::BASE_URL)
            ->withBasicAuth((string) config('services.paymongo.secret_key'), '')
            ->acceptJson()
            ->asJson()
            ->connectTimeout(5)
            ->timeout(20);
    }

    /**
     * Keep untrusted identifiers from altering the request path.
     */
    private function ensureSessionId(string $checkoutSessionId): void
    {
        $this->ensureId($checkoutSessionId, 'cs');
    }

    /**
     * Keep untrusted identifiers from altering the request path.
     */
    private function ensureId(string $id, string $prefix): void
    {
        if (preg_match('/^'.$prefix.'_[A-Za-z0-9]+$/', $id) !== 1) {
            throw new RuntimeException("Invalid PayMongo {$prefix}_ id.");
        }
    }
}
