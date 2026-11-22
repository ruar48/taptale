import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Banknote,
    CalendarRange,
    Users,
    Wallet,
} from 'lucide-react';
import {
    AdminPage,
    PageHeader,
    TableShell,
} from '@/components/taptale/admin-ui';
import { StatusBadge } from '@/components/taptale/status-badge';
import { Button } from '@/components/ui/button';
import { useMoney } from '@/hooks/use-money';
import { formatDate } from '@/lib/money';
import { dashboard } from '@/routes/admin';
import { index as ordersIndex, show as orderShow } from '@/routes/admin/orders';
import { index as paymentsIndex } from '@/routes/admin/payments';
import type { Order } from '@/types';

type Props = {
    metrics: {
        revenue: number;
        orders_this_month: number;
        customers: number;
        pending_payments: number;
    };
    queues: { label: string; status: string; count: number }[];
    recentOrders: Order[];
};

export default function AdminDashboard({
    metrics,
    queues,
    recentOrders,
}: Props) {
    const money = useMoney();

    return (
        <>
            <Head title="Studio Dashboard" />
            <AdminPage>
                <PageHeader
                    title="Studio dashboard"
                    description="What needs your attention today."
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                        icon={Banknote}
                        label="Net revenue"
                        value={money(metrics.revenue)}
                    />
                    <Metric
                        icon={CalendarRange}
                        label="Orders this month"
                        value={String(metrics.orders_this_month)}
                    />
                    <Metric
                        icon={Users}
                        label="Customers"
                        value={String(metrics.customers)}
                    />
                    <Link href={paymentsIndex()} className="block">
                        <Metric
                            icon={Wallet}
                            label="Payments to verify"
                            value={String(metrics.pending_payments)}
                            highlight={metrics.pending_payments > 0}
                        />
                    </Link>
                </div>

                <section>
                    <h2 className="mb-3 font-display text-lg">Work queues</h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {queues.map((queue) => (
                            <Link
                                key={queue.label}
                                href={ordersIndex({
                                    query: { status: queue.status },
                                })}
                                className="group flex items-center justify-between rounded-2xl border bg-card p-4 transition hover:border-rose/50 hover:shadow-sm"
                            >
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        {queue.label}
                                    </p>
                                    <p className="mt-1 font-display text-2xl">
                                        {queue.count}
                                    </p>
                                </div>
                                <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-rose" />
                            </Link>
                        ))}
                    </div>
                </section>

                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="font-display text-lg">Latest orders</h2>
                        <Button asChild variant="ghost" size="sm">
                            <Link href={ordersIndex()}>View all</Link>
                        </Button>
                    </div>
                    <TableShell>
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Customer</th>
                                <th className="hidden md:table-cell">
                                    Product
                                </th>
                                <th>Status</th>
                                <th className="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-10 text-center text-muted-foreground"
                                    >
                                        No orders yet.
                                    </td>
                                </tr>
                            )}
                            {recentOrders.map((order) => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-muted/30"
                                >
                                    <td>
                                        <Link
                                            href={orderShow(order.reference)}
                                            className="font-medium text-plum hover:underline dark:text-blush"
                                        >
                                            {order.reference}
                                        </Link>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(order.created_at)}
                                        </p>
                                    </td>
                                    <td>{order.customer_name}</td>
                                    <td className="hidden md:table-cell">
                                        {order.product_name}
                                    </td>
                                    <td>
                                        <StatusBadge tone={order.status_tone}>
                                            {order.status_label}
                                        </StatusBadge>
                                    </td>
                                    <td className="text-right font-medium">
                                        {money(order.total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </TableShell>
                </section>
            </AdminPage>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Studio dashboard', href: dashboard() }],
};

function Metric({
    icon: Icon,
    label,
    value,
    highlight = false,
}: {
    icon: typeof Banknote;
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div
            className={`rounded-2xl border p-5 ${highlight ? 'border-rose/40 bg-blush-light/50 dark:bg-rose/10' : 'bg-card'}`}
        >
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="size-5 text-rose" />
            </div>
            <p className="mt-2 font-display text-3xl">{value}</p>
        </div>
    );
}
