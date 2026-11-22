<?php

use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;

const PAYMONGO_SESSIONS = 'https://api.paymongo.com/v1/checkout_sessions';
const PAYMONGO_INTENTS = 'https://api.paymongo.com/v1/payment_intents';
const QR_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

beforeEach(function () {
    config([
        'services.paymongo.secret_key' => 'sk_test_secret',
        'services.paymongo.webhook_secret' => 'whsk_test_secret',
        'services.paymongo.payment_method_types' => ['qrph'],
        'services.paymongo.webhook_tolerance' => 300,
    ]);

    Http::preventStrayRequests();

    $this->method = PaymentMethod::factory()->create(['name' => 'QRPh', 'driver' => 'paymongo']);
    $this->order = Order::factory()->create(['total' => 75000]);
});

/**
 * A PayMongo checkout session API response.
 *
 * @return array<string, mixed>
 */
function checkoutSession(string $id, ?string $paymentStatus = 'paid', int $amount = 75000): array
{
    return ['data' => ['id' => $id, 'type' => 'checkout_session', 'attributes' => [
        'status' => 'active',
        'checkout_url' => "https://checkout.paymongo.com/{$id}",
        'payments' => $paymentStatus === null ? [] : [
            ['id' => 'pay_abc123', 'type' => 'payment', 'attributes' => ['status' => $paymentStatus, 'amount' => $amount, 'currency' => 'PHP']],
        ],
    ]]];
}

function openCheckout(Order $order, PaymentMethod $method, string $id = 'cs_abc123', int $amount = 75000): Payment
{
    return Payment::factory()->for($order)->create([
        'payment_method_id' => $method->id,
        'status' => PaymentStatus::Pending,
        'amount' => $amount,
        'reference_number' => null,
        'proof_disk' => null,
        'proof_path' => null,
        'gateway_checkout_id' => $id,
        'checkout_url' => "https://checkout.paymongo.com/{$id}",
    ]);
}

/**
 * A PayMongo QR Ph payment intent API response.
 *
 * @return array<string, mixed>
 */
function qrIntent(string $id, string $status = 'awaiting_next_action', string $image = QR_IMAGE): array
{
    return ['data' => ['id' => $id, 'type' => 'payment_intent', 'attributes' => [
        'amount' => 75000,
        'currency' => 'PHP',
        'status' => $status,
        'client_key' => "{$id}_client_key",
        'next_action' => ['type' => 'consume_qr', 'code' => ['image_url' => $image]],
        'payments' => $status === 'succeeded'
            ? [['id' => 'pay_qr123', 'attributes' => ['status' => 'paid', 'amount' => 75000, 'currency' => 'PHP']]]
            : [],
    ]]];
}

function openQr(Order $order, PaymentMethod $method, int $minutesLeft = 10): Payment
{
    return Payment::factory()->for($order)->create([
        'payment_method_id' => $method->id,
        'status' => PaymentStatus::Pending,
        'amount' => 75000,
        'reference_number' => null,
        'proof_disk' => null,
        'proof_path' => null,
        'gateway_checkout_id' => 'pi_abc123',
        'qr_code' => QR_IMAGE,
        'expires_at' => now()->addMinutes($minutesLeft),
    ]);
}

function sendPayMongoWebhook(
    object $test,
    string $gatewayId,
    ?int $timestamp = null,
    string $secret = 'whsk_test_secret',
    string $type = 'checkout_session.payment.paid',
): TestResponse {
    $resource = $type === 'payment.paid'
        ? ['id' => 'pay_forged', 'type' => 'payment', 'attributes' => ['payment_intent_id' => $gatewayId, 'status' => 'paid', 'amount' => 75000]]
        : ['id' => $gatewayId, 'type' => 'checkout_session', 'attributes' => ['payments' => [
            ['id' => 'pay_forged', 'attributes' => ['status' => 'paid', 'amount' => 75000, 'currency' => 'PHP']],
        ]]];

    $body = (string) json_encode(['data' => ['id' => 'evt_1', 'type' => 'event', 'attributes' => [
        'type' => $type,
        'livemode' => false,
        'data' => $resource,
    ]]]);
    $timestamp ??= now()->getTimestamp();
    $signature = hash_hmac('sha256', "{$timestamp}.{$body}", $secret);

    return $test->call('POST', route('webhooks.paymongo'), server: [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_PAYMONGO_SIGNATURE' => "t={$timestamp},te={$signature},li=",
    ], content: $body);
}

