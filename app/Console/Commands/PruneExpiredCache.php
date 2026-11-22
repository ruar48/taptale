<?php

namespace App\Console\Commands;

use App\Actions\Maintenance\DeleteExpiredCacheEntries;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('cache:prune-expired')]
#[Description('Delete expired rows from the database cache (rate limits, song lookups, submission fingerprints)')]
class PruneExpiredCache extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(DeleteExpiredCacheEntries $deleteExpiredCacheEntries): int
    {
        $deleted = $deleteExpiredCacheEntries->handle();

        $this->components->info("Deleted {$deleted} expired cache ".str('row')->plural($deleted).'.');

        return self::SUCCESS;
    }
}
