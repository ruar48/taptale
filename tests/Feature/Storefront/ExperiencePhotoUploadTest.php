<?php

use App\Enums\ExperienceTemplate;
use App\Enums\FlowerRain;
use App\Enums\FlowerStyle;
use App\Enums\OrderStatus;
use App\Enums\PhotoRainLayer;
use App\Models\DigitalExperience;
use App\Models\Order;
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

    $this->actingAs(User::factory()->create());
    tapTag($experience);

    $this->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page->where('canEdit', false));

    auth()->logout();
    tapTag($experience);

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

test('the owner switches the page design from the page', function () {
    $experience = DigitalExperience::factory()->create(['template' => 'classic', 'theme' => 'blush']);

    $this->actingAs($experience->user)
        ->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page->has('designOptions.templates', count(ExperienceTemplate::cases())));

    $this->actingAs($experience->user)
        ->put(route('account.experiences.design', $experience), ['template' => 'valentines', 'theme' => 'crimson'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh())
        ->template->toBe(ExperienceTemplate::Valentines)
        ->theme->toBe('crimson');
});

test('visitors get no design options and cannot change the design', function () {
    $experience = DigitalExperience::factory()->create(['template' => 'classic']);
    tapTag($experience);

    $this->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page->where('designOptions', null));

    $this->actingAs(User::factory()->create())
        ->put(route('account.experiences.design', $experience), ['template' => 'valentines', 'theme' => 'crimson'])
        ->assertForbidden();

    expect($experience->fresh()->template->value)->toBe('classic');
});

test('the page design can no longer be switched once the keepsake is released', function (OrderStatus $status) {
    $experience = DigitalExperience::factory()
        ->for(Order::factory()->state(['status' => $status]))
        ->create(['template' => 'classic', 'theme' => 'blush']);

    $this->actingAs($experience->user)
        ->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page->where('designOptions.isTemplateLocked', true));

    $this->actingAs($experience->user)
        ->put(route('account.experiences.design', $experience), ['template' => 'valentines', 'theme' => 'crimson'])
        ->assertSessionHasErrors('template');

    $this->actingAs($experience->user)
        ->put(route('account.experiences.design', $experience), ['template' => 'classic', 'theme' => 'crimson'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh())
        ->template->toBe(ExperienceTemplate::Classic)
        ->theme->toBe('crimson');
})->with([OrderStatus::Shipped, OrderStatus::Completed]);

test('the page design can still be switched while the keepsake is being made', function () {
    $experience = DigitalExperience::factory()
        ->for(Order::factory()->state(['status' => OrderStatus::InProduction]))
        ->create(['template' => 'classic']);

    $this->actingAs($experience->user)
        ->put(route('account.experiences.design', $experience), ['template' => 'valentines', 'theme' => 'crimson'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->template)->toBe(ExperienceTemplate::Valentines);
});

test('only known designs can be applied', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->put(route('account.experiences.design', $experience), ['template' => 'mystery', 'theme' => 'neon'])
        ->assertSessionHasErrors(['template', 'theme']);
});

test('the owner styles the song section with hearts', function () {
    $experience = DigitalExperience::factory()->create();

    expect($experience->fresh())
        ->song_ornament->toBe('none')
        ->song_background->toBe('theme');

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'song_ornament', 'value' => 'hearts'])
        ->assertSessionHasNoErrors();

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'song_background', 'value' => 'hearts'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh())
        ->song_ornament->toBe('hearts')
        ->song_background->toBe('hearts');

    $this->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page
            ->where('experience.song_ornament', 'hearts')
            ->where('experience.song_background', 'hearts'));
});

test('only known song section styles are accepted', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'song_background', 'value' => 'neon'])
        ->assertSessionHasErrors('value');

    expect($experience->fresh()->song_background)->toBe('theme');
});

test('the owner edits text directly on the page', function () {
    $experience = DigitalExperience::factory()->create(['title' => 'Old title', 'message' => null]);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'title', 'value' => 'Happy 6th Monthsary'])
        ->assertSessionHasNoErrors();

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'message', 'value' => "Hi love,\n\nThank you."])
        ->assertSessionHasNoErrors();

    expect($experience->fresh())
        ->title->toBe('Happy 6th Monthsary')
        ->message->toBe("Hi love,\n\nThank you.");
});

test('the owner chooses whether raining photos fall in front of or behind the flowers', function () {
    $experience = DigitalExperience::factory()->create(['template' => 'digital_bouquet', 'flower_rain' => 'both']);

    expect($experience->fresh()->photo_rain_layer)->toBe(PhotoRainLayer::Front);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'photo_rain_layer', 'value' => 'back'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->photo_rain_layer)->toBe(PhotoRainLayer::Back);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'photo_rain_layer', 'value' => 'sideways'])
        ->assertSessionHasErrors('value');

    expect($experience->fresh()->photo_rain_layer)->toBe(PhotoRainLayer::Back);
});

