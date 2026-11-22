import { Head, Link, usePage } from '@inertiajs/react';
import { Mail, MapPin, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDate } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
    about,
    cookies,
    privacy,
    returns,
    shipping,
    terms,
} from '@/routes/pages';

export type LegalSection = {
    id: string;
    title: string;
    content: ReactNode;
};

/**
 * Links to every About and policy page, used by the page sidebar and the site footer.
 */
export const POLICY_LINKS = [
    { title: 'About us', href: about.url() },
    { title: 'Shipping & delivery', href: shipping.url() },
    { title: 'Returns & refunds', href: returns.url() },
    { title: 'Terms of service', href: terms.url() },
    { title: 'Privacy policy', href: privacy.url() },
    { title: 'Cookie policy', href: cookies.url() },
];

/**
 * The store's contact details from config('taptale.business').
 */
export function useBusiness() {
    return usePage().props.storefront.business;
}

/**
 * Shared layout for the About and policy pages: a header, a table of
 * contents and readable long-form sections.
 */
export function LegalPage({
    title,
    eyebrow = 'Policies',
    intro,
    sections,
    showUpdatedOn = true,
}: {
    title: string;
    eyebrow?: string;
    intro: ReactNode;
    sections: LegalSection[];
    showUpdatedOn?: boolean;
}) {
    const { url } = usePage();
    const updatedOn = usePage().props.storefront.policiesUpdatedOn;
    const currentPath = url.split(/[?#]/)[0];

    return (
        <>
            <Head title={title} />
            <section className="border-b border-plum/10 dark:border-border">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                    <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-rose uppercase">
                        {eyebrow}
                    </p>
                    <h1 className="font-display text-4xl leading-tight font-medium text-balance sm:text-5xl">
                        {title}
                    </h1>
                    <div className="mt-4 max-w-2xl text-base text-muted-foreground">
                        {intro}
                    </div>
                    {showUpdatedOn && (
                        <p className="mt-4 text-sm text-muted-foreground">
                            Last updated {formatDate(updatedOn)}
                        </p>
                    )}
                </div>
            </section>

            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[15rem_1fr] lg:px-8 lg:py-16">
                <aside className="lg:sticky lg:top-28 lg:self-start">
                    <nav aria-label="On this page" className="hidden lg:block">
                        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                            On this page
                        </p>
                        <ol className="grid gap-1.5 text-sm">
                            {sections.map((section) => (
                                <li key={section.id}>
                                    <a
                                        href={`#${section.id}`}
                                        className="text-muted-foreground transition hover:text-plum dark:hover:text-blush"
                                    >
                                        {section.title}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </nav>
                    <nav
                        aria-label="Policies"
                        className="rounded-2xl border border-plum/10 bg-white/60 p-4 lg:mt-8 dark:border-border dark:bg-card"
                    >
                        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                            Help & legal
                        </p>
                        <ul className="grid gap-1 text-sm">
                            {POLICY_LINKS.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className={cn(
                                            'block rounded-lg px-2 py-1.5 transition hover:bg-plum/5',
                                            currentPath === link.href &&
                                                'bg-plum/5 font-medium text-plum dark:text-blush',
                                        )}
                                    >
                                        {link.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>

                <article className="max-w-3xl min-w-0 space-y-12">
                    {sections.map((section) => (
                        <section
                            key={section.id}
                            id={section.id}
                            className="scroll-mt-28"
                        >
                            <h2 className="font-display text-2xl font-medium">
                                {section.title}
                            </h2>
                            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-charcoal/85 dark:text-foreground/85 [&_a]:font-medium [&_a]:text-plum [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-blush [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                                {section.content}
                            </div>
                        </section>
                    ))}
                    <ContactCard />
                </article>
            </div>
        </>
    );
}

/**
 * The business contact details, hiding any that are not configured.
 */
export function ContactDetails({ className }: { className?: string }) {
    const business = useBusiness();

    return (
        <ul className={cn('grid gap-2', className)}>
            {business.email && (
                <li className="flex items-center gap-2">
                    <Mail className="size-4 shrink-0 text-rose" />
                    <a href={`mailto:${business.email}`}>{business.email}</a>
                </li>
            )}
            {business.phone && (
                <li className="flex items-center gap-2">
                    <Phone className="size-4 shrink-0 text-rose" />
                    <a href={`tel:${business.phone.replace(/\s+/g, '')}`}>
                        {business.phone}
                    </a>
                </li>
            )}
            {business.address && (
                <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-rose" />
                    <span>{business.address}</span>
                </li>
            )}
        </ul>
    );
}

function ContactCard() {
    return (
        <section className="rounded-3xl bg-blush-light/70 p-6 sm:p-8 dark:bg-rose/10">
            <h2 className="font-display text-2xl font-medium">
                Questions? We're happy to help.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
                Reach out and a real person from our studio will get back to
                you, usually within one business day.
            </p>
            <ContactDetails className="mt-4 text-sm [&_a]:font-medium [&_a]:text-plum dark:[&_a]:text-blush" />
        </section>
    );
}

/**
 * Inline contact line for use inside policy text, e.g. "email us at …".
 */
export function ContactInline(): ReactNode {
    const business = useBusiness();

    if (business.email) {
        return <a href={`mailto:${business.email}`}>{business.email}</a>;
    }

    if (business.phone) {
        return <span>{business.phone}</span>;
    }

    return <span>the contact details below</span>;
}
