<?php

namespace App\Actions\Errors;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\ExceptionResponse;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Turns HTTP errors into pages and messages a shopper understands, without
 * letting the error path become a cheap way to load the server.
 *
 * - Error pages render without shared data, so they never touch the database
 *   and still work when the database is what failed.
 * - A form or button on the site (an Inertia request) that fails goes back to
 *   the same page with a toast, so nothing the customer typed is lost.
 * - A memory page link that does not open gets its own page explaining that
 *   memory pages open from the keychain or QR code, not from a copied link.
 * - Images, audio, downloads and file-like paths (bots probing /.env, *.php)
 *   keep Laravel's bare response instead of a full page.
 * - One visitor gets at most NOT_FOUND_LIMIT "not found" answers a minute;
 *   after that they get a bare 429 that costs nothing to build.
 *
 * Server errors keep Laravel's debug page while APP_DEBUG is on, and JSON
 * requests keep their JSON errors.
 */
class RenderErrorResponse
{
    /**
     * "Not found" answers one IP address may receive per minute.
     */
    public const NOT_FOUND_LIMIT = 60;

    /**
     * Statuses that get a Taptale error page.
     *
     * @var list<int>
     */
    private const PAGE_STATUSES = [403, 404, 419, 429, 500, 503];

    /**
     * Routes the browser calls for images, audio and downloads.
     *
     * @var list<string>
     */
    private const FILE_ROUTES = ['experiences.photo', 'experiences.audio', 'experiences.qr', 'files.*'];

    public function handle(ExceptionResponse $error): ?Response
    {
        $request = $error->request;
        $status = $error->statusCode();

        if ($status === 404 && $this->notFoundLimitReached($request)) {
            return $this->tooManyNotFound($request);
        }

        if ($request->expectsJson() || ($status >= 500 && config('app.debug'))) {
            return null;
        }

        $toast = $this->toastFor($error);

        if ($toast !== null && $this->isSubmissionFromSite($request)) {
            Inertia::flash('toast', $toast);

            return back(303);
        }

        if (! in_array($status, self::PAGE_STATUSES, true) || $this->isFileRequest($request)) {
            return null;
        }

        Inertia::flushShared();

        if ($status === 404 && ($request->routeIs('experiences.show') || $request->is('t/*'))) {
            return $this->renderPage($error, 'storefront/experience-unavailable');
        }

        return $this->renderPage($error, 'storefront/error', [
            'status' => $status,
            'retryAfter' => $this->retryAfter($error),
        ]);
    }

    /**
     * Render a Taptale error page. If the page itself cannot be built (say, a
     * deploy whose assets miss it) the problem is reported and Laravel's plain
     * error page is used, so an error never turns into a crash.
     *
     * @param  array<string, mixed>  $props
     */
    private function renderPage(ExceptionResponse $error, string $component, array $props = []): ?Response
    {
        return rescue(fn (): Response => $error->render($component, $props)->toResponse($error->request));
    }

    /**
     * Count this "not found" answer for the visitor and tell whether they are
     * over the limit. A cache outage never blocks anyone.
     */
    private function notFoundLimitReached(Request $request): bool
    {
        return rescue(function () use ($request): bool {
            $key = $this->notFoundKey($request);

            if (RateLimiter::tooManyAttempts($key, self::NOT_FOUND_LIMIT)) {
                return true;
            }

            RateLimiter::hit($key);

            return false;
        }, false, report: false);
    }

    private function tooManyNotFound(Request $request): Response
    {
        $seconds = rescue(fn (): int => RateLimiter::availableIn($this->notFoundKey($request)), 60, report: false);

        return response('Too many requests. Please wait a moment and try again.', 429, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Retry-After' => (string) $seconds,
        ]);
    }

    private function notFoundKey(Request $request): string
    {
        return 'not-found:'.$request->ip();
    }

    /**
     * The toast shown when a submission from the site fails with this status.
     *
     * @return array{type: string, message: string}|null
     */
    private function toastFor(ExceptionResponse $error): ?array
    {
        return match ($error->statusCode()) {
            403 => ['type' => 'error', 'message' => __('You do not have permission to do that.')],
            404 => ['type' => 'error', 'message' => __('We could not find that. It may have been removed.')],
            419 => ['type' => 'warning', 'message' => __('This page expired. Please try again.')],
            429 => ['type' => 'warning', 'message' => __('Too many attempts. Please wait :seconds seconds and try again.', [
                'seconds' => $this->retryAfter($error) ?? 60,
            ])],
            500 => ['type' => 'error', 'message' => __('Something went wrong on our side. Please try again in a moment.')],
            503 => ['type' => 'warning', 'message' => __('Taptale is getting a quick update. Please try again in a few minutes.')],
            default => null,
        };
    }

    /**
     * A form or button on the site that changes data. Inertia keeps the page
     * as it was when such a request is sent back.
     */
    private function isSubmissionFromSite(Request $request): bool
    {
        return $request->hasHeader('X-Inertia') && ! $request->isMethodSafe() && $request->hasSession();
    }

    private function isFileRequest(Request $request): bool
    {
        return $request->routeIs(...self::FILE_ROUTES)
            || ($request->route() === null && pathinfo($request->path(), PATHINFO_EXTENSION) !== '');
    }

    private function retryAfter(ExceptionResponse $error): ?int
    {
        $seconds = $error->response->headers->get('Retry-After');

        return is_numeric($seconds) ? (int) $seconds : null;
    }
}
