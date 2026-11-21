<?php

namespace App\Http\Controllers\Storefront;

use App\Actions\DigitalExperiences\BuildDemoExperience;
use App\Actions\DigitalExperiences\RenderQrCode;
use App\Enums\ExperienceTemplate;
use App\Http\Controllers\Controller;
use App\Http\Resources\DigitalExperienceResource;
use App\Models\DigitalExperience;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The public NFC / QR destination page: taptale.com/t/{code}, plus the
 * template gallery and demos customers can explore before buying.
 */
class ExperienceController extends Controller
{
    /**
     * Gallery of memory page templates.
     */
    public function templates(): Response
    {
        return Inertia::render('storefront/memory-pages', [
            'templates' => ExperienceTemplate::options(),
        ]);
    }

    /**
     * A live demo of one memory page template with sample content.
     */
    public function demo(string $template, BuildDemoExperience $buildDemo): Response
    {
        $experienceTemplate = ExperienceTemplate::tryFrom($template);

        abort_if($experienceTemplate === null, 404);

        return Inertia::render('storefront/experience', [
            'experience' => $buildDemo->handle($experienceTemplate),
            'isPreview' => false,
            'isDemo' => true,
            'canEdit' => false,
        ]);
    }

    /**
     * Show the digital experience a tag or QR code points to.
     */
    public function show(Request $request, DigitalExperience $experience): Response
    {
        $canPreview = $request->user()?->can('view', $experience) ?? false;

        abort_unless($experience->is_published || $canPreview, 404);

        if ($experience->is_published && ! $canPreview) {
            $experience->increment('view_count');
        }

        return Inertia::render('storefront/experience', [
            'experience' => new DigitalExperienceResource($experience),
            'isPreview' => ! $experience->is_published,
            'isDemo' => false,
            'canEdit' => $request->user()?->can('update', $experience) ?? false,
        ]);
    }

    /**
     * Stream one of the experience photos.
     */
    public function photo(Request $request, DigitalExperience $experience, int $index): StreamedResponse
    {
        $this->ensureVisible($request, $experience);

        $path = $experience->photos[$index] ?? null;

        abort_if($path === null, 404);

        return Storage::disk(config('taptale.uploads_disk'))->response($path, headers: [
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Stream the uploaded background song.
     */
    public function audio(Request $request, DigitalExperience $experience): StreamedResponse
    {
        $this->ensureVisible($request, $experience);

        abort_if($experience->audio_path === null, 404);

        return Storage::disk(config('taptale.uploads_disk'))->response($experience->audio_path, headers: [
            'Cache-Control' => 'private, max-age=3600',
            'Accept-Ranges' => 'bytes',
        ]);
    }

    /**
     * The QR code (SVG) pointing to the experience.
     */
    public function qr(Request $request, DigitalExperience $experience, RenderQrCode $renderQrCode): HttpResponse
    {
        $svg = $renderQrCode->handle($experience->publicUrl());

        $headers = ['Content-Type' => 'image/svg+xml', 'Cache-Control' => 'public, max-age=86400'];

        if ($request->boolean('download')) {
            $headers['Content-Disposition'] = 'attachment; filename="taptale-'.$experience->code.'-qr.svg"';
        }

        return response($svg, 200, $headers);
    }

    private function ensureVisible(Request $request, DigitalExperience $experience): void
    {
        $canPreview = $request->user()?->can('view', $experience) ?? false;

        abort_unless($experience->is_published || $canPreview, 404);
    }
}
