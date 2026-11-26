<?php

use App\Enums\OrderStatus;
use App\Http\Controllers\Storefront\ExperienceController;
use App\Models\DigitalExperience;
use App\Models\ExperienceShareLink;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('tapping the tag opens the page at a clean URL and counts one view per session', function () {
    $experience = DigitalExperience::factory()->create(['view_count' => 0]);

    tapTag($experience)->assertRedirect($experience->fresh()->publicUrl());

    $this->get(route('experiences.show', $experience))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/experience')
            ->where('experience.title', $experience->title)
            ->where('experience.public_url', null)
            ->where('experience.qr_url', null)
            ->where('experience.tag_url', null)
            ->where('isPreview', false)
            ->where('isRecipient', true)
            ->where('canShare', true)
            ->where('shareLinkDays', DigitalExperience::SHARE_LINK_DAYS));

    tapTag($experience);

    expect($experience->fresh()->view_count)->toBe(1)
        ->and($experience->views()->count())->toBe(1);
});

test('the page cannot be opened without its tag, QR code or a share link', function () {
    Storage::fake('local');
    Storage::disk('local')->put('experiences/1/a.jpg', 'image');
    $experience = DigitalExperience::factory()->create(['photos' => ['experiences/1/a.jpg'], 'view_count' => 0]);

    $this->get(route('experiences.show', $experience))->assertNotFound();
    $this->get(route('experiences.show', ['experience' => $experience, 'k' => 'not-the-key']))->assertNotFound();
    $this->get(route('experiences.show', ['experience' => $experience, 's' => 'not-the-token']))->assertNotFound();
    $this->get(route('experiences.show', ['experience' => $experience, 's' => ['x']]))->assertNotFound();
    $this->get(route('experiences.photo', [$experience, 0]))->assertNotFound();

    expect($experience->fresh()->view_count)->toBe(0);
});

test('whoever tapped the tag makes a share link that lasts the days they choose', function () {
    $experience = DigitalExperience::factory()->create();
    tapTag($experience);

    $response = $this->postJson(route('experiences.share-links.store', $experience), ['days' => 7])
        ->assertCreated();

    $shareLink = $experience->shareLinks()->sole();

    expect($response->json('url'))->toBe($shareLink->url())
        ->and($shareLink->expires_at->between(now()->addDays(7)->subMinute(), now()->addDays(7)->addMinute()))->toBeTrue();
});

test('share links have no lifetime option', function (mixed $days) {
    $experience = DigitalExperience::factory()->create();
    tapTag($experience);

    $this->postJson(route('experiences.share-links.store', $experience), ['days' => $days])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('days');

    expect($experience->shareLinks()->count())->toBe(0);
})->with([
    'a year' => [365],
    'zero' => [0],
    'forever' => ['lifetime'],
    'missing' => [null],
]);

test('a share link opens the page for anyone until it expires', function () {
    Storage::fake('local');
    Storage::disk('local')->put('experiences/1/a.jpg', 'image');
    $experience = DigitalExperience::factory()->create(['photos' => ['experiences/1/a.jpg'], 'view_count' => 0]);
    $shareLink = ExperienceShareLink::factory()->for($experience, 'experience')->create(['expires_at' => now()->addDays(3)]);

    $this->get($shareLink->url())
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/experience')
            ->where('isRecipient', true)
            ->where('canShare', false));
    $this->get(route('experiences.photo', [$experience, 0]))->assertOk();

    expect($experience->fresh()->view_count)->toBe(1);

    $this->travel(3)->days();
    $this->travel(1)->minutes();

    $this->get(route('experiences.show', $experience))->assertNotFound();
    $this->get(route('experiences.photo', [$experience, 0]))->assertNotFound();
    $this->get($shareLink->url())->assertNotFound();
});

test('a share link leaves nothing on the device that outlives it', function () {
    $experience = DigitalExperience::factory()->create();
    $shareLink = ExperienceShareLink::factory()->for($experience, 'experience')->create();

    $this->get($shareLink->url())->assertOk()->assertCookieMissing(ExperienceController::ACCESS_COOKIE);
});

