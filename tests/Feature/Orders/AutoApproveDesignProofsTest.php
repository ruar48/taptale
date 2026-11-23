<?php

use App\Actions\Orders\AutoApproveDesignProofs;
use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Enums\ProofStatus;
use App\Models\DesignProof;
use App\Models\Order;
use App\Models\User;
use App\Notifications\AdminOrderAlert;
use App\Notifications\OrderUpdated;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
    config(['taptale.proof_auto_approve_hours' => 24]);
});

test('a proof with no reply for 24 hours is approved automatically, and everyone is told', function () {
    $admin = User::factory()->admin()->create();
    $order = Order::factory()->status(OrderStatus::AwaitingCustomerApproval)->create();
    $proof = DesignProof::factory()->for($order)->create(['created_at' => now()->subHours(25)]);

    expect(app(AutoApproveDesignProofs::class)->handle())->toBe(1);

    $activity = $order->activities()->sole();

    expect($proof->fresh())
        ->status->toBe(ProofStatus::Approved)
        ->responded_at->not->toBeNull()
        ->and($order->fresh()->status)->toBe(OrderStatus::DesignApproved)
        ->and($order->fresh()->isDesignApproved())->toBeTrue()
        ->and($activity->type)->toBe(ActivityType::DesignApproved)
        ->and($activity->user_id)->toBeNull()
        ->and($activity->body)->toContain('approved automatically');

    Notification::assertSentTo($order->user, OrderUpdated::class, fn (OrderUpdated $notification) => $notification->activity->is($activity));
    Notification::assertSentTo($admin, AdminOrderAlert::class);
});

test('proofs the customer still has time for, already answered or replaced are left alone', function () {
    $recent = DesignProof::factory()
        ->for(Order::factory()->status(OrderStatus::AwaitingCustomerApproval))
        ->create(['created_at' => now()->subHours(23)]);

    $answered = DesignProof::factory()
        ->for(Order::factory()->status(OrderStatus::RevisionRequested))
        ->create(['created_at' => now()->subDays(3), 'status' => ProofStatus::RevisionRequested]);

    $replacedOrder = Order::factory()->status(OrderStatus::AwaitingCustomerApproval)->create();
    $replaced = DesignProof::factory()->for($replacedOrder)->create(['version' => 1, 'created_at' => now()->subDays(3)]);
    DesignProof::factory()->for($replacedOrder)->create(['version' => 2, 'created_at' => now()->subHour()]);

    $cancelled = DesignProof::factory()
        ->for(Order::factory()->status(OrderStatus::Cancelled))
        ->create(['created_at' => now()->subDays(3)]);

    expect(app(AutoApproveDesignProofs::class)->handle())->toBe(0)
        ->and($recent->fresh()->status)->toBe(ProofStatus::AwaitingResponse)
        ->and($answered->fresh()->status)->toBe(ProofStatus::RevisionRequested)
        ->and($replaced->fresh()->status)->toBe(ProofStatus::AwaitingResponse)
        ->and($cancelled->fresh()->status)->toBe(ProofStatus::AwaitingResponse);
});

test('an unpaid order keeps waiting for payment when its proof is approved automatically', function () {
    $order = Order::factory()->status(OrderStatus::AwaitingPayment)->create();
    DesignProof::factory()->for($order)->create(['created_at' => now()->subHours(25)]);

    app(AutoApproveDesignProofs::class)->handle();

    expect($order->fresh())
        ->status->toBe(OrderStatus::AwaitingPayment)
        ->isDesignApproved()->toBeTrue();
});

test('automatic approval can be turned off', function () {
    config(['taptale.proof_auto_approve_hours' => 0]);
    $proof = DesignProof::factory()
        ->for(Order::factory()->status(OrderStatus::AwaitingCustomerApproval))
        ->create(['created_at' => now()->subDays(3)]);

    expect(app(AutoApproveDesignProofs::class)->handle())->toBe(0)
        ->and($proof->fresh()->status)->toBe(ProofStatus::AwaitingResponse)
        ->and($proof->fresh()->autoApprovesAt())->toBeNull();
});

test('the order page shows when a waiting proof will be approved', function () {
    $order = Order::factory()->status(OrderStatus::AwaitingCustomerApproval)->create();
    $proof = DesignProof::factory()->for($order)->create();

    $this->actingAs($order->user)
        ->get(route('account.orders.show', $order))
        ->assertInertia(fn ($page) => $page
            ->where('order.proofs.0.auto_approves_at', $proof->created_at->addHours(24)->toIso8601String()));
});
