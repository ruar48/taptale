<?php

use App\Models\DigitalExperience;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A readable address for each page, made from its title ("Zen & Megi" →
 * /t/zen-and-megi). The random code keeps working, so tags that were
 * already programmed still open their page.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->string('slug', 80)->nullable()->unique()->after('code');
        });

        DB::table('digital_experiences')->orderBy('id')->get(['id', 'title'])->each(function (object $page): void {
            DB::table('digital_experiences')
                ->where('id', $page->id)
                ->update(['slug' => DigitalExperience::uniqueSlug((string) $page->title, $page->id)]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};
