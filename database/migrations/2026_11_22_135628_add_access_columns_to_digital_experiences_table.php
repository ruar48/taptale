<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * "access_key" is the secret written into the NFC tag and QR code. A
     * visitor without it (or without a session that already used it) gets
     * a 404, so a copied page URL cannot be shared.
     */
    public function up(): void
    {
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->string('access_key', 40)->nullable()->unique()->after('code');
            $table->timestamp('unlocks_at')->nullable()->after('is_published');
            $table->unsignedInteger('heart_count')->default(0)->after('view_count');
        });

        DB::table('digital_experiences')->whereNull('access_key')->orderBy('id')->each(function (object $experience): void {
            DB::table('digital_experiences')
                ->where('id', $experience->id)
                ->update(['access_key' => Str::random(32)]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->dropUnique(['access_key']);
            $table->dropColumn(['access_key', 'unlocks_at', 'heart_count']);
        });
    }
};
