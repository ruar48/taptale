<?php

namespace App\Http\Controllers\Account;

use App\Enums\ExperienceTemplate;
use App\Http\Controllers\Controller;
use App\Models\DigitalExperience;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Extra sections the owner adds between the template's own sections: their
 * own polaroid timeline, film strip, scrapbook, album or note (with photo
 * slots and a background color), one of the page designs' sections that
 * shows the page's own words, moments and photos, or the flowers.
 */
class ExperienceSectionController extends Controller
{
    /**
     * Section styles the owner can choose from, with the photo slots each starts with.
     *
     * @var array<string, int>
     */
    public const TYPES = [
        'timeline' => 4,
        'film_strip' => 3,
        'film_standing' => 6,
        'scrapbook' => 4,
        'album' => 6,
        'note' => 0,
        'story_timeline' => 0,
        'polaroid_wall' => 0,
        'gallery' => 0,
        'letter' => 0,
        'quote' => 0,
        'song' => 0,
        'countdown' => 0,
        'video' => 0,
        'flowers' => 0,
    ];

    /**
     * The page design section each style shows or looks just like. A page
     * shows each of these once; text notes can be added any number of times.
     *
     * @var array<string, string>
     */
    public const SECTIONS = [
        'timeline' => 'polaroid_wall',
        'film_strip' => 'film_strip',
        'scrapbook' => 'scrapbook',
        'album' => 'gallery',
        'story_timeline' => 'timeline',
        'polaroid_wall' => 'polaroid_wall',
        'gallery' => 'gallery',
        'letter' => 'letter_paper',
        'quote' => 'quote',
        'song' => 'song',
        'countdown' => 'countdown',
        'video' => 'video',
    ];

    /**
     * Where the flowers go. Flowers are a paid add-on chosen at checkout, so
     * a page only gets this section once they are bought, and only once.
     */
    public const FLOWERS = 'flowers';

    /**
     * Add a section in the chosen style after the given number of template
     * sections. Adding the flowers again moves them to the new spot.
     */
    public function store(Request $request, DigitalExperience $experience): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $validated = $request->validate([
            'position' => ['required', 'integer', 'min:0', 'max:50'],
            'type' => ['required', Rule::in(array_keys(self::TYPES))],
        ]);

        $sections = $experience->custom_sections ?? [];

        if ($validated['type'] === self::FLOWERS) {
            return $this->placeFlowers($experience, $sections, (int) $validated['position']);
        }

        if (count($sections) >= DigitalExperience::MAX_CUSTOM_SECTIONS) {
            throw ValidationException::withMessages([
                'position' => 'Your page can have at most '.DigitalExperience::MAX_CUSTOM_SECTIONS.' extra sections.',
            ]);
        }

        $this->ensureNotOnPage($experience, $sections, $validated['type']);

        $sections[] = [
            'id' => Str::lower(Str::random(8)),
            'type' => $validated['type'],
            'position' => (int) $validated['position'],
            'title' => null,
            'text' => null,
            'background' => null,
            'slots' => $this->emptySlots(self::TYPES[$validated['type']]),
        ];

        $experience->update(['custom_sections' => $sections]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Section added.')]);

        return back();
    }

    /**
     * Change a section's style, background color or number of photo slots.
     */
    public function update(Request $request, DigitalExperience $experience, string $section): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $validated = $request->validate([
            'type' => ['sometimes', Rule::in(array_diff(array_keys(self::TYPES), [self::FLOWERS]))],
            'background' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'slot_count' => ['sometimes', 'integer', 'min:1', 'max:'.DigitalExperience::MAX_SECTION_SLOTS],
        ], [
            'background.regex' => 'Please choose a valid color.',
            'type.in' => 'Please choose one of the section styles.',
            'slot_count.max' => 'A section can have at most :max photos.',
            'slot_count.min' => 'A section needs at least one photo.',
        ]);

        $sections = $experience->custom_sections ?? [];
        $index = $this->indexOf($sections, $section);

