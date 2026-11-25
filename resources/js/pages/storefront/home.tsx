import { Head, Link, usePage } from "@inertiajs/react";
import { useRef } from "react";
import {
    ArrowRight,
    Gift,
    Heart,
    MapPin,
    Nfc,
    Plus,
    QrCode,
    Quote,
    ShieldCheck,
    Sparkle,
    Sparkles,
    Star,
    Truck,
    Zap,
} from "lucide-react";
import { CategoryCard } from "@/components/taptale/category-card";
import { CategoryIllustration } from "@/components/taptale/category-illustration";
import { ProductCard } from "@/components/taptale/product-card";
import { SectionHeading } from "@/components/taptale/section-heading";
import { StepIllustration } from "@/components/taptale/step-illustration";
import type { StepScene } from "@/components/taptale/step-illustration";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";
import { index as categoriesIndex } from "@/routes/categories";
import { templates as memoryPages } from "@/routes/experiences";
import { create as startOrder } from "@/routes/orders";
import { about, shipping } from "@/routes/pages";
import type { Category, Product, Testimonial } from "@/types";

type Props = {
    categories: Category[];
    featuredProducts: Product[];
    bestsellers: Product[];
    testimonials: Testimonial[];
    faqs: Faq[];
};

type Faq = { question: string; answer: string };

/**
 * Kept in sync with the <link rel="preload"> in app.blade.php so the browser fetches
 * the hero before the JavaScript has even loaded.
 */
const HERO_SRCSET = [640, 960, 1280, 1672]
    .map(
        (width) =>
            `/image/taptale-nfc-wedding-couple-hero${width === 1672 ? '' : `-${width}`}.webp ${width}w`,
    )
    .join(', ');
const HERO_SIZES = '(min-width: 1024px) 100vw, calc(100vw - 2rem)';

const STEPS: Array<{ scene: StepScene; title: string; body: string }> = [
    {
        scene: "calendar",
        title: "Choose the occasion",
        body: "Anniversary, wedding, baptism, graduation — start with who the gift is for.",
    },
    {
        scene: "keychain",
        title: "Pick your gift",
        body: "Browse keychains and keepsakes made for the moment — what you see is what you get.",
    },
    {
        scene: "polaroid",
        title: "Add your story",
        body: "Upload photos, names and a message — or tell us your idea and our designers take it from there.",
    },
    {
        scene: "gift",
        title: "Approve, then we craft",
        body: "Nothing goes into production until you approve your design. Then we make it by hand.",
    },
];

