<?php

namespace App\Http\Controllers\Account;

use App\Actions\DigitalExperiences\StoreExperiencePhoto;
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
 * The photos the owner picks to rain down over the flowers on their page.
 * They are re-encoded like every page photo, so no location data leaks.
 */
class ExperienceRainPhotoController extends Controller
{
    /**
     * Add photos to the rain.
     */
    public function store(Request $request, DigitalExperience $experience, StoreExperiencePhoto $storePhoto): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $validated = $request->validate([
            'photos' => ['required', 'array', 'min:1', 'max:'.DigitalExperience::MAX_RAIN_PHOTOS],
            'photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max((int) config('taptale.max_upload_kilobytes'))],
        ], [
            'photos.required' => 'Please choose a photo to add.',
        ], [
            'photos.*' => 'photo',
        ]);

        $rainPhotos = $experience->rain_photos ?? [];

        if (count($rainPhotos) + count($validated['photos']) > DigitalExperience::MAX_RAIN_PHOTOS) {
            throw ValidationException::withMessages([
                'photos' => 'Up to '.DigitalExperience::MAX_RAIN_PHOTOS.' photos can rain down on your page.',
            ]);
        }

        $experience->update([
            'rain_photos' => [...$rainPhotos, ...$storePhoto->handleMany($experience, $validated['photos'], 'photos')],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photos added to the rain.')]);

        return back();
    }

    /**
     * Take one photo out of the rain and delete it.
     */
    public function destroy(DigitalExperience $experience, int $index): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $rainPhotos = $experience->rain_photos ?? [];

        abort_unless(isset($rainPhotos[$index]), 404);

        Storage::disk((string) config('taptale.uploads_disk'))->delete($rainPhotos[$index]);
        unset($rainPhotos[$index]);

        $experience->update(['rain_photos' => array_values($rainPhotos)]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photo removed from the rain.')]);

        return back();
    }
}