        if (array_key_exists('type', $validated) && $validated['type'] !== $sections[$index]['type']) {
            $this->ensureNotOnPage($experience, $sections, $validated['type'], except: $section);
            $sections[$index]['type'] = $validated['type'];

            if ($sections[$index]['slots'] === []) {
                $sections[$index]['slots'] = $this->emptySlots(self::TYPES[$validated['type']]);
            }
        }

        if (array_key_exists('background', $validated)) {
            $sections[$index]['background'] = $validated['background'] === null ? null : Str::lower($validated['background']);
        }

        if (array_key_exists('slot_count', $validated)) {
            $slots = array_slice($sections[$index]['slots'], 0, $validated['slot_count']);

            while (count($slots) < $validated['slot_count']) {
                $slots[] = ['photo' => null, 'caption' => null];
            }

            $sections[$index]['slots'] = $slots;
        }

        $experience->update(['custom_sections' => $sections]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Saved.')]);

        return back();
    }

    /**
     * Remove a section. Its photos stay in the page's photo library.
     */
    public function destroy(DigitalExperience $experience, string $section): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $sections = $experience->custom_sections ?? [];
        unset($sections[$this->indexOf($sections, $section)]);

        $experience->update(['custom_sections' => array_values($sections)]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Section removed.')]);

        return back();
    }

    /**
     * Put the bought flowers at a spot on the page, moving them if they
     * already have one.
     *
     * @param  list<array<string, mixed>>  $sections
     *
     * @throws ValidationException
     */
    private function placeFlowers(DigitalExperience $experience, array $sections, int $position): RedirectResponse
    {
        if (! $experience->flower_addon || ! $experience->showsFlowers() || $experience->template === ExperienceTemplate::DigitalBouquet) {
            throw ValidationException::withMessages([
                'type' => $experience->template === ExperienceTemplate::DigitalBouquet
                    ? 'This design already opens with its flowers.'
                    : 'Flowers can be added to this page design when ordering.',
            ]);
        }

        $index = collect($sections)->search(fn (array $section): bool => $section['type'] === self::FLOWERS);

        if ($index !== false) {
            $sections[$index]['position'] = $position;
        } elseif (count($sections) >= DigitalExperience::MAX_CUSTOM_SECTIONS) {
            throw ValidationException::withMessages([
                'position' => 'Your page can have at most '.DigitalExperience::MAX_CUSTOM_SECTIONS.' extra sections.',
            ]);
        } else {
            $sections[] = [
                'id' => Str::lower(Str::random(8)),
                'type' => self::FLOWERS,
                'position' => $position,
                'title' => null,
                'text' => null,
                'background' => null,
                'slots' => [],
            ];
        }

        $experience->update(['custom_sections' => array_values($sections)]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your flowers moved here.')]);

        return back();
    }

    /**
     * Refuse a style whose section the page already shows, in its design or
     * as another extra section.
     *
     * @param  list<array<string, mixed>>  $sections
     *
     * @throws ValidationException
     */
    private function ensureNotOnPage(DigitalExperience $experience, array $sections, string $type, ?string $except = null): void
    {
        $designSection = self::SECTIONS[$type] ?? null;

        if ($designSection === null) {
            return;
        }

        $isAdded = collect($sections)->contains(fn (array $section): bool => $section['id'] !== $except
            && (self::SECTIONS[$section['type']] ?? null) === $designSection);

        if ($isAdded || in_array($designSection, $experience->template->sections(), true)) {
            throw ValidationException::withMessages([
                'type' => 'This section is already on your page.',
            ]);
        }
    }

    /**
     * @return list<array{photo: null, caption: null}>
     */
    private function emptySlots(int $count): array
    {
        return array_fill(0, $count, ['photo' => null, 'caption' => null]);
    }

    /**
     * @param  list<array<string, mixed>>  $sections
     */
    private function indexOf(array $sections, string $id): int
    {
        foreach ($sections as $index => $section) {
            if (($section['id'] ?? null) === $id) {
                return $index;
            }
        }

        abort(404);
    }
}
