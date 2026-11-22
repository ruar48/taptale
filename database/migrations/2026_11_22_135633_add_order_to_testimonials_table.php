<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Customer reviews are testimonials tied to the delivered order they
     * describe: one review per order, published after an admin approves it.
     */
    public function up(): void
    {
        Schema::table('testimonials', function (Blueprint $table) {
            $table->foreignId('order_id')->nullable()->unique()->after('id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->after('order_id')->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('testimonials', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropUnique(['order_id']);
            $table->dropConstrainedForeignId('order_id');
        });
    }
};
