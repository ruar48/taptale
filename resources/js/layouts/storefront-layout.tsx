import { Link, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    LayoutDashboard,
    Menu,
    Package,
    ShieldCheck,
    Sparkles,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/taptale/brand-logo';
import { CookieNotice } from '@/components/taptale/cookie-notice';
import {
    ContactDetails,
    POLICY_LINKS,
    useBusiness,
} from '@/components/taptale/legal-page';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { dashboard, home, login, logout, register } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
import { index as accountOrders } from '@/routes/account/orders';
import {
    index as categoriesIndex,
    show as categoryShow,
} from '@/routes/categories';
import { create as startOrder } from '@/routes/orders';
import { cookies, privacy, terms } from '@/routes/pages';
import { templates as memoryPages } from '@/routes/experiences';
import { index as templatesIndex } from '@/routes/templates';

export default function StorefrontLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-cream text-charcoal dark:bg-background dark:text-foreground">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <CookieNotice />
        </div>
    );
}

function SiteHeader() {
    const { auth, navCategories } = usePage().props;
    const [open, setOpen] = useState(false);
    const user = auth?.user;

    return (
        <header className="sticky top-0 z-40 border-b border-plum/10 bg-cream/85 backdrop-blur-xl dark:border-border dark:bg-background/85">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:h-20 lg:px-8">
                <Link
                    href={home()}
                    className="shrink-0"
                    aria-label="Taptale home"
                >
                    <BrandLogo className="dark:[&_span]:text-blush" />
                </Link>

                <nav className="hidden items-center gap-1 lg:flex">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-plum/5 data-[state=open]:bg-plum/5">
                            Shop gifts <ChevronDown className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="start"
                            className="grid w-[30rem] grid-cols-2 gap-1 rounded-2xl p-3"
                        >
                            {(navCategories ?? []).map((category) => (
                                <DropdownMenuItem key={category.id} asChild>
                                    <Link
                                        href={categoryShow(category.slug)}
                                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
                                    >
                                        <span
                                            className="size-2.5 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    category.accent_color,
                                            }}
                                        />
                                        {category.name}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem asChild className="col-span-2">
                                <Link
                                    href={categoriesIndex()}
                                    className="mt-1 cursor-pointer justify-center rounded-xl bg-blush-light py-2.5 font-medium text-plum"
                                >
                                    Browse all occasions
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <NavLink href={templatesIndex().url}>
                        Keychain designs
                    </NavLink>
                    <NavLink href={memoryPages().url}>Memory pages</NavLink>
                    <NavLink href={`${home().url}#how-it-works`}>
                        How it works
                    </NavLink>
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    {user ? (
                        <AccountMenu />
                    ) : (
                        <Link
                            href={login()}
                            className="hidden rounded-full px-4 py-2 text-sm font-medium hover:bg-plum/5 sm:inline-flex"
                        >
                            Sign in
                        </Link>
                    )}
                    <Button
                        asChild
                        className="hidden rounded-full bg-plum px-5 text-white shadow-[0_8px_20px_-8px_rgb(113_61_80/0.6)] hover:bg-plum-dark sm:inline-flex dark:bg-blush dark:text-plum-dark"
                    >
                        <Link href={startOrder()}>
                            <Sparkles className="size-4" /> Start creating
                        </Link>
                    </Button>

                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden"
                                aria-label="Open menu"
                            >
                                <Menu className="size-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className="w-[85vw] max-w-sm overflow-y-auto bg-cream dark:bg-background"
                        >
                            <SheetHeader>
                                <SheetTitle className="text-left">
                                    <BrandLogo />
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col gap-6 px-4 pb-8">
                                <Button
                                    asChild
                                    className="h-12 rounded-full bg-plum text-base text-white hover:bg-plum-dark"
                                >
                                    <Link
                                        href={startOrder()}
                                        onClick={() => setOpen(false)}
                                    >
                                        <Sparkles className="size-4" /> Start
                                        creating
                                    </Link>
                                </Button>
                                <div>
                                    <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-rose uppercase">
                                        Occasions
                                    </p>
                                    <div className="grid gap-1">
                                        {(navCategories ?? []).map(
                                            (category) => (
                                                <Link
                                                    key={category.id}
                                                    href={categoryShow(
                                                        category.slug,
                                                    )}
                                                    onClick={() =>
                                                        setOpen(false)
                                                    }
                                                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-plum/5"
                                                >
                                                    <span
                                                        className="size-2.5 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                category.accent_color,
                                                        }}
                                                    />
                                                    {category.name}
                                                </Link>
                                            ),
                                        )}
                                    </div>
                                </div>
                                <div className="grid gap-1 border-t border-plum/10 pt-4">
                                    <Link
                                        href={templatesIndex()}
                                        onClick={() => setOpen(false)}
                                        className="rounded-xl px-3 py-2.5 hover:bg-plum/5"
                                    >
                                        Keychain designs
                                    </Link>
                                    <Link
                                        href={memoryPages()}
                                        onClick={() => setOpen(false)}
                                        className="rounded-xl px-3 py-2.5 hover:bg-plum/5"
                                    >
                                        Memory page designs
                                    </Link>
                                    {user ? (
                                        <>
                                            <Link
                                                href={accountOrders()}
                                                onClick={() => setOpen(false)}
                                                className="rounded-xl px-3 py-2.5 hover:bg-plum/5"
                                            >
                                                My orders
                                            </Link>
                                            <Link
                                                href={
                                                    user.is_admin
                                                        ? adminDashboard()
                                                        : dashboard()
                                                }
                                                onClick={() => setOpen(false)}
                                                className="rounded-xl px-3 py-2.5 hover:bg-plum/5"
                                            >
                                                {user.is_admin
                                                    ? 'Admin dashboard'
                                                    : 'My account'}
                                            </Link>
                                        </>
                                    ) : (
                                        <>
                                            <Link
                                                href={login()}
                                                onClick={() => setOpen(false)}
                                                className="rounded-xl px-3 py-2.5 hover:bg-plum/5"
                                            >
                                                Sign in
                                            </Link>
                                            <Link
                                                href={register()}
                                                onClick={() => setOpen(false)}
                                                className="rounded-xl px-3 py-2.5 hover:bg-plum/5"
                                            >
                                                Create an account
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
    const { url } = usePage();

    return (
        <Link
            href={href}
            className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-plum/5',
                url.startsWith(href) &&
                    href !== '/' &&
                    'bg-plum/5 text-plum dark:text-blush',
            )}
        >
            {children}
        </Link>
    );
}

