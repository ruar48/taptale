<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The photo the owner put in each frame of the page design's own sections
 * (the cover, film strip, scrapbook…), so one photo no longer fills the
 * first frame of every section.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->json('photo_frames')->nullable()->after('custom_sections');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->dropColumn('photo_frames');
        });
    }
};
