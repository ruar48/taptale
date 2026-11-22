<?php

use App\Jobs\FetchSongDetails;
use App\Models\DigitalExperience;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;

test('it returns artwork, a preview and synced lyrics for a song', function () {
    Http::fake([
        'itunes.apple.com/*' => Http::response(['results' => [[
            'trackName' => 'Perfect',
            'artistName' => 'Ed Sheeran',
            'artworkUrl100' => 'https://is1.mzstatic.com/image/100x100bb.jpg',
            'previewUrl' => 'https://audio.example/preview.m4a',
            'trackViewUrl' => 'https://music.apple.com/perfect',
            'trackTimeMillis' => 263400,
        ]]]),
        'lrclib.net/api/get*' => Http::response([
            'syncedLyrics' => "[00:12.50] I found a love\n[00:18.04] for me\n",
            'plainLyrics' => "I found a love\n\nfor me",
        ]),
    ]);

    $this->getJson(route('songs.lookup', ['title' => 'Perfect', 'artist' => 'Ed Sheeran']))
        ->assertOk()
        ->assertJson([
            'title' => 'Perfect',
            'artist' => 'Ed Sheeran',
            'artwork_url' => 'https://is1.mzstatic.com/image/600x600bb.jpg',
            'preview_url' => 'https://audio.example/preview.m4a',
            'duration' => 263.4,
            'synced_lyrics' => [
                ['time' => 12.5, 'text' => 'I found a love'],
                ['time' => 18.04, 'text' => 'for me'],
            ],
            'plain_lyrics' => ['I found a love', 'for me'],
        ]);
});

test('it still responds when the music services are unavailable', function () {
    Http::fake(['*' => Http::response(null, 500)]);

    $this->getJson(route('songs.lookup', ['title' => 'Unknown song']))
        ->assertOk()
        ->assertJson([
            'title' => 'Unknown song',
            'preview_url' => null,
            'synced_lyrics' => [],
            'plain_lyrics' => [],
        ]);
});

test('a song title is required', function () {
    $this->getJson(route('songs.lookup'))->assertJsonValidationErrors('title');
});

test('song details are fetched after the response when the song changes', function () {
    Bus::fake();
    $experience = DigitalExperience::factory()->create();

    $experience->update(['song_title' => 'Perfect', 'song_artist' => 'Ed Sheeran']);

    Bus::assertDispatchedAfterResponse(FetchSongDetails::class, fn (FetchSongDetails $job) => $job->experience->is($experience));
});

test('fetching song details saves the lyrics on the experience', function () {
    Http::fake([
        'itunes.apple.com/*' => Http::response(['results' => []]),
        'lrclib.net/api/get*' => Http::response([
            'syncedLyrics' => '[00:12.50] I found a love',
            'plainLyrics' => 'I found a love',
        ]),
    ]);
    $experience = DigitalExperience::factory()->create([
        'song_title' => 'Perfect',
        'song_artist' => 'Ed Sheeran',
    ]);

    FetchSongDetails::dispatchSync($experience);

    expect($experience->fresh()->song_details['synced_lyrics'])
        ->toBe([['time' => 12.5, 'text' => 'I found a love']]);
});
