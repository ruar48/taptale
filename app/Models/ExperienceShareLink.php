<?php

namespace App\Models;

use Database\Factories\ExperienceShareLinkFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * A link that opens a memory page for anyone it is sent to, until it
 * expires. Made by a visitor who tapped the genuine tag.
 *
 * @property int $id
 * @property int $digital_experience_id
 * @property string $token
 * @property Carbon $expires_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['expires_at'])]
class ExperienceShareLink extends Model
{
    /** @use HasFactory<ExperienceShareLinkFactory> */
    use HasFactory;

    /**
     * Bootstrap the model and its traits.
     */
    protected static function booted(): void
    {
        static::creating(function (ExperienceShareLink $link): void {
            $link->token ??= Str::random(40);
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
            'expires_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<DigitalExperience, $this>
     */
    public function experience(): BelongsTo
    {
        return $this->belongsTo(DigitalExperience::class, 'digital_experience_id');
    }

    /**
     * Links that still open their page.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('expires_at', '>', now());
    }

    /**
     * The address to send to family and friends.
     */
    public function url(): string
    {
        return route('experiences.show', ['experience' => $this->experience, 's' => $this->token]);
    }
}
