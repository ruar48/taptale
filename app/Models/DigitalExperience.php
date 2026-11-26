<?php

namespace App\Models;

use App\Enums\ExperienceTemplate;
use App\Enums\FlowerRain;
use App\Enums\FlowerStyle;
use App\Enums\PhotoRainLayer;
use App\Enums\PhotoRainSource;
use App\Jobs\FetchSongDetails;
use Database\Factories\DigitalExperienceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $order_id
 * @property int|null $user_id Null for the page of a walk-in or chat order, which has no customer account
 * @property string $code
 * @property string $access_key Secret written into the NFC tag (and the QR code until the tag is live)
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
 * @property PhotoRainSource $photo_rain_source Whether all the page's photos rain down or only those added to the rain
 * @property string|null $event_date
 * @property string|null $video_url
 * @property string|null $video_path A short video file uploaded to the page
 * @property string $video_frame The frame the video plays in (see VIDEO_FRAMES)
 * @property string $video_background The backdrop behind the video (see VIDEO_BACKGROUNDS)
 * @property string|null $music_url
 * @property string|null $song_title
 * @property string|null $song_artist
 * @property string $song_ornament "none" or "hearts": decoration around the song heading
 * @property string $song_background "theme" or "hearts": backdrop of the song section
 * @property array{title: string, artist: string|null, artwork_url: string|null, preview_url: string|null, track_url: string|null, duration: float|null, synced_lyrics: list<array{time: float, text: string}>, plain_lyrics: list<string>}|null $song_details
 * @property string|null $audio_path
 * @property list<string>|null $photos
 * @property list<string>|null $rain_photos Photos that rain down over the flowers, apart from the page photos
 * @property list<array{date?: string|null, title?: string|null, caption?: string|null, photo?: int|null}>|null $moments
 * @property list<array{id: string, type: string, position: int, title: string|null, text?: string|null, background: string|null, slots: list<array{photo: int|null, caption: string|null}>}>|null $custom_sections
 * @property array<string, list<int|null>>|null $photo_frames The photo the owner put in each frame of the page design's sections (see PHOTO_FRAMES)
 * @property string $theme
 * @property string|null $nfc_tag_uid Chip ID of the genuine tag, saved by an admin or on its first mirrored tap
 * @property string|null $slug Readable address made from the title, e.g. zen-and-megi
 * @property int|null $nfc_tap_counter Last tap count the genuine tag reported; once set, only that tag opens the page through the tag link
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
    'photo_rain_layer', 'photo_rain_source', 'event_date', 'video_url', 'video_path', 'video_frame', 'video_background', 'music_url', 'song_title', 'song_artist', 'song_ornament', 'song_background', 'photos', 'rain_photos', 'moments', 'custom_sections', 'photo_frames', 'theme',
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
     * Maximum number of photos that rain down over the flowers.
     */
    public const MAX_RAIN_PHOTOS = 12;

    /**
     * Frames the page video can play in.
     *
     * @var list<string>
     */
    public const VIDEO_FRAMES = ['plain', 'polaroid', 'film', 'tv', 'hearts', 'cinema', 'phone'];

    /**
     * Backdrops behind the page video: the page theme or a designed scene.
     *
     * @var list<string>
     */
    public const VIDEO_BACKGROUNDS = ['theme', 'theater', 'starry', 'hearts', 'sunset', 'retro', 'confetti'];

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
     * Sections of the page designs with their own photo frames, and the most
     * frames each one shows (mirrors photo-frames.ts).
     *
     * @var array<string, int>
     */
    public const PHOTO_FRAMES = [
        'hero_photo' => 1,
        'note' => 1,
        'letter_card' => 2,
        'letter_paper' => 1,
        'player' => 1,
        'film_strip' => 6,
        'scrapbook' => 6,
        'polaroid_wall' => 12,
    ];

    /**
     * Visual themes for the public experience page.
     *
     * @var list<string>
     */
    public const THEMES = ['crimson', 'rose', 'blush', 'plum', 'midnight', 'cream', 'sunset', 'sage', 'moonlit'];

    /**
     * Placeholder at the end of the tag link that the tag's UID + counter
     * mirror overwrites on every tap: 14 hex digits of chip ID, "x", and a
     * 6 hex digit tap count.
     */
    public const TAG_MIRROR_PLACEHOLDER = '00000000000000x000000';

    /**
     * How many days a share link can stay open. There is no lifetime link,
     * so a lost keychain is replaced by ordering a new one.
     *
     * @var list<int>
     */
    public const SHARE_LINK_DAYS = [1, 3, 7, 14, 30];

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
        'video_frame' => 'plain',
        'video_background' => 'theme',
        'photo_rain_layer' => 'front',
        'photo_rain_source' => 'all',
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

        // The readable address follows the page title.
        static::saving(function (DigitalExperience $experience): void {
            if ($experience->slug === null || $experience->isDirty('title')) {
                $experience->slug = static::uniqueSlug((string) $experience->title, $experience->id);
            }
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
            'photo_rain_source' => PhotoRainSource::class,
            'photos' => 'array',
            'rain_photos' => 'array',
            'moments' => 'array',
            'custom_sections' => 'array',
            'photo_frames' => 'array',
            'song_details' => 'array',
            'is_published' => 'boolean',
            'unlocks_at' => 'datetime',
            'nfc_tap_counter' => 'integer',
            'view_count' => 'integer',
            'heart_count' => 'integer',
        ];
    }

    /**
     * A readable address made from the page title, e.g. "Zen & Megi" becomes
     * "zen-and-megi", with "-2", "-3"… added when another page has it. It is
     * only an address: the page still opens only for those allowed to see it.
     */
    public static function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::limit(Str::slug(str_replace('&', ' and ', $title)), 70, '');
        $base = trim($base, '-') !== '' ? trim($base, '-') : 'memory';
        $slug = $base;
        $suffix = 2;

        while (static::query()
            ->when($ignoreId !== null, fn (Builder $query) => $query->whereKeyNot($ignoreId))
            ->where(fn (Builder $query) => $query->where('slug', $slug)->orWhere('code', $slug))
            ->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    /**
     * Pages open by their readable slug or by their random code (the code is
     * what tags and earlier links carry).
     */
    public function resolveRouteBinding($value, $field = null): ?self
    {
        if ($field !== null) {
            return parent::resolveRouteBinding($value, $field);
        }

        return static::query()->where('code', $value)->first()
            ?? static::query()->where('slug', $value)->first();
    }

    /**
     * The readable address of the page, falling back to its code.
     */
    public function readableKey(): string
    {
        return $this->slug ?? $this->code;
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
     * Photo frames of the page design's sections, keeping only known
     * sections and frames, with each photo moved to its new position (or
     * emptied when the photo is gone).
     *
     * @param  callable(int): (int|null)  $newIndex
     * @return array<string, list<int|null>>
     */
    public static function photoFramesFrom(mixed $frames, callable $newIndex): array
    {
        if (! is_array($frames)) {
            return [];
        }

        $kept = [];

        foreach (self::PHOTO_FRAMES as $section => $count) {
            if (! is_array($frames[$section] ?? null)) {
                continue;
            }

            $kept[$section] = array_map(
                fn (mixed $photo): ?int => is_numeric($photo) ? $newIndex((int) $photo) : null,
                array_slice(array_values($frames[$section]), 0, $count),
            );
        }

        return $kept;
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
     * @return HasMany<ExperienceShareLink, $this>
     */
    public function shareLinks(): HasMany
    {
        return $this->hasMany(ExperienceShareLink::class);
    }

    /**
     * @return HasMany<ExperienceReply, $this>
     */
    public function replies(): HasMany
    {
        return $this->hasMany(ExperienceReply::class)->latest()->latest('id');
    }

    /**
     * Whether the given secret matches the one written into the NFC tag.
     */
    public function hasAccessKey(string $key): bool
    {
        return $key !== '' && hash_equals((string) $this->access_key, $key);
    }

    /**
     * The share link with the given token, while it still opens the page.
     */
    public function activeShareLink(string $token): ?ExperienceShareLink
    {
        if ($token === '') {
            return null;
        }

        return $this->shareLinks()->active()->where('token', $token)->first();
    }

    /**
     * Whether a tap with the tag link came from the genuine Taptale tag.
     *
     * Tags are programmed with NTAG 21x UID + counter mirroring, so every tap
     * fills "m" with the chip ID and tap count. The tap is accepted when the
     * chip ID matches the registered one (the first mirrored tap registers
     * it) and the count went up since the last tap; a copied tag sends a
     * different chip ID or replays an old count. Once the genuine tag has
     * been tapped, a link without the mirror is refused as well, so writing
     * the link onto another tag does not work. Tags programmed before
     * mirroring keep working until then.
     */
    public function acceptsTap(mixed $mirror): bool
    {
        if ($mirror === null) {
            return $this->nfc_tap_counter === null;
        }

        if (! is_string($mirror) || preg_match('/^([0-9A-F]{14})x([0-9A-F]{6})$/i', $mirror, $matches) !== 1) {
            return false;
        }

        $chipId = Str::upper($matches[1]);
        $tapCount = (int) hexdec($matches[2]);

        if ($chipId === str_repeat('0', 14)) {
            return false;
        }

        if (filled($this->nfc_tag_uid)) {
            if (static::normalizeTagUid($this->nfc_tag_uid) !== $chipId) {
                return false;
            }

            $tagUid = $this->nfc_tag_uid;
        } else {
            $tagUid = implode(':', str_split($chipId, 2));

            if (static::query()->whereKeyNot($this->id)->where('nfc_tag_uid', $tagUid)->exists()) {
                return false;
            }
        }

        $accepted = static::query()
            ->whereKey($this->id)
            ->where(fn (Builder $query) => $query->whereNull('nfc_tap_counter')->orWhere('nfc_tap_counter', '<', $tapCount))
            ->update(['nfc_tag_uid' => $tagUid, 'nfc_tap_counter' => $tapCount]) === 1;

        if ($accepted) {
            $this->forceFill(['nfc_tag_uid' => $tagUid, 'nfc_tap_counter' => $tapCount])->syncOriginal();
        }

        return $accepted;
    }

    /**
     * A tag chip ID in bare uppercase hex, whatever separators it was typed with.
     */
    public static function normalizeTagUid(string $uid): string
    {
        return Str::upper((string) preg_replace('/[^0-9A-F]/i', '', $uid));
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
     * The page address for the owner and admins, who can always open it.
     * It opens nothing for anyone else.
     */
    public function publicUrl(): string
    {
        return route('experiences.show', $this->readableKey());
    }

    /**
     * The link in the QR code. It carries the access key without the tag's
     * mirror, so it opens the page only until the genuine tag is first
     * tapped: forever on a QR keepsake, never once a keychain's tag is live
     * (a printed QR code cannot replace a lost keychain).
     */
    public function qrCodeUrl(): string
    {
        return route('experiences.show', ['experience' => $this, 'k' => $this->access_key]);
    }

    /**
     * Whether the genuine tag has been tapped, so only it opens the page
     * through the tag link and copies of it are refused.
     */
    public function isTagCheckActive(): bool
    {
        return $this->nfc_tap_counter !== null;
    }

    /**
     * The link to program into the NFC tag. The mirror placeholder at its end
     * is overwritten with the tag's chip ID and tap count on every tap, which
     * proves the tap came from the genuine tag.
     */
    public function tagUrl(): string
    {
        return route('experiences.show', [
            'experience' => $this,
            'k' => $this->access_key,
            'm' => self::TAG_MIRROR_PLACEHOLDER,
        ]);
    }
}
