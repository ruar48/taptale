<?php

namespace App\Models;

use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use Database\Factories\PaymentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property int|null $payment_method_id
 * @property PaymentKind $kind
 * @property PaymentStatus $status
 * @property int $amount
 * @property string|null $reference_number
 * @property string|null $gateway_checkout_id
 * @property string|null $gateway_payment_id
 * @property string|null $checkout_url
 * @property string|null $qr_code
 * @property Carbon|null $expires_at
 * @property string|null $proof_disk
 * @property string|null $proof_path
 * @property string|null $notes
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property string|null $review_notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'payment_method_id', 'kind', 'status', 'amount', 'reference_number', 'proof_disk', 'proof_path',
    'notes', 'reviewed_by', 'reviewed_at', 'review_notes', 'gateway_checkout_id', 'gateway_payment_id', 'checkout_url',
    'qr_code', 'expires_at',
])]
class Payment extends Model
{
    /** @use HasFactory<PaymentFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => PaymentKind::class,
            'status' => PaymentStatus::class,
            'amount' => 'integer',
            'reviewed_at' => 'datetime',
            'expires_at' => 'datetime',
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
     * @return BelongsTo<PaymentMethod, $this>
     */
    public function method(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
