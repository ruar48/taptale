<?php

namespace Database\Factories;

use App\Enums\OrderFileKind;
use App\Models\Order;
use App\Models\OrderFile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderFile>
 */
class OrderFileFactory extends Factory
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
            'kind' => OrderFileKind::Photo,
            'disk' => 'local',
            'path' => 'orders/'.fake()->uuid().'.jpg',
            'original_name' => 'photo.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
        ];
    }
}
