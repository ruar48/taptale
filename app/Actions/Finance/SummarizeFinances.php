<?php

namespace App\Actions\Finance;

use App\Enums\ExpenseCategory;
use App\Enums\FinanceEntryType;
use App\Enums\FinancePeriod;
use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Models\FinanceEntry;
use App\Models\Payment;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Builds the owner's money picture from two sources: verified order payments
 * (sales, net of refunds) and the manual finance ledger (capital, expenses,
 * withdrawals and other income). All amounts are in centavos.
 *
 * A payment counts on the day it was verified, falling back to when it was
 * submitted for rows without a review time.
 */
class SummarizeFinances
{
    /**
     * Number of months shown in the trend chart, including the current one.
     */
    public const TREND_MONTHS = 12;

    /**
     * @return array{
     *     overview: array{capital: int, withdrawals: int, sales: int, other_income: int, expenses: int, net_profit: int, cash_on_hand: int, recovered_percent: int|null, left_to_recover: int},
     *     period: array{sales: int, other_income: int, income: int, expenses: int, net_profit: int, margin_percent: int|null},
     *     trend: list<array{month: string, income: int, expenses: int, net_profit: int}>,
     *     expense_breakdown: list<array{category: string, label: string, amount: int}>
     * }
     */
    public function handle(FinancePeriod $period): array
    {
        return [
            'overview' => $this->overview(),
            'period' => $this->periodTotals($period->start(), $period->end()),
            'trend' => $this->trend(),
            'expense_breakdown' => $this->expenseBreakdown($period->start(), $period->end()),
        ];
    }

    /**
     * All-time position: how much was invested and how much of it has come back.
     *
     * @return array{capital: int, withdrawals: int, sales: int, other_income: int, expenses: int, net_profit: int, cash_on_hand: int, recovered_percent: int|null, left_to_recover: int}
     */
    private function overview(): array
    {
        $entries = $this->entryTotals(null, null);
        $sales = $this->netSales(null, null);

        $capital = $entries[FinanceEntryType::Capital->value];
        $withdrawals = $entries[FinanceEntryType::Withdrawal->value];
        $otherIncome = $entries[FinanceEntryType::Income->value];
        $expenses = $entries[FinanceEntryType::Expense->value];
        $netProfit = $sales + $otherIncome - $expenses;

        return [
            'capital' => $capital,
            'withdrawals' => $withdrawals,
            'sales' => $sales,
            'other_income' => $otherIncome,
            'expenses' => $expenses,
            'net_profit' => $netProfit,
            'cash_on_hand' => $capital + $netProfit - $withdrawals,
            'recovered_percent' => $capital > 0 ? (int) floor(max(0, $netProfit) * 100 / $capital) : null,
            'left_to_recover' => max(0, $capital - $netProfit),
        ];
    }

    /**
     * Profit and loss for the selected period.
     *
     * @return array{sales: int, other_income: int, income: int, expenses: int, net_profit: int, margin_percent: int|null}
     */
    private function periodTotals(?CarbonInterface $from, ?CarbonInterface $until): array
    {
        $entries = $this->entryTotals($from, $until);
        $sales = $this->netSales($from, $until);
        $otherIncome = $entries[FinanceEntryType::Income->value];
        $expenses = $entries[FinanceEntryType::Expense->value];
        $income = $sales + $otherIncome;
        $netProfit = $income - $expenses;

        return [
            'sales' => $sales,
            'other_income' => $otherIncome,
            'income' => $income,
            'expenses' => $expenses,
            'net_profit' => $netProfit,
            'margin_percent' => $income > 0 ? (int) round($netProfit * 100 / $income) : null,
        ];
    }

