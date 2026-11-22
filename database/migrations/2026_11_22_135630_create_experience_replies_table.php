<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Private notes a recipient leaves on a memory page for its owner.
     */
    public function up(): void
    {
        Schema::create('experience_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('digital_experience_id')->constrained()->cascadeOnDelete();
            $table->string('name', 80)->nullable();
            $table->text('message');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('experience_replies');
    }
};
