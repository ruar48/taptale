<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Customers now design only their website, so the design-proof steps are
 * gone. Orders still sitting in one of them move to "Pending", ready for
 * production.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('orders')
            ->whereIn('status', ['design_in_progress', 'awaiting_customer_approval', 'revision_requested', 'design_approved'])
            ->update(['status' => 'pending_design', 'updated_at' => now()]);
    }

    /**
     * Reverse the migrations. The earlier design step is not kept.
     */
    public function down(): void
    {
        //
    }
};
