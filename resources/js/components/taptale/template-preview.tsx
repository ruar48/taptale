import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
    CalendarLayout,
    DieCutLayout,
    EngravedLayout,
    MiniCdCover,
    MusicPlayerCard,
    Photo,
    PhotoStripLayout,
    resolveLayout,
    TapTagLayout,
} from "@/components/taptale/template-layouts";
import { cn } from "@/lib/utils";
import type { Palette, TemplateLayout } from "@/types";

export type TemplatePreviewProps = {
    layout: TemplateLayout;
    palette: Palette;
    photoUrl?: string | null;
    photos?: (string | null | undefined)[];
    names?: string | null;
    date?: string | null;
    message?: string | null;
    songTitle?: string | null;
    artist?: string | null;
    accent?: string | null;
    imageUrl?: string | null;
    /**
     * Wrap layouts whose shape isn't 4:5 (strips, CD covers, tags) in a 4:5
     * frame so they line up in galleries. Turn off inside product mockups.
     */
    fit?: boolean;
    /** Render without a background (die-cut shapes inside mockups). */
    bare?: boolean;
    className?: string;
};

/**
 * Native width ÷ height of each layout.
 */
export const LAYOUT_RATIO: Record<TemplateLayout, number> = {
    polaroid: 4 / 5,
    heart: 4 / 5,
    arch: 4 / 5,
    celestial: 4 / 5,
    floral: 4 / 5,
    minimal: 4 / 5,
    mini_cd: 1,
    music_player: 5 / 8,
    photo_strip: 1 / 3,
    tap_tag: 1,
    engraved: 4 / 5,
    die_cut: 1,
    calendar: 3 / 4,
};

/**
 * Layouts that feature a song / album title and artist.
 */
export const MUSIC_LAYOUTS: TemplateLayout[] = ["mini_cd", "music_player"];

const DEFAULT_PALETTE: Palette = {
    background: "#F8F3ED",
    ink: "#343039",
    accent: "#B86F83",
};

const WOOD_PALETTES = {
    maple: { background: "#E2C49A", ink: "#5B3A1E", accent: "#8A5A32" },
    walnut: { background: "#8A5A3A", ink: "#24140A", accent: "#5A3720" },
};

/**
 * Colours a product's design is shown in. Wooden gifts show their wood;
 * everything else uses the house colours.
 */
export function productPalette(
    artStyle: string | null | undefined,
    material = "",
): Palette {
    if (artStyle !== "wood") {
        return DEFAULT_PALETTE;
    }

    return material.toLowerCase().includes("walnut")
        ? WOOD_PALETTES.walnut
        : WOOD_PALETTES.maple;
}

/**
 * Renders a design template as a live, resolution-independent preview.
 * Sizes use container query units so the same component works as a tiny
 * gallery thumbnail and as the large live preview in the order wizard.
 */
