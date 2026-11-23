<?php

namespace App\Models;

use App\Enums\DiscountType;
use App\Enums\OrderStatus;
use Database\Factories\PromoCodeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $code
 * @property string|null $description
 * @property DiscountType $discount_type
 * @property int $discount_value Percentage (1-100) or centavos, depending on the type
 * @property int $min_subtotal
 * @property int|null $max_uses Limit checked against {@see self::heldUses()}
 * @property int $uses Orders placed with the code, minus cancelled ones (shown to admins)
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['code', 'description', 'discount_type', 'discount_value', 'min_subtotal', 'max_uses', 'starts_at', 'ends_at', 'is_active'])]
class PromoCode extends Model
{
    /** @use HasFactory<PromoCodeFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'discount_type' => DiscountType::class,
            'discount_value' => 'integer',
            'min_subtotal' => 'integer',
            'max_uses' => 'integer',
            'uses' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Codes are stored and matched in upper case, so "love10" and "LOVE10"
     * are the same code.
     */
    public static function normalize(string $code): string
    {
        return mb_strtoupper(trim($code));
    }

    /**
     * Find a code by what the customer typed.
     */
    public static function findByCode(string $code): ?self
    {
        return static::query()->where('code', static::normalize($code))->first();
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Uses currently taken: orders that were paid (or are past payment),
     * plus unpaid orders placed within the hold window. An unpaid order
     * stops holding its use after that, so orders nobody pays cannot keep
     * a limited code away from real customers. Cancelled orders never count.
     */
    public function heldUses(): int
    {
        return $this->holdingOrders()->count();
    }

    /**
     * Orders that currently hold a use of the code (see {@see self::heldUses()}).
     *
     * @return HasMany<Order, $this>
     */
    private function holdingOrders(): HasMany
    {
        return $this->orders()
            ->where('status', '!=', OrderStatus::Cancelled)
            ->where(fn (Builder $query) => $query
                ->whereNotIn('status', OrderStatus::paymentStage())
                ->orWhere('created_at', '>=', now()->subHours((int) config('taptale.promo_hold_hours'))));
    }

    /**
     * The inbox an email address really reaches, used as the customer's
     * identity for one-use codes: lower case, without a "+tag", and for
     * Gmail without dots and with googlemail.com read as gmail.com. Many
     * accounts made from aliases of one inbox are then one customer.
     */
    public static function customerIdentity(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', mb_strtolower(trim($email)), 2), 2, '');
        $local = Str::before($local, '+');

        if (in_array($domain, ['gmail.com', 'googlemail.com'], true)) {
            $local = str_replace('.', '', $local);
            $domain = 'gmail.com';
        }

        return $local.'@'.$domain;
    }

    /**
     * A phone number reduced to its national digits, so every way of writing
     * one Philippine mobile number ("0917 555 0101", "+63 917 555 0101",
     * "+63 0917 555 0101", "0063 917 555 0101") becomes "9175550101".
     * Strips the international dialling prefix (00), then the country code
     * (63), then the trunk zero.
     */
    public static function phoneIdentity(string $phone): string
    {
        $digits = (string) preg_replace('/\D+/', '', $phone);

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '63') && strlen($digits) >= 11) {
            $digits = substr($digits, 2);
        }

        return ltrim($digits, '0');
    }

    /**
     * Whether an order holding a use of this code went to the same delivery
     * phone. Accounts on a catch-all email domain all reach one person, but
     * that person still gives one phone number for delivery.
     *
     * Only orders that hold a use count (paid, or unpaid and recent), so
     * someone who types a stranger's number into an order they never pay
     * cannot block that stranger from the code for long.
     */
    public function wasUsedWithPhone(?string $phone): bool
    {
        $identity = self::phoneIdentity((string) $phone);

        if (strlen($identity) < 7) {
            return false;
        }

        return $this->holdingOrders()
            ->pluck('customer_phone')
            ->contains(fn (?string $usedPhone): bool => self::phoneIdentity((string) $usedPhone) === $identity);
    }

    /**
     * Whether the customer, or another account behind the same inbox, already
     * has an order (not cancelled) with this code.
     */
    public function wasUsedBy(User $customer): bool
    {
        return $this->orders()
            ->where('status', '!=', OrderStatus::Cancelled)
            ->where(fn (Builder $query) => $query
                ->where('user_id', $customer->id)
                ->orWhere('promo_identity', self::customerIdentity($customer->email)))
            ->exists();
    }

    /**
     * Why this code cannot be used on an order with the given subtotal (by
     * the given customer, when known), or null when it can.
     */
    public function rejectionReason(int $subtotal, ?User $customer = null, ?string $phone = null): ?string
    {
        if (! $this->is_active
            || ($this->starts_at !== null && $this->starts_at->isFuture())
            || ($this->ends_at !== null && $this->ends_at->isPast())) {
            return 'This promo code is not active.';
        }

        if ($customer !== null && $this->wasUsedBy($customer)) {
            return 'You have already used this promo code.';
        }

        if ($this->wasUsedWithPhone($phone)) {
            return 'This promo code has already been used with this phone number.';
        }

        if ($this->max_uses !== null && $this->heldUses() >= $this->max_uses) {
            return 'This promo code has been fully used.';
        }

        if ($subtotal < $this->min_subtotal) {
            return 'This promo code needs a subtotal of at least '.config('taptale.currency_symbol').number_format($this->min_subtotal / 100, 2).'.';
        }

        return null;
    }

    /**
     * Discount (centavos) on the given items subtotal. Never more than the
     * subtotal itself.
     */
    public function discountFor(int $subtotal): int
    {
        $discount = match ($this->discount_type) {
            DiscountType::Percent => intdiv($subtotal * min(100, $this->discount_value), 100),
            DiscountType::Fixed => $this->discount_value,
        };

        return max(0, min($subtotal, $discount));
    }
}
