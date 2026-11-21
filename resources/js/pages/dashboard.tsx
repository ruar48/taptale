import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, BellRing, Package, Sparkles } from 'lucide-react';
import { ProductArt } from '@/components/taptale/product-art';
import { StatusBadge } from '@/components/taptale/status-badge';
import { Button } from '@/components/ui/button';
import { useMoney } from '@/hooks/use-money';
import { formatDate } from '@/lib/money';
import { dashboard } from '@/routes';
import { index as ordersIndex, show as orderShow } from '@/routes/account/orders';
import { create as startOrder } from '@/routes/orders';
import type { Order } from '@/types';

type Props = {
    recentOrders: Order[];
    needsAttention: Order[];
    stats: { total: number; open: number; completed: number };
};

export default function Dashboard({ recentOrders, needsAttention, stats }: Props) {
    const { auth } = usePage().props;
    const money = useMoney();

    return (
        <>
            <Head title="My account" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                <div className="relative overflow-hidden rounded-3xl bg-plum p-6 text-white sm:p-8">
                    <div className="absolute -top-16 -right-10 size-56 rounded-full bg-rose/40 blur-2xl" />
                    <p className="relative text-sm text-blush">Welcome back,</p>
                    <h1 className="relative mt-1 font-display text-3xl font-medium sm:text-4xl">
                        {auth.user.name.split(' ')[0]}
                    </h1>
                    <p className="relative mt-2 max-w-lg text-white/80">
                        Track your gifts, approve designs and manage your tap-enabled memories — all in one place.
                    </p>
                    <Button asChild className="relative mt-5 rounded-full bg-cream text-plum hover:bg-white">
                        <Link href={startOrder()}>
                            <Sparkles className="size-4" /> Create a new gift
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    {[
                        { label: 'All orders', value: stats.total },
                        { label: 'In progress', value: stats.open },
                        { label: 'Completed', value: stats.completed },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-2xl border bg-card p-5">
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                            <p className="mt-1 font-display text-3xl">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {needsAttention.length > 0 && (
                    <section className="rounded-2xl border border-rose/30 bg-blush-light/40 p-5 dark:bg-rose/10">
                        <h2 className="flex items-center gap-2 font-display text-lg">
                            <BellRing className="size-5 text-rose" /> Needs your attention
                        </h2>
                        <ul className="mt-4 grid gap-3">
                            {needsAttention.map((order) => (
                                <li key={order.id}>
                                    <Link
                                        href={orderShow(order.reference)}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4 transition hover:shadow-md"
                                    >
                                        <div>
                                            <p className="font-medium">{order.product_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {order.status === 'awaiting_customer_approval'
                                                    ? 'Your design is ready — please review it.'
                                                    : 'Upload your payment to get started.'}
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-sm font-medium text-plum dark:text-blush">
                                            Open <ArrowRight className="size-4" />
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <section className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg">Recent orders</h2>
                        {recentOrders.length > 0 && (
                            <Link href={ordersIndex()} className="text-sm font-medium text-plum hover:underline dark:text-blush">
                                View all
                            </Link>
                        )}
                    </div>
                    {recentOrders.length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-center">
                            <Package className="size-10 text-blush" />
                            <p className="mt-3 font-display text-xl">No orders yet</p>
                            <p className="mt-1 text-sm text-muted-foreground">Your first keepsake is just a few taps away.</p>
                            <Button asChild className="mt-5 rounded-full">
                                <Link href={startOrder()}>Start creating</Link>
                            </Button>
                        </div>
                    ) : (
                        <ul className="mt-4 divide-y">
                            {recentOrders.map((order) => (
                                <li key={order.id}>
                                    <Link href={orderShow(order.reference)} className="flex items-center gap-4 py-3">
                                        <div className="hidden size-12 shrink-0 overflow-hidden rounded-xl sm:block">
                                            <ProductArt
                                                product={{ id: order.id, name: order.product_name, art_style: order.product_art_style ?? 'acrylic' }}
                                                className="size-full"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium">{order.product_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {order.reference} · {formatDate(order.created_at)}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <StatusBadge tone={order.status_tone}>{order.status_label}</StatusBadge>
                                            <span className="text-sm font-medium">{money(order.total)}</span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'My account', href: dashboard() }],
};
