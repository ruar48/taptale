<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One tap or scan of a memory page, recorded once per visitor session.
 *
 * @property int $id
 * @property int $digital_experience_id
 * @property string $device "mobile" or "desktop"
 * @property Carbon $created_at
 */
#[Fillable(['device'])]
class ExperienceView extends Model
{
    public const UPDATED_AT = null;

    /**
     * @return BelongsTo<DigitalExperience, $this>
     */
    public function experience(): BelongsTo
    {
        return $this->belongsTo(DigitalExperience::class, 'digital_experience_id');
    }
}
