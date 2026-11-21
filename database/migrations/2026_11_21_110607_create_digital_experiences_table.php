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
        Schema::create('digital_experiences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('code', 16)->unique();
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->text('message')->nullable();
            $table->string('event_date')->nullable();
            $table->string('video_url')->nullable();
            $table->string('music_url')->nullable();
            $table->json('photos')->nullable();
            $table->string('theme')->default('blush');
            $table->string('nfc_tag_uid')->nullable()->unique();
            $table->boolean('is_published')->default(false);
            $table->unsignedInteger('view_count')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('digital_experiences');
    }
};
