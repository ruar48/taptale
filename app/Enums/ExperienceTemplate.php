<?php

namespace App\Enums;

/**
 * Website designs for the NFC / QR memory page. Each template is a preset
 * of page sections and a color theme; the content is shared, so customers
 * can switch designs at any time without retyping anything.
 */
enum ExperienceTemplate: string
{
    case Monthsary = 'monthsary';
    case Birthday = 'birthday';
    case LoveStory = 'love_story';
    case LittleSomething = 'little_something';
    case GirlfriendsDay = 'girlfriends_day';
    case Valentines = 'valentines';
    case Apology = 'apology';
    case OurSong = 'our_song';
    case Anniversary = 'anniversary';
    case Wedding = 'wedding';
    case SaveTheDate = 'save_the_date';
    case Bestie = 'bestie';
    case Family = 'family';
    case Graduation = 'graduation';
    case Classic = 'classic';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Monthsary => 'Happy Monthsary',
            self::Birthday => 'Happy Birthday Love',
            self::LoveStory => 'How We Happened',
            self::LittleSomething => 'A Little Something For You',
            self::GirlfriendsDay => "Happy Girlfriend's Day",
            self::Valentines => 'Be My Valentine',
            self::Apology => "I'm Sorry",
            self::OurSong => 'Our Song',
            self::Anniversary => 'Happy Anniversary',
            self::Wedding => 'Wedding Album',
            self::SaveTheDate => 'Save the Date',
            self::Bestie => 'Bestie Scrapbook',
            self::Family => 'Family Keepsake',
            self::Graduation => 'Congrats, Graduate',
            self::Classic => 'Simple Memory',
        };
    }

    /**
     * Short description shown in the template picker.
     */
    public function description(): string
    {
        return match ($this) {
            self::Monthsary => 'A wax-sealed envelope opens to a script greeting, a love letter, a polaroid wall, film strip and your song.',
            self::Birthday => 'A cinematic photo greeting, a sweet note, your photo album and a birthday song.',
            self::LoveStory => '"To my langga" note and a timeline of how you happened, with photos and dates.',
            self::LittleSomething => 'Tap to open: flowers, a love letter and a song — each revealed one by one.',
            self::GirlfriendsDay => 'A lace doily greeting on gingham, a letter and a scrapbook of your moments.',
            self::Valentines => '"Would you like to see your gift?" — the No button runs away. Then hearts, letter and song.',
            self::Apology => 'A gentle question gate, a heartfelt apology letter and the memories worth fixing it for.',
            self::OurSong => 'A music player page for your song with a spinning vinyl, lyrics-style message and album.',
            self::Anniversary => 'Every year together: script hero, film strip, timeline and a letter for the next chapter.',
            self::Wedding => 'An elegant album with your love story, countdown, gallery, video and your wedding song.',
            self::SaveTheDate => 'An envelope invitation with your date, a live countdown, venue details and your photos.',
            self::Bestie => 'A playful scrapbook of polaroids, film strips and inside jokes for your favorite person.',
            self::Family => 'A soft, timeless page for baptisms and family milestones with photos and a blessing.',
            self::Graduation => 'Cap-and-gown hero, a proud note from loved ones and photos of the journey.',
            self::Classic => 'A clean single page with your title, photos, message, video and song.',
        };
    }

    /**
     * Theme applied when the customer picks this template.
     */
    public function defaultTheme(): string
    {
        return match ($this) {
            self::Monthsary, self::Valentines, self::Anniversary => 'crimson',
            self::Birthday, self::OurSong => 'midnight',
            self::LoveStory, self::GirlfriendsDay, self::Bestie => 'blush',
            self::LittleSomething, self::Apology => 'rose',
            self::Wedding, self::SaveTheDate, self::Family, self::Classic => 'cream',
            self::Graduation => 'plum',
        };
    }

    /**
     * The template that best suits an occasion (category slug).
     */
    public static function forCategory(?string $categorySlug): self
    {
        return match ($categorySlug) {
            'couple-gifts' => self::Monthsary,
            'anniversary-gifts' => self::Anniversary,
            'birthday-gifts' => self::Birthday,
            'wedding-souvenirs' => self::Wedding,
            'friendship-gifts' => self::Bestie,
            'baptism-souvenirs', 'family-keepsakes' => self::Family,
            'graduation-gifts' => self::Graduation,
            default => self::Classic,
        };
    }

    /**
     * Options for the template picker.
     *
     * @return list<array{value: string, label: string, description: string, theme: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $template): array => [
            'value' => $template->value,
            'label' => $template->label(),
            'description' => $template->description(),
            'theme' => $template->defaultTheme(),
        ], self::cases());
    }
}
