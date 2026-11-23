<?php

use App\Enums\OrderStatus;
use App\Models\DigitalExperience;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('tapping the tag opens the page at a clean URL and counts one view per session', function () {
    $experience = DigitalExperience::factory()->create(['view_count' => 0]);

    tapTag($experience)->assertRedirect(route('experiences.show', $experience));

    $this->get(route('experiences.show', $experience))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/experience')
            ->where('experience.title', $experience->title)
            ->where('experience.public_url', null)
            ->where('experience.qr_url', null)
            ->where('isPreview', false)
            ->where('isRecipient', true));

    tapTag($experience);

    expect($experience->fresh()->view_count)->toBe(1)
        ->and($experience->views()->count())->toBe(1);
});

test('the page cannot be opened without the key from its tag or QR code', function () {
    Storage::fake('local');
    Storage::disk('local')->put('experiences/1/a.jpg', 'image');
    $experience = DigitalExperience::factory()->create(['photos' => ['experiences/1/a.jpg'], 'view_count' => 0]);

    $this->get(route('experiences.show', $experience))->assertNotFound();
    $this->get(route('experiences.show', ['experience' => $experience, 'k' => 'not-the-key']))->assertNotFound();
    $this->get(route('experiences.photo', [$experience, 0]))->assertNotFound();

    expect($experience->fresh()->view_count)->toBe(0);
});

test('a page scheduled to open later shows only a countdown to visitors', function () {
    Storage::fake('local');
    Storage::disk('local')->put('experiences/1/a.jpg', 'image');
    $experience = DigitalExperience::factory()->create([
        'photos' => ['experiences/1/a.jpg'],
        'unlocks_at' => now()->addDays(3),
    ]);

    tapTag($experience);

    $this->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/experience-locked')
            ->where('unlocksAt', $experience->unlocks_at->toIso8601String())
            ->missing('experience'));
    $this->get(route('experiences.photo', [$experience, 0]))->assertNotFound();

    $this->travel(4)->days();
    tapTag($experience);

    $this->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page->component('storefront/experience'));
});

test('the owner sees a scheduled page before it opens', function () {
    $experience = DigitalExperience::factory()->create(['unlocks_at' => now()->addDays(3)]);

    $this->actingAs($experience->user)
        ->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/experience')
            ->where('experience.public_url', $experience->publicUrl()));
});

test('an unpublished experience is only visible to its owner', function () {
    $experience = DigitalExperience::factory()->unpublished()->create();

    $this->get(route('experiences.show', $experience))->assertNotFound();
    $this->actingAs(User::factory()->create())->get(route('experiences.show', $experience))->assertNotFound();

    $this->actingAs($experience->user)
        ->get(route('experiences.show', $experience))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('isPreview', true));
});

test('the owner downloads the QR code as an SVG', function () {
    $experience = DigitalExperience::factory()->create();

    $response = $this->actingAs($experience->user)->get(route('experiences.qr', $experience));

    $response->assertOk()->assertHeader('Content-Type', 'image/svg+xml');
    expect($response->getContent())->toStartWith('<svg');
});

test('visitors cannot fetch the QR code, which carries the access key', function () {
    $experience = DigitalExperience::factory()->create();

    tapTag($experience);

    $this->get(route('experiences.qr', $experience))->assertNotFound();
    $this->actingAs(User::factory()->create())->get(route('experiences.qr', $experience))->assertNotFound();
});

test('the owner updates their experience and photos', function () {
    Storage::fake('local');
    $experience = DigitalExperience::factory()->create(['photos' => []]);

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => 'love_story',
            'title' => 'Five years of us',
            'message' => 'I love you',
            'theme' => 'midnight',
            'video_url' => 'https://youtu.be/abc123',
            'is_published' => true,
            'new_photos' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.jpg')],
        ])
        ->assertSessionHasNoErrors();

    $experience->refresh();

    expect($experience)
        ->title->toBe('Five years of us')
        ->theme->toBe('midnight')
        ->photos->toHaveCount(2);

    Storage::disk('local')->assertExists($experience->photos[0]);
});

