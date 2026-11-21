import { Link } from '@inertiajs/react';
import { Clock, Nfc } from 'lucide-react';
import { ProductArt } from '@/components/taptale/product-art';
import { useMoney } from '@/hooks/use-money';
import { show } from '@/routes/products';
import type { Product } from '@/types';

export function ProductCard({
    product,
    categorySlug,
}: {
    product: Product;
    categorySlug?: string;
}) {
    const money = useMoney();

    return (
        <Link
            href={show(product.slug, {
                query: categorySlug ? { category: categorySlug } : undefined,
            })}
            prefetch
            className="group flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgb(113_61_80/0.35)]"
        >
            <div className="relative">
                <ProductArt
                    product={product}
                    className="aspect-[4/3.6] w-full"
                />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {product.is_bestseller && (
                        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-plum uppercase shadow-sm backdrop-blur">
                            Best seller
                        </span>
                    )}
                    {product.has_digital_experience && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-plum/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase shadow-sm backdrop-blur">
                            <Nfc className="size-3" /> Tap-enabled
                        </span>
                    )}
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="font-display text-lg leading-snug font-medium text-foreground">
                    {product.name}
                </h3>
                {product.short_description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                        {product.short_description}
                    </p>
                )}
                <div className="mt-auto flex items-end justify-between pt-3">
                    <div>
                        <span className="text-xs text-muted-foreground">
                            From
                        </span>
                        <p className="text-lg font-semibold text-plum dark:text-blush">
                            {money(product.base_price)}
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3.5" />
                        {product.production_time}
                    </span>
                </div>
            </div>
        </Link>
    );
}
