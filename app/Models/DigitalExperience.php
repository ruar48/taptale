<?php

namespace App\Models;

use App\Enums\ExperienceTemplate;
use App\Enums\FlowerRain;
use App\Enums\FlowerStyle;
use App\Enums\PhotoRainLayer;
use App\Jobs\FetchSongDetails;
use Database\Factories\DigitalExperienceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $order_id
 * @property int $user_id
 * @property string $code
 * @property string $access_key Secret carried by the NFC tag and QR code; without it the page is a 404
 * @property ExperienceTemplate $template
 * @property string $title
 * @property string|null $subtitle
 * @property string|null $recipient_name
 * @property string|null $sender_name
 * @property string|null $message
 * @property string|null $quote
 * @property string|null $flowers_note
 * @property FlowerStyle $flower_style The bouquet, or the color of the glowing garden flowers
 * @property FlowerRain $flower_rain What falls from the sky over the flowers
 * @property bool $flower_addon Flowers bought at checkout for a design that lacks them
 * @property PhotoRainLayer $photo_rain_layer
 * @property string|null $event_date
 * @property string|null $video_url
 * @property string|null $music_url
 * @property string|null $song_title
 * @property string|null $song_artist
 * @property string $song_ornament "none" or "hearts": decoration around the song heading
 * @property string $song_background "theme" or "hearts": backdrop of the song section
 * @property array{title: string, artist: string|null, artwork_url: string|null, preview_url: string|null, track_url: string|null, duration: float|null, synced_lyrics: list<array{time: float, text: string}>, plain_lyrics: list<string>}|null $song_details
 * @property string|null $audio_path
 * @property list<string>|null $photos
 * @property list<array{date?: string|null, title?: string|null, caption?: string|null, photo?: int|null}>|null $moments
 * @property list<array{id: string, type: string, position: int, title: string|null, text?: string|null, background: string|null, slots: list<array{photo: int|null, caption: string|null}>}>|null $custom_sections
 * @property string $theme
 * @property string|null $nfc_tag_uid
 * @property bool $is_published
 * @property Carbon|null $unlocks_at Before this moment visitors see a countdown instead of the page
 * @property int $view_count
 * @property int $heart_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[RouteKey('code')]
#[Fillable([
    'template', 'title', 'subtitle', 'recipient_name', 'sender_name', 'message', 'quote', 'flowers_note', 'flower_style', 'flower_rain', 'flower_addon',
    'photo_rain_layer', 'event_date', 'video_url', 'music_url', 'song_title', 'song_artist', 'song_ornament', 'song_background', 'photos', 'moments', 'custom_sections', 'theme',
    'nfc_tag_uid', 'is_published', 'unlocks_at',
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
     * Maximum number of extra sections the owner can add to one page.
     */
    public const MAX_CUSTOM_SECTIONS = 6;

    /**
     * Maximum number of photo slots in one extra section.
     */
    public const MAX_SECTION_SLOTS = 12;

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
        'flower_style' => 'bouquet',
        'flower_rain' => 'none',
        'flower_addon' => false,
        'photo_rain_layer' => 'front',
        'song_ornament' => 'none',
        'song_background' => 'theme',
        'is_published' => false,
        'view_count' => 0,
        'heart_count' => 0,
    ];

    /**
     * Bootstrap the model and its traits.
     */
    protected static function booted(): void
    {
        static::creating(function (DigitalExperience $experience): void {
            $experience->code ??= static::generateCode();
            $experience->access_key ??= Str::random(32);
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
            'flower_style' => FlowerStyle::class,
            'flower_rain' => FlowerRain::class,
            'flower_addon' => 'boolean',
            'photo_rain_layer' => PhotoRainLayer::class,
            'photos' => 'array',
            'moments' => 'array',
            'custom_sections' => 'array',
            'song_details' => 'array',
            'is_published' => 'boolean',
            'unlocks_at' => 'datetime',
            'view_count' => 'integer',
            'heart_count' => 'integer',
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
     * @return HasMany<ExperienceView, $this>
     */
    public function views(): HasMany
    {
        return $this->hasMany(ExperienceView::class);
    }

    /**
     * @return HasMany<ExperienceReply, $this>
     */
    public function replies(): HasMany
    {
        return $this->hasMany(ExperienceReply::class)->latest()->latest('id');
    }

    /**
     * Whether the given secret matches the one written into the tag / QR code.
     */
    public function hasAccessKey(string $key): bool
    {
        return $key !== '' && hash_equals((string) $this->access_key, $key);
    }

    /**
     * Whether the owner scheduled the page to open later than now.
     */
    public function isLocked(): bool
    {
        return $this->unlocks_at !== null && $this->unlocks_at->isFuture();
    }

    /**
     * Whether the page shows the blooming flowers: always on "A Bouquet For
     * You", and on any other design when the flowers were bought at checkout.
     */
    public function showsFlowers(): bool
    {
        return $this->template === ExperienceTemplate::DigitalBouquet || $this->flower_addon;
    }

    /**
     * Whether the page template is fixed because the keepsake was released.
     */
    public function isTemplateLocked(): bool
    {
        return $this->order?->status->locksPageTemplate() ?? false;
    }

    /**
     * The URL encoded in the QR code and written to NFC tags. It carries the
     * access key; the bare /t/{code} address alone opens nothing.
     */
    public function publicUrl(): string
    {
        return route('experiences.show', ['experience' => $this, 'k' => $this->access_key]);
    }
}