test('a customer is sent to PayMongo checkout for the balance the server calculates', function () {
    Http::fake([PAYMONGO_SESSIONS => Http::response(checkoutSession('cs_new', null))]);

    $this->actingAs($this->order->user)
        ->post(route('account.orders.checkout', $this->order), ['payment_method_id' => $this->method->id, 'amount' => 1])
        ->assertRedirect('https://checkout.paymongo.com/cs_new');

    Http::assertSent(fn (Request $request): bool => $request->url() === PAYMONGO_SESSIONS
        && $request['data']['attributes']['line_items'][0]['amount'] === 75000
        && $request['data']['attributes']['payment_method_types'] === ['qrph']
        && $request['data']['attributes']['reference_number'] === $this->order->reference
        && $request->hasHeader('Authorization', 'Basic '.base64_encode('sk_test_secret:')));

    expect($this->order->payments()->sole())
        ->status->toBe(PaymentStatus::Pending)
        ->amount->toBe(75000)
        ->gateway_checkout_id->toBe('cs_new');
});

test('an open checkout for the same balance is reused instead of opening another', function () {
    openCheckout($this->order, $this->method);
    Http::fake();

    $this->actingAs($this->order->user)
        ->post(route('account.orders.checkout', $this->order), ['payment_method_id' => $this->method->id])
        ->assertRedirect('https://checkout.paymongo.com/cs_abc123');

    Http::assertNothingSent();
});

test('another customer cannot open a checkout for an order', function () {
    Http::fake();

    $this->actingAs(User::factory()->create())
        ->post(route('account.orders.checkout', $this->order), ['payment_method_id' => $this->method->id])
        ->assertForbidden();

    Http::assertNothingSent();
});

test('online checkout only accepts PayMongo methods and manual proof only manual methods', function () {
    $manual = PaymentMethod::factory()->create();

    $this->actingAs($this->order->user)
        ->post(route('account.orders.checkout', $this->order), ['payment_method_id' => $manual->id])
        ->assertSessionHasErrors('payment_method_id');

    $this->actingAs($this->order->user)
        ->post(route('account.orders.payments.store', $this->order), ['payment_method_id' => $this->method->id])
        ->assertSessionHasErrors('payment_method_id');
});

test('a signed webhook confirms the payment once after re-checking it with PayMongo', function () {
    $payment = openCheckout($this->order, $this->method);
    Http::fake([PAYMONGO_SESSIONS.'/cs_abc123' => Http::response(checkoutSession('cs_abc123'))]);

    sendPayMongoWebhook($this, 'cs_abc123')->assertOk();
    sendPayMongoWebhook($this, 'cs_abc123')->assertOk();

    expect($payment->fresh())
        ->status->toBe(PaymentStatus::Verified)
        ->gateway_payment_id->toBe('pay_abc123')
        ->and($this->order->fresh()->status)->toBe(OrderStatus::PendingDesign)
        ->and($this->order->activities()->where('type', ActivityType::PaymentVerified)->count())->toBe(1);
});

test('webhooks without a valid PayMongo signature are rejected', function () {
    $payment = openCheckout($this->order, $this->method);
    Http::fake();

    sendPayMongoWebhook($this, 'cs_abc123', secret: 'whsk_guessed')->assertUnauthorized();

    $this->postJson(route('webhooks.paymongo'), ['data' => []])->assertUnauthorized();

    Http::assertNothingSent();
    expect($payment->fresh()->status)->toBe(PaymentStatus::Pending);
});

