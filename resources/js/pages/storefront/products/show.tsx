import { Head, Link } from '@inertiajs/react';
import {
    BadgeCheck,
    Clock,
    Nfc,
    Package,
    Palette as PaletteIcon,
    Sparkles,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { ProductArt } from '@/components/taptale/product-art';
import { ProductCard } from '@/components/taptale/product-card';
import { Button } from '@/components/ui/button';
import { useMoney } from '@/hooks/use-money';
import { formatModifier } from '@/lib/money';
import { groupOptions } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { show as categoryShow } from '@/routes/categories';
import { create as startOrder } from '@/routes/orders';
import type { Product } from '@/types';

type Props = {
    product: Product;
    selectedCategorySlug: string | null;
    relatedProducts: Product[];
};

export default function ProductShow({
    product,
    selectedCategorySlug,
    relatedProducts,
}: Props) {
    const money = useMoney();
    const images = product.images ?? [];
    const [activeImage, setActiveImage] = useState(0);
    const groups = groupOptions(product.options ?? []);
    const personalizeUrl = startOrder({
        query: {
            category: selectedCategorySlug ?? undefined,
            product: product.slug,
        },
    });

    return (
        <>
            <Head title={product.name} />

            <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-16">
                <div className="lg:sticky lg:top-28 lg:self-start">
                    <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card">
                        {images.length > 0 ? (
                            <img
                                src={images[activeImage]?.url}
                                alt={images[activeImage]?.alt ?? product.name}
                                className="aspect-square w-full object-contain"
                            />
                        ) : (
                            <ProductArt
                                product={product}
                                className="aspect-square w-full"
                            />
                        )}
                    </div>
                    {images.length > 1 && (
                        <div className="mt-4 flex scrollbar-none gap-3 overflow-x-auto">
                            {images.map((image, index) => (
                                <button
                                    key={image.id}
                                    type="button"
                                    onClick={() => setActiveImage(index)}
                                    className={cn(
                                        'size-20 shrink-0 overflow-hidden rounded-xl border-2 bg-card transition',
                                        index === activeImage
                                            ? 'border-rose'
                                            : 'border-transparent opacity-70 hover:opacity-100',
                                    )}
                                    aria-label={`Show image ${index + 1}`}
                                >
                                    <img
                                        src={image.url}
                                        alt=""
                                        className="size-full object-contain"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex flex-wrap gap-2">
                        {product.categories?.map((category) => (
                            <Link
                                key={category.id}
                                href={categoryShow(category.slug)}
                                className="rounded-full bg-blush-light px-3 py-1 text-xs font-medium text-plum hover:bg-blush dark:bg-rose/20 dark:text-blush"
                            >
                                {category.name}
                            </Link>
                        ))}
                    </div>
                    <h1 className="mt-4 font-display text-4xl leading-tight font-medium text-charcoal sm:text-5xl dark:text-cream">
                        {product.name}
                    </h1>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-sm text-muted-foreground">
                            From
                        </span>
                        <span className="text-3xl font-semibold text-plum dark:text-blush">
                            {money(product.base_price)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            per piece
                        </span>
                    </div>

                    {product.description && (
                        <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-charcoal/80 dark:text-foreground/80">
                            {product.description
                                .split('\n')
                                .filter(Boolean)
                                .map((paragraph, index) => (
                                    <p key={index}>{paragraph}</p>
                                ))}
                        </div>
                    )}

                    <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Fact
                            icon={Clock}
                            label="Production"
                            value={product.production_time}
                        />
                        <Fact
                            icon={Users}
                            label="Minimum"
                            value={`${product.min_quantity} ${product.min_quantity === 1 ? 'piece' : 'pieces'}`}
                        />
                        <Fact
                            icon={PaletteIcon}
                            label="Design service"
                            value={`+${money(product.design_fee)}`}
                        />
                        <Fact
                            icon={Nfc}
                            label="Tap memory page"
                            value={
                                product.has_digital_experience
                                    ? 'Included'
                                    : groups.some((g) => g.group === 'nfc')
                                      ? 'Optional'
                                      : 'Not available'
                            }
                        />
                    </dl>

                    {groups.length > 0 && (
                        <div className="mt-10 space-y-6">
                            <h2 className="font-display text-2xl">
                                Options & add-ons
                            </h2>
                            {groups.map((group) => (
                                <div key={group.group}>
                                    <p className="mb-2 text-sm font-semibold">
                                        {group.label}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {group.options.map((option) => (
                                            <span
                                                key={option.id}
                                                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm"
                                            >
                                                {option.swatch && (
                                                    <span
                                                        className="size-3.5 rounded-full ring-1 ring-black/10"
                                                        style={{
                                                            backgroundColor:
                                                                option.swatch,
                                                        }}
                                                    />
                                                )}
                                                {option.name}
                                                <span className="text-xs text-muted-foreground">
                                                    {formatModifier(
                                                        option.price_modifier,
                                                    )}
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-10 rounded-3xl bg-plum p-6 text-white">
                        <p className="font-display text-xl">Make it yours</p>
                        <p className="mt-1 text-sm text-white/80">
                            Add your photos and words, or let our designers
                            create it. You'll approve the design
                            before anything is made.
                        </p>
                        <Button
                            asChild
                            size="lg"
                            className="mt-5 h-13 w-full rounded-full bg-cream text-base text-plum hover:bg-white"
                        >
                            <Link href={personalizeUrl}>
                                <Sparkles className="size-5" /> Personalize this
                                gift
                            </Link>
                        </Button>
                        <ul className="mt-5 grid gap-2 text-sm text-white/80 sm:grid-cols-2">
                            <li className="flex items-center gap-2">
                                <BadgeCheck className="size-4 text-blush" />{' '}
                                Design approval included
                            </li>
                            <li className="flex items-center gap-2">
                                <Package className="size-4 text-blush" />{' '}
                                Gift-ready packaging
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {relatedProducts.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <h2 className="font-display text-3xl">You may also love</h2>
                    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {relatedProducts.map((related) => (
                            <ProductCard
                                key={related.id}
                                product={related}
                                categorySlug={selectedCategorySlug ?? undefined}
                            />
                        ))}
                    </div>
                </section>
            )}
        </>
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
        <div className="rounded-2xl border border-border/70 bg-card p-3">
            <Icon className="size-4 text-rose" />
            <dt className="mt-2 text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
        </div>
    );
}
