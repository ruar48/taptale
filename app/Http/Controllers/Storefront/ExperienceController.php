<?php

namespace App\Http\Controllers\Storefront;

use App\Actions\DigitalExperiences\BuildDemoExperience;
use App\Actions\DigitalExperiences\RenderQrCode;
use App\Enums\ExperienceTemplate;
use App\Enums\FlowerRain;
use App\Enums\FlowerStyle;
use App\Http\Controllers\Controller;
use App\Http\Resources\DigitalExperienceResource;
use App\Models\DigitalExperience;
use App\Models\ExperienceShareLink;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * The NFC / QR destination page: taptale.com/t/{code}, plus the template
 * gallery and demos customers can explore before buying.
 *
 * A memory page opens from its NFC tag, its QR code or a share link. The
 * tag carries a secret "k" key plus the chip ID and tap count it mirrors on
 * every tap, so only the genuine Taptale tag opens the page that way (see
 * DigitalExperience::acceptsTap()). A tap unlocks the page for that browser
 * (its session plus an encrypted device cookie) and redirects to the clean
 * address, which opens nothing on another device.
 *
 * Whoever tapped the tag can share the page with a link that expires after
 * the days they choose. It opens the page for that session only, and its
 * visitors cannot make links of their own, so there is no lasting link to
 * stand in for a lost keychain: the owner orders a replacement.
 */
class ExperienceController extends Controller
{
    /**
     * Session key holding the ids of pages this visitor unlocked.
     */
    public const ACCESS_SESSION_KEY = 'experience_access';

    /**
     * Encrypted cookie that keeps a tapped page open on the same device after
     * the session ends, so a recipient who returns to the tab later (or waits
     * for a countdown) is not met with a 404. It is tied to the browser and
     * cannot be passed on by sharing a link.
     */
    public const ACCESS_COOKIE = 'taptale_pages';

    /**
     * How long, in minutes, the device remembers a tapped page.
     */
    private const ACCESS_COOKIE_MINUTES = 60 * 24 * 30;

    /**
     * Session key mapping the ids of pages opened through a share link to
     * the moment that link expires.
     */
    private const SHARED_SESSION_KEY = 'experience_shared';

    /**
     * Session key holding the ids of pages whose view this session counted.
     */
    private const COUNTED_SESSION_KEY = 'experience_counted';

    /**
     * How many unlocked pages a visitor remembers.
     */
    private const MAX_REMEMBERED_PAGES = 50;

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
     * A live demo of one memory page template with sample content. Visitors
     * can edit it in place; their words and photos stay in their browser as
     * a draft until they order a keychain with the page.
     */
    public function demo(Request $request, string $template, BuildDemoExperience $buildDemo): Response|RedirectResponse
    {
        $experienceTemplate = ExperienceTemplate::tryFrom($template);

        if ($experienceTemplate === null) {
            $legacyDesign = ExperienceTemplate::legacyFlowerDesign($template);

            abort_if($legacyDesign === null, 404);

            return redirect()->route('experiences.demo', [
                'template' => ExperienceTemplate::DigitalBouquet->value,
                'flowers' => $legacyDesign['style']->value,
                'rain' => $legacyDesign['rain']->value,
            ], 301);
        }

        $flowerStyle = FlowerStyle::tryFrom((string) $request->query('flowers')) ?? FlowerStyle::Bouquet;
        $flowerRain = FlowerRain::tryFrom((string) $request->query('rain')) ?? FlowerRain::None;

        return Inertia::render('storefront/experience', [
            'experience' => $buildDemo->handle($experienceTemplate, $flowerStyle, $flowerRain),
            'isPreview' => false,
            'isDemo' => true,
            'canEdit' => false,
            'orderProduct' => $this->keychainWithPage(),
            'maxDraftPhotos' => DigitalExperience::MAX_PHOTOS,
            'flowersAddonPrice' => (int) config('taptale.flowers_addon_price'),
            'seo' => [
                'title' => "{$experienceTemplate->label()} memory page demo",
                'description' => $experienceTemplate->description(),
            ],
        ]);
    }

