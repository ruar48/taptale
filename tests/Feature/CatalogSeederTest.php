<?php

use App\Enums\TemplateLayout;
use App\Models\Product;
use App\Models\Template;
use Database\Seeders\CatalogSeeder;

beforeEach(function () {
    $this->seed(CatalogSeeder::class);
});

test('every product offers at least one template in each of its occasions', function () {
    Product::query()->with('categories')->get()->each(function (Product $product): void {
        foreach ($product->categories as $category) {
            $available = Template::active()->availableFor($category, $product)->count();

            expect($available)->toBeGreaterThan(0, "{$product->name} has no templates in {$category->name}");
        }
    });
});

test('templates are only offered for the product shape they were designed for', function (string $productSlug, TemplateLayout $layout) {
    $product = Product::query()->where('slug', $productSlug)->with('categories')->sole();

    foreach ($product->categories as $category) {
        $layouts = Template::active()->availableFor($category, $product)->pluck('layout')->unique();

        expect($layouts->all())->toBe([$layout]);
    }
})->with([
    'mini CD' => ['mini-cd-album-keychain', TemplateLayout::MiniCd],
    'music player' => ['music-player-acrylic-keychain', TemplateLayout::MusicPlayer],
    'photo strip' => ['photobooth-strip-keychain', TemplateLayout::PhotoStrip],
    'tap tag' => ['nfc-social-tap-tag', TemplateLayout::TapTag],
    'wooden' => ['engraved-wooden-keychain', TemplateLayout::Engraved],
    'die-cut' => ['die-cut-photo-keychain', TemplateLayout::DieCut],
]);

test('the seeder can run twice without duplicating the catalog', function () {
    $products = Product::count();
    $templates = Template::count();

    $this->seed(CatalogSeeder::class);

    expect(Product::count())->toBe($products)
        ->and(Template::count())->toBe($templates);
});
