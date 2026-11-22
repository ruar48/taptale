<?php

namespace App\Models;

use App\Enums\ActivityType;
use App\Enums\DesignMode;
use App\Enums\OrderStatus;
use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Enums\ProofStatus;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * @property int $id
 * @property string $reference
 * @property int $user_id
 * @property OrderStatus $status
 * @property int|null $category_id
 * @property int|null $product_id
 * @property int|null $template_id
 * @property string $product_name
 * @property string|null $template_name
 * @property list<array{id: int, group: string, group_label: string, name: string, price_modifier: int}> $selected_options
 * @property DesignMode $design_mode
 * @property array<string, mixed> $personalization
 * @property Carbon|null $preview_approved_at
 * @property int $quantity
 * @property int $unit_price
 * @property int $subtotal
 * @property int $customization_fee
 * @property int $delivery_fee
 * @property int $adjustment
 * @property string|null $adjustment_note
 * @property int $total
 * @property string $customer_name
 * @property string $customer_email
 * @property string $customer_phone
 * @property string $address_line
 * @property string $city
 * @property string $province
 * @property string $postal_code
 * @property string|null $customer_notes
 * @property int|null $payment_method_id
 * @property string|null $courier
 * @property string|null $tracking_number
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[RouteKey('reference')]
#[Fillable([
    'status', 'category_id', 'product_id', 'template_id', 'product_name', 'template_name',
    'selected_options', 'design_mode', 'personalization', 'preview_approved_at',
    'quantity', 'unit_price', 'subtotal', 'customization_fee', 'delivery_fee', 'adjustment', 'adjustment_note', 'total',
    'customer_name', 'customer_email', 'customer_phone', 'address_line', 'city', 'province', 'postal_code', 'customer_notes',
    'payment_method_id', 'courier', 'tracking_number',
])]
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory;

    /**
     * Bootstrap the model and its traits.
     */
    protected static function booted(): void
    {
        static::creating(function (Order $order): void {
            $order->reference ??= static::generateReference();
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
            'status' => OrderStatus::class,
            'design_mode' => DesignMode::class,
            'selected_options' => 'array',
            'personalization' => 'array',
            'preview_approved_at' => 'datetime',
            'quantity' => 'integer',
            'unit_price' => 'integer',
            'subtotal' => 'integer',
            'customization_fee' => 'integer',
            'delivery_fee' => 'integer',
            'adjustment' => 'integer',
            'total' => 'integer',
        ];
    }

    /**
     * Generate a unique, human friendly order reference such as "TT-2611-8KD3QZ".
     */
    public static function generateReference(): string
    {
        do {
            $reference = 'TT-'.now()->format('ym').'-'.Str::upper(Str::random(6));
        } while (static::where('reference', $reference)->exists());

        return $reference;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return BelongsTo<Template, $this>
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(Template::class);
    }

    /**
     * @return BelongsTo<PaymentMethod, $this>
     */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    /**
     * @return HasMany<OrderFile, $this>
     */
    public function files(): HasMany
    {
        return $this->hasMany(OrderFile::class)->orderBy('id');
    }

    /**
     * @return HasMany<DesignProof, $this>
     */
    public function proofs(): HasMany
    {
        return $this->hasMany(DesignProof::class)->orderByDesc('version');
    }

    /**
     * @return HasOne<DesignProof, $this>
     */
    public function latestProof(): HasOne
    {
        return $this->hasOne(DesignProof::class)->latestOfMany('version');
    }

    /**
     * @return HasMany<OrderActivity, $this>
     */
    public function activities(): HasMany
    {
        return $this->hasMany(OrderActivity::class)->orderByDesc('created_at')->orderByDesc('id');
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderByDesc('created_at')->orderByDesc('id');
    }

    /**
     * @return HasOne<DigitalExperience, $this>
     */
    public function experience(): HasOne
    {
        return $this->hasOne(DigitalExperience::class);
    }

    /**
     * Whether the design approval required for production has been recorded.
     *
     * When Taptale has sent a proof, the newest proof must be approved. When
     * no proof exists, a self-customized order is approved by the customer
     * approving their live preview at checkout.
     */
    public function isDesignApproved(): bool
    {
        $latestProof = $this->latestProof;

        if ($latestProof !== null) {
            return $latestProof->status === ProofStatus::Approved;
        }

        return $this->design_mode === DesignMode::SelfCustomized
            && $this->preview_approved_at !== null;
    }

    /**
     * Net amount received: verified payments minus verified refunds.
     */
    public function amountPaid(): int
    {
        return (int) $this->payments
            ->where('status', PaymentStatus::Verified)
            ->sum(fn (Payment $payment): int => $payment->kind === PaymentKind::Refund ? -$payment->amount : $payment->amount);
    }

    /**
     * Amount still owed by the customer.
     */
    public function balanceDue(): int
    {
        return max(0, $this->total - $this->amountPaid());
    }

    /**
     * After a payment is verified, move an order that was waiting on payment
     * forward: back to "Awaiting Payment" while a balance remains, otherwise
     * on to design (or straight to production when the design is approved).
     *
     * @throws ValidationException
     */
    public function advanceAfterPayment(?User $actor = null): void
    {
        $this->load(['payments', 'latestProof']);

        $isAwaitingPayment = in_array($this->status, [OrderStatus::PendingOrder, OrderStatus::AwaitingPayment, OrderStatus::PaymentVerification], true);

        if (! $isAwaitingPayment) {
            return;
        }

        if ($this->balanceDue() > 0) {
            $this->moveTo(OrderStatus::AwaitingPayment, $actor, 'A balance is still due.');

            return;
        }

        $this->moveTo($this->isDesignApproved() ? OrderStatus::DesignApproved : OrderStatus::PendingDesign, $actor);
    }

    /**
     * Recalculate the total after a fee or adjustment change.
     */
    public function recalculateTotal(): void
    {
        $this->total = max(0, $this->subtotal + $this->customization_fee + $this->delivery_fee + $this->adjustment);
    }

    /**
     * Move the order to a new status, enforcing the design approval gate,
     * and record the change on the timeline.
     *
     * @throws ValidationException
     */
    public function moveTo(OrderStatus $status, ?User $actor = null, ?string $note = null): void
    {
        if ($status->requiresDesignApproval() && ! $this->isDesignApproved()) {
            throw ValidationException::withMessages([
                'status' => 'This order cannot move to "'.$status->label().'" until the customer has approved the design.',
            ]);
        }

        if ($this->status === $status) {
            return;
        }

        $this->update(['status' => $status]);

        $this->recordActivity(ActivityType::StatusChanged, $note, $actor, status: $status);
    }

    /**
     * Add an entry to the order timeline.
     */
    public function recordActivity(
        ActivityType $type,
        ?string $body = null,
        ?User $actor = null,
        bool $internal = false,
        ?OrderStatus $status = null,
    ): OrderActivity {
        return $this->activities()->create([
            'type' => $type,
            'body' => $body,
            'user_id' => $actor?->id,
            'is_internal' => $internal,
            'status' => $status ?? $this->status,
        ]);
    }

    /**
     * Next version number for a design proof.
     */
    public function nextProofVersion(): int
    {
        return ((int) $this->proofs()->max('version')) + 1;
    }
}
