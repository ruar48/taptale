import { Head, Link } from '@inertiajs/react';
import { ArrowUpRight, Gift, Heart, Mail, MessageCircleQuestion, Nfc, QrCode } from 'lucide-react';
import { presetFor, themeFor, themeStyle } from '@/components/taptale/experience/config';
import type { GateKind } from '@/components/taptale/experience/config';
import { SectionHeading } from '@/components/taptale/section-heading';
import { Button } from '@/components/ui/button';
import { demo } from '@/routes/experiences';
import { create as startOrder } from '@/routes/orders';
import type { ExperienceTemplateOption } from '@/types';

const GATE_LABELS: Record<Exclude<GateKind, null>, { icon: typeof Mail; label: string }> = {
    envelope: { icon: Mail, label: 'Opens with a wax-sealed envelope' },
    question: { icon: MessageCircleQuestion, label: 'Opens with a yes / no question' },
    tap: { icon: Gift, label: 'Opens with a tap-to-reveal gift' },
};

const SECTION_LABELS: Record<string, string> = {
    hero_photo: 'Photo greeting',
    hero_script: 'Script greeting',
    hero_doily: 'Lace greeting',
    note: 'Little note',
    letter_card: 'Letter card',
    letter_paper: 'Love letter',
    polaroid_wall: 'Polaroid wall',
    film_strip: 'Film strip',
    timeline: 'Timeline',
    gifts: 'Surprise gifts',
    scrapbook: 'Scrapbook',
    song: 'Song & vinyl',
    player: 'Music player',
    gallery: 'Photo album',
    video: 'Video',
    quote: 'Quote',
    countdown: 'Countdown',
    details: 'Invitation details',
};

export default function MemoryPages({ templates }: { templates: ExperienceTemplateOption[] }) {
    return (
        <>
            <Head title="Memory page designs" />
            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
                <SectionHeading
                    eyebrow="Tap-enabled memory pages"
                    title={
                        <>
                            A little website, <em className="text-rose">just for them</em>
                        </>
                    }
                    description="Every NFC keychain and QR keepsake opens a private page on taptale.com. Pick a design, add your photos, letter, timeline and song — and switch designs anytime."
                >
                    <div className="flex gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><Nfc className="size-4 text-rose" /> Tap</span>
                        <span className="inline-flex items-center gap-1.5"><QrCode className="size-4 text-rose" /> Scan</span>
                    </div>
                </SectionHeading>

                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => {
                        const theme = themeFor(template.theme);
                        const preset = presetFor(template.value);
                        const gate = preset.gate ? GATE_LABELS[preset.gate] : null;
                        const sections = preset.sections.filter((section) => section !== 'closing');

                        return (
                            <article key={template.value} className="group flex flex-col overflow-hidden rounded-3xl border bg-card transition hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgb(113_61_80/0.4)]">
                                <Link href={demo(template.value)} className="relative block h-56 overflow-hidden" style={themeStyle(theme)}>
                                    <Heart className="absolute top-5 left-6 size-6 text-[var(--x-accent)] transition-transform duration-500 group-hover:scale-125" fill="currentColor" />
                                    <div className="flex size-full flex-col items-center justify-center px-6 text-center">
                                        <p className="font-script text-5xl leading-tight">{template.label}</p>
                                        {gate && (
                                            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1 text-xs backdrop-blur">
                                                <gate.icon className="size-3.5" /> {gate.label}
                                            </span>
                                        )}
                                    </div>
                                    <span className="absolute right-4 bottom-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-plum opacity-0 shadow transition group-hover:opacity-100">
                                        Live demo <ArrowUpRight className="size-3.5" />
                                    </span>
                                </Link>
                                <div className="flex flex-1 flex-col p-5">
                                    <h3 className="font-display text-xl">{template.label}</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                                    <div className="mt-4 flex flex-wrap gap-1.5">
                                        {sections.map((section) => (
                                            <span key={section} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                                                {SECTION_LABELS[section] ?? section}
                                            </span>
                                        ))}
                                    </div>
                                    <Button asChild variant="outline" className="mt-5 rounded-full">
                                        <Link href={demo(template.value)}>View live demo</Link>
                                    </Button>
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="mt-14 rounded-[2rem] bg-plum p-8 text-center text-white sm:p-12">
                    <p className="font-script text-5xl">Some gifts aren't expensive, just meaningful</p>
                    <p className="mx-auto mt-3 max-w-xl text-white/80">
                        Choose an NFC keychain, mini CD, music player keychain or QR keepsake — your memory page comes with it.
                    </p>
                    <Button asChild size="lg" className="mt-6 h-12 rounded-full bg-cream px-8 text-plum hover:bg-white">
                        <Link href={startOrder()}>Create your gift</Link>
                    </Button>
                </div>
            </section>
        </>
    );
}
