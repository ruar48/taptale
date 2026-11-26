<?php

use App\Enums\ExperienceTemplate;
use App\Enums\FlowerRain;
use App\Enums\FlowerStyle;
use App\Enums\OrderStatus;
use App\Enums\PhotoRainLayer;
use App\Enums\PhotoRainSource;
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

test('a photo added in a design frame stays in that frame only', function () {
    $experience = DigitalExperience::factory()->create([
        'template' => 'monthsary',
        'photos' => ['experiences/cover.jpg'],
        'photo_frames' => ['hero_photo' => [0]],
    ]);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.photos.store', $experience), [
            'photos' => [UploadedFile::fake()->image('trip.jpg')],
            'frame' => 'film_strip',
            'frame_index' => 2,
        ])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->photo_frames)->toBe([
        'hero_photo' => [0],
        'film_strip' => [null, null, 1],
    ]);
});

test('photos only go in frames the page designs have', function (array $frame, string $field) {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->post(route('account.experiences.photos.store', $experience), [
            'photos' => [UploadedFile::fake()->image('us.jpg')],
            ...$frame,
        ])
        ->assertSessionHasErrors($field);

    expect($experience->fresh())
        ->photos->toBe([])
        ->photo_frames->toBeNull();
})->with([
    'a section without frames' => [['frame' => 'gallery', 'frame_index' => 0], 'frame'],
    'past the last frame of the section' => [['frame' => 'film_strip', 'frame_index' => 6], 'frame_index'],
    'a frame without its position' => [['frame' => 'hero_photo'], 'frame_index'],
]);

test('frame photos follow their photos when other photos are removed', function () {
    $experience = DigitalExperience::factory()->create([
        'photos' => ['experiences/a.jpg', 'experiences/b.jpg', 'experiences/c.jpg'],
        'photo_frames' => ['hero_photo' => [2], 'film_strip' => [0, null, 1]],
    ]);

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => 'monthsary',
            'theme' => 'crimson',
            'title' => 'Happy monthsary',
            'remove_photos' => [0],
        ])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->photo_frames)->toBe([
        'hero_photo' => [1],
        'film_strip' => [null, null, 0],
    ]);
});

test('the page shows which photo is in each design frame', function () {
    $experience = DigitalExperience::factory()->create([
        'is_published' => true,
        'photos' => ['experiences/a.jpg'],
        'photo_frames' => ['film_strip' => [null, 0], 'hero_photo' => [3]],
    ]);

    tapTag($experience);

    $this->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page
            ->where('experience.photo_frames.film_strip', [null, 0])
            ->where('experience.photo_frames.hero_photo', [null]));
});

test('the owner picks photos to rain down, apart from the page photos', function () {
    $experience = DigitalExperience::factory()->create(['photos' => ['experiences/page.jpg']]);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.rain-photos.store', $experience), [
            'photos' => [UploadedFile::fake()->image('one.jpg'), UploadedFile::fake()->image('two.jpg')],
        ])
        ->assertSessionHasNoErrors();

    $experience->refresh();

    expect($experience->photos)->toBe(['experiences/page.jpg'])
        ->and($experience->rain_photos)->toHaveCount(2);
    Storage::disk('local')->assertExists($experience->rain_photos);

    [$removed, $kept] = $experience->rain_photos;

    $this->actingAs($experience->user)
        ->delete(route('account.experiences.rain-photos.destroy', [$experience, 0]))
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->rain_photos)->toBe([$kept]);
    Storage::disk('local')->assertMissing($removed);
});

test('at most twelve photos can rain down', function () {
    $experience = DigitalExperience::factory()->create(['rain_photos' => array_fill(0, 11, 'experiences/rain.jpg')]);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.rain-photos.store', $experience), [
            'photos' => [UploadedFile::fake()->image('one.jpg'), UploadedFile::fake()->image('two.jpg')],
        ])
        ->assertSessionHasErrors(['photos' => 'Up to 12 photos can rain down on your page.']);

    expect($experience->fresh()->rain_photos)->toHaveCount(11);
});

test('another customer cannot change the photos raining on someone else\'s page', function () {
    $experience = DigitalExperience::factory()->create(['rain_photos' => ['experiences/rain.jpg']]);
    $intruder = User::factory()->create();

    $this->actingAs($intruder)
        ->post(route('account.experiences.rain-photos.store', $experience), [
            'photos' => [UploadedFile::fake()->image('intruder.jpg')],
        ])
        ->assertForbidden();

    $this->actingAs($intruder)
        ->delete(route('account.experiences.rain-photos.destroy', [$experience, 0]))
        ->assertForbidden();

    expect($experience->fresh()->rain_photos)->toBe(['experiences/rain.jpg']);
});

test('raining photos open only for those who can see the page', function () {
    Storage::disk('local')->put('experiences/rain.jpg', 'rain');
    $experience = DigitalExperience::factory()->create(['rain_photos' => ['experiences/rain.jpg']]);

    $this->get(route('experiences.rain-photo', [$experience, 0]))->assertNotFound();

    tapTag($experience);

    $this->get(route('experiences.rain-photo', [$experience, 0]))->assertOk();
    $this->get(route('experiences.rain-photo', [$experience, 1]))->assertNotFound();
});

