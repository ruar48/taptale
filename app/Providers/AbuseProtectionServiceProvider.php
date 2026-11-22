<?php

namespace App\Providers;

use App\Actions\Maintenance\DeleteExpiredCacheEntries;
use App\Http\Middleware\ThrottleRequestsByNetwork;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Lottery;
use Illuminate\Support\ServiceProvider;
use Throwable;

/**
 * Protections that cut across the whole app: rate limits that treat an
 * IPv6 network as one visitor, and keeping the cache table from growing
 * forever even when no cron job runs the scheduler.
 */
class AbuseProtectionServiceProvider extends ServiceProvider
{
    /**
     * Chance, per web request, of deleting a batch of expired cache rows.
     * Shared hosting may not run `schedule:run`, so busy traffic cleans up
     * after itself; the scheduled hourly prune does it too when cron runs.
     */
    private const CLEANUP_ODDS = [1, 100];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Every `throttle:` middleware resolves through the container, so
        // this one binding covers all routes, framework and package ones too.
        $this->app->bind(ThrottleRequests::class, ThrottleRequestsByNetwork::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            return;
        }

        $this->app->terminating(function (): void {
            Lottery::odds(...self::CLEANUP_ODDS)
                ->winner(function (): void {
                    try {
                        app(DeleteExpiredCacheEntries::class)->handle(maxBatches: 1);
                    } catch (Throwable $exception) {
                        report($exception);
                    }
                })
                ->choose();
        });
    }
}
