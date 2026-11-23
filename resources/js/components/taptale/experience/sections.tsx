import {
    ChevronDown,
    Flower2,
    Heart,
    Mail,
    Music,
    Pause,
    Play,
    Repeat,
    Shuffle,
    SkipBack,
    SkipForward,
    Sparkles,
    Star,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BloomingBouquet } from '@/components/taptale/experience/blooming-bouquet';
import { FlowerPicker } from '@/components/taptale/experience/flower-picker';
import { FlowerScene } from '@/components/taptale/experience/flower-scenes';
import { NightGarden } from '@/components/taptale/experience/night-garden';
import { SongPlayer } from '@/components/taptale/experience/song-player';
import { VideoEditor } from '@/components/taptale/experience/video-editor';
import { VideoFrameView } from '@/components/taptale/experience/video-frames';
import {
    HEARTS_BACKDROP_STYLE,
    HeartFlourish,
    HeartsBackdrop,
    SongStyleSwitch,
} from '@/components/taptale/experience/song-section-style';
import {
    embedFor,
    isSceneStyle,
    parseEventDate,
} from '@/components/taptale/experience/config';
import type { SectionKey } from '@/components/taptale/experience/config';
import {
    AddPhotoButton,
    EditableText,
    Eyebrow,
    FloatingHearts,
    PhotoFill,
    Polaroid,
    Reveal,
    ScriptHeading,
    SectionShell,
    useExperience,
    useExperienceAudio,
} from '@/components/taptale/experience/shared';
import { cn } from '@/lib/utils';

export const ROTATIONS = [-6, 4, -3, 7, -5, 3, -7, 5, -2, 6, -4, 2];

function paragraphs(text: string | null | undefined): string[] {
    return (text ?? '')
        .split(/\n{2,}|\r\n\r\n/)
        .map((part) => part.trim())
        .filter(Boolean);
}

export function ExperienceSection({ section }: { section: SectionKey }) {
    switch (section) {
        case 'hero_photo':
            return <HeroPhoto />;
        case 'hero_script':
            return <HeroScript />;
        case 'hero_doily':
            return <HeroDoily />;
        case 'bouquet':
            return <FlowersSection />;
        case 'note':
            return <Note />;
        case 'letter_card':
            return <LetterCard />;
        case 'letter_paper':
            return <LetterPaper />;
        case 'polaroid_wall':
            return <PolaroidWall />;
        case 'film_strip':
            return <FilmStrip />;
        case 'timeline':
            return <Timeline />;
        case 'gifts':
            return <Gifts />;
        case 'scrapbook':
            return <Scrapbook />;
        case 'song':
            return <SongSection />;
        case 'player':
            return <PlayerSection />;
        case 'gallery':
            return <Gallery />;
        case 'video':
            return <VideoSection />;
        case 'quote':
            return <QuoteBanner />;
        case 'countdown':
            return <Countdown />;
        case 'details':
            return <Details />;
        case 'closing':
            return <Closing />;
    }
}

/**
 * The flowers that open a bouquet page, or that were added to another
 * design: the wrapped bouquet, or glowing flowers of the chosen color
 * growing in a night garden, with whatever the page lets rain down.
 * Whoever edits the page can change both right here.
 */
export function FlowersSection({
    isAddon = false,
    onRemove,
}: {
    isAddon?: boolean;
    /** Demo drafts can take the added flowers off again. */
    onRemove?: () => void;
}) {
    const { experience, editable } = useExperience();
    const style = experience.flower_style ?? 'bouquet';
    const rain = experience.flower_rain ?? 'none';

    return (
        <div id="page-flowers" className="relative scroll-mt-16">
            {style === 'bouquet' ? (
                <BloomingBouquet rain={rain} isAddon={isAddon} />
            ) : isSceneStyle(style) ? (
                <FlowerScene style={style} rain={rain} isAddon={isAddon} />
            ) : (
                <NightGarden variant={style} rain={rain} isAddon={isAddon} />
            )}
            {editable && <FlowerPicker onRemove={onRemove} />}
        </div>
    );
}

function ScrollHint() {
    return (
        <div className="absolute inset-x-0 bottom-6 flex flex-col items-center text-xs tracking-[0.3em] uppercase opacity-80">
            Scroll
            <ChevronDown className="mt-1 size-5 animate-bounce" />
        </div>
    );
}

function HeroPhoto() {
    const { experience, photoAt } = useExperience();
    const cover = photoAt(0);

    return (
        <section
            className={cn(
                'relative flex min-h-[100svh] items-center justify-center overflow-hidden px-6 text-center',
                cover && 'text-white',
            )}
        >
            {cover && (
                <>
                    <PhotoFill
                        src={cover}
                        className="absolute inset-0 size-full scale-105"
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                'linear-gradient(180deg, rgb(0 0 0 / 0.25), rgb(0 0 0 / 0.45) 60%, var(--x-base))',
                        }}
                    />
                </>
            )}
            <FloatingHearts count={cover ? 8 : 14} />
            <Reveal className="relative">
                <h1 className="font-script text-6xl leading-[1.05] drop-shadow-[0_4px_20px_rgb(0_0_0/0.45)] sm:text-8xl">
                    <EditableText
                        field="title"
                        value={experience.title}
                        placeholder="Add a headline"
                        label="Headline"
                    />
                </h1>
                <EditableText
                    block
                    field="subtitle"
                    value={experience.subtitle}
                    placeholder="Add a sub-headline"
                    label="Sub-headline"
                    className="mt-3 font-script text-3xl drop-shadow sm:text-5xl"
                >
                    {experience.subtitle}
                </EditableText>
                <EditableText
                    block
                    field="recipient_name"
                    value={experience.recipient_name}
                    placeholder="Add their name"
                    label="Their name"
                    className="mt-6 text-sm tracking-[0.3em] uppercase opacity-90"
                >
                    For {experience.recipient_name}
                </EditableText>
                {!cover && (
                    <AddPhotoButton
                        label="Add a cover photo"
                        className="mt-8 inline-block"
                    />
                )}
            </Reveal>
            <ScrollHint />
        </section>
    );
}

