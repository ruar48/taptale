<?php

namespace App\Http\Middleware;

use App\Actions\Payments\PayMongoClient;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Reject webhook requests that were not signed by PayMongo.
 *
 * PayMongo signs "{timestamp}.{raw body}" with HMAC-SHA256 using the
 * webhook's secret key and sends it in the Paymongo-Signature header as
 * "t=…,te=…,li=…" (te for test mode, li for live mode).
 */
class VerifyPayMongoSignature
{
    public function __construct(private PayMongoClient $payMongo) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) config('services.paymongo.webhook_secret');

        if ($secret === '') {
            abort(Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $parts = collect(explode(',', (string) $request->header('Paymongo-Signature')))
            ->mapWithKeys(function (string $pair): array {
                [$key, $value] = array_pad(explode('=', trim($pair), 2), 2, '');

                return [$key => $value];
            });

        $timestamp = (string) $parts->get('t', '');
        $isLiveMode = $this->payMongo->isLiveMode();
        $signature = (string) $parts->get($isLiveMode ? 'li' : 'te', '');
        $expected = hash_hmac('sha256', $timestamp.'.'.$request->getContent(), $secret);

        if (! ctype_digit($timestamp) || $signature === '' || ! hash_equals($expected, $signature)) {
            abort(Response::HTTP_UNAUTHORIZED);
        }

        $tolerance = (int) config('services.paymongo.webhook_tolerance');

        if ($tolerance > 0 && abs(now()->getTimestamp() - (int) $timestamp) > $tolerance) {
            abort(Response::HTTP_UNAUTHORIZED);
        }

        if ($request->json('data.attributes.livemode') !== $isLiveMode) {
            abort(Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}