test('replayed webhooks with an old signature timestamp are rejected', function () {
    openCheckout($this->order, $this->method);
    Http::fake();

    sendPayMongoWebhook($this, 'cs_abc123', timestamp: now()->subHour()->getTimestamp())->assertUnauthorized();

    Http::assertNothingSent();
});

test('a signed event is not trusted when PayMongo reports the checkout unpaid', function () {
    $payment = openCheckout($this->order, $this->method);
    Http::fake([PAYMONGO_SESSIONS.'/cs_abc123' => Http::response(checkoutSession('cs_abc123', null))]);

    sendPayMongoWebhook($this, 'cs_abc123')->assertOk();

    expect($payment->fresh()->status)->toBe(PaymentStatus::Pending)
        ->and($this->order->fresh()->status)->toBe(OrderStatus::AwaitingPayment);
});

test('a payment for a different amount is held for review', function () {
    $payment = openCheckout($this->order, $this->method);
    Http::fake([PAYMONGO_SESSIONS.'/cs_abc123' => Http::response(checkoutSession('cs_abc123', 'paid', 100))]);

    sendPayMongoWebhook($this, 'cs_abc123')->assertOk();

    expect($payment->fresh()->status)->toBe(PaymentStatus::Pending)
        ->and($this->order->activities()->where('is_internal', true)->sole()->body)->toContain('does not match');
});

test('returning from checkout confirms the payment with PayMongo', function () {
    $payment = openCheckout($this->order, $this->method);
    Http::fake([PAYMONGO_SESSIONS.'/cs_abc123' => Http::response(checkoutSession('cs_abc123'))]);

    $this->actingAs($this->order->user)
        ->get(route('account.orders.checkout.complete', $this->order))
        ->assertRedirect(route('account.orders.show', $this->order));

    expect($payment->fresh()->status)->toBe(PaymentStatus::Verified);
});

test('cancelling an order closes its open checkout so it cannot be paid', function () {
    $payment = openCheckout($this->order, $this->method);
    Http::fake([PAYMONGO_SESSIONS.'/cs_abc123/expire' => Http::response(checkoutSession('cs_abc123', null))]);

    $this->actingAs($this->order->user)
        ->post(route('account.orders.cancel', $this->order))
        ->assertSessionHasNoErrors();

    expect($payment->fresh()->status)->toBe(PaymentStatus::Expired)
        ->and($this->order->fresh()->status)->toBe(OrderStatus::Cancelled);
});

test('a customer gets a QR Ph code for the balance on Taptale\'s own payment page', function () {
    $qrMethod = PaymentMethod::factory()->create(['driver' => 'paymongo_qrph']);
    Http::fake([
        PAYMONGO_INTENTS => Http::response(qrIntent('pi_new', 'awaiting_payment_method')),
        'https://api.paymongo.com/v1/payment_methods' => Http::response(['data' => ['id' => 'pm_qr', 'attributes' => ['type' => 'qrph']]]),
        PAYMONGO_INTENTS.'/pi_new/attach' => Http::response(qrIntent('pi_new')),
        PAYMONGO_INTENTS.'/pi_new' => Http::response(qrIntent('pi_new')),
    ]);
    $this->freezeSecond();

    $this->actingAs($this->order->user)
        ->post(route('account.orders.qrph.store', $this->order), ['payment_method_id' => $qrMethod->id, 'amount' => 1])
        ->assertRedirect(route('account.orders.qrph.show', $this->order));

    Http::assertSent(fn (Request $request): bool => $request->url() === PAYMONGO_INTENTS
        && $request['data']['attributes']['amount'] === 75000
        && $request['data']['attributes']['payment_method_allowed'] === ['qrph']);
    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://api.paymongo.com/v1/payment_methods'
        && $request['data']['attributes']['type'] === 'qrph'
        && $request['data']['attributes']['expiry_seconds'] === 900);

    expect($this->order->payments()->sole())
        ->gateway_checkout_id->toBe('pi_new')
        ->qr_code->toBe(QR_IMAGE)
        ->expires_at->toEqual(now()->addSeconds(870));

    $this->actingAs($this->order->user)
        ->get(route('account.orders.qrph.show', $this->order))
        ->assertInertia(fn ($page) => $page
            ->component('account/orders/pay-qr')
            ->where('payment.qr_code', QR_IMAGE)
            ->where('payment.is_active', true)
            ->where('payment.amount', 75000));
});