function AccountMenu() {
    const { auth } = usePage().props;
    const user = auth.user;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="gap-2 rounded-full px-2 sm:px-3"
                >
                    <span className="flex size-8 items-center justify-center rounded-full bg-blush text-plum">
                        <UserRound className="size-4" />
                    </span>
                    <span className="hidden max-w-28 truncate text-sm md:inline">
                        {user.name.split(' ')[0]}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                    {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.is_admin && (
                    <DropdownMenuItem asChild>
                        <Link
                            href={adminDashboard()}
                            className="cursor-pointer"
                        >
                            <ShieldCheck className="mr-2 size-4" /> Admin
                            dashboard
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                    <Link href={dashboard()} className="cursor-pointer">
                        <LayoutDashboard className="mr-2 size-4" /> My account
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={accountOrders()} className="cursor-pointer">
                        <Package className="mr-2 size-4" /> My orders
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link
                        href={logout()}
                        as="button"
                        className="w-full cursor-pointer"
                    >
                        Log out
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function SiteFooter() {
    const { navCategories } = usePage().props;
    const business = useBusiness();

    return (
        <footer className="relative overflow-hidden bg-charcoal text-cream">
            <div className="absolute -top-32 -right-24 size-96 rounded-full bg-plum/40 blur-3xl" />
            <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
                <div className="max-w-sm">
                    <BrandLogo inverted />
                    <p className="mt-4 font-display text-2xl text-blush italic">
                        Every tap tells a story.
                    </p>
                    <p className="mt-3 text-sm text-cream/70">
                        Personalized keepsakes that join the things you can hold
                        with the memories you never want to lose. Handmade with
                        love in the Philippines.
                    </p>
                    <ContactDetails className="mt-5 text-sm text-cream/75 [&_a]:hover:text-white [&_svg]:text-blush" />
                    {(business.facebook_url || business.instagram_url) && (
                        <div className="mt-4 flex gap-4 text-sm text-cream/75">
                            {business.facebook_url && (
                                <a
                                    href={business.facebook_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-white"
                                >
                                    Facebook
                                </a>
                            )}
                            {business.instagram_url && (
                                <a
                                    href={business.instagram_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-white"
                                >
                                    Instagram
                                </a>
                            )}
                        </div>
                    )}
                </div>
                <div>
                    <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-blush uppercase">
                        Occasions
                    </p>
                    <ul className="grid gap-2 text-sm text-cream/75">
                        {(navCategories ?? []).slice(0, 6).map((category) => (
                            <li key={category.id}>
                                <Link
                                    href={categoryShow(category.slug)}
                                    className="hover:text-white"
                                >
                                    {category.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-blush uppercase">
                        Taptale
                    </p>
                    <ul className="grid gap-2 text-sm text-cream/75">
                        <li>
                            <Link
                                href={startOrder()}
                                className="hover:text-white"
                            >
                                Start creating
                            </Link>
                        </li>
                        <li>
                            <Link
                                href={templatesIndex()}
                                className="hover:text-white"
                            >
                                Keychain designs
                            </Link>
                        </li>
                        <li>
                            <Link
                                href={memoryPages()}
                                className="hover:text-white"
                            >
                                Memory page designs
                            </Link>
                        </li>
                        <li>
                            <Link
                                href={accountOrders()}
                                className="hover:text-white"
                            >
                                Track my order
                            </Link>
                        </li>
                        <li>
                            <Link
                                href={`${home().url}#how-it-works`}
                                className="hover:text-white"
                            >
                                How it works
                            </Link>
                        </li>
                    </ul>
                </div>
                <div>
                    <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-blush uppercase">
                        Help & legal
                    </p>
                    <ul className="grid gap-2 text-sm text-cream/75">
                        {POLICY_LINKS.map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className="hover:text-white"
                                >
                                    {link.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="relative border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-cream/50 sm:px-6 lg:px-8">
                    <p>
                        © {new Date().getFullYear()} {business.name}. Made to be
                        remembered.
                    </p>
                    <nav aria-label="Legal" className="flex gap-4">
                        <Link href={terms()} className="hover:text-white">
                            Terms
                        </Link>
                        <Link href={privacy()} className="hover:text-white">
                            Privacy
                        </Link>
                        <Link href={cookies()} className="hover:text-white">
                            Cookies
                        </Link>
                    </nav>
                </div>
            </div>
        </footer>
    );
}
