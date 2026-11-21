<?php

namespace App\Actions\Orders;

use App\Enums\DesignMode;
use App\Enums\OptionGroup;
use App\Models\Product;
use App\Models\ProductOption;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Calculates the authoritative price of a personalized order. The storefront
 * mirrors this logic for live display, but only this result is persisted.
 */
class PriceOrder
{
    /**
     * @param  list<int>  $optionIds
     * @return array{
     *     unit_price: int,
     *     subtotal: int,
     *     customization_fee: int,
     *     delivery_fee: int,
     *     total: int,
     *     selected_options: list<array{id: int, group: string, group_label: string, name: string, price_modifier: int}>,
     *     enables_digital_experience: bool
     * }
     *
     * @throws ValidationException
     */
    public function handle(Product $product, array $optionIds, int $quantity, DesignMode $designMode): array
    {
        $available = $product->activeOptions()->get();
        $selected = $this->resolveSelection($available, $optionIds);

        $unitPrice = max(0, $product->base_price + (int) $selected->sum('price_modifier'));
        $subtotal = $unitPrice * $quantity;
        $customizationFee = $designMode === DesignMode::TaptaleDesigned ? $product->design_fee : 0;
        $deliveryFee = $this->deliveryFee($subtotal);

        return [
            'unit_price' => $unitPrice,
            'subtotal' => $subtotal,
            'customization_fee' => $customizationFee,
            'delivery_fee' => $deliveryFee,
            'total' => $subtotal + $customizationFee + $deliveryFee,
            'selected_options' => array_values($selected->map(fn (ProductOption $option): array => [
                'id' => $option->id,
                'group' => $option->group->value,
                'group_label' => $option->group->label(),
                'name' => $option->name,
                'price_modifier' => $option->price_modifier,
            ])->all()),
            'enables_digital_experience' => $product->has_digital_experience
                || $selected->contains(fn (ProductOption $option): bool => $option->enables_digital_experience),
        ];
    }

    /**
     * Delivery fee for the given subtotal, honoring the free delivery threshold.
     */
    public function deliveryFee(int $subtotal): int
    {
        $threshold = (int) config('taptale.free_delivery_threshold');

        if ($threshold > 0 && $subtotal >= $threshold) {
            return 0;
        }

        return (int) config('taptale.delivery_fee');
    }

    /**
     * Validate the chosen options: every id must belong to the product, single
     * choice groups allow one option and must be answered when offered.
     *
     * @param  Collection<int, ProductOption>  $available
     * @param  list<int>  $optionIds
     * @return Collection<int, ProductOption>
     *
     * @throws ValidationException
     */
    private function resolveSelection(Collection $available, array $optionIds): Collection
    {
        $optionIds = array_values(array_unique(array_map('intval', $optionIds)));
        $selected = $available->whereIn('id', $optionIds)->values();

        if ($selected->count() !== count($optionIds)) {
            throw ValidationException::withMessages([
                'option_ids' => 'One of the selected options is no longer available. Please review your choices.',
            ]);
        }

        $errors = [];

        foreach ($available->groupBy(fn (ProductOption $option): string => $option->group->value) as $groupValue => $groupOptions) {
            $group = OptionGroup::from($groupValue);
            $chosen = $selected->filter(fn (ProductOption $option): bool => $option->group === $group);

            if ($group->allowsMultiple()) {
                continue;
            }

            if ($chosen->isEmpty()) {
                $errors['option_ids'] = "Please choose a {$this->lowercaseLabel($group)}.";
            } elseif ($chosen->count() > 1) {
                $errors['option_ids'] = "Please choose only one {$this->lowercaseLabel($group)}.";
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return $selected;
    }

    private function lowercaseLabel(OptionGroup $group): string
    {
        return $group === OptionGroup::Nfc ? 'NFC option' : mb_strtolower($group->label());
    }
}
