<?php

use App\Enums\OptionGroup;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\Template;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
});

test('customers cannot access the admin dashboard', function () {
    $this->actingAs(User::factory()->create())->get(route('admin.dashboard'))->assertForbidden();
    $this->actingAs(User::factory()->create())->post(route('admin.products.store'), [])->assertForbidden();
});

test('admins land on the admin dashboard', function () {
    $this->actingAs($this->admin)->get(route('dashboard'))->assertRedirect(route('admin.dashboard'));
    $this->actingAs($this->admin)->get(route('admin.dashboard'))->assertOk();
});

test('an admin creates a product with prices entered in pesos', function () {
    $category = Category::factory()->create();

    $this->actingAs($this->admin)->post(route('admin.products.store'), [
        'name' => 'Heart Keychain',
        'slug' => '',
        'art_style' => 'acrylic',
        'base_price' => '149.50',
        'design_fee' => '50',
        'production_days_min' => 3,
        'production_days_max' => 5,
        'min_quantity' => 1,
        'max_quantity' => 100,
        'max_photos' => 2,
        'sort_order' => 0,
        'is_active' => true,
        'category_ids' => [$category->id],
    ])->assertSessionHasNoErrors();

    $product = Product::sole();

    expect($product)
        ->slug->toBe('heart-keychain')
        ->base_price->toBe(14950)
        ->design_fee->toBe(5000)
        ->and($product->categories->modelKeys())->toBe([$category->id]);
});

test('a product needs at least one category', function () {
    $this->actingAs($this->admin)->post(route('admin.products.store'), [
        'name' => 'Orphan',
        'art_style' => 'acrylic',
        'base_price' => '100',
        'design_fee' => '0',
        'production_days_min' => 3,
        'production_days_max' => 5,
        'min_quantity' => 1,
        'max_quantity' => 10,
        'max_photos' => 1,
        'sort_order' => 0,
        'category_ids' => [],
    ])->assertSessionHasErrors(['category_ids' => 'Assign the product to at least one category.']);
});

test('setting a default option clears the previous default in the group', function () {
    $product = Product::factory()->create();
    $previous = ProductOption::factory()->for($product)->group(OptionGroup::Size)->create(['is_default' => true]);

    $this->actingAs($this->admin)->post(route('admin.products.options.store', $product), [
        'group' => 'size',
        'name' => 'Large',
        'price_modifier' => '45',
        'is_default' => true,
        'is_active' => true,
        'sort_order' => 1,
    ])->assertSessionHasNoErrors();

    $created = $product->options()->where('name', 'Large')->sole();

    expect($created->price_modifier)->toBe(4500)
        ->and($created->is_default)->toBeTrue()
        ->and($previous->fresh()->is_default)->toBeFalse();
});

test('an option cannot be edited through another product', function () {
    $option = ProductOption::factory()->create();
    $otherProduct = Product::factory()->create();

    $this->actingAs($this->admin)
        ->delete(route('admin.products.options.destroy', [$otherProduct, $option]))
        ->assertNotFound();

    expect($option->fresh())->not->toBeNull();
});

test('an admin creates a template assigned to categories', function () {
    $category = Category::factory()->create();

    $this->actingAs($this->admin)->post(route('admin.templates.store'), [
        'name' => 'Golden Hour',
        'layout' => 'polaroid',
        'palette' => ['background' => '#FFFFFF', 'ink' => '#000000', 'accent' => '#B86F83'],
        'is_active' => true,
        'sort_order' => 0,
        'category_ids' => [$category->id],
    ])->assertSessionHasNoErrors();

    $template = Template::sole();

    expect($template->slug)->toBe('golden-hour')
        ->and($template->categories->modelKeys())->toBe([$category->id]);
});

test('an admin creates and updates a category', function () {
    $this->actingAs($this->admin)->post(route('admin.categories.store'), [
        'name' => 'Pet Lovers',
        'accent_color' => '#B86F83',
        'icon' => 'heart',
        'sort_order' => 3,
        'is_active' => true,
    ])->assertSessionHasNoErrors();

    $category = Category::sole();
    expect($category->slug)->toBe('pet-lovers');

    $this->actingAs($this->admin)->put(route('admin.categories.update', $category), [
        'name' => 'Pet Lovers',
        'slug' => 'pet-lovers',
        'accent_color' => '#713D50',
        'icon' => 'heart',
        'sort_order' => 3,
        'is_active' => false,
    ])->assertSessionHasNoErrors();

    expect($category->fresh())->is_active->toBeFalse()->accent_color->toBe('#713D50');
});