    /**
     * Show the digital experience a tag or QR code points to.
     */
    public function show(Request $request, DigitalExperience $experience): Response|RedirectResponse
    {
        $canPreview = self::canPreview($request, $experience);

        abort_unless($experience->is_published || $canPreview, 404);

        if ($request->query->has('k')) {
            $key = $request->query('k');

            abort_unless(is_string($key) && $experience->hasAccessKey($key) && $experience->acceptsTap($request->query('m')), 404);

            $this->unlock($request, $experience);
            $this->countView($request, $experience, isVisitor: ! $canPreview);

            return redirect()->route('experiences.show', [
                ...$request->except(['k', 'm']),
                'experience' => $experience,
            ]);
        }

        if ($request->query->has('s')) {
            $token = $request->query('s');
            $shareLink = is_string($token) ? $experience->activeShareLink($token) : null;

            abort_if($shareLink === null, 404);

            $this->rememberShareLink($request, $experience, $shareLink);
            $this->countView($request, $experience, isVisitor: ! $canPreview);
        }

        abort_unless($canPreview || self::isUnlocked($request, $experience) || self::isSharedWith($request, $experience), 404);

        if (! $canPreview && $experience->isLocked()) {
            return Inertia::render('storefront/experience-locked', [
                'unlocksAt' => $experience->unlocks_at?->toIso8601String(),
                'theme' => $experience->theme,
                'recipientName' => $experience->recipient_name,
                'senderName' => $experience->sender_name,
            ]);
        }

        $canEdit = $request->user()?->can('update', $experience) ?? false;

        return Inertia::render('storefront/experience', [
            'experience' => new DigitalExperienceResource($experience),
            'isPreview' => ! $experience->is_published,
            'isDemo' => false,
            'canEdit' => $canEdit,
            'isRecipient' => ! $canPreview,
            'canShare' => ! $canPreview && self::canShare($request, $experience),
            'shareLinkDays' => DigitalExperience::SHARE_LINK_DAYS,
            'hasHearted' => in_array($experience->id, $request->session()->get(ExperienceReactionController::HEARTS_SESSION_KEY, []), true),
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
        abort_unless(static::canSee($request, $experience), 404);

        $path = $experience->photos[$index] ?? null;

        abort_if($path === null, 404);

        return $this->serveUpload($path, [
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Stream one of the photos that rain down over the flowers.
     */
    public function rainPhoto(Request $request, DigitalExperience $experience, int $index): SymfonyResponse
    {
        abort_unless(static::canSee($request, $experience), 404);

        $path = $experience->rain_photos[$index] ?? null;

        abort_if($path === null, 404);

        return $this->serveUpload($path, [
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Stream the uploaded page video. Local files are sent as a file
     * response, which answers the range requests browsers make to seek and
     * play video; object storage gets a short-lived signed URL as usual.
     */
    public function video(Request $request, DigitalExperience $experience): SymfonyResponse
    {
        abort_unless(static::canSee($request, $experience), 404);

        abort_if($experience->video_path === null, 404);

        $diskName = (string) config('taptale.uploads_disk');

        if (config("filesystems.disks.{$diskName}.driver") === 's3') {
            return $this->serveUpload($experience->video_path, []);
        }

        abort_unless(Storage::disk($diskName)->exists($experience->video_path), 404);

        return response()->file(Storage::disk($diskName)->path($experience->video_path), [
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Stream the uploaded background song.
     */
    public function audio(Request $request, DigitalExperience $experience): SymfonyResponse
    {
        abort_unless(static::canSee($request, $experience), 404);

        abort_if($experience->audio_path === null, 404);

        return $this->serveUpload($experience->audio_path, [
            'Cache-Control' => 'private, max-age=3600',
            'Accept-Ranges' => 'bytes',
        ]);
    }

    /**
     * The QR code (SVG) pointing to the experience, for the owner and
     * administrators to print or download. It carries the access key, and
     * stops opening the page once the genuine tag is live.
     */
    public function qr(Request $request, DigitalExperience $experience, RenderQrCode $renderQrCode): HttpResponse
    {
        abort_unless(self::canPreview($request, $experience), 404);

        $svg = $renderQrCode->handle($experience->qrCodeUrl());

        $headers = ['Content-Type' => 'image/svg+xml', 'Cache-Control' => 'private, max-age=3600'];

        if ($request->boolean('download')) {
            $headers['Content-Disposition'] = 'attachment; filename="taptale-'.$experience->code.'-qr.svg"';
        }

        return response($svg, 200, $headers);
    }

    /**
     * Whether the current visitor may see the page content right now: the
     * owner or an admin always, anyone else after unlocking it with the tag,
     * QR code or share link once it is published and past its scheduled
     * opening time.
     */
    public static function canSee(Request $request, DigitalExperience $experience): bool
    {
        if (self::canPreview($request, $experience)) {
            return true;
        }

        return $experience->is_published
            && ! $experience->isLocked()
            && (self::isUnlocked($request, $experience) || self::isSharedWith($request, $experience));
    }

    /**
     * Whether the current visitor may make share links: only someone who
     * tapped the genuine tag (or scanned the QR code) on this device, never
     * a visitor who arrived through a share link.
     */
    public static function canShare(Request $request, DigitalExperience $experience): bool
    {
        return $experience->is_published && self::isUnlocked($request, $experience);
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
     * Slug of the gift a demo's "order a keychain with this page" button
     * opens in the wizard: the first active keychain that comes with a tap
     * page, or any gift with one when no keychain does.
     */
    private function keychainWithPage(): ?string
    {
        return Product::query()
            ->where('is_active', true)
            ->where('has_digital_experience', true)
            ->orderByRaw('case when lower(name) like ? then 0 else 1 end', ['%keychain%'])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->value('slug');
    }

    private static function canPreview(Request $request, DigitalExperience $experience): bool
    {
        return $request->user()?->can('view', $experience) ?? false;
    }

    /**
     * Whether this browser tapped the genuine tag (or scanned the QR code)
     * itself, rather than arriving through someone's share link.
     */
    private static function isUnlocked(Request $request, DigitalExperience $experience): bool
    {
        return in_array($experience->id, self::unlockedPageIds($request), true);
    }

    /**
     * Pages this browser has tapped: from the session, or from the device
     * cookie once the session has ended.
     *
     * @return list<int>
     */
    private static function unlockedPageIds(Request $request): array
    {
        $cookie = $request->cookie(self::ACCESS_COOKIE);
        $fromCookie = is_string($cookie) ? array_map('intval', explode(',', $cookie)) : [];

        return array_values(array_unique(array_filter(
            [...$request->session()->get(self::ACCESS_SESSION_KEY, []), ...$fromCookie],
            fn (int $id): bool => $id > 0,
        )));
    }

    /**
     * Whether this session opened the page through a share link that has
     * not expired yet.
     */
    private static function isSharedWith(Request $request, DigitalExperience $experience): bool
    {
        $expiresAt = $request->session()->get(self::SHARED_SESSION_KEY, [])[$experience->id] ?? null;

        return is_int($expiresAt) && $expiresAt > now()->getTimestamp();
    }

    /**
     * Remember that this browser tapped the tag (or scanned the QR code), in
     * the session and on the device.
     */
    private function unlock(Request $request, DigitalExperience $experience): void
    {
        $unlocked = array_slice(
            array_values(array_unique([...self::unlockedPageIds($request), $experience->id])),
            -self::MAX_REMEMBERED_PAGES,
        );

        $request->session()->put(self::ACCESS_SESSION_KEY, $unlocked);
        Cookie::queue(self::ACCESS_COOKIE, implode(',', $unlocked), self::ACCESS_COOKIE_MINUTES);
    }

    /**
     * Let this session see the page until the share link expires. Nothing is
     * kept on the device, so the page closes with the link.
     */
    private function rememberShareLink(Request $request, DigitalExperience $experience, ExperienceShareLink $shareLink): void
    {
        $shared = array_filter(
            $request->session()->get(self::SHARED_SESSION_KEY, []),
            fn (mixed $expiresAt): bool => is_int($expiresAt) && $expiresAt > now()->getTimestamp(),
        );

        $shared[$experience->id] = $shareLink->expires_at->getTimestamp();

        $request->session()->put(self::SHARED_SESSION_KEY, array_slice($shared, -self::MAX_REMEMBERED_PAGES, preserve_keys: true));
    }

    /**
     * Count the first open of a session as one view, so refreshing or tapping
     * again does not inflate it. The owner and admins are not counted.
     */
    private function countView(Request $request, DigitalExperience $experience, bool $isVisitor): void
    {
        $counted = $request->session()->get(self::COUNTED_SESSION_KEY, []);

        if (! $isVisitor || in_array($experience->id, $counted, true)) {
            return;
        }

        $request->session()->put(self::COUNTED_SESSION_KEY, array_slice([...$counted, $experience->id], -self::MAX_REMEMBERED_PAGES));
        $experience->increment('view_count');
        $experience->views()->create([
            'device' => preg_match('/Mobi|Android|iPhone|iPad/i', (string) $request->userAgent()) === 1 ? 'mobile' : 'desktop',
        ]);
    }
}
