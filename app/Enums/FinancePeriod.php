<?php

namespace App\Enums;

use Carbon\CarbonInterface;

enum FinancePeriod: string
{
    case ThisMonth = 'this_month';
    case LastMonth = 'last_month';
    case ThisYear = 'this_year';
    case AllTime = 'all';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::ThisMonth => 'This month',
            self::LastMonth => 'Last month',
            self::ThisYear => 'This year',
            self::AllTime => 'All time',
        };
    }

    /**
     * The first moment of the period, or null when it has no start.
     */
    public function start(): ?CarbonInterface
    {
        return match ($this) {
            self::ThisMonth => now()->startOfMonth(),
            self::LastMonth => now()->subMonthNoOverflow()->startOfMonth(),
            self::ThisYear => now()->startOfYear(),
            self::AllTime => null,
        };
    }

    /**
     * The last moment of the period, or null when it runs until now.
     */
    public function end(): ?CarbonInterface
    {
        return match ($this) {
            self::LastMonth => now()->subMonthNoOverflow()->endOfMonth(),
            default => null,
        };
    }

    /**
     * Options for filter controls.
     *
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $period): array => [
            'value' => $period->value,
            'label' => $period->label(),
        ], self::cases());
    }
}
