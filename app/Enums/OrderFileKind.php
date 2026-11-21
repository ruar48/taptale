<?php

namespace App\Enums;

enum OrderFileKind: string
{
    case Photo = 'photo';
    case Reference = 'reference';
    case Additional = 'additional';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Photo => 'Design photo',
            self::Reference => 'Reference photo',
            self::Additional => 'Additional file',
        };
    }
}
