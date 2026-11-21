import {
    Heart,
    Music2,
    Nfc,
    Pause,
    Repeat,
    Shuffle,
    SkipBack,
    SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Palette } from '@/types';

export type LayoutText = {
    names: string;
    date: string;
    message: string;
    songTitle: string;
    artist: string;
};

export type LayoutProps = {
    colors: Palette;
    text: LayoutText;
    photoAt: (index: number) => string | null;
};

export type DesignContent = {
    palette: Palette;
    accent?: string | null;
    photoUrl?: string | null;
    photos?: (string | null | undefined)[];
    names?: string | null;
    date?: string | null;
    message?: string | null;
    songTitle?: string | null;
    artist?: string | null;
};

const SAMPLE_TEXT = {
    names: 'Ana & Leo',
    date: '02 · 14 · 2026',
    message: 'Every tap tells our story',
    songTitle: 'Our Song',
};

/**
 * Resolve colors, text (with friendly samples) and a cycling photo picker
 * from what the customer has entered so far.
 */
export function resolveLayout(content: DesignContent): LayoutProps {
    const names = content.names?.trim();
    const photoList = (
        content.photos?.length ? content.photos : [content.photoUrl]
    ).filter((url): url is string => !!url);

    return {
        colors: {
            ...content.palette,
            accent: content.accent || content.palette.accent,
        },
        text: {
            names: names || SAMPLE_TEXT.names,
            date: content.date?.trim() || SAMPLE_TEXT.date,
            message: content.message?.trim() || SAMPLE_TEXT.message,
            songTitle:
                content.songTitle?.trim() || names || SAMPLE_TEXT.songTitle,
            artist: content.artist?.trim() || names || SAMPLE_TEXT.names,
        },
        photoAt: (index) =>
            photoList.length > 0 ? photoList[index % photoList.length] : null,
    };
}

export function Photo({
    url,
    accent,
    className,
    style,
}: {
    url?: string | null;
    accent: string;
    className?: string;
    style?: React.CSSProperties;
}) {
    if (url) {
        return (
            <img
                src={url}
                alt=""
                className={cn('object-cover', className)}
                style={style}
                draggable={false}
            />
        );
    }

    return (
        <div
            className={cn('flex items-center justify-center', className)}
            style={{
                background: `linear-gradient(135deg, ${accent}66, ${accent}22 55%, #ffffff55)`,
                ...style,
            }}
        >
            <Heart
                className="opacity-70"
                style={{ width: '12cqw', height: '12cqw', color: accent }}
                strokeWidth={1.5}
            />
        </div>
    );
}

/**
 * Deterministic bar heights so a "song code" stays the same for a title.
 */
function codeBars(seed: string, count: number): number[] {
    let hash = 7;

    for (const character of seed) {
        hash = (hash * 31 + character.charCodeAt(0)) % 9973;
    }

    return Array.from({ length: count }, (_, index) => {
        hash = (hash * 17 + index * 13 + 11) % 9973;

        return 22 + (hash % 78);
    });
}

/**
 * Splits the customer's message into tracklist lines.
 */
export function tracklist(message: string): string[] {
    const lines = message
        .split(/\n|,|•|\|/)
        .map((line) => line.trim())
        .filter(Boolean);

    return (
        lines.length > 1
            ? lines
            : ['Intro', message, 'Our Song', 'Forever', 'Outro']
    ).slice(0, 10);
}

/** Front cover of a mini CD album (square). */
export function MiniCdCover({ colors, text, photoAt }: LayoutProps) {
    return (
        <div className="relative size-full">
            <Photo
                url={photoAt(0)}
                accent={colors.accent}
                className="absolute inset-0 size-full"
            />
            <div
                className="absolute inset-0"
                style={{
                    background: `linear-gradient(180deg, ${colors.background}00 35%, ${colors.background}d9 100%)`,
                }}
            />
            <p
                className="absolute top-[5cqw] left-[6cqw] font-semibold tracking-[0.3em] uppercase"
                style={{
                    fontSize: '3.6cqw',
                    color: colors.ink,
                    textShadow: '0 1px 6px rgb(0 0 0 / 0.25)',
                }}
            >
                {text.artist}
            </p>
            <div className="absolute inset-x-[6cqw] bottom-[5cqw]">
                <p
                    className="line-clamp-2 font-display leading-[0.95] font-semibold tracking-tight uppercase"
                    style={{ fontSize: '12cqw', color: colors.ink }}
                >
                    {text.songTitle}
                </p>
                <div
                    className="mt-[2cqw] flex items-center justify-between"
                    style={{ fontSize: '3cqw', color: colors.ink }}
                >
                    <span
                        className="block h-[0.8cqw] w-[14cqw]"
                        style={{ backgroundColor: colors.accent }}
                    />
                    <span className="opacity-80">℗ {text.date}</span>
                </div>
            </div>
        </div>
    );
}

