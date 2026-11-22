<?php

namespace App\Http\Controllers\Account;

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
 * Extra sections (polaroid timeline, film strip, scrapbook, album or note)
 * the owner adds between the template's own sections, with their own photo
 * slots and background color.
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
        'scrapbook' => 4,
        'album' => 6,
        'note' => 0,
    ];

    /**
     * Add a section in the chosen style after the given number of template sections.
     */
    public function store(Request $request, DigitalExperience $experience): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $validated = $request->validate([
            'position' => ['required', 'integer', 'min:0', 'max:50'],
            'type' => ['required', Rule::in(array_keys(self::TYPES))],
        ]);

        $sections = $experience->custom_sections ?? [];

        if (count($sections) >= DigitalExperience::MAX_CUSTOM_SECTIONS) {
            throw ValidationException::withMessages([
                'position' => 'Your page can have at most '.DigitalExperience::MAX_CUSTOM_SECTIONS.' extra sections.',
            ]);
        }

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
            'type' => ['sometimes', Rule::in(array_keys(self::TYPES))],
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

        if (array_key_exists('type', $validated)) {
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
