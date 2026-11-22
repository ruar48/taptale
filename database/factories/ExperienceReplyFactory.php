<?php

namespace Database\Factories;

use App\Models\DigitalExperience;
use App\Models\ExperienceReply;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExperienceReply>
 */
class ExperienceReplyFactory extends Factory
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
            'name' => fake()->firstName(),
            'message' => fake()->sentence(),
        ];
    }
}
