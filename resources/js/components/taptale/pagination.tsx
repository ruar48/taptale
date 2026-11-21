import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import type { PaginationLink } from '@/types';

export function Pagination({ links }: { links: PaginationLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <nav
            className="flex flex-wrap items-center justify-center gap-1 pt-4"
            aria-label="Pagination"
        >
            {links.map((link, index) => {
                const label = link.label
                    .replace('&laquo;', '‹')
                    .replace('&raquo;', '›');

                return link.url ? (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        className={cn(
                            'min-w-9 rounded-md px-3 py-1.5 text-center text-sm transition-colors',
                            link.active
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-accent',
                        )}
                    >
                        {label}
                    </Link>
                ) : (
                    <span
                        key={index}
                        className="min-w-9 px-3 py-1.5 text-center text-sm text-muted-foreground/60"
                    >
                        {label}
                    </span>
                );
            })}
        </nav>
    );
}