function HeroScript() {
    const { experience } = useExperience();

    return (
        <section className="relative flex min-h-[85svh] items-center justify-center overflow-hidden px-6 text-center">
            <FloatingHearts count={12} />
            <Reveal className="relative">
                <Heart
                    className="mx-auto mb-4 size-10 animate-wiggle text-[var(--x-accent)]"
                    fill="currentColor"
                />
                <h1 className="font-script text-6xl leading-[1.05] sm:text-8xl">
                    <EditableText
                        field="title"
                        value={experience.title}
                        placeholder="Add a headline"
                        label="Headline"
                    />
                </h1>
                <EditableText
                    block
                    field="subtitle"
                    value={experience.subtitle}
                    placeholder="Add a sub-headline"
                    label="Sub-headline"
                    className="mt-4 font-display text-xl text-[var(--x-muted)] italic sm:text-2xl"
                >
                    {experience.subtitle}
                </EditableText>
                <EditableText
                    block
                    field="event_date"
                    value={experience.event_date}
                    placeholder="Add a date"
                    label="Date or tagline"
                    className="mt-6 text-sm tracking-[0.3em] text-[var(--x-accent)] uppercase"
                >
                    {experience.event_date}
                </EditableText>
            </Reveal>
            <ScrollHint />
        </section>
    );
}

function HeroDoily() {
    const { experience } = useExperience();

    return (
        <section
            className="relative flex min-h-[90svh] items-center justify-center overflow-hidden px-6"
            style={{
                backgroundColor: '#F7C6D3',
                backgroundImage:
                    'linear-gradient(90deg, rgb(255 255 255 / 0.45) 50%, transparent 50%), linear-gradient(rgb(255 255 255 / 0.45) 50%, transparent 50%)',
                backgroundSize: '44px 44px',
            }}
        >
            <Reveal className="relative">
                <div className="relative flex aspect-square w-[min(84vw,30rem)] items-center justify-center rounded-full border-[14px] border-dotted border-white bg-[#FFFBF5] p-6 text-center text-[#B23A62] shadow-[0_30px_60px_-20px_rgb(120_30_60/0.45)]">
                    <div className="flex size-full flex-col items-center justify-center rounded-full border-2 border-dashed border-[#F2A5BC] p-6">
                        <h1 className="font-display text-4xl leading-tight font-medium tracking-wide uppercase sm:text-5xl">
                            <EditableText
                                field="title"
                                value={experience.title}
                                placeholder="Add a headline"
                                label="Headline"
                            />
                        </h1>
                        <EditableText
                            block
                            field="subtitle"
                            value={experience.subtitle}
                            placeholder="Add a sub-headline"
                            label="Sub-headline"
                            className="mt-3 font-script text-3xl"
                        >
                            {experience.subtitle}
                        </EditableText>
                    </div>
                </div>
                <Flower2
                    className="absolute -top-4 -right-2 size-16 text-[#F28AA8]"
                    fill="#FFD1DC"
                />
                <Flower2
                    className="absolute -bottom-2 -left-4 size-20 rotate-45 text-[#F28AA8]"
                    fill="#FFD1DC"
                />
            </Reveal>
        </section>
    );
}

function Note() {
    const { experience, preset, photoAt, editable } = useExperience();
    const parts = paragraphs(experience.message);

    if (parts.length === 0 && !editable) {
        return null;
    }

    return (
        <SectionShell>
            <div className="grid items-center gap-10 md:grid-cols-[0.9fr_1.1fr]">
                <Reveal>
                    <Polaroid
                        src={photoAt(0)}
                        rotate={-4}
                        className="mx-auto w-64 sm:w-72"
                    />
                </Reveal>
                <Reveal delay={150}>
                    <Eyebrow>{preset.labels?.note ?? 'A little note'}</Eyebrow>
                    <EditableText
                        block
                        field="recipient_name"
                        value={experience.recipient_name}
                        placeholder="Add their name"
                        label="Their name"
                        className="mt-3 font-display text-4xl"
                    >
                        To {experience.recipient_name},
                    </EditableText>
                    <EditableText
                        block
                        multiline
                        field="message"
                        value={experience.message}
                        placeholder="Tap to write your letter"
                        label="Your letter"
                        className="mt-4 space-y-3 leading-relaxed text-[var(--x-muted)]"
                    >
                        {parts.map((part, index) => (
                            <p key={index} className="whitespace-pre-line">
                                {part}
                            </p>
                        ))}
                    </EditableText>
                </Reveal>
            </div>
        </SectionShell>
    );
}

