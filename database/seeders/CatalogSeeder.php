<?php

namespace Database\Seeders;

use App\Enums\OptionGroup;
use App\Enums\TemplateLayout;
use App\Models\Category;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Template;
use App\Models\Testimonial;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogSeeder extends Seeder
{
    /**
     * Seed the Taptale storefront catalog.
     */
    public function run(): void
    {
        $categories = $this->seedCategories();
        $products = $this->seedProducts();
        $this->assignProducts($categories, $products);
        $this->seedTemplates($categories, $products);
        $this->seedPaymentMethods();
        $this->seedTestimonials();
    }

    /**
     * @return array<string, Category>
     */
    private function seedCategories(): array
    {
        $definitions = [
            ['Couple Gifts', 'For the two of you, in every little tap.', '#B86F83', 'heart'],
            ['Wedding Souvenirs', 'Keepsakes your guests will treasure long after the vows.', '#713D50', 'gem'],
            ['Baptism Souvenirs', 'Gentle mementos for a blessed beginning.', '#9DB4C0', 'baby'],
            ['Birthday Gifts', 'Celebrate another chapter of their story.', '#E3A587', 'cake'],
            ['Anniversary Gifts', 'Every year together, beautifully remembered.', '#A85C72', 'calendar-heart'],
            ['Graduation Gifts', 'Honor the hard work and the bright road ahead.', '#5B6C8F', 'graduation-cap'],
            ["Teacher's Day Gifts", 'A heartfelt thank you they can hold.', '#7C9473', 'apple'],
            ['Friendship Gifts', 'For the friends who feel like family.', '#D08C60', 'users'],
            ['Family Keepsakes', 'Moments the whole family will want to keep close.', '#8A6E5A', 'home'],
            ['Other Personalized Gifts', 'Anything you can imagine, made personal.', '#6E5A7E', 'sparkles'],
        ];

        $categories = [];

        foreach ($definitions as $index => [$name, $tagline, $color, $icon]) {
            $categories[$name] = Category::updateOrCreate(['slug' => Str::slug($name)], [
                'name' => $name,
                'tagline' => $tagline,
                'description' => $tagline.' Choose a product, pick a template, and add the photos and words that make it yours.',
                'accent_color' => $color,
                'icon' => $icon,
                'sort_order' => $index,
                'is_active' => true,
            ]);
        }

        return $categories;
    }

    /**
     * @return array<string, Product>
     */
    private function seedProducts(): array
    {
        $definitions = [
            'acrylic-keychain' => [
                'name' => 'Personalized Acrylic Keychain',
                'short' => 'Crystal-clear acrylic printed with your favorite photo and words.',
                'art' => 'acrylic', 'price' => 14900, 'fee' => 5000, 'days' => [3, 5],
                'featured' => true, 'bestseller' => true, 'photos' => 2, 'experience' => false,
                'options' => $this->keychainOptions(withNfcUpgrade: true),
            ],
            'nfc-keychain' => [
                'name' => 'NFC Memory Keychain',
                'short' => 'Tap it with a phone to open a private page of your photos, video, and message.',
                'art' => 'nfc', 'price' => 34900, 'fee' => 8000, 'days' => [5, 7],
                'featured' => true, 'bestseller' => true, 'photos' => 3, 'experience' => true,
                'options' => $this->keychainOptions(withNfcUpgrade: false),
            ],
            'qr-keepsake' => [
                'name' => 'Personalized QR Keepsake',
                'short' => 'A scannable keepsake that opens your digital story on any phone.',
                'art' => 'qr', 'price' => 19900, 'fee' => 5000, 'days' => [3, 5],
                'featured' => true, 'bestseller' => false, 'photos' => 2, 'experience' => true,
                'options' => [
                    [OptionGroup::Size, 'Card (85 × 55 mm)', 0, true],
                    [OptionGroup::Size, 'Tabletop stand (100 × 150 mm)', 10000],
                    [OptionGroup::Material, 'Clear acrylic', 0, true],
                    [OptionGroup::Material, 'Frosted acrylic', 3000],
                    ...$this->packagingOptions(),
                ],
            ],
            'acrylic-photo-stand' => [
                'name' => 'Acrylic Photo Souvenir',
                'short' => 'A standing acrylic photo block that glows in the light.',
                'art' => 'photo', 'price' => 29900, 'fee' => 8000, 'days' => [4, 6],
                'featured' => true, 'bestseller' => true, 'photos' => 3, 'experience' => false,
                'options' => [
                    [OptionGroup::Size, '4 × 6 in', 0, true],
                    [OptionGroup::Size, '5 × 7 in', 8000],
                    [OptionGroup::Size, '8 × 10 in', 20000],
                    [OptionGroup::Thickness, '5 mm', 0, true],
                    [OptionGroup::Thickness, '10 mm premium block', 12000],
                    [OptionGroup::AddOn, 'Engraved name base', 6000],
                    [OptionGroup::AddOn, 'Warm LED light base', 18000],
                    ...$this->packagingOptions(),
                ],
            ],
            'couple-keychain-pair' => [
                'name' => 'Matching Couple Keychains',
                'short' => 'Two halves of one story — a matching pair for you and your person.',
                'art' => 'keepsake', 'price' => 27900, 'fee' => 6000, 'days' => [3, 5],
                'featured' => false, 'bestseller' => true, 'photos' => 2, 'experience' => false,
                'options' => $this->keychainOptions(withNfcUpgrade: true),
            ],
            'souvenir-keychain-bulk' => [
                'name' => 'Event Souvenir Keychains',
                'short' => 'Personalized keychains for guests — priced per piece for events.',
                'art' => 'acrylic', 'price' => 6900, 'fee' => 15000, 'days' => [7, 12],
                'featured' => true, 'bestseller' => false, 'photos' => 2, 'experience' => false,
                'min' => 20, 'max' => 1000,
                'options' => [
                    [OptionGroup::Size, 'Small (40 mm)', 0, true],
                    [OptionGroup::Size, 'Medium (50 mm)', 1000],
                    [OptionGroup::Shape, 'Circle', 0, true],
                    [OptionGroup::Shape, 'Heart', 0],
                    [OptionGroup::Shape, 'Custom cut-out', 1500],
                    [OptionGroup::Color, 'Rose gold ring', 0, true, '#B76E79'],
                    [OptionGroup::Color, 'Silver ring', 0, false, '#C0C0C0'],
                    [OptionGroup::Color, 'Gold ring', 0, false, '#D4AF37'],
                    [OptionGroup::Packaging, 'Individually bagged', 0, true],
                    [OptionGroup::Packaging, 'Thank-you tag & ribbon', 1500],
                ],
            ],
            'teacher-plaque' => [
                'name' => 'Teacher Appreciation Plaque',
                'short' => 'A desk plaque with a thank-you message from the whole class.',
                'art' => 'photo', 'price' => 24900, 'fee' => 6000, 'days' => [4, 6],
                'featured' => false, 'bestseller' => false, 'photos' => 1, 'experience' => false,
                'options' => [
                    [OptionGroup::Size, '5 × 7 in', 0, true],
                    [OptionGroup::Size, '8 × 10 in', 12000],
                    [OptionGroup::Material, 'Clear acrylic', 0, true],
                    [OptionGroup::Material, 'Wood-backed acrylic', 9000],
                    ...$this->packagingOptions(),
                ],
            ],
            'mini-cd' => [
                'name' => 'Mini CD Album Keychain',
                'short' => 'A tiny jewel case with your own album cover, tracklist and a printed mini disc inside.',
                'art' => 'cd', 'price' => 15900, 'fee' => 6000, 'days' => [4, 6],
                'featured' => true, 'bestseller' => true, 'photos' => 3, 'experience' => false,
                'options' => [
                    [OptionGroup::Size, 'Mini case (45 × 40 mm)', 0, true],
                    [OptionGroup::Size, 'Large case (60 × 54 mm)', 4000],
                    [OptionGroup::Color, 'Silver ball chain', 0, true, '#C0C0C0'],
                    [OptionGroup::Color, 'Black ball chain', 0, false, '#343039'],
                    [OptionGroup::Color, 'Pastel pink chain', 1000, false, '#E9C9C9'],
                    [OptionGroup::Nfc, 'No NFC', 0, true],
                    [OptionGroup::Nfc, 'NFC readable — tap to play your song', 6000, false, null, true],
                    [OptionGroup::AddOn, 'Extra printed disc', 2000],
                    ...$this->packagingOptions(),
                ],
            ],
            'music-player' => [
                'name' => 'Music Player Acrylic Keychain',
                'short' => 'Your photo as the album art of "your song" — with a play bar and scannable song code look.',
                'art' => 'music', 'price' => 9900, 'fee' => 4000, 'days' => [3, 5],
                'featured' => true, 'bestseller' => true, 'photos' => 1, 'experience' => false,
                'options' => [
                    [OptionGroup::Size, 'Standard (54 × 86 mm)', 0, true],
                    [OptionGroup::Size, 'Large (63 × 100 mm)', 3000],
                    [OptionGroup::Thickness, '3 mm', 0, true],
                    [OptionGroup::Thickness, '5 mm', 1500],
                    [OptionGroup::Color, 'Silver ring', 0, true, '#C0C0C0'],
                    [OptionGroup::Color, 'Gold ring', 0, false, '#D4AF37'],
                    [OptionGroup::Color, 'Rose gold ring', 0, false, '#B76E79'],
                    [OptionGroup::Nfc, 'No NFC', 0, true],
                    [OptionGroup::Nfc, 'Add NFC — tap to open your song & memories', 12000, false, null, true],
                    ...$this->packagingOptions(),
                ],
            ],
            'photo-strip' => [
                'name' => 'Photobooth Strip Keychain',
                'short' => 'Four of your favorite shots in a classic photobooth strip, sealed in clear acrylic.',
                'art' => 'strip', 'price' => 4900, 'fee' => 3000, 'days' => [3, 5],
                'featured' => false, 'bestseller' => true, 'photos' => 4, 'experience' => false,
                'options' => [
                    [OptionGroup::Size, 'Mini strip (25 × 75 mm)', 0, true],
                    [OptionGroup::Size, 'Classic strip (35 × 105 mm)', 2000],
                    [OptionGroup::Material, 'Single-sided print', 0, true],
                    [OptionGroup::Material, 'Double-sided print', 1500],
                    [OptionGroup::Color, 'Silver ring', 0, true, '#C0C0C0'],
                    [OptionGroup::Color, 'Gold ring', 0, false, '#D4AF37'],
                    ...$this->packagingOptions(),
                ],
            ],
            'tap-tag' => [
                'name' => 'NFC Social Tap Tag',
                'short' => 'A round tap tag that opens your page, socials or memories on any phone — no app needed.',
                'art' => 'tag', 'price' => 8900, 'fee' => 3000, 'days' => [3, 5],
                'featured' => false, 'bestseller' => false, 'photos' => 1, 'experience' => true,
                'options' => [
                    [OptionGroup::Shape, 'Circle (30 mm)', 0, true],
                    [OptionGroup::Shape, 'Rounded square (30 mm)', 0],
                    [OptionGroup::Color, 'Matte black base', 0, true, '#343039'],
                    [OptionGroup::Color, 'Blush base', 0, false, '#E9C9C9'],
                    [OptionGroup::Color, 'White base', 0, false, '#F8F3ED'],
                    [OptionGroup::AddOn, 'Epoxy dome finish', 2000],
                    ...$this->packagingOptions(),
                ],
            ],
            'wooden-keychain' => [
                'name' => 'Engraved Wooden Keychain',
                'short' => 'Your photo and a heartfelt line, laser-engraved on real wood.',
                'art' => 'wood', 'price' => 8800, 'fee' => 4000, 'days' => [3, 6],
                'featured' => true, 'bestseller' => true, 'photos' => 1, 'experience' => false,
                'options' => [
                    [OptionGroup::Material, 'Maple (light)', 0, true],
                    [OptionGroup::Material, 'Walnut (dark)', 2000],
                    [OptionGroup::Shape, 'Rectangle', 0, true],
                    [OptionGroup::Shape, 'Rounded tag', 0],
                    [OptionGroup::AddOn, 'Engraving on the back', 2500],
                    [OptionGroup::AddOn, 'Leather strap', 3000],
                    [OptionGroup::Packaging, 'Kraft pouch', 0, true],
                    [OptionGroup::Packaging, 'Gold-ribbon gift box', 6000],
                ],
            ],
            'die-cut' => [
                'name' => 'Die-cut Photo Keychain',
                'short' => 'Your favorite person, pet or meme cut to shape with a glossy sticker-style outline.',
                'art' => 'diecut', 'price' => 6900, 'fee' => 3000, 'days' => [3, 5],
                'featured' => false, 'bestseller' => false, 'photos' => 2, 'experience' => false,
                'options' => [
                    [OptionGroup::Size, 'Small (50 mm)', 0, true],
                    [OptionGroup::Size, 'Large (70 mm)', 2500],
                    [OptionGroup::Material, 'Clear acrylic', 0, true],
                    [OptionGroup::Material, 'Holographic acrylic', 2500],
                    [OptionGroup::Color, 'Silver ring', 0, true, '#C0C0C0'],
                    [OptionGroup::Color, 'Lobster clasp (gold)', 1000, false, '#D4AF37'],
                    [OptionGroup::AddOn, 'Double-sided print', 1500],
                    ...$this->packagingOptions(),
                ],
            ],
        ];

        $products = [];

        foreach (array_values($definitions) as $index => $definition) {
            $product = Product::updateOrCreate(['slug' => Str::slug($definition['name'])], [
                'name' => $definition['name'],
                'short_description' => $definition['short'],
                'description' => $definition['short']."\n\nEvery piece is printed and assembled by hand in our studio. Upload your photos, add your names and message, and we'll make sure it looks just right before anything goes into production.",
                'art_style' => $definition['art'],
                'base_price' => $definition['price'],
                'design_fee' => $definition['fee'],
                'production_days_min' => $definition['days'][0],
                'production_days_max' => $definition['days'][1],
                'min_quantity' => $definition['min'] ?? 1,
                'max_quantity' => $definition['max'] ?? 200,
                'max_photos' => $definition['photos'],
                'has_digital_experience' => $definition['experience'],
                'is_active' => true,
                'is_featured' => $definition['featured'],
                'is_bestseller' => $definition['bestseller'],
                'sort_order' => $index,
            ]);

            $product->options()->delete();

            foreach ($definition['options'] as $position => $option) {
                [$group, $name, $price] = $option;

                $product->options()->create([
                    'group' => $group,
                    'name' => $name,
                    'price_modifier' => $price,
                    'is_default' => $option[3] ?? false,
                    'swatch' => $option[4] ?? null,
                    'enables_digital_experience' => $option[5] ?? false,
                    'sort_order' => $position,
                    'is_active' => true,
                ]);
            }

            $products[$product->slug] = $product;
        }

        return $products;
    }

    /**
     * @return list<array{0: OptionGroup, 1: string, 2: int, 3?: bool, 4?: string|null, 5?: bool}>
     */
    private function keychainOptions(bool $withNfcUpgrade): array
    {
        $options = [
            [OptionGroup::Size, 'Petite (45 mm)', 0, true],
            [OptionGroup::Size, 'Classic (55 mm)', 2000],
            [OptionGroup::Size, 'Statement (70 mm)', 4500],
            [OptionGroup::Shape, 'Rounded rectangle', 0, true],
            [OptionGroup::Shape, 'Circle', 0],
            [OptionGroup::Shape, 'Heart', 1000],
            [OptionGroup::Shape, 'Custom cut-out', 2500],
            [OptionGroup::Material, 'Clear acrylic', 0, true],
            [OptionGroup::Material, 'Frosted acrylic', 1500],
            [OptionGroup::Material, 'Glitter acrylic', 2500],
            [OptionGroup::Thickness, '3 mm', 0, true],
            [OptionGroup::Thickness, '5 mm', 1500],
            [OptionGroup::Color, 'Rose gold ring', 0, true, '#B76E79'],
            [OptionGroup::Color, 'Silver ring', 0, false, '#C0C0C0'],
            [OptionGroup::Color, 'Gold ring', 0, false, '#D4AF37'],
            [OptionGroup::AddOn, 'Initial charm', 3500],
            [OptionGroup::AddOn, 'Tassel', 2500],
        ];

        if ($withNfcUpgrade) {
            $options[] = [OptionGroup::Nfc, 'No NFC', 0, true];
            $options[] = [OptionGroup::Nfc, 'Add NFC tap chip + digital memory page', 15000, false, null, true];
        }

        return [...$options, ...$this->packagingOptions()];
    }

    /**
     * @return list<array{0: OptionGroup, 1: string, 2: int, 3?: bool}>
     */
    private function packagingOptions(): array
    {
        return [
            [OptionGroup::Packaging, 'Kraft pouch', 0, true],
            [OptionGroup::Packaging, 'Blush gift box with ribbon', 6000],
            [OptionGroup::Packaging, 'Premium keepsake box & handwritten card', 12000],
        ];
    }

    /**
     * @param  array<string, Category>  $categories
     * @param  array<string, Product>  $products
     */
    private function assignProducts(array $categories, array $products): void
    {
        $everyday = ['personalized-acrylic-keychain', 'nfc-memory-keychain', 'personalized-qr-keepsake', 'acrylic-photo-souvenir'];
        $music = ['mini-cd-album-keychain', 'music-player-acrylic-keychain'];
        $fun = ['photobooth-strip-keychain', 'die-cut-photo-keychain'];

        $map = [
            'Couple Gifts' => [...$music, ...$everyday, 'matching-couple-keychains', 'photobooth-strip-keychain', 'engraved-wooden-keychain'],
            'Wedding Souvenirs' => ['event-souvenir-keychains', 'personalized-qr-keepsake', 'nfc-memory-keychain', 'acrylic-photo-souvenir', 'photobooth-strip-keychain'],
            'Baptism Souvenirs' => ['event-souvenir-keychains', 'personalized-acrylic-keychain', 'acrylic-photo-souvenir'],
            'Birthday Gifts' => [...$music, ...$everyday, ...$fun],
            'Anniversary Gifts' => [...$music, ...$everyday, 'matching-couple-keychains', 'engraved-wooden-keychain'],
            'Graduation Gifts' => ['personalized-acrylic-keychain', 'acrylic-photo-souvenir', 'nfc-memory-keychain', 'event-souvenir-keychains', 'nfc-social-tap-tag', 'engraved-wooden-keychain'],
            "Teacher's Day Gifts" => ['teacher-appreciation-plaque', 'personalized-acrylic-keychain', 'acrylic-photo-souvenir', 'engraved-wooden-keychain'],
            'Friendship Gifts' => [...$music, ...$fun, ...$everyday, 'matching-couple-keychains', 'nfc-social-tap-tag'],
            'Family Keepsakes' => ['acrylic-photo-souvenir', 'nfc-memory-keychain', 'personalized-qr-keepsake', 'engraved-wooden-keychain', 'photobooth-strip-keychain'],
            'Other Personalized Gifts' => array_keys($products),
        ];

        foreach ($map as $categoryName => $slugs) {
            $categories[$categoryName]->products()->sync(
                collect($slugs)->map(fn (string $slug): int => $products[$slug]->id)->all()
            );
        }
    }

    /**
     * Every template is limited to the products whose physical form it fits,
     * so a mini CD layout is never offered for a wooden keychain.
     *
     * @param  array<string, Category>  $categories
     * @param  array<string, Product>  $products
     */
    private function seedTemplates(array $categories, array $products): void
    {
        $classic = [
            'personalized-acrylic-keychain', 'nfc-memory-keychain', 'personalized-qr-keepsake', 'acrylic-photo-souvenir',
            'matching-couple-keychains', 'event-souvenir-keychains', 'teacher-appreciation-plaque',
        ];

        $everyOccasion = ['Couple Gifts', 'Anniversary Gifts', 'Birthday Gifts', 'Friendship Gifts', 'Graduation Gifts', 'Family Keepsakes', "Teacher's Day Gifts", 'Wedding Souvenirs', 'Other Personalized Gifts'];

        $productTemplates = [
            ['Album Era', TemplateLayout::MiniCd, ['#1A1A1F', '#F8F3ED', '#E9C9C9'], $everyOccasion, true, ['mini-cd-album-keychain']],
            ['Pastel Single', TemplateLayout::MiniCd, ['#F6DDE3', '#5A2E3E', '#B86F83'], $everyOccasion, true, ['mini-cd-album-keychain']],
            ['Midnight Record', TemplateLayout::MiniCd, ['#22304A', '#F3EDE8', '#D4AF37'], $everyOccasion, false, ['mini-cd-album-keychain']],
            ['Now Playing · Light', TemplateLayout::MusicPlayer, ['#FFFFFF', '#1F1D22', '#B86F83'], $everyOccasion, true, ['music-player-acrylic-keychain']],
            ['Now Playing · Dark', TemplateLayout::MusicPlayer, ['#121214', '#F5F5F5', '#E9C9C9'], $everyOccasion, true, ['music-player-acrylic-keychain']],
            ['Our Song · Blush', TemplateLayout::MusicPlayer, ['#F7E4E6', '#5A2E3E', '#B86F83'], $everyOccasion, false, ['music-player-acrylic-keychain']],
            ['Photobooth Classic', TemplateLayout::PhotoStrip, ['#FFFFFF', '#343039', '#B86F83'], $everyOccasion, true, ['photobooth-strip-keychain']],
            ['Film Booth', TemplateLayout::PhotoStrip, ['#141416', '#F5F5F5', '#E3A587'], $everyOccasion, false, ['photobooth-strip-keychain']],
            ['Pastel Booth', TemplateLayout::PhotoStrip, ['#F4E3EC', '#5A2E3E', '#B86F83'], $everyOccasion, false, ['photobooth-strip-keychain']],
            ['Tap to Connect', TemplateLayout::TapTag, ['#1F1D22', '#FFFFFF', '#B86F83'], $everyOccasion, true, ['nfc-social-tap-tag']],
            ['Social Pop', TemplateLayout::TapTag, ['#B86F83', '#FFFFFF', '#713D50'], $everyOccasion, false, ['nfc-social-tap-tag']],
            ['Drive Safe', TemplateLayout::Engraved, ['#C79B6D', '#4A2C17', '#7A4B2A'], $everyOccasion, true, ['engraved-wooden-keychain']],
            ['Home Sweet Home', TemplateLayout::Engraved, ['#E2C49A', '#5B3A1E', '#8A5A32'], $everyOccasion, false, ['engraved-wooden-keychain']],
            ['Sticker Pop', TemplateLayout::DieCut, ['#FDF1F4', '#5A2E3E', '#B86F83'], $everyOccasion, true, ['die-cut-photo-keychain']],
            ['Cutie Cutout', TemplateLayout::DieCut, ['#EEF6FF', '#1E3A5F', '#5B8DEF'], $everyOccasion, false, ['die-cut-photo-keychain']],
        ];

        $definitions = [
            ['Golden Hour Polaroid', TemplateLayout::Polaroid, ['#FFFDF9', '#343039', '#B86F83'], ['Couple Gifts', 'Anniversary Gifts', 'Friendship Gifts', 'Birthday Gifts', 'Family Keepsakes', 'Other Personalized Gifts'], true],
            ['Forever Heart', TemplateLayout::HeartFrame, ['#F8E6E8', '#713D50', '#B86F83'], ['Couple Gifts', 'Anniversary Gifts', 'Wedding Souvenirs', 'Other Personalized Gifts'], true],
            ['Sacred Arch', TemplateLayout::Arch, ['#F8F3ED', '#5A4A42', '#C9A66B'], ['Wedding Souvenirs', 'Baptism Souvenirs', 'Family Keepsakes', 'Other Personalized Gifts'], true],
            ['Under the Same Stars', TemplateLayout::Celestial, ['#1F1B2E', '#F8F3ED', '#E9C9C9'], ['Couple Gifts', 'Anniversary Gifts', 'Friendship Gifts', 'Other Personalized Gifts'], true],
            ['Garden Blessing', TemplateLayout::Floral, ['#FBF7F2', '#4F5D4A', '#E9C9C9'], ['Baptism Souvenirs', 'Wedding Souvenirs', 'Birthday Gifts', "Teacher's Day Gifts", 'Other Personalized Gifts'], true],
            ['Clean & Simple', TemplateLayout::Minimal, ['#FFFFFF', '#343039', '#713D50'], ['Graduation Gifts', "Teacher's Day Gifts", 'Birthday Gifts', 'Family Keepsakes', 'Other Personalized Gifts'], false],
            ['Little Angel', TemplateLayout::Arch, ['#EEF3F7', '#3E5266', '#9DB4C0'], ['Baptism Souvenirs', 'Other Personalized Gifts'], false],
            ['Cap & Gown', TemplateLayout::Minimal, ['#1E2A44', '#F8F3ED', '#D4AF37'], ['Graduation Gifts', 'Other Personalized Gifts'], true],
            ['Birthday Bloom', TemplateLayout::Floral, ['#FFF4EC', '#7A3E2E', '#E3A587'], ['Birthday Gifts', 'Friendship Gifts', 'Other Personalized Gifts'], false],
            ['Thank You, Teacher', TemplateLayout::Polaroid, ['#F4F7EF', '#2F3B2A', '#7C9473'], ["Teacher's Day Gifts", 'Other Personalized Gifts'], false],
        ];

        $definitions = [
            ...array_map(fn (array $definition): array => [...$definition, $classic], $definitions),
            ...$productTemplates,
        ];

        foreach ($definitions as $index => [$name, $layout, [$background, $ink, $accent], $categoryNames, $featured, $productSlugs]) {
            $template = Template::updateOrCreate(['slug' => Str::slug($name)], [
                'name' => $name,
                'description' => $layout->label().' layout in a '.Str::lower($name).' mood.',
                'layout' => $layout,
                'palette' => ['background' => $background, 'ink' => $ink, 'accent' => $accent],
                'is_active' => true,
                'is_featured' => $featured,
                'sort_order' => $index,
            ]);

            $template->categories()->sync(
                collect($categoryNames)->map(fn (string $categoryName): int => $categories[$categoryName]->id)->all()
            );

            $template->products()->sync(
                collect($productSlugs)->map(fn (string $slug): int => $products[$slug]->id)->all()
            );
        }
    }

    private function seedPaymentMethods(): void
    {
        $methods = [
            ['GCash', 'gcash', 'Taptale Gifts', '0917 123 4567', 'Send the exact total to our GCash number, then upload a screenshot of the receipt and enter the reference number.'],
            ['Maya', 'maya', 'Taptale Gifts', '0918 765 4321', 'Send the exact total via Maya, then upload your receipt and reference number.'],
            ['Bank Transfer (BDO)', 'bdo', 'Taptale Gifts Co.', '0012 3456 7890', 'Transfer the exact total to our BDO account. Upload a photo of the deposit slip or online transfer confirmation.'],
        ];

        foreach ($methods as $index => [$name, $code, $accountName, $accountNumber, $instructions]) {
            PaymentMethod::updateOrCreate(['code' => $code], [
                'name' => $name,
                'driver' => 'manual',
                'account_name' => $accountName,
                'account_number' => $accountNumber,
                'instructions' => $instructions,
                'is_active' => true,
                'sort_order' => $index,
            ]);
        }
    }

    private function seedTestimonials(): void
    {
        $testimonials = [
            ['Camille R.', 'Anniversary gift', 'I tapped the keychain on his phone and our wedding video started playing. He cried. I cried. Worth every peso.'],
            ['Joshua & Bea', 'Wedding souvenirs', 'Our guests still message us photos of the keychains on their bags. The Taptale team handled the design for us and it was perfect on the first proof.'],
            ['Tita Marites', 'Baptism souvenirs', 'So easy! I just uploaded the photos of my apo and described what I wanted. The soft blue arch design was exactly what I imagined.'],
            ['Grade 6 - Sampaguita', "Teacher's Day", 'The whole class signed the message and Ma\'am Liza put the plaque right on her desk. Thank you, Taptale!'],
        ];

        foreach ($testimonials as $index => [$author, $occasion, $quote]) {
            Testimonial::updateOrCreate(['author_name' => $author], [
                'occasion' => $occasion,
                'quote' => $quote,
                'rating' => 5,
                'is_published' => true,
                'sort_order' => $index,
            ]);
        }
    }
}
