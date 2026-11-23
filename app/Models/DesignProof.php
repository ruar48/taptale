<?php

namespace App\Models;

use App\Enums\ProofStatus;
use Carbon\CarbonInterface;
use Database\Factories\DesignProofFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property int|null $uploaded_by
 * @property int $version
 * @property string $disk
 * @property string $path
 * @property string|null $designer_notes
 * @property ProofStatus $status
 * @property string|null $customer_comment
 * @property Carbon|null $responded_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['uploaded_by', 'version', 'disk', 'path', 'designer_notes', 'status', 'customer_comment', 'responded_at'])]
class DesignProof extends Model
{
    /** @use HasFactory<DesignProofFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ProofStatus::class,
            'version' => 'integer',
            'responded_at' => 'datetime',
        ];
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
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Whether the customer still needs to respond to this proof.
     */
    public function isAwaitingResponse(): bool
    {
        return $this->status === ProofStatus::AwaitingResponse;
    }

    /**
     * When this proof is approved automatically if the customer has not
     * replied, or null when it is not waiting or auto-approval is off.
     */
    public function autoApprovesAt(): ?CarbonInterface
    {
        $hours = (int) config('taptale.proof_auto_approve_hours');

        if ($hours <= 0 || ! $this->isAwaitingResponse() || $this->created_at === null) {
            return null;
        }

        return $this->created_at->copy()->addHours($hours);
    }
}
