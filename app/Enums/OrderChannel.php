<?php

namespace App\Enums;

/**
 * Where an order came from: the online shop, or taken by the studio for a
 * customer who came in person or ordered over chat.
 */
enum OrderChannel: string
{
    case Website = 'website';
    case WalkIn = 'walk_in';
    case Messenger = 'messenger';
    case Other = 'other';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Website => 'Website',
            self::WalkIn => 'Walk-in',
            self::Messenger => 'Messenger / chat',
            self::Other => 'Other (phone, social media)',
        };
    }

    /**
     * Channels the studio can take an order through.
     *
     * @return list<array{value: string, label: string}>
     */
    public static function manualOptions(): array
    {
        return array_values(array_map(fn (self $channel): array => [
            'value' => $channel->value,
            'label' => $channel->label(),
        ], array_filter(self::cases(), fn (self $channel): bool => $channel !== self::Website)));
    }
}
