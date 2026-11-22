import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowRight, Gift, Truck } from 'lucide-react';
import OrderController from '@/actions/App/Http/Controllers/Admin/OrderController';
import { AdminPage, PageHeader } from '@/components/taptale/admin-ui';
import { Button } from '@/components/ui/button';
import { useMoney } from '@/hooks/use-money';
import { production } from '@/routes/admin';
import { show as orderShow } from '@/routes/admin/orders';

type BoardOrder = {
    reference: string;
    product_name: string;
    quantity: number;
    customer_name: string;
    city: string;
    is_gift: boolean;
    /** Centavos still owed. Anything above zero should not be made yet. */
    balance_due: number;
    ordered_at: string | null;
    waiting_since: string | null;
};

type Column = {
    status: string;
    label: string;
    next_status: string | null;
    next_label: string | null;
    orders: BoardOrder[];
};

/** Whole days since the given moment. */
function daysSince(iso: string | null): number {
    return iso
        ? Math.max(
              0,
              Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000),
          )
        : 0;
}

export default function AdminProduction({ columns }: { columns: Column[] }) {
    const money = useMoney();
    const moveTo = (order: BoardOrder, status: string) =>
        router.put(
            OrderController.updateStatus.url(order.reference),
            { status },
            { preserveScroll: true },
        );

    return (
        <>
            <Head title="Production" />
            <AdminPage>
                <PageHeader
                    title="Production"
                    description="Approved designs to make, keepsakes in the workshop, and parcels waiting for the courier. Oldest first."
                />

                <div className="grid gap-4 lg:grid-cols-3">
                    {columns.map((column) => (
                        <section
                            key={column.status}
                            className="rounded-2xl bg-muted/50 p-3"
                        >
                            <h2 className="flex items-center justify-between px-1 pb-3 text-sm font-semibold">
                                {column.label}
                                <span className="rounded-full bg-background px-2 py-0.5 text-xs">
                                    {column.orders.length}
                                </span>
                            </h2>
                            {column.orders.length === 0 ? (
                                <p className="rounded-xl border border-dashed bg-background/60 p-6 text-center text-xs text-muted-foreground">
                                    Nothing here.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {column.orders.map((order) => {
                                        const waiting = daysSince(
                                            order.waiting_since,
                                        );

                                        return (
                                            <li
                                                key={order.reference}
                                                className="rounded-xl border bg-card p-3 text-sm shadow-xs"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <Link
                                                        href={orderShow(
                                                            order.reference,
                                                        )}
                                                        className="font-mono text-xs font-semibold text-plum hover:underline dark:text-blush"
                                                    >
                                                        {order.reference}
                                                    </Link>
                                                    <span
                                                        className={
                                                            waiting >= 3
                                                                ? 'text-xs font-medium text-rose'
                                                                : 'text-xs text-muted-foreground'
                                                        }
                                                    >
                                                        {waiting === 0
                                                            ? 'Today'
                                                            : `${waiting}d`}
                                                    </span>
                                                </div>
                                                <p className="mt-1 font-medium">
                                                    {order.product_name}
                                                    {order.quantity > 1 &&
                                                        ` × ${order.quantity}`}
                                                </p>
                                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    {order.customer_name} ·{' '}
                                                    {order.city}
                                                    {order.is_gift && (
                                                        <Gift
                                                            className="size-3.5 text-rose"
                                                            aria-label="Gift order"
                                                        />
                                                    )}
                                                </p>
                                                {order.balance_due > 0 && (
                                                    <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                                                        <AlertTriangle className="size-3.5" />
                                                        Unpaid ·{' '}
                                                        {money(
                                                            order.balance_due,
                                                        )}{' '}
                                                        still due
                                                    </p>
                                                )}
                                                <div className="mt-2 flex justify-end">
                                                    {column.next_status ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                moveTo(
                                                                    order,
                                                                    column.next_status!,
                                                                )
                                                            }
                                                        >
                                                            {column.next_label}{' '}
                                                            <ArrowRight className="size-3.5" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            <Link
                                                                href={orderShow(
                                                                    order.reference,
                                                                )}
                                                            >
                                                                <Truck className="size-3.5" />{' '}
                                                                Add tracking &
                                                                ship
                                                            </Link>
                                                        </Button>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>
                    ))}
                </div>
            </AdminPage>
        </>
    );
}

AdminProduction.layout = {
    breadcrumbs: [{ title: 'Production', href: production() }],
};
