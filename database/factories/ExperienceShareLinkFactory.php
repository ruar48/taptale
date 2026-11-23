<?php

namespace Database\Factories;

use App\Models\DigitalExperience;
use App\Models\ExperienceShareLink;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExperienceShareLink>
 */
class ExperienceShareLinkFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'digital_experience_id' => DigitalExperience::factory(),
            'expires_at' => now()->addDays(7),
        ];
    }

    /**
     * A link whose time is up.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes): array => [
            'expires_at' => now()->subMinute(),
        ]);
    }
}