test('the editor keeps the page design once the keepsake has shipped', function () {
    $experience = DigitalExperience::factory()
        ->for(Order::factory()->state(['status' => OrderStatus::Shipped]))
        ->create(['template' => 'classic', 'title' => 'Us']);

    $this->actingAs($experience->user)
        ->get(route('account.experiences.edit', $experience))
        ->assertInertia(fn (Assert $page) => $page->where('isTemplateLocked', true));

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), ['template' => 'love_story', 'title' => 'Us', 'theme' => 'blush'])
        ->assertSessionHasErrors('template');

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), ['template' => 'classic', 'title' => 'Still us', 'theme' => 'blush'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh())
        ->template->value->toBe('classic')
        ->title->toBe('Still us');
});

test('experience links must be secure URLs', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'title' => 'Us',
            'theme' => 'blush',
            'video_url' => 'javascript:alert(1)',
        ])
        ->assertSessionHasErrors('video_url');
});

test('another customer cannot edit an experience', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs(User::factory()->create())
        ->put(route('account.experiences.update', $experience), ['title' => 'Hacked', 'theme' => 'blush'])
        ->assertForbidden();
});

test('an admin designs a customer\'s memory page and the change is audited', function () {
    $admin = User::factory()->admin()->create();
    $experience = DigitalExperience::factory()->create(['title' => 'Us']);

    $this->actingAs($admin)
        ->get(route('account.experiences.edit', $experience))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('account/experiences/edit')
            ->where('adminEditing.customer_name', $experience->order->customer_name));

    $this->actingAs($admin)
        ->put(route('account.experiences.update', $experience), ['template' => 'love_story', 'title' => 'Five years of us', 'theme' => 'midnight'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh())
        ->title->toBe('Five years of us')
        ->user_id->toBe($experience->user_id);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $admin->id,
        'action' => 'account.experiences.update',
    ]);
});

test('the owner editing their memory page is not shown as an admin edit or audited', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->get(route('account.experiences.edit', $experience))
        ->assertInertia(fn (Assert $page) => $page->where('adminEditing', null));

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), ['template' => 'classic', 'title' => 'Us', 'theme' => 'blush'])
        ->assertSessionHasNoErrors();

    $this->assertDatabaseCount('audit_logs', 0);
});

test('an admin without two-factor authentication cannot design a customer\'s memory page', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($admin)
        ->get(route('account.experiences.edit', $experience))
        ->assertForbidden();
});

test('an admin links an NFC tag to an experience', function () {
    $admin = User::factory()->admin()->create();
    $experience = DigitalExperience::factory()->create();
    DigitalExperience::factory()->create(['nfc_tag_uid' => '04:AA:BB:CC']);

    $this->actingAs($admin)
        ->put(route('admin.experiences.update', $experience), ['nfc_tag_uid' => '04:aa:bb:cc'])
        ->assertSessionHasErrors(['nfc_tag_uid' => 'This NFC tag is already linked to another order.']);

    $this->actingAs($admin)
        ->put(route('admin.experiences.update', $experience), ['nfc_tag_uid' => '04:a2:3b:1c'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->nfc_tag_uid)->toBe('04:A2:3B:1C');
});

test('experience photos on object storage redirect to a signed url', function () {
    config(['taptale.uploads_disk' => 'r2_private']);
    Storage::fake('r2_private');
    Storage::disk('r2_private')->put('experiences/1/a.jpg', 'image');
    Storage::disk('r2_private')->buildTemporaryUrlsUsing(
        fn (string $path): string => "https://bucket.test/{$path}?signature=abc"
    );
    $experience = DigitalExperience::factory()->create(['photos' => ['experiences/1/a.jpg']]);
    tapTag($experience);

    $this->get(route('experiences.photo', [$experience, 0]))
        ->assertRedirect('https://bucket.test/experiences/1/a.jpg?signature=abc');
});

test('experience photos on a local disk are streamed through the app', function () {
    Storage::fake('local');
    Storage::disk('local')->put('experiences/1/a.jpg', 'image');
    $experience = DigitalExperience::factory()->create(['photos' => ['experiences/1/a.jpg']]);
    tapTag($experience);

    $this->get(route('experiences.photo', [$experience, 0]))
        ->assertOk()
        ->assertStreamedContent('image');
});
