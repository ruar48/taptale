<?php

use App\Models\DigitalExperience;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * @param  list<array{photo: int|null, caption: string|null}>|null  $slots
 * @return array{id: string, type: string, position: int, title: string|null, background: string|null, slots: list<array{photo: int|null, caption: string|null}>}
 */
function timelineSection(string $id = 'abc12345', ?array $slots = null): array
{
    return [
        'id' => $id,
        'type' => 'timeline',
        'position' => 2,
        'title' => null,
        'background' => null,
        'slots' => $slots ?? [
            ['photo' => null, 'caption' => null],
            ['photo' => null, 'caption' => null],
        ],
    ];
}

test('the owner adds a section in the chosen style between the template sections', function (string $type, int $slots) {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->from(route('experiences.show', $experience))
        ->post(route('account.experiences.sections.store', $experience), ['position' => 2, 'type' => $type])
        ->assertRedirect(route('experiences.show', $experience))
        ->assertSessionHasNoErrors();

    $sections = $experience->fresh()->custom_sections;

    expect($sections)->toHaveCount(1)
        ->and($sections[0])->toMatchArray([
            'type' => $type,
            'position' => 2,
            'title' => null,
            'text' => null,
            'background' => null,
        ])
        ->and($sections[0]['slots'])->toHaveCount($slots);
})->with([
    'polaroid timeline' => ['timeline', 4],
    'film strip' => ['film_strip', 3],
    'scrapbook board' => ['scrapbook', 4],
    'photo album' => ['album', 6],
    'text note' => ['note', 0],
    'story timeline from the page designs' => ['story_timeline', 0],
    'love letter from the page designs' => ['letter', 0],
]);

test('flowers can only be placed on a page that bought them', function () {
    $experience = DigitalExperience::factory()->create(['template' => 'anniversary']);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.sections.store', $experience), ['position' => 1, 'type' => 'flowers'])
        ->assertSessionHasErrors(['type' => 'Flowers can be added to this page design when ordering.']);

    expect($experience->fresh()->custom_sections)->toBeNull();

    $experience->update(['flower_addon' => true]);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.sections.store', $experience), ['position' => 1, 'type' => 'flowers'])
        ->assertSessionHasNoErrors();
    $this->actingAs($experience->user)
        ->post(route('account.experiences.sections.store', $experience), ['position' => 4, 'type' => 'flowers'])
        ->assertSessionHasNoErrors();

    $sections = $experience->fresh()->custom_sections;

    expect($sections)->toHaveCount(1)
        ->and($sections[0])->toMatchArray(['type' => 'flowers', 'position' => 4, 'slots' => []]);
});

test('the bouquet design cannot get its flowers a second time', function () {
    $experience = DigitalExperience::factory()->create(['template' => 'digital_bouquet', 'flower_addon' => true]);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.sections.store', $experience), ['position' => 1, 'type' => 'flowers'])
        ->assertSessionHasErrors(['type' => 'This design already opens with its flowers.']);
});

test('a section cannot be switched into the flowers', function () {
    $experience = DigitalExperience::factory()->create(['custom_sections' => [timelineSection()]]);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.sections.update', [$experience, 'abc12345']), ['type' => 'flowers'])
        ->assertSessionHasErrors('type');

    expect($experience->fresh()->custom_sections[0]['type'])->toBe('timeline');
});

test('only known section styles can be added', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->post(route('account.experiences.sections.store', $experience), ['position' => 2, 'type' => 'flowers'])
        ->assertSessionHasErrors('type');

    expect($experience->fresh()->custom_sections)->toBeNull();
});

test('the owner switches a section to another style and keeps its photos', function () {
    $experience = DigitalExperience::factory()->create([
        'custom_sections' => [timelineSection(slots: [['photo' => 0, 'caption' => 'Us']])],
    ]);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.sections.update', [$experience, 'abc12345']), ['type' => 'film_strip'])
        ->assertSessionHasNoErrors();

    $section = $experience->fresh()->custom_sections[0];

    expect($section['type'])->toBe('film_strip')
        ->and($section['slots'])->toBe([['photo' => 0, 'caption' => 'Us']]);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.sections.update', [$experience, 'abc12345']), ['type' => 'flowers'])
        ->assertSessionHasErrors(['type' => 'Please choose one of the section styles.']);

    expect($experience->fresh()->custom_sections[0]['type'])->toBe('film_strip');
});

