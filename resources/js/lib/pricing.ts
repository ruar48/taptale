import type { DesignMode } from '@/lib/wizard';
import type { Product, ProductOption } from '@/types';

export type PricingConfig = {
    delivery_fee: number;
    free_delivery_threshold: number;
    /** Charged once when flowers are added to a page design without them. */
    flowers_addon_price: number;
};

export type PriceBreakdown = {
    unitPrice: number;
    subtotal: number;
    customizationFee: number;
    flowersFee: number;
    deliveryFee: number;
    discount: number;
    total: number;
    selected: ProductOption[];
};

/** A promo code the server confirmed in the wizard. */
export type AppliedPromo = {
    code: string;
    description: string | null;
    discount_type: 'percent' | 'fixed';
    /** Percent (1-100) or centavos, depending on the type. */
    discount_value: number;
    min_subtotal: number;
};

/**
 * Mirrors App\Models\PromoCode::discountFor(): a discount on the items
 * subtotal only, never more than the subtotal.
 */
export function promoDiscount(
    promo: AppliedPromo | null,
    subtotal: number,
): number {
    if (!promo || subtotal < promo.min_subtotal) {
        return 0;
    }

    const discount =
        promo.discount_type === 'percent'
            ? Math.floor((subtotal * Math.min(100, promo.discount_value)) / 100)
            : promo.discount_value;

    return Math.max(0, Math.min(subtotal, discount));
}

/**
 * Mirrors App\Actions\Orders\PriceOrder so customers see live prices.
 * The server recalculates the authoritative total when the order is placed.
 */
export function calculatePrice(
    product: Product,
    optionIds: number[],
    quantity: number,
    designMode: DesignMode | null,
    config: PricingConfig,
    promo: AppliedPromo | null = null,
    withFlowers = false,
): PriceBreakdown {
    const selected = (product.options ?? []).filter((option) =>
        optionIds.includes(option.id),
    );
    const hasTapPage =
        product.has_digital_experience ||
        selected.some((option) => option.enables_digital_experience);
    const modifiers = selected.reduce(
        (sum, option) => sum + option.price_modifier,
        0,
    );
    const unitPrice = Math.max(0, product.base_price + modifiers);
    const safeQuantity = Math.max(0, quantity || 0);
    const subtotal = unitPrice * safeQuantity;
    const customizationFee = designMode === 'assisted' ? product.design_fee : 0;
    // Charged once, outside the items subtotal, so promos never discount it.
    const flowersFee =
        withFlowers && hasTapPage ? Math.max(0, config.flowers_addon_price) : 0;
    const deliveryFee =
        config.free_delivery_threshold > 0 &&
        subtotal >= config.free_delivery_threshold
            ? 0
            : config.delivery_fee;

    const discount = promoDiscount(promo, subtotal);

    return {
        unitPrice,
        subtotal,
        customizationFee,
        flowersFee,
        deliveryFee,
        discount,
        total: subtotal - discount + customizationFee + flowersFee + deliveryFee,
        selected,
    };
}

/**
 * Group product options by group, preserving display order.
 */
export function groupOptions(options: ProductOption[]): {
    group: string;
    label: string;
    multiple: boolean;
    options: ProductOption[];
}[] {
    const groups = new Map<
        string,
        {
            group: string;
            label: string;
            multiple: boolean;
            options: ProductOption[];
        }
    >();

    for (const option of options) {
        if (!groups.has(option.group)) {
            groups.set(option.group, {
                group: option.group,
                label: option.group_label,
                multiple: option.multiple,
                options: [],
            });
        }

        groups.get(option.group)!.options.push(option);
    }

    const order = [
        'size',
        'shape',
        'material',
        'thickness',
        'color',
        'nfc',
        'packaging',
        'addon',
    ];

    return [...groups.values()].sort(
        (a, b) => order.indexOf(a.group) - order.indexOf(b.group),
    );
}

/**
 * The default option ids: each single-choice group's default (or first) option.
 */
export function defaultOptionIds(options: ProductOption[]): number[] {
    return groupOptions(options).flatMap((group) => {
        if (group.multiple) {
            return group.options
                .filter((option) => option.is_default)
                .map((option) => option.id);
        }

        const fallback =
            group.options.find((option) => option.is_default) ??
            group.options[0];

        return fallback ? [fallback.id] : [];
    });
}
