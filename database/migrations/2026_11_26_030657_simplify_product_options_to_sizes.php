<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Customers now only pick a size. Every other option (shape, material,
 * thickness, color, packaging, add-ons) is switched off, and each product's
 * sizes are renamed Small / Medium / Large from cheapest to priciest. Orders
 * keep a snapshot of the names they were placed with, so past orders are
 * unaffected. Options are deactivated rather than deleted so the studio can
 * turn any of them back on from Admin → Products.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('product_options')
            ->where('group', '!=', 'size')
            ->where('is_active', true)
            ->update(['is_active' => false, 'updated_at' => now()]);

        DB::table('product_options')
            ->where('group', 'size')
            ->where('is_active', true)
            ->orderBy('price_modifier')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'product_id'])
            ->groupBy('product_id')
            ->each(function ($sizes): void {
                $names = match ($sizes->count()) {
                    1 => ['Standard'],
                    2 => ['Small', 'Large'],
                    3 => ['Small', 'Medium', 'Large'],
                    default => null,
                };

                if ($names === null) {
                    return;
                }

                $sizes->values()->each(function ($size, int $index) use ($names): void {
                    DB::table('product_options')
                        ->where('id', $size->id)
                        ->update(['name' => $names[$index], 'updated_at' => now()]);
                });
            });
    }

    /**
     * Reverse the migrations. The old names are not kept, so rename or turn
     * options back on from Admin → Products.
     */
    public function down(): void
    {
        //
    }
};
