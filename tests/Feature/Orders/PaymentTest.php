<?php

use App\Enums\OrderStatus;
use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    $this->admin = User::factory()->admin()->create();
    $this->method = PaymentMethod::factory()->create();
});

test('a customer submits proof of payment for verification', function () {
    $order = Order::factory()->create(['total' => 75000]);

    $this->actingAs($order->user)
        ->post(route('account.orders.payments.store', $order), [
            'payment_method_id' => $this->method->id,
            'amount' => '750.00',
            'reference_number' => 'GC123456',
            'proof' => UploadedFile::fake()->image('receipt.jpg'),
        ])
        ->assertSessionHasNoErrors();

    $payment = $order->payments()->sole();

    expect($payment)
        ->amount->toBe(75000)
        ->status->toBe(PaymentStatus::Submitted)
        ->and($order->fresh()->status)->toBe(OrderStatus::PaymentVerification);

    Storage::disk('local')->assertExists($payment->proof_path);
});

test('a customer cannot pay more than the balance due', function () {
    $order = Order::factory()->create(['total' => 75000]);

    $this->actingAs($order->user)
        ->post(route('account.orders.payments.store', $order), [
            'payment_method_id' => $this->method->id,
            'amount' => '900.00',
            'reference_number' => 'GC123456',
            'proof' => UploadedFile::fake()->image('receipt.jpg'),
        ])
        ->assertSessionHasErrors(['amount' => 'The amount cannot be more than the balance due.']);
});

test('payments are only accepted while the order awaits payment', function () {
    $order = Order::factory()->status(OrderStatus::InProduction)->create();

    $this->actingAs($order->user)
        ->post(route('account.orders.payments.store', $order), [
            'payment_method_id' => $this->method->id,
            'amount' => '100.00',
            'reference_number' => 'GC1',
            'proof' => UploadedFile::fake()->image('receipt.jpg'),
        ])
        ->assertSessionHasErrors(['payment' => 'This order is not awaiting payment.']);
});

test('another customer cannot pay for an order', function () {
    $order = Order::factory()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('account.orders.payments.store', $order), [])
        ->assertForbidden();
});

test('verifying full payment moves a Taptale-designed order to pending design', function () {
    $order = Order::factory()->status(OrderStatus::PaymentVerification)->create(['total' => 75000]);
    $payment = Payment::factory()->for($order)->create(['amount' => 75000]);

    $this->actingAs($this->admin)->post(route('admin.payments.verify', $payment))->assertSessionHasNoErrors();

    expect($payment->fresh()->status)->toBe(PaymentStatus::Verified)
        ->and($payment->fresh()->reviewed_by)->toBe($this->admin->id)
        ->and($order->fresh()->status)->toBe(OrderStatus::PendingDesign);
});

test('verifying full payment for an approved self-design moves it to design approved', function () {
    $order = Order::factory()->selfCustomizedAndApproved()->status(OrderStatus::PaymentVerification)->create(['total' => 60000]);
    $payment = Payment::factory()->for($order)->create(['amount' => 60000]);

    $this->actingAs($this->admin)->post(route('admin.payments.verify', $payment));

    expect($order->fresh()->status)->toBe(OrderStatus::DesignApproved);
});

test('a partial payment keeps the order awaiting payment', function () {
    $order = Order::factory()->status(OrderStatus::PaymentVerification)->create(['total' => 75000]);
    $payment = Payment::factory()->for($order)->create(['amount' => 30000]);

    $this->actingAs($this->admin)->post(route('admin.payments.verify', $payment));

    expect($order->fresh()->status)->toBe(OrderStatus::AwaitingPayment)
        ->and($order->fresh()->load('payments')->balanceDue())->toBe(45000);
});

