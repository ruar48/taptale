<?php

namespace App\Http\Controllers\Account;

use App\Enums\ExperienceTemplate;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdateExperienceRequest;
use App\Http\Resources\DigitalExperienceResource;
use App\Models\DigitalExperience;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ExperienceController extends Controller
{
    /**
     * Switch the page design (template and color theme) from the page itself.
     */
    public function updateDesign(Request $request, DigitalExperience $experience): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $validated = $request->validate([
            'template' => ['required', Rule::enum(ExperienceTemplate::class)],
            'theme' => ['required', Rule::in(DigitalExperience::THEMES)],
        ]);

        if ($validated['template'] !== $experience->template->value && $experience->isTemplateLocked()) {
            throw ValidationException::withMessages([
                'template' => __('Your keepsake has been released, so its page design can no longer be changed.'),
            ]);
        }

        $experience->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Design updated.')]);

        return back();
    }

    /**
     * Show the editor for a customer's NFC / QR digital experience.
     */
    public function edit(DigitalExperience $experience): Response
    {
        Gate::authorize('update', $experience);

        $experience->load('order:id,reference,product_name,status');

        return Inertia::render('account/experiences/edit', [
            'experience' => new DigitalExperienceResource($experience),
            'order' => [
                'reference' => $experience->order->reference,
                'product_name' => $experience->order->product_name,
            ],
            'templates' => ExperienceTemplate::options(),
            'isTemplateLocked' => $experience->isTemplateLocked(),
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
            'custom_sections' => $this->remapSectionPhotos($experience->custom_sections ?? [], $photoIndexMap),
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
     * Point the photo slots of the owner's extra sections at the new photo
     * positions, emptying slots whose photo was removed.
     *
     * @param  list<array<string, mixed>>  $sections
     * @param  array<int, int>  $photoIndexMap
     * @return list<array<string, mixed>>
     */
    private function remapSectionPhotos(array $sections, array $photoIndexMap): array
    {
        return array_map(function (array $section) use ($photoIndexMap): array {
            $section['slots'] = array_map(fn (array $slot): array => [
                ...$slot,
                'photo' => isset($slot['photo']) ? ($photoIndexMap[(int) $slot['photo']] ?? null) : null,
            ], $section['slots'] ?? []);

            return $section;
        }, $sections);
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
