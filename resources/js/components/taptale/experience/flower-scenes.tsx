import { RotateCcw } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ComponentType, CSSProperties, RefObject } from 'react';
import '../../../../css/flower-scenes.css';
import type { SceneStyle } from '@/components/taptale/experience/config';
import { FallingFlowers } from '@/components/taptale/experience/night-garden';
import {
    EditableText,
    useExperience,
} from '@/components/taptale/experience/shared';
import { cn } from '@/lib/utils';
import type { FlowerRain } from '@/types';

/** Rain colors (the --ng-* variables FallingFlowers reads) per scene. */
function rainColors(
    light: string,
    dark: string,
    mid: string,
    glow: string,
    center: string,
): CSSProperties {
    return {
        '--ng-petal-light': light,
        '--ng-petal-dark': dark,
        '--ng-petal-mid': mid,
        '--ng-glow': glow,
        '--ng-center-2': center,
    } as CSSProperties;
}

const SCENES: Record<SceneStyle, { colors: CSSProperties; backdrop: string }> =
    {
        lotus: {
            colors: rainColors(
                '#ffe3f0',
                '#ff7fb0',
                '#ffb3d1',
                '#ff9cc8',
                '#ffd36b',
            ),
            backdrop:
                'radial-gradient(70% 45% at 50% 68%, rgb(255 140 190 / 0.28), transparent 70%), radial-gradient(120% 80% at 50% 0%, #1a0f24, #07040b)',
        },
        heart: {
            colors: rainColors(
                '#ffd6e6',
                '#ff4f8b',
                '#ff8fb6',
                '#ff7eb6',
                '#ffd000',
            ),
            backdrop:
                'radial-gradient(70% 50% at 50% 45%, rgb(255 120 170 / 0.18), transparent 70%), #0b0a12',
        },
        crimson: {
            colors: rainColors(
                '#ffb3c1',
                '#c8102e',
                '#e5384f',
                '#ff3d5a',
                '#ffd36b',
            ),
            backdrop:
                'radial-gradient(60% 50% at 50% 50%, rgb(210 20 60 / 0.4), transparent 72%), linear-gradient(180deg, #1a0309, #0c0105)',
        },
    };

function delay(seconds: number): CSSProperties {
    return { '--fs-delay': `${seconds}s` } as CSSProperties;
}

/** A pointed petal standing on (0, 0), tip up. */
function petalPath(length: number, width: number): string {
    return `M0 0 C ${-width} ${-length * 0.35} ${-width * 0.75} ${-length * 0.82} 0 ${-length} C ${width * 0.75} ${-length * 0.82} ${width} ${-length * 0.35} 0 0 Z`;
}

const STARS = Array.from({ length: 26 }, (_, index) => ({
    left: `${(index * 37 + 11) % 100}%`,
    top: `${(index * 53 + 7) % 70}%`,
    size: 1 + (index % 3),
    delay: (index * 0.41) % 3,
}));

/* ------------------------------------------------------------------ Lotus */

const LOTUS_ROWS = [
    { angles: [-100, 100], length: 86, width: 28, delay: 0.4, opacity: 0.55 },
    {
        angles: [-78, -54, -30, 30, 54, 78],
        length: 118,
        width: 30,
        delay: 0.8,
        opacity: 0.75,
    },
    {
        angles: [-42, -14, 14, 42],
        length: 130,
        width: 32,
        delay: 1.4,
        opacity: 0.9,
    },
    { angles: [-24, 0, 24], length: 116, width: 34, delay: 2, opacity: 1 },
];

const LOTUS_SWIRLS = [
    'M200 252 C 140 252 92 232 72 192 C 58 162 72 132 102 138',
    'M200 252 C 260 252 308 232 328 192 C 342 162 328 132 298 138',
    'M126 118 C 142 64 176 40 200 28',
    'M274 118 C 258 64 224 40 200 28',
];

