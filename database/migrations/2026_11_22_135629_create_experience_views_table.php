<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * One row per tap or scan (once per visitor session). No IP address or
     * other personal data is kept, only the moment and the device type.
     */
    public function up(): void
    {
        Schema::create('experience_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('digital_experience_id')->constrained()->cascadeOnDelete();
            $table->string('device', 10);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['digital_experience_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('experience_views');
    }
};
