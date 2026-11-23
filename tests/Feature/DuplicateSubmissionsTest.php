<?php

use App\Enums\DesignMode;
use App\Enums\OptionGroup;
use App\Models\Category;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\User;
use Illuminate\Contracts\Cache\Lock;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
});

/**
 * A complete checkout for a fresh product, paid with the given method.
 *
 * @return array<string, mixed>
 */
function repeatableCheckout(PaymentMethod $paymentMethod): array
{
    $category = Category::factory()->create();
    $product = Product::factory()->create(['base_price' => 15000, 'design_fee' => 0, 'min_quantity' => 1]);
    $category->products()->attach($product);
    $size = ProductOption::factory()->for($product)->group(OptionGroup::Size)->create();

    return [
        'category_id' => $category->id,
        'product_id' => $product->id,
        'design_mode' => DesignMode::SelfCustomized->value,
        'option_ids' => [$size->id],
        'quantity' => 1,
        'personalization' => ['names' => 'Ana & Leo'],
        'approve_preview' => true,
        'customer_name' => 'Ana Cruz',
        'customer_email' => 'ana@example.com',
        'customer_phone' => '0917 123 4567',
        'address_line' => '12 Sampaguita St.',
        'city' => 'Quezon City',
        'province' => 'Metro Manila',
        'postal_code' => '1100',
        'payment_method_id' => $paymentMethod->id,
    ];
}

test('placing the same order twice creates it once and sends the repeat to that order', function () {
    $customer = User::factory()->create();
    $checkout = repeatableCheckout(PaymentMethod::factory()->create());

    $first = $this->actingAs($customer)->post(route('orders.store'), $checkout);
    $repeat = $this->actingAs($customer)->post(route('orders.store'), $checkout);

    $order = Order::sole();
    $first->assertRedirect(route('account.orders.show', $order));
    $repeat->assertStatus(303)->assertRedirect(route('account.orders.show', $order));
});

test('repeating a PayMongo order returns to the same checkout without opening another', function () {
    config(['services.paymongo.secret_key' => 'sk_test_secret']);
    Http::preventStrayRequests();
    Http::fake(['api.paymongo.com/v1/checkout_sessions' => Http::response(['data' => [
        'id' => 'cs_repeat',
        'type' => 'checkout_session',
        'attributes' => ['status' => 'active', 'checkout_url' => 'https://checkout.paymongo.com/cs_repeat', 'payments' => []],
    ]])]);
    $customer = User::factory()->create();
    $checkout = repeatableCheckout(PaymentMethod::factory()->create(['driver' => 'paymongo']));

    $first = $this->actingAs($customer)->withHeaders(['X-Inertia' => 'true'])->post(route('orders.store'), $checkout);
    $repeat = $this->actingAs($customer)->withHeaders(['X-Inertia' => 'true'])->post(route('orders.store'), $checkout);

    $first->assertConflict()->assertHeader('X-Inertia-Location', 'https://checkout.paymongo.com/cs_repeat');
    $repeat->assertConflict()->assertHeader('X-Inertia-Location', 'https://checkout.paymongo.com/cs_repeat');
    expect(Order::count())->toBe(1);
    Http::assertSentCount(1);
});

test('trying again after a failed submission really tries again', function () {
    $customer = User::factory()->unverified()->create();
    $checkout = repeatableCheckout(PaymentMethod::factory()->create());

    $this->actingAs($customer)->post(route('orders.store'), $checkout)->assertSessionHasErrors('email_verification');
    $customer->markEmailAsVerified();
    $retry = $this->actingAs($customer)->post(route('orders.store'), $checkout);

    $retry->assertSessionHasNoErrors();
    expect(Order::count())->toBe(1);
});

test('a repeat that arrives while the first is still running asks the customer to wait', function () {
    $lock = Mockery::mock(Lock::class);
    $lock->shouldReceive('block')->andThrow(new LockTimeoutException);
    Cache::partialMock()->shouldReceive('lock')->andReturn($lock);
    $customer = User::factory()->create();
    $checkout = repeatableCheckout(PaymentMethod::factory()->create());

    $response = $this->actingAs($customer)->from(route('orders.create'))->post(route('orders.store'), $checkout);

    $response->assertRedirect(route('orders.create'))->assertInertiaFlash('toast', [
        'type' => 'info',
        'message' => 'We are still working on your last request. Please wait a moment.',
    ]);
    expect(Order::count())->toBe(0);
});

test('orders still go through when the cache is down', function () {
    Exceptions::fake();
    Cache::partialMock()->shouldReceive('lock')->andThrow(new RuntimeException('Cache is down'));
    $customer = User::factory()->create();
    $checkout = repeatableCheckout(PaymentMethod::factory()->create());

    $this->actingAs($customer)->post(route('orders.store'), $checkout)->assertSessionHasNoErrors();

    expect(Order::count())->toBe(1);
    Exceptions::assertReported(fn (RuntimeException $exception) => $exception->getMessage() === 'Cache is down');
});
