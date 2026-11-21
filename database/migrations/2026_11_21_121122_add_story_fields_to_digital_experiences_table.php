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
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->string('template')->default('classic')->after('code');
            $table->string('recipient_name')->nullable()->after('subtitle');
            $table->string('sender_name')->nullable()->after('recipient_name');
            $table->string('quote')->nullable()->after('message');
            $table->text('flowers_note')->nullable()->after('quote');
            $table->string('song_title')->nullable()->after('music_url');
            $table->string('song_artist')->nullable()->after('song_title');
            $table->string('audio_path')->nullable()->after('song_artist');
            $table->json('moments')->nullable()->after('photos');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->dropColumn([
                'template', 'recipient_name', 'sender_name', 'quote', 'flowers_note',
                'song_title', 'song_artist', 'audio_path', 'moments',
            ]);
        });
    }
};
