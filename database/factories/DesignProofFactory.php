<?php

namespace Database\Factories;

use App\Enums\ProofStatus;
use App\Models\DesignProof;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DesignProof>
 */
class DesignProofFactory extends Factory
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
            'version' => 1,
            'disk' => 'local',
            'path' => 'proofs/'.fake()->uuid().'.png',
            'designer_notes' => fake()->sentence(),
            'status' => ProofStatus::AwaitingResponse,
        ];
    }

    /**
     * Indicate that the customer approved the proof.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ProofStatus::Approved,
            'responded_at' => now(),
        ]);
    }
}
