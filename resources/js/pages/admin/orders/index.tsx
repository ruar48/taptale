import { Head, Link } from '@inertiajs/react';
import { Download } from 'lucide-react';
import {
    AdminPage,
    PageHeader,
    SearchBox,
    TableShell,
} from '@/components/taptale/admin-ui';
import { Pagination } from '@/components/taptale/pagination';
import { StatusBadge } from '@/components/taptale/status-badge';
import { useMoney } from '@/hooks/use-money';
import { formatDate } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    exportMethod as exportOrders,
    index,
    show,
} from '@/routes/admin/orders';
import type { Order, Paginated, StatusOption } from '@/types';

type Props = {
    orders: Paginated<Order>;
    filters: { status: string | null; search: string };
    statusCounts: Record<string, number>;
    statuses: StatusOption[];
};

export default function AdminOrders({
    orders,
    filters,
    statusCounts,
    statuses,
}: Props) {
    const money = useMoney();
    const total = Object.values(statusCounts).reduce(
        (sum, count) => sum + Number(count),
        0,
    );

    return (
        <>
            <Head title="Orders" />
            <AdminPage>
                <PageHeader
                    title="Orders"
                    description="Every personalized order, from payment to delivery."
                    actions={
                        <Button asChild variant="outline">
                            <a
                                href={exportOrders.url({
                                    query: {
                                        status: filters.status ?? undefined,
                                        search: filters.search || undefined,
                                    },
                                })}
                            >
                                <Download className="size-4" /> Export CSV
                            </a>
                        </Button>
                    }
                />

                <div className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                    <StatusTab
                        href={index.url({
                            query: { search: filters.search || undefined },
                        })}
                        active={!filters.status}
                        label="All"
                        count={total}
                    />
                    {statuses.map((status) => (
                        <StatusTab
                            key={status.value}
                            href={index.url({
                                query: {
                                    status: status.value,
                                    search: filters.search || undefined,
                                },
                            })}
                            active={filters.status === status.value}
                            label={status.label}
                            count={Number(statusCounts[status.value] ?? 0)}
                        />
                    ))}
                </div>

                <SearchBox
                    value={filters.search}
                    placeholder="Search reference, name or email…"
                    url={index.url()}
                    extra={{ status: filters.status ?? undefined }}
                />

                <TableShell>
                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Customer</th>
                            <th className="hidden lg:table-cell">Product</th>
                            <th className="hidden md:table-cell">Design</th>
                            <th>Status</th>
                            <th className="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="py-12 text-center text-muted-foreground"
                                >
                                    No orders match these filters.
                                </td>
                            </tr>
                        )}
                        {orders.data.map((order) => (
                            <tr key={order.id} className="hover:bg-muted/30">
                                <td>
                                    <Link
                                        href={show(order.reference)}
                                        className="font-medium text-plum hover:underline dark:text-blush"
                                    >
                                        {order.reference}
                                    </Link>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDate(order.created_at, true)}
                                    </p>
                                </td>
                                <td>
                                    <p>{order.customer_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {order.customer_email}
                                    </p>
                                </td>
                                <td className="hidden lg:table-cell">
                                    {order.product_name}
                                    <p className="text-xs text-muted-foreground">
                                        {order.quantity} pcs
                                    </p>
                                </td>
                                <td className="hidden text-xs md:table-cell">
                                    {order.design_mode === 'self'
                                        ? 'Customer'
                                        : 'Taptale'}
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
                <Pagination links={orders.meta.links} />
            </AdminPage>
        </>
    );
}

AdminOrders.layout = {
    breadcrumbs: [{ title: 'Orders', href: index() }],
};

function StatusTab({
    href,
    active,
    label,
    count,
}: {
    href: string;
    active: boolean;
    label: string;
    count: number;
}) {
    return (
        <Link
            href={href}
            preserveScroll
            className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition',
                active
                    ? 'border-plum bg-plum text-white dark:border-blush dark:bg-blush dark:text-plum-dark'
                    : 'bg-card hover:border-rose',
            )}
        >
            {label}
            <span
                className={cn(
                    'rounded-full px-1.5 text-xs',
                    active ? 'bg-white/20' : 'bg-muted text-muted-foreground',
                )}
            >
                {count}
            </span>
        </Link>
    );
}
