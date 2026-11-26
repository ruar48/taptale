<?php

namespace App\Http\Controllers\Storefront;

use App\Actions\DigitalExperiences\BuildExperienceEditor;
use App\Http\Controllers\Controller;
use App\Models\DigitalExperience;
use App\Policies\DigitalExperiencePolicy;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The private link the studio sends a customer (over Messenger, for example)
 * to fill in their website, no account needed. Opening it lets this browser
 * edit the website until the link is turned off or replaced.
 */
class WebsiteEditLinkController extends Controller
{
    public function __invoke(Request $request, DigitalExperience $experience, BuildExperienceEditor $buildEditor): Response
    {
        $key = $request->query('k');

        abort_unless($experience->order?->hasApprovalToken($key) === true, 404);

        $request->session()->put(DigitalExperiencePolicy::EDIT_KEYS_SESSION.'.'.$experience->getKey(), $key);

        return Inertia::render('storefront/website-edit', $buildEditor->handle($experience, $request->user()));
    }
}