test('the owner changes the flowers and what rains over them on the page', function () {
    $experience = DigitalExperience::factory()->create(['template' => 'digital_bouquet']);

    expect($experience->fresh())
        ->flower_style->toBe(FlowerStyle::Bouquet)
        ->flower_rain->toBe(FlowerRain::None);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'flower_style', 'value' => 'white'])
        ->assertSessionHasNoErrors();
    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'flower_rain', 'value' => 'photos'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh())
        ->flower_style->toBe(FlowerStyle::White)
        ->flower_rain->toBe(FlowerRain::Photos);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'flower_style', 'value' => 'cactus'])
        ->assertSessionHasErrors('value');
    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'flower_rain', 'value' => 'snow'])
        ->assertSessionHasErrors('value');

    expect($experience->fresh())
        ->flower_style->toBe(FlowerStyle::White)
        ->flower_rain->toBe(FlowerRain::Photos);
});

test('flowers on a page design without them can only be changed once bought', function () {
    $experience = DigitalExperience::factory()->create(['template' => 'anniversary']);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'flower_style', 'value' => 'red'])
        ->assertSessionHasErrors('field');

    expect($experience->fresh()->flower_style)->toBe(FlowerStyle::Bouquet);

    $experience->update(['flower_addon' => true]);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'flower_style', 'value' => 'red'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->flower_style)->toBe(FlowerStyle::Red);
});

test('the edit form saves flower choices only for pages that show flowers', function (string $template, bool $flowerAddon, string $expectedStyle) {
    $experience = DigitalExperience::factory()->create(['template' => $template, 'flower_addon' => $flowerAddon]);

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => $template,
            'theme' => 'midnight',
            'title' => 'For you',
            'flower_style' => 'lavender',
            'flower_rain' => 'petals',
            'photo_rain_layer' => 'back',
        ])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->flower_style->value)->toBe($expectedStyle);
})->with([
    'bouquet design' => ['digital_bouquet', false, 'lavender'],
    'design with the flowers add-on' => ['anniversary', true, 'lavender'],
    'design without flowers' => ['anniversary', false, 'bouquet'],
]);

test('the edit form rejects unknown flowers', function () {
    $experience = DigitalExperience::factory()->create(['template' => 'digital_bouquet']);

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => 'digital_bouquet',
            'theme' => 'moonlit',
            'title' => 'For you',
            'flower_style' => 'cactus',
            'flower_rain' => 'snow',
        ])
        ->assertSessionHasErrors(['flower_style', 'flower_rain']);
});

test('the owner edits a moment caption on the page', function () {
    $experience = DigitalExperience::factory()->create([
        'moments' => [['date' => 'June 2', 'title' => 'Baguio', 'caption' => null, 'photo' => null]],
    ]);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'moments.0.caption', 'value' => 'Our first trip'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->moments[0]['caption'])->toBe('Our first trip');

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'moments.5.caption', 'value' => 'Nope'])
        ->assertSessionHasErrors(['field' => 'That moment no longer exists.']);
});

test('inline edits are validated and limited to page text', function () {
    $experience = DigitalExperience::factory()->create(['title' => 'Keep me']);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'title', 'value' => ''])
        ->assertSessionHasErrors('value');

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'nfc_tag_uid', 'value' => '04:AA'])
        ->assertSessionHasErrors(['field' => 'This text cannot be edited here.']);

    $this->actingAs(User::factory()->create())
        ->patch(route('account.experiences.content', $experience), ['field' => 'title', 'value' => 'Hacked'])
        ->assertForbidden();

    expect($experience->fresh()->title)->toBe('Keep me')
        ->and($experience->fresh()->nfc_tag_uid)->toBeNull();
});

test('the owner replaces a photo and keeps its place', function () {
    Storage::disk('local')->put('experiences/old.jpg', 'old');
    $experience = DigitalExperience::factory()->create(['photos' => ['experiences/first.jpg', 'experiences/old.jpg']]);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.photos.replace', ['experience' => $experience, 'index' => 1]), [
            'photo' => UploadedFile::fake()->image('new.jpg'),
        ])
        ->assertSessionHasNoErrors();

    $photos = $experience->fresh()->photos;

    expect($photos)->toHaveCount(2)
        ->and($photos[0])->toBe('experiences/first.jpg')
        ->and($photos[1])->not->toBe('experiences/old.jpg');

    Storage::disk('local')->assertMissing('experiences/old.jpg');
    Storage::disk('local')->assertExists($photos[1]);
});

test('replacing a missing photo or someone else\'s photo is refused', function () {
    $experience = DigitalExperience::factory()->create(['photos' => ['experiences/a.jpg']]);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.photos.replace', ['experience' => $experience, 'index' => 3]), [
            'photo' => UploadedFile::fake()->image('new.jpg'),
        ])
        ->assertNotFound();

    $this->actingAs(User::factory()->create())
        ->post(route('account.experiences.photos.replace', ['experience' => $experience, 'index' => 0]), [
            'photo' => UploadedFile::fake()->image('new.jpg'),
        ])
        ->assertForbidden();

    expect($experience->fresh()->photos)->toBe(['experiences/a.jpg']);
});
