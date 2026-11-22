<?php

namespace App\Actions\Music;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * Looks up a song on two free, keyless public APIs: the iTunes Search API
 * (album artwork and a 30-second preview) and LRCLIB (time-synced lyrics).
 * Results are cached for a week and real misses for an hour; a miss caused
 * by a service failing is not cached. Visitor lookups that are not cached
 * share a site-wide budget per minute.
 */
class LookupSong
{
    /**
     * Uncached lookups the whole site may start per minute on behalf of
     * visitors. Each costs up to three calls to the music services; Apple
     * allows about twenty a minute per server, so staying under it keeps one
     * visitor from getting every customer's lookups blocked.
     */
    public const VISITOR_LOOKUPS_PER_MINUTE = 15;

    /**
     * Whether a music service failed (down, slow or refusing us) during the
     * current lookup; a miss caused by that is not cached.
     */
    private bool $upstreamFailed = false;

    /**
     * @return array{
     *     title: string,
     *     artist: string|null,
     *     artwork_url: string|null,
     *     preview_url: string|null,
     *     track_url: string|null,
     *     duration: float|null,
     *     synced_lyrics: list<array{time: float, text: string}>,
     *     plain_lyrics: list<string>,
     * }
     */
    public function handle(string $title, ?string $artist = null, bool $forVisitor = false): array
    {
        $cacheKey = 'song-lookup:'.md5(Str::lower(trim($title).'|'.trim((string) $artist)));

        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return $cached;
        }

        // Cached songs are always free; new ones share a site-wide budget.
        if ($forVisitor && ! RateLimiter::attempt('song-lookup-upstream', self::VISITOR_LOOKUPS_PER_MINUTE, fn (): bool => true)) {
            return $this->emptyDetails($title, $artist);
        }

        $this->upstreamFailed = false;

        $details = (function () use ($title, $artist): array {
            $track = $this->findTrack($title, $artist);
            $lyrics = $this->findLyrics(
                $track['title'] ?? $title,
                $track['artist'] ?? $artist,
                $track['duration'] ?? null,
            );

            return [
                'title' => $track['title'] ?? $title,
                'artist' => $track['artist'] ?? $artist,
                'artwork_url' => $track['artwork_url'] ?? null,
                'preview_url' => $track['preview_url'] ?? null,
                'track_url' => $track['track_url'] ?? null,
                'duration' => $track['duration'] ?? null,
                'synced_lyrics' => $this->parseLrc($lyrics['syncedLyrics'] ?? null),
                'plain_lyrics' => $this->splitLines($lyrics['plainLyrics'] ?? null),
            ];
        })();

        $found = $details['preview_url'] !== null || $details['synced_lyrics'] !== [] || $details['plain_lyrics'] !== [];

        // A miss because a service failed is not an answer: keep asking next
        // time. Real misses are retried within the hour.
        if ($found || ! $this->upstreamFailed) {
            Cache::put($cacheKey, $details, $found ? now()->addWeek() : now()->addHour());
        }

        return $details;
    }

    /**
     * The shape of a lookup that found nothing, without asking anyone.
     *
     * @return array{title: string, artist: string|null, artwork_url: null, preview_url: null, track_url: null, duration: null, synced_lyrics: list<never>, plain_lyrics: list<never>}
     */
    private function emptyDetails(string $title, ?string $artist): array
    {
        return [
            'title' => $title,
            'artist' => $artist,
            'artwork_url' => null,
            'preview_url' => null,
            'track_url' => null,
            'duration' => null,
            'synced_lyrics' => [],
            'plain_lyrics' => [],
        ];
    }

    /**
     * @return array{title: string, artist: string, artwork_url: string|null, preview_url: string|null, track_url: string|null, duration: float|null}|null
     */
    private function findTrack(string $title, ?string $artist): ?array
    {
        $response = $this->get('https://itunes.apple.com/search', [
            'term' => trim($title.' '.$artist),
            'entity' => 'song',
            'media' => 'music',
            'limit' => 1,
        ]);

        $result = $response?->json('results.0');

        if (! is_array($result)) {
            return null;
        }

        return [
            'title' => $result['trackName'] ?? $title,
            'artist' => $result['artistName'] ?? (string) $artist,
            'artwork_url' => isset($result['artworkUrl100'])
                ? str_replace('100x100bb', '600x600bb', $result['artworkUrl100'])
                : null,
            'preview_url' => $result['previewUrl'] ?? null,
            'track_url' => $result['trackViewUrl'] ?? null,
            'duration' => isset($result['trackTimeMillis']) ? $result['trackTimeMillis'] / 1000 : null,
        ];
    }

    /**
     * @return array{syncedLyrics?: string|null, plainLyrics?: string|null}|null
     */
    private function findLyrics(string $title, ?string $artist, ?float $duration): ?array
    {
        if (filled($artist)) {
            $exact = $this->get('https://lrclib.net/api/get', array_filter([
                'track_name' => $title,
                'artist_name' => $artist,
                'duration' => $duration !== null ? (int) round($duration) : null,
            ]));

            if ($exact?->successful() && is_array($exact->json())) {
                return $exact->json();
            }
        }

        $matches = $this->get('https://lrclib.net/api/search', [
            'q' => trim($title.' '.$artist),
        ])?->json();

        if (! is_array($matches)) {
            return null;
        }

        return collect($matches)->first(fn (mixed $match): bool => is_array($match) && filled($match['syncedLyrics'] ?? null))
            ?? collect($matches)->first(fn (mixed $match): bool => is_array($match) && filled($match['plainLyrics'] ?? null));
    }

    /**
     * @param  array<string, mixed>  $query
     */
    private function get(string $url, array $query): ?Response
    {
        try {
            $response = Http::acceptJson()
                ->withUserAgent(config('app.name').' memory pages')
                ->timeout(6)
                ->get($url, $query);
        } catch (ConnectionException) {
            $this->upstreamFailed = true;

            return null;
        }

        // Rate limited or broken (a 404 just means "no such song").
        if ($response->status() === 429 || $response->serverError()) {
            $this->upstreamFailed = true;
        }

        return $response;
    }

    /**
     * Turns "[01:23.45] line" LRC text into timed lines.
     *
     * @return list<array{time: float, text: string}>
     */
    private function parseLrc(?string $lrc): array
    {
        if (blank($lrc)) {
            return [];
        }

        $lines = [];

        foreach (preg_split('/\r\n|\r|\n/', $lrc) ?: [] as $row) {
            if (preg_match('/^\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\]\s*(.*)$/', trim($row), $match)) {
                $lines[] = [
                    'time' => round(((int) $match[1]) * 60 + (float) $match[2], 2),
                    'text' => trim($match[3]),
                ];
            }
        }

        return $lines;
    }

    /**
     * @return list<string>
     */
    private function splitLines(?string $text): array
    {
        return array_values(array_filter(
            array_map('trim', preg_split('/\r\n|\r|\n/', (string) $text) ?: []),
            fn (string $line): bool => $line !== '',
        ));
    }
}
