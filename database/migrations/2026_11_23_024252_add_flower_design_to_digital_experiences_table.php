<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The flower designs (one bouquet, nine glowing gardens and five flower
 * rains) become a single "digital_bouquet" template whose flowers and rain
 * are chosen on the page. Existing pages keep exactly the look they had.
 */
return new class extends Migration
{
    /**
     * Former flower templates and the flowers and rain they showed.
     *
     * @var array<string, array{0: string, 1: string}>
     */
    private const LEGACY_TEMPLATES = [
        'night_garden' => ['teal', 'none'],
        'pink_garden' => ['pink', 'none'],
        'lavender_garden' => ['lavender', 'none'],
        'golden_garden' => ['golden', 'none'],
        'red_garden' => ['red', 'none'],
        'moonlight_garden' => ['white', 'none'],
        'blue_garden' => ['blue', 'none'],
        'peach_garden' => ['peach', 'none'],
        'mixed_garden' => ['mixed', 'none'],
        'rain_teal' => ['teal', 'both'],
        'rain_pink' => ['pink', 'both'],
        'rain_red' => ['red', 'both'],
        'rain_lavender' => ['lavender', 'both'],
        'rain_mixed' => ['mixed', 'both'],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->string('flower_style', 20)->default('bouquet')->after('flowers_note');
            $table->string('flower_rain', 20)->default('none')->after('flower_style');
        });

        foreach (self::LEGACY_TEMPLATES as $template => [$style, $rain]) {
            DB::table('digital_experiences')
                ->where('template', $template)
                ->update(['template' => 'digital_bouquet', 'flower_style' => $style, 'flower_rain' => $rain]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (self::LEGACY_TEMPLATES as $template => [$style, $rain]) {
            DB::table('digital_experiences')
                ->where('template', 'digital_bouquet')
                ->where('flower_style', $style)
                ->where('flower_rain', $rain)
                ->update(['template' => $template]);
        }

        Schema::table('digital_experiences', function (Blueprint $table) {
            $table->dropColumn(['flower_style', 'flower_rain']);
        });
    }
};
