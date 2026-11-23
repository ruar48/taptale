<?php

use App\Enums\OptionGroup;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductOption;

function runKeychainWebsiteMigration(): void
{
    $migration = require database_path('migrations/2026_11_23_173441_include_website_with_every_keychain.php');
    $migration->up();
}

test('every keychain includes the website and the paid NFC upgrade is retired', function () {
    $keychain = Product::factory()->create(['name' => 'Personalized Acrylic Keychain']);
    $noNfc = ProductOption::factory()->for($keychain)->group(OptionGroup::Nfc)->create(['is_default' => true]);
    $addNfc = ProductOption::factory()->for($keychain)->group(OptionGroup::Nfc)->costing(15000)->create(['enables_digital_experience' => true]);
    $size = ProductOption::factory()->for($keychain)->group(OptionGroup::Size)->create();
    $plaque = Product::factory()->create(['name' => 'Teacher Appreciation Plaque']);

    runKeychainWebsiteMigration();

    expect($keychain->fresh()->has_digital_experience)->toBeTrue()
        ->and($noNfc->fresh()->is_active)->toBeFalse()
        ->and($addNfc->fresh()->is_active)->toBeFalse()
        ->and($size->fresh()->is_active)->toBeTrue()
        ->and($plaque->fresh()->has_digital_experience)->toBeFalse();
});

test('open keychain orders placed without the upgrade get their website', function () {
    $keychain = Product::factory()->create(['name' => 'Personalized Acrylic Keychain']);
    $open = Order::factory()->for($keychain)->create([
        'status' => OrderStatus::PendingDesign,
        'personalization' => ['names' => 'Ana & Leo', 'date' => '02 · 14 · 2026'],
    ]);
    $completed = Order::factory()->for($keychain)->status(OrderStatus::Completed)->create();
    $otherProduct = Order::factory()->create();

    runKeychainWebsiteMigration();

    $website = $open->fresh()->experience;

    expect($website)->not->toBeNull()
        ->and($website->title)->toBe('Ana & Leo')
        ->and($website->event_date)->toBe('02 · 14 · 2026')
        ->and($website->user_id)->toBe($open->user_id)
        ->and($completed->fresh()->experience)->toBeNull()
        ->and($otherProduct->fresh()->experience)->toBeNull();
});
