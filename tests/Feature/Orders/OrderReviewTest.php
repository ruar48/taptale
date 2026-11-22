<?php

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Testimonial;
use App\Models\User;
use App\Notifications\AdminOrderAlert;
use Illuminate\Support\Facades\Notification;

test('a customer reviews a delivered order and it waits for approval', function () {
    Notification::fake();
    $admin = User::factory()->admin()->create();
    $order = Order::factory()->status(OrderStatus::Completed)->create();

    $this->actingAs($order->user)
        ->post(route('account.orders.review.store', $order), [
            'rating' => 5,
            'quote' => 'She cried happy tears when she tapped it.',
            'author_name' => 'Ana',
        ])
        ->assertSessionHasNoErrors();

    $review = Testimonial::sole();

    expect($review)
        ->order_id->toBe($order->id)
        ->user_id->toBe($order->user_id)
        ->rating->toBe(5)
        ->is_published->toBeFalse()
        ->and(Testimonial::published()->count())->toBe(0);

    Notification::assertSentTo($admin, AdminOrderAlert::class);
});

test('an order can only be reviewed once it has shipped, and only once', function () {
    $order = Order::factory()->status(OrderStatus::InProduction)->create();
    $review = ['rating' => 4, 'quote' => 'Lovely keychain, fast replies.', 'author_name' => 'Leo'];

    $this->actingAs($order->user)
        ->post(route('account.orders.review.store', $order), $review)
        ->assertSessionHasErrors('review');

    $order->update(['status' => OrderStatus::Shipped]);

    $this->actingAs($order->user)->post(route('account.orders.review.store', $order), $review)->assertSessionHasNoErrors();
    $this->actingAs($order->user)->post(route('account.orders.review.store', $order), $review)->assertSessionHasErrors('review');

    expect(Testimonial::count())->toBe(1);
});

test('a customer cannot review someone else\'s order', function () {
    $order = Order::factory()->status(OrderStatus::Completed)->create();

    $this->actingAs(User::factory()->create())
        ->post(route('account.orders.review.store', $order), ['rating' => 1, 'quote' => 'Fake review text here.', 'author_name' => 'X'])
        ->assertForbidden();
});

test('an admin publishes a review to the storefront', function () {
    $review = Testimonial::factory()->create(['is_published' => false]);

    $this->actingAs(User::factory()->admin()->create())
        ->put(route('admin.reviews.update', $review), ['is_published' => true])
        ->assertSessionHasNoErrors();

    expect(Testimonial::published()->pluck('id')->all())->toBe([$review->id]);
});
