import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import CustomerController from '@/actions/App/Http/Controllers/Admin/CustomerController';
import {
    AdminPage,
    FormField,
    PageHeader,
    TableShell,
} from '@/components/taptale/admin-ui';
import { Panel } from '@/components/taptale/order-parts';
import { StatusBadge } from '@/components/taptale/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMoney } from '@/hooks/use-money';
import { formatDate } from '@/lib/money';
import { index, show } from '@/routes/admin/customers';
import { show as orderShow } from '@/routes/admin/orders';
import type { Order } from '@/types';

type Customer = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    address_line: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    email_verified_at: string | null;
    created_at: string;
};

export default function AdminCustomerShow({
    customer,
    orders,
}: {
    customer: Customer;
    orders: Order[];
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Customers', href: index() },
            { title: customer.name, href: show(customer.id) },
        ],
    });

    const money = useMoney();
    const lifetime = orders
        .filter((order) => order.status !== 'cancelled')
        .reduce((sum, order) => sum + order.total, 0);
    const form = useForm({
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? '',
        address_line: customer.address_line ?? '',
        city: customer.city ?? '',
        province: customer.province ?? '',
        postal_code: customer.postal_code ?? '',
    });

    return (
        <>
            <Head title={customer.name} />
            <AdminPage>
                <PageHeader
                    title={customer.name}
                    description={`Customer since ${formatDate(customer.created_at)} · ${orders.length} ${orders.length === 1 ? 'order' : 'orders'} · ${money(lifetime)} lifetime`}
                />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <section>
                        <h2 className="mb-3 font-display text-lg">
                            Order history
                        </h2>
                        <TableShell>
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th className="hidden sm:table-cell">
                                        Product
                                    </th>
                                    <th>Status</th>
                                    <th className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-10 text-center text-muted-foreground"
                                        >
                                            No orders yet.
                                        </td>
                                    </tr>
                                )}
                                {orders.map((order) => (
                                    <tr key={order.id}>
                                        <td>
                                            <Link
                                                href={orderShow(
                                                    order.reference,
                                                )}
                                                className="font-medium text-plum hover:underline dark:text-blush"
                                            >
                                                {order.reference}
                                            </Link>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(order.created_at)}
                                            </p>
                                        </td>
                                        <td className="hidden sm:table-cell">
                                            {order.product_name}
                                        </td>
                                        <td>
                                            <StatusBadge
                                                tone={order.status_tone}
                                            >
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

                    <Panel
                        title="Customer information"
                        description={
                            customer.email_verified_at
                                ? 'Email verified'
                                : 'Email not verified'
                        }
                    >
                        <form
                            className="space-y-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                form.put(
                                    CustomerController.update.url(customer.id),
                                    { preserveScroll: true },
                                );
                            }}
                        >
                            <FormField label="Name" error={form.errors.name}>
                                <Input
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                />
                            </FormField>
                            <FormField label="Email" error={form.errors.email}>
                                <Input
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) =>
                                        form.setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <FormField label="Phone" error={form.errors.phone}>
                                <Input
                                    value={form.data.phone}
                                    onChange={(event) =>
                                        form.setData(
                                            'phone',
                                            event.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <FormField
                                label="Address"
                                error={form.errors.address_line}
                            >
                                <Input
                                    value={form.data.address_line}
                                    onChange={(event) =>
                                        form.setData(
                                            'address_line',
                                            event.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    label="City"
                                    error={form.errors.city}
                                >
                                    <Input
                                        value={form.data.city}
                                        onChange={(event) =>
                                            form.setData(
                                                'city',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label="Province"
                                    error={form.errors.province}
                                >
                                    <Input
                                        value={form.data.province}
                                        onChange={(event) =>
                                            form.setData(
                                                'province',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                            </div>
                            <FormField
                                label="Postal code"
                                error={form.errors.postal_code}
                            >
                                <Input
                                    value={form.data.postal_code}
                                    onChange={(event) =>
                                        form.setData(
                                            'postal_code',
                                            event.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <Button
                                type="submit"
                                disabled={form.processing || !form.isDirty}
                                className="w-full"
                            >
                                {form.processing && (
                                    <Loader2 className="size-4 animate-spin" />
                                )}{' '}
                                Save customer
                            </Button>
                        </form>
                    </Panel>
                </div>
            </AdminPage>
        </>
    );
}
