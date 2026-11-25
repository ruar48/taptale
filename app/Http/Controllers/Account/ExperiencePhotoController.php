<?php

namespace App\Http\Controllers\Account;

use App\Actions\DigitalExperiences\StoreExperiencePhoto;
use App\Http\Controllers\Controller;
use App\Models\DigitalExperience;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
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
     * Add photos to the page, optionally putting the first one in a moment,
     * an extra section's slot, or a frame of the page design's sections.
     */
    public function store(Request $request, DigitalExperience $experience, StoreExperiencePhoto $storePhoto): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $frameSection = $request->input('frame');
        $frameCount = is_string($frameSection) ? (DigitalExperience::PHOTO_FRAMES[$frameSection] ?? 1) : 1;

        $validated = $request->validate([
            'photos' => ['required', 'array', 'min:1', 'max:10'],
            'photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max((int) config('taptale.max_upload_kilobytes'))],
            'moment' => ['nullable', 'integer', 'min:0'],
            'section' => ['nullable', 'string', 'max:20'],
            'slot' => ['nullable', 'required_with:section', 'integer', 'min:0'],
            'frame' => ['nullable', 'string', Rule::in(array_keys(DigitalExperience::PHOTO_FRAMES))],
            'frame_index' => ['nullable', 'required_with:frame', 'integer', 'min:0', 'max:'.($frameCount - 1)],
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
        $photos = [...$photos, ...$storePhoto->handleMany($experience, $validated['photos'], 'photos')];

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

        $frames = $experience->photo_frames ?? [];
        $frame = $validated['frame'] ?? null;

        if ($frame !== null && count($photos) > $firstNewIndex) {
            $frames[$frame] = array_pad($frames[$frame] ?? [], $validated['frame_index'] + 1, null);
            $frames[$frame][$validated['frame_index']] = $firstNewIndex;
        }

        $experience->update([
            'photos' => $photos,
            'moments' => $moments,
            'custom_sections' => $sections,
            'photo_frames' => $frames,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photo added to your page.')]);

        return back();
    }

    /**
     * Swap one existing photo for a new one, keeping its place on the page.
     */
    public function replace(Request $request, DigitalExperience $experience, int $index, StoreExperiencePhoto $storePhoto): RedirectResponse
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
        $stored = $storePhoto->handle($experience, $validated['photo']);

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