function LetterCard() {
    const { experience, photoAt, editable } = useExperience();
    const parts = paragraphs(experience.message);

    if (parts.length === 0 && !editable) {
        return null;
    }

    return (
        <SectionShell surface>
            <div className="grid items-center gap-6 md:grid-cols-[1fr_1.3fr_1fr]">
                <Reveal className="hidden md:block">
                    <PhotoFill
                        src={photoAt(1)}
                        className="aspect-[3/4] w-full -rotate-3 rounded-2xl shadow-xl"
                    />
                </Reveal>
                <Reveal delay={120}>
                    <div className="rounded-[1.5rem] border-2 border-[var(--x-ink)]/80 p-1.5">
                        <div className="rounded-[1.2rem] border border-[var(--x-ink)]/50 px-6 py-8 text-center">
                            <Heart
                                className="mx-auto size-6 text-[var(--x-accent)]"
                                fill="currentColor"
                            />
                            <h2 className="mt-3 font-display text-2xl font-semibold uppercase">
                                <EditableText
                                    field="title"
                                    value={experience.title}
                                    placeholder="Add a headline"
                                    label="Headline"
                                />
                            </h2>
                            <EditableText
                                block
                                multiline
                                field="message"
                                value={experience.message}
                                placeholder="Tap to write your letter"
                                label="Your letter"
                                className="mt-4 space-y-3 font-display leading-relaxed"
                            >
                                {parts.slice(0, 2).map((part, index) => (
                                    <p
                                        key={index}
                                        className="whitespace-pre-line"
                                    >
                                        {part}
                                    </p>
                                ))}
                            </EditableText>
                        </div>
                    </div>
                </Reveal>
                <Reveal delay={240} className="grid grid-cols-2 gap-4 md:block">
                    <PhotoFill
                        src={photoAt(1)}
                        className="aspect-[3/4] w-full rotate-2 rounded-2xl shadow-xl md:hidden"
                    />
                    <PhotoFill
                        src={photoAt(2)}
                        className="aspect-[3/4] w-full rotate-3 rounded-2xl shadow-xl"
                    />
                </Reveal>
            </div>
        </SectionShell>
    );
}

function LetterPaper() {
    const { experience, photoAt, editable } = useExperience();
    const parts = paragraphs(experience.message);

    if (parts.length === 0 && !editable) {
        return null;
    }

    return (
        <SectionShell>
            <div className="grid items-start gap-6 md:grid-cols-[0.8fr_1.2fr]">
                <Reveal>
                    <div
                        className="relative mx-auto max-w-xs -rotate-2 bg-[var(--x-paper)] p-6 shadow-[0_20px_40px_-18px_rgb(0_0_0/0.5)]"
                        style={{
                            backgroundImage:
                                'repeating-linear-gradient(transparent 0 27px, rgb(0 0 0 / 0.06) 27px 28px)',
                        }}
                    >
                        <Polaroid
                            src={photoAt(3)}
                            rotate={2}
                            tape
                            className="mx-auto w-48"
                        />
                        <div className="mt-6 flex justify-center gap-1 text-[#D04A6B]">
                            {[0, 1, 2].map((index) => (
                                <Heart
                                    key={index}
                                    className="size-4"
                                    fill="currentColor"
                                />
                            ))}
                        </div>
                    </div>
                </Reveal>
                <Reveal delay={150}>
                    <div
                        className="relative rotate-1 bg-[var(--x-paper)] px-7 py-8 text-[var(--x-paper-ink)] shadow-[0_20px_40px_-18px_rgb(0_0_0/0.5)] [clip-path:polygon(0_0,calc(100%-36px)_0,100%_36px,100%_100%,0_100%)]"
                        style={{
                            backgroundImage:
                                'repeating-linear-gradient(transparent 0 31px, rgb(60 90 160 / 0.14) 31px 32px)',
                            lineHeight: '32px',
                        }}
                    >
                        <span className="absolute top-0 right-0 size-9 bg-[linear-gradient(225deg,transparent_50%,rgb(0_0_0/0.12)_50%)]" />
                        <EditableText
                            block
                            field="recipient_name"
                            value={experience.recipient_name}
                            placeholder="Add their name"
                            label="Their name"
                            className="font-display text-lg italic"
                        >
                            Dear {experience.recipient_name},
                        </EditableText>
                        <EditableText
                            block
                            multiline
                            field="message"
                            value={experience.message}
                            placeholder="Tap to write your letter"
                            label="Your letter"
                        >
                            {parts.map((part, index) => (
                                <p
                                    key={index}
                                    className="mb-[32px] font-display whitespace-pre-line italic last:mb-0"
                                >
                                    {part}
                                </p>
                            ))}
                        </EditableText>
                        <EditableText
                            block
                            field="sender_name"
                            value={experience.sender_name}
                            placeholder="Add your name"
                            label="Your name"
                            className="mt-2 text-right font-script text-3xl"
                        >
                            — {experience.sender_name}
                        </EditableText>
                    </div>
                </Reveal>
            </div>
        </SectionShell>
    );
}

/**
 * A dashed thread from a polaroid to its right-hand neighbour. It is hidden on
 * the last card of each row (2, 3 or 4 columns) and on the very last card, so
 * the line never trails off into empty space.
 */
