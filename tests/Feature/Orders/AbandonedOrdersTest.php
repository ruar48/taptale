<?php

use App\Actions\Orders\CancelAbandonedOrders;
use App\Enums\OrderFileKind;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\DigitalExperience;
use App\Models\Order;
use App\Models\Payment;
use App\Notifications\OrderUpdated;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    Notification::fake();
});

/**
 * An unpaid order placed the given number of days ago, with one uploaded
 * photo and a memory page holding one photo.
 */
function abandonedOrder(int $daysAgo, array $state = []): Order
{
    $order = Order::factory()->status(OrderStatus::AwaitingPayment)->create(['created_at' => now()->subDays($daysAgo), ...$state]);

    Storage::disk('local')->put("orders/{$order->id}/photo.jpg", 'photo');
    $order->files()->create([
        'kind' => OrderFileKind::Photo,
        'disk' => 'local',
        'path' => "orders/{$order->id}/photo.jpg",
        'original_name' => 'photo.jpg',
        'mime_type' => 'image/jpeg',
        'size' => 5,
    ]);

    Storage::disk('local')->put("experiences/{$order->id}/page.jpg", 'page');
    DigitalExperience::factory()->for($order)->create(['user_id' => $order->user_id, 'photos' => ["experiences/{$order->id}/page.jpg"]]);

    return $order;
}

test('an unpaid order past the limit is cancelled, its uploads deleted and the customer told', function () {
    $order = abandonedOrder(daysAgo: 15);

    expect(app(CancelAbandonedOrders::class)->handle())->toBe(1);

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($order->files()->count())->toBe(0)
        ->and(DigitalExperience::where('order_id', $order->id)->exists())->toBeFalse()
        ->and(Storage::disk('local')->allFiles())->toBeEmpty();

    Notification::assertSentTo($order->user, OrderUpdated::class, fn (OrderUpdated $notification) => str_contains((string) $notification->activity->body, 'not paid within 14 days'));
});

test('recent, partly paid and receipt-under-review orders are left alone', function () {
    $recent = abandonedOrder(daysAgo: 13);
    $partlyPaid = abandonedOrder(daysAgo: 30);
    Payment::factory()->verified()->for($partlyPaid)->create(['amount' => 10000]);
    $underReview = abandonedOrder(daysAgo: 30, state: ['status' => OrderStatus::PaymentVerification]);
    Payment::factory()->for($underReview)->create(['status' => PaymentStatus::Submitted]);

    expect(app(CancelAbandonedOrders::class)->handle())->toBe(0);

    foreach ([$recent, $partlyPaid, $underReview] as $order) {
        expect($order->fresh()->status)->not->toBe(OrderStatus::Cancelled)
            ->and($order->files()->count())->toBe(1);
    }
});

test('the hourly schedule runs the clean-up', function () {
    $order = abandonedOrder(daysAgo: 20);

    $this->travelTo(now()->startOfHour());
    $this->artisan('schedule:run');

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled);
});
