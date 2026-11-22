<?php

use App\Models\DigitalExperience;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('a published experience is public and counts views', function () {
    $experience = DigitalExperience::factory()->create(['view_count' => 0]);

    $this->get("/t/{$experience->code}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/experience')
            ->where('experience.title', $experience->title)
            ->where('isPreview', false));

    expect($experience->fresh()->view_count)->toBe(1);
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

test('the QR code encodes the experience URL as an SVG', function () {
    $experience = DigitalExperience::factory()->create();

    $response = $this->get(route('experiences.qr', $experience));

    $response->assertOk()->assertHeader('Content-Type', 'image/svg+xml');
    expect($response->getContent())->toStartWith('<svg');
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

    $this->get(route('experiences.photo', [$experience, 0]))
        ->assertRedirect('https://bucket.test/experiences/1/a.jpg?signature=abc');
});

test('experience photos on a local disk are streamed through the app', function () {
    Storage::fake('local');
    Storage::disk('local')->put('experiences/1/a.jpg', 'image');
    $experience = DigitalExperience::factory()->create(['photos' => ['experiences/1/a.jpg']]);

    $this->get(route('experiences.photo', [$experience, 0]))
        ->assertOk()
        ->assertStreamedContent('image');
});
