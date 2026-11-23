<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * A share link opens a memory page for anyone it is sent to until it
     * expires. Only a visitor who tapped the genuine tag can make one, so a
     * lost keychain cannot be replaced by a copied link.
     */
    public function up(): void
    {
        Schema::create('experience_share_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('digital_experience_id')->constrained()->cascadeOnDelete();
            $table->string('token', 40)->unique();
            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('experience_share_links');
    }
};
