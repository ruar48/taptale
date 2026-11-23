<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\DigitalExperience;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;
use Inertia\Inertia;

/**
 * A short video file on the owner's page. Videos take a lot of storage, so
 * there is a size limit; longer videos go on YouTube or Vimeo as a link, and
 * customers with a bigger file are asked to message the shop.
 */
class ExperienceVideoController extends Controller
{
    /**
     * Upload the page video, replacing the one it had.
     */
    public function store(Request $request, DigitalExperience $experience): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $request->validate(['video' => self::rules()], self::messages());

        $disk = Storage::disk((string) config('taptale.uploads_disk'));
        $path = $request->file('video')->store("experiences/{$experience->id}/video", (string) config('taptale.uploads_disk'));

        if ($experience->video_path !== null) {
            $disk->delete($experience->video_path);
        }

        $experience->update(['video_path' => $path ?: null]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your video is on the page.')]);

        return back();
    }

    /**
     * Remove the uploaded video.
     */
    public function destroy(DigitalExperience $experience): RedirectResponse
    {
        Gate::authorize('update', $experience);

        if ($experience->video_path !== null) {
            Storage::disk((string) config('taptale.uploads_disk'))->delete($experience->video_path);
            $experience->update(['video_path' => null]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Video removed.')]);

        return back();
    }

    /**
     * Rules for an uploaded page video.
     *
     * @return list<mixed>
     */
    public static function rules(bool $required = true): array
    {
        return [
            $required ? 'required' : 'nullable',
            File::types(['mp4', 'mov', 'm4v', 'webm'])->max((int) config('taptale.max_video_kilobytes')),
        ];
    }

    /**
     * Messages for an uploaded page video, keyed by the given field.
     *
     * @return array<string, string>
     */
    public static function messages(string $field = 'video'): array
    {
        $tooBig = 'Videos up to '.self::limitInMegabytes().' MB can be uploaded. For a bigger video, message us and we will help you add it, or add it as a YouTube link.';

        return [
            "{$field}.max" => $tooBig,
            "{$field}.uploaded" => $tooBig,
            "{$field}.mimes" => 'Please choose an MP4, MOV or WebM video.',
            "{$field}.mimetypes" => 'Please choose an MP4, MOV or WebM video.',
        ];
    }

    private static function limitInMegabytes(): int
    {
        return (int) round((int) config('taptale.max_video_kilobytes') / 1024);
    }
}
