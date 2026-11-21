<?php

namespace Database\Factories;

use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
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
            'kind' => PaymentKind::Payment,
            'status' => PaymentStatus::Submitted,
            'amount' => 75000,
            'reference_number' => fake()->numerify('##########'),
            'proof_disk' => 'local',
            'proof_path' => 'payments/'.fake()->uuid().'.jpg',
        ];
    }

    /**
     * Indicate that an administrator verified the payment.
     */
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PaymentStatus::Verified,
            'reviewed_at' => now(),
        ]);
    }
}
