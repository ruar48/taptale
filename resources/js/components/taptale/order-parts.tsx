import {
    BadgeCheck,
    CheckCircle2,
    CreditCard,
    FileImage,
    Gift,
    MessageSquare,
    Package,
    Paintbrush,
    RefreshCcw,
    Star,
    Truck,
    XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMoney } from '@/hooks/use-money';
import { formatDate } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { Order, OrderActivity } from '@/types';

const STAGES = [
    { icon: CreditCard, label: 'Order & payment' },
    { icon: Paintbrush, label: 'Design' },
    { icon: Gift, label: 'Production' },
    { icon: Truck, label: 'Shipping' },
    { icon: CheckCircle2, label: 'Delivered' },
];

export function OrderProgress({ order }: { order: Order }) {
    const cancelled = order.status === 'cancelled';

    return (
        <ol className="grid grid-cols-5 gap-1">
            {STAGES.map(({ icon: Icon, label }, index) => {
                const stage = index + 1;
                const done =
                    !cancelled &&
                    (stage < order.stage || order.status === 'completed');
                const current =
                    !cancelled &&
                    stage === order.stage &&
                    order.status !== 'completed';

                return (
                    <li
                        key={label}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="relative flex w-full items-center justify-center">
                            {index > 0 && (
                                <span
                                    className={cn(
                                        'absolute right-1/2 h-0.5 w-full',
                                        done || current
                                            ? 'bg-rose'
                                            : 'bg-border',
                                    )}
                                />
                            )}
                            <span
                                className={cn(
                                    'relative z-10 flex size-10 items-center justify-center rounded-full border-2 transition sm:size-12',
                                    done && 'border-rose bg-rose text-white',
                                    current &&
                                        'border-plum bg-plum text-white ring-4 ring-blush/60 dark:border-blush dark:bg-blush dark:text-plum-dark dark:ring-rose/30',
                                    !done &&
                                        !current &&
                                        'border-border bg-card text-muted-foreground',
                                )}
                            >
                                <Icon className="size-4 sm:size-5" />
                            </span>
                        </div>
                        <span
                            className={cn(
                                'mt-2 text-[11px] leading-tight sm:text-xs',
                                current
                                    ? 'font-semibold text-plum dark:text-blush'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {label}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

const ACTIVITY_ICONS: Record<string, typeof Package> = {
    placed: Package,
    status_changed: RefreshCcw,
    note: MessageSquare,
    payment_submitted: CreditCard,
    payment_verified: BadgeCheck,
    payment_rejected: XCircle,
    refunded: CreditCard,
    adjusted: CreditCard,
    proof_sent: FileImage,
    revision_requested: Paintbrush,
    design_approved: BadgeCheck,
    files_uploaded: FileImage,
    cancelled: XCircle,
    review_submitted: Star,
};

export function OrderTimeline({
    activities,
    showAuthors = false,
}: {
    activities: OrderActivity[];
    showAuthors?: boolean;
}) {
    if (activities.length === 0) {
        return <p className="text-sm text-muted-foreground">No updates yet.</p>;
    }

    return (
        <ol className="relative space-y-5 border-l border-border pl-6">
            {activities.map((activity) => {
                const Icon = ACTIVITY_ICONS[activity.type] ?? RefreshCcw;

                return (
                    <li key={activity.id} className="relative">
                        <span
                            className={cn(
                                'absolute top-0 -left-[37px] flex size-7 items-center justify-center rounded-full border-2 border-background',
                                activity.is_internal
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blush-light text-plum dark:bg-rose/20 dark:text-blush',
                            )}
                        >
                            <Icon className="size-3.5" />
                        </span>
                        <div className="flex flex-wrap items-baseline gap-x-2">
                            <p className="text-sm font-medium">
                                {activity.type === 'status_changed' &&
                                activity.status_label
                                    ? `Status: ${activity.status_label}`
                                    : activity.type === 'note'
                                      ? activity.is_internal
                                          ? 'Internal note'
                                          : 'Message from Taptale'
                                      : titleFor(activity.type)}
                            </p>
                            {activity.is_internal && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 uppercase">
                                    Internal
                                </span>
                            )}
                        </div>
                        {activity.body && (
                            <p className="mt-0.5 text-sm whitespace-pre-line text-muted-foreground">
                                {activity.body}
                            </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground/80">
                            {formatDate(activity.created_at, true)}
                            {showAuthors && activity.author
                                ? ` · ${activity.author}`
                                : ''}
                        </p>
                    </li>
                );
            })}
        </ol>
    );
}

function titleFor(type: string): string {
    return (
        {
            placed: 'Order placed',
            payment_submitted: 'Payment submitted',
            payment_verified: 'Payment verified',
            payment_rejected: 'Payment not verified',
            refunded: 'Refund issued',
            adjusted: 'Order total adjusted',
            proof_sent: 'Design ready for review',
            revision_requested: 'Revision requested',
            design_approved: 'Design approved',
            files_uploaded: 'Files uploaded',
            cancelled: 'Order cancelled',
            review_submitted: 'Review submitted',
        }[type] ?? 'Update'
    );
}

export function OrderPriceBreakdown({ order }: { order: Order }) {
    const money = useMoney();

    return (
        <dl className="space-y-2 text-sm">
            <Line
                label={`${money(order.unit_price)} × ${order.quantity}`}
                value={money(order.subtotal)}
            />
            {order.discount > 0 && (
                <Line
                    label={
                        order.promo_code
                            ? `Promo · ${order.promo_code}`
                            : 'Promo discount'
                    }
                    value={`−${money(order.discount)}`}
                />
            )}
            {order.customization_fee > 0 && (
                <Line
                    label="Design service"
                    value={money(order.customization_fee)}
                />
            )}
            {order.flowers_fee > 0 && (
                <Line
                    label="Flowers on tap page"
                    value={money(order.flowers_fee)}
                />
            )}
            <Line
                label="Delivery"
                value={
                    order.delivery_fee === 0
                        ? 'Free'
                        : money(order.delivery_fee)
                }
            />
            {order.adjustment !== 0 && (
                <Line
                    label={
                        order.adjustment_note
                            ? `Adjustment · ${order.adjustment_note}`
                            : 'Adjustment'
                    }
                    value={money(order.adjustment)}
                />
            )}
            <div className="flex items-baseline justify-between border-t pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="font-display text-xl font-semibold text-plum dark:text-blush">
                    {money(order.total)}
                </dd>
            </div>
            {order.amount_paid !== undefined && (
                <>
                    <Line label="Paid" value={money(order.amount_paid)} />
                    <div className="flex justify-between font-medium">
                        <dt>Balance due</dt>
                        <dd
                            className={cn(
                                order.balance_due
                                    ? 'text-rose'
                                    : 'text-emerald-600',
                            )}
                        >
                            {money(order.balance_due ?? 0)}
                        </dd>
                    </div>
                </>
            )}
        </dl>
    );
}

function Line({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right">{value}</dd>
        </div>
    );
}

export function OrderSpecs({ order }: { order: Order }) {
    return (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {order.category_name && (
                <Spec label="Occasion" value={order.category_name} />
            )}
            <Spec
                label="Template"
                value={order.template_name ?? 'Custom design'}
            />
            <Spec label="Design" value={order.design_mode_label} />
            <Spec label="Quantity" value={String(order.quantity)} />
            {order.selected_options.map((option) => (
                <Spec
                    key={option.id}
                    label={option.group_label}
                    value={option.name}
                />
            ))}
        </dl>
    );
}

function Spec({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-3 border-b border-dashed border-border/70 py-1.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
        </div>
    );
}

export function PersonalizationDetails({ order }: { order: Order }) {
    const entries: [string, string | undefined][] = [
        ['Names', order.personalization.names],
        ['Date', order.personalization.date],
        ['Message', order.personalization.message],
        ['Song / album title', order.personalization.song_title],
        ['Artist', order.personalization.artist],
        ['Design brief', order.personalization.design_brief],
        ['Special instructions', order.personalization.instructions],
        ['Order notes', order.customer_notes ?? undefined],
    ];

    const filled = entries.filter(([, value]) => value);

    if (filled.length === 0 && !order.personalization.color) {
        return (
            <p className="text-sm text-muted-foreground">
                No personalization details were provided.
            </p>
        );
    }

    return (
        <dl className="space-y-3 text-sm">
            {filled.map(([label, value]) => (
                <div key={label}>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {label}
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-line">{value}</dd>
                </div>
            ))}
            {order.personalization.color && (
                <div>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Accent color
                    </dt>
                    <dd className="mt-1 flex items-center gap-2">
                        <span
                            className="size-5 rounded-full ring-1 ring-black/10"
                            style={{
                                backgroundColor: order.personalization.color,
                            }}
                        />
                        {order.personalization.color}
                    </dd>
                </div>
            )}
        </dl>
    );
}

export function Panel({
    title,
    description,
    action,
    className,
    children,
}: {
    title?: string;
    description?: string;
    action?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section
            className={cn('rounded-2xl border bg-card p-5 sm:p-6', className)}
        >
            {(title || action) && (
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        {title && (
                            <h2 className="font-display text-lg font-medium">
                                {title}
                            </h2>
                        )}
                        {description && (
                            <p className="text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}
