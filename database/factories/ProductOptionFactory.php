<?php

namespace Database\Factories;

use App\Enums\OptionGroup;
use App\Models\Product;
use App\Models\ProductOption;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductOption>
 */
class ProductOptionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'group' => OptionGroup::Size,
            'name' => fake()->unique()->word(),
            'description' => null,
            'price_modifier' => 0,
            'swatch' => null,
            'enables_digital_experience' => false,
            'is_default' => false,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    /**
     * Put the option in the given group.
     */
    public function group(OptionGroup $group): static
    {
        return $this->state(fn (array $attributes) => [
            'group' => $group,
        ]);
    }

    /**
     * Set the per-unit price modifier in centavos.
     */
    public function costing(int $priceModifier): static
    {
        return $this->state(fn (array $attributes) => [
            'price_modifier' => $priceModifier,
        ]);
    }

    /**
     * Indicate that the option is not offered.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
