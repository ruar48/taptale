<?php

namespace Database\Factories;

use App\Enums\DesignMode;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\Template;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'status' => OrderStatus::AwaitingPayment,
            'product_id' => Product::factory(),
            'product_name' => 'Personalized Acrylic Keychain',
            'selected_options' => [],
            'design_mode' => DesignMode::TaptaleDesigned,
            'personalization' => ['names' => 'Ana & Leo', 'message' => 'Forever starts today'],
            'quantity' => 2,
            'unit_price' => 25000,
            'subtotal' => 50000,
            'customization_fee' => 10000,
            'delivery_fee' => 15000,
            'adjustment' => 0,
            'total' => 75000,
            'customer_name' => fake()->name(),
            'customer_email' => fake()->safeEmail(),
            'customer_phone' => '09171234567',
            'address_line' => fake()->streetAddress(),
            'city' => fake()->city(),
            'province' => 'Metro Manila',
            'postal_code' => '1000',
        ];
    }

    /**
     * Put the order in the given status.
     */
    public function status(OrderStatus $status): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => $status,
        ]);
    }

    /**
     * A self-customized order on a template whose design the customer has not
     * finished yet.
     */
    public function selfCustomized(): static
    {
        return $this->state(fn (array $attributes) => [
            'design_mode' => DesignMode::SelfCustomized,
            'customization_fee' => 0,
            'template_id' => Template::factory(),
            'template_name' => 'Golden Hour Polaroid',
            'personalization' => [],
        ]);
    }

    /**
     * A self-customized order whose live preview the customer approved.
     */
    public function selfCustomizedAndApproved(): static
    {
        return $this->state(fn (array $attributes) => [
            'design_mode' => DesignMode::SelfCustomized,
            'customization_fee' => 0,
            'preview_approved_at' => now(),
        ]);
    }
}
