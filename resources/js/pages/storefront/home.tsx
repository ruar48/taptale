import { Head, Link } from "@inertiajs/react";
import {
    ArrowRight,
    BadgeCheck,
    Camera,
    Heart,
    LayoutTemplate,
    Nfc,
    QrCode,
    Quote,
    ShieldCheck,
    Sparkles,
    Star,
    Truck,
} from "lucide-react";
import { CategoryCard } from "@/components/taptale/category-card";
import { ProductCard } from "@/components/taptale/product-card";
import { SectionHeading } from "@/components/taptale/section-heading";
import { TemplatePreview } from "@/components/taptale/template-preview";
import { Button } from "@/components/ui/button";
import { index as categoriesIndex } from "@/routes/categories";
import { templates as memoryPages } from "@/routes/experiences";
import { create as startOrder } from "@/routes/orders";
import { index as templatesIndex } from "@/routes/templates";
import type { Category, Product, Template, Testimonial } from "@/types";

type Props = {
    categories: Category[];
    featuredProducts: Product[];
    bestsellers: Product[];
    featuredTemplates: Template[];
    testimonials: Testimonial[];
};

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

const STEPS = [
    {
        icon: Heart,
        title: "Choose the occasion",
        body: "Anniversary, wedding, baptism, graduation — start with who the gift is for.",
    },
    {
        icon: LayoutTemplate,
        title: "Pick a gift & template",
        body: "Browse keepsakes and professionally designed templates made for the moment.",
    },
    {
        icon: Camera,
        title: "Add your story",
        body: "Upload photos, names and a message — or tell us your idea and our designers take it from there.",
    },
    {
        icon: BadgeCheck,
        title: "Approve, then we craft",
        body: "Nothing goes into production until you approve your design. Then we make it by hand.",
    },
];

export default function Home({
    categories,
    featuredProducts,
    bestsellers,
    featuredTemplates,
    testimonials,
}: Props) {
    return (
        <>
            <Head title="Personalized NFC & Photo Keepsakes" />

            <Hero />

            <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <SectionHeading
                    eyebrow="Shop by occasion"
                    title={
                        <>
                            A keepsake for every{" "}
                            <em className="text-rose">chapter</em>
                        </>
                    }
                    description="Each occasion has its own gifts, templates and design options."
                >
                    <Button
                        asChild
                        variant="ghost"
                        className="rounded-full text-plum hover:bg-plum/5 dark:text-blush"
                    >
                        <Link href={categoriesIndex()}>
                            All occasions <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                </SectionHeading>
                <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {categories.slice(0, 8).map((category, index) => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            className={
                                index === 0 || index === 5
                                    ? "lg:col-span-2"
                                    : undefined
                            }
                        />
                    ))}
                </div>
            </section>

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

            {featuredTemplates.length > 0 && (
                <section className="overflow-hidden bg-blush-light/60 py-20 dark:bg-muted/40">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionHeading
                            eyebrow="Featured designs"
                            title="Templates our designers love"
                            description="Every template comes alive with your photos and words — preview it live before you order."
                        >
                            <Button
                                asChild
                                variant="ghost"
                                className="rounded-full text-plum hover:bg-plum/5 dark:text-blush"
                            >
                                <Link href={templatesIndex()}>
                                    See all templates{" "}
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        </SectionHeading>
                    </div>
                    <div className="mt-10 flex snap-x scrollbar-none gap-5 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]">
                        {featuredTemplates.map((template) => (
                            <Link
                                key={template.id}
                                href={templatesIndex()}
                                className="group w-56 shrink-0 snap-start sm:w-64"
                            >
                                <div className="overflow-hidden rounded-3xl shadow-[0_20px_40px_-24px_rgb(113_61_80/0.5)] transition-transform duration-500 group-hover:-translate-y-1.5">
                                    <TemplatePreview
                                        layout={template.layout}
                                        palette={template.palette}
                                        imageUrl={template.preview_url}
                                    />
                                </div>
                                <p className="mt-4 font-display text-lg">
                                    {template.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {template.categories
                                        ?.slice(0, 2)
                                        .map((category) => category.name)
                                        .join(" · ")}
                                </p>
                            </Link>
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
                <section className="bg-cream-dark/60 py-20 dark:bg-muted/30">
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

function Hero() {
    return (
        <section className="relative flex flex-col overflow-hidden bg-blush-light/40 lg:min-h-[640px] lg:justify-center dark:bg-background">
            <img
                src="/image/taptale-nfc-wedding-couple-hero-1280.webp"
                srcSet={HERO_SRCSET}
                sizes={HERO_SIZES}
                alt="Personalized NFC photo keychain with a wedding couple photo beside a pink gift box and a tap-to-relive card"
                width={1672}
                height={941}
                fetchPriority="high"
                className="order-last mx-4 mb-12 aspect-[16/10] w-[calc(100%-2rem)] rounded-3xl object-cover object-[70%_center] shadow-[0_24px_50px_-24px_rgb(113_61_80/0.45)] sm:mx-6 sm:w-[calc(100%-3rem)] lg:absolute lg:inset-0 lg:order-none lg:m-0 lg:aspect-auto lg:h-full lg:w-full lg:rounded-none lg:object-[75%_center] lg:shadow-none"
            />
            <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-[#fbe9e6]/95 via-[#fbe9e6]/60 to-transparent lg:block lg:w-[65%] dark:from-background dark:via-background/80" />

            <div className="relative mx-auto w-full max-w-7xl px-4 pt-12 pb-10 sm:px-6 lg:px-8 lg:py-24">
                <div className="max-w-xl animate-fade-up">
                    <span className="inline-flex items-center gap-2 rounded-full border border-rose/30 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-plum backdrop-blur dark:bg-card/60 dark:text-blush">
                        <Heart className="size-3.5" /> A little gift. A lifetime
                        of memories.
                    </span>
                    <h1 className="mt-6 font-display text-5xl leading-[1.05] font-medium text-balance text-charcoal sm:text-6xl lg:text-7xl dark:text-cream">
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
                            { icon: Truck, label: "Nationwide delivery" },
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

function HowItWorks() {
    return (
        <section
            id="how-it-works"
            className="scroll-mt-24 bg-charcoal py-20 text-cream"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl">
                    <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-blush uppercase">
                        How Taptale works
                    </p>
                    <h2 className="font-display text-3xl leading-tight font-medium sm:text-4xl">
                        From a memory to a keepsake in four gentle steps
                    </h2>
                </div>
                <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {STEPS.map(({ icon: Icon, title, body }, index) => (
                        <li
                            key={title}
                            className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-6"
                        >
                            <span className="font-display text-6xl text-white/10">
                                0{index + 1}
                            </span>
                            <span className="absolute top-6 right-6 flex size-11 items-center justify-center rounded-2xl bg-rose/20 text-blush">
                                <Icon className="size-5" />
                            </span>
                            <h3 className="mt-2 font-display text-xl">
                                {title}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-cream/70">
                                {body}
                            </p>
                        </li>
                    ))}
                </ol>
                <div className="mt-10">
                    <Button
                        asChild
                        size="lg"
                        className="h-12 rounded-full bg-blush px-7 text-plum-dark hover:bg-white"
                    >
                        <Link href={startOrder()}>
                            Start with an occasion{" "}
                            <ArrowRight className="size-4" />
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
                    description="Our NFC keychains and QR keepsakes open a private memory page on any phone — your photos, a video, a song and a message, all on taptale.com."
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
