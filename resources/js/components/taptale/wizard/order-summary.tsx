import { Truck } from 'lucide-react';
import { useMoney } from '@/hooks/use-money';
import type { PriceBreakdown, PricingConfig } from '@/lib/pricing';
import type { Category, Product, Template } from '@/types';

export function OrderSummary({
    category,
    product,
    template,
    quantity,
    price,
    pricing,
    designModeLabel,
    promoCode = null,
}: {
    category: Category | null;
    product: Product | null;
    template: Template | null;
    quantity: number;
    price: PriceBreakdown | null;
    pricing: PricingConfig;
    designModeLabel: string | null;
    promoCode?: string | null;
}) {
    const money = useMoney();

    return (
        <div className="rounded-3xl border border-plum/10 bg-card p-5 shadow-[0_20px_50px_-30px_rgb(113_61_80/0.45)]">
            <p className="text-xs font-semibold tracking-[0.2em] text-rose uppercase">
                Your gift
            </p>
            <dl className="mt-4 space-y-2.5 text-sm">
                {category && <Row label="Occasion" value={category.name} />}
                <Row label="Gift" value={product?.name} />
                <Row
                    label="Template"
                    value={
                        template?.name ??
                        (product ? 'Custom design' : undefined)
                    }
                />
                <Row label="Design" value={designModeLabel ?? undefined} />
            </dl>

            {price && product && (
                <>
                    {price.selected.length > 0 && (
                        <ul className="mt-4 space-y-1 border-t border-dashed pt-4 text-xs text-muted-foreground">
                            {price.selected.map((option) => (
                                <li
                                    key={option.id}
                                    className="flex justify-between gap-2"
                                >
                                    <span className="truncate">
                                        {option.group_label}: {option.name}
                                    </span>
                                    {option.price_modifier !== 0 && (
                                        <span>
                                            {money(option.price_modifier)}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">
                                {money(price.unitPrice)} × {quantity}
                            </dt>
                            <dd>{money(price.subtotal)}</dd>
                        </div>
                        {price.discount > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">
                                    Promo{promoCode ? ` · ${promoCode}` : ''}
                                </dt>
                                <dd className="text-emerald-600">
                                    −{money(price.discount)}
                                </dd>
                            </div>
                        )}
                        {price.customizationFee > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">
                                    Design service
                                </dt>
                                <dd>{money(price.customizationFee)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Delivery</dt>
                            <dd>
                                {price.deliveryFee === 0
                                    ? 'Free'
                                    : money(price.deliveryFee)}
                            </dd>
                        </div>
                        <div className="flex items-baseline justify-between border-t pt-3">
                            <dt className="font-medium">Total</dt>
                            <dd className="font-display text-2xl font-semibold text-plum dark:text-blush">
                                {money(price.total)}
                            </dd>
                        </div>
                    </dl>
                    {pricing.free_delivery_threshold > 0 &&
                        price.deliveryFee > 0 && (
                            <p className="mt-3 flex items-center gap-2 rounded-xl bg-blush-light/60 px-3 py-2 text-xs text-plum dark:bg-rose/10 dark:text-blush">
                                <Truck className="size-4 shrink-0" />
                                Add{' '}
                                {money(
                                    pricing.free_delivery_threshold -
                                        price.subtotal,
                                )}{' '}
                                more for free delivery
                            </p>
                        )}
                </>
            )}
        </div>
    );
}

function Row({ label, value }: { label: string; value?: string }) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="truncate text-right font-medium">{value ?? '—'}</dd>
        </div>
    );
}
