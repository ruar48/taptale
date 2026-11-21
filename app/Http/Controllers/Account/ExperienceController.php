<?php

namespace App\Http\Controllers\Account;

use App\Enums\ExperienceTemplate;
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
            'templates' => ExperienceTemplate::options(),
            'themes' => DigitalExperience::THEMES,
            'maxPhotos' => DigitalExperience::MAX_PHOTOS,
            'maxMoments' => DigitalExperience::MAX_MOMENTS,
            'maxUploadKilobytes' => (int) config('taptale.max_upload_kilobytes'),
        ]);
    }

    /**
     * Update the page content, photos, timeline moments and background song.
     */
    public function update(UpdateExperienceRequest $request, DigitalExperience $experience): RedirectResponse
    {
        $diskName = (string) config('taptale.uploads_disk');
        $disk = Storage::disk($diskName);

        [$photos, $photoIndexMap] = $this->syncPhotos($request, $experience, $diskName);

        $audioPath = $experience->audio_path;

        if (($request->boolean('remove_audio') || $request->hasFile('audio')) && $audioPath !== null) {
            $disk->delete($audioPath);
            $audioPath = null;
        }

        if ($request->hasFile('audio')) {
            $audioPath = $request->file('audio')->store("experiences/{$experience->id}/audio", $diskName) ?: null;
        }

        $experience->fill([
            ...$request->safe()->except(['new_photos', 'remove_photos', 'audio', 'remove_audio', 'moments']),
            'photos' => $photos,
            'moments' => $this->normalizeMoments($request->validated('moments', []), $photoIndexMap),
        ]);
        $experience->audio_path = $audioPath;
        $experience->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your memory page has been saved.')]);

        return to_route('account.experiences.edit', $experience);
    }

    /**
     * Remove unwanted photos, append new uploads, and return the new photo
     * list with a map from old photo positions to new ones.
     *
     * @return array{0: list<string>, 1: array<int, int>}
     */
    private function syncPhotos(UpdateExperienceRequest $request, DigitalExperience $experience, string $diskName): array
    {
        $removing = array_map('intval', $request->validated('remove_photos', []));
        $photos = [];
        $indexMap = [];

        foreach ($experience->photos ?? [] as $index => $path) {
            if (in_array($index, $removing, true)) {
                Storage::disk($diskName)->delete($path);

                continue;
            }

            $indexMap[$index] = count($photos);
            $photos[] = $path;
        }

        foreach ($request->file('new_photos', []) as $photo) {
            $stored = $photo->store("experiences/{$experience->id}", $diskName);

            if ($stored !== false) {
                $photos[] = $stored;
            }
        }

        return [$photos, $indexMap];
    }

    /**
     * Keep only filled-in moments and point their photos at the new positions.
     *
     * @param  array<int, array<string, mixed>>  $moments
     * @param  array<int, int>  $photoIndexMap
     * @return list<array{date: string|null, title: string|null, caption: string|null, photo: int|null}>
     */
    private function normalizeMoments(array $moments, array $photoIndexMap): array
    {
        $normalized = [];

        foreach ($moments as $moment) {
            $photo = isset($moment['photo']) ? ($photoIndexMap[(int) $moment['photo']] ?? null) : null;
            $entry = [
                'date' => filled($moment['date'] ?? null) ? trim((string) $moment['date']) : null,
                'title' => filled($moment['title'] ?? null) ? trim((string) $moment['title']) : null,
                'caption' => filled($moment['caption'] ?? null) ? trim((string) $moment['caption']) : null,
                'photo' => $photo,
            ];

            if ($entry['date'] === null && $entry['title'] === null && $entry['caption'] === null && $entry['photo'] === null) {
                continue;
            }

            $normalized[] = $entry;
        }

        return $normalized;
    }
}
