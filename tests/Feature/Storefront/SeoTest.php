<?php

use App\Models\Category;
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

test('the homepage tells search engines which towns the shop delivers to', function () {
    $occasion = Category::factory()->create(['name' => 'Travel Keepsakes', 'is_active' => true]);
    $hidden = Category::factory()->create(['is_active' => false]);

    config([
        'taptale.business.town' => 'Binalonan',
        'taptale.business.province' => 'Pangasinan',
        'taptale.business.service_area' => ['Binalonan', 'Urdaneta City'],
    ]);

    $this->get(route('home'))
        ->assertOk()
        ->assertSee('<title>Taptale | NFC Keychains &amp; Photo Gifts in Binalonan</title>', false)
        ->assertSee('Delivery in Binalonan &amp; nearby', false)
        ->assertSee('<li class="rounded-full bg-white/80 px-3 py-1 text-sm text-plum dark:bg-background dark:text-blush">Urdaneta City</li>', false)
        ->assertSee('href="'.route('pages.shipping').'"', false)
        ->assertSee('"@type":"Store"', false)
        ->assertSee('"addressLocality":"Binalonan"', false)
        ->assertSee('{"@type":"City","name":"Urdaneta City, Pangasinan"}', false)
        ->assertSee('<h3 class="font-display text-lg leading-snug sm:text-xl">Where do you deliver?</h3>', false)
        ->assertSee('"@type":"FAQPage"', false)
        ->assertSee('"text":"For now we deliver to Binalonan and nearby towns and cities in Pangasinan: Urdaneta City.', false)
        ->assertSee('<a href="'.route('categories.show', $occasion).'"', false)
        ->assertDontSee(route('categories.show', $hidden), false)
        ->assertDontSee('Nationwide');
});

test('occasion pages target searches from the studio town', function () {
    config(['taptale.business.town' => 'Binalonan']);
    $category = Category::factory()->create(['name' => 'Graduation Gifts', 'is_active' => true]);

    $this->get(route('categories.show', $category))
        ->assertOk()
        ->assertSee('<title>Taptale | Graduation Gifts in Binalonan</title>', false);
});

test('llms.txt describes the shop, its delivery area and active products for AI assistants', function () {
    config([
        'taptale.business.town' => 'Binalonan',
        'taptale.business.service_area' => ['Binalonan', 'Urdaneta City'],
    ]);
    $listed = Product::factory()->create(['name' => 'NFC Memory Keychain & Card', 'base_price' => 34900]);
    $hidden = Product::factory()->inactive()->create();

    $this->get(route('llms'))
        ->assertOk()
        ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
        ->assertSee('Delivers to: Binalonan, Urdaneta City', false)
        ->assertSee('[NFC Memory Keychain & Card]('.route('products.show', $listed).'): from ₱349.', false)
        ->assertSee('### Where do you deliver?', false)
        ->assertDontSee(route('products.show', $hidden), false);
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
