import { Clock, Nfc, Package } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMoney } from '@/hooks/use-money';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

/**
 * Shopee-style product view: a big live sample on the left, and on the
 * right the price and key facts. The customer designs the website next.
 */
export function ProductShowcase({
    product,
    preview,
    hasTapPage,
    loading,
}: {
    product: Product;
    preview: ReactNode;
    hasTapPage: boolean;
    loading: boolean;
}) {
    const money = useMoney();

    return (
        <div
            className={cn(
                'grid gap-6 rounded-[2rem] border border-plum/10 bg-card p-4 transition-opacity sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]',
                loading && 'opacity-60',
            )}
        >
            <div className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-blush-light via-cream to-cream-dark p-6 dark:from-muted dark:via-background dark:to-muted">
                <div className="w-full max-w-xs">{preview}</div>
            </div>

            <div>
                <h2 className="font-display text-3xl leading-tight font-medium">
                    {product.name}
                </h2>
                {product.short_description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                        {product.short_description}
                    </p>
                )}

                <div className="mt-4 rounded-2xl bg-blush-light/50 px-4 py-3 dark:bg-rose/10">
                    <span className="text-sm text-muted-foreground">From </span>
                    <span className="font-display text-3xl font-semibold text-plum dark:text-blush">
                        {money(product.base_price)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {' '}
                        / piece
                    </span>
                </div>

                <dl className="mt-4 grid gap-2 text-sm">
                    <Fact
                        icon={Clock}
                        label="Production"
                        value={product.production_time}
                    />
                    {product.min_quantity > 1 && (
                        <Fact
                            icon={Package}
                            label="Minimum"
                            value={`${product.min_quantity} pieces`}
                        />
                    )}
                    {hasTapPage && (
                        <Fact
                            icon={Nfc}
                            label="Tap page"
                            value={
                                product.has_digital_experience
                                    ? 'Included — a website opens when they tap or scan'
                                    : 'Available with the NFC add-on'
                            }
                        />
                    )}
                </dl>

            </div>
        </div>
    );
}

function Fact({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Clock;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <dt className="flex w-24 shrink-0 items-center gap-1.5 text-muted-foreground">
                <Icon className="size-4 text-rose" /> {label}
            </dt>
            <dd>{value}</dd>
        </div>
    );
}