test('the owner uploads a short video, replaces it and removes it', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->post(route('account.experiences.video.store', $experience), [
            'video' => UploadedFile::fake()->create('first.mp4', 500, 'video/mp4'),
        ])
        ->assertSessionHasNoErrors();

    $first = $experience->fresh()->video_path;
    Storage::disk('local')->assertExists($first);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.video.store', $experience), [
            'video' => UploadedFile::fake()->create('second.mov', 500, 'video/quicktime'),
        ])
        ->assertSessionHasNoErrors();

    $second = $experience->fresh()->video_path;
    Storage::disk('local')->assertMissing($first);
    Storage::disk('local')->assertExists($second);

    $this->actingAs($experience->user)
        ->delete(route('account.experiences.video.destroy', $experience))
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->video_path)->toBeNull();
    Storage::disk('local')->assertMissing($second);
});

test('a video over the size limit is turned away with a way to reach the shop', function () {
    config(['taptale.max_video_kilobytes' => 1024]);
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->post(route('account.experiences.video.store', $experience), [
            'video' => UploadedFile::fake()->create('wedding.mp4', 2048, 'video/mp4'),
        ])
        ->assertSessionHasErrors(['video' => 'Videos up to 1 MB can be uploaded. For a bigger video, message us and we will help you add it, or add it as a YouTube link.']);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.video.store', $experience), [
            'video' => UploadedFile::fake()->create('virus.exe', 10, 'application/x-msdownload'),
        ])
        ->assertSessionHasErrors(['video' => 'Please choose an MP4, MOV or WebM video.']);

    expect($experience->fresh()->video_path)->toBeNull();
});

test('another customer cannot change the video on someone else\'s page', function () {
    $experience = DigitalExperience::factory()->create();
    $intruder = User::factory()->create();

    $this->actingAs($intruder)
        ->post(route('account.experiences.video.store', $experience), [
            'video' => UploadedFile::fake()->create('intruder.mp4', 100, 'video/mp4'),
        ])
        ->assertForbidden();

    $this->actingAs($intruder)
        ->delete(route('account.experiences.video.destroy', $experience))
        ->assertForbidden();

    expect($experience->fresh()->video_path)->toBeNull();
});

test('the video plays only for those who can see the page, and can be skipped through', function () {
    Storage::disk('local')->put('experiences/1/video/clip.mp4', str_repeat('v', 100));
    $experience = DigitalExperience::factory()->create();
    $experience->forceFill(['video_path' => 'experiences/1/video/clip.mp4'])->save();

    $this->get(route('experiences.video', $experience))->assertNotFound();

    tapTag($experience);

    $this->get(route('experiences.video', $experience))->assertOk();
    $this->withHeaders(['Range' => 'bytes=0-9'])
        ->get(route('experiences.video', $experience))
        ->assertStatus(206);
});

test('the owner adds a video link on the page, and only safe links are kept', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'video_url', 'value' => 'https://youtu.be/abc123'])
        ->assertSessionHasNoErrors();

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'video_url', 'value' => 'javascript:alert(1)'])
        ->assertSessionHasErrors('value');

    expect($experience->fresh()->video_url)->toBe('https://youtu.be/abc123');
});

test('the owner picks a frame for the video, on the page or in the editor', function () {
    $experience = DigitalExperience::factory()->create();

    expect($experience->fresh()->video_frame)->toBe('plain');

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'video_frame', 'value' => 'cinema'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->video_frame)->toBe('cinema');

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'video_frame', 'value' => 'disco'])
        ->assertSessionHasErrors('value');

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => 'classic',
            'theme' => 'cream',
            'title' => 'Us',
            'video_frame' => 'phone',
            'video_background' => 'sunset',
        ])
        ->assertSessionHasNoErrors();

    expect($experience->fresh())
        ->video_frame->toBe('phone')
        ->video_background->toBe('sunset');
});

test('the owner picks a background behind the video', function () {
    $experience = DigitalExperience::factory()->create();

    expect($experience->fresh()->video_background)->toBe('theme');

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'video_background', 'value' => 'theater'])
        ->assertSessionHasNoErrors();

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'video_background', 'value' => 'lava'])
        ->assertSessionHasErrors('value');

    expect($experience->fresh()->video_background)->toBe('theater');
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

test('a guest without the edit link cannot add photos', function () {
    $experience = DigitalExperience::factory()->create();

    $this->post(route('account.experiences.photos.store', $experience), [
        'photos' => [UploadedFile::fake()->image('us.jpg')],
    ])->assertForbidden();
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

test('the owner chooses whether all page photos rain down or only the ones added to the rain', function () {
    $experience = DigitalExperience::factory()->create(['template' => 'digital_bouquet', 'flower_rain' => 'both']);

    expect($experience->fresh()->photo_rain_source)->toBe(PhotoRainSource::All);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'photo_rain_source', 'value' => 'picked'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->photo_rain_source)->toBe(PhotoRainSource::Picked);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'photo_rain_source', 'value' => 'everyone'])
        ->assertSessionHasErrors('value');

    expect($experience->fresh()->photo_rain_source)->toBe(PhotoRainSource::Picked);
});

test('the owner changes the flowers and what rains over them on the page', function () {
    $experience = DigitalExperience::factory()->create(['template' => 'digital_bouquet']);

    expect($experience->fresh())
        ->flower_style->toBe(FlowerStyle::Bouquet)
        ->flower_rain->toBe(FlowerRain::None);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'flower_style', 'value' => 'lotus'])
        ->assertSessionHasNoErrors();
    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'flower_rain', 'value' => 'photos'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh())
        ->flower_style->toBe(FlowerStyle::Lotus)
        ->flower_rain->toBe(FlowerRain::Photos);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'flower_style', 'value' => 'cactus'])
        ->assertSessionHasErrors('value');
    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'flower_rain', 'value' => 'snow'])
        ->assertSessionHasErrors('value');

    expect($experience->fresh())
        ->flower_style->toBe(FlowerStyle::Lotus)
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
