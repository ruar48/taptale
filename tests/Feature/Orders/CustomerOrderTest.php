<?php

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderActivity;
use App\Models\OrderFile;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('customers only see their own orders', function () {
    $customer = User::factory()->create();
    Order::factory()->for($customer)->create();
    Order::factory()->create();

    $this->actingAs($customer)
        ->get(route('account.orders.index'))
        ->assertInertia(fn (Assert $page) => $page->component('account/orders/index')->has('orders.data', 1));
});

test('a customer cannot open another customer\'s order', function () {
    $order = Order::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('account.orders.show', $order))
        ->assertForbidden();
});

test('internal notes are hidden from the customer', function () {
    $order = Order::factory()->create();
    OrderActivity::factory()->for($order)->create(['body' => 'Your design is coming along!']);
    OrderActivity::factory()->for($order)->internal()->create(['body' => 'Customer is picky']);

    $this->actingAs($order->user)
        ->get(route('account.orders.show', $order))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('account/orders/show')
            ->has('order.activities', 1)
            ->where('order.activities.0.body', 'Your design is coming along!'));
});

test('an approved self-design is reported as approved before any proof exists', function () {
    $order = Order::factory()->selfCustomizedAndApproved()->create();

    $this->actingAs($order->user)
        ->get(route('account.orders.show', $order))
        ->assertInertia(fn (Assert $page) => $page->where('order.is_design_approved', true));
});

test('an order still opens after its payment method was deleted', function () {
    $order = Order::factory()->create(['payment_method_id' => null]);

    $this->actingAs($order->user)
        ->get(route('account.orders.show', $order))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('order.payment_method', null));
});

test('cash on delivery is not offered for paying a balance from the order page', function () {
    PaymentMethod::factory()->create(['driver' => 'cod']);
    $qrPh = PaymentMethod::factory()->create(['driver' => 'paymongo_qrph']);
    $order = Order::factory()->create();

    $this->actingAs($order->user)
        ->get(route('account.orders.show', $order))
        ->assertInertia(fn (Assert $page) => $page
            ->has('paymentMethods', 1)
            ->where('paymentMethods.0.id', $qrPh->id));
});

test('a customer can cancel an unpaid order but not one in production', function () {
    $unpaid = Order::factory()->status(OrderStatus::AwaitingPayment)->create();
    $inProduction = Order::factory()->status(OrderStatus::InProduction)->create();

    $this->actingAs($unpaid->user)->post(route('account.orders.cancel', $unpaid))->assertSessionHasNoErrors();
    $this->actingAs($inProduction->user)->post(route('account.orders.cancel', $inProduction))->assertSessionHasErrors('order');

    expect($unpaid->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($inProduction->fresh()->status)->toBe(OrderStatus::InProduction);
});

test('a customer uploads additional files to an open order', function () {
    Storage::fake('local');
    $order = Order::factory()->create();

    $this->actingAs($order->user)
        ->post(route('account.orders.files.store', $order), [
            'files' => [UploadedFile::fake()->image('extra.jpg'), UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf')],
            'note' => 'Use these too',
        ])
        ->assertSessionHasNoErrors();

    expect($order->files()->count())->toBe(2);
});

test('executable uploads are rejected', function () {
    Storage::fake('local');
    $order = Order::factory()->create();

    $this->actingAs($order->user)
        ->post(route('account.orders.files.store', $order), [
            'files' => [UploadedFile::fake()->create('evil.php', 1, 'application/x-php')],
        ])
        ->assertSessionHasErrors('files.0');

    expect($order->files()->count())->toBe(0);
});

test('private files are only served to the owner and admins', function () {
    Storage::fake('local');
    $order = Order::factory()->create();
    Storage::disk('local')->put('orders/1/photo.jpg', 'image-bytes');
    $file = OrderFile::factory()->for($order)->create(['path' => 'orders/1/photo.jpg']);

    $this->get(route('files.order', $file))->assertRedirect(route('login'));
    $this->actingAs(User::factory()->create())->get(route('files.order', $file))->assertForbidden();
    $this->actingAs($order->user)->get(route('files.order', $file))->assertOk();
    $this->actingAs(User::factory()->admin()->create())->get(route('files.order', $file))->assertOk();
});