test('a visitor who came through a share link cannot make links of their own', function () {
    $experience = DigitalExperience::factory()->create();
    $shareLink = ExperienceShareLink::factory()->for($experience, 'experience')->create();
    $this->get($shareLink->url())->assertOk();

    $this->postJson(route('experiences.share-links.store', $experience), ['days' => 30])->assertNotFound();

    expect($experience->shareLinks()->count())->toBe(1);
});

test('the owner cannot make share links without the tag in hand', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->postJson(route('experiences.share-links.store', $experience), ['days' => 30])
        ->assertNotFound();
});

test('expired, unknown and other pages\' share links open nothing', function () {
    $experience = DigitalExperience::factory()->create();
    $expired = ExperienceShareLink::factory()->expired()->for($experience, 'experience')->create();
    $otherPageLink = ExperienceShareLink::factory()->create();

    $this->get($expired->url())->assertNotFound();
    $this->get(route('experiences.show', ['experience' => $experience, 's' => $otherPageLink->token]))->assertNotFound();
});

test('a share link does not open an unpublished page', function () {
    $experience = DigitalExperience::factory()->unpublished()->create();
    $shareLink = ExperienceShareLink::factory()->for($experience, 'experience')->create();

    $this->get($shareLink->url())->assertNotFound();
});

test('the QR code stops opening the page once the genuine tag is live', function () {
    $admin = User::factory()->admin()->create();
    $experience = DigitalExperience::factory()->create();

    $this->get($experience->qrCodeUrl())->assertRedirect($experience->fresh()->publicUrl());
    $this->actingAs($experience->user)->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page->whereNot('experience.qr_url', null));

    auth()->logout();
    $this->flushSession();
    tapTag($experience, '04A1B2C3D4E5F6x000001');
    $this->flushSession();

    $this->get($experience->qrCodeUrl())->assertNotFound();
    $this->actingAs($experience->user)->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page
            ->where('experience.qr_url', null)
            ->where('experience.is_tag_check_active', true));
    $this->actingAs($admin)->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page->whereNot('experience.qr_url', null));
});

test('the first mirrored tap registers the genuine tag, and copies of it are refused', function () {
    $experience = DigitalExperience::factory()->create();

    tapTag($experience, '04A1B2C3D4E5F6x000005')->assertRedirect($experience->fresh()->publicUrl());

    expect($experience->fresh())
        ->nfc_tag_uid->toBe('04:A1:B2:C3:D4:E5:F6')
        ->nfc_tap_counter->toBe(5);

    $this->flushSession();

    tapTag($experience, '04A1B2C3D4E5F6x000005')->assertNotFound();
    tapTag($experience, '04A1B2C3D4E5F6x000004')->assertNotFound();
    tapTag($experience, '04FFFFFFFFFFFFx000009')->assertNotFound();
    tapTag($experience)->assertNotFound();
    tapTag($experience, 'not-a-mirror')->assertNotFound();

    tapTag($experience, '04a1b2c3d4e5f6x000006')->assertRedirect($experience->fresh()->publicUrl());

    expect($experience->fresh()->nfc_tap_counter)->toBe(6);
});

test('a tag only opens the page when its chip matches the one the admin saved', function () {
    $experience = DigitalExperience::factory()->create(['nfc_tag_uid' => '04:A1:B2:C3:D4:E5:F6']);

    tapTag($experience, '04FFFFFFFFFFFFx000001')->assertNotFound();
    tapTag($experience, '04A1B2C3D4E5F6x000001')->assertRedirect($experience->fresh()->publicUrl());
});

test('a tag written without turning on the mirror is refused', function () {
    $experience = DigitalExperience::factory()->create();

    tapTag($experience, DigitalExperience::TAG_MIRROR_PLACEHOLDER)->assertNotFound();

    expect($experience->fresh())
        ->nfc_tag_uid->toBeNull()
        ->nfc_tap_counter->toBeNull();
});

