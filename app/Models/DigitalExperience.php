<?php

namespace App\Models;

use App\Enums\ExperienceTemplate;
use App\Enums\PhotoRainLayer;
use App\Jobs\FetchSongDetails;
use Database\Factories\DigitalExperienceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $order_id
 * @property int $user_id
 * @property string $code
 * @property ExperienceTemplate $template
 * @property string $title
 * @property string|null $subtitle
 * @property string|null $recipient_name
 * @property string|null $sender_name
 * @property string|null $message
 * @property string|null $quote
 * @property string|null $flowers_note
 * @property PhotoRainLayer $photo_rain_layer
 * @property string|null $event_date
 * @property string|null $video_url
 * @property string|null $music_url
 * @property string|null $song_title
 * @property string|null $song_artist
 * @property array{title: string, artist: string|null, artwork_url: string|null, preview_url: string|null, track_url: string|null, duration: float|null, synced_lyrics: list<array{time: float, text: string}>, plain_lyrics: list<string>}|null $song_details
 * @property string|null $audio_path
 * @property list<string>|null $photos
 * @property list<array{date?: string|null, title?: string|null, caption?: string|null, photo?: int|null}>|null $moments
 * @property string $theme
 * @property string|null $nfc_tag_uid
 * @property bool $is_published
 * @property int $view_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[RouteKey('code')]
#[Fillable([
    'template', 'title', 'subtitle', 'recipient_name', 'sender_name', 'message', 'quote', 'flowers_note',
    'photo_rain_layer', 'event_date', 'video_url', 'music_url', 'song_title', 'song_artist', 'photos', 'moments', 'theme',
    'nfc_tag_uid', 'is_published',
])]
class DigitalExperience extends Model
{
    /** @use HasFactory<DigitalExperienceFactory> */
    use HasFactory;

    /**
     * Maximum number of photos on one experience page.
     */
    public const MAX_PHOTOS = 24;

    /**
     * Maximum number of timeline / polaroid moments.
     */
    public const MAX_MOMENTS = 12;

    /**
     * Visual themes for the public experience page.
     *
     * @var list<string>
     */
    public const THEMES = ['crimson', 'rose', 'blush', 'plum', 'midnight', 'cream', 'sunset', 'sage', 'moonlit'];

    /**
     * Default attribute values, mirroring the database defaults.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'template' => 'classic',
        'theme' => 'blush',
        'photo_rain_layer' => 'front',
        'is_published' => false,
        'view_count' => 0,
    ];

    /**
     * Bootstrap the model and its traits.
     */
    protected static function booted(): void
    {
        static::creating(function (DigitalExperience $experience): void {
            $experience->code ??= static::generateCode();
        });

        static::saved(function (DigitalExperience $experience): void {
            if ($experience->wasChanged(['song_title', 'song_artist'])
                || ($experience->wasRecentlyCreated && filled($experience->song_title))) {
                FetchSongDetails::dispatchAfterResponse($experience);
            }
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'template' => ExperienceTemplate::class,
            'photo_rain_layer' => PhotoRainLayer::class,
            'photos' => 'array',
            'moments' => 'array',
            'song_details' => 'array',
            'is_published' => 'boolean',
            'view_count' => 'integer',
        ];
    }

    /**
     * Generate an unguessable public code for the experience URL.
     */
    public static function generateCode(): string
    {
        do {
            $code = Str::lower(Str::random(10));
        } while (static::where('code', $code)->exists());

        return $code;
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The public URL encoded in the QR code and written to NFC tags.
     */
    public function publicUrl(): string
    {
        return route('experiences.show', $this);
    }
}
