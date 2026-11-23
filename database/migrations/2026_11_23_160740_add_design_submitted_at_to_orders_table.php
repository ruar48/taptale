<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * When the customer handed their photos and details to the studio ("send to
 * Taptale") instead of finishing the design themselves. Orders that already
 * came with a design brief from checkout count as handed over.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('design_submitted_at')->nullable()->after('preview_approved_at');
        });

        DB::table('orders')
            ->where('design_mode', 'assisted')
            ->whereNull('preview_approved_at')
            ->orderBy('id')
            ->chunkById(200, function ($orders): void {
                foreach ($orders as $order) {
                    $personalization = json_decode((string) $order->personalization, true);

                    if (is_array($personalization) && trim((string) ($personalization['design_brief'] ?? '')) !== '') {
                        DB::table('orders')->where('id', $order->id)->update(['design_submitted_at' => $order->created_at]);
                    }
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('design_submitted_at');
        });
    }
};
