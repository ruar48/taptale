<?php

namespace App\Actions\Orders;

use App\Enums\DesignMode;
use App\Enums\OptionGroup;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\PromoCode;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Calculates the authoritative price of a personalized order. The storefront
 * mirrors this logic for live display, but only this result is persisted.
 */
class PriceOrder
{
    /**
     * The flowers add-on is charged once per order, and only when the gift
     * comes with a memory page. Like the design fee it sits outside the items
     * subtotal, so promo codes and the free delivery threshold ignore it.
     *
     * Extra keychains (another type in the same checkout) are charged at
     * their base price and count towards the items subtotal.
     *
     * @param  list<int>  $optionIds
     * @param  list<array{product_id: int, quantity: int}>  $extraItems
     * @return array{
     *     unit_price: int,
     *     subtotal: int,
     *     items: list<array{product_id: int, product_name: string, quantity: int, unit_price: int, subtotal: int}>,
     *     customization_fee: int,
     *     flowers_fee: int,
     *     delivery_fee: int,
     *     discount: int,
     *     total: int,
     *     selected_options: list<array{id: int, group: string, group_label: string, name: string, price_modifier: int}>,
     *     enables_digital_experience: bool
     * }
     *
     * @throws ValidationException
     */
    public function handle(Product $product, array $optionIds, int $quantity, DesignMode $designMode, ?PromoCode $promoCode = null, ?User $customer = null, ?string $phone = null, bool $withFlowers = false, array $extraItems = []): array
    {
        $available = $product->activeOptions()->get();
        $selected = $this->resolveSelection($available, $optionIds);
        $enablesDigitalExperience = $product->has_digital_experience
            || $selected->contains(fn (ProductOption $option): bool => $option->enables_digital_experience);

        $unitPrice = max(0, $product->base_price + (int) $selected->sum('price_modifier'));
        $items = [$this->item($product, $quantity, $unitPrice), ...$this->extraItems($product, $extraItems)];
        $subtotal = array_sum(array_column($items, 'subtotal'));
        $customizationFee = $designMode === DesignMode::TaptaleDesigned ? $product->design_fee : 0;
        $flowersFee = $withFlowers && $enablesDigitalExperience ? max(0, (int) config('taptale.flowers_addon_price')) : 0;
        $deliveryFee = $this->deliveryFee($subtotal);
        $discount = $promoCode !== null ? $this->discount($promoCode, $subtotal, $customer, $phone) : 0;

        return [
            'unit_price' => $unitPrice,
            'subtotal' => $subtotal,
            'items' => $items,
            'customization_fee' => $customizationFee,
            'flowers_fee' => $flowersFee,
            'delivery_fee' => $deliveryFee,
            'discount' => $discount,
            'total' => $subtotal - $discount + $customizationFee + $flowersFee + $deliveryFee,
            'selected_options' => array_values($selected->map(fn (ProductOption $option): array => [
                'id' => $option->id,
                'group' => $option->group->value,
                'group_label' => $option->group->label(),
                'name' => $option->name,
                'price_modifier' => $option->price_modifier,
            ])->all()),
            'enables_digital_experience' => $enablesDigitalExperience,
        ];
    }

    /**
     * @return array{product_id: int, product_name: string, quantity: int, unit_price: int, subtotal: int}
     */
    private function item(Product $product, int $quantity, int $unitPrice): array
    {
        return [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'subtotal' => $unitPrice * $quantity,
        ];
    }

    /**
     * Price the other keychain types added to the checkout. Each must be on
     * sale, differ from the main keychain and appear once.
     *
     * @param  list<array{product_id: int, quantity: int}>  $extraItems
     * @return list<array{product_id: int, product_name: string, quantity: int, unit_price: int, subtotal: int}>
     *
     * @throws ValidationException
     */
    private function extraItems(Product $mainProduct, array $extraItems): array
    {
        if ($extraItems === []) {
            return [];
        }

        $productIds = array_map(fn (array $item): int => (int) $item['product_id'], $extraItems);
        $products = Product::active()->whereKey($productIds)->get()->keyBy('id');

        if (count(array_unique($productIds)) !== count($productIds)
            || in_array($mainProduct->id, $productIds, true)
            || $products->count() !== count(array_unique($productIds))) {
            throw ValidationException::withMessages([
                'extra_items' => 'One of the keychains you added is no longer available. Please review your order.',
            ]);
        }

        return array_map(function (array $item) use ($products): array {
            $product = $products->get((int) $item['product_id']);
            $quantity = (int) $item['quantity'];

            if ($quantity < $product->min_quantity || $quantity > $product->max_quantity) {
                throw ValidationException::withMessages([
                    'extra_items' => "{$product->name}: quantity must be between {$product->min_quantity} and {$product->max_quantity}.",
                ]);
            }

            return $this->item($product, $quantity, $product->base_price);
        }, $extraItems);
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
     * Discount a promo code gives on the items subtotal. Fees and delivery
     * are never discounted.
     *
     * @throws ValidationException
     */
    private function discount(PromoCode $promoCode, int $subtotal, ?User $customer, ?string $phone): int
    {
        $reason = $promoCode->rejectionReason($subtotal, $customer, $phone);

        if ($reason !== null) {
            throw ValidationException::withMessages(['promo_code' => $reason]);
        }

        return $promoCode->discountFor($subtotal);
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
