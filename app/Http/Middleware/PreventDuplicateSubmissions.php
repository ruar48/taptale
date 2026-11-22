<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Cache\Lock;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Makes a submission safe to send twice. On a slow or patchy connection a
 * customer taps again, or tries again after the answer got lost on the way:
 *
 * - an identical submission that arrives while the first one is still running
 *   waits for it (up to WAIT_SECONDS) instead of running alongside it;
 * - one that arrives within REMEMBER_SECONDS after the first one succeeded is
 *   sent where the first one went, so it never creates a second order,
 *   payment, refund or message.
 *
 * "Identical" means the same person, address and form data, files compared by
 * content. Failed submissions (validation or server errors) are not remembered,
 * so trying again really tries again. When the cache is unavailable the
 * request simply runs.
 */
class PreventDuplicateSubmissions
{
    /**
     * How long a successful submission is remembered.
     */
    public const REMEMBER_SECONDS = 120;

    /**
     * Longest a submission may run before its lock is given up.
     */
    private const LOCK_SECONDS = 120;

    /**
     * How long a duplicate waits for the first submission to finish.
     */
    private const WAIT_SECONDS = 5;

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethodSafe()) {
            return $next($request);
        }

        $key = 'submission:'.$this->fingerprint($request);

        try {
            $lock = $this->acquireLock($key);
        } catch (LockTimeoutException) {
            return $this->stillProcessing();
        } catch (Throwable $exception) {
            report($exception);

            return $next($request);
        }

        try {
            $outcome = $this->rememberedOutcome($key);

            if ($outcome !== null) {
                $request->session()->reflash();

                return $this->replay($outcome);
            }

            $response = $next($request);

            if ($this->succeeded($request, $response)) {
                Cache::put($key, $this->outcomeOf($response), self::REMEMBER_SECONDS);
            }

            return $response;
        } finally {
            rescue(fn () => $lock->release(), report: false);
        }
    }

    /**
     * @throws LockTimeoutException
     */
    private function acquireLock(string $key): Lock
    {
        $lock = Cache::lock("{$key}:lock", self::LOCK_SECONDS);

        $lock->block(self::WAIT_SECONDS);

        return $lock;
    }

    /**
     * Who sent it, to which address, with which data.
     */
    private function fingerprint(Request $request): string
    {
        $sender = $request->user()?->getAuthIdentifier()
            ?? ($request->hasSession() ? $request->session()->getId() : $request->ip());

        return hash('sha256', serialize([
            $sender,
            $request->method(),
            $request->path(),
            $this->normalize($request->except(['_token', '_method'])),
        ]));
    }

    /**
     * Replace uploaded files with a hash of their content.
     */
    private function normalize(mixed $value): mixed
    {
        if ($value instanceof UploadedFile) {
            return $value->isValid()
                ? 'file:'.hash_file('xxh128', (string) $value->getRealPath())
                : 'file:'.$value->getClientOriginalName();
        }

        if (is_array($value)) {
            return array_map($this->normalize(...), $value);
        }

        return $value;
    }

    /**
     * Where an identical, successful submission went, if one was remembered.
     * Anything unexpected in the cache counts as nothing remembered.
     *
     * @return array{location: string, external: bool}|null
     */
    private function rememberedOutcome(string $key): ?array
    {
        $outcome = Cache::get($key);

        if (! is_array($outcome)
            || ! is_string($outcome['location'] ?? null)
            || $outcome['location'] === ''
            || ! is_bool($outcome['external'] ?? null)) {
            return null;
        }

        return ['location' => $outcome['location'], 'external' => $outcome['external']];
    }

    /**
     * A redirect or an external redirect (PayMongo) that did not come from an
     * exception or carry validation errors.
     */
    private function succeeded(Request $request, Response $response): bool
    {
        if (isset($response->exception) || ($request->hasSession() && $request->session()->has('errors'))) {
            return false;
        }

        return $response->isRedirection() || $response->headers->has('X-Inertia-Location');
    }

    /**
     * @return array{location: string, external: bool}
     */
    private function outcomeOf(Response $response): array
    {
        $externalLocation = $response->headers->get('X-Inertia-Location');

        return [
            'location' => $externalLocation ?? (string) $response->headers->get('Location'),
            'external' => $externalLocation !== null,
        ];
    }

    /**
     * Send the duplicate where the first submission went. Its toast is kept
     * for that page in case the first answer never reached the browser.
     *
     * @param  array{location: string, external: bool}  $outcome
     */
    private function replay(array $outcome): Response
    {
        return $outcome['external']
            ? Inertia::location($outcome['location'])
            : redirect()->to($outcome['location'], 303);
    }

    private function stillProcessing(): Response
    {
        Inertia::flash('toast', [
            'type' => 'info',
            'message' => __('We are still working on your last request. Please wait a moment.'),
        ]);

        return back(303);
    }
}
