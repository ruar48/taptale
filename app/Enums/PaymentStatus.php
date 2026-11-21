<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Submitted = 'submitted';
    case Verified = 'verified';
    case Rejected = 'rejected';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Submitted => 'Awaiting Verification',
            self::Verified => 'Verified',
            self::Rejected => 'Rejected',
        };
    }
}
