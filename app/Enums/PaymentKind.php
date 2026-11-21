<?php

namespace App\Enums;

enum PaymentKind: string
{
    case Payment = 'payment';
    case Refund = 'refund';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Payment => 'Payment',
            self::Refund => 'Refund',
        };
    }
}
