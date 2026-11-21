<?php

use App\Models\DigitalExperience;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
});

test('the owner sees their page as editable and visitors do not', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page->where('canEdit', true));

    $this->actingAs(User::factory()->create())
        ->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page->where('canEdit', false));

    auth()->logout();

    $this->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page->where('canEdit', false));
});

test('the owner adds a photo while viewing their page', function () {
    $experience = DigitalExperience::factory()->create(['photos' => ['experiences/existing.jpg']]);

    $this->actingAs($experience->user)
        ->from(route('experiences.show', $experience))
        ->post(route('account.experiences.photos.store', $experience), [
            'photos' => [UploadedFile::fake()->image('us.jpg')],
        ])
        ->assertRedirect(route('experiences.show', $experience))
        ->assertSessionHasNoErrors();

    $photos = $experience->fresh()->photos;

    expect($photos)->toHaveCount(2)
        ->and($photos[0])->toBe('experiences/existing.jpg');

    Storage::disk('local')->assertExists($photos[1]);
});

test('a photo added in a moment frame is attached to that moment', function () {
    $experience = DigitalExperience::factory()->create([
        'photos' => ['experiences/a.jpg'],
        'moments' => [
            ['date' => 'June 2', 'title' => 'Baguio', 'caption' => null, 'photo' => null],
            ['date' => 'May 1', 'title' => 'First date', 'caption' => null, 'photo' => 0],
        ],
    ]);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.photos.store', $experience), [
            'photos' => [UploadedFile::fake()->image('baguio.jpg')],
            'moment' => 0,
        ])
        ->assertSessionHasNoErrors();

    $moments = $experience->fresh()->moments;

    expect($moments[0]['photo'])->toBe(1)
        ->and($moments[1]['photo'])->toBe(0);
});

test('another customer cannot add photos to someone else\'s page', function () {
    $experience = DigitalExperience::factory()->create(['photos' => []]);

    $this->actingAs(User::factory()->create())
        ->post(route('account.experiences.photos.store', $experience), [
            'photos' => [UploadedFile::fake()->image('intruder.jpg')],
        ])
        ->assertForbidden();

    expect($experience->fresh()->photos)->toBe([]);
});

test('guests must sign in to add photos', function () {
    $experience = DigitalExperience::factory()->create();

    $this->post(route('account.experiences.photos.store', $experience), [
        'photos' => [UploadedFile::fake()->image('us.jpg')],
    ])->assertRedirect(route('login'));
});

test('only images can be added', function () {
    $experience = DigitalExperience::factory()->create(['photos' => []]);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.photos.store', $experience), [
            'photos' => [UploadedFile::fake()->create('notes.pdf', 50, 'application/pdf')],
        ])
        ->assertSessionHasErrors('photos.0');

    expect($experience->fresh()->photos)->toBe([]);
});

test('the photo limit is enforced', function () {
    $experience = DigitalExperience::factory()->create([
        'photos' => array_fill(0, DigitalExperience::MAX_PHOTOS, 'experiences/full.jpg'),
    ]);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.photos.store', $experience), [
            'photos' => [UploadedFile::fake()->image('one-more.jpg')],
        ])
        ->assertSessionHasErrors(['photos' => 'Your page can have at most '.DigitalExperience::MAX_PHOTOS.' photos.']);
});
