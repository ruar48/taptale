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
        Schema::table('payments', function (Blueprint $table) {
            $table->string('gateway_checkout_id')->nullable()->unique()->after('reference_number');
            $table->string('gateway_payment_id')->nullable()->unique()->after('gateway_checkout_id');
            $table->text('checkout_url')->nullable()->after('gateway_payment_id');
            $table->text('qr_code')->nullable()->after('checkout_url');
            $table->timestamp('expires_at')->nullable()->after('qr_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique(['gateway_checkout_id']);
            $table->dropUnique(['gateway_payment_id']);
            $table->dropColumn(['gateway_checkout_id', 'gateway_payment_id', 'checkout_url', 'qr_code', 'expires_at']);
        });
    }
};
