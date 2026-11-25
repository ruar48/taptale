import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import { CategoryIcon } from '@/components/taptale/category-icon';
import { CategoryIllustration } from '@/components/taptale/category-illustration';
import { cn } from '@/lib/utils';
import { show } from '@/routes/categories';
import type { Category } from '@/types';

export function CategoryCard({
    category,
    className,
    style,
}: {
    category: Category;
    className?: string;
    style?: CSSProperties;
}) {
    /** Negative delay so neighbouring cards bob out of step with each other. */
    const bobDelay = `-${((category.id * 1.7) % 5).toFixed(1)}s`;

    return (
        <Link
            href={show(category.slug)}
            prefetch
            className={cn(
                'group relative isolate flex min-h-44 flex-col justify-between gap-6 overflow-hidden rounded-3xl p-5 text-white shadow-sm ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6',
                className,
            )}
            style={{
                background: `linear-gradient(135deg, ${category.accent_color} 0%, color-mix(in oklab, ${category.accent_color} 72%, #343039) 100%)`,
                ...style,
            }}
        >
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(255,255,255,0.22),transparent_55%)]" />
            <div className="pointer-events-none absolute -right-10 -bottom-16 -z-10 size-56 rounded-full bg-white/12 blur-[1px] transition-transform duration-500 group-hover:scale-110" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/3 -translate-x-[150%] -skew-x-12 bg-linear-to-r from-transparent via-white/25 to-transparent transition-[translate] duration-1000 ease-out group-hover:translate-x-[400%]" />

            {category.image_url ? (
                <img
                    src={category.image_url}
                    alt=""
                    className="pointer-events-none absolute right-5 bottom-5 -z-10 aspect-4/3 w-[38%] max-w-48 rounded-2xl object-cover shadow-lg ring-2 ring-white/40 transition-transform duration-500 group-hover:scale-105"
                />
            ) : (
                <CategoryIllustration
                    name={category.icon}
                    className="pointer-events-none absolute right-2 bottom-0 -z-10 w-[44%] max-w-56 animate-bob drop-shadow-[0_10px_14px_rgba(0,0,0,0.18)] transition-[translate,scale] duration-500 group-hover:-translate-y-1 group-hover:scale-105"
                    style={{ animationDelay: bobDelay }}
                />
            )}

            <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/25 backdrop-blur group-hover:animate-wiggle">
                    <CategoryIcon name={category.icon} className="size-5" />
                </span>
                <span className="flex size-8 items-center justify-center rounded-full bg-white text-plum shadow-md transition-[translate,scale] duration-300 group-hover:translate-x-0.5 group-hover:scale-110">
                    <ArrowRight className="size-4" />
                </span>
            </div>
            <div className="max-w-[56%]">
                <h3 className="font-display text-xl leading-tight font-medium sm:text-2xl">
                    {category.name}
                </h3>
                {category.tagline && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-white/85">
                        {category.tagline}
                    </p>
                )}
            </div>
        </Link>
    );
}