function LotusArt() {
    const id = useId().replace(/:/g, '');

    return (
        <svg viewBox="0 0 400 300" className="h-auto w-full overflow-visible">
            <defs>
                <linearGradient id={`${id}-petal`} x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stopColor="#ff5f9e" />
                    <stop offset="0.55" stopColor="#ffb8d6" />
                    <stop offset="1" stopColor="#fff6fb" />
                </linearGradient>
                <radialGradient id={`${id}-core`}>
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="0.4" stopColor="#ffe2a8" />
                    <stop offset="1" stopColor="#ff9cc8" stopOpacity="0" />
                </radialGradient>
                <filter
                    id={`${id}-glow`}
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                >
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {[60, 110, 160].map((radius, index) => (
                <ellipse
                    key={radius}
                    className="fs-pulse"
                    style={delay(index * 0.8)}
                    cx={200}
                    cy={262}
                    rx={radius}
                    ry={6 + index * 6}
                    fill="none"
                    stroke="#ff9cc8"
                    strokeOpacity={0.3}
                />
            ))}

            {LOTUS_SWIRLS.map((d, index) => (
                <path
                    key={d}
                    className="fs-draw"
                    style={delay(2.4 + index * 0.2)}
                    d={d}
                    pathLength={1}
                    fill="none"
                    stroke="#ffcf8a"
                    strokeOpacity={0.65}
                    strokeWidth={1.2}
                    strokeLinecap="round"
                />
            ))}

            <ellipse
                className="fs-pulse"
                cx={200}
                cy={200}
                rx={110}
                ry={70}
                fill="#ff7fb0"
                opacity={0.25}
                filter={`url(#${id}-glow)`}
            />

            <g filter={`url(#${id}-glow)`}>
                {LOTUS_ROWS.map((row) =>
                    row.angles.map((angle, index) => (
                        <g
                            key={`${row.length}-${angle}`}
                            transform={`translate(200 248) rotate(${angle})`}
                        >
                            <g
                                className="fs-grow"
                                style={delay(row.delay + index * 0.08)}
                                opacity={row.opacity}
                            >
                                <path
                                    d={petalPath(row.length, row.width)}
                                    fill={`url(#${id}-petal)`}
                                    stroke="#ffe0ee"
                                    strokeOpacity={0.8}
                                />
                                <path
                                    d={`M0 -8 L0 ${-row.length * 0.78}`}
                                    stroke="#ffffff"
                                    strokeOpacity={0.35}
                                />
                            </g>
                        </g>
                    )),
                )}
                <circle
                    className="fs-pulse"
                    style={delay(2.6)}
                    cx={200}
                    cy={222}
                    r={30}
                    fill={`url(#${id}-core)`}
                />
            </g>
        </svg>
    );
}

/* ---------------------------------------------------------- Heart bouquet */

const BLOSSOM_COLORS = [
    '#ff4f8b',
    '#ffd23f',
    '#4fa8ff',
    '#b38cff',
    '#ffffff',
    '#ff7a3d',
    '#ff9ccf',
    '#e8364f',
];

/** Five round petals around (0, 0), for a blossom one unit across. */
const BLOSSOM_PATH = [0, 72, 144, 216, 288]
    .map((degrees) => {
        const radians = ((degrees - 90) * Math.PI) / 180;
        const x = Math.cos(radians) * 0.55;
        const y = Math.sin(radians) * 0.55;

        return `M${(x - 0.48).toFixed(3)} ${y.toFixed(3)}a0.48 0.48 0 1 0 0.96 0a0.48 0.48 0 1 0 -0.96 0`;
    })
    .join('');

/** Blossoms filling the heart (x² + y² − 1)³ ≤ x²y³, blooming outwards. */
const HEART_BLOSSOMS = (() => {
    const blossoms: {
        x: number;
        y: number;
        size: number;
        rotate: number;
        color: string;
        delay: number;
    }[] = [];
    const step = 0.2;

    for (let row = 0; row * step <= 2.5; row++) {
        const y = 1.3 - row * step;

        for (let column = 0; column * step <= 2.8; column++) {
            const x = -1.4 + column * step + (row % 2) * (step / 2);

            if ((x * x + y * y - 1) ** 3 - x * x * y ** 3 > 0) {
                continue;
            }

            const index = blossoms.length;

            blossoms.push({
                x: 200 + x * 95,
                y: 150 - y * 95,
                size: 10 + ((index * 7) % 5),
                rotate: (index * 37) % 72,
                color: BLOSSOM_COLORS[(index * 5) % BLOSSOM_COLORS.length],
                delay: 1 + Math.hypot(x, y - 0.2) * 1.4,
            });
        }
    }

    return blossoms;
})();

