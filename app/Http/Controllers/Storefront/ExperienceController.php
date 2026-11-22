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
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

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
            'seo' => [
                'title' => 'Memory Page Designs',
                'description' => 'Explore memory page designs — the page your loved one sees when they tap the NFC keychain or scan the QR code. Photos, videos, music and your message.',
            ],
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
            'seo' => [
                'title' => "{$experienceTemplate->label()} memory page demo",
                'description' => $experienceTemplate->description(),
            ],
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

        $canEdit = $request->user()?->can('update', $experience) ?? false;

        return Inertia::render('storefront/experience', [
            'experience' => new DigitalExperienceResource($experience),
            'isPreview' => ! $experience->is_published,
            'isDemo' => false,
            'canEdit' => $canEdit,
            'designOptions' => $canEdit ? [
                'templates' => ExperienceTemplate::options(),
                'themes' => DigitalExperience::THEMES,
                'isTemplateLocked' => $experience->isTemplateLocked(),
            ] : null,
        ]);
    }

    /**
     * Stream one of the experience photos.
     */
    public function photo(Request $request, DigitalExperience $experience, int $index): SymfonyResponse
    {
        $this->ensureVisible($request, $experience);

        $path = $experience->photos[$index] ?? null;

        abort_if($path === null, 404);

        return $this->serveUpload($path, [
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Stream the uploaded background song.
     */
    public function audio(Request $request, DigitalExperience $experience): SymfonyResponse
    {
        $this->ensureVisible($request, $experience);

        abort_if($experience->audio_path === null, 404);

        return $this->serveUpload($experience->audio_path, [
            'Cache-Control' => 'private, max-age=3600',
            'Accept-Ranges' => 'bytes',
        ]);
    }

    /**
     * Serve a private upload. Object storage (R2 / S3) gets a redirect to a
     * short-lived signed URL so the browser downloads straight from the
     * bucket; local disks are streamed through the app.
     *
     * @param  array<string, string>  $headers
     */
    private function serveUpload(string $path, array $headers): SymfonyResponse
    {
        $diskName = (string) config('taptale.uploads_disk');

        if (config("filesystems.disks.{$diskName}.driver") === 's3') {
            return redirect()->away(
                Storage::disk($diskName)->temporaryUrl($path, now()->addHour())
            )->header('Cache-Control', 'private, max-age=3000');
        }

        return Storage::disk($diskName)->response($path, headers: $headers);
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
