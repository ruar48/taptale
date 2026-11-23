<?php

use App\Models\PromoCode;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * "promo_identity" is the customer's email reduced to the inbox it
     * reaches (no +tag, no Gmail dots, googlemail as gmail), so many alias
     * accounts behind one inbox count as one customer for a one-use promo.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('promo_identity')->nullable()->after('promo_code');
            $table->index(['promo_code_id', 'promo_identity']);
        });

        DB::table('orders')
            ->join('users', 'users.id', '=', 'orders.user_id')
            ->whereNotNull('orders.promo_code_id')
            ->select('orders.id', 'users.email')
            ->orderBy('orders.id')
            ->each(function (object $order): void {
                DB::table('orders')
                    ->where('id', $order->id)
                    ->update(['promo_identity' => PromoCode::customerIdentity($order->email)]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['promo_code_id', 'promo_identity']);
            $table->dropColumn('promo_identity');
        });
    }
};