const HEART_STEMS = [
    'M168 214 C 178 250 192 272 200 292',
    'M184 228 C 190 256 196 276 200 292',
    'M200 240 C 200 262 200 278 200 292',
    'M216 228 C 210 256 204 276 200 292',
    'M232 214 C 222 250 208 272 200 292',
    'M200 292 C 192 306 186 320 182 334',
    'M200 292 C 200 308 200 322 200 336',
    'M200 292 C 208 306 214 320 218 334',
];

function HeartBouquetArt() {
    return (
        <svg viewBox="0 0 400 350" className="h-auto w-full overflow-visible">
            {HEART_STEMS.map((d, index) => (
                <path
                    key={d}
                    className="fs-draw"
                    style={delay(0.2 + index * 0.05)}
                    d={d}
                    pathLength={1}
                    fill="none"
                    stroke="#3fa66a"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                />
            ))}

            {[
                [176, 250, -40],
                [224, 250, 40],
                [188, 318, -25],
                [212, 318, 25],
            ].map(([x, y, angle], index) => (
                <g
                    key={index}
                    transform={`translate(${x} ${y}) rotate(${angle})`}
                >
                    <ellipse
                        className="fs-pop"
                        style={delay(0.8 + index * 0.1)}
                        rx={5}
                        ry={13}
                        fill="#2f8f58"
                    />
                </g>
            ))}

            <g className="fs-sway">
                {HEART_BLOSSOMS.map((blossom, index) => (
                    <g
                        key={index}
                        transform={`translate(${blossom.x.toFixed(1)} ${blossom.y.toFixed(1)}) rotate(${blossom.rotate}) scale(${blossom.size})`}
                    >
                        <g className="fs-pop" style={delay(blossom.delay)}>
                            <path d={BLOSSOM_PATH} fill={blossom.color} />
                            <circle
                                r={0.24}
                                fill={
                                    blossom.color === '#ffd23f'
                                        ? '#ff7a3d'
                                        : '#ffd23f'
                                }
                            />
                        </g>
                    </g>
                ))}
            </g>

            <g className="fs-pop" style={delay(0.5)}>
                <path
                    d="M200 292 C 170 266 146 278 156 296 C 164 310 186 302 200 292 Z"
                    fill="#ff5fa2"
                    stroke="#ffc2dc"
                />
                <path
                    d="M200 292 C 230 266 254 278 244 296 C 236 310 214 302 200 292 Z"
                    fill="#ff5fa2"
                    stroke="#ffc2dc"
                />
                <path
                    d="M196 296 L 180 334 L 190 330 L 199 300 Z"
                    fill="#ff4f93"
                />
                <path
                    d="M204 296 L 220 334 L 210 330 L 201 300 Z"
                    fill="#ff4f93"
                />
                <circle
                    cx={200}
                    cy={293}
                    r={7}
                    fill="#ff7ab8"
                    stroke="#ffc2dc"
                />
            </g>
        </svg>
    );
}

/* -------------------------------------------------------- Crimson blossom */

const CRIMSON_LEAVES = [300, 264, 228];

const CRIMSON_STREAKS = [
    { x: 46, height: 150, y: 120 },
    { x: 96, height: 110, y: 60 },
    { x: 304, height: 130, y: 90 },
    { x: 352, height: 170, y: 140 },
    { x: 140, height: 90, y: 220 },
];

const RISING_HEARTS = Array.from({ length: 14 }, (_, index) => ({
    left: `${(index * 29 + 6) % 94}%`,
    size: 8 + ((index * 5) % 11),
    delay: (index * 0.9) % 9,
    duration: 8 + (index % 5),
    drift: ((index * 23) % 60) - 30,
    color: index % 3 === 0 ? '#ff8fa8' : '#e5384f',
}));

