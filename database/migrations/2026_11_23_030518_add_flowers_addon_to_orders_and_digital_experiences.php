<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The blooming flowers can be added to any memory page design for a small
 * fee at checkout ("A Bouquet For You" already includes them).
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedInteger('flowers_fee')->default(0)->after('customization_fee');
        });

        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->boolean('flower_addon')->default(false)->after('flower_rain');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('flowers_fee');
        });

        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->dropColumn('flower_addon');
        });
    }
};
