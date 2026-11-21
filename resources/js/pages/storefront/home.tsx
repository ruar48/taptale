import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    Camera,
    HandHeart,
    Heart,
    LayoutTemplate,
    Nfc,
    PackageCheck,
    QrCode,
    Quote,
    Sparkles,
    Star,
} from 'lucide-react';
import { CategoryCard } from '@/components/taptale/category-card';
import { KeychainMockup } from '@/components/taptale/keychain-mockup';
import { ProductCard } from '@/components/taptale/product-card';
import { SectionHeading } from '@/components/taptale/section-heading';
import { TemplatePreview } from '@/components/taptale/template-preview';
import { Button } from '@/components/ui/button';
import { index as categoriesIndex } from '@/routes/categories';
import { templates as memoryPages } from '@/routes/experiences';
import { create as startOrder } from '@/routes/orders';
import { index as templatesIndex } from '@/routes/templates';
import type { Category, Product, Template, Testimonial } from '@/types';

type Props = {
    categories: Category[];
    featuredProducts: Product[];
    bestsellers: Product[];
    featuredTemplates: Template[];
    testimonials: Testimonial[];
};

const STEPS = [
    {
        icon: Heart,
        title: 'Choose the occasion',
        body: 'Anniversary, wedding, baptism, graduation — start with who the gift is for.',
    },
    {
        icon: LayoutTemplate,
        title: 'Pick a gift & template',
        body: 'Browse keepsakes and professionally designed templates made for the moment.',
    },
    {
        icon: Camera,
        title: 'Add your story',
        body: 'Upload photos, names and a message — or tell us your idea and our designers take it from there.',
    },
    {
        icon: BadgeCheck,
        title: 'Approve, then we craft',
        body: 'Nothing goes into production until you approve your design. Then we make it by hand.',
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
            <Head title="Personalized NFC & photo keepsakes" />

            <Hero />

            <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <SectionHeading
                    eyebrow="Shop by occasion"
                    title={
                        <>
                            A keepsake for every{' '}
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
                                    ? 'lg:col-span-2'
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
                                    See all templates{' '}
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
                                        .join(' · ')}
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
        <section className="relative overflow-hidden">
            <div className="bg-grain absolute inset-0" />
            <div className="absolute top-0 right-0 h-full w-full bg-[radial-gradient(60%_60%_at_80%_30%,rgb(233_201_201/0.7),transparent_70%)] dark:bg-[radial-gradient(60%_60%_at_80%_30%,rgb(113_61_80/0.4),transparent_70%)]" />

            <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:pt-20 lg:pb-28">
                <div className="animate-fade-up">
                    <span className="inline-flex items-center gap-2 rounded-full border border-rose/30 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-plum backdrop-blur dark:bg-card/60 dark:text-blush">
                        <Nfc className="size-4" /> NFC & photo keepsakes,
                        handmade
                    </span>
                    <h1 className="mt-6 font-display text-5xl leading-[1.02] font-medium text-balance text-charcoal sm:text-6xl lg:text-7xl dark:text-cream">
                        Gifts that hold{' '}
                        <em className="font-normal text-rose">your story</em>
                    </h1>
                    <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal/75 dark:text-foreground/75">
                        Personalized keychains and souvenirs that open your
                        photos, videos and messages with a single tap. Design it
                        yourself or let our designers create it — you approve
                        every detail before we make it.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Button
                            asChild
                            size="lg"
                            className="h-14 rounded-full bg-plum px-8 text-base text-white shadow-[0_14px_30px_-12px_rgb(113_61_80/0.7)] hover:bg-plum-dark dark:bg-blush dark:text-plum-dark"
                        >
                            <Link href={startOrder()}>
                                <Sparkles className="size-5" /> Start creating
                            </Link>
                        </Button>
                        <Button
                            asChild
                            size="lg"
                            variant="outline"
                            className="h-14 rounded-full border-plum/20 bg-white/60 px-8 text-base text-plum hover:bg-white dark:bg-transparent dark:text-blush"
                        >
                            <Link href={categoriesIndex()}>
                                Browse occasions
                            </Link>
                        </Button>
                    </div>
                    <ul className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-sm">
                        {[
                            {
                                icon: BadgeCheck,
                                label: 'Approve before we print',
                            },
                            { icon: HandHeart, label: 'Handmade with care' },
                            {
                                icon: PackageCheck,
                                label: 'Nationwide delivery',
                            },
                        ].map(({ icon: Icon, label }) => (
                            <li
                                key={label}
                                className="flex flex-col gap-2 text-charcoal/70 dark:text-foreground/70"
                            >
                                <Icon className="size-5 text-rose" />
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative mx-auto aspect-square w-full max-w-md lg:max-w-none">
                    <div className="absolute inset-[8%] rounded-full bg-gradient-to-br from-blush to-blush-light dark:from-plum/50 dark:to-plum/20" />
                    <div className="absolute top-[4%] left-[6%] w-[42%] -rotate-[8deg] animate-float-slow">
                        <KeychainMockup ringColor="#B76E79">
                            <TemplatePreview
                                layout="polaroid"
                                palette={{
                                    background: '#FFFDF9',
                                    ink: '#343039',
                                    accent: '#B86F83',
                                }}
                                names="Mia & Paolo"
                                date="Since 2019"
                            />
                        </KeychainMockup>
                    </div>
                    <div className="absolute top-[18%] right-[4%] w-[46%] rotate-[6deg] animate-float">
                        <div className="pointer-events-none absolute top-[58%] -left-[30%] flex size-[55%] items-center justify-center">
                            {[0, 0.8, 1.6].map((delay) => (
                                <span
                                    key={delay}
                                    className="absolute size-full animate-tap-ring rounded-full border-2 border-rose/70"
                                    style={{ animationDelay: `${delay}s` }}
                                />
                            ))}
                        </div>
                        <KeychainMockup nfc ringColor="#C9A66B">
                            <TemplatePreview
                                layout="celestial"
                                palette={{
                                    background: '#1F1B2E',
                                    ink: '#F8F3ED',
                                    accent: '#E9C9C9',
                                }}
                                names="Under our stars"
                                date="06 · 21 · 2025"
                            />
                        </KeychainMockup>
                    </div>
                    <div className="absolute bottom-[4%] left-[22%] w-[36%] -rotate-[4deg] animate-float-slow [animation-delay:1.5s]">
                        <div className="rounded-[14%] bg-white p-[9%] shadow-[0_24px_40px_-18px_rgb(52_48_57/0.5)]">
                            <div className="flex aspect-square items-center justify-center rounded-xl bg-cream">
                                <QrCode
                                    className="size-3/4 text-charcoal"
                                    strokeWidth={1.2}
                                />
                            </div>
                            <p className="mt-2 text-center font-display text-sm text-plum italic">
                                Scan our story
                            </p>
                        </div>
                    </div>
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
                            Start with an occasion{' '}
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
                            {['#E9C9C9', '#B86F83', '#713D50', '#F1D9D2'].map(
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
                            Hold it in your hand.{' '}
                            <em className="text-rose">Tap it</em> to relive it.
                        </>
                    }
                    description="Our NFC keychains and QR keepsakes open a private memory page on any phone — your photos, a video, a song and a message, all on taptale.com."
                />
                <ul className="mt-8 grid gap-4">
                    {[
                        {
                            icon: Nfc,
                            title: 'Tap with any modern phone',
                            body: 'No app needed. The tag opens your page instantly.',
                        },
                        {
                            icon: QrCode,
                            title: 'QR code included',
                            body: 'Works with every phone camera, even without NFC.',
                        },
                        {
                            icon: Sparkles,
                            title: 'Update it anytime',
                            body: 'Add new photos and messages from your account — the keepsake stays the same.',
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
                        Explore memory page designs{' '}
                        <ArrowRight className="size-4" />
                    </Link>
                </Button>
            </div>
        </section>
    );
}
