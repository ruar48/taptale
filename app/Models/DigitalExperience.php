<?php

namespace App\Models;

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
 * @property string $title
 * @property string|null $subtitle
 * @property string|null $message
 * @property string|null $event_date
 * @property string|null $video_url
 * @property string|null $music_url
 * @property list<string>|null $photos
 * @property string $theme
 * @property string|null $nfc_tag_uid
 * @property bool $is_published
 * @property int $view_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[RouteKey('code')]
#[Fillable(['title', 'subtitle', 'message', 'event_date', 'video_url', 'music_url', 'photos', 'theme', 'nfc_tag_uid', 'is_published'])]
class DigitalExperience extends Model
{
    /** @use HasFactory<DigitalExperienceFactory> */
    use HasFactory;

    /**
     * Maximum number of photos on one experience page.
     */
    public const MAX_PHOTOS = 12;

    /**
     * Visual themes for the public experience page.
     *
     * @var list<string>
     */
    public const THEMES = ['blush', 'plum', 'cream', 'midnight'];

    /**
     * Bootstrap the model and its traits.
     */
    protected static function booted(): void
    {
        static::creating(function (DigitalExperience $experience): void {
            $experience->code ??= static::generateCode();
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
            'photos' => 'array',
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