/** Back cover of a mini CD: photo band, tracklist and barcode. */
export function MiniCdBack({ colors, text, photoAt }: LayoutProps) {
    const tracks = tracklist(text.message);

    return (
        <div
            className="relative flex size-full flex-col"
            style={{
                backgroundColor: colors.background,
                color: colors.ink,
                containerType: 'inline-size',
            }}
        >
            <Photo
                url={photoAt(1) ?? photoAt(0)}
                accent={colors.accent}
                className="h-[34%] w-full opacity-90"
            />
            <div className="flex flex-1 flex-col px-[7cqw] py-[4cqw]">
                <ol className="space-y-[0.6cqw]" style={{ fontSize: '3.6cqw' }}>
                    {tracks.map((track, index) => (
                        <li key={index} className="flex gap-[2cqw] truncate">
                            <span className="opacity-60">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="truncate">{track}</span>
                        </li>
                    ))}
                </ol>
                <div className="mt-auto flex items-end justify-between">
                    <span
                        className="font-semibold tracking-[0.2em] uppercase"
                        style={{ fontSize: '2.8cqw', color: colors.accent }}
                    >
                        {text.artist}
                    </span>
                    <div className="flex h-[9cqw] items-end gap-[0.4cqw] bg-white p-[1cqw]">
                        {codeBars(text.songTitle, 16).map((height, index) => (
                            <span
                                key={index}
                                className="block bg-black"
                                style={{
                                    width:
                                        index % 3 === 0 ? '0.8cqw' : '0.4cqw',
                                    height: '100%',
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** The printed mini disc. */
export function MiniCdDisc({
    colors,
    text,
    photoAt,
    className,
}: LayoutProps & { className?: string }) {
    return (
        <div
            className={cn(
                'relative aspect-square overflow-hidden rounded-full shadow-[0_6px_18px_rgb(0_0_0/0.3)]',
                className,
            )}
            style={{
                containerType: 'inline-size',
                backgroundColor: colors.background,
            }}
        >
            <Photo
                url={photoAt(2) ?? photoAt(0)}
                accent={colors.accent}
                className="absolute inset-0 size-full"
            />
            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_45deg,rgb(255_255_255/0.35),transparent_25%,rgb(255_255_255/0.25)_50%,transparent_75%,rgb(255_255_255/0.35))] mix-blend-overlay" />
            <div className="absolute inset-[37%] rounded-full bg-white/80 ring-[1.5cqw] ring-white/40" />
            <div className="absolute inset-[45%] rounded-full bg-cream shadow-inner" />
            <p
                className="absolute inset-x-0 bottom-[12%] truncate px-[20%] text-center font-semibold tracking-[0.2em] uppercase"
                style={{
                    fontSize: '5cqw',
                    color: colors.ink,
                    textShadow: '0 1px 4px rgb(0 0 0 / 0.3)',
                }}
            >
                {text.songTitle}
            </p>
        </div>
    );
}

/** A "now playing" music player card (5:8). */
export function MusicPlayerCard({ colors, text, photoAt }: LayoutProps) {
    const muted = `${colors.ink}33`;

    return (
        <div className="flex size-full flex-col px-[7cqw] pt-[7cqw] pb-[5cqw]">
            <Photo
                url={photoAt(0)}
                accent={colors.accent}
                className="aspect-square w-full rounded-[3cqw]"
            />
            <div className="mt-[5cqw] flex items-start justify-between gap-[3cqw]">
                <div className="min-w-0">
                    <p
                        className="truncate font-bold"
                        style={{ fontSize: '7cqw', lineHeight: 1.15 }}
                    >
                        {text.songTitle}
                    </p>
                    <p
                        className="truncate opacity-70"
                        style={{ fontSize: '4.6cqw' }}
                    >
                        {text.artist}
                    </p>
                </div>
                <Heart
                    className="shrink-0"
                    style={{
                        width: '7cqw',
                        height: '7cqw',
                        color: colors.accent,
                        fill: colors.accent,
                    }}
                />
            </div>
            <div className="mt-[4cqw]">
                <div
                    className="relative h-[1.2cqw] rounded-full"
                    style={{ backgroundColor: muted }}
                >
                    <div
                        className="absolute inset-y-0 left-0 w-[38%] rounded-full"
                        style={{ backgroundColor: colors.ink }}
                    />
                    <div
                        className="absolute top-1/2 left-[38%] size-[3cqw] -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{ backgroundColor: colors.ink }}
                    />
                </div>
                <div
                    className="mt-[1.5cqw] flex justify-between opacity-70"
                    style={{ fontSize: '3.2cqw' }}
                >
                    <span>1:24</span>
                    <span>3:45</span>
                </div>
            </div>
            <div className="mt-[2cqw] flex items-center justify-between">
                <Shuffle
                    style={{
                        width: '6cqw',
                        height: '6cqw',
                        color: colors.accent,
                    }}
                />
                <SkipBack
                    style={{
                        width: '7.5cqw',
                        height: '7.5cqw',
                        fill: colors.ink,
                    }}
                />
                <span
                    className="flex size-[15cqw] items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.ink }}
                >
                    <Pause
                        style={{
                            width: '7cqw',
                            height: '7cqw',
                            color: colors.background,
                            fill: colors.background,
                        }}
                    />
                </span>
                <SkipForward
                    style={{
                        width: '7.5cqw',
                        height: '7.5cqw',
                        fill: colors.ink,
                    }}
                />
                <Repeat
                    style={{ width: '6cqw', height: '6cqw', opacity: 0.6 }}
                />
            </div>
            <div className="mt-auto flex items-center gap-[3cqw] pt-[3cqw]">
                <span
                    className="flex size-[9cqw] shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.ink }}
                >
                    <Music2
                        style={{
                            width: '5cqw',
                            height: '5cqw',
                            color: colors.background,
                        }}
                    />
                </span>
                <div className="flex h-[9cqw] flex-1 items-center justify-between">
                    {codeBars(text.songTitle + text.artist, 23).map(
                        (height, index) => (
                            <span
                                key={index}
                                className="block rounded-full"
                                style={{
                                    width: '1.3cqw',
                                    height: `${height}%`,
                                    backgroundColor: colors.ink,
                                }}
                            />
                        ),
                    )}
                </div>
            </div>
        </div>
    );
}

/** Photobooth strip with four frames (1:3). */
export function PhotoStripLayout({ colors, text, photoAt }: LayoutProps) {
    return (
        <div className="flex size-full flex-col gap-[4cqw] p-[7cqw]">
            {[0, 1, 2, 3].map((index) => (
                <Photo
                    key={index}
                    url={photoAt(index)}
                    accent={colors.accent}
                    className="w-full flex-1"
                />
            ))}
            <div className="text-center">
                <p
                    className="truncate font-display italic"
                    style={{ fontSize: '9cqw', lineHeight: 1.1 }}
                >
                    {text.names}
                </p>
                <p
                    className="tracking-[0.25em] uppercase opacity-70"
                    style={{ fontSize: '4.5cqw', color: colors.accent }}
                >
                    {text.date}
                </p>
            </div>
        </div>
    );
}

/** Round NFC tap tag face (1:1). */
export function TapTagLayout({ colors, text, photoAt }: LayoutProps) {
    const photo = photoAt(0);

    return (
        <div
            className="flex size-full flex-col items-center justify-center text-center"
            style={{
                background: `radial-gradient(circle at 30% 25%, ${colors.accent}, ${colors.background} 70%)`,
            }}
        >
            <p
                className="font-semibold tracking-[0.4em] uppercase opacity-80"
                style={{ fontSize: '5cqw' }}
            >
                Tap me
            </p>
            {photo ? (
                <img
                    src={photo}
                    alt=""
                    className="my-[4cqw] aspect-square w-[42%] rounded-full object-cover ring-[1.5cqw] ring-white/70"
                    draggable={false}
                />
            ) : (
                <span className="my-[4cqw] flex size-[38%] items-center justify-center rounded-full bg-white/15 ring-[1cqw] ring-white/40">
                    <Nfc
                        style={{ width: '22cqw', height: '22cqw' }}
                        strokeWidth={1.6}
                    />
                </span>
            )}
            <p
                className="max-w-[78%] truncate font-bold"
                style={{ fontSize: '8.5cqw' }}
            >
                {text.names}
            </p>
            <p
                className="max-w-[70%] truncate opacity-80"
                style={{ fontSize: '4.5cqw' }}
            >
                {text.message}
            </p>
        </div>
    );
}

/** Laser-engraved wood (4:5). */
export function EngravedLayout({ colors, text, photoAt }: LayoutProps) {
    const photo = photoAt(0);

    return (
        <div
            className="flex size-full flex-col items-center justify-center gap-[4cqw] p-[9cqw] text-center"
            style={{
                backgroundImage: `repeating-linear-gradient(92deg, ${colors.ink}10 0 2px, transparent 2px 11px), repeating-linear-gradient(88deg, ${colors.accent}18 0 1px, transparent 1px 23px), radial-gradient(ellipse at 30% 40%, ${colors.background}, color-mix(in oklab, ${colors.background} 75%, ${colors.ink}))`,
            }}
        >
            <div
                className="aspect-square w-[68%] overflow-hidden rounded-[4cqw]"
                style={{ boxShadow: `inset 0 0 0 0.8cqw ${colors.ink}55` }}
            >
                {photo ? (
                    <img
                        src={photo}
                        alt=""
                        className="size-full object-cover"
                        style={{
                            filter: 'grayscale(1) sepia(1) contrast(1.7) brightness(0.85)',
                            mixBlendMode: 'multiply',
                            opacity: 0.85,
                        }}
                        draggable={false}
                    />
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <Heart
                            style={{
                                width: '30cqw',
                                height: '30cqw',
                                color: colors.ink,
                                opacity: 0.7,
                            }}
                            strokeWidth={1.2}
                        />
                    </div>
                )}
            </div>
            <p
                className="line-clamp-2 font-display italic"
                style={{
                    fontSize: '6.4cqw',
                    lineHeight: 1.15,
                    textShadow: '0 1px 0 rgb(255 255 255 / 0.25)',
                }}
            >
                {text.message}
            </p>
            <p
                className="tracking-[0.3em] uppercase opacity-80"
                style={{ fontSize: '3.6cqw' }}
            >
                {text.names}
            </p>
        </div>
    );
}

/** Die-cut sticker with a thick white outline (1:1). */
export function DieCutLayout({
    colors,
    text,
    photoAt,
    bare = false,
}: LayoutProps & { bare?: boolean }) {
    return (
        <div
            className="flex size-full flex-col items-center justify-center p-[6cqw]"
            style={
                bare
                    ? undefined
                    : {
                          backgroundImage: `radial-gradient(${colors.accent}33 1.2px, transparent 1.2px)`,
                          backgroundSize: '6cqw 6cqw',
                      }
            }
        >
            <div
                className="aspect-square w-[74%] overflow-hidden border-white"
                style={{
                    borderWidth: '3.5cqw',
                    borderRadius: '46% 54% 42% 58% / 52% 44% 56% 48%',
                    filter: 'drop-shadow(0 2cqw 3cqw rgb(0 0 0 / 0.25))',
                }}
            >
                <Photo
                    url={photoAt(0)}
                    accent={colors.accent}
                    className="size-full"
                />
            </div>
            <p
                className="-mt-[5cqw] max-w-full truncate px-[3cqw] font-black tracking-tight"
                style={{
                    fontSize: '11cqw',
                    color: colors.accent,
                    textShadow:
                        '0.8cqw 0 #fff, -0.8cqw 0 #fff, 0 0.8cqw #fff, 0 -0.8cqw #fff, 0.6cqw 0.6cqw #fff, -0.6cqw -0.6cqw #fff, 0.6cqw -0.6cqw #fff, -0.6cqw 0.6cqw #fff, 0 1.6cqw 2cqw rgb(0 0 0 / 0.2)',
                }}
            >
                {text.names}
            </p>
        </div>
    );
}
