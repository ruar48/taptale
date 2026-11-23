<?php

namespace Database\Seeders;

use App\Enums\OptionGroup;
use App\Models\Category;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Testimonial;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogSeeder extends Seeder
{
    /**
     * Seed the Taptale storefront catalog. Safe to run on a live database:
     * records that already exist (matched by slug or code) are never changed,
     * so only new definitions added here get inserted.
     */
    public function run(): void
    {
        $categories = $this->seedCategories();
        $products = $this->seedProducts();
        $this->assignProducts($categories, $products);
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
            $categories[$name] = Category::firstOrCreate(['slug' => Str::slug($name)], [
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
                'featured' => true, 'bestseller' => true, 'photos' => 2, 'experience' => true,
                'options' => $this->keychainOptions(),
            ],
            'nfc-keychain' => [
                'name' => 'NFC Memory Keychain',
                'short' => 'Tap it with a phone to open a private page of your photos, video, and message.',
                'art' => 'nfc', 'price' => 34900, 'fee' => 8000, 'days' => [5, 7],
                'featured' => true, 'bestseller' => true, 'photos' => 3, 'experience' => true,
                'options' => $this->keychainOptions(),
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
                'featured' => false, 'bestseller' => true, 'photos' => 2, 'experience' => true,
                'options' => $this->keychainOptions(),
            ],
            'souvenir-keychain-bulk' => [
                'name' => 'Event Souvenir Keychains',
                'short' => 'Personalized keychains for guests — priced per piece for events.',
                'art' => 'acrylic', 'price' => 6900, 'fee' => 15000, 'days' => [7, 12],
                'featured' => true, 'bestseller' => false, 'photos' => 2, 'experience' => true,
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
                'featured' => true, 'bestseller' => true, 'photos' => 3, 'experience' => true,
                'options' => [
                    [OptionGroup::Size, 'Mini case (45 × 40 mm)', 0, true],
                    [OptionGroup::Size, 'Large case (60 × 54 mm)', 4000],
                    [OptionGroup::Color, 'Silver ball chain', 0, true, '#C0C0C0'],
                    [OptionGroup::Color, 'Black ball chain', 0, false, '#343039'],
                    [OptionGroup::Color, 'Pastel pink chain', 1000, false, '#E9C9C9'],
                    [OptionGroup::AddOn, 'Extra printed disc', 2000],
                    ...$this->packagingOptions(),
                ],
            ],
            'music-player' => [
                'name' => 'Music Player Acrylic Keychain',
                'short' => 'Your photo as the album art of "your song" — with a play bar and scannable song code look.',
                'art' => 'music', 'price' => 9900, 'fee' => 4000, 'days' => [3, 5],
                'featured' => true, 'bestseller' => true, 'photos' => 1, 'experience' => true,
                'options' => [
                    [OptionGroup::Size, 'Standard (54 × 86 mm)', 0, true],
                    [OptionGroup::Size, 'Large (63 × 100 mm)', 3000],
                    [OptionGroup::Thickness, '3 mm', 0, true],
                    [OptionGroup::Thickness, '5 mm', 1500],
                    [OptionGroup::Color, 'Silver ring', 0, true, '#C0C0C0'],
                    [OptionGroup::Color, 'Gold ring', 0, false, '#D4AF37'],
                    [OptionGroup::Color, 'Rose gold ring', 0, false, '#B76E79'],
                    ...$this->packagingOptions(),
                ],
            ],
            'photo-strip' => [
                'name' => 'Photobooth Strip Keychain',
                'short' => 'Four of your favorite shots in a classic photobooth strip, sealed in clear acrylic.',
                'art' => 'strip', 'price' => 4900, 'fee' => 3000, 'days' => [3, 5],
                'featured' => false, 'bestseller' => true, 'photos' => 4, 'experience' => true,
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
                'featured' => true, 'bestseller' => true, 'photos' => 1, 'experience' => true,
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
                'featured' => false, 'bestseller' => false, 'photos' => 2, 'experience' => true,
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
            'calendar-keychain' => [
                'name' => 'Pinoy Calendar Keychain',
                'short' => 'Your photo above a calendar of your special month, with your sweetest line spelled out in the date boxes.',
                'art' => 'calendar', 'price' => 9900, 'fee' => 4000, 'days' => [3, 5],
                'featured' => true, 'bestseller' => true, 'photos' => 1, 'experience' => true,
                'options' => [
                    [OptionGroup::Size, 'Standard (45 × 60 mm)', 0, true],
                    [OptionGroup::Size, 'Large (54 × 72 mm)', 2500],
                    [OptionGroup::Material, 'Single-sided print', 0, true],
                    [OptionGroup::Material, 'Double-sided print', 1500],
                    [OptionGroup::Color, 'Gold ring', 0, true, '#D4AF37'],
                    [OptionGroup::Color, 'Silver ring', 0, false, '#C0C0C0'],
                    [OptionGroup::AddOn, 'Matching pair (2 pcs)', 8000],
                    ...$this->packagingOptions(),
                ],
            ],
        ];

        $products = [];

        foreach (array_values($definitions) as $index => $definition) {
            $product = Product::firstOrCreate(['slug' => Str::slug($definition['name'])], [
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

            $products[$product->slug] = $product;

            if (! $product->wasRecentlyCreated) {
                continue;
            }

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
        }

        return $products;
    }

    /**
     * @return list<array{0: OptionGroup, 1: string, 2: int, 3?: bool, 4?: string|null, 5?: bool}>
     */
    private function keychainOptions(): array
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
        $fun = ['photobooth-strip-keychain', 'die-cut-photo-keychain', 'pinoy-calendar-keychain'];

        $map = [
            'Couple Gifts' => [...$music, ...$everyday, 'matching-couple-keychains', 'photobooth-strip-keychain', 'engraved-wooden-keychain', 'pinoy-calendar-keychain'],
            'Wedding Souvenirs' => ['event-souvenir-keychains', 'personalized-qr-keepsake', 'nfc-memory-keychain', 'acrylic-photo-souvenir', 'photobooth-strip-keychain'],
            'Baptism Souvenirs' => ['event-souvenir-keychains', 'personalized-acrylic-keychain', 'acrylic-photo-souvenir'],
            'Birthday Gifts' => [...$music, ...$everyday, ...$fun],
            'Anniversary Gifts' => [...$music, ...$everyday, 'matching-couple-keychains', 'engraved-wooden-keychain', 'pinoy-calendar-keychain'],
            'Graduation Gifts' => ['personalized-acrylic-keychain', 'acrylic-photo-souvenir', 'nfc-memory-keychain', 'event-souvenir-keychains', 'nfc-social-tap-tag', 'engraved-wooden-keychain'],
            "Teacher's Day Gifts" => ['teacher-appreciation-plaque', 'personalized-acrylic-keychain', 'acrylic-photo-souvenir', 'engraved-wooden-keychain'],
            'Friendship Gifts' => [...$music, ...$fun, ...$everyday, 'matching-couple-keychains', 'nfc-social-tap-tag'],
            'Family Keepsakes' => ['acrylic-photo-souvenir', 'nfc-memory-keychain', 'personalized-qr-keepsake', 'engraved-wooden-keychain', 'photobooth-strip-keychain'],
            'Other Personalized Gifts' => array_keys($products),
        ];

        foreach ($map as $categoryName => $slugs) {
            $category = $categories[$categoryName];

            $this->linkNewRecords($category, $category->products(), collect($slugs)->map(fn (string $slug): Product => $products[$slug])->all());
        }
    }

    /**
     * Link the owner to the given records, skipping pairs that both existed
     * before this run. Re-seeding a live catalog then only links new records
     * and leaves links the studio added or removed by hand alone.
     *
     * @param  BelongsToMany<covariant Model, covariant Model>  $relation
     * @param  list<Model>  $related
     */
    private function linkNewRecords(Model $owner, BelongsToMany $relation, array $related): void
    {
        $relation->syncWithoutDetaching(
            collect($related)
                ->filter(fn (Model $record): bool => $owner->wasRecentlyCreated || $record->wasRecentlyCreated)
                ->map(fn (Model $record): int => $record->getKey())
                ->all()
        );
    }

    /**
     * QR Ph works with GCash, Maya, MariBank and every bank app, and PayMongo
     * confirms it automatically, so no wallet needs its own receipt upload.
     */
    private function seedPaymentMethods(): void
    {
        $methods = [
            ['QR Ph', 'qrph', 'paymongo_qrph', 'Scan the QR code with GCash, Maya, MariBank or any bank app. Your payment is confirmed automatically.'],
            ['Cash on Delivery', 'cod', 'cod', 'Pay the courier in cash when your gift arrives.'],
        ];

        foreach ($methods as $index => [$name, $code, $driver, $instructions]) {
            PaymentMethod::firstOrCreate(['code' => $code], [
                'name' => $name,
                'driver' => $driver,
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
            Testimonial::firstOrCreate(['author_name' => $author], [
                'occasion' => $occasion,
                'quote' => $quote,
                'rating' => 5,
                'is_published' => true,
                'sort_order' => $index,
            ]);
        }
    }
}
