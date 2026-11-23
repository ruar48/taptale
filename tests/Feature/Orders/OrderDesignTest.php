<?php

use App\Enums\ActivityType;
use App\Enums\OrderFileKind;
use App\Enums\OrderStatus;
use App\Enums\TemplateLayout;
use App\Models\DesignProof;
use App\Models\Order;
use App\Models\OrderFile;
use App\Models\Template;
use App\Models\User;
use App\Notifications\AdminOrderAlert;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    Notification::fake();
});

test('a customer saves their design details and photos for later', function () {
    $order = Order::factory()->selfCustomized()->status(OrderStatus::PendingDesign)->create();

    $this->actingAs($order->user)
        ->post(route('account.orders.design.update', $order), [
            'personalization' => ['names' => '  Ana & Leo ', 'date' => '02 · 14 · 2026', 'message' => ''],
            'photos' => [UploadedFile::fake()->image('us.jpg')],
        ])
        ->assertSessionHasNoErrors();

    $order->refresh();
    $photo = $order->files()->sole();

    expect($order->personalization)->toBe(['names' => 'Ana & Leo', 'date' => '02 · 14 · 2026'])
        ->and($photo->kind)->toBe(OrderFileKind::Photo)
        ->and($order->preview_approved_at)->toBeNull()
        ->and($order->status)->toBe(OrderStatus::PendingDesign);

    Storage::disk('local')->assertExists($photo->path);
});

test('a customer replaces a design photo', function () {
    $order = Order::factory()->selfCustomized()->create();
    Storage::disk('local')->put('orders/1/old.jpg', 'image-bytes');
    $old = OrderFile::factory()->for($order)->create(['kind' => OrderFileKind::Photo, 'path' => 'orders/1/old.jpg']);

    $this->actingAs($order->user)
        ->post(route('account.orders.design.update', $order), [
            'remove_photos' => [$old->id],
            'photos' => [UploadedFile::fake()->image('new.jpg')],
        ])
        ->assertSessionHasNoErrors();

    expect(OrderFile::find($old->id))->toBeNull()
        ->and($order->files()->count())->toBe(1);

    Storage::disk('local')->assertMissing('orders/1/old.jpg');
});

test('a design cannot hold more photos than the product allows', function () {
    $order = Order::factory()->selfCustomized()->create();
    $order->product->update(['max_photos' => 1]);
    OrderFile::factory()->for($order)->create(['kind' => OrderFileKind::Photo]);

    $this->actingAs($order->user)
        ->post(route('account.orders.design.update', $order), [
            'photos' => [UploadedFile::fake()->image('extra.jpg')],
        ])
        ->assertSessionHasErrors(['photos' => 'Your design can have up to 1 photos. Remove one to add another.']);

    expect($order->files()->count())->toBe(1);
});

test('a customer approves their own design, which is final', function () {
    $order = Order::factory()->selfCustomized()->status(OrderStatus::PendingDesign)->create();
    $admin = User::factory()->admin()->create();

    $this->actingAs($order->user)
        ->post(route('account.orders.design.approve', $order), [
            'personalization' => ['names' => 'Ana & Leo'],
            'photos' => [UploadedFile::fake()->image('us.jpg')],
            'confirm_final' => true,
        ])
        ->assertSessionHasNoErrors();

    $order->refresh();

    expect($order->preview_approved_at)->not->toBeNull()
        ->and($order->status)->toBe(OrderStatus::DesignApproved)
        ->and($order->isDesignApproved())->toBeTrue()
        ->and($order->activities()->sole()->type)->toBe(ActivityType::DesignApproved);

    Notification::assertSentTo($admin, AdminOrderAlert::class);

    $this->actingAs($order->user)
        ->post(route('account.orders.design.update', $order), ['personalization' => ['names' => 'Someone else']])
        ->assertSessionHasErrors(['design' => 'Your design is approved and final, so it can no longer be changed.']);

    $this->actingAs($order->user)
        ->post(route('account.orders.files.store', $order), ['files' => [UploadedFile::fake()->image('late.jpg')]])
        ->assertSessionHasErrors(['files' => 'Your design is approved and final, so files can no longer be added.']);

    expect($order->fresh()->personalization)->toBe(['names' => 'Ana & Leo'])
        ->and($order->files()->count())->toBe(1);
});

test('approving needs the customer to confirm the design is final', function () {
    $order = Order::factory()->selfCustomized()->create();

    $this->actingAs($order->user)
        ->post(route('account.orders.design.approve', $order), [
            'personalization' => ['names' => 'Ana & Leo'],
            'photos' => [UploadedFile::fake()->image('us.jpg')],
        ])
        ->assertSessionHasErrors(['confirm_final' => 'Please confirm that you understand an approved design is final.']);

    expect($order->fresh()->preview_approved_at)->toBeNull();
});

