<?php

namespace Database\Factories;

use App\Enums\ExpenseCategory;
use App\Enums\FinanceEntryType;
use App\Models\FinanceEntry;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceEntry>
 */
class FinanceEntryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => FinanceEntryType::Expense,
            'category' => ExpenseCategory::Materials,
            'amount' => 150000,
            'description' => 'Acrylic sheets',
            'occurred_on' => now()->toDateString(),
        ];
    }

    /**
     * Money the owners put into the business.
     */
    public function capital(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => FinanceEntryType::Capital,
            'category' => null,
            'description' => 'Owner investment',
        ]);
    }

    /**
     * Money the owners took out of the business.
     */
    public function withdrawal(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => FinanceEntryType::Withdrawal,
            'category' => null,
            'description' => 'Owner draw',
        ]);
    }

    /**
     * Income that did not come from an order.
     */
    public function income(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => FinanceEntryType::Income,
            'category' => null,
            'description' => 'Bazaar booth sales',
        ]);
    }
}
