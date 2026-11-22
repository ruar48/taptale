<?php

namespace App\Enums;

enum FinanceEntryType: string
{
    case Capital = 'capital';
    case Expense = 'expense';
    case Withdrawal = 'withdrawal';
    case Income = 'income';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Capital => 'Capital (Puhunan)',
            self::Expense => 'Expense',
            self::Withdrawal => 'Owner Withdrawal',
            self::Income => 'Other Income',
        };
    }

    /**
     * Options for select inputs.
     *
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $type): array => [
            'value' => $type->value,
            'label' => $type->label(),
        ], self::cases());
    }
}
