<?php

namespace App\Policies;

use App\Models\DigitalExperience;
use App\Models\User;

class DigitalExperiencePolicy
{
    /**
     * Session key holding the website edit links this browser has opened,
     * keyed by experience id.
     */
    public const EDIT_KEYS_SESSION = 'website_edit_keys';

    /**
     * Owners, administrators and holders of the website edit link may see an
     * experience even when unpublished.
     */
    public function view(?User $user, DigitalExperience $experience): bool
    {
        return $this->update($user, $experience);
    }

    /**
     * The owner may edit their digital experience, administrators may design
     * it for them, and a customer without an account may edit it through the
     * private edit link the studio sent them.
     */
    public function update(?User $user, DigitalExperience $experience): bool
    {
        if ($user !== null && ($user->isAdmin() || $experience->user_id === $user->id)) {
            return true;
        }

        return self::hasEditLink($experience);
    }

    /**
     * Whether this browser opened the experience's current edit link. Turning
     * the link off or issuing a new one ends access straight away.
     */
    public static function hasEditLink(DigitalExperience $experience): bool
    {
        if (! session()->isStarted()) {
            return false;
        }

        $key = session()->get(self::EDIT_KEYS_SESSION.'.'.$experience->getKey());

        return $experience->order?->hasApprovalToken($key) === true;
    }
}
