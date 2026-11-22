import { Head, Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Clock,
    Compass,
    Lock,
    RefreshCw,
    ServerCrash,
    Wrench,
} from 'lucide-react';
import { BrandLogo } from '@/components/taptale/brand-logo';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';
import { index as categoriesIndex } from '@/routes/categories';

type ErrorContent = {
    icon: LucideIcon;
    title: string;
    description: string;
    canRetry: boolean;
};

function contentFor(status: number, retryAfter: number | null): ErrorContent {
    switch (status) {
        case 403:
            return {
                icon: Lock,
                title: 'This page is private',
                description:
                    "You don't have access to this page. If that seems wrong, log in with the account that placed the order.",
                canRetry: false,
            };
        case 419:
            return {
                icon: Clock,
                title: 'This page expired',
                description:
                    'For your security the page timed out. Go back, refresh the page and try again.',
                canRetry: false,
            };
        case 429:
            return {
                icon: Clock,
                title: 'Slow down a little',
                description: `We received a lot of requests from you. Please wait ${retryAfter ? `${retryAfter} seconds` : 'a moment'} and try again.`,
                canRetry: true,
            };
        case 500:
            return {
                icon: ServerCrash,
                title: 'Something went wrong on our side',
                description:
                    "It's not you — we hit a snag. Please try again in a moment.",
                canRetry: true,
            };
        case 503:
            return {
                icon: Wrench,
                title: "We'll be right back",
                description:
                    'Taptale is getting a quick update. Please check back in a few minutes.',
                canRetry: true,
            };
        default:
            return {
                icon: Compass,
                title: "We couldn't find that page",
                description:
                    "The link may be old or mistyped. Let's get you back to something lovely.",
                canRetry: false,
            };
    }
}

/**
 * Shown for HTTP errors anywhere on the site, whether the visitor clicked a
 * link inside Taptale or opened the address directly. It is rendered without
 * shared data (see RenderErrorResponse), so it needs nothing but its props.
 */
export default function ErrorPage({
    status,
    retryAfter = null,
}: {
    status: number;
    retryAfter?: number | null;
}) {
    const {
        icon: Icon,
        title,
        description,
        canRetry,
    } = contentFor(status, retryAfter);

    return (
        <>
            <Head title={title} />
            <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-16 text-center text-charcoal dark:bg-background dark:text-foreground">
                <Link href={home()} aria-label="Taptale home">
                    <BrandLogo />
                </Link>

                <div className="mt-12 flex size-16 items-center justify-center rounded-full bg-blush/60 text-plum dark:bg-plum/30 dark:text-blush">
                    <Icon className="size-7" strokeWidth={1.75} />
                </div>
                <p className="mt-6 text-xs font-medium tracking-wider text-rose uppercase">
                    Error {status}
                </p>
                <h1 className="mt-2 max-w-md font-display text-3xl font-semibold text-plum sm:text-4xl dark:text-blush">
                    {title}
                </h1>
                <p className="mt-4 max-w-md text-muted-foreground">
                    {description}
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    {canRetry ? (
                        <>
                            <Button
                                className="rounded-full bg-plum text-white hover:bg-plum-dark"
                                onClick={() => window.location.reload()}
                            >
                                <RefreshCw className="size-4" /> Try again
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="rounded-full"
                            >
                                <Link href={home()}>Back to home</Link>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                asChild
                                className="rounded-full bg-plum text-white hover:bg-plum-dark"
                            >
                                <Link href={home()}>Back to home</Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="rounded-full"
                            >
                                <Link href={categoriesIndex()}>
                                    Browse gifts
                                </Link>
                            </Button>
                        </>
                    )}
                </div>
            </main>
        </>
    );
}
