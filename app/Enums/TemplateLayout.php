<?php

namespace App\Enums;

/**
 * Layouts that the storefront knows how to render as a live preview.
 */
enum TemplateLayout: string
{
    case Polaroid = 'polaroid';
    case HeartFrame = 'heart';
    case Arch = 'arch';
    case Celestial = 'celestial';
    case Floral = 'floral';
    case Minimal = 'minimal';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Polaroid => 'Polaroid memory',
            self::HeartFrame => 'Heart frame',
            self::Arch => 'Arched portrait',
            self::Celestial => 'Celestial night',
            self::Floral => 'Floral wreath',
            self::Minimal => 'Modern minimal',
        };
    }

    /**
     * Options for select inputs.
     *
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $layout): array => [
            'value' => $layout->value,
            'label' => $layout->label(),
        ], self::cases());
    }
}
