<?php

namespace App\Providers;

use App\Actions\Maintenance\DeleteExpiredCacheEntries;
use App\Actions\Orders\AutoApproveDesignProofs;
use App\Actions\Orders\CancelAbandonedOrders;
use App\Http\Middleware\ThrottleRequestsByNetwork;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Lottery;
use Illuminate\Support\ServiceProvider;
use Throwable;

/**
 * Protections that cut across the whole app: rate limits that treat an
 * IPv6 network as one visitor, and housekeeping (expired cache rows,
 * abandoned unpaid orders) that still happens when no cron job runs the
 * scheduler.
 */
class AbuseProtectionServiceProvider extends ServiceProvider
{
    /**
     * Chance, per web request, of running a small round of housekeeping.
     * Shared hosting may not run `schedule:run`, so busy traffic cleans up
     * after itself; the scheduled hourly tasks do it too when cron runs.
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

                        // The response is already sent and deferred work has run,
                        // so cancellation emails go out right here.
                        config(['taptale.notifications_connection' => 'sync']);
                        app(CancelAbandonedOrders::class)->handle(batchSize: 5);
                        app(AutoApproveDesignProofs::class)->handle(batchSize: 5);
                    } catch (Throwable $exception) {
                        report($exception);
                    }
                })
                ->choose();
        });
    }
}
