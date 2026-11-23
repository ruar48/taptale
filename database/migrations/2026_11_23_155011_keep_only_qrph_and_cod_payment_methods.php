<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Checkout offers only QR Ph (which already covers GCash, Maya, MariBank and
 * every bank app) and cash on delivery. The old receipt-upload methods are
 * deactivated rather than deleted, so past orders keep their method name.
 */
return new class extends Migration
{
    /**
     * The drivers customers can choose, in checkout order.
     *
     * @var list<string>
     */
    private const KEPT_DRIVERS = ['paymongo_qrph', 'cod'];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('payment_methods')
            ->whereNotIn('driver', self::KEPT_DRIVERS)
            ->update(['is_active' => false, 'updated_at' => now()]);

        foreach (self::KEPT_DRIVERS as $sortOrder => $driver) {
            DB::table('payment_methods')
                ->where('driver', $driver)
                ->update(['is_active' => true, 'sort_order' => $sortOrder, 'updated_at' => now()]);
        }
    }

    /**
     * Reverse the migrations. Which old methods were active is not known, so
     * they stay off; turn any back on from Admin → Payment methods.
     */
    public function down(): void
    {
        //
    }
};
