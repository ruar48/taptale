import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import { CategoryIcon } from '@/components/taptale/category-icon';
import { cn } from '@/lib/utils';
import { show } from '@/routes/categories';
import type { Category } from '@/types';

export function CategoryCard({
    category,
    className,
}: {
    category: Category;
    className?: string;
}) {
    return (
        <Link
            href={show(category.slug)}
            prefetch
            className={cn(
                'group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-3xl p-5 text-white transition-transform duration-300 hover:-translate-y-1',
                className,
            )}
            style={{
                background: `linear-gradient(150deg, ${category.accent_color} 0%, color-mix(in oklab, ${category.accent_color} 70%, #343039) 100%)`,
            }}
        >
            {category.image_url && (
                <img
                    src={category.image_url}
                    alt=""
                    className="absolute inset-0 size-full object-cover opacity-35 mix-blend-luminosity transition-transform duration-700 group-hover:scale-105"
                />
            )}
            <div className="absolute -right-8 -bottom-8 size-36 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125" />
            <div className="relative flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                    <CategoryIcon name={category.icon} className="size-5" />
                </span>
                <ArrowUpRight className="size-5 opacity-60 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </div>
            <div className="relative">
                <h3 className="font-display text-xl leading-tight font-medium">
                    {category.name}
                </h3>
                {category.tagline && (
                    <p className="mt-1 line-clamp-2 text-sm text-white/80">
                        {category.tagline}
                    </p>
                )}
            </div>
        </Link>
    );
}