function CrimsonArt() {
    const id = useId().replace(/:/g, '');

    return (
        <>
            <svg
                viewBox="0 0 400 360"
                className="h-auto w-full overflow-visible"
            >
                <defs>
                    <linearGradient
                        id={`${id}-outer`}
                        x1="0"
                        y1="1"
                        x2="0"
                        y2="0"
                    >
                        <stop offset="0" stopColor="#b0102e" />
                        <stop offset="1" stopColor="#ff8fa8" />
                    </linearGradient>
                    <linearGradient
                        id={`${id}-inner`}
                        x1="0"
                        y1="1"
                        x2="0"
                        y2="0"
                    >
                        <stop offset="0" stopColor="#ff4d73" />
                        <stop offset="1" stopColor="#ffd0db" />
                    </linearGradient>
                    <linearGradient
                        id={`${id}-leaf`}
                        x1="0"
                        y1="1"
                        x2="1"
                        y2="0"
                    >
                        <stop offset="0" stopColor="#7a0c28" />
                        <stop offset="1" stopColor="#e03a64" />
                    </linearGradient>
                    <linearGradient
                        id={`${id}-streak`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop offset="0" stopColor="#ff3d5a" stopOpacity="0" />
                        <stop
                            offset="0.5"
                            stopColor="#ff3d5a"
                            stopOpacity="0.6"
                        />
                        <stop offset="1" stopColor="#ff3d5a" stopOpacity="0" />
                    </linearGradient>
                    <filter
                        id={`${id}-glow`}
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                    >
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {CRIMSON_STREAKS.map((streak, index) => (
                    <rect
                        key={streak.x}
                        className="fs-twinkle"
                        style={delay(index * 0.7)}
                        x={streak.x}
                        y={streak.y}
                        width={2}
                        height={streak.height}
                        fill={`url(#${id}-streak)`}
                    />
                ))}

                <g className="fs-sway">
                    <path
                        className="fs-draw"
                        style={delay(0.2)}
                        d="M200 345 C 194 290 206 236 200 150"
                        pathLength={1}
                        fill="none"
                        stroke="#c8325a"
                        strokeWidth={3}
                        strokeLinecap="round"
                    />

                    {CRIMSON_LEAVES.map((y, index) =>
                        [-1, 1].map((side) => (
                            <path
                                key={`${y}-${side}`}
                                className="fs-pop"
                                style={delay(0.9 + index * 0.25)}
                                d={`M200 ${y} C ${200 + side * 30} ${y - 6} ${200 + side * 55} ${y - 26} ${200 + side * 64} ${y - 50} C ${200 + side * 40} ${y - 36} ${200 + side * 20} ${y - 22} 200 ${y} Z`}
                                fill={`url(#${id}-leaf)`}
                                opacity={0.9}
                            />
                        )),
                    )}

                    <g filter={`url(#${id}-glow)`}>
                        {Array.from({ length: 8 }, (_, index) => (
                            <g
                                key={`outer-${index}`}
                                transform={`translate(200 140) rotate(${index * 45})`}
                            >
                                <path
                                    className="fs-grow"
                                    style={delay(1.8 + index * 0.06)}
                                    d={petalPath(54, 17)}
                                    fill={`url(#${id}-outer)`}
                                />
                            </g>
                        ))}
                        {Array.from({ length: 8 }, (_, index) => (
                            <g
                                key={`inner-${index}`}
                                transform={`translate(200 140) rotate(${index * 45 + 22.5})`}
                            >
                                <path
                                    className="fs-grow"
                                    style={delay(2.3 + index * 0.06)}
                                    d={petalPath(34, 12)}
                                    fill={`url(#${id}-inner)`}
                                />
                            </g>
                        ))}
                        <circle
                            className="fs-pulse"
                            style={delay(2.8)}
                            cx={200}
                            cy={140}
                            r={9}
                            fill="#ffd36b"
                        />
                    </g>
                </g>
            </svg>

            <div
                className="pointer-events-none absolute inset-x-0 bottom-0"
                aria-hidden
            >
                {RISING_HEARTS.map((heart, index) => (
                    <svg
                        key={index}
                        viewBox="0 0 24 22"
                        width={heart.size}
                        height={heart.size}
                        className="fs-rise absolute bottom-0"
                        style={
                            {
                                left: heart.left,
                                '--fs-delay': `${3 + heart.delay}s`,
                                '--fs-duration': `${heart.duration}s`,
                                '--fs-drift': `${heart.drift}px`,
                            } as CSSProperties
                        }
                    >
                        <path
                            d="M12 21s-9-5.6-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.4-9 12-9 12z"
                            fill={heart.color}
                        />
                    </svg>
                ))}
            </div>
        </>
    );
}

const ART: Record<SceneStyle, ComponentType> = {
    lotus: LotusArt,
    heart: HeartBouquetArt,
    crimson: CrimsonArt,
};

function useInView(ref: RefObject<HTMLElement | null>): boolean {
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const element = ref.current;

        if (!element || typeof IntersectionObserver === 'undefined') {
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
    }, [ref]);

    return inView;
}

