<?php

use App\Models\DigitalExperience;
use App\Models\Product;

test('a product page renders its meta tags and price for search engines', function () {
    $product = Product::factory()->create([
        'name' => 'NFC Memory Keychain',
        'short_description' => 'Tap to open a page of your photos.',
        'base_price' => 129900,
    ]);

    $this->get(route('products.show', $product).'?category=couple-gifts')
        ->assertOk()
        ->assertSee('<title>Taptale | NFC Memory Keychain</title>', false)
        ->assertSee('<meta name="description" content="Tap to open a page of your photos.">', false)
        ->assertSee('<link rel="canonical" href="'.route('products.show', $product).'">', false)
        ->assertSee('<meta name="robots" content="index, follow, max-image-preview:large">', false)
        ->assertSee('"@type":"Product"', false)
        ->assertSee('"price":"1299.00"', false);
});

test('private memory pages are kept out of search engines', function () {
    $experience = DigitalExperience::factory()->create();
    tapTag($experience);

    $this->get(route('experiences.show', $experience))
        ->assertOk()
        ->assertSee('<meta name="robots" content="noindex, nofollow">', false)
        ->assertDontSee('rel="canonical"', false);
});

test('the sitemap lists active products but not hidden ones or memory pages', function () {
    $listed = Product::factory()->create();
    $hidden = Product::factory()->inactive()->create();
    $experience = DigitalExperience::factory()->create();

    $this->get(route('sitemap'))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
        ->assertSee('<loc>'.route('products.show', $listed).'</loc>', false)
        ->assertDontSee(route('products.show', $hidden), false)
        ->assertDontSee(route('experiences.show', $experience), false);
});
