import { Head, Link } from '@inertiajs/react';
import {
    AdminPage,
    PageHeader,
    SearchBox,
    TableShell,
} from '@/components/taptale/admin-ui';
import { Pagination } from '@/components/taptale/pagination';
import { useMoney } from '@/hooks/use-money';
import { formatDate } from '@/lib/money';
import { index, show } from '@/routes/admin/customers';
import type { SimplePaginated } from '@/types';

type CustomerRow = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    orders_count: number;
    orders_sum_total: number;
    created_at: string;
};

export default function AdminCustomers({
    customers,
    filters,
}: {
    customers: SimplePaginated<CustomerRow>;
    filters: { search: string };
}) {
    const money = useMoney();

    return (
        <>
            <Head title="Customers" />
            <AdminPage>
                <PageHeader
                    title="Customers"
                    description="Registered customers and their order history."
                />
                <SearchBox
                    value={filters.search}
                    placeholder="Search name, email or phone…"
                    url={index.url()}
                />
                <TableShell>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th className="hidden md:table-cell">Phone</th>
                            <th>Orders</th>
                            <th className="hidden sm:table-cell">
                                Lifetime value
                            </th>
                            <th className="hidden lg:table-cell">Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="py-10 text-center text-muted-foreground"
                                >
                                    No customers found.
                                </td>
                            </tr>
                        )}
                        {customers.data.map((customer) => (
                            <tr key={customer.id} className="hover:bg-muted/30">
                                <td>
                                    <Link
                                        href={show(customer.id)}
                                        className="font-medium text-plum hover:underline dark:text-blush"
                                    >
                                        {customer.name}
                                    </Link>
                                    <p className="text-xs text-muted-foreground">
                                        {customer.email}
                                    </p>
                                </td>
                                <td className="hidden md:table-cell">
                                    {customer.phone ?? '—'}
                                </td>
                                <td>{customer.orders_count}</td>
                                <td className="hidden sm:table-cell">
                                    {money(customer.orders_sum_total)}
                                </td>
                                <td className="hidden lg:table-cell">
                                    {formatDate(customer.created_at)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableShell>
                <Pagination links={customers.links} />
            </AdminPage>
        </>
    );
}

AdminCustomers.layout = {
    breadcrumbs: [{ title: 'Customers', href: index() }],
};