export function TemplatePreview({
    layout,
    palette,
    photoUrl,
    photos,
    names,
    date,
    message,
    songTitle,
    artist,
    accent,
    imageUrl,
    fit = true,
    bare = false,
    className,
}: TemplatePreviewProps) {
    const clipId = useId().replace(/:/g, "");
    const { colors, text, photoAt } = resolveLayout({
        palette,
        accent,
        photoUrl,
        photos,
        names,
        date,
        message,
        songTitle,
        artist,
    });
    const fitted = fit && LAYOUT_RATIO[layout] !== 4 / 5;

    if (imageUrl && photoAt(0) === null && !names && !message) {
        return (
            <div
                className={cn(
                    "relative aspect-[4/5] w-full overflow-hidden",
                    className,
                )}
            >
                <img
                    src={imageUrl}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                />
            </div>
        );
    }

    const rootStyle: CSSProperties = {
        containerType: "inline-size",
        backgroundColor: bare ? "transparent" : colors.background,
        color: colors.ink,
    };

    const photo = (extra?: string) => (
        <Photo url={photoAt(0)} accent={colors.accent} className={extra} />
    );

    const layoutProps = { colors, text, photoAt };

    let body: ReactNode;

    switch (layout) {
        case "mini_cd":
            body = <MiniCdCover {...layoutProps} />;
            break;

        case "music_player":
            body = <MusicPlayerCard {...layoutProps} />;
            break;

        case "photo_strip":
            body = <PhotoStripLayout {...layoutProps} />;
            break;

        case "tap_tag":
            body = <TapTagLayout {...layoutProps} />;
            break;

        case "engraved":
            body = <EngravedLayout {...layoutProps} />;
            break;

        case "die_cut":
            body = <DieCutLayout {...layoutProps} bare={bare} />;
            break;

        case "calendar":
            body = <CalendarLayout {...layoutProps} />;
            break;

        case "polaroid":
            body = (
                <div className="flex size-full items-center justify-center p-[8cqw]">
                    <div className="flex w-full -rotate-2 flex-col bg-white p-[4cqw] pb-[3cqw] shadow-[0_4cqw_8cqw_-3cqw_rgb(0_0_0/0.25)]">
                        {photo("aspect-square w-full")}
                        <p
                            className="mt-[3cqw] truncate text-center font-display italic"
                            style={{ fontSize: "8cqw", color: colors.ink }}
                        >
                            {text.names}
                        </p>
                        <p
                            className="text-center tracking-[0.2em] uppercase"
                            style={{ fontSize: "3.4cqw", color: colors.accent }}
                        >
                            {text.date}
                        </p>
                    </div>
                </div>
            );
            break;

        case "heart":
            body = (
                <div className="flex size-full flex-col items-center justify-center gap-[3cqw] p-[7cqw]">
                    <svg width="0" height="0" className="absolute">
                        <defs>
                            <clipPath
                                id={clipId}
                                clipPathUnits="objectBoundingBox"
                            >
                                <path d="M0.5,0.92 C0.5,0.92 0.03,0.62 0.03,0.32 C0.03,0.14 0.17,0.03 0.31,0.03 C0.4,0.03 0.47,0.08 0.5,0.15 C0.53,0.08 0.6,0.03 0.69,0.03 C0.83,0.03 0.97,0.14 0.97,0.32 C0.97,0.62 0.5,0.92 0.5,0.92 Z" />
                            </clipPath>
                        </defs>
                    </svg>
                    <div
                        className="relative aspect-square w-[78%]"
                        style={{
                            filter: `drop-shadow(0 0 0.6cqw ${colors.accent}) drop-shadow(0 0 0.6cqw ${colors.accent})`,
                        }}
                    >
                        <div
                            className="size-full"
                            style={{ clipPath: `url(#${clipId})` }}
                        >
                            {photo("size-full")}
                        </div>
                    </div>
                    <p
                        className="max-w-full truncate font-display font-medium"
                        style={{ fontSize: "9cqw" }}
                    >
                        {text.names}
                    </p>
                    <p
                        className="line-clamp-1 text-center italic opacity-80"
                        style={{ fontSize: "4cqw" }}
                    >
                        {text.message}
                    </p>
                </div>
            );
            break;

        case "arch":
            body = (
                <div className="flex size-full flex-col items-center justify-center p-[9cqw] pb-[7cqw]">
                    <div
                        className="w-[72%] overflow-hidden rounded-t-full p-[1.4cqw]"
                        style={{ border: `0.6cqw solid ${colors.accent}` }}
                    >
                        <div className="overflow-hidden rounded-t-full">
                            {photo("aspect-[3/4] w-full")}
                        </div>
                    </div>
                    <span
                        className="mt-[4cqw] block h-px w-[30%]"
                        style={{ backgroundColor: colors.accent }}
                    />
                    <p
                        className="mt-[3cqw] max-w-full truncate font-display"
                        style={{ fontSize: "8.5cqw" }}
                    >
                        {text.names}
                    </p>
                    <p
                        className="tracking-[0.25em] uppercase opacity-80"
                        style={{ fontSize: "3.2cqw" }}
                    >
                        {text.date}
                    </p>
                </div>
            );
            break;

        case "celestial":
            body = (
                <div className="relative flex size-full flex-col items-center justify-center p-[8cqw]">
                    <Stars color={colors.accent} />
                    <div
                        className="relative aspect-square w-[62%] rounded-full p-[1.5cqw]"
                        style={{
                            border: `0.5cqw solid ${colors.accent}`,
                            boxShadow: `0 0 6cqw ${colors.accent}55`,
                        }}
                    >
                        <div className="size-full overflow-hidden rounded-full">
                            {photo("size-full")}
                        </div>
                    </div>
                    <p
                        className="relative mt-[5cqw] max-w-full truncate font-display italic"
                        style={{ fontSize: "8.5cqw" }}
                    >
                        {text.names}
                    </p>
                    <p
                        className="relative line-clamp-1 text-center tracking-[0.15em] uppercase opacity-80"
                        style={{ fontSize: "3.2cqw", color: colors.accent }}
                    >
                        {text.date}
                    </p>
                </div>
            );
            break;

        case "floral":
            body = (
                <div className="flex size-full flex-col items-center justify-center p-[7cqw]">
                    <div className="relative aspect-square w-[74%]">
                        <Wreath color={colors.accent} ink={colors.ink} />
                        <div className="absolute inset-[13%] overflow-hidden rounded-full">
                            {photo("size-full")}
                        </div>
                    </div>
                    <p
                        className="mt-[3cqw] max-w-full truncate font-display"
                        style={{ fontSize: "8.5cqw" }}
                    >
                        {text.names}
                    </p>
                    <p
                        className="line-clamp-1 text-center italic opacity-80"
                        style={{ fontSize: "3.8cqw" }}
                    >
                        {text.message}
                    </p>
                </div>
            );
            break;

        default:
            body = (
                <div className="flex size-full flex-col">
                    {photo("h-[66%] w-full")}
                    <div className="flex flex-1 flex-col justify-center px-[7cqw]">
                        <p
                            className="truncate font-semibold tracking-[0.18em] uppercase"
                            style={{ fontSize: "6.2cqw" }}
                        >
                            {text.names}
                        </p>
                        <div className="mt-[1.5cqw] flex items-center gap-[2cqw]">
                            <span
                                className="block h-[0.6cqw] w-[10cqw]"
                                style={{ backgroundColor: colors.accent }}
                            />
                            <p
                                className="truncate opacity-75"
                                style={{ fontSize: "3.6cqw" }}
                            >
                                {text.date}
                            </p>
                        </div>
                    </div>
                </div>
            );
    }

    const ratio = LAYOUT_RATIO[layout];

    const design = (
        <div
            className={cn(
                "relative w-full overflow-hidden select-none",
                !fitted && className,
            )}
            style={{ ...rootStyle, aspectRatio: String(ratio) }}
        >
            {body}
        </div>
    );

    if (!fitted) {
        return design;
    }

    return (
        <div
            className={cn(
                "relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden p-[9%]",
                className,
            )}
            style={{
                background: `linear-gradient(160deg, color-mix(in oklab, ${colors.accent} 18%, #f8f3ed), color-mix(in oklab, ${colors.accent} 8%, #efe6dc))`,
            }}
        >
            <div
                className="overflow-hidden rounded-[6%] shadow-[0_12px_28px_-14px_rgb(52_48_57/0.55)]"
                style={
                    ratio < 0.8
                        ? { height: "100%", aspectRatio: String(ratio) }
                        : { width: "100%", aspectRatio: String(ratio) }
                }
            >
                {design}
            </div>
        </div>
    );
}

