<?php

namespace Database\Factories;

use App\Models\PaymentMethod;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PaymentMethod>
 */
class PaymentMethodFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'GCash',
            'code' => fake()->unique()->slug(2),
            'driver' => 'manual',
            'account_name' => 'Taptale Gifts',
            'account_number' => '0917 000 0000',
            'instructions' => 'Send the exact amount and upload a screenshot of your receipt.',
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    /**
     * Indicate that customers cannot choose the method.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