test('a QR code that is still valid is shown again instead of generating another', function () {
    $qrMethod = PaymentMethod::factory()->create(['driver' => 'paymongo_qrph']);
    openQr($this->order, $qrMethod);
    Http::fake();

    $this->actingAs($this->order->user)
        ->post(route('account.orders.qrph.store', $this->order), ['payment_method_id' => $qrMethod->id])
        ->assertRedirect(route('account.orders.qrph.show', $this->order));

    Http::assertNothingSent();
});

test('an expired QR code is no longer shown', function () {
    $qrMethod = PaymentMethod::factory()->create(['driver' => 'paymongo_qrph']);
    openQr($this->order, $qrMethod, minutesLeft: -1);
    Http::fake([PAYMONGO_INTENTS.'/pi_abc123' => Http::response(qrIntent('pi_abc123', 'awaiting_payment_method'))]);

    $this->actingAs($this->order->user)
        ->get(route('account.orders.qrph.show', $this->order))
        ->assertInertia(fn ($page) => $page
            ->where('payment.qr_code', null)
            ->where('payment.is_active', false));
});

test('the QR page confirms a paid code with PayMongo and returns to the order', function () {
    $qrMethod = PaymentMethod::factory()->create(['driver' => 'paymongo_qrph']);
    $payment = openQr($this->order, $qrMethod);
    Http::fake([PAYMONGO_INTENTS.'/pi_abc123' => Http::response(qrIntent('pi_abc123', 'succeeded'))]);

    $this->actingAs($this->order->user)
        ->get(route('account.orders.qrph.show', $this->order))
        ->assertRedirect(route('account.orders.show', $this->order));

    expect($payment->fresh())
        ->status->toBe(PaymentStatus::Verified)
        ->gateway_payment_id->toBe('pay_qr123')
        ->qr_code->toBeNull()
        ->and($this->order->fresh()->status)->toBe(OrderStatus::PendingDesign);
});

test('another customer cannot see an order\'s QR code', function () {
    openQr($this->order, PaymentMethod::factory()->create(['driver' => 'paymongo_qrph']));
    Http::fake();

    $this->actingAs(User::factory()->create())
        ->get(route('account.orders.qrph.show', $this->order))
        ->assertForbidden();
});

test('a signed payment.paid webhook confirms a QR Ph payment after re-checking with PayMongo', function () {
    $payment = openQr($this->order, PaymentMethod::factory()->create(['driver' => 'paymongo_qrph']));
    Http::fake([PAYMONGO_INTENTS.'/pi_abc123' => Http::response(qrIntent('pi_abc123', 'succeeded'))]);

    sendPayMongoWebhook($this, 'pi_abc123', type: 'payment.paid')->assertOk();

    expect($payment->fresh()->status)->toBe(PaymentStatus::Verified);
});

test('anything other than a QR image from PayMongo is refused', function () {
    $qrMethod = PaymentMethod::factory()->create(['driver' => 'paymongo_qrph']);
    Http::fake([
        PAYMONGO_INTENTS => Http::response(qrIntent('pi_new', 'awaiting_payment_method')),
        'https://api.paymongo.com/v1/payment_methods' => Http::response(['data' => ['id' => 'pm_qr']]),
        PAYMONGO_INTENTS.'/pi_new/attach' => Http::response(qrIntent('pi_new', image: 'javascript:alert(1)')),
    ]);

    $this->actingAs($this->order->user)
        ->post(route('account.orders.qrph.store', $this->order), ['payment_method_id' => $qrMethod->id])
        ->assertSessionHasErrors('payment');

    expect($this->order->payments()->count())->toBe(0);
});