function Stars({ color }: { color: string }) {
    const stars = [
        [8, 10, 1],
        [22, 6, 0.6],
        [80, 9, 1.2],
        [90, 22, 0.7],
        [12, 30, 0.8],
        [70, 4, 0.5],
        [50, 7, 0.9],
        [94, 50, 0.6],
        [6, 60, 1],
        [88, 76, 0.9],
        [15, 85, 0.7],
        [35, 93, 0.5],
        [65, 92, 1],
        [42, 3, 0.4],
        [96, 92, 0.5],
    ];

    return (
        <div className="pointer-events-none absolute inset-0">
            {stars.map(([left, top, size], index) => (
                <span
                    key={index}
                    className="absolute rounded-full"
                    style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        width: `${size}cqw`,
                        height: `${size}cqw`,
                        backgroundColor: color,
                        boxShadow: `0 0 ${size * 2}cqw ${color}`,
                    }}
                />
            ))}
        </div>
    );
}

function Wreath({ color, ink }: { color: string; ink: string }) {
    const leaves = Array.from({ length: 18 }, (_, index) => index * 20);

    return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
            <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={ink}
                strokeOpacity="0.25"
                strokeWidth="0.6"
            />
            {leaves.map((angle, index) => (
                <g key={angle} transform={`rotate(${angle} 50 50)`}>
                    <ellipse
                        cx="50"
                        cy="7"
                        rx="2.6"
                        ry="6"
                        fill={index % 3 === 0 ? color : ink}
                        fillOpacity={index % 3 === 0 ? 0.9 : 0.35}
                        transform="rotate(25 50 7)"
                    />
                    {index % 3 === 0 && (
                        <circle cx="50" cy="8" r="2.4" fill={color} />
                    )}
                </g>
            ))}
        </svg>
    );
}
