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
 * The song file that plays on the page, changed right from the page itself
 * without opening the full editor.
 */
class ExperienceAudioController extends Controller
{
    /**
     * Upload the page song, replacing the one it had.
     */
    public function store(Request $request, DigitalExperience $experience): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $request->validate(
            ['audio' => ['required', File::types(['mp3', 'm4a', 'aac', 'ogg', 'wav'])->max(15360)]],
            [
                'audio.max' => 'The song file may not be larger than 15 MB.',
                'audio.uploaded' => 'The song file may not be larger than 15 MB.',
                'audio.mimes' => 'Please choose an MP3, M4A, AAC, OGG or WAV file.',
            ],
        );

        $diskName = (string) config('taptale.uploads_disk');
        $path = $request->file('audio')->store("experiences/{$experience->id}/audio", $diskName);

        if ($experience->audio_path !== null) {
            Storage::disk($diskName)->delete($experience->audio_path);
        }

        $experience->audio_path = $path ?: null;
        $experience->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your song is on the page.')]);

        return back();
    }

    /**
     * Remove the uploaded song file.
     */
    public function destroy(DigitalExperience $experience): RedirectResponse
    {
        Gate::authorize('update', $experience);

        if ($experience->audio_path !== null) {
            Storage::disk((string) config('taptale.uploads_disk'))->delete($experience->audio_path);
            $experience->audio_path = null;
            $experience->save();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Song file removed.')]);

        return back();
    }
}
