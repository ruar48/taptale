<?php

namespace App\Enums;

enum DesignMode: string
{
    case SelfCustomized = 'self';
    case TaptaleDesigned = 'assisted';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::SelfCustomized => "I'll customize it myself",
            self::TaptaleDesigned => 'Taptale designs it for me',
        };
    }
}
