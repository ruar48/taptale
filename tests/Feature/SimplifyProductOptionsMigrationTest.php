<?php

use App\Enums\OptionGroup;
use App\Models\Product;
use App\Models\ProductOption;

function runSimplifyProductOptionsMigration(): void
{
    $migration = require database_path('migrations/2026_11_26_030657_simplify_product_options_to_sizes.php');
    $migration->up();
}

test('only sizes stay on and they are renamed small, medium and large by price', function () {
    $keychain = Product::factory()->create();
    $statement = ProductOption::factory()->for($keychain)->group(OptionGroup::Size)->costing(4500)->create(['name' => 'Statement (70 mm)', 'sort_order' => 0]);
    $petite = ProductOption::factory()->for($keychain)->group(OptionGroup::Size)->create(['name' => 'Petite (45 mm)', 'sort_order' => 1]);
    $classic = ProductOption::factory()->for($keychain)->group(OptionGroup::Size)->costing(2000)->create(['name' => 'Classic (55 mm)', 'sort_order' => 2]);
    $shape = ProductOption::factory()->for($keychain)->group(OptionGroup::Shape)->create();
    $packaging = ProductOption::factory()->for($keychain)->group(OptionGroup::Packaging)->create();

    $plaque = Product::factory()->create();
    $plaqueSmall = ProductOption::factory()->for($plaque)->group(OptionGroup::Size)->create(['name' => '5 × 7 in']);
    $plaqueLarge = ProductOption::factory()->for($plaque)->group(OptionGroup::Size)->costing(12000)->create(['name' => '8 × 10 in']);

    runSimplifyProductOptionsMigration();

    expect($petite->fresh()->name)->toBe('Small')
        ->and($classic->fresh()->name)->toBe('Medium')
        ->and($statement->fresh()->name)->toBe('Large')
        ->and($statement->fresh()->is_active)->toBeTrue()
        ->and($shape->fresh()->is_active)->toBeFalse()
        ->and($packaging->fresh()->is_active)->toBeFalse()
        ->and($plaqueSmall->fresh()->name)->toBe('Small')
        ->and($plaqueLarge->fresh()->name)->toBe('Large');
});
