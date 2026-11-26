<?php

use App\Enums\ExperienceTemplate;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\ProofStatus;
use App\Models\DesignProof;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    $this->admin = User::factory()->admin()->create();
});

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function manualOrderData(Product $product, array $overrides = []): array
{
    return [
        'channel' => 'messenger',
        'product_id' => $product->id,
        'experience_template' => 'classic',
        'option_ids' => [],
        'quantity' => 2,
        'charge_design_fee' => true,
        'delivery_fee' => 150,
        'personalization' => ['names' => 'Ana & Leo', 'design_brief' => 'Use the beach photo from chat.'],
        'customer_name' => 'Ana Santos',
        'customer_phone' => '09171234567',
        ...$overrides,
    ];
}

test('an admin creates a messenger order for a customer without an account', function () {
    $product = Product::factory()->create(['base_price' => 25000, 'design_fee' => 10000]);

    $this->actingAs($this->admin)
        ->post(route('admin.orders.store'), manualOrderData($product))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $order = Order::query()->sole();

    expect($order)
        ->user_id->toBeNull()
        ->channel->toBe(OrderChannel::Messenger)
        ->status->toBe(OrderStatus::AwaitingPayment)
        ->subtotal->toBe(50000)
        ->customization_fee->toBe(10000)
        ->delivery_fee->toBe(15000)
        ->total->toBe(75000)
        ->customer_email->toBe('')
        ->personalization->toBe(['names' => 'Ana & Leo', 'design_brief' => 'Use the beach photo from chat.'])
        ->and($order->approvalUrl())->not->toBeNull();
});

test('a walk-in order paid in full moves straight on to design', function () {
    $product = Product::factory()->create(['base_price' => 25000]);
    $cash = PaymentMethod::factory()->create(['name' => 'Cash']);

    $this->actingAs($this->admin)
        ->post(route('admin.orders.store'), manualOrderData($product, [
            'channel' => 'walk_in',
            'quantity' => 1,
            'charge_design_fee' => false,
            'delivery_fee' => 0,
            'payment_method_id' => $cash->id,
            'is_paid' => true,
        ]))
        ->assertSessionHasNoErrors();

    $order = Order::query()->with('payments')->sole();

    expect($order->status)->toBe(OrderStatus::PendingDesign)
        ->and($order->total)->toBe(25000)
        ->and($order->balanceDue())->toBe(0)
        ->and($order->payments->sole()->status)->toBe(PaymentStatus::Verified);
});

test('a manual order gets the website template the studio picked, without an owner', function () {
    $product = Product::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('admin.orders.store'), manualOrderData($product, ['experience_template' => 'birthday']))
        ->assertSessionHasNoErrors();

    $order = Order::query()->sole();

    expect($order->experience)->not->toBeNull()
        ->and($order->experience->template)->toBe(ExperienceTemplate::Birthday)
        ->and($order->experience->user_id)->toBeNull()
        ->and($order->websiteEditUrl())->not->toBeNull();
});

test('a manual order needs a website template', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.orders.store'), manualOrderData(Product::factory()->create(), ['experience_template' => '']))
        ->assertSessionHasErrors(['experience_template' => 'Please choose a website template.']);
});

test('a manual order needs a phone number or an email', function () {
    $product = Product::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('admin.orders.store'), manualOrderData($product, ['customer_phone' => '']))
        ->assertSessionHasErrors(['customer_phone' => 'Add a phone number or an email so you can reach the customer.']);

    expect(Order::query()->count())->toBe(0);
});

test('customers cannot create manual orders', function () {
    $product = Product::factory()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('admin.orders.store'), manualOrderData($product))
        ->assertForbidden();

    expect(Order::query()->count())->toBe(0);
});

test('the customer views and approves the design from the approval link without logging in', function () {
    $order = Order::factory()->status(OrderStatus::AwaitingCustomerApproval)->create(['user_id' => null]);
    $order->issueApprovalToken();
    $proof = DesignProof::factory()->for($order)->create([
        'path' => UploadedFile::fake()->image('design.png')->store("proofs/{$order->id}", 'local'),
    ]);
    $key = $order->approval_token;

    $this->get($order->approvalUrl())
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('storefront/design-review')
            ->where('proofs.0.id', $proof->id)
            ->where('proofs.0.is_awaiting_response', true));

    $this->get(route('design-review.proof', ['order' => $order, 'proof' => $proof, 'k' => $key]))->assertOk();

    $this->post(route('design-review.approve', ['order' => $order, 'proof' => $proof, 'k' => $key]), ['comment' => 'Love it!'])
        ->assertSessionHasNoErrors();

    expect($proof->fresh())
        ->status->toBe(ProofStatus::Approved)
        ->customer_comment->toBe('Love it!')
        ->and($order->fresh()->status)->toBe(OrderStatus::DesignApproved);
});

test('the customer asks for changes from the approval link', function () {
    $order = Order::factory()->status(OrderStatus::AwaitingCustomerApproval)->create(['user_id' => null]);
    $order->issueApprovalToken();
    $proof = DesignProof::factory()->for($order)->create();

    $this->post(route('design-review.revision', ['order' => $order, 'proof' => $proof, 'k' => $order->approval_token]), ['comment' => 'Bigger names please.'])
        ->assertSessionHasNoErrors();

    expect($proof->fresh()->status)->toBe(ProofStatus::RevisionRequested)
        ->and($order->fresh()->status)->toBe(OrderStatus::RevisionRequested);
});

test('the approval link needs the right key', function (?string $key) {
    $order = Order::factory()->status(OrderStatus::AwaitingCustomerApproval)->create();
    $order->issueApprovalToken();
    $proof = DesignProof::factory()->for($order)->create();

    $this->get(route('design-review.show', ['order' => $order, 'k' => $key]))->assertNotFound();
    $this->get(route('design-review.proof', ['order' => $order, 'proof' => $proof, 'k' => $key]))->assertNotFound();
    $this->post(route('design-review.approve', ['order' => $order, 'proof' => $proof, 'k' => $key]))->assertNotFound();

    expect($proof->fresh()->status)->toBe(ProofStatus::AwaitingResponse);
})->with([
    'missing' => null,
    'wrong' => 'not-the-key',
]);

test('a key cannot open another order or its designs', function () {
    $order = Order::factory()->create();
    $order->issueApprovalToken();
    $otherOrder = Order::factory()->create();
    $otherProof = DesignProof::factory()->for($otherOrder)->create();

    $this->get(route('design-review.proof', ['order' => $order, 'proof' => $otherProof, 'k' => $order->approval_token]))
        ->assertNotFound();
});

test('an admin replaces or turns off the approval link', function () {
    $order = Order::factory()->create();
    $order->issueApprovalToken();
    $oldUrl = $order->approvalUrl();

    $this->actingAs($this->admin)
        ->post(route('admin.orders.approval-link.store', $order))
        ->assertSessionHasNoErrors();

    $this->get($oldUrl)->assertNotFound();
    $this->get($order->fresh()->approvalUrl())->assertOk();

    $this->actingAs($this->admin)
        ->delete(route('admin.orders.approval-link.destroy', $order));

    expect($order->fresh()->approval_token)->toBeNull();
});
