<?php

namespace App\Concerns;

use Illuminate\Support\Facades\Storage;

trait ResolvesMediaUrls
{
    /**
     * Resolve a public URL for a path stored on the catalog media disk.
     */
    protected function mediaUrl(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        return Storage::disk(config('taptale.media_disk'))->url($path);
    }
}
