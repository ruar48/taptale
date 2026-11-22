<?php

namespace App\Enums;

enum DiscountType: string
{
    case Percent = 'percent';
    case Fixed = 'fixed';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Percent => 'Percent off',
            self::Fixed => 'Amount off',
        };
    }
}
