import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { CategoryIcon } from '@/components/taptale/category-icon';
import { ProductCard } from '@/components/taptale/product-card';
import { SectionHeading } from '@/components/taptale/section-heading';
import { TemplatePreview } from '@/components/taptale/template-preview';
import { Button } from '@/components/ui/button';
import { show as categoryShow } from '@/routes/categories';
import { create as startOrder } from '@/routes/orders';
import type { Category, Product, Template } from '@/types';

type Props = {
    category: Category;
    products: Product[];
    templates: Template[];
    otherCategories: Category[];
};

export default function CategoryShow({
    category,
    products,
    templates,
    otherCategories,
}: Props) {
    return (
        <>
            <Head title={category.name} />

            <section
                className="relative overflow-hidden text-white"
                style={{
                    background: `linear-gradient(135deg, ${category.accent_color}, color-mix(in oklab, ${category.accent_color} 60%, #343039))`,
                }}
            >
                {category.image_url && (
                    <img
                        src={category.image_url}
                        alt=""
                        className="absolute inset-0 size-full object-cover opacity-25 mix-blend-luminosity"
                    />
                )}
                <div className="absolute -right-20 -bottom-32 size-96 rounded-full bg-white/10" />
                <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                        <CategoryIcon name={category.icon} className="size-7" />
                    </span>
                    <h1 className="mt-6 max-w-3xl font-display text-4xl leading-tight font-medium sm:text-6xl">
                        {category.name}
                    </h1>
                    {category.description && (
                        <p className="mt-4 max-w-2xl text-lg text-white/85">
                            {category.description}
                        </p>
                    )}
                    <Button
                        asChild
                        size="lg"
                        className="mt-8 h-13 rounded-full bg-white px-7 text-base text-plum hover:bg-cream"
                    >
                        <Link
                            href={startOrder({
                                query: { category: category.slug },
                            })}
                        >
                            <Sparkles className="size-5" /> Personalize a{' '}
                            {category.name.replace(/s$/, '').toLowerCase()}
                        </Link>
                    </Button>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <SectionHeading
                    eyebrow="Choose your keepsake"
                    title={`${products.length} ${products.length === 1 ? 'gift' : 'gifts'} for this occasion`}
                />
                {products.length === 0 ? (
                    <p className="mt-8 rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
                        New keepsakes for this occasion are on their way. Check
                        back soon!
                    </p>
                ) : (
                    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                categorySlug={category.slug}
                            />
                        ))}
                    </div>
                )}
            </section>

            {templates.length > 0 && (
                <section className="bg-blush-light/50 py-16 dark:bg-muted/30">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionHeading
                            eyebrow="Keychain designs"
                            title="Designs made for this moment"
                            description="Pick one when you personalize your gift — you'll see a live preview with your own photos."
                        />
                        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
                            {templates.map((template) => (
                                <div key={template.id}>
                                    <div className="overflow-hidden rounded-2xl shadow-[0_16px_32px_-20px_rgb(113_61_80/0.5)]">
                                        <TemplatePreview
                                            layout={template.layout}
                                            palette={template.palette}
                                            imageUrl={template.preview_url}
                                        />
                                    </div>
                                    <p className="mt-3 font-display">
                                        {template.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {template.layout_label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {otherCategories.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <h2 className="font-display text-2xl">Other occasions</h2>
                    <div className="mt-6 flex flex-wrap gap-3">
                        {otherCategories.map((other) => (
                            <Link
                                key={other.id}
                                href={categoryShow(other.slug)}
                                className="inline-flex items-center gap-2 rounded-full border border-plum/15 bg-card px-4 py-2 text-sm transition-colors hover:border-rose hover:text-plum"
                            >
                                <span
                                    className="size-2.5 rounded-full"
                                    style={{
                                        backgroundColor: other.accent_color,
                                    }}
                                />
                                {other.name}
                                <ArrowRight className="size-3.5 opacity-50" />
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
