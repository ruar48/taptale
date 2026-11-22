<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case Submitted = 'submitted';
    case Verified = 'verified';
    case Rejected = 'rejected';
    case Expired = 'expired';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Awaiting Online Payment',
            self::Submitted => 'Awaiting Verification',
            self::Verified => 'Verified',
            self::Rejected => 'Rejected',
            self::Expired => 'Checkout Closed',
        };
    }
}