    /**
     * Money in versus expenses for each of the last twelve months, oldest first.
     *
     * @return list<array{month: string, income: int, expenses: int, net_profit: int}>
     */
    private function trend(): array
    {
        $start = now()->startOfMonth()->subMonthsNoOverflow(self::TREND_MONTHS - 1);

        $months = [];

        for ($month = $start; $month->lte(now()); $month = $month->addMonthNoOverflow()) {
            $months[$month->format('Y-m')] = ['month' => $month->format('Y-m'), 'income' => 0, 'expenses' => 0, 'net_profit' => 0];
        }

        $this->verifiedPayments($start, null)
            ->toBase()
            ->selectRaw($this->monthOf('coalesce(reviewed_at, created_at)').' as month_key, kind, sum(amount) as total')
            ->groupBy('month_key', 'kind')
            ->get()
            ->each(function (object $row) use (&$months): void {
                if (isset($months[$row->month_key])) {
                    $months[$row->month_key]['income'] += $row->kind === PaymentKind::Refund->value ? -(int) $row->total : (int) $row->total;
                }
            });

        FinanceEntry::query()
            ->whereIn('type', [FinanceEntryType::Income, FinanceEntryType::Expense])
            ->where('occurred_on', '>=', $start->toDateString())
            ->toBase()
            ->selectRaw($this->monthOf('occurred_on').' as month_key, type, sum(amount) as total')
            ->groupBy('month_key', 'type')
            ->get()
            ->each(function (object $row) use (&$months): void {
                if (isset($months[$row->month_key])) {
                    $months[$row->month_key][$row->type === FinanceEntryType::Expense->value ? 'expenses' : 'income'] += (int) $row->total;
                }
            });

        return array_values(array_map(function (array $month): array {
            $month['net_profit'] = $month['income'] - $month['expenses'];

            return $month;
        }, $months));
    }

    /**
     * Expenses in the period grouped by category, largest first.
     *
     * @return list<array{category: string, label: string, amount: int}>
     */
    private function expenseBreakdown(?CarbonInterface $from, ?CarbonInterface $until): array
    {
        return $this->entriesBetween($from, $until)
            ->where('type', FinanceEntryType::Expense)
            ->toBase()
            ->selectRaw('category, sum(amount) as total')
            ->groupBy('category')
            ->orderByDesc('total')
            ->get()
            ->map(function (object $row): array {
                $category = ExpenseCategory::tryFrom((string) $row->category) ?? ExpenseCategory::Other;

                return ['category' => $category->value, 'label' => $category->label(), 'amount' => (int) $row->total];
            })
            ->all();
    }

    /**
     * Ledger totals per entry type, with every type present.
     *
     * @return array<string, int>
     */
    private function entryTotals(?CarbonInterface $from, ?CarbonInterface $until): array
    {
        $totals = $this->entriesBetween($from, $until)
            ->toBase()
            ->selectRaw('type, sum(amount) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        return collect(FinanceEntryType::cases())
            ->mapWithKeys(fn (FinanceEntryType $type): array => [$type->value => (int) ($totals[$type->value] ?? 0)])
            ->all();
    }

    /**
     * Verified order payments minus verified refunds.
     */
    private function netSales(?CarbonInterface $from, ?CarbonInterface $until): int
    {
        $totals = $this->verifiedPayments($from, $until)
            ->toBase()
            ->selectRaw('kind, sum(amount) as total')
            ->groupBy('kind')
            ->pluck('total', 'kind');

        return (int) ($totals[PaymentKind::Payment->value] ?? 0) - (int) ($totals[PaymentKind::Refund->value] ?? 0);
    }

    /**
     * @return Builder<Payment>
     */
    private function verifiedPayments(?CarbonInterface $from, ?CarbonInterface $until): Builder
    {
        return Payment::query()
            ->where('status', PaymentStatus::Verified)
            ->when($from, fn (Builder $query) => $query->whereRaw('coalesce(reviewed_at, created_at) >= ?', [$from]))
            ->when($until, fn (Builder $query) => $query->whereRaw('coalesce(reviewed_at, created_at) <= ?', [$until]));
    }

    /**
     * SQL expression giving the "YYYY-MM" month of a date column, so monthly
     * totals are summed by the database instead of loading every row.
     */
    private function monthOf(string $column): string
    {
        return match (DB::getDriverName()) {
            'sqlite' => "strftime('%Y-%m', {$column})",
            default => "date_format({$column}, '%Y-%m')",
        };
    }

    /**
     * @return Builder<FinanceEntry>
     */
    private function entriesBetween(?CarbonInterface $from, ?CarbonInterface $until): Builder
    {
        return FinanceEntry::query()
            ->when($from, fn (Builder $query) => $query->where('occurred_on', '>=', $from->toDateString()))
            ->when($until, fn (Builder $query) => $query->where('occurred_on', '<=', $until->toDateTimeString()));
    }
}