test('a note switched to a photo style gets empty photo slots', function () {
    $experience = DigitalExperience::factory()->create([
        'custom_sections' => [[...timelineSection(slots: []), 'type' => 'note']],
    ]);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.sections.update', [$experience, 'abc12345']), ['type' => 'album'])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->custom_sections[0]['slots'])->toHaveCount(6);
});

test('the owner writes the message of a note section on the page', function () {
    $experience = DigitalExperience::factory()->create([
        'custom_sections' => [[...timelineSection(slots: []), 'type' => 'note']],
    ]);
    $message = str_repeat('I love you. ', 100);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'sections.abc12345.text', 'value' => $message])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->custom_sections[0]['text'])->toBe(trim($message));

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'sections.abc12345.text', 'value' => str_repeat('a', 2001)])
        ->assertSessionHasErrors('value');

    expect($experience->fresh()->custom_sections[0]['text'])->toBe(trim($message));
});

test('a page can have at most six extra sections', function () {
    $experience = DigitalExperience::factory()->create([
        'custom_sections' => array_map(fn (int $index): array => timelineSection("section{$index}"), range(1, 6)),
    ]);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.sections.store', $experience), ['position' => 1, 'type' => 'timeline'])
        ->assertSessionHasErrors(['position' => 'Your page can have at most 6 extra sections.']);

    expect($experience->fresh()->custom_sections)->toHaveCount(6);
});

test('the owner changes the background color and number of photo slots', function () {
    $experience = DigitalExperience::factory()->create([
        'custom_sections' => [timelineSection(slots: [
            ['photo' => 0, 'caption' => 'First date'],
            ['photo' => null, 'caption' => 'Baguio'],
        ])],
    ]);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.sections.update', [$experience, 'abc12345']), [
            'background' => '#1E3346',
            'slot_count' => 6,
        ])
        ->assertSessionHasNoErrors();

    $section = $experience->fresh()->custom_sections[0];

    expect($section['background'])->toBe('#1e3346')
        ->and($section['slots'])->toHaveCount(6)
        ->and($section['slots'][0])->toBe(['photo' => 0, 'caption' => 'First date']);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.sections.update', [$experience, 'abc12345']), [
            'background' => null,
            'slot_count' => 1,
        ])
        ->assertSessionHasNoErrors();

    $section = $experience->fresh()->custom_sections[0];

    expect($section['background'])->toBeNull()
        ->and($section['slots'])->toBe([['photo' => 0, 'caption' => 'First date']]);
});

test('section colors and photo counts are validated', function (array $payload, string $field, string $message) {
    $experience = DigitalExperience::factory()->create(['custom_sections' => [timelineSection()]]);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.sections.update', [$experience, 'abc12345']), $payload)
        ->assertSessionHasErrors([$field => $message]);

    expect($experience->fresh()->custom_sections[0])->toBe(timelineSection());
})->with([
    'not a hex color' => [['background' => 'red; display:none'], 'background', 'Please choose a valid color.'],
    'too many photos' => [['slot_count' => 13], 'slot_count', 'A section can have at most 12 photos.'],
    'no photos' => [['slot_count' => 0], 'slot_count', 'A section needs at least one photo.'],
]);

test('the owner removes a section', function () {
    $experience = DigitalExperience::factory()->create([
        'custom_sections' => [timelineSection('keepme12'), timelineSection('removeme')],
    ]);

    $this->actingAs($experience->user)
        ->delete(route('account.experiences.sections.destroy', [$experience, 'removeme']))
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->custom_sections)->toBe([timelineSection('keepme12')]);
});

test('an unknown section is not found', function () {
    $experience = DigitalExperience::factory()->create(['custom_sections' => [timelineSection()]]);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.sections.update', [$experience, 'missing1']), ['slot_count' => 3])
        ->assertNotFound();

    $this->actingAs($experience->user)
        ->delete(route('account.experiences.sections.destroy', [$experience, 'missing1']))
        ->assertNotFound();
});

