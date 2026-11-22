<?php

namespace Database\Factories;

use App\Enums\DiscountType;
use App\Models\PromoCode;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PromoCode>
 */
class PromoCodeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->bothify('LOVE##??')),
            'description' => null,
            'discount_type' => DiscountType::Percent,
            'discount_value' => 10,
            'min_subtotal' => 0,
            'max_uses' => null,
            'starts_at' => null,
            'ends_at' => null,
            'is_active' => true,
        ];
    }

    /**
     * A fixed amount off, in centavos.
     */
    public function fixed(int $centavos): static
    {
        return $this->state(fn (array $attributes) => [
            'discount_type' => DiscountType::Fixed,
            'discount_value' => $centavos,
        ]);
    }
}
