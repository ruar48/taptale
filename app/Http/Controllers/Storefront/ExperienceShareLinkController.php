<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\DigitalExperience;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Lets the person who tapped a memory page share it with family and friends
 * through a link that expires after the days they choose.
 */
class ExperienceShareLinkController extends Controller
{
    /**
     * Share links one page can make per day, so a script holding the tag
     * cannot fill the table.
     */
    public const MAX_LINKS_PER_DAY = 50;

    /**
     * Make a share link that opens the page until it expires.
     */
    public function store(Request $request, DigitalExperience $experience): JsonResponse
    {
        abort_unless(ExperienceController::canShare($request, $experience), 404);

        $validated = $request->validate([
            'days' => ['required', 'integer', Rule::in(DigitalExperience::SHARE_LINK_DAYS)],
        ], [
            'days.in' => 'Please choose how many days the link stays open.',
        ]);

        if ($experience->shareLinks()->where('created_at', '>=', now()->subDay())->count() >= self::MAX_LINKS_PER_DAY) {
            throw ValidationException::withMessages([
                'days' => 'This page has made a lot of share links today. Please try again tomorrow.',
            ]);
        }

        $shareLink = $experience->shareLinks()->create([
            'expires_at' => now()->addDays((int) $validated['days']),
        ]);

        return response()->json([
            'url' => $shareLink->url(),
            'expires_at' => $shareLink->expires_at->toIso8601String(),
        ], 201);
    }
}