export default function Home({
    categories,
    featuredProducts,
    bestsellers,
    testimonials,
    faqs,
}: Props) {
    const { town } = usePage().props.storefront.business;

    return (
        <>
            <Head title={`NFC Keychains & Photo Gifts in ${town}`} />

            {/* overflow-clip (not hidden) keeps the backdrop sticky while cutting it off at the end of <LocalStudio> */}
            <div className="flex flex-col lg:overflow-clip">
                <HeroBackdrop />
                <Hero />
                <LocalStudio />
            </div>

            <ShopByOccasion categories={categories} />

            <HowItWorks />

            {featuredProducts.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                    <SectionHeading
                        eyebrow="Featured keepsakes"
                        title="Made to be held, made to be remembered"
                        description="Our most-loved ways to turn a moment into something you can carry."
                    />
                    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {featuredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </section>
            )}

            <TapSection />

            {bestsellers.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                    <SectionHeading
                        eyebrow="Best sellers"
                        title="The gifts everyone is tapping"
                    />
                    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {bestsellers.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </section>
            )}

            {testimonials.length > 0 && (
                <section className="bg-blush/30 py-20 dark:bg-muted/30">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionHeading
                            align="center"
                            eyebrow="Stories from our customers"
                            title="Little things, big feelings"
                        />
                        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {testimonials.map((testimonial) => (
                                <figure
                                    key={testimonial.id}
                                    className="flex flex-col rounded-3xl bg-card p-6 shadow-[0_16px_40px_-28px_rgb(113_61_80/0.5)]"
                                >
                                    <Quote className="size-7 text-blush" />
                                    <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-foreground/85">
                                        {testimonial.quote}
                                    </blockquote>
                                    <div className="mt-5 flex gap-0.5 text-rose">
                                        {Array.from({
                                            length: testimonial.rating,
                                        }).map((_, index) => (
                                            <Star
                                                key={index}
                                                className="size-4 fill-current"
                                            />
                                        ))}
                                    </div>
                                    <figcaption className="mt-2">
                                        <p className="font-medium">
                                            {testimonial.author_name}
                                        </p>
                                        {testimonial.occasion && (
                                            <p className="text-sm text-muted-foreground">
                                                {testimonial.occasion}
                                            </p>
                                        )}
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <Faqs faqs={faqs} />

            <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <div className="relative overflow-hidden rounded-[2.5rem] bg-plum px-6 py-16 text-center text-white sm:px-12">
                    <div className="absolute -top-24 -left-16 size-72 rounded-full bg-rose/50 blur-3xl" />
                    <div className="absolute -right-16 -bottom-24 size-72 rounded-full bg-blush/30 blur-3xl" />
                    <div className="relative mx-auto max-w-2xl">
                        <Sparkles className="mx-auto size-8 text-blush" />
                        <h2 className="mt-4 font-display text-4xl leading-tight font-medium text-balance sm:text-5xl">
                            Their story deserves more than a card.
                        </h2>
                        <p className="mt-4 text-lg text-white/80">
                            Start with an occasion and we'll guide you through
                            every step — preview, approve, and we'll handle the
                            rest.
                        </p>
                        <Button
                            asChild
                            size="lg"
                            className="mt-8 h-14 rounded-full bg-cream px-8 text-base text-plum hover:bg-white"
                        >
                            <Link href={startOrder()}>
                                Create your personalized gift
                                <ArrowRight className="size-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </>
    );
}

const OCCASION_SPARKLES = [
    { className: "top-24 right-[16rem] size-5 xl:right-[20rem]", delay: 0 },
    { className: "top-10 right-[29rem] size-4 xl:right-[34rem]", delay: 0.9 },
    { className: "top-4 right-[15rem] size-3 xl:right-[19rem]", delay: 1.6 },
];

const OCCASION_FLOATING_HEARTS = [
    { className: "top-[18%] left-[2%] size-5", delay: 0 },
    { className: "top-[55%] right-[1.5%] size-6", delay: 2.5 },
    { className: "top-[85%] left-[1%] size-4", delay: 4.5 },
    { className: "top-[6%] left-[44%] size-4", delay: 1.5 },
];

function ShopByOccasion({ categories }: { categories: Category[] }) {
    const sectionRef = useRef<HTMLElement>(null);
    const isVisible = useInView(sectionRef);
    const shownCategories = categories.slice(0, 8);

    return (
        <section
            ref={sectionRef}
            className={cn(
                "reveal-on-view relative isolate",
                isVisible && "is-visible",
            )}
        >
            <OccasionsBackdrop />
            {OCCASION_FLOATING_HEARTS.map(({ className, delay }) => (
                <Heart
                    key={className}
                    aria-hidden="true"
                    className={cn(
                        "pointer-events-none absolute -z-10 hidden animate-float-slow fill-current text-rose/20 sm:block",
                        className,
                    )}
                    style={{ animationDelay: `${delay}s` }}
                />
            ))}

            <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <div
                    className="pointer-events-none absolute top-6 right-[18rem] hidden w-36 animate-pop-in lg:block xl:right-[22rem] xl:w-44"
                    style={{ animationDelay: "0.3s" }}
                >
                    <CategoryIllustration
                        name="gift"
                        className="w-full animate-float-slow drop-shadow-[0_14px_18px_rgba(113,61,80,0.18)]"
                    />
                </div>
                {OCCASION_SPARKLES.map(({ className, delay }) => (
                    <Sparkle
                        key={className}
                        aria-hidden="true"
                        className={cn(
                            "pointer-events-none absolute hidden animate-twinkle fill-current text-[#e8a35c] lg:block",
                            className,
                        )}
                        style={{ animationDelay: `${delay}s` }}
                    />
                ))}

                <SectionHeading
                    className="animate-fade-up"
                    eyebrow="Shop by occasion"
                    title={
                        <>
                            A keepsake for every{" "}
                            <span className="relative inline-block">
                                <em className="text-rose">chapter</em>
                                <svg
                                    viewBox="0 0 160 40"
                                    aria-hidden="true"
                                    className="pointer-events-none absolute -right-10 -bottom-3 w-[calc(100%+3rem)] text-rose/70"
                                >
                                    <path
                                        d="M4 30 C 50 40, 110 34, 150 14"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        pathLength={1}
                                        strokeDasharray={1}
                                        className="animate-draw"
                                    />
                                </svg>
                                <Heart
                                    aria-hidden="true"
                                    className="pointer-events-none absolute -top-2 -right-8 size-6 -rotate-12 animate-heartbeat text-rose/80"
                                />
                            </span>
                        </>
                    }
                    description="Each occasion has its own gifts and design options."
                >
                    <Button
                        asChild
                        variant="ghost"
                        className="group/all rounded-full text-plum hover:bg-plum/5 dark:text-blush"
                    >
                        <Link href={categoriesIndex()}>
                            All occasions{" "}
                            <ArrowRight className="size-4 transition-transform group-hover/all:translate-x-1" />
                        </Link>
                    </Button>
                </SectionHeading>
                <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-5">
                    {shownCategories.map((category, index) => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            className={cn(
                                "animate-fade-up",
                                occasionCardSpan(index, shownCategories.length),
                            )}
                            style={{
                                animationDelay: `${0.15 + index * 0.08}s`,
                            }}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

const OCCASION_SPANS: Record<number, string> = {
    1: "lg:col-span-6",
    2: "lg:col-span-3",
    3: "lg:col-span-2",
};

/**
 * Lays the occasion cards out in alternating rows of three and two on large screens,
 * stretching whatever is left in the final row so the grid never ends with a gap.
 */
function occasionCardSpan(index: number, total: number): string {
    const smallScreenSpan =
        total % 2 === 1 && index === total - 1 ? "sm:col-span-2" : "";
    let rowStart = 0;

    for (let row = 0; ; row++) {
        const rowSize = row % 2 === 0 ? 3 : 2;

        if (index < rowStart + rowSize) {
            const largeScreenSpan =
                OCCASION_SPANS[Math.min(rowSize, total - rowStart)];

            return `${smallScreenSpan} ${largeScreenSpan}`.trim();
        }

        rowStart += rowSize;
    }
}

function OccasionsBackdrop() {
    return (
        <svg
            viewBox="0 0 1440 420"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] w-full text-blush-light opacity-80 dark:text-plum/25"
        >
            <path
                d="M0 0 H1440 V250 C1200 330 1010 180 760 240 C520 300 300 400 0 300 Z"
                fill="currentColor"
                opacity="0.6"
            />
            <path
                d="M0 0 H1440 V170 C1180 250 980 110 720 170 C470 230 250 300 0 220 Z"
                fill="currentColor"
            />
        </svg>
    );
}

/**
 * The hero photo, shared by <Hero> and <LocalStudio>. From lg up it is pinned
 * just under the header while both sections scroll over it, so they read as
 * one scene; below lg it is a framed picture under the hero copy (the `order`
 * classes put it there). Also painted by
 * resources/views/partials/home-shell.blade.php, so keep the markup in sync.
 */
function HeroBackdrop() {
    return (
        <div className="order-1 px-4 pb-12 sm:px-6 lg:sticky lg:top-20 lg:order-none lg:-mb-[calc(100svh-5rem)] lg:h-[calc(100svh-5rem)] lg:p-0">
            <img
                src="/image/taptale-nfc-wedding-couple-hero-1280.webp"
                srcSet={HERO_SRCSET}
                sizes={HERO_SIZES}
                alt="Personalized NFC photo keychain with a wedding couple photo beside a pink gift box and a tap-to-relive card"
                width={1672}
                height={941}
                fetchPriority="high"
                className="aspect-[16/10] w-full rounded-3xl object-cover object-[70%_center] shadow-[0_24px_50px_-24px_rgb(113_61_80/0.45)] lg:aspect-auto lg:h-full lg:rounded-none lg:object-[75%_center] lg:shadow-none"
            />
            <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-petal/95 via-petal/60 to-transparent lg:block lg:w-[65%] dark:from-background dark:via-background/80" />
        </div>
    );
}

function Hero() {
    const { town } = usePage().props.storefront.business;

    return (
        <section className="relative flex flex-col lg:min-h-[640px] lg:justify-center">
            <div className="mx-auto w-full max-w-7xl px-4 pt-12 pb-10 sm:px-6 lg:px-8 lg:py-24">
                {/* No fade-in: resources/views/partials/home-shell.blade.php paints this first, keep it in sync */}
                <div className="max-w-xl">
                    <span className="inline-flex items-center gap-2 rounded-full border border-rose/30 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-plum backdrop-blur dark:bg-card/60 dark:text-blush">
                        <Heart className="size-3.5" /> A little gift. A lifetime
                        of memories.
                    </span>
                    <h1 className="mt-6 font-display text-5xl leading-[1.05] font-medium text-balance text-charcoal sm:text-6xl lg:text-7xl dark:text-cream">
                        <span className="mb-4 block font-sans text-sm leading-normal font-semibold tracking-[0.2em] text-rose uppercase">
                            Personalized NFC keychains in {town}
                        </span>
                        Every memory deserves to be{" "}
                        <em className="font-normal text-plum dark:text-rose">
                            held.
                        </em>
                    </h1>
                    <p className="mt-6 max-w-md text-lg leading-relaxed text-charcoal/75 dark:text-foreground/75">
                        Turn your favorite photos, videos and messages into
                        personalized keepsakes that tell your story — with a
                        single tap.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Button
                            asChild
                            size="lg"
                            className="h-13 rounded-full bg-plum px-7 text-base text-white shadow-[0_14px_30px_-12px_rgb(113_61_80/0.7)] hover:bg-plum-dark dark:bg-blush dark:text-plum-dark"
                        >
                            <Link href={startOrder()}>
                                Create your keepsake{" "}
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                        <Button
                            asChild
                            size="lg"
                            variant="outline"
                            className="h-13 rounded-full border-plum/30 bg-white/60 px-7 text-base text-plum backdrop-blur hover:bg-white dark:bg-transparent dark:text-blush"
                        >
                            <Link href={categoriesIndex()}>Explore gifts</Link>
                        </Button>
                    </div>
                    <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-charcoal/75 dark:text-foreground/70">
                        {[
                            { icon: ShieldCheck, label: "Premium quality" },
                            {
                                icon: Truck,
                                label: `Delivery in ${town} & nearby`,
                            },
                            { icon: Heart, label: "A gift with meaning" },
                        ].map(({ icon: Icon, label }) => (
                            <li key={label} className="flex items-center gap-2">
                                <Icon className="size-4.5 text-plum dark:text-rose" />
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

/** A hand-drawn underline; size and place it with `className`. */
function Swash({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 120 8"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
            className={className}
        >
            <path
                d="M2 5.5C32 2.5 78 1.5 118 4.5"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

/** Two little outline hearts, doodled beside a heading. */
function HeartsDoodle({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            <path d="M9 14.5S3 10.6 3 7a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 3.6-6 7.5-6 7.5Z" />
            <path d="M21 28s-7-4.5-7-8.6a3.5 3.5 0 0 1 7-1.2 3.5 3.5 0 0 1 7 1.2c0 4.1-7 8.6-7 8.6Z" />
        </svg>
    );
}

/**
 * Where the studio is and which towns it delivers to. From lg up it scrolls
 * over the same pinned photo as <Hero> (see <HeroBackdrop>): the copy sits on
 * the photo's soft left side, the delivery card over the gift box, and the
 * bottom fades into the page's pink before the photo is cut off.
 *
 * Also painted by resources/views/partials/home-shell.blade.php (what search
 * engines that don't run JavaScript read), so keep the markup and copy in sync.
 */
function LocalStudio() {
    const { town, province, service_area } =
        usePage().props.storefront.business;
    const inlineLink =
        "font-medium text-plum underline decoration-plum/30 underline-offset-4 hover:decoration-plum dark:text-blush";

    return (
        <section className="relative order-2 lg:order-none lg:bg-linear-to-b lg:from-transparent lg:from-55% lg:to-petal lg:dark:to-background">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,24rem)] lg:items-center lg:justify-between lg:gap-12 lg:px-8 lg:pt-12 lg:pb-32">
                <div className="relative isolate">
                    {/* A soft pink glow so the copy stays readable where it crosses the keychain in the photo */}
                    <div className="pointer-events-none absolute -inset-x-12 -inset-y-10 -z-10 hidden rounded-[4rem] bg-petal/80 blur-2xl lg:block dark:bg-background/80" />
                    <p className="inline-flex items-center gap-2 rounded-full bg-rose/15 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-plum uppercase dark:bg-rose/20 dark:text-blush">
                        <MapPin className="size-3.5 shrink-0" />
                        Made in {town}, {province}
                    </p>
                    <h2 className="mt-5 font-display text-4xl leading-[1.1] font-medium text-balance text-plum-dark sm:text-[2.75rem] dark:text-cream">
                        Personalized NFC keychains and photo gifts, made right
                        here in{" "}
                        <span className="whitespace-nowrap">
                            <em className="relative font-normal text-rose">
                                {town}
                                <Swash className="absolute inset-x-0 -bottom-[0.18em] h-[0.2em] w-full" />
                            </em>
                            <HeartsDoodle className="ml-1.5 inline-block size-[0.75em] -translate-y-[0.4em] rotate-12 text-rose/80" />
                        </span>
                    </h2>
                    <p className="mt-5 leading-relaxed text-charcoal/80 dark:text-foreground/75">
                        <strong className="font-semibold text-charcoal dark:text-foreground">
                            Taptale is a small gift studio in {town}
                        </strong>
                        , {province}. We design and make every NFC keychain and
                        photo keepsake by hand, then deliver it to you or to the
                        person you are surprising. Every keychain comes with its
                        own memory page: your photos, a video, a song and a
                        message that open with one tap on any phone, no app
                        needed.
                    </p>
                    <p className="mt-3 leading-relaxed text-charcoal/80 dark:text-foreground/75">
                        Made for anniversaries, weddings, birthdays, 18th
                        debuts, baptisms, graduations and every trip you take.
                        Browse{" "}
                        <Link href={categoriesIndex()} className={inlineLink}>
                            gifts by occasion
                        </Link>
                        , see our{" "}
                        <Link href={memoryPages()} className={inlineLink}>
                            memory page designs
                        </Link>{" "}
                        or read more{" "}
                        <Link href={about()} className={inlineLink}>
                            about our studio
                        </Link>
                        .
                    </p>
                    <p className="mt-4 font-medium text-plum-dark dark:text-cream">
                        Because every memory deserves to be held, not just{" "}
                        <span className="relative whitespace-nowrap">
                            scrolled past
                            <Swash className="absolute inset-x-0 -bottom-1 h-1.5 w-full text-rose" />
                        </span>
                        .{" "}
                        <Heart className="inline size-4 -translate-y-px text-rose" />
                    </p>
                    <ul className="mt-7 grid grid-cols-3 divide-x divide-plum/15 rounded-2xl bg-white/60 py-3 ring-1 ring-white/70 backdrop-blur-sm sm:w-fit dark:divide-border dark:bg-card/60 dark:ring-border">
                        {[
                            { icon: Gift, label: "Personalized with love" },
                            { icon: Zap, label: "Tap to view your memories" },
                            { icon: Heart, label: "Perfect for any occasion" },
                        ].map(({ icon: Icon, label }) => (
                            <li
                                key={label}
                                className="flex flex-col items-center gap-2 px-3 text-center text-xs leading-snug text-charcoal/80 sm:flex-row sm:px-4 sm:text-left sm:text-[0.8rem] dark:text-foreground/75"
                            >
                                <Icon className="size-5 shrink-0 text-plum dark:text-rose" />
                                <span className="max-w-28">{label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-6 shadow-[0_24px_60px_-30px_rgb(113_61_80/0.5)] backdrop-blur-md sm:p-7 dark:border-border dark:bg-card/85">
                    <h3 className="flex items-center gap-2.5 font-display text-2xl text-plum-dark dark:text-cream">
                        <MapPin className="size-6 shrink-0 text-plum dark:text-rose" />
                        Where we deliver
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-charcoal/75 dark:text-foreground/70">
                        For now we deliver to {town} and these nearby towns and
                        cities in {province}:
                    </p>
                    <ul className="mt-5 flex flex-wrap gap-2">
                        {service_area.map((place) => (
                            <li
                                key={place}
                                className={cn(
                                    "inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-sm",
                                    place === town
                                        ? "border-plum bg-plum text-white dark:border-blush dark:bg-blush dark:text-plum-dark"
                                        : "border-plum/10 bg-blush-light/70 text-plum-dark dark:border-border dark:bg-background dark:text-blush",
                                )}
                            >
                                {place === town && (
                                    <MapPin className="size-3.5 shrink-0" />
                                )}
                                {place}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-6 border-t border-plum/10 pt-5 dark:border-border">
                        <Link
                            href={shipping()}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-plum-dark hover:underline dark:text-blush"
                        >
                            Delivery areas and fees{" "}
                            <ArrowRight className="size-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

/**
 * Also painted by resources/views/partials/home-shell.blade.php, so keep the
 * markup in sync.
 */
function Faqs({ faqs }: { faqs: Faq[] }) {
    return (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
                <div className="lg:sticky lg:top-28 lg:self-start">
                    <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-rose uppercase">
                        Good to know
                    </p>
                    <h2 className="font-display text-3xl leading-tight font-medium sm:text-4xl">
                        Questions before you order
                    </h2>
                    <p className="mt-4 text-muted-foreground">
                        Tap a question to see the answer.
                    </p>
                </div>
                <div className="space-y-3">
                    {faqs.map((faq, index) => (
                        <details
                            key={faq.question}
                            name="faq"
                            open={index === 0}
                            className="group rounded-2xl border border-plum/10 bg-white/60 transition-colors duration-300 open:border-rose/30 open:bg-white open:shadow-sm hover:border-rose/30 dark:border-border dark:bg-card/50 dark:open:bg-card"
                        >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-rose/50 sm:px-6 [&::-webkit-details-marker]:hidden">
                                <h3 className="font-display text-lg leading-snug sm:text-xl">
                                    {faq.question}
                                </h3>
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blush-light text-plum transition duration-300 group-open:rotate-45 group-open:bg-plum group-open:text-white dark:bg-plum/30 dark:text-blush">
                                    <Plus className="size-4" />
                                </span>
                            </summary>
                            <p className="px-5 pb-5 leading-relaxed text-charcoal/75 group-open:animate-fade-up sm:px-6 dark:text-foreground/75">
                                {faq.answer}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}

function HowItWorks() {
    const sectionRef = useRef<HTMLElement>(null);
    const isVisible = useInView(sectionRef);

    return (
        <section
            ref={sectionRef}
            id="how-it-works"
            className={cn(
                "reveal-on-view relative isolate scroll-mt-24 overflow-hidden bg-linear-to-br from-blush-light via-[#fbeef0] to-petal py-20 dark:from-plum-dark/40 dark:via-background dark:to-background",
                isVisible && "is-visible",
            )}
        >
            <div className="pointer-events-none absolute -top-24 -right-24 -z-10 size-96 animate-float-slow rounded-full bg-white/50 blur-3xl dark:bg-plum/20" />
            <div className="pointer-events-none absolute -bottom-32 -left-20 -z-10 size-80 animate-float-slow rounded-full bg-blush/50 blur-3xl [animation-delay:-4s] dark:bg-plum/20" />
            <svg
                viewBox="0 0 600 160"
                aria-hidden="true"
                className="pointer-events-none absolute top-6 right-0 -z-10 hidden w-[44rem] max-w-[55%] text-rose/45 lg:block"
            >
                <path
                    d="M0 150 C120 160 220 120 300 92 C350 74 372 40 352 30 C332 20 316 46 334 64 C370 100 470 70 600 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={1}
                    className="animate-draw"
                />
            </svg>
            <Heart
                aria-hidden="true"
                className="pointer-events-none absolute top-10 right-[24%] hidden size-9 animate-heartbeat text-rose/60 lg:block"
                strokeWidth={1.4}
            />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl animate-fade-up">
                    <p className="mb-3 flex items-center gap-4 text-xs font-semibold tracking-[0.25em] text-plum uppercase dark:text-blush">
                        How Taptale works
                        <span className="h-px w-20 bg-rose/40" />
                    </p>
                    <h2 className="font-display text-3xl leading-tight font-medium text-balance text-charcoal sm:text-4xl lg:text-5xl dark:text-cream">
                        From a memory to a keepsake in{" "}
                        <em className="text-rose">four</em> gentle steps
                    </h2>
                    <p className="mt-4 text-base text-charcoal/70 dark:text-foreground/70">
                        Turn your favorite moments into a heartfelt gift,
                        effortlessly.
                    </p>
                </div>
                <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
                    {STEPS.map(({ scene, title, body }, index) => (
                        <li
                            key={title}
                            className="group relative animate-fade-up"
                            style={{
                                animationDelay: `${0.2 + index * 0.12}s`,
                            }}
                        >
                            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/70 shadow-[0_24px_48px_-28px_rgba(113,61,80,0.45)] backdrop-blur transition duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_30px_60px_-28px_rgba(113,61,80,0.55)] dark:border-white/10 dark:bg-card/70">
                                <div className="p-6 pb-2">
                                    <div className="flex items-center justify-between">
                                        <span className="rounded-full bg-blush/70 px-3 py-1 font-display text-sm font-medium text-plum dark:bg-plum/40 dark:text-blush">
                                            0{index + 1}
                                        </span>
                                        <span className="flex size-8 items-center justify-center rounded-full border border-plum/20 text-plum transition duration-300 group-hover:translate-x-0.5 group-hover:border-plum group-hover:bg-plum group-hover:text-white dark:border-blush/30 dark:text-blush">
                                            <ArrowRight className="size-4" />
                                        </span>
                                    </div>
                                    <h3 className="mt-5 font-display text-xl text-charcoal dark:text-cream">
                                        {title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-charcoal/70 dark:text-foreground/70">
                                        {body}
                                    </p>
                                </div>
                                <div className="relative mt-auto h-40 bg-linear-to-b from-transparent to-blush/40 dark:to-plum/20">
                                    <StepIllustration
                                        scene={scene}
                                        className="absolute inset-0 size-full transition-[scale] duration-500 group-hover:scale-105"
                                    />
                                </div>
                            </div>
                            {index < STEPS.length - 1 && (
                                <ArrowRight
                                    aria-hidden="true"
                                    className="absolute top-1/2 -right-[1.9rem] hidden size-5 animate-nudge text-rose lg:block"
                                    style={{
                                        animationDelay: `${index * 0.25}s`,
                                    }}
                                />
                            )}
                        </li>
                    ))}
                </ol>
                <div className="mt-12 animate-fade-up [animation-delay:0.7s]">
                    <Button
                        asChild
                        size="lg"
                        className="group/cta h-12 rounded-full bg-plum px-7 text-white shadow-[0_14px_30px_-12px_rgba(113,61,80,0.7)] hover:bg-plum-dark"
                    >
                        <Link href={startOrder()}>
                            Start with an occasion{" "}
                            <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-1" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}

function TapSection() {
    return (
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="relative mx-auto w-full max-w-sm">
                <div className="absolute inset-0 -z-10 rounded-full bg-blush/60 blur-3xl dark:bg-plum/40" />
                <div className="mx-auto w-[78%] rounded-[2.6rem] border-[10px] border-charcoal bg-charcoal shadow-2xl">
                    <div className="overflow-hidden rounded-[2rem] bg-gradient-to-b from-blush-light to-cream">
                        <div className="px-5 pt-10 pb-6 text-center">
                            <p className="text-[10px] tracking-[0.3em] text-rose uppercase">
                                A Taptale memory
                            </p>
                            <p className="mt-2 font-display text-2xl text-plum">
                                Ana & Leo
                            </p>
                            <p className="text-xs text-charcoal/60">
                                Five years of us
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 px-4">
                            {["#E9C9C9", "#B86F83", "#713D50", "#F1D9D2"].map(
                                (color) => (
                                    <div
                                        key={color}
                                        className="aspect-square rounded-xl"
                                        style={{
                                            background: `linear-gradient(135deg, ${color}, #ffffff80)`,
                                        }}
                                    />
                                ),
                            )}
                        </div>
                        <p className="px-5 py-6 text-center font-display text-sm text-charcoal/80 italic">
                            “Every tap brings me back to the day you said yes.”
                        </p>
                    </div>
                </div>
            </div>
            <div>
                <SectionHeading
                    eyebrow="Tap-enabled keepsakes"
                    title={
                        <>
                            Hold it in your hand.{" "}
                            <em className="text-rose">Tap it</em> to relive it.
                        </>
                    }
                    description="Our NFC keychains and QR keepsakes open a private memory page on any phone — your photos, a video, a song and a message, all on taptale.online."
                />
                <ul className="mt-8 grid gap-4">
                    {[
                        {
                            icon: Nfc,
                            title: "Tap with any modern phone",
                            body: "No app needed. The tag opens your page instantly.",
                        },
                        {
                            icon: QrCode,
                            title: "QR code included",
                            body: "Works with every phone camera, even without NFC.",
                        },
                        {
                            icon: Sparkles,
                            title: "Update it anytime",
                            body: "Add new photos and messages from your account — the keepsake stays the same.",
                        },
                    ].map(({ icon: Icon, title, body }) => (
                        <li key={title} className="flex gap-4">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blush-light text-plum dark:bg-rose/20 dark:text-blush">
                                <Icon className="size-5" />
                            </span>
                            <div>
                                <p className="font-medium">{title}</p>
                                <p className="text-sm text-muted-foreground">
                                    {body}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
                <Button
                    asChild
                    className="mt-8 rounded-full bg-plum px-6 text-white hover:bg-plum-dark dark:bg-blush dark:text-plum-dark"
                >
                    <Link href={memoryPages()}>
                        Explore memory page designs{" "}
                        <ArrowRight className="size-4" />
                    </Link>
                </Button>
            </div>
        </section>
    );
}