/**
 * A glowing lotus, a heart-shaped bouquet tied with a bow, or a single
 * crimson blossom with hearts floating up: the recipient's name, headline
 * and flower note on top, and optionally petals and photos raining down.
 * The animation waits for the opening gate and for the scene to be seen.
 */
export function FlowerScene({
    style,
    rain,
    isAddon = false,
}: {
    style: SceneStyle;
    rain: FlowerRain;
    /** Added to another design, so its headline stays in the page hero. */
    isAddon?: boolean;
}) {
    const { experience, opened } = useExperience();
    const stageRef = useRef<HTMLElement>(null);
    const inView = useInView(stageRef);
    const [cycle, setCycle] = useState(0);
    const scene = SCENES[style];
    const Art = ART[style];

    return (
        <section
            ref={stageRef}
            className={cn(
                'fs-stage relative overflow-hidden pb-20 text-center text-white',
                opened && inView && 'is-playing',
            )}
            style={{ ...scene.colors, background: scene.backdrop }}
        >
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                {STARS.map((star, index) => (
                    <span
                        key={index}
                        className="fs-twinkle absolute rounded-full bg-white"
                        style={{
                            left: star.left,
                            top: star.top,
                            width: star.size,
                            height: star.size,
                            ...delay(star.delay),
                        }}
                    />
                ))}
            </div>

            <div
                key={`text-${cycle}`}
                className="relative z-20 mx-auto max-w-xl px-5 pt-14"
            >
                {experience.recipient_name && (
                    <p
                        className="fs-text text-xs font-semibold tracking-[0.35em] text-[var(--ng-petal-light)] uppercase"
                        style={delay(0.4)}
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
                    className="fs-text mt-3 font-script text-5xl leading-[1.05] drop-shadow-[0_0_18px_var(--ng-glow)] sm:text-7xl"
                    style={delay(0.8)}
                >
                    {isAddon ? (
                        'Flowers for you'
                    ) : (
                        <EditableText
                            field="title"
                            value={experience.title}
                            placeholder="Add a headline"
                            label="Headline"
                        />
                    )}
                </h1>
                <div className="fs-text" style={delay(3.6)}>
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

            <div
                key={`art-${cycle}`}
                className="relative z-[1] mx-auto mt-6 w-full max-w-md px-4"
            >
                <Art />
            </div>

            <FallingFlowers
                key={`rain-${cycle}`}
                rain={rain}
                photoLayer={experience.photo_rain_layer ?? 'front'}
            />

            <button
                type="button"
                onClick={() => setCycle((value) => value + 1)}
                className="fs-text absolute right-4 bottom-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs tracking-[0.2em] text-white/70 uppercase backdrop-blur transition-colors hover:text-white"
                style={delay(4.5)}
                aria-label="Let the flowers bloom again"
            >
                <RotateCcw className="size-3.5" /> Bloom again
            </button>
        </section>
    );
}
