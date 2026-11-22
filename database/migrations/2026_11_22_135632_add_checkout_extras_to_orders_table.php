<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('promo_code_id')->nullable()->after('adjustment_note')->constrained()->nullOnDelete();
            $table->string('promo_code', 40)->nullable()->after('promo_code_id');
            $table->unsignedInteger('discount')->default(0)->after('promo_code');
            $table->boolean('is_gift')->default(false)->after('customer_notes');
            $table->text('gift_message')->nullable()->after('is_gift');
            $table->string('tracking_url', 500)->nullable()->after('tracking_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('promo_code_id');
            $table->dropColumn(['promo_code', 'discount', 'is_gift', 'gift_message', 'tracking_url']);
        });
    }
};
