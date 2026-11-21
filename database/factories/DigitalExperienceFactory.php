<?php

namespace Database\Factories;

use App\Models\DigitalExperience;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DigitalExperience>
 */
class DigitalExperienceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'user_id' => User::factory(),
            'title' => 'Ana & Leo',
            'subtitle' => 'Our story so far',
            'message' => fake()->paragraph(),
            'photos' => [],
            'theme' => 'blush',
            'is_published' => true,
        ];
    }

    /**
     * Indicate that the experience is not visible to the public yet.
     */
    public function unpublished(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_published' => false,
        ]);
    }
}
