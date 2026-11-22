<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Administrators can see every customer's address, receipts and refunds, so
 * a stolen password alone must not be enough: they need two-factor
 * authentication turned on before the admin dashboard opens.
 */
class EnsureAdminHasTwoFactor
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('taptale.admin_requires_two_factor') || $request->user()?->hasEnabledTwoFactorAuthentication()) {
            return $next($request);
        }

        Inertia::flash('toast', [
            'type' => 'error',
            'message' => __('Turn on two-factor authentication to use the admin dashboard.'),
        ]);

        return to_route('security.edit');
    }
}
