import { cn } from '@/lib/utils';
import type { StatusTone } from '@/types';

const TONES: Record<StatusTone, string> = {
    amber: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
    sky: 'bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30',
    rose: 'bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
    plum: 'bg-blush-light text-plum ring-blush dark:bg-rose/20 dark:text-blush dark:ring-rose/40',
    emerald:
        'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
    zinc: 'bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/30',
};

export function StatusBadge({
    tone,
    children,
    className,
}: {
    tone: StatusTone;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
                TONES[tone],
                className,
            )}
        >
            <span className="size-1.5 rounded-full bg-current opacity-70" />
            {children}
        </span>
    );
}

export function paymentTone(status: string): StatusTone {
    return status === 'verified'
        ? 'emerald'
        : status === 'rejected'
          ? 'zinc'
          : 'amber';
}

export function proofTone(status: string): StatusTone {
    return status === 'approved'
        ? 'emerald'
        : status === 'revision_requested'
          ? 'rose'
          : 'sky';
}
