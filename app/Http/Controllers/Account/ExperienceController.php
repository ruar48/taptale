<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdateExperienceRequest;
use App\Http\Resources\DigitalExperienceResource;
use App\Models\DigitalExperience;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ExperienceController extends Controller
{
    /**
     * Show the editor for a customer's NFC / QR digital experience.
     */
    public function edit(DigitalExperience $experience): Response
    {
        Gate::authorize('update', $experience);

        $experience->load('order:id,reference,product_name');

        return Inertia::render('account/experiences/edit', [
            'experience' => new DigitalExperienceResource($experience),
            'order' => [
                'reference' => $experience->order->reference,
                'product_name' => $experience->order->product_name,
            ],
            'themes' => DigitalExperience::THEMES,
            'maxPhotos' => DigitalExperience::MAX_PHOTOS,
        ]);
    }

    /**
     * Update the experience content, add new photos and remove unwanted ones.
     */
    public function update(UpdateExperienceRequest $request, DigitalExperience $experience): RedirectResponse
    {
        $disk = Storage::disk(config('taptale.uploads_disk'));
        $photos = $experience->photos ?? [];

        $removeIndexes = array_map('intval', $request->validated('remove_photos', []));

        foreach ($removeIndexes as $index) {
            if (isset($photos[$index])) {
                $disk->delete($photos[$index]);
                unset($photos[$index]);
            }
        }

        foreach ($request->file('new_photos', []) as $photo) {
            $photos[] = $photo->store("experiences/{$experience->id}", config('taptale.uploads_disk'));
        }

        $experience->update([
            ...$request->safe()->except(['new_photos', 'remove_photos']),
            'photos' => array_values($photos),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your digital experience has been saved.')]);

        return to_route('account.experiences.edit', $experience);
    }
}
