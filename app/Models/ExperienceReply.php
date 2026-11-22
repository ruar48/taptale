<?php

namespace App\Models;

use Database\Factories\ExperienceReplyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A private note the recipient leaves on a memory page for its owner.
 *
 * @property int $id
 * @property int $digital_experience_id
 * @property string|null $name
 * @property string $message
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'message'])]
class ExperienceReply extends Model
{
    /** @use HasFactory<ExperienceReplyFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<DigitalExperience, $this>
     */
    public function experience(): BelongsTo
    {
        return $this->belongsTo(DigitalExperience::class, 'digital_experience_id');
    }
}
