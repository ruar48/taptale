<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DigitalExperience;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ExperienceController extends Controller
{
    /**
     * Associate a physical NFC tag with an order's digital experience.
     */
    public function update(Request $request, DigitalExperience $experience): RedirectResponse
    {
        $request->merge([
            'nfc_tag_uid' => $request->filled('nfc_tag_uid') ? Str::upper(trim((string) $request->input('nfc_tag_uid'))) : null,
        ]);

        $validated = $request->validate([
            'nfc_tag_uid' => ['nullable', 'string', 'max:64', 'regex:/^[0-9A-F:\-]+$/', Rule::unique('digital_experiences', 'nfc_tag_uid')->ignore($experience)],
        ], [
            'nfc_tag_uid.regex' => 'The tag UID should only contain hexadecimal characters (e.g. 04:A2:3B:1C:5D:80).',
            'nfc_tag_uid.unique' => 'This NFC tag is already linked to another order.',
        ]);

        $experience->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('NFC tag saved.')]);

        return back();
    }
}
