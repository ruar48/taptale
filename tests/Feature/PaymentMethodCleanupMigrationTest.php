<?php

use App\Models\PaymentMethod;

test('checkout is left with only QR Ph and cash on delivery, QR Ph first', function () {
    $gcash = PaymentMethod::factory()->create(['code' => 'gcash', 'sort_order' => 0]);
    $hostedCheckout = PaymentMethod::factory()->create(['driver' => 'paymongo', 'sort_order' => 1]);
    $cashOnDelivery = PaymentMethod::factory()->create(['driver' => 'cod', 'sort_order' => 0]);
    $qrPh = PaymentMethod::factory()->inactive()->create(['driver' => 'paymongo_qrph', 'sort_order' => 3]);

    $migration = require database_path('migrations/2026_11_23_155011_keep_only_qrph_and_cod_payment_methods.php');
    $migration->up();

    expect(PaymentMethod::active()->pluck('id')->all())->toBe([$qrPh->id, $cashOnDelivery->id])
        ->and($gcash->fresh()->is_active)->toBeFalse()
        ->and($hostedCheckout->fresh()->is_active)->toBeFalse();
});
