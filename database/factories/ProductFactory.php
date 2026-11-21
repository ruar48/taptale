<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title(fake()->unique()->words(3, true));

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'short_description' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'art_style' => 'acrylic',
            'base_price' => 25000,
            'design_fee' => 10000,
            'production_days_min' => 3,
            'production_days_max' => 5,
            'min_quantity' => 1,
            'max_quantity' => 500,
            'max_photos' => 3,
            'has_digital_experience' => false,
            'is_active' => true,
            'is_featured' => false,
            'is_bestseller' => false,
            'sort_order' => 0,
        ];
    }

    /**
     * Indicate that the product is hidden from the storefront.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the product always includes an NFC/QR digital experience.
     */
    public function withDigitalExperience(): static
    {
        return $this->state(fn (array $attributes) => [
            'art_style' => 'nfc',
            'has_digital_experience' => true,
        ]);
    }
}
