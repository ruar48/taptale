<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A change an administrator made in the admin dashboard.
 *
 * @property int $id
 * @property int|null $user_id
 * @property string $action Route name, e.g. "admin.orders.refunds.store"
 * @property string $method
 * @property string $url
 * @property array<string, string>|null $subject Route parameters as they appeared in the URL (order reference, ids)
 * @property array<string, mixed>|null $changes Submitted values, without secrets or files
 * @property string|null $ip_address
 * @property Carbon $created_at
 */
#[Fillable(['user_id', 'action', 'method', 'url', 'subject', 'changes', 'ip_address'])]
class AuditLog extends Model
{
    public const UPDATED_AT = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'subject' => 'array',
            'changes' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
