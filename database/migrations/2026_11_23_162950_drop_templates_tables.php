<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Each product is its own design, so the separate design templates are gone.
 * Orders keep the template name they were placed with, so older orders still
 * show which design the customer picked.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('template_id');
        });

        Schema::dropIfExists('product_template');
        Schema::dropIfExists('category_template');
        Schema::dropIfExists('templates');
    }

    /**
     * Reverse the migrations. The tables come back empty; the deleted
     * templates are not restored.
     */
    public function down(): void
    {
        Schema::create('templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->string('layout');
            $table->json('palette');
            $table->string('preview_path')->nullable();
            $table->string('mockup_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('category_template', function (Blueprint $table) {
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('template_id')->constrained()->cascadeOnDelete();
            $table->primary(['category_id', 'template_id']);
        });

        Schema::create('product_template', function (Blueprint $table) {
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('template_id')->constrained()->cascadeOnDelete();
            $table->primary(['product_id', 'template_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('template_id')->nullable()->after('product_id')->constrained()->nullOnDelete();
        });
    }
};
