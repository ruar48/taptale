<?php

use App\Enums\OrderStatus;
use App\Enums\ProofStatus;
use App\Models\DesignProof;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    $this->admin = User::factory()->admin()->create();
});

test('an admin sends a design proof for customer approval', function () {
    $order = Order::factory()->status(OrderStatus::DesignInProgress)->create();

    $this->actingAs($this->admin)
        ->post(route('admin.orders.proofs.store', $order), [
            'proof' => UploadedFile::fake()->image('design.png'),
            'designer_notes' => 'Here is your first draft!',
        ])
        ->assertSessionHasNoErrors();

    $proof = $order->proofs()->sole();

    expect($proof->version)->toBe(1)
        ->and($proof->status)->toBe(ProofStatus::AwaitingResponse)
        ->and($order->fresh()->status)->toBe(OrderStatus::AwaitingCustomerApproval);

    Storage::disk('local')->assertExists($proof->path);
});

test('the customer approves the latest design', function () {
    $order = Order::factory()->status(OrderStatus::AwaitingCustomerApproval)->create();
    $proof = DesignProof::factory()->for($order)->create();

    $this->actingAs($order->user)
        ->post(route('account.orders.proofs.approve', [$order, $proof]), ['comment' => 'Perfect!'])
        ->assertSessionHasNoErrors();

    expect($proof->fresh()->status)->toBe(ProofStatus::Approved)
        ->and($order->fresh()->status)->toBe(OrderStatus::DesignApproved)
        ->and($order->fresh()->isDesignApproved())->toBeTrue();
});

test('the customer requests a revision with a comment', function () {
    $order = Order::factory()->status(OrderStatus::AwaitingCustomerApproval)->create();
    $proof = DesignProof::factory()->for($order)->create();

    $this->actingAs($order->user)
        ->post(route('account.orders.proofs.revision', [$order, $proof]), ['comment' => ''])
        ->assertSessionHasErrors(['comment' => 'Please tell us what you would like to change.']);

    $this->actingAs($order->user)
        ->post(route('account.orders.proofs.revision', [$order, $proof]), ['comment' => 'Bigger names please.'])
        ->assertSessionHasNoErrors();

    expect($proof->fresh())
        ->status->toBe(ProofStatus::RevisionRequested)
        ->customer_comment->toBe('Bigger names please.')
        ->and($order->fresh()->status)->toBe(OrderStatus::RevisionRequested);
});

test('another customer cannot respond to a design proof', function () {
    $order = Order::factory()->status(OrderStatus::AwaitingCustomerApproval)->create();
    $proof = DesignProof::factory()->for($order)->create();

    $this->actingAs(User::factory()->create())
        ->post(route('account.orders.proofs.approve', [$order, $proof]))
        ->assertForbidden();

    expect($proof->fresh()->status)->toBe(ProofStatus::AwaitingResponse);
});

test('an outdated proof cannot be approved', function () {
    $order = Order::factory()->status(OrderStatus::AwaitingCustomerApproval)->create();
    $old = DesignProof::factory()->for($order)->create(['version' => 1, 'status' => ProofStatus::RevisionRequested]);
    DesignProof::factory()->for($order)->create(['version' => 2]);

    $this->actingAs($order->user)
        ->post(route('account.orders.proofs.approve', [$order, $old]))
        ->assertSessionHasErrors(['proof' => 'This design is no longer awaiting your response.']);
});

test('production can start without a design approval', function () {
    $order = Order::factory()->status(OrderStatus::PendingDesign)->create();

    $this->actingAs($this->admin)
        ->put(route('admin.orders.status', $order), ['status' => OrderStatus::InProduction->value])
        ->assertSessionHasNoErrors();

    expect($order->fresh()->status)->toBe(OrderStatus::InProduction);
});

test('production starts once the latest proof is approved', function () {
    $order = Order::factory()->status(OrderStatus::DesignApproved)->create();
    DesignProof::factory()->for($order)->approved()->create();

    $this->actingAs($this->admin)
        ->put(route('admin.orders.status', $order), ['status' => OrderStatus::InProduction->value, 'note' => 'Printing today'])
        ->assertSessionHasNoErrors();

    expect($order->fresh()->status)->toBe(OrderStatus::InProduction)
        ->and($order->activities()->latest('id')->first()->body)->toBe('Printing today');
});

test('a self-customized order with an approved preview can go to production', function () {
    $order = Order::factory()->selfCustomizedAndApproved()->status(OrderStatus::DesignApproved)->create();

    $this->actingAs($this->admin)
        ->put(route('admin.orders.status', $order), ['status' => OrderStatus::InProduction->value])
        ->assertSessionHasNoErrors();

    expect($order->fresh()->status)->toBe(OrderStatus::InProduction);
});
