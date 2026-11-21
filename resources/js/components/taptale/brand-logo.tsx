import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';

export function BrandLogo({
    className,
    inverted = false,
}: {
    className?: string;
    inverted?: boolean;
}) {
    return (
        <span className={cn('inline-flex items-center gap-2', className)}>
            <AppLogoIcon
                className={cn(
                    'size-8',
                    inverted
                        ? 'text-blush [--logo-heart:var(--color-plum)]'
                        : 'text-plum [--logo-heart:var(--color-cream)]',
                )}
            />
            <span
                className={cn(
                    'font-display text-2xl font-semibold tracking-tight',
                    inverted ? 'text-cream' : 'text-plum',
                )}
            >
                Taptale
            </span>
        </span>
    );
}
