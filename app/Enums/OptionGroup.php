<?php

namespace App\Enums;

enum OptionGroup: string
{
    case Size = 'size';
    case Shape = 'shape';
    case Material = 'material';
    case Color = 'color';
    case Thickness = 'thickness';
    case Nfc = 'nfc';
    case Packaging = 'packaging';
    case AddOn = 'addon';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Size => 'Size',
            self::Shape => 'Shape',
            self::Material => 'Material',
            self::Color => 'Color',
            self::Thickness => 'Thickness',
            self::Nfc => 'NFC Tap Feature',
            self::Packaging => 'Packaging',
            self::AddOn => 'Add-ons',
        };
    }

    /**
     * Whether the customer may pick several options in this group.
     */
    public function allowsMultiple(): bool
    {
        return $this === self::AddOn;
    }

    /**
     * Options for select inputs.
     *
     * @return list<array{value: string, label: string, multiple: bool}>
     */
    public static function options(): array
    {
        return array_map(fn (self $group): array => [
            'value' => $group->value,
            'label' => $group->label(),
            'multiple' => $group->allowsMultiple(),
        ], self::cases());
    }
}
