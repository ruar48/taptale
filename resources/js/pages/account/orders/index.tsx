import { Head, Link } from '@inertiajs/react';
import { ChevronRight, Package } from 'lucide-react';
import Heading from '@/components/heading';
import { Pagination } from '@/components/taptale/pagination';
import { ProductArt } from '@/components/taptale/product-art';
import { StatusBadge } from '@/components/taptale/status-badge';
import { Button } from '@/components/ui/button';
import { useMoney } from '@/hooks/use-money';
import { formatDate } from '@/lib/money';
import {
    index as ordersIndex,
    show as orderShow,
} from '@/routes/account/orders';
import { create as startOrder } from '@/routes/orders';
import type { Order, Paginated } from '@/types';

export default function OrdersIndex({ orders }: { orders: Paginated<Order> }) {
    const money = useMoney();

    return (
        <>
            <Head title="My orders" />
            <div className="p-4 sm:p-6">
                <Heading
                    title="My orders"
                    description="Track your personalized gifts from design to delivery."
                />

                {orders.data.length === 0 ? (
                    <div className="flex flex-col items-center rounded-2xl border border-dashed py-16 text-center">
                        <Package className="size-10 text-blush" />
                        <p className="mt-3 font-display text-xl">
                            No orders yet
                        </p>
                        <Button asChild className="mt-5 rounded-full">
                            <Link href={startOrder()}>
                                Create your first gift
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <ul className="grid gap-3">
                        {orders.data.map((order) => (
                            <li key={order.id}>
                                <Link
                                    href={orderShow(order.reference)}
                                    className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition hover:border-rose/40 hover:shadow-md"
                                >
                                    <div className="size-16 shrink-0 overflow-hidden rounded-xl">
                                        <ProductArt
                                            product={{
                                                id: order.id,
                                                name: order.product_name,
                                                art_style:
                                                    order.product_art_style ??
                                                    'acrylic',
                                            }}
                                            className="size-full"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                            {order.product_name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {order.reference} · {order.quantity}{' '}
                                            pcs · {formatDate(order.created_at)}
                                        </p>
                                        <div className="mt-2 sm:hidden">
                                            <StatusBadge
                                                tone={order.status_tone}
                                            >
                                                {order.status_label}
                                            </StatusBadge>
                                        </div>
                                    </div>
                                    <div className="hidden text-right sm:block">
                                        <StatusBadge tone={order.status_tone}>
                                            {order.status_label}
                                        </StatusBadge>
                                        <p className="mt-1 font-medium">
                                            {money(order.total)}
                                        </p>
                                    </div>
                                    <ChevronRight className="size-5 text-muted-foreground" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
                <Pagination links={orders.meta.links} />
            </div>
        </>
    );
}

OrdersIndex.layout = {
    breadcrumbs: [{ title: 'My orders', href: ordersIndex() }],
};
