import { cn } from '@/lib/utils';

export function SectionHeading({
    eyebrow,
    title,
    description,
    align = 'left',
    className,
    children,
}: {
    eyebrow?: string;
    title: React.ReactNode;
    description?: string;
    align?: 'left' | 'center';
    className?: string;
    children?: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                'flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
                align === 'center' &&
                    'items-center text-center md:flex-col md:items-center',
                className,
            )}
        >
            <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
                {eyebrow && (
                    <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-rose uppercase">
                        {eyebrow}
                    </p>
                )}
                <h2 className="font-display text-3xl leading-tight font-medium text-balance text-charcoal sm:text-4xl dark:text-cream">
                    {title}
                </h2>
                {description && (
                    <p className="mt-3 text-base text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}
