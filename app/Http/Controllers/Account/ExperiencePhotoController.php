<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\DigitalExperience;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Lets the owner drop photos straight into empty frames while viewing
 * their memory page.
 */
class ExperiencePhotoController extends Controller
{
    /**
     * Add photos to the page, optionally attaching the first one to a moment.
     */
    public function store(Request $request, DigitalExperience $experience): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $validated = $request->validate([
            'photos' => ['required', 'array', 'min:1', 'max:10'],
            'photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max((int) config('taptale.max_upload_kilobytes'))],
            'moment' => ['nullable', 'integer', 'min:0'],
            'section' => ['nullable', 'string', 'max:20'],
            'slot' => ['nullable', 'required_with:section', 'integer', 'min:0'],
        ], [
            'photos.required' => 'Please choose a photo to add.',
        ], [
            'photos.*' => 'photo',
        ]);

        $photos = $experience->photos ?? [];

        if (count($photos) + count($validated['photos']) > DigitalExperience::MAX_PHOTOS) {
            throw ValidationException::withMessages([
                'photos' => 'Your page can have at most '.DigitalExperience::MAX_PHOTOS.' photos.',
            ]);
        }

        $firstNewIndex = count($photos);
        $disk = (string) config('taptale.uploads_disk');

        foreach ($validated['photos'] as $photo) {
            $stored = $photo->store("experiences/{$experience->id}", $disk);

            if ($stored !== false) {
                $photos[] = $stored;
            }
        }

        $moments = $experience->moments ?? [];
        $momentIndex = $validated['moment'] ?? null;

        if ($momentIndex !== null && isset($moments[$momentIndex]) && count($photos) > $firstNewIndex) {
            $moments[$momentIndex]['photo'] = $firstNewIndex;
        }

        $sections = $experience->custom_sections ?? [];

        if (isset($validated['section']) && count($photos) > $firstNewIndex) {
            foreach ($sections as $index => $section) {
                if ($section['id'] === $validated['section'] && isset($section['slots'][$validated['slot']])) {
                    $sections[$index]['slots'][$validated['slot']]['photo'] = $firstNewIndex;
                }
            }
        }

        $experience->update([
            'photos' => $photos,
            'moments' => $moments,
            'custom_sections' => $sections,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photo added to your page.')]);

        return back();
    }

    /**
     * Swap one existing photo for a new one, keeping its place on the page.
     */
    public function replace(Request $request, DigitalExperience $experience, int $index): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $photos = $experience->photos ?? [];

        abort_unless(isset($photos[$index]), 404);

        $validated = $request->validate([
            'photo' => ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max((int) config('taptale.max_upload_kilobytes'))],
        ], [
            'photo.required' => 'Please choose a photo.',
        ]);

        $disk = (string) config('taptale.uploads_disk');
        $stored = $validated['photo']->store("experiences/{$experience->id}", $disk);

        if ($stored === false) {
            throw ValidationException::withMessages(['photo' => 'The photo could not be saved. Please try again.']);
        }

        Storage::disk($disk)->delete($photos[$index]);
        $photos[$index] = $stored;
        $experience->update(['photos' => $photos]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photo changed.')]);

        return back();
    }
}
