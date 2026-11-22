<?php

namespace App\Enums;

enum ExpenseCategory: string
{
    case Materials = 'materials';
    case Packaging = 'packaging';
    case Printing = 'printing';
    case Equipment = 'equipment';
    case Shipping = 'shipping';
    case Marketing = 'marketing';
    case Software = 'software';
    case Utilities = 'utilities';
    case Labor = 'labor';
    case Other = 'other';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Materials => 'Materials & Supplies',
            self::Packaging => 'Packaging',
            self::Printing => 'Printing & Production',
            self::Equipment => 'Equipment & Tools',
            self::Shipping => 'Shipping & Delivery',
            self::Marketing => 'Marketing & Ads',
            self::Software => 'Software & Subscriptions',
            self::Utilities => 'Rent & Utilities',
            self::Labor => 'Labor & Salaries',
            self::Other => 'Other',
        };
    }

    /**
     * Options for select inputs.
     *
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $category): array => [
            'value' => $category->value,
            'label' => $category->label(),
        ], self::cases());
    }
}
