<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The frame the page video plays in: plain, polaroid, film reel, retro TV,
 * hearts, cinema or phone.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->string('video_frame', 20)->default('plain')->after('video_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->dropColumn('video_frame');
        });
    }
};
