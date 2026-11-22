<?php

namespace App\Models;

use App\Enums\ExpenseCategory;
use App\Enums\FinanceEntryType;
use App\Enums\FinancePeriod;
use Database\Factories\FinanceEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A manual money movement the owners record: capital put into the business
 * (puhunan), expenses, owner withdrawals, and income outside of orders.
 * Order sales are not recorded here; they come from verified payments.
 *
 * @property int $id
 * @property FinanceEntryType $type
 * @property ExpenseCategory|null $category
 * @property int $amount
 * @property string $description
 * @property Carbon $occurred_on
 * @property string|null $notes
 * @property int|null $recorded_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['type', 'category', 'amount', 'description', 'occurred_on', 'notes', 'recorded_by'])]
class FinanceEntry extends Model
{
    /** @use HasFactory<FinanceEntryFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => FinanceEntryType::class,
            'category' => ExpenseCategory::class,
            'amount' => 'integer',
            'occurred_on' => 'date',
        ];
    }

    /**
     * Entries in the given period, optionally of one type.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function filtered(Builder $query, FinancePeriod $period, ?FinanceEntryType $type = null): void
    {
        $start = $period->start();
        $end = $period->end();

        $query
            ->when($type, fn (Builder $query) => $query->where('type', $type))
            ->when($start, fn (Builder $query) => $query->where('occurred_on', '>=', $start->toDateString()))
            ->when($end, fn (Builder $query) => $query->where('occurred_on', '<=', $end->toDateTimeString()));
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
