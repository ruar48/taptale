<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Orders the studio takes in person or over chat (walk-in, Messenger) belong
 * to no customer account, so their order and memory page may have no owner.
 * The customer reviews the design through a private approval link instead.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
            $table->string('channel', 20)->default('website')->after('user_id');
            $table->string('approval_token', 64)->nullable()->unique()->after('channel');
        });

        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['approval_token']);
            $table->dropColumn(['channel', 'approval_token']);
        });
    }
};
