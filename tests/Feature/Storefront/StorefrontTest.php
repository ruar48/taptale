<?php

use App\Models\Category;
use App\Models\Product;
use Inertia\Testing\AssertableInertia as Assert;

test('the homepage lists active categories and featured products', function () {
    Category::factory()->create(['name' => 'Couple Gifts', 'slug' => 'couple-gifts']);
    Category::factory()->inactive()->create();
    Product::factory()->create(['is_featured' => true]);
    Product::factory()->inactive()->create(['is_featured' => true]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/home')
            ->has('categories', 1)
            ->where('categories.0.slug', 'couple-gifts')
            ->has('featuredProducts', 1));
});

test('only the homepage ships a static hero for the first paint', function () {
    $this->get(route('home'))
        ->assertOk()
        ->assertSee('Every memory deserves to be <em', false);

    $this->get(route('categories.index'))
        ->assertOk()
        ->assertDontSee('Every memory deserves to be', false);
});

test('a category page shows only its active products', function () {
    $category = Category::factory()->create();
    $listed = Product::factory()->create();
    $hidden = Product::factory()->inactive()->create();
    $category->products()->attach([$listed->id, $hidden->id]);

    $this->get(route('categories.show', $category))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/categories/show')
            ->has('products', 1)
            ->where('products.0.id', $listed->id));
});

test('hidden categories and products are not found', function () {
    $this->get(route('categories.show', Category::factory()->inactive()->create()))->assertNotFound();
    $this->get(route('products.show', Product::factory()->inactive()->create()))->assertNotFound();
});

test('old links to the design templates gallery go to the gifts', function () {
    $this->get('/templates')->assertStatus(301)->assertRedirect(route('categories.index'));
});

test('a product page shows its active options', function () {
    $product = Product::factory()->create();
    $product->options()->createMany([
        ['group' => 'size', 'name' => 'Small', 'price_modifier' => 0],
        ['group' => 'size', 'name' => 'Retired', 'price_modifier' => 0, 'is_active' => false],
    ]);

    $this->get(route('products.show', $product))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/products/show')
            ->has('product.options', 1)
            ->where('product.options.0.name', 'Small'));
});
