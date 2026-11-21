import { Link, usePage } from '@inertiajs/react';
import {
    CreditCard,
    FolderHeart,
    LayoutGrid,
    LayoutTemplate,
    Package,
    ReceiptText,
    Sparkles,
    Store,
    Tags,
    Users,
    Wallet,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard, home } from '@/routes';
import { index as accountOrders } from '@/routes/account/orders';
import { dashboard as adminDashboard } from '@/routes/admin';
import { index as categoriesIndex } from '@/routes/admin/categories';
import { index as customersIndex } from '@/routes/admin/customers';
import { index as ordersIndex } from '@/routes/admin/orders';
import { index as paymentMethodsIndex } from '@/routes/admin/payment-methods';
import { index as paymentsIndex } from '@/routes/admin/payments';
import { index as productsIndex } from '@/routes/admin/products';
import { index as templatesIndex } from '@/routes/admin/templates';
import { create as startOrder } from '@/routes/orders';
import type { NavItem } from '@/types';

const customerNavItems: NavItem[] = [
    { title: 'Overview', href: dashboard(), icon: LayoutGrid },
    { title: 'My orders', href: accountOrders(), icon: Package },
    { title: 'Create a gift', href: startOrder(), icon: Sparkles },
];

const adminOperationsItems: NavItem[] = [
    { title: 'Dashboard', href: adminDashboard(), icon: LayoutGrid },
    { title: 'Orders', href: ordersIndex(), icon: ReceiptText },
    { title: 'Payments', href: paymentsIndex(), icon: Wallet },
    { title: 'Customers', href: customersIndex(), icon: Users },
];

const adminCatalogItems: NavItem[] = [
    { title: 'Products', href: productsIndex(), icon: FolderHeart },
    { title: 'Categories', href: categoriesIndex(), icon: Tags },
    { title: 'Templates', href: templatesIndex(), icon: LayoutTemplate },
    { title: 'Payment methods', href: paymentMethodsIndex(), icon: CreditCard },
];

const footerNavItems: NavItem[] = [
    { title: 'Visit storefront', href: home(), icon: Store },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const isAdmin = auth.user?.is_admin === true;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={isAdmin ? adminDashboard() : dashboard()}
                                prefetch
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {isAdmin ? (
                    <>
                        <NavMain label="Studio" items={adminOperationsItems} />
                        <NavMain label="Catalog" items={adminCatalogItems} />
                        <NavMain
                            label="My account"
                            items={customerNavItems.slice(1, 2)}
                        />
                    </>
                ) : (
                    <NavMain label="My account" items={customerNavItems} />
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
