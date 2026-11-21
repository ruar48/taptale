<?php

namespace App\Enums;

enum ProofStatus: string
{
    case AwaitingResponse = 'awaiting_response';
    case Approved = 'approved';
    case RevisionRequested = 'revision_requested';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::AwaitingResponse => 'Awaiting response',
            self::Approved => 'Approved',
            self::RevisionRequested => 'Revision requested',
        };
    }
}