test('a chip already linked to another page cannot register on a second one', function () {
    DigitalExperience::factory()->create(['nfc_tag_uid' => '04:A1:B2:C3:D4:E5:F6']);
    $experience = DigitalExperience::factory()->create();

    tapTag($experience, '04A1B2C3D4E5F6x000001')->assertNotFound();
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

test('only the owner and admins fetch the QR code', function () {
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

test('an admin swapping the tag starts its tap count over', function () {
    $admin = User::factory()->admin()->create();
    $experience = DigitalExperience::factory()->create();
    tapTag($experience, '04A1B2C3D4E5F6x000040');

    $this->actingAs($admin)
        ->put(route('admin.experiences.update', $experience), ['nfc_tag_uid' => '04:11:22:33:44:55:66'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->nfc_tap_counter)->toBeNull();

    tapTag($experience, '04112233445566x000001')->assertRedirect($experience->fresh()->publicUrl());
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

test('an admin publishes and unpublishes a website from the order', function () {
    $admin = User::factory()->admin()->create();
    $experience = DigitalExperience::factory()->create(['is_published' => false]);

    $this->actingAs($admin)
        ->put(route('admin.experiences.publish', $experience), ['is_published' => true])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->is_published)->toBeTrue();

    $this->actingAs($admin)
        ->put(route('admin.experiences.publish', $experience), ['is_published' => false]);

    expect($experience->fresh()->is_published)->toBeFalse();

    $this->actingAs($experience->user)
        ->put(route('admin.experiences.publish', $experience), ['is_published' => true])
        ->assertForbidden();
});

test('the owner swaps the song file right from the page', function () {
    Storage::fake((string) config('taptale.uploads_disk'));
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->post(route('account.experiences.audio.store', $experience), ['audio' => UploadedFile::fake()->create('song.mp3', 500, 'audio/mpeg')])
        ->assertSessionHasNoErrors();

    $firstPath = $experience->fresh()->audio_path;
    Storage::disk((string) config('taptale.uploads_disk'))->assertExists($firstPath);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.audio.store', $experience), ['audio' => UploadedFile::fake()->create('other.mp3', 500, 'audio/mpeg')]);

    Storage::disk((string) config('taptale.uploads_disk'))->assertMissing($firstPath);

    $this->actingAs(User::factory()->create())
        ->post(route('account.experiences.audio.store', $experience), ['audio' => UploadedFile::fake()->create('x.mp3', 500, 'audio/mpeg')])
        ->assertForbidden();

    $this->actingAs($experience->user)
        ->delete(route('account.experiences.audio.destroy', $experience));

    expect($experience->fresh()->audio_path)->toBeNull();
});

test('the owner adds a YouTube link for the full song right from the page', function () {
    $experience = DigitalExperience::factory()->create(['music_url' => null]);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'music_url', 'value' => 'https://www.youtube.com/watch?v=abc123'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->music_url)->toBe('https://www.youtube.com/watch?v=abc123');

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'music_url', 'value' => 'not a link'])
        ->assertSessionHasErrors();
});

test('a page gets a readable address from its title and still opens by its code', function () {
    $first = DigitalExperience::factory()->create(['title' => 'Zen & Megi', 'is_published' => true]);
    $second = DigitalExperience::factory()->create(['title' => 'Zen & Megi']);

    expect($first->slug)->toBe('zen-and-megi')
        ->and($second->slug)->toBe('zen-and-megi-2')
        ->and($first->publicUrl())->toEndWith('/t/zen-and-megi');

    tapTag($first)->assertRedirect(route('experiences.show', 'zen-and-megi'));

    $this->get(route('experiences.show', 'zen-and-megi'))->assertOk();
    $this->get(route('experiences.show', $first->code))->assertOk();

    $first->update(['title' => 'Zen & Megi Forever']);

    expect($first->fresh()->slug)->toBe('zen-and-megi-forever');
});