test('rejecting a payment requires a reason and reopens payment', function () {
    $order = Order::factory()->status(OrderStatus::PaymentVerification)->create();
    $payment = Payment::factory()->for($order)->create();

    $this->actingAs($this->admin)
        ->post(route('admin.payments.reject', $payment), ['review_notes' => ''])
        ->assertSessionHasErrors('review_notes');

    $this->actingAs($this->admin)
        ->post(route('admin.payments.reject', $payment), ['review_notes' => 'Reference not found.'])
        ->assertSessionHasNoErrors();

    expect($payment->fresh()->status)->toBe(PaymentStatus::Rejected)
        ->and($order->fresh()->status)->toBe(OrderStatus::AwaitingPayment);
});

test('a reviewed payment cannot be reviewed again', function () {
    $payment = Payment::factory()->verified()->create();

    $this->actingAs($this->admin)
        ->post(route('admin.payments.reject', $payment), ['review_notes' => 'Oops'])
        ->assertSessionHasErrors(['payment' => 'This payment has already been reviewed.']);
});

test('a refund cannot exceed the amount paid', function () {
    $order = Order::factory()->status(OrderStatus::Cancelled)->create();
    Payment::factory()->for($order)->verified()->create(['amount' => 50000]);

    $this->actingAs($this->admin)
        ->post(route('admin.orders.refunds.store', $order), ['amount' => '600', 'notes' => 'Cancelled'])
        ->assertSessionHasErrors(['amount' => 'A refund cannot exceed the amount paid.']);

    $this->actingAs($this->admin)
        ->post(route('admin.orders.refunds.store', $order), ['amount' => '500', 'notes' => 'Cancelled'])
        ->assertSessionHasNoErrors();

    $refund = $order->payments()->where('kind', PaymentKind::Refund)->sole();

    expect($refund->amount)->toBe(50000)
        ->and($order->fresh()->load('payments')->amountPaid())->toBe(0);
});

test('an admin records cash collected on delivery, up to the balance due', function () {
    $cashOnDelivery = PaymentMethod::factory()->create(['driver' => 'cod']);
    $order = Order::factory()->status(OrderStatus::Shipped)->create(['total' => 75000, 'payment_method_id' => $cashOnDelivery->id]);

    $this->actingAs($this->admin)
        ->post(route('admin.orders.payments.store', $order), ['amount' => '800', 'notes' => 'Collected by the courier'])
        ->assertSessionHasErrors(['amount' => 'A payment cannot exceed the balance due.']);

    $this->actingAs($this->admin)
        ->post(route('admin.orders.payments.store', $order), ['amount' => '750', 'notes' => 'Collected by the courier'])
        ->assertSessionHasNoErrors();

    expect($order->payments()->sole())
        ->status->toBe(PaymentStatus::Verified)
        ->amount->toBe(75000)
        ->payment_method_id->toBe($cashOnDelivery->id)
        ->reviewed_by->toBe($this->admin->id)
        ->and($order->fresh()->load('payments')->balanceDue())->toBe(0)
        ->and($order->fresh()->status)->toBe(OrderStatus::Shipped);
});

test('an adjustment changes the order total', function () {
    $order = Order::factory()->create(['subtotal' => 50000, 'customization_fee' => 10000, 'delivery_fee' => 15000, 'total' => 75000]);

    $this->actingAs($this->admin)
        ->put(route('admin.orders.adjust', $order), ['adjustment' => '-100', 'adjustment_note' => 'Loyalty discount'])
        ->assertSessionHasNoErrors();

    expect($order->fresh())->adjustment->toBe(-10000)->total->toBe(65000);
});

test('an adjustment keeps the flowers add-on in the order total', function () {
    $order = Order::factory()->create(['subtotal' => 50000, 'customization_fee' => 0, 'flowers_fee' => 500, 'delivery_fee' => 15000, 'total' => 65500]);

    $this->actingAs($this->admin)
        ->put(route('admin.orders.adjust', $order), ['adjustment' => '-100', 'adjustment_note' => 'Loyalty discount'])
        ->assertSessionHasNoErrors();

    expect($order->fresh())->total->toBe(55500);
});
