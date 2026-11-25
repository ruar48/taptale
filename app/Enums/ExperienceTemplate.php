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
    case DigitalBouquet = 'digital_bouquet';
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
            self::DigitalBouquet => 'A Bouquet For You',
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
            self::Birthday => 'A cinematic photo greeting, a sweet note, a polaroid wall of your moments, your photo album and a birthday song.',
            self::LoveStory => '"To my langga" note and a timeline of how you happened, with photos and dates.',
            self::LittleSomething => 'Tap to open: flowers, a love letter and a song — each revealed one by one.',
            self::DigitalBouquet => 'Flowers that bloom on their screen and never wilt. Pick a wrapped bouquet or glowing flowers in any color, let petals or your photos rain down, then a letter, photos and your song.',
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
            self::DigitalBouquet => 'moonlit',
        };
    }

    /**
     * The sections the design shows, in order (mirrors EXPERIENCE_PRESETS in config.ts).
     *
     * @return list<string>
     */
    public function sections(): array
    {
        return match ($this) {
            self::Monthsary => ['hero_photo', 'letter_card', 'polaroid_wall', 'film_strip', 'letter_paper', 'scrapbook', 'song', 'quote', 'closing'],
            self::Birthday => ['hero_photo', 'note', 'polaroid_wall', 'gallery', 'song', 'video', 'quote', 'closing'],
            self::LoveStory => ['note', 'timeline', 'quote', 'gallery', 'song', 'closing'],
            self::LittleSomething => ['hero_script', 'gifts', 'letter_paper', 'quote', 'closing'],
            self::DigitalBouquet => ['bouquet', 'letter_paper', 'gallery', 'song', 'quote', 'closing'],
            self::GirlfriendsDay => ['hero_doily', 'letter_paper', 'scrapbook', 'film_strip', 'song', 'closing'],
            self::Valentines => ['hero_script', 'letter_card', 'polaroid_wall', 'song', 'quote', 'closing'],
            self::Apology => ['hero_script', 'letter_paper', 'gallery', 'quote', 'closing'],
            self::OurSong => ['player', 'letter_card', 'gallery', 'quote', 'closing'],
            self::Anniversary => ['hero_photo', 'film_strip', 'timeline', 'letter_paper', 'song', 'closing'],
            self::Wedding => ['hero_photo', 'note', 'countdown', 'timeline', 'gallery', 'video', 'song', 'quote', 'closing'],
            self::SaveTheDate => ['hero_script', 'countdown', 'details', 'gallery', 'closing'],
            self::Bestie => ['hero_script', 'scrapbook', 'film_strip', 'polaroid_wall', 'letter_card', 'song', 'closing'],
            self::Family => ['hero_photo', 'note', 'gallery', 'quote', 'closing'],
            self::Graduation => ['hero_photo', 'note', 'polaroid_wall', 'gallery', 'quote', 'closing'],
            self::Classic => ['hero_script', 'gallery', 'note', 'video', 'song', 'closing'],
        };
    }

    /**
     * The flowers and rain a former flower design showed. Those designs are
     * now options of the single bouquet template, and their old demo links
     * redirect to it with the same look.
     *
     * @return array{style: FlowerStyle, rain: FlowerRain}|null
     */
    public static function legacyFlowerDesign(string $value): ?array
    {
        $design = match ($value) {
            'night_garden' => [FlowerStyle::Teal, FlowerRain::None],
            'pink_garden' => [FlowerStyle::Pink, FlowerRain::None],
            'lavender_garden' => [FlowerStyle::Lavender, FlowerRain::None],
            'golden_garden' => [FlowerStyle::Golden, FlowerRain::None],
            'red_garden' => [FlowerStyle::Red, FlowerRain::None],
            'moonlight_garden' => [FlowerStyle::White, FlowerRain::None],
            'blue_garden' => [FlowerStyle::Blue, FlowerRain::None],
            'peach_garden' => [FlowerStyle::Peach, FlowerRain::None],
            'mixed_garden' => [FlowerStyle::Mixed, FlowerRain::None],
            'rain_teal' => [FlowerStyle::Teal, FlowerRain::Both],
            'rain_pink' => [FlowerStyle::Pink, FlowerRain::Both],
            'rain_red' => [FlowerStyle::Red, FlowerRain::Both],
            'rain_lavender' => [FlowerStyle::Lavender, FlowerRain::Both],
            'rain_mixed' => [FlowerStyle::Mixed, FlowerRain::Both],
            default => null,
        };

        return $design === null ? null : ['style' => $design[0], 'rain' => $design[1]];
    }

    /**
     * The template that best suits an occasion (category slug).
     */
    public static function forCategory(?string $categorySlug): self
    {
        return match ($categorySlug) {
            'couple-gifts' => self::Monthsary,
            'anniversary-gifts' => self::Anniversary,
            'birthday-gifts', '18th-debut-gifts' => self::Birthday,
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
