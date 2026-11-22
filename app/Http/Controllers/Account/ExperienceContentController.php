<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\DigitalExperience;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Saves one piece of text edited directly on the memory page by its owner.
 */
class ExperienceContentController extends Controller
{
    /**
     * Editable page fields and their validation rules.
     *
     * @var array<string, list<string>>
     */
    private const FIELDS = [
        'title' => ['required', 'string', 'max:120'],
        'subtitle' => ['nullable', 'string', 'max:160'],
        'recipient_name' => ['nullable', 'string', 'max:80'],
        'sender_name' => ['nullable', 'string', 'max:80'],
        'message' => ['nullable', 'string', 'max:5000'],
        'quote' => ['nullable', 'string', 'max:255'],
        'flowers_note' => ['nullable', 'string', 'max:500'],
        'event_date' => ['nullable', 'string', 'max:60'],
        'song_title' => ['nullable', 'string', 'max:120'],
        'song_artist' => ['nullable', 'string', 'max:120'],
    ];

    /**
     * Editable fields of a timeline / polaroid moment and their rules.
     *
     * @var array<string, list<string>>
     */
    private const MOMENT_FIELDS = [
        'date' => ['nullable', 'string', 'max:60'],
        'title' => ['nullable', 'string', 'max:80'],
        'caption' => ['nullable', 'string', 'max:300'],
    ];

    /**
     * Update a single field, e.g. "message" or "moments.2.caption".
     */
    public function update(Request $request, DigitalExperience $experience): RedirectResponse
    {
        Gate::authorize('update', $experience);

        $field = (string) $request->input('field');

        if (array_key_exists($field, self::FIELDS)) {
            $validated = $request->validate(['value' => self::FIELDS[$field]]);
            $experience->update([$field => $this->clean($validated['value'] ?? null)]);
        } elseif (preg_match('/^moments\.(\d+)\.(date|title|caption)$/', $field, $matches) === 1) {
            $moments = $experience->moments ?? [];
            $index = (int) $matches[1];

            if (! isset($moments[$index])) {
                throw ValidationException::withMessages(['field' => 'That moment no longer exists.']);
            }

            $validated = $request->validate(['value' => self::MOMENT_FIELDS[$matches[2]]]);
            $moments[$index][$matches[2]] = $this->clean($validated['value'] ?? null);
            $experience->update(['moments' => $moments]);
        } else {
            throw ValidationException::withMessages(['field' => 'This text cannot be edited here.']);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Saved.')]);

        return back();
    }

    private function clean(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }
}
