<?php

use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use App\Notifications\AdminOrderAlert;
use App\Notifications\OrderUpdated;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
    $this->admin = User::factory()->admin()->create();
});

test('a new unpaid order emails the customer but not the team, who hear once there is work to do', function () {
    $order = Order::factory()->create();

    $order->recordActivity(ActivityType::Placed, 'Order placed.', $order->user);
    $order->recordActivity(ActivityType::Cancelled, 'Cancelled by the customer.', $order->user);

    Notification::assertSentTo($order->user, OrderUpdated::class);
    Notification::assertNotSentTo($this->admin, AdminOrderAlert::class);

    $order->recordActivity(ActivityType::PaymentSubmitted, 'Payment submitted (ref. 123).', $order->user);

    Notification::assertSentTo($this->admin, AdminOrderAlert::class, fn (AdminOrderAlert $alert) => $alert->activity->type === ActivityType::PaymentSubmitted);
});

test('the team is alerted when an order is paid online or needs no payment', function () {
    $paidOnline = Order::factory()->create();
    $free = Order::factory()->create(['total' => 0]);

    $paidOnline->recordActivity(ActivityType::PaymentVerified, 'Online payment received through PayMongo.');
    $free->recordActivity(ActivityType::Placed, 'Order placed.', $free->user);

    Notification::assertSentTo($this->admin, AdminOrderAlert::class, fn (AdminOrderAlert $alert) => $alert->order->is($paidOnline)
        && $alert->toMail($this->admin)->subject === "Paid online: {$paidOnline->reference}");
    Notification::assertSentTo($this->admin, AdminOrderAlert::class, fn (AdminOrderAlert $alert) => $alert->order->is($free));
});

test('the customer is emailed when their order ships, with the tracking link', function () {
    $order = Order::factory()->selfCustomizedAndApproved()->status(OrderStatus::ReadyForShipment)->create([
        'courier' => 'J&T Express',
        'tracking_number' => 'JT123',
        'tracking_url' => 'https://tracking.example/JT123',
    ]);

    $this->actingAs($this->admin)
        ->put(route('admin.orders.status', $order), ['status' => OrderStatus::Shipped->value])
        ->assertSessionHasNoErrors();

    Notification::assertSentTo($order->user, OrderUpdated::class, function (OrderUpdated $notification) use ($order) {
        $mail = $notification->toMail($order->user);

        return $mail->subject === "Your order {$order->reference} is on its way"
            && $mail->actionUrl === 'https://tracking.example/JT123'
            && in_array('Tracking number: JT123', $mail->introLines, true);
    });
});

test('customers are not emailed about their own actions or internal notes', function () {
    $order = Order::factory()->create();

    $order->recordActivity(ActivityType::RevisionRequested, 'Bigger names please.', $order->user);
    $order->recordActivity(ActivityType::Note, 'Check the printer first.', $this->admin, internal: true);

    Notification::assertNotSentTo($order->user, OrderUpdated::class);
    Notification::assertSentTo($this->admin, AdminOrderAlert::class, fn (AdminOrderAlert $alert) => $alert->activity->type === ActivityType::RevisionRequested);
});

test('a message from the studio is emailed to the customer', function () {
    $order = Order::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('admin.orders.notes.store', $order), ['body' => 'Your photos look great!', 'is_internal' => false])
        ->assertSessionHasNoErrors();

    Notification::assertSentTo($order->user, OrderUpdated::class, fn (OrderUpdated $notification) => $notification->activity->body === 'Your photos look great!');
});

test('a completed order invites the customer to leave a review', function () {
    $order = Order::factory()->selfCustomizedAndApproved()->status(OrderStatus::Shipped)->create();

    $order->moveTo(OrderStatus::Completed, $this->admin);

    Notification::assertSentTo($order->user, OrderUpdated::class, function (OrderUpdated $notification) use ($order) {
        return $notification->toMail($order->user)->actionUrl === route('account.orders.show', $order).'#review';
    });
});

test('a customer sending receipt after receipt only emails the team a few times a day', function () {
    $order = Order::factory()->create();

    foreach (range(1, 5) as $receipt) {
        $order->recordActivity(ActivityType::PaymentSubmitted, "Payment submitted (ref. {$receipt}).", $order->user);
    }

    expect(Notification::sent($this->admin, AdminOrderAlert::class)->count())->toBe(3);
});