export function PolaroidConnector({
    index,
    total,
}: {
    index: number;
    total: number;
}) {
    if (index === total - 1) {
        return null;
    }

    return (
        <svg
            className={cn(
                'pointer-events-none absolute top-[35%] left-[80%] h-10 w-[calc(40%+1.25rem)]',
                index % 2 === 1 ? 'hidden' : 'block',
                index % 3 === 2 ? 'sm:hidden' : 'sm:block',
                index % 4 === 3 ? 'lg:hidden' : 'lg:block',
            )}
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            aria-hidden
        >
            <path
                d={
                    index % 2 === 0
                        ? 'M0 12 C 30 0, 60 40, 100 22'
                        : 'M0 26 C 35 40, 65 0, 100 16'
                }
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

function PolaroidWall() {
    const { experience, preset, moments, photos, editable } = useExperience();
    const items: {
        src: string | null;
        caption: string | null;
        moment?: number;
    }[] =
        moments.length > 0
            ? moments.map((moment, index) => ({
                  src: moment.photo_url,
                  caption: moment.title ?? moment.date,
                  moment: index,
              }))
            : photos.map((src) => ({ src, caption: null }));

    if (editable && moments.length === 0) {
        while (items.length < 4 || items.length % 4 !== 0) {
            items.push({ src: null, caption: null });
        }
    }

    if (items.length === 0) {
        return null;
    }

    const visibleItems = items.slice(0, 12);
    const defaultTitle = preset.labels?.polaroidWall ?? 'Our moments together';

    return (
        <SectionShell surface>
            <Reveal className="text-center">
                <ScriptHeading>
                    <EditableText
                        field="event_date"
                        value={experience.event_date ?? defaultTitle}
                        placeholder={defaultTitle}
                        label="Section title"
                    />
                </ScriptHeading>
            </Reveal>
            <div className="relative mt-12 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {visibleItems.map((item, index) => (
                    <Reveal key={index} delay={(index % 4) * 100}>
                        <div className="relative">
                            <PolaroidConnector
                                index={index}
                                total={visibleItems.length}
                            />
                            {index % 3 === 1 && (
                                <Heart
                                    className="absolute -top-3 left-1/2 z-10 size-6 -translate-x-1/2 text-[#D04A6B]"
                                    fill="currentColor"
                                />
                            )}
                            <Polaroid
                                src={item.src}
                                caption={item.caption}
                                rotate={ROTATIONS[index % ROTATIONS.length]}
                                moment={item.moment}
                            />
                        </div>
                    </Reveal>
                ))}
            </div>
        </SectionShell>
    );
}

