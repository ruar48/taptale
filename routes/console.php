<?php

use App\Actions\Maintenance\DeleteExpiredCacheEntries;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Runs when a cron job calls `php artisan schedule:run` every minute (on
| Hostinger: hPanel → Advanced → Cron Jobs). Without cron, web traffic still
| prunes the cache now and then (AbuseProtectionServiceProvider). The same
| clean-up can be run by hand with `php artisan cache:prune-expired`.
*/
Schedule::call(fn () => app(DeleteExpiredCacheEntries::class)->handle())
    ->name('prune-expired-cache')
    ->hourly()
    ->withoutOverlapping();
