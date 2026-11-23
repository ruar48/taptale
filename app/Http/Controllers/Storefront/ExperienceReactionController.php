<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\DigitalExperience;
use App\Notifications\MemoryPageReplied;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Lets the person who tapped a memory page send a heart or a private reply
 * back to the sender.
 */
class ExperienceReactionController extends Controller
{
    /**
     * Session key holding the ids of pages this visitor already hearted.
     */
    public const HEARTS_SESSION_KEY = 'experience_hearts';

    /**
     * Replies one page accepts per day. Each reply emails the owner, so this
     * keeps a script holding the tag from flooding their inbox, while still
     * leaving room for a whole wedding party writing back.
     */
    public const MAX_REPLIES_PER_DAY = 100;

    /**
     * Send a heart, once per visitor session.
     */
    public function heart(Request $request, DigitalExperience $experience): RedirectResponse
    {
        $this->ensureRecipient($request, $experience);

        $hearted = $request->session()->get(self::HEARTS_SESSION_KEY, []);

        if (! in_array($experience->id, $hearted, true)) {
            $experience->increment('heart_count');
            $request->session()->put(self::HEARTS_SESSION_KEY, array_slice([...$hearted, $experience->id], -50));
        }

        return back();
    }

    /**
     * Leave a private message for the owner of the page.
     */
    public function reply(Request $request, DigitalExperience $experience): RedirectResponse
    {
        $this->ensureRecipient($request, $experience);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:80'],
            'message' => ['required', 'string', 'max:1000'],
        ], [
            'message.required' => 'Please write a short message.',
        ]);

        if ($experience->replies()->where('created_at', '>=', now()->subDay())->count() >= self::MAX_REPLIES_PER_DAY) {
            throw ValidationException::withMessages([
                'message' => 'This page has received a lot of messages today. Please try again tomorrow.',
            ]);
        }

        $reply = $experience->replies()->create($validated);

        $experience->user?->notify(new MemoryPageReplied($experience, $reply));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your message was sent.')]);

        return back();
    }

    /**
     * Only visitors who opened the page from its tag or QR code may react;
     * the owner and admins have nothing to send to themselves.
     */
    private function ensureRecipient(Request $request, DigitalExperience $experience): void
    {
        abort_unless(ExperienceController::canSee($request, $experience), 404);
        abort_if($request->user()?->can('view', $experience) ?? false, 403);
    }
}