function FilmStrip() {
    const { experience, preset, photos, photoAt, openPhoto } = useExperience();
    const frames = Array.from(
        { length: Math.max(3, Math.min(photos.length, 6)) },
        (_, index) => photoAt(index),
    );
    const sprockets =
        'repeating-linear-gradient(90deg, transparent 0 10px, #F5F0E8 10px 22px, transparent 22px 34px)';

    return (
        <SectionShell>
            <Reveal className="text-center">
                <h2 className="font-display text-3xl font-semibold tracking-wide uppercase">
                    {preset.labels?.filmStrip ?? 'My favorite person'}
                </h2>
            </Reveal>
            <Reveal delay={150}>
                <div className="-mx-5 mt-10 scrollbar-none overflow-x-auto px-5 pb-4">
                    <div className="relative mx-auto w-max -rotate-1 bg-[#141414] px-4 py-7 shadow-[0_24px_50px_-20px_rgb(0_0_0/0.7)]">
                        <div
                            className="absolute inset-x-0 top-2 h-3 opacity-90"
                            style={{
                                backgroundImage: sprockets,
                                backgroundSize: '34px 12px',
                                borderRadius: 2,
                            }}
                        />
                        <div className="flex gap-3">
                            {frames.map((src, index) => (
                                <div key={index} className="w-44 sm:w-56">
                                    <p className="mb-1 flex justify-between font-mono text-[9px] tracking-widest text-[#E8A33D]">
                                        <span>TAPTALE 400</span>
                                        <span>{index + 1}A</span>
                                    </p>
                                    <PhotoFill
                                        src={src}
                                        className="aspect-[4/3] w-full"
                                        onClick={
                                            src
                                                ? () => openPhoto(src)
                                                : undefined
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                        <div
                            className="absolute inset-x-0 bottom-2 h-3 opacity-90"
                            style={{
                                backgroundImage: sprockets,
                                backgroundSize: '34px 12px',
                            }}
                        />
                    </div>
                </div>
            </Reveal>
            <Reveal className="mt-6 text-center">
                <p className="font-display text-2xl font-semibold uppercase">
                    {preset.labels?.filmCaption ??
                        experience.quote ??
                        'I love you so much!'}
                </p>
            </Reveal>
        </SectionShell>
    );
}

function Timeline() {
    const { preset, moments } = useExperience();

    if (moments.length === 0) {
        return null;
    }

    return (
        <SectionShell>
            <Reveal className="text-center">
                <Eyebrow>The moments</Eyebrow>
                <h2 className="mt-3 font-display text-4xl">
                    {preset.labels?.timeline ?? 'How we happened'}
                </h2>
            </Reveal>
            <div className="relative mt-14">
                <div className="absolute top-0 bottom-0 left-4 w-px bg-[var(--x-accent)]/60 md:left-1/2" />
                <ol className="space-y-14">
                    {moments.map((moment, index) => (
                        <li
                            key={index}
                            className="relative grid gap-6 pl-12 md:grid-cols-2 md:pl-0"
                        >
                            <span className="absolute top-6 left-4 size-4 -translate-x-1/2 rounded-full border-2 border-[var(--x-base)] bg-[var(--x-accent)] md:left-1/2" />
                            <Reveal
                                className={cn(
                                    index % 2 === 0
                                        ? 'md:pr-12'
                                        : 'md:order-2 md:pl-12',
                                )}
                            >
                                <Polaroid
                                    src={moment.photo_url}
                                    moment={index}
                                    rotate={index % 2 === 0 ? -3 : 3}
                                    className={cn(
                                        'w-56',
                                        index % 2 === 0 ? 'md:ml-auto' : '',
                                    )}
                                />
                            </Reveal>
                            <Reveal
                                delay={150}
                                className={cn(
                                    'self-center',
                                    index % 2 === 0
                                        ? 'md:pl-12'
                                        : 'md:order-1 md:pr-12 md:text-right',
                                )}
                            >
                                <EditableText
                                    block
                                    field={`moments.${index}.date`}
                                    value={moment.date}
                                    placeholder="Add a date"
                                    label="Moment date"
                                    className="text-xs font-semibold tracking-[0.3em] text-[var(--x-accent)] uppercase"
                                >
                                    {moment.date}
                                </EditableText>
                                <EditableText
                                    block
                                    field={`moments.${index}.title`}
                                    value={moment.title}
                                    placeholder="Add a headline"
                                    label="Headline"
                                    className="mt-1 font-display text-2xl"
                                >
                                    {moment.title}
                                </EditableText>
                                <EditableText
                                    block
                                    multiline
                                    field={`moments.${index}.caption`}
                                    value={moment.caption}
                                    placeholder="What happened?"
                                    label="Moment caption"
                                    className="mt-2 leading-relaxed text-[var(--x-muted)]"
                                >
                                    {moment.caption}
                                </EditableText>
                            </Reveal>
                        </li>
                    ))}
                </ol>
            </div>
        </SectionShell>
    );
}

function Gifts() {
    const { experience, preset } = useExperience();
    const [open, setOpen] = useState<'flowers' | 'letter' | 'song' | null>(
        null,
    );
    const hasSong = !!(
        experience.music_url ||
        experience.audio_url ||
        experience.song_title
    );

    const gifts = [
        {
            key: 'flowers' as const,
            icon: Flower2,
            label: 'Flowers for you',
            show: !!experience.flowers_note,
        },
        {
            key: 'letter' as const,
            icon: Mail,
            label: 'My love letter',
            show: !!experience.message,
        },
        {
            key: 'song' as const,
            icon: Music,
            label: 'A song for you',
            show: hasSong,
        },
    ].filter((gift) => gift.show);

    if (gifts.length === 0) {
        return null;
    }

    return (
        <SectionShell>
            <Reveal className="text-center">
                <ScriptHeading>
                    {preset.labels?.gifts ?? experience.title}
                </ScriptHeading>
                <EditableText
                    block
                    field="subtitle"
                    value={experience.subtitle}
                    placeholder="Add a sub-headline"
                    label="Sub-headline"
                    className="mt-2 font-display text-[var(--x-muted)]"
                >
                    {experience.subtitle}
                </EditableText>
            </Reveal>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
                {gifts.map((gift, index) => (
                    <Reveal key={gift.key} delay={index * 120}>
                        <button
                            type="button"
                            onClick={() => setOpen(gift.key)}
                            className="group flex w-full flex-col items-center"
                        >
                            <span className="flex size-36 items-center justify-center rounded-full bg-[var(--x-paper)] text-[#D04A6B] shadow-[0_20px_40px_-18px_rgb(0_0_0/0.55)] transition-transform group-hover:-translate-y-2 group-hover:rotate-3">
                                <gift.icon
                                    className="size-16"
                                    strokeWidth={1.3}
                                />
                            </span>
                            <span className="mt-5 font-display text-xl">
                                {gift.label}
                            </span>
                            <span className="mt-1 text-xs tracking-[0.25em] text-[var(--x-muted)] uppercase">
                                Tap to open
                            </span>
                        </button>
                    </Reveal>
                ))}
            </div>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                    onClick={() => setOpen(null)}
                >
                    <div
                        className="relative max-h-[90vh] w-full max-w-lg animate-fade-up overflow-y-auto rounded-[1.75rem] bg-[var(--x-paper)] p-8 text-[var(--x-paper-ink)]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setOpen(null)}
                            className="absolute top-4 right-4 rounded-full p-1.5 hover:bg-black/5"
                            aria-label="Close"
                        >
                            <X className="size-5" />
                        </button>
                        {open === 'flowers' && (
                            <div className="text-center">
                                <Bouquet />
                                <p className="mt-4 font-display text-2xl">
                                    Flowers for you
                                </p>
                                <p className="mt-3 font-display text-lg leading-relaxed italic">
                                    {experience.flowers_note}
                                </p>
                            </div>
                        )}
                        {open === 'letter' && (
                            <div>
                                <EditableText
                                    block
                                    field="recipient_name"
                                    value={experience.recipient_name}
                                    placeholder="Add their name"
                                    label="Their name"
                                    className="font-display text-lg italic"
                                >
                                    Dear {experience.recipient_name},
                                </EditableText>
                                {paragraphs(experience.message).map(
                                    (part, index) => (
                                        <p
                                            key={index}
                                            className="mt-3 font-display leading-relaxed whitespace-pre-line italic"
                                        >
                                            {part}
                                        </p>
                                    ),
                                )}
                                <EditableText
                                    block
                                    field="sender_name"
                                    value={experience.sender_name}
                                    placeholder="Add your name"
                                    label="Your name"
                                    className="mt-4 text-right font-script text-3xl"
                                >
                                    — {experience.sender_name}
                                </EditableText>
                            </div>
                        )}
                        {open === 'song' && <SongPlayer compact />}
                    </div>
                </div>
            )}
        </SectionShell>
    );
}

function Bouquet() {
    const petals = [
        '#FFFFFF',
        '#FFF4F6',
        '#FFFFFF',
        '#FFF0F3',
        '#FFFFFF',
        '#FFF7F8',
        '#FFFFFF',
    ];

    return (
        <svg viewBox="0 0 160 170" className="mx-auto w-44" aria-hidden>
            {petals.map((color, index) => {
                const x = 30 + index * 16;
                const y = 30 + Math.abs(3 - index) * 10;

                return (
                    <g key={index}>
                        <path
                            d={`M${x} ${y + 18} Q ${x + 2} ${y + 70}, 80 132`}
                            stroke="#5E8C4F"
                            strokeWidth="3"
                            fill="none"
                        />
                        <path
                            d={`M${x - 9} ${y + 6} Q ${x - 10} ${y - 14}, ${x} ${y - 16} Q ${x + 10} ${y - 14}, ${x + 9} ${y + 6} Q ${x} ${y + 22}, ${x - 9} ${y + 6}Z`}
                            fill={color}
                            stroke="#E7D3D8"
                            strokeWidth="1.2"
                        />
                    </g>
                );
            })}
            <path d="M58 118 L80 165 L102 118 Z" fill="#F2B8C6" />
            <path
                d="M66 126 Q80 136 94 126"
                stroke="#D04A6B"
                strokeWidth="3"
                fill="none"
            />
        </svg>
    );
}

function SongSection() {
    const { experience, preset, editable } = useExperience();

    if (
        !experience.music_url &&
        !experience.audio_url &&
        !experience.song_title
    ) {
        return null;
    }

    const ornament = experience.song_ornament ?? 'none';
    const background = experience.song_background ?? 'theme';
    const hasHearts = ornament === 'hearts';
    const hasHeartsBackdrop = background === 'hearts';

    return (
        <SectionShell
            surface={!hasHeartsBackdrop}
            style={hasHeartsBackdrop ? HEARTS_BACKDROP_STYLE : undefined}
            backdrop={
                <>
                    {hasHeartsBackdrop && <HeartsBackdrop />}
                    {editable && (
                        <SongStyleSwitch
                            ornament={ornament}
                            background={background}
                        />
                    )}
                </>
            }
        >
            <Reveal className="mb-10 text-center">
                {hasHearts && <HeartFlourish className="mb-2" />}
                <ScriptHeading>
                    {preset.labels?.song ?? 'This song reminds me of you'}
                </ScriptHeading>
                {hasHearts && <HeartFlourish flip className="mt-2" />}
            </Reveal>
            <Reveal delay={150}>
                {/* The player keeps its own layout; the card only frames it. */}
                <div
                    className="rounded-[2rem] border p-3 shadow-[0_30px_70px_-35px_rgb(0_0_0/0.75)] backdrop-blur-sm sm:p-8"
                    style={{
                        background:
                            'color-mix(in srgb, var(--x-ink) 5%, transparent)',
                        borderColor: hasHeartsBackdrop
                            ? 'color-mix(in srgb, var(--x-accent) 40%, transparent)'
                            : 'color-mix(in srgb, var(--x-ink) 12%, transparent)',
                        boxShadow: hasHeartsBackdrop
                            ? '0 0 45px -12px color-mix(in srgb, var(--x-accent) 55%, transparent)'
                            : undefined,
                    }}
                >
                    <SongPlayer />
                </div>
            </Reveal>
            {hasHearts && <HeartFlourish className="mt-12" />}
        </SectionShell>
    );
}

function PlayerSection() {
    const { experience, photoAt } = useExperience();
    const { available, playing, toggle } = useExperienceAudio();
    const embed = embedFor(experience.music_url);
    const lines = (experience.message ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    return (
        <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-5 py-16">
            <PhotoFill
                src={photoAt(0)}
                className="absolute inset-0 size-full scale-125 opacity-40 blur-3xl"
            />
            <Reveal className="relative w-full max-w-sm">
                <p className="mb-6 text-center font-script text-4xl sm:text-5xl">
                    {experience.title}
                </p>
                <div className="rounded-[2rem] bg-black/35 p-6 shadow-2xl backdrop-blur-xl">
                    <PhotoFill
                        src={photoAt(0)}
                        className="aspect-square w-full rounded-2xl shadow-lg"
                    />
                    <div className="mt-5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-xl font-bold">
                                {experience.song_title ?? 'Our Song'}
                            </p>
                            <p className="truncate opacity-75">
                                {experience.song_artist ??
                                    experience.sender_name ??
                                    'For you'}
                            </p>
                        </div>
                        <Heart
                            className="size-6 shrink-0 text-[var(--x-accent)]"
                            fill="currentColor"
                        />
                    </div>
                    <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/20">
                        <div
                            className={cn(
                                'h-full rounded-full bg-white',
                                playing
                                    ? 'w-full transition-[width] duration-[180s] ease-linear'
                                    : 'w-[35%]',
                            )}
                        />
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                        <Shuffle className="size-5 text-[var(--x-accent)]" />
                        <SkipBack className="size-6" fill="currentColor" />
                        <button
                            type="button"
                            onClick={available ? toggle : undefined}
                            className="flex size-16 items-center justify-center rounded-full bg-white text-black shadow-lg transition hover:scale-105"
                            aria-label={playing ? 'Pause' : 'Play'}
                        >
                            {playing ? (
                                <Pause className="size-7" fill="currentColor" />
                            ) : (
                                <Play
                                    className="ml-1 size-7"
                                    fill="currentColor"
                                />
                            )}
                        </button>
                        <SkipForward className="size-6" fill="currentColor" />
                        <Repeat className="size-5 opacity-70" />
                    </div>
                </div>
                {embed && (
                    <div
                        className={cn(
                            'mt-6 overflow-hidden rounded-2xl shadow-xl',
                            embed.kind === 'video'
                                ? 'aspect-video'
                                : 'h-[152px]',
                        )}
                    >
                        <iframe
                            src={embed.src}
                            title="Our song"
                            className="size-full"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                        />
                    </div>
                )}
                {lines.length > 0 && (
                    <div className="mt-8 space-y-2 text-center font-display text-lg leading-relaxed">
                        {lines.slice(0, 8).map((line, index) => (
                            <p
                                key={index}
                                className={
                                    index === 1
                                        ? 'text-2xl font-semibold'
                                        : 'opacity-75'
                                }
                            >
                                {line}
                            </p>
                        ))}
                    </div>
                )}
            </Reveal>
        </section>
    );
}

function Scrapbook() {
    const { experience, photoAt, photos } = useExperience();
    const stickers = [Heart, Star, Flower2, Sparkles];
    const count = Math.max(4, Math.min(photos.length, 6));

    return (
        <SectionShell>
            <Reveal>
                <div
                    className="relative mx-auto max-w-3xl rotate-1 rounded-[2rem] p-6 shadow-[0_30px_60px_-24px_rgb(0_0_0/0.6)] sm:p-10"
                    style={{
                        backgroundColor: '#FBE3E6',
                        backgroundImage:
                            'linear-gradient(90deg, rgb(208 74 107 / 0.18) 50%, transparent 50%), linear-gradient(rgb(208 74 107 / 0.18) 50%, transparent 50%)',
                        backgroundSize: '36px 36px',
                    }}
                >
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                        {Array.from({ length: count }, (_, index) => (
                            <Polaroid
                                key={index}
                                src={photoAt(index)}
                                rotate={
                                    ROTATIONS[(index + 3) % ROTATIONS.length]
                                }
                                tape={index % 2 === 0}
                            />
                        ))}
                    </div>
                    {stickers.map((Sticker, index) => (
                        <Sticker
                            key={index}
                            className="absolute size-10 text-[#D04A6B] drop-shadow"
                            fill={index === 1 ? '#FFD86B' : '#FFC2D1'}
                            style={{
                                top: `${[4, 88, 40, 70][index]}%`,
                                left: `${[90, 4, -3, 96][index]}%`,
                            }}
                        />
                    ))}
                    <EditableText
                        block
                        field="quote"
                        value={experience.quote}
                        placeholder="Add a favorite line"
                        label="Favorite line"
                        className="mt-8 text-center font-script text-4xl text-[#8B1A22]"
                    >
                        {experience.quote}
                    </EditableText>
                </div>
            </Reveal>
        </SectionShell>
    );
}

function Gallery() {
    const { preset, photos, openPhoto, editable } = useExperience();

    if (photos.length === 0 && !editable) {
        return null;
    }

    return (
        <SectionShell>
            <Reveal className="text-center">
                <ScriptHeading>
                    {preset.labels?.gallery ?? 'Our album'}
                </ScriptHeading>
            </Reveal>
            <div className="mt-10 columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
                {photos.map((src, index) => (
                    <Reveal
                        key={index}
                        delay={(index % 3) * 100}
                        className="break-inside-avoid"
                    >
                        <img
                            src={src}
                            alt=""
                            loading="lazy"
                            onClick={() => openPhoto(src)}
                            className="w-full cursor-zoom-in rounded-2xl shadow-lg transition duration-500 hover:scale-[1.02]"
                        />
                    </Reveal>
                ))}
                {editable && (
                    <div className="break-inside-avoid">
                        <PhotoFill
                            src={null}
                            className="aspect-[4/3] w-full rounded-2xl"
                        />
                    </div>
                )}
            </div>
        </SectionShell>
    );
}

function VideoSection() {
    const { experience, editable } = useExperience();
    const embed = embedFor(experience.video_url);
    const frame = experience.video_frame ?? 'plain';

    if (!experience.video_url && !experience.video_file_url && !editable) {
        return null;
    }

    // The phone frame has an upright screen; every other frame is 16:9.
    const screen = frame === 'phone' ? 'size-full' : 'aspect-video w-full';

    const player = experience.video_file_url ? (
        <video
            key={experience.video_file_url}
            src={experience.video_file_url}
            controls
            playsInline
            preload="metadata"
            className={cn(screen, 'bg-black object-contain')}
        />
    ) : embed ? (
        <iframe
            src={embed.src}
            title="Our video"
            className={cn(screen, 'block')}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
        />
    ) : experience.video_url ? (
        <a
            href={experience.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                screen,
                'flex items-center justify-center gap-3 bg-[var(--x-accent)] font-medium text-[var(--x-accent-ink)]',
            )}
        >
            <Play className="size-6" /> Watch our video
        </a>
    ) : (
        <div
            className={cn(
                screen,
                'flex flex-col items-center justify-center gap-2 bg-neutral-900 text-sm text-white/70',
            )}
        >
            <Play className="size-8" /> Your video plays here
        </div>
    );

    return (
        <SectionShell surface>
            <Reveal>
                <VideoFrameView frame={frame} title={experience.title}>
                    {player}
                </VideoFrameView>
                {editable && <VideoEditor />}
            </Reveal>
        </SectionShell>
    );
}

function QuoteBanner() {
    const { experience, editable } = useExperience();

    if (!experience.quote && !editable) {
        return null;
    }

    return (
        <section
            className="relative overflow-hidden px-6 py-16 text-center"
            style={{
                background: 'var(--x-accent)',
                color: 'var(--x-accent-ink)',
            }}
        >
            <Reveal>
                <EditableText
                    block
                    field="quote"
                    value={experience.quote}
                    placeholder="Tap to add a favorite line"
                    label="Favorite line"
                    className="mx-auto max-w-3xl font-display text-3xl leading-snug italic sm:text-4xl"
                >
                    “{experience.quote}”
                </EditableText>
                <EditableText
                    block
                    field="sender_name"
                    value={experience.sender_name}
                    placeholder="Add your name"
                    label="Your name"
                    className="mt-3 text-sm tracking-[0.3em] uppercase opacity-80"
                >
                    — {experience.sender_name}
                </EditableText>
            </Reveal>
        </section>
    );
}

function Countdown() {
    const { experience, preset } = useExperience();
    const target = parseEventDate(experience.event_date);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(timer);
    }, []);

    if (!target) {
        return null;
    }

    const remaining = Math.max(0, target.getTime() - now);
    const units = [
        ['Days', Math.floor(remaining / 86_400_000)],
        ['Hours', Math.floor((remaining / 3_600_000) % 24)],
        ['Minutes', Math.floor((remaining / 60_000) % 60)],
        ['Seconds', Math.floor((remaining / 1000) % 60)],
    ] as const;

    return (
        <SectionShell surface className="text-center">
            <Reveal>
                <Eyebrow>{preset.labels?.countdown ?? 'Counting down'}</Eyebrow>
                <p className="mt-3 font-display text-3xl">
                    <EditableText
                        field="event_date"
                        value={experience.event_date}
                        placeholder="Add the date"
                        label="Event date"
                    />
                </p>
                {remaining > 0 ? (
                    <div className="mx-auto mt-8 grid max-w-xl grid-cols-4 gap-3">
                        {units.map(([label, value]) => (
                            <div
                                key={label}
                                className="rounded-2xl bg-[var(--x-paper)] px-2 py-4 text-[var(--x-paper-ink)] shadow-lg"
                            >
                                <p className="font-display text-3xl font-semibold tabular-nums sm:text-5xl">
                                    {String(value).padStart(2, '0')}
                                </p>
                                <p className="mt-1 text-[10px] tracking-[0.25em] uppercase opacity-70 sm:text-xs">
                                    {label}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-6 font-script text-5xl">
                        The day is here!
                    </p>
                )}
            </Reveal>
        </SectionShell>
    );
}

function Details() {
    const { experience, editable } = useExperience();
    const parts = paragraphs(experience.message);

    if (parts.length === 0 && !editable) {
        return null;
    }

    return (
        <SectionShell>
            <Reveal>
                <div className="mx-auto max-w-xl rounded-[2rem] border border-[var(--x-accent)] p-2">
                    <div className="rounded-[1.6rem] border border-[var(--x-accent)]/50 bg-[var(--x-paper)] px-8 py-12 text-center text-[var(--x-paper-ink)]">
                        <Heart
                            className="mx-auto size-7 text-[var(--x-accent)]"
                            fill="currentColor"
                        />
                        <EditableText
                            block
                            field="subtitle"
                            value={experience.subtitle}
                            placeholder="Add a sub-headline"
                            label="Sub-headline"
                            className="mt-4 text-sm tracking-[0.3em] uppercase opacity-70"
                        >
                            {experience.subtitle}
                        </EditableText>
                        <EditableText
                            block
                            field="event_date"
                            value={experience.event_date}
                            placeholder="Add a date"
                            label="Date or tagline"
                            className="mt-3 font-display text-3xl"
                        >
                            {experience.event_date}
                        </EditableText>
                        <EditableText
                            block
                            multiline
                            field="message"
                            value={experience.message}
                            placeholder="Tap to write the invitation details"
                            label="Invitation details"
                            className="mt-6 space-y-3 font-display leading-relaxed"
                        >
                            {parts.map((part, index) => (
                                <p key={index} className="whitespace-pre-line">
                                    {part}
                                </p>
                            ))}
                        </EditableText>
                        <EditableText
                            block
                            field="sender_name"
                            value={experience.sender_name}
                            placeholder="Add your name"
                            label="Your name"
                            className="mt-6 font-script text-4xl"
                        >
                            {experience.sender_name}
                        </EditableText>
                    </div>
                </div>
            </Reveal>
        </SectionShell>
    );
}

function Closing({ children }: { children?: ReactNode }) {
    const { experience, preset } = useExperience();

    return (
        <section className="relative overflow-hidden px-6 pt-20 pb-28 text-center">
            <FloatingHearts count={6} />
            <Reveal className="relative">
                <p className="font-script text-5xl sm:text-6xl">
                    {preset.labels?.closing ?? 'I love you'}
                </p>
                <EditableText
                    block
                    field="sender_name"
                    value={experience.sender_name}
                    placeholder="Add your name"
                    label="Your name"
                    className="mt-3 font-display text-lg text-[var(--x-muted)] italic"
                >
                    — {experience.sender_name}
                </EditableText>
                {children}
            </Reveal>
        </section>
    );
}
