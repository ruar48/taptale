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
     * Only the owner may edit the content of their digital experience.
     */
    public function update(User $user, DigitalExperience $experience): bool
    {
        return $experience->user_id === $user->id;
    }
}
