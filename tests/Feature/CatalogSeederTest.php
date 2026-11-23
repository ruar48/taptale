<?php

use App\Enums\TemplateLayout;
use App\Models\Category;
use App\Models\PaymentMethod;
use App\Models\Product;
use Database\Seeders\CatalogSeeder;

beforeEach(function () {
    $this->seed(CatalogSeeder::class);
});

test('each product is designed in the layout of its own shape', function (string $productSlug, TemplateLayout $layout) {
    $product = Product::query()->where('slug', $productSlug)->sole();

    expect($product->designLayout())->toBe($layout);
})->with([
    'acrylic keychain' => ['personalized-acrylic-keychain', TemplateLayout::Polaroid],
    'mini CD' => ['mini-cd-album-keychain', TemplateLayout::MiniCd],
    'music player' => ['music-player-acrylic-keychain', TemplateLayout::MusicPlayer],
    'photo strip' => ['photobooth-strip-keychain', TemplateLayout::PhotoStrip],
    'tap tag' => ['nfc-social-tap-tag', TemplateLayout::TapTag],
    'wooden' => ['engraved-wooden-keychain', TemplateLayout::Engraved],
    'die-cut' => ['die-cut-photo-keychain', TemplateLayout::DieCut],
    'calendar' => ['pinoy-calendar-keychain', TemplateLayout::Calendar],
]);

test('re-seeding a live catalog keeps the studio edits and only adds missing records', function () {
    $edited = Product::query()->where('slug', 'mini-cd-album-keychain')->sole();
    $edited->update(['name' => 'Renamed by the studio', 'base_price' => 12345]);
    $edited->options()->where('name', 'Extra printed disc')->delete();
    $edited->categories()->detach(Category::query()->where('slug', 'couple-gifts')->sole());

    $paymentMethod = PaymentMethod::query()->where('code', 'cod')->sole();
    $paymentMethod->update(['instructions' => 'Edited by the studio']);

    Product::query()->where('slug', 'pinoy-calendar-keychain')->sole()->delete();

    $this->seed(CatalogSeeder::class);

    $edited->refresh();

    expect($edited->name)->toBe('Renamed by the studio')
        ->and($edited->base_price)->toBe(12345)
        ->and($edited->options()->where('name', 'Extra printed disc')->exists())->toBeFalse()
        ->and($edited->categories()->where('slug', 'couple-gifts')->exists())->toBeFalse()
        ->and($paymentMethod->refresh()->instructions)->toBe('Edited by the studio');

    $restored = Product::query()->where('slug', 'pinoy-calendar-keychain')->sole();

    expect($restored->categories()->count())->toBeGreaterThan(0);
});

test('the seeder can run twice without duplicating the catalog', function () {
    $products = Product::count();

    $this->seed(CatalogSeeder::class);

    expect(Product::count())->toBe($products);
});
