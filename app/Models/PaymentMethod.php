<?php

namespace App\Models;

use Database\Factories\PaymentMethodFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $code
 * @property string $driver
 * @property string|null $account_name
 * @property string|null $account_number
 * @property string|null $instructions
 * @property bool $is_active
 * @property int $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'code', 'driver', 'account_name', 'account_number', 'instructions', 'is_active', 'sort_order'])]
class PaymentMethod extends Model
{
    /** @use HasFactory<PaymentMethodFactory> */
    use HasFactory;

    /**
     * Payment drivers. "manual" methods are verified by an administrator.
     * "paymongo" sends the customer to PayMongo's hosted checkout, while
     * "paymongo_qrph" shows a PayMongo QR Ph code on a Taptale-branded page.
     * Both are confirmed automatically once PayMongo reports them paid.
     * "cod" means the customer pays the courier in cash on delivery, so the
     * order skips the payment step and the team records the cash later.
     *
     * @var list<string>
     */
    public const DRIVERS = ['manual', 'paymongo', 'paymongo_qrph', 'cod'];

    /**
     * Whether customers pay this method online through PayMongo.
     */
    public function isPayMongo(): bool
    {
        return in_array($this->driver, ['paymongo', 'paymongo_qrph'], true);
    }

    /**
     * Whether customers pay the courier in cash when the order arrives.
     */
    public function isCashOnDelivery(): bool
    {
        return $this->driver === 'cod';
    }

    /**
     * Whether customers scan a QR Ph code on Taptale's own payment page.
     */
    public function usesTaptaleQr(): bool
    {
        return $this->driver === 'paymongo_qrph';
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Only methods customers can choose, in display order.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true)->orderBy('sort_order')->orderBy('id');
    }
}
