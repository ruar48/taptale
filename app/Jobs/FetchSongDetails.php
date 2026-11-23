<?php

namespace App\Jobs;

use App\Actions\Music\LookupSong;
use App\Models\DigitalExperience;
use Illuminate\Foundation\Bus\Dispatchable;

/**
 * Saves album art and synced lyrics on a memory page when its song changes,
 * so the public page no longer depends on the music APIs being online.
 * Dispatched after the response, so it needs no queue worker.
 */
class FetchSongDetails
{
    use Dispatchable;

    public function __construct(public DigitalExperience $experience) {}

    public function handle(LookupSong $lookupSong): void
    {
        $experience = $this->experience->fresh();

        if ($experience === null) {
            return;
        }

        // Over the page budget the details stay empty; the page then looks the
        // song up through the visitor search when someone opens it.
        $details = blank($experience->song_title)
            ? null
            : $lookupSong->forPage($experience->song_title, $experience->song_artist, $experience->user_id);

        $experience->forceFill(['song_details' => $details])->saveQuietly();
    }
}
