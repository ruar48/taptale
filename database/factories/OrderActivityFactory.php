<?php

namespace Database\Factories;

use App\Enums\ActivityType;
use App\Models\Order;
use App\Models\OrderActivity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderActivity>
 */
class OrderActivityFactory extends Factory
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
            'type' => ActivityType::Note,
            'body' => fake()->sentence(),
            'is_internal' => false,
        ];
    }

    /**
     * Indicate that the entry is only visible to administrators.
     */
    public function internal(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_internal' => true,
        ]);
    }
}
