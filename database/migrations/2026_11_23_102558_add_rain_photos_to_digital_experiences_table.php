<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Photos chosen to rain down over the flowers, kept apart from the page
 * photos so they do not fill the gallery frames.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->json('rain_photos')->nullable()->after('photos');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->dropColumn('rain_photos');
        });
    }
};
