<?php

namespace App\Models;

use App\Enums\ActivityType;
use App\Enums\DesignMode;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Enums\ProofStatus;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $reference
 * @property int|null $user_id Null for walk-in and chat orders taken by the studio for a customer without an account
 * @property OrderChannel $channel
 * @property string|null $approval_token Secret in the approval link the studio shares with the customer
 * @property OrderStatus $status
 * @property int|null $category_id
 * @property int|null $product_id
 * @property string $product_name
 * @property string|null $template_name Design picked on older orders, before each product became its own design
 * @property list<array{id: int, group: string, group_label: string, name: string, price_modifier: int}> $selected_options
 * @property DesignMode $design_mode
 * @property array<string, mixed> $personalization
 * @property Carbon|null $preview_approved_at When the customer approved the design they made themselves. Approval is final
 * @property Carbon|null $design_submitted_at When the customer handed their photos and details to the studio to arrange
 * @property int $quantity
 * @property int $unit_price
 * @property int $subtotal
 * @property int $customization_fee
 * @property int $flowers_fee Charged once for putting the flowers on a memory page design that lacks them
 * @property int $delivery_fee
 * @property int $adjustment
 * @property string|null $adjustment_note
 * @property int|null $promo_code_id
 * @property string|null $promo_code Code as entered at checkout, kept if the code is later deleted
 * @property string|null $promo_identity The customer's inbox ({@see PromoCode::customerIdentity()}) when a code was used
 * @property int $discount Promo discount (centavos) on the items subtotal
 * @property int $total
 * @property string $customer_name
 * @property string $customer_email
 * @property string $customer_phone
 * @property string $address_line
 * @property string $city
 * @property string $province
 * @property string $postal_code
 * @property string|null $customer_notes
 * @property bool $is_gift Packing slip hides prices
 * @property string|null $gift_message
 * @property int|null $payment_method_id
 * @property string|null $courier
 * @property string|null $tracking_number
 * @property string|null $tracking_url
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[RouteKey('reference')]
#[Fillable([
    'channel', 'status', 'category_id', 'product_id', 'product_name', 'template_name',
    'selected_options', 'design_mode', 'personalization', 'preview_approved_at', 'design_submitted_at',
    'quantity', 'unit_price', 'subtotal', 'customization_fee', 'flowers_fee', 'delivery_fee', 'adjustment', 'adjustment_note', 'promo_code_id', 'promo_code', 'promo_identity', 'discount', 'total',
    'customer_name', 'customer_email', 'customer_phone', 'address_line', 'city', 'province', 'postal_code', 'customer_notes', 'is_gift', 'gift_message',
    'payment_method_id', 'courier', 'tracking_number', 'tracking_url',
])]
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory;

    /**
     * The model's default values for attributes.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'channel' => 'website',
    ];

    /**
     * Bootstrap the model and its traits.
     */
    protected static function booted(): void
    {
        static::creating(function (Order $order): void {
            $order->reference ??= static::generateReference();
        });

        /*
         * A cancelled order gives its promo code use back, so placing and
         * cancelling orders cannot use up a limited code. Reopening the
         * order takes the use again.
         */
        static::updated(function (Order $order): void {
            if ($order->promo_code_id === null || ! $order->wasChanged('status')) {
                return;
            }

            $wasCancelled = $order->getOriginal('status') === OrderStatus::Cancelled;
            $isCancelled = $order->status === OrderStatus::Cancelled;

            if ($isCancelled && ! $wasCancelled) {
                PromoCode::query()->whereKey($order->promo_code_id)->where('uses', '>', 0)->decrement('uses');
            } elseif ($wasCancelled && ! $isCancelled) {
                PromoCode::query()->whereKey($order->promo_code_id)->increment('uses');
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
            'channel' => OrderChannel::class,
            'status' => OrderStatus::class,
            'design_mode' => DesignMode::class,
            'selected_options' => 'array',
            'personalization' => 'array',
            'preview_approved_at' => 'datetime',
            'design_submitted_at' => 'datetime',
            'quantity' => 'integer',
            'unit_price' => 'integer',
            'subtotal' => 'integer',
            'customization_fee' => 'integer',
            'flowers_fee' => 'integer',
            'delivery_fee' => 'integer',
            'adjustment' => 'integer',
            'discount' => 'integer',
            'is_gift' => 'boolean',
            'total' => 'integer',
        ];
    }

    /**
     * Orders matching the admin list filters: a status and a search over the
     * reference, customer name and email.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function filtered(Builder $query, ?OrderStatus $status, string $search): void
    {
        $query
            ->when($status, fn (Builder $query) => $query->where('status', $status))
            ->when($search !== '', fn (Builder $query) => $query->where(fn (Builder $inner) => $inner
                ->where('reference', 'like', "%{$search}%")
                ->orWhere('customer_name', 'like', "%{$search}%")
                ->orWhere('customer_email', 'like', "%{$search}%")));
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
     * The private link where the customer can view and approve their design
     * without logging in, or null while the studio has not created one.
     */
    public function approvalUrl(): ?string
    {
        return $this->approval_token === null
            ? null
            : route('design-review.show', ['order' => $this, 'k' => $this->approval_token]);
    }

    /**
     * The private link that lets the customer fill in their website without
     * an account. It shares the approval key, so turning one off or issuing
     * a new one changes both.
     */
    public function websiteEditUrl(): ?string
    {
        $experience = $this->experience;

        return $this->approval_token === null || $experience === null
            ? null
            : route('website-edit.show', ['experience' => $experience, 'k' => $this->approval_token]);
    }

    /**
     * Whether the given key opens this order's approval link.
     */
    public function hasApprovalToken(mixed $key): bool
    {
        return is_string($key)
            && $key !== ''
            && $this->approval_token !== null
            && hash_equals($this->approval_token, $key);
    }

    /**
     * Create a new approval link. Any link shared before stops working.
     */
    public function issueApprovalToken(): void
    {
        $this->forceFill(['approval_token' => Str::random(40)])->save();
    }

    /**
     * Turn the approval link off.
     */
    public function revokeApprovalToken(): void
    {
        $this->forceFill(['approval_token' => null])->save();
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
     * @return BelongsTo<PaymentMethod, $this>
     */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    /**
     * The keychains in this order, in the order they were added.
     *
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class)->orderBy('id');
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
     * @return BelongsTo<PromoCode, $this>
     */
    public function promoCode(): BelongsTo
    {
        return $this->belongsTo(PromoCode::class);
    }

    /**
     * The customer's review of this order, if they left one.
     *
     * @return HasOne<Testimonial, $this>
     */
    public function review(): HasOne
    {
        return $this->hasOne(Testimonial::class);
    }

    /**
     * Customers can review an order once it has reached them.
     */
    public function isReviewable(): bool
    {
        return in_array($this->status, [OrderStatus::Shipped, OrderStatus::Completed], true);
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
     * Whether the customer can still finish the design from their order page,
     * by customizing it themselves or by sending their photos and details to
     * the studio. This ends when they approve it (approval is final), hand it
     * to the studio, or the studio sends a design proof.
     */
    public function isDesignEditableByCustomer(): bool
    {
        return $this->status->isOpen()
            && $this->preview_approved_at === null
            && $this->design_submitted_at === null
            && $this->latestProof === null;
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
     * on to "Pending", ready for production.
     */
    public function advanceAfterPayment(?User $actor = null): void
    {
        $this->load('payments');

        if (! $this->status->isPaymentStage()) {
            return;
        }

        if ($this->balanceDue() > 0) {
            $this->moveTo(OrderStatus::AwaitingPayment, $actor, 'A balance is still due.');

            return;
        }

        $this->moveTo(OrderStatus::PendingDesign, $actor);
    }

    /**
     * Recalculate the total after a fee or adjustment change.
     */
    public function recalculateTotal(): void
    {
        $this->total = max(0, $this->subtotal - $this->discount + $this->customization_fee + $this->flowers_fee + $this->delivery_fee + $this->adjustment);
    }

    /**
     * Move the order to a new status and record the change on the timeline.
     */
    public function moveTo(OrderStatus $status, ?User $actor = null, ?string $note = null): void
    {
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