test('only the owner can manage sections', function () {
    $experience = DigitalExperience::factory()->create(['custom_sections' => [timelineSection()]]);
    $intruder = User::factory()->create();

    $this->actingAs($intruder)
        ->post(route('account.experiences.sections.store', $experience), ['position' => 1, 'type' => 'timeline'])
        ->assertForbidden();

    $this->actingAs($intruder)
        ->patch(route('account.experiences.sections.update', [$experience, 'abc12345']), ['slot_count' => 8])
        ->assertForbidden();

    $this->actingAs($intruder)
        ->delete(route('account.experiences.sections.destroy', [$experience, 'abc12345']))
        ->assertForbidden();

    expect($experience->fresh()->custom_sections)->toBe([timelineSection()]);
});

test('guests must sign in to add a section', function () {
    $experience = DigitalExperience::factory()->create();

    $this->post(route('account.experiences.sections.store', $experience), ['position' => 1, 'type' => 'timeline'])
        ->assertRedirect(route('login'));

    expect($experience->fresh()->custom_sections)->toBeNull();
});

test('the owner edits a section title and photo caption on the page', function () {
    $experience = DigitalExperience::factory()->create(['custom_sections' => [timelineSection()]]);

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'sections.abc12345.title', 'value' => 'Our 6 months together'])
        ->assertSessionHasNoErrors();

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'sections.abc12345.slots.1.caption', 'value' => 'Rainy day café'])
        ->assertSessionHasNoErrors();

    $section = $experience->fresh()->custom_sections[0];

    expect($section['title'])->toBe('Our 6 months together')
        ->and($section['slots'][1]['caption'])->toBe('Rainy day café');

    $this->actingAs($experience->user)
        ->patch(route('account.experiences.content', $experience), ['field' => 'sections.abc12345.slots.9.caption', 'value' => 'Nope'])
        ->assertSessionHasErrors(['field' => 'That section no longer exists.']);
});

test('a photo added in a section slot is attached to that slot', function () {
    Storage::fake('local');
    $experience = DigitalExperience::factory()->create([
        'photos' => ['experiences/a.jpg'],
        'custom_sections' => [timelineSection()],
    ]);

    $this->actingAs($experience->user)
        ->post(route('account.experiences.photos.store', $experience), [
            'photos' => [UploadedFile::fake()->image('us.jpg')],
            'section' => 'abc12345',
            'slot' => 1,
        ])
        ->assertSessionHasNoErrors();

    $slots = $experience->fresh()->custom_sections[0]['slots'];

    expect($slots[0]['photo'])->toBeNull()
        ->and($slots[1]['photo'])->toBe(1);
});

test('section photos follow their photos when other photos are removed', function () {
    Storage::fake('local');
    $experience = DigitalExperience::factory()->create([
        'photos' => ['experiences/a.jpg', 'experiences/b.jpg'],
        'custom_sections' => [timelineSection(slots: [
            ['photo' => 1, 'caption' => 'Kept'],
            ['photo' => 0, 'caption' => 'Gone'],
        ])],
    ]);

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => 'birthday',
            'theme' => 'midnight',
            'title' => 'Happy birthday',
            'remove_photos' => [0],
        ])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->custom_sections[0]['slots'])->toBe([
        ['photo' => 0, 'caption' => 'Kept'],
        ['photo' => null, 'caption' => 'Gone'],
    ]);
});

test('the page shows extra sections with their photo links', function () {
    $experience = DigitalExperience::factory()->create([
        'is_published' => true,
        'photos' => ['experiences/a.jpg'],
        'custom_sections' => [timelineSection(slots: [['photo' => 0, 'caption' => 'Us']])],
    ]);

    tapTag($experience);

    $this->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page
            ->where('experience.custom_sections.0.id', 'abc12345')
            ->where('experience.custom_sections.0.slots.0.caption', 'Us')
            ->where('experience.custom_sections.0.slots.0.photo_url', route('experiences.photo', ['experience' => $experience->code, 'index' => 0])));
});
