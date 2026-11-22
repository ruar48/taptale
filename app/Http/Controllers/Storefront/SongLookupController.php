<?php

namespace App\Http\Controllers\Storefront;

use App\Actions\Music\LookupSong;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Album art, a short preview and lyrics for the song on a memory page.
 */
class SongLookupController extends Controller
{
    public function __invoke(Request $request, LookupSong $lookupSong): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'artist' => ['nullable', 'string', 'max:150'],
        ]);

        return response()->json(
            $lookupSong->handle($validated['title'], $validated['artist'] ?? null),
        );
    }
}
