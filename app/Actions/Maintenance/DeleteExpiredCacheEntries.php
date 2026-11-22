<?php

namespace App\Actions\Maintenance;

use Illuminate\Support\Facades\DB;

/**
 * Deletes expired rows from the database cache.
 *
 * Laravel's database cache only removes an expired row when that exact key
 * is read again, which never happens for most rate-limit keys (one per
 * visitor network per route), submission fingerprints or one-off song
 * lookups. Left alone, the table grows forever.
 */
class DeleteExpiredCacheEntries
{
    /**
     * Rows deleted per pass, so one request never runs a long delete.
     */
    public const BATCH_SIZE = 1000;

    /**
     * @param  int|null  $maxBatches  Stop after this many batches (null: until none are left).
     * @return int How many rows were deleted.
     */
    public function handle(?int $maxBatches = null, int $batchSize = self::BATCH_SIZE): int
    {
        $store = (string) config('cache.default');

        if (config("cache.stores.{$store}.driver") !== 'database') {
            return 0;
        }

        $connection = config("cache.stores.{$store}.connection");
        $table = (string) config("cache.stores.{$store}.table", 'cache');
        $now = now()->getTimestamp();
        $deleted = 0;
        $batches = 0;

        do {
            $keys = DB::connection($connection)->table($table)
                ->where('expiration', '<=', $now)
                ->limit($batchSize)
                ->pluck('key');

            if ($keys->isEmpty()) {
                break;
            }

            $deleted += DB::connection($connection)->table($table)->whereIn('key', $keys)->delete();
            $batches++;
        } while ($keys->count() === $batchSize && ($maxBatches === null || $batches < $maxBatches));

        return $deleted;
    }
}
