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
    case MiniCd = 'mini_cd';
    case MusicPlayer = 'music_player';
    case PhotoStrip = 'photo_strip';
    case TapTag = 'tap_tag';
    case Engraved = 'engraved';
    case DieCut = 'die_cut';
    case Calendar = 'calendar';

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
            self::MiniCd => 'Mini CD album',
            self::MusicPlayer => 'Music player',
            self::PhotoStrip => 'Photobooth strip',
            self::TapTag => 'NFC tap tag',
            self::Engraved => 'Laser engraved',
            self::DieCut => 'Die-cut sticker',
            self::Calendar => 'Pinoy calendar',
        };
    }

    /**
     * Whether the layout features a song or album title and an artist name.
     */
    public function usesMusicDetails(): bool
    {
        return in_array($this, [self::MiniCd, self::MusicPlayer], true);
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
