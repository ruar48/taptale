import { Head, Link } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import ProductController from '@/actions/App/Http/Controllers/Admin/ProductController';
import {
    AdminPage,
    ConfirmDelete,
    PageHeader,
    SearchBox,
    TableShell,
} from '@/components/taptale/admin-ui';
import { Pagination } from '@/components/taptale/pagination';
import { ProductArt } from '@/components/taptale/product-art';
import { StatusBadge } from '@/components/taptale/status-badge';
import { Button } from '@/components/ui/button';
import { useMoney } from '@/hooks/use-money';
import { create, edit, index } from '@/routes/admin/products';
import type { Paginated, Product } from '@/types';

export default function AdminProducts({
    products,
    filters,
}: {
    products: Paginated<Product>;
    filters: { search: string };
}) {
    const money = useMoney();

    return (
        <>
            <Head title="Products" />
            <AdminPage>
                <PageHeader
                    title="Products"
                    description="Gifts, their pricing, options and availability."
                    actions={
                        <Button asChild>
                            <Link href={create()}>
                                <Plus className="size-4" /> New product
                            </Link>
                        </Button>
                    }
                />
                <SearchBox
                    value={filters.search}
                    placeholder="Search products…"
                    url={index.url()}
                />
                <TableShell>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th className="hidden lg:table-cell">Categories</th>
                            <th>Base price</th>
                            <th className="hidden sm:table-cell">Orders</th>
                            <th>Status</th>
                            <th className="w-24" />
                        </tr>
                    </thead>
                    <tbody>
                        {products.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="py-10 text-center text-muted-foreground"
                                >
                                    No products found.
                                </td>
                            </tr>
                        )}
                        {products.data.map((product) => (
                            <tr key={product.id}>
                                <td>
                                    <Link
                                        href={edit(product.slug)}
                                        className="flex items-center gap-3"
                                    >
                                        <ProductArt
                                            product={product}
                                            className="size-12 shrink-0 rounded-lg"
                                        />
                                        <div>
                                            <p className="font-medium hover:underline">
                                                {product.name}
                                            </p>
                                            <div className="mt-0.5 flex gap-1.5 text-xs text-muted-foreground">
                                                {product.is_featured && (
                                                    <span>Featured</span>
                                                )}
                                                {product.is_bestseller && (
                                                    <span>· Best seller</span>
                                                )}
                                                {product.has_digital_experience && (
                                                    <span>· NFC/QR</span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                </td>
                                <td className="hidden max-w-xs text-xs text-muted-foreground lg:table-cell">
                                    {product.categories
                                        ?.map((category) => category.name)
                                        .join(', ')}
                                </td>
                                <td className="font-medium">
                                    {money(product.base_price)}
                                </td>
                                <td className="hidden sm:table-cell">
                                    {product.orders_count ?? 0}
                                </td>
                                <td>
                                    <StatusBadge
                                        tone={
                                            product.is_active
                                                ? 'emerald'
                                                : 'zinc'
                                        }
                                    >
                                        {product.is_active
                                            ? 'Available'
                                            : 'Unavailable'}
                                    </StatusBadge>
                                </td>
                                <td>
                                    <div className="flex justify-end">
                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Edit ${product.name}`}
                                        >
                                            <Link href={edit(product.slug)}>
                                                <Pencil className="size-4" />
                                            </Link>
                                        </Button>
                                        <ConfirmDelete
                                            title={`Delete ${product.name}?`}
                                            description="Existing orders keep their product details. To hide the product instead, mark it unavailable."
                                            url={ProductController.destroy.url(
                                                product.slug,
                                            )}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableShell>
                <Pagination links={products.meta.links} />
            </AdminPage>
        </>
    );
}

AdminProducts.layout = {
    breadcrumbs: [{ title: 'Products', href: index() }],
};
