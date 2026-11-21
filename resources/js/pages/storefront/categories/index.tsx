import { Head } from '@inertiajs/react';
import { CategoryCard } from '@/components/taptale/category-card';
import { SectionHeading } from '@/components/taptale/section-heading';
import type { Category } from '@/types';

export default function CategoriesIndex({
    categories,
}: {
    categories: Category[];
}) {
    return (
        <>
            <Head title="Shop by occasion" />
            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
                <SectionHeading
                    eyebrow="Shop by occasion"
                    title="Who are you celebrating?"
                    description="Every occasion comes with its own keepsakes, design templates and finishing options."
                />
                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => (
                        <div key={category.id} className="relative">
                            <CategoryCard category={category} className="min-h-52" />
                            {category.products_count !== undefined && (
                                <span className="pointer-events-none absolute right-5 bottom-5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                                    {category.products_count}{' '}
                                    {category.products_count === 1 ? 'gift' : 'gifts'}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
}
