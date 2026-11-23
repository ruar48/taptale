<?php

namespace App\Policies;

use App\Models\DigitalExperience;
use App\Models\User;

class DigitalExperiencePolicy
{
    /**
     * Owners and administrators may see an experience even when unpublished.
     */
    public function view(User $user, DigitalExperience $experience): bool
    {
        return $user->isAdmin() || $experience->user_id === $user->id;
    }

    /**
     * The owner may edit their digital experience, and administrators may
     * design it for them. Administrators need the same two-factor
     * authentication the admin dashboard requires.
     */
    public function update(User $user, DigitalExperience $experience): bool
    {
        if ($experience->user_id === $user->id) {
            return true;
        }

        return $user->isAdmin()
            && (! config('taptale.admin_requires_two_factor') || $user->hasEnabledTwoFactorAuthentication());
    }
}
