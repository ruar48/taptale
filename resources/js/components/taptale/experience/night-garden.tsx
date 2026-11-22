import { Heart, Image as ImageIcon, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import "../../../../css/night-garden.css";
import type {
    GardenOptions,
    GardenVariant,
} from "@/components/taptale/experience/config";
import {
    EditableText,
    useExperience,
} from "@/components/taptale/experience/shared";
import { cn } from "@/lib/utils";
import type { PhotoRainLayer } from "@/types";

/*
 * Night garden scene adapted from "Flower" by Naveen Kumawat (MIT),
 * https://github.com/naveen-kumawat/Flower — the full license notice is
 * kept at the top of resources/css/night-garden.css.
 */

type Palette = Partial<
    Record<
        | "petalLight"
        | "petalDark"
        | "petalMid"
        | "glow"
        | "stemDark"
        | "stemSoft"
        | "stemLight"
        | "spark1"
        | "spark2"
        | "center1"
        | "center2"
        | "leaf"
        | "leafDeep"
        | "leafBright"
        | "grass",
        string
    >
>;

/** Green foliage for every version except the original all-teal garden. */
const GREEN_FOLIAGE: Palette = {
    stemDark: "#1d6b3e",
    stemSoft: "rgba(29, 107, 62, 0.4)",
    stemLight: "#43c27a",
    leaf: "#1f9e5a",
    leafDeep: "#0f7a40",
    leafBright: "#3fe08a",
};

const PALETTES: Record<GardenVariant, Palette> = {
    teal: {},
    pink: {
        ...GREEN_FOLIAGE,
        petalLight: "#ffd6e6",
        petalDark: "#ff6f9f",
        petalMid: "#ff8fb6",
        glow: "#ff7eb6",
        spark1: "#ffe27a",
        spark2: "#ff9ccc",
    },
    lavender: {
        ...GREEN_FOLIAGE,
        petalLight: "#efe4ff",
        petalDark: "#9b7be8",
        petalMid: "#b89cf5",
        glow: "#b993ff",
        spark1: "#fff1a8",
        spark2: "#cdb4ff",
    },
    golden: {
        ...GREEN_FOLIAGE,
        petalLight: "#fff4c2",
        petalDark: "#f0a72b",
        petalMid: "#f7c45a",
        glow: "#ffc94d",
        spark1: "#fff6a0",
        spark2: "#ffb347",
        center1: "#ff9a3c",
        center2: "#f2711c",
    },
    red: {
        ...GREEN_FOLIAGE,
        petalLight: "#ffb3b8",
        petalDark: "#c8102e",
        petalMid: "#e5384f",
        glow: "#ff3d5a",
        spark1: "#ffd36b",
        spark2: "#ff6b81",
    },
    white: {
        ...GREEN_FOLIAGE,
        petalLight: "#ffffff",
        petalDark: "#c3cfe2",
        petalMid: "#dde6f3",
        glow: "#e3edff",
        spark1: "#fff7c2",
        spark2: "#cfe3ff",
    },
    blue: {
        ...GREEN_FOLIAGE,
        petalLight: "#d9ecff",
        petalDark: "#3d7bf2",
        petalMid: "#6fa0ff",
        glow: "#5c9dff",
        spark1: "#fff3a3",
        spark2: "#8fc2ff",
    },
    peach: {
        ...GREEN_FOLIAGE,
        petalLight: "#ffe6d6",
        petalDark: "#ff8a5c",
        petalMid: "#ffa982",
        glow: "#ff9f7a",
        spark1: "#fff0a0",
        spark2: "#ffc2a8",
    },
    mixed: {
        ...GREEN_FOLIAGE,
        petalLight: "#ffd6e6",
        petalDark: "#ff6f9f",
        petalMid: "#ff8fb6",
        glow: "#ff9ad0",
        spark1: "#ffe27a",
        spark2: "#cdb4ff",
    },
};

/**
 * Per-flower colors for versions where each flower is different. The
 * variables cascade from each flower, so its petals, glow and sparks change.
 */
const FLOWER_PALETTES: Partial<Record<GardenVariant, Palette[]>> = {
    mixed: [
        {
            petalLight: "#ffd6e6",
            petalDark: "#ff6f9f",
            petalMid: "#ff8fb6",
            glow: "#ff7eb6",
        },
        {
            petalLight: "#efe4ff",
            petalDark: "#9b7be8",
            petalMid: "#b89cf5",
            glow: "#b993ff",
        },
        {
            petalLight: "#fff4c2",
            petalDark: "#f0a72b",
            petalMid: "#f7c45a",
            glow: "#ffc94d",
        },
    ],
};

const PALETTE_VARIABLES: Record<keyof Palette, string> = {
    petalLight: "--ng-petal-light",
    petalDark: "--ng-petal-dark",
    petalMid: "--ng-petal-mid",
    glow: "--ng-glow",
    stemDark: "--ng-stem-dark",
    stemSoft: "--ng-stem-soft",
    stemLight: "--ng-stem-light",
    spark1: "--ng-spark-1",
    spark2: "--ng-spark-2",
    center1: "--ng-center-1",
    center2: "--ng-center-2",
    leaf: "--ng-leaf",
    leafDeep: "--ng-leaf-deep",
    leafBright: "--ng-leaf-bright",
    grass: "--ng-grass",
};

function paletteStyle(palette: Palette | undefined): CSSProperties {
    return Object.fromEntries(
        Object.entries(palette ?? {}).map(([key, value]) => [
            PALETTE_VARIABLES[key as keyof Palette],
            value,
        ]),
    ) as CSSProperties;
}

/** Stem leaves per flower, matching the original scene. */
const FLOWER_STEM_LEAVES = [6, 4, 4];

/** Grow delays (seconds) for the leaves of each long grass blade. */
const LONG_GRASS_DELAYS = [
    [3, 2.2, 3.4, 3.6],
    [3.6, 3.8, 4, 4.2],
    [4, 4.2, 4.4, 4.6],
    [4, 4.2, 3, 3.6],
    [4, 4.2, 3, 3.6],
    [4, 4.2, 3, 3.6],
    [4.2, 4.4, 4.6, 4.8],
    [3, 3.2, 3.5, 3.6],
];

function range(count: number): number[] {
    return Array.from({ length: count }, (_, index) => index + 1);
}

function Grow({ delay, children }: { delay: number; children: ReactNode }) {
    return (
        <div
            className="grow-ans"
            style={{ "--d": `${delay}s` } as CSSProperties}
        >
            {children}
        </div>
    );
}

function Flower({
    index,
    stemLeaves,
    palette,
}: {
    index: number;
    stemLeaves: number;
    palette?: Palette;
}) {
    return (
        <div
            className={`flower flower--${index}`}
            style={paletteStyle(palette)}
        >
            <div className={`flower__leafs flower__leafs--${index}`}>
                {range(4).map((leaf) => (
                    <div
                        key={leaf}
                        className={`flower__leaf flower__leaf--${leaf}`}
                    />
                ))}
                <div className="flower__white-circle" />
                {range(8).map((light) => (
                    <div
                        key={light}
                        className={`flower__light flower__light--${light}`}
                    />
                ))}
            </div>
            <div className="flower__line">
                {range(stemLeaves).map((leaf) => (
                    <div
                        key={leaf}
                        className={`flower__line__leaf flower__line__leaf--${leaf}`}
                    />
                ))}
            </div>
        </div>
    );
}

function Grass({ index }: { index: number }) {
    return (
        <div className="growing-grass">
            <div className={`flower__grass flower__grass--${index}`}>
                <div className="flower__grass--top" />
                <div className="flower__grass--bottom" />
                {range(8).map((leaf) => (
                    <div
                        key={leaf}
                        className={`flower__grass__leaf flower__grass__leaf--${leaf}`}
                    />
                ))}
                <div className="flower__grass__overlay" />
            </div>
        </div>
    );
}

function GardenScene({ variant }: { variant: GardenVariant }) {
    return (
        <div className="flowers">
            {FLOWER_STEM_LEAVES.map((stemLeaves, index) => (
                <Flower
                    key={index}
                    index={index + 1}
                    stemLeaves={stemLeaves}
                    palette={FLOWER_PALETTES[variant]?.[index]}
                />
            ))}

            <Grow delay={1.2}>
                <div className="flower__g-long">
                    <div className="flower__g-long__top" />
                    <div className="flower__g-long__bottom" />
                </div>
            </Grow>

            <Grass index={1} />
            <Grass index={2} />

            <Grow delay={2.4}>
                <div className="flower__g-right flower__g-right--1">
                    <div className="leaf" />
                </div>
            </Grow>
            <Grow delay={2.8}>
                <div className="flower__g-right flower__g-right--2">
                    <div className="leaf" />
                </div>
            </Grow>

            <Grow delay={2.8}>
                <div className="flower__g-front">
                    {range(8).map((leaf) => (
                        <div
                            key={leaf}
                            className={`flower__g-front__leaf-wrapper flower__g-front__leaf-wrapper--${leaf}`}
                        >
                            <div className="flower__g-front__leaf" />
                        </div>
                    ))}
                    <div className="flower__g-front__line" />
                </div>
            </Grow>

            <Grow delay={3.2}>
                <div className="flower__g-fr">
                    <div className="leaf" />
                    {range(8).map((leaf) => (
                        <div
                            key={leaf}
                            className={`flower__g-fr__leaf flower__g-fr__leaf--${leaf}`}
                        />
                    ))}
                </div>
            </Grow>

            {LONG_GRASS_DELAYS.map((delays, blade) => (
                <div key={blade} className={`long-g long-g--${blade}`}>
                    {delays.map((delay, leaf) => (
                        <Grow key={leaf} delay={delay}>
                            <div className={`leaf leaf--${leaf}`} />
                        </Grow>
                    ))}
                </div>
            ))}
        </div>
    );
}

/** Petals and little blossoms that drift down once the garden has bloomed. */
const PETAL_DROPS = Array.from({ length: 28 }, (_, index) => ({
    left: `${(index * 37 + 5) % 100}%`,
    size: 10 + ((index * 7) % 12),
    delay: 4.5 + ((index * 0.83) % 9),
    duration: 7 + ((index * 3) % 6),
    drift: ((index * 29) % 120) - 60,
    spin: index % 2 === 0 ? 540 : -540,
    blossom: index % 3 === 0,
}));

/** Slots for falling photos; each one shows a page photo in turn. */
const PHOTO_DROPS = Array.from({ length: 9 }, (_, index) => ({
    left: `${4 + ((index * 41) % 84)}%`,
    delay: 5.5 + index * 1.7,
    duration: 11 + (index % 4) * 1.5,
    tilt: ((index * 17) % 30) - 15,
    drift: ((index * 31) % 80) - 40,
}));

function fallStyle(drop: {
    left: string;
    delay: number;
    duration: number;
    drift: number;
    spin: number;
    tilt?: number;
}): CSSProperties {
    return {
        left: drop.left,
        "--ng-fall-delay": `${drop.delay}s`,
        "--ng-fall-duration": `${drop.duration}s`,
        "--ng-fall-drift": `${drop.drift}px`,
        "--ng-fall-spin": `${drop.spin}deg`,
        "--ng-tilt": `${drop.tilt ?? 0}deg`,
    } as CSSProperties;
}

function Blossom({ size }: { size: number }) {
    return (
        <svg viewBox="-12 -12 24 24" width={size * 1.4} height={size * 1.4}>
            {[0, 72, 144, 216, 288].map((angle) => (
                <ellipse
                    key={angle}
                    cx={0}
                    cy={-5.5}
                    rx={3.6}
                    ry={5.5}
                    transform={`rotate(${angle})`}
                    fill="var(--ng-petal-light)"
                    stroke="var(--ng-petal-dark)"
                    strokeWidth={0.6}
                />
            ))}
            <circle r={2.6} fill="var(--ng-center-2)" />
        </svg>
    );
}

/**
 * Rain over the garden: falling petals and blossoms, and the page photos
 * dropping like polaroids. Tapping a falling photo opens it.
 */
function FlowerRain({
    rain,
    photoLayer,
}: {
    rain: GardenOptions["rain"];
    photoLayer: PhotoRainLayer;
}) {
    const { photos, openPhoto } = useExperience();
    const showPetals = rain === "petals" || rain === "both";
    const showPhotos = rain === "photos" || rain === "both";

    return (
        <>
            <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
                {showPetals &&
                    PETAL_DROPS.map((drop, index) => (
                        <span
                            key={`petal-${index}`}
                            className="ng-fall absolute top-0"
                            style={fallStyle(drop)}
                            aria-hidden
                        >
                            {drop.blossom ? (
                                <Blossom size={drop.size} />
                            ) : (
                                <span
                                    className="ng-petal block"
                                    style={{
                                        width: drop.size,
                                        height: drop.size * 1.35,
                                    }}
                                />
                            )}
                        </span>
                    ))}
            </div>
            <div
                className={cn(
                    "pointer-events-none absolute inset-0 overflow-hidden",
                    photoLayer === "front" ? "z-[5]" : "z-0",
                )}
            >
                {showPhotos &&
                    PHOTO_DROPS.map((drop, index) => {
                        const url = photos[index % photos.length];

                        if (!url) {
                            return (
                                <span
                                    key={`photo-${index}`}
                                    className="ng-fall ng-photo-drop absolute top-0"
                                    style={fallStyle({
                                        ...drop,
                                        spin: drop.tilt * 2,
                                    })}
                                    aria-hidden
                                >
                                    <span className="ng-photo-placeholder">
                                        <Heart
                                            className="size-1/3"
                                            fill="currentColor"
                                        />
                                    </span>
                                </span>
                            );
                        }

                        return (
                            <button
                                key={`photo-${index}`}
                                type="button"
                                onClick={() => openPhoto(url)}
                                className="ng-fall ng-photo-drop pointer-events-auto absolute top-0"
                                style={fallStyle({
                                    ...drop,
                                    spin: drop.tilt * 2,
                                })}
                                aria-label="Open photo"
                            >
                                <img
                                    src={url}
                                    alt=""
                                    loading="lazy"
                                    draggable={false}
                                />
                            </button>
                        );
                    })}
            </div>
        </>
    );
}

/**
 * Owner-only switch for whether the raining photos fall in front of the
 * flowers or behind them. Saved like any other inline edit.
 */
function PhotoLayerSwitch({ layer }: { layer: PhotoRainLayer }) {
    const { saveText } = useExperience();
    const [saving, setSaving] = useState(false);

    const choose = async (value: PhotoRainLayer) => {
        if (value === layer || saving) {
            return;
        }

        setSaving(true);
        await saveText("photo_rain_layer", value);
        setSaving(false);
    };

    return (
        <div
            className="absolute top-4 left-4 z-30 flex items-center gap-1 rounded-full border border-white/20 bg-black/60 p-1 text-xs text-white/80 backdrop-blur"
            role="radiogroup"
            aria-label="Raining photos"
        >
            <ImageIcon className="mx-1.5 size-3.5" aria-hidden />
            {(
                [
                    ["front", "In front"],
                    ["back", "Behind flowers"],
                ] as const
            ).map(([value, label]) => (
                <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={layer === value}
                    disabled={saving}
                    onClick={() => choose(value)}
                    className={cn(
                        "rounded-full px-3 py-1 transition-colors disabled:opacity-60",
                        layer === value
                            ? "bg-[var(--ng-petal-light)] text-black"
                            : "hover:text-white",
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

/**
 * Glowing flowers that grow and bloom in a night garden, with the
 * recipient's name, headline and flower note above, and optionally petals
 * and photos raining down. The animation stays on its first frame until
 * the opening gate is gone and the garden is on screen.
 */
export function NightGarden({ options }: { options: GardenOptions }) {
    const { variant, rain } = options;
    const { experience, opened, editable } = useExperience();
    const photoLayer = experience.photo_rain_layer ?? "front";
    const hasPhotoRain = rain === "photos" || rain === "both";
    const stageRef = useRef<HTMLElement>(null);
    const [inView, setInView] = useState(false);
    const [cycle, setCycle] = useState(0);

    useEffect(() => {
        const element = stageRef.current;

        if (!element || typeof IntersectionObserver === "undefined") {
            setInView(true);

            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.25 },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return (
        <section
            ref={stageRef}
            className={cn(
                "ng-stage relative overflow-hidden text-center text-white",
                opened && inView && "is-playing",
            )}
            style={paletteStyle(PALETTES[variant])}
        >
            <div
                key={`text-${cycle}`}
                className="relative z-20 mx-auto max-w-xl px-5 pt-14"
            >
                {experience.recipient_name && (
                    <p
                        className="ng-text text-xs font-semibold tracking-[0.35em] text-[var(--ng-petal-light)] uppercase"
                        style={{ "--ng-text-delay": "0.4s" } as CSSProperties}
                    >
                        <EditableText
                            field="recipient_name"
                            value={experience.recipient_name}
                            placeholder="Add their name"
                            label="Their name"
                        >
                            For {experience.recipient_name}
                        </EditableText>
                    </p>
                )}
                <h1
                    className="ng-text mt-3 font-script text-5xl leading-[1.05] drop-shadow-[0_0_18px_var(--ng-glow)] sm:text-7xl"
                    style={{ "--ng-text-delay": "0.8s" } as CSSProperties}
                >
                    <EditableText
                        field="title"
                        value={experience.title}
                        placeholder="Add a headline"
                        label="Headline"
                    />
                </h1>
                <div
                    className="ng-text"
                    style={{ "--ng-text-delay": "4.6s" } as CSSProperties}
                >
                    <EditableText
                        block
                        multiline
                        field="flowers_note"
                        value={experience.flowers_note}
                        placeholder="Add a note for your flowers"
                        label="Flower note"
                        className="mt-4 font-display text-lg leading-relaxed text-white/75 italic sm:text-xl"
                    />
                </div>
            </div>

            <div key={`scene-${cycle}`} className="ng-scene z-[1]">
                <div className="night" />
                <GardenScene variant={variant} />
            </div>

            {rain !== "none" && (
                <FlowerRain
                    key={`rain-${cycle}`}
                    rain={rain}
                    photoLayer={photoLayer}
                />
            )}

            {editable && hasPhotoRain && (
                <PhotoLayerSwitch layer={photoLayer} />
            )}

            <button
                type="button"
                onClick={() => setCycle((value) => value + 1)}
                className="ng-text absolute right-4 bottom-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs tracking-[0.2em] text-white/70 uppercase backdrop-blur transition-colors hover:text-white"
                style={{ "--ng-text-delay": "5.5s" } as CSSProperties}
                aria-label="Let the flowers bloom again"
            >
                <RotateCcw className="size-3.5" /> Bloom again
            </button>
        </section>
    );
}