test('a design cannot be approved or sent without what the template needs', function () {
    $template = Template::factory()->create(['layout' => TemplateLayout::MiniCd]);
    $order = Order::factory()->selfCustomized()->create(['template_id' => $template->id]);

    $this->actingAs($order->user)
        ->post(route('account.orders.design.approve', $order), ['confirm_final' => true])
        ->assertSessionHasErrors([
            'personalization.names' => 'Please enter the names to feature on your design.',
            'photos' => 'Please add at least one photo for your design.',
            'personalization.song_title' => 'Please enter the song or album title for your design.',
            'personalization.artist' => 'Please enter the artist for your design.',
        ]);

    $this->actingAs($order->user)
        ->post(route('account.orders.design.submit', $order))
        ->assertSessionHasErrors(['personalization.names', 'photos']);

    expect($order->fresh())
        ->preview_approved_at->toBeNull()
        ->design_submitted_at->toBeNull();
});

test('an unpaid order keeps waiting for payment after its design is approved', function () {
    $order = Order::factory()->selfCustomized()->status(OrderStatus::AwaitingPayment)->create();

    $this->actingAs($order->user)
        ->post(route('account.orders.design.approve', $order), [
            'personalization' => ['names' => 'Ana & Leo'],
            'photos' => [UploadedFile::fake()->image('us.jpg')],
            'confirm_final' => true,
        ])
        ->assertSessionHasNoErrors();

    expect($order->fresh())
        ->status->toBe(OrderStatus::AwaitingPayment)
        ->isDesignApproved()->toBeTrue()
        ->designStatus()->toBe(OrderStatus::DesignApproved);
});

test('a customer sends their photos and details to the studio instead', function () {
    $order = Order::factory()->selfCustomized()->status(OrderStatus::PendingDesign)->create();
    $admin = User::factory()->admin()->create();

    $this->actingAs($order->user)
        ->post(route('account.orders.design.submit', $order), [
            'personalization' => ['names' => 'Ana & Leo', 'instructions' => 'Use the beach photo.'],
            'photos' => [UploadedFile::fake()->image('beach.jpg')],
        ])
        ->assertSessionHasNoErrors();

    $order->refresh();

    expect($order->design_submitted_at)->not->toBeNull()
        ->and($order->isDesignApproved())->toBeFalse()
        ->and($order->status)->toBe(OrderStatus::PendingDesign);

    Notification::assertSentTo($admin, AdminOrderAlert::class, fn (AdminOrderAlert $alert) => $alert->activity->type === ActivityType::DesignSubmitted);

    $this->actingAs($order->user)
        ->post(route('account.orders.design.approve', $order), ['confirm_final' => true])
        ->assertSessionHasErrors(['design' => 'Your photos and details are with our designers. You can request changes when they send your design.']);
});

test('an order designed by the studio needs a brief and cannot be approved by the customer', function () {
    $order = Order::factory()->status(OrderStatus::PendingDesign)->create(['personalization' => []]);

    $this->actingAs($order->user)
        ->post(route('account.orders.design.approve', $order), [
            'personalization' => ['design_brief' => 'A beach theme.'],
            'confirm_final' => true,
        ])
        ->assertSessionHasErrors('design');

    $this->actingAs($order->user)
        ->post(route('account.orders.design.submit', $order))
        ->assertSessionHasErrors(['personalization.design_brief' => 'Please describe the design you would like us to create.']);

    $this->actingAs($order->user)
        ->post(route('account.orders.design.submit', $order), [
            'personalization' => ['design_brief' => 'A beach theme with our names.'],
            'photos' => [UploadedFile::fake()->image('beach.jpg')],
        ])
        ->assertSessionHasNoErrors();

    expect($order->fresh()->design_submitted_at)->not->toBeNull()
        ->and($order->files()->sole()->kind)->toBe(OrderFileKind::Reference);
});

test('the design cannot be edited once a proof has been sent', function () {
    $order = Order::factory()->selfCustomized()->status(OrderStatus::AwaitingCustomerApproval)->create();
    DesignProof::factory()->for($order)->create();

    $this->actingAs($order->user)
        ->post(route('account.orders.design.update', $order), ['personalization' => ['names' => 'Ana & Leo']])
        ->assertSessionHasErrors(['design' => 'Our designers have sent you a design. Please approve it or request changes instead.']);
});

test('only the customer who placed the order can design it', function () {
    $order = Order::factory()->selfCustomized()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('account.orders.design.update', $order), ['personalization' => ['names' => 'Intruder']])
        ->assertForbidden();

    expect($order->fresh()->personalization)->toBe([]);
});

test('the order page lets the customer finish an unfinished design', function () {
    $order = Order::factory()->selfCustomized()->create();

    $this->actingAs($order->user)
        ->get(route('account.orders.show', $order))
        ->assertInertia(fn ($page) => $page
            ->where('order.is_design_editable', true)
            ->where('order.product_max_photos', 3));
});
