import { RotateCcw } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
    EditableText,
    useExperience,
} from '@/components/taptale/experience/shared';
import { cn } from '@/lib/utils';

type Point = { x: number; y: number };

type FlowerKind = 'rose' | 'tulip' | 'daisy';

type Flower = {
    kind: FlowerKind;
    tip: Point;
    control: Point;
    color: string;
    size: number;
};

/** Where every stem gathers inside the paper wrap. */
const GATHER: Point = { x: 200, y: 440 };

const FLOWERS: Flower[] = [
    {
        kind: 'daisy',
        tip: { x: 92, y: 262 },
        control: { x: 158, y: 360 },
        color: '#FFF5F7',
        size: 30,
    },
    {
        kind: 'daisy',
        tip: { x: 310, y: 258 },
        control: { x: 246, y: 360 },
        color: '#E6D4FF',
        size: 30,
    },
    {
        kind: 'tulip',
        tip: { x: 128, y: 196 },
        control: { x: 172, y: 320 },
        color: '#FF9EB8',
        size: 30,
    },
    {
        kind: 'tulip',
        tip: { x: 274, y: 190 },
        control: { x: 230, y: 320 },
        color: '#FFB38A',
        size: 30,
    },
    {
        kind: 'daisy',
        tip: { x: 150, y: 112 },
        control: { x: 186, y: 290 },
        color: '#FFD6E0',
        size: 24,
    },
    {
        kind: 'rose',
        tip: { x: 248, y: 120 },
        control: { x: 214, y: 290 },
        color: '#FF8FA3',
        size: 27,
    },
    {
        kind: 'rose',
        tip: { x: 200, y: 160 },
        control: { x: 196, y: 310 },
        color: '#F2557F',
        size: 36,
    },
];

const SPRIGS: Point[] = [
    { x: 64, y: 196 },
    { x: 338, y: 186 },
    { x: 202, y: 70 },
];

const FIREFLIES = Array.from({ length: 14 }, (_, index) => ({
    left: `${(index * 29 + 7) % 96}%`,
    bottom: `${(index * 17) % 45}%`,
    drift: `${((index * 23) % 60) - 30}px`,
    delay: `${2 + ((index * 0.7) % 6)}s`,
    duration: `${6 + (index % 5)}s`,
}));

const STARS = Array.from({ length: 24 }, (_, index) => ({
    left: `${(index * 41 + 3) % 100}%`,
    top: `${(index * 13) % 40}%`,
    size: index % 4 === 0 ? 3 : 2,
    delay: `${(index * 0.4) % 4}s`,
}));

/** Seconds before the first stem starts growing (the wrap rises first). */
const STEM_START = 0.7;

/**
 * Point on a quadratic bezier curve at t (0 = start, 1 = end).
 */
function pointOnCurve(
    start: Point,
    control: Point,
    end: Point,
    t: number,
): Point {
    const inverse = 1 - t;

    return {
        x:
            inverse * inverse * start.x +
            2 * inverse * t * control.x +
            t * t * end.x,
        y:
            inverse * inverse * start.y +
            2 * inverse * t * control.y +
            t * t * end.y,
    };
}

/**
 * Direction (in degrees) of a quadratic bezier curve at t.
 */
function angleOnCurve(
    start: Point,
    control: Point,
    end: Point,
    t: number,
): number {
    const dx =
        2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x);
    const dy =
        2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y);

    return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Mix a hex color with black (amount > 0) or white (amount < 0).
 */
function shade(hex: string, amount: number): string {
    const value = parseInt(hex.slice(1), 16);
    const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    const target = amount > 0 ? 0 : 255;
    const weight = Math.abs(amount);

    return `rgb(${channels
        .map((channel) => Math.round(channel + (target - channel) * weight))
        .join(' ')})`;
}

function delayStyle(seconds: number, origin?: string): CSSProperties {
    return {
        '--bq-delay': `${seconds.toFixed(2)}s`,
        ...(origin ? { '--bq-origin': origin } : {}),
    } as CSSProperties;
}

function Daisy({ flower, delay }: { flower: Flower; delay: number }) {
    const size = flower.size;

    return (
        <>
            {Array.from({ length: 12 }, (_, index) => (
                <g key={index} transform={`rotate(${index * 30})`}>
                    <ellipse
                        className="bq-pop"
                        style={delayStyle(delay + index * 0.05)}
                        cx={0}
                        cy={-size * 0.55}
                        rx={size * 0.17}
                        ry={size * 0.5}
                        fill={flower.color}
                        stroke={shade(flower.color, 0.12)}
                        strokeWidth={0.8}
                    />
                </g>
            ))}
            <circle
                className="bq-pop"
                style={delayStyle(delay + 0.5, '50% 50%')}
                r={size * 0.3}
                fill="#FFC94D"
                stroke="#E9A62B"
                strokeWidth={1}
            />
            {[0, 72, 144, 216, 288].map((angle) => (
                <circle
                    key={angle}
                    cx={Math.cos((angle * Math.PI) / 180) * size * 0.14}
                    cy={Math.sin((angle * Math.PI) / 180) * size * 0.14}
                    r={1.3}
                    fill="#C9861D"
                    className="bq-pop"
                    style={delayStyle(delay + 0.7, '50% 50%')}
                />
            ))}
        </>
    );
}

function Tulip({ flower, delay }: { flower: Flower; delay: number }) {
    const size = flower.size;
    const petal = `M0 0 C ${-size * 0.55} ${-size * 0.2}, ${-size * 0.48} ${-size * 1.05}, 0 ${-size * 1.25} C ${size * 0.48} ${-size * 1.05}, ${size * 0.55} ${-size * 0.2}, 0 0 Z`;

    return (
        <g transform={`translate(0 ${size * 0.45})`}>
            {[-26, 26].map((angle, index) => (
                <g key={angle} transform={`rotate(${angle})`}>
                    <path
                        className="bq-pop"
                        style={delayStyle(delay + index * 0.12)}
                        d={petal}
                        fill={shade(flower.color, 0.14)}
                    />
                </g>
            ))}
            <path
                className="bq-pop"
                style={delayStyle(delay + 0.3)}
                d={petal}
                fill={flower.color}
                stroke={shade(flower.color, 0.2)}
                strokeWidth={0.8}
            />
            <path
                d={`M0 ${-size * 0.15} L0 ${-size * 0.95}`}
                stroke={shade(flower.color, -0.35)}
                strokeWidth={1.2}
                strokeLinecap="round"
                opacity={0.6}
                className="bq-pop"
                style={delayStyle(delay + 0.5)}
            />
        </g>
    );
}

function Rose({ flower, delay }: { flower: Flower; delay: number }) {
    const size = flower.size;
    const layers = [
        { count: 6, distance: 0.42, radius: 0.46, tone: 0.18, offset: 0 },
        { count: 5, distance: 0.26, radius: 0.36, tone: 0.05, offset: 36 },
        { count: 4, distance: 0.12, radius: 0.26, tone: -0.08, offset: 10 },
    ];

    return (
        <>
            {layers.map((layer, layerIndex) =>
                Array.from({ length: layer.count }, (_, index) => {
                    const angle = (360 / layer.count) * index + layer.offset;

                    return (
                        <g
                            key={`${layerIndex}-${index}`}
                            transform={`rotate(${angle})`}
                        >
                            <circle
                                className="bq-pop"
                                style={delayStyle(
                                    delay + layerIndex * 0.25 + index * 0.04,
                                    '50% 100%',
                                )}
                                cx={0}
                                cy={-size * layer.distance}
                                r={size * layer.radius}
                                fill={shade(flower.color, layer.tone)}
                                stroke={shade(flower.color, 0.3)}
                                strokeWidth={0.7}
                            />
                        </g>
                    );
                }),
            )}
            <path
                className="bq-pop"
                style={delayStyle(delay + 0.9, '50% 50%')}
                d={`M0 0 m ${-size * 0.12} 0 a ${size * 0.12} ${size * 0.12} 0 1 1 ${size * 0.2} ${size * 0.06} a ${size * 0.2} ${size * 0.2} 0 1 1 ${-size * 0.34} ${-size * 0.16}`}
                fill="none"
                stroke={shade(flower.color, 0.4)}
                strokeWidth={1.4}
                strokeLinecap="round"
            />
        </>
    );
}

const HEADS: Record<FlowerKind, typeof Daisy> = {
    daisy: Daisy,
    tulip: Tulip,
    rose: Rose,
};

function BouquetSvg({ glowId }: { glowId: string }) {
    return (
        <svg
            viewBox="0 0 400 520"
            className="mx-auto w-full max-w-[26rem] overflow-visible"
            role="img"
            aria-label="A bouquet of roses, tulips and daisies blooming"
        >
            <defs>
                <filter
                    id={glowId}
                    x="-60%"
                    y="-60%"
                    width="220%"
                    height="220%"
                >
                    <feGaussianBlur stdDeviation="9" />
                </filter>
                <linearGradient id={`${glowId}-paper`} x1="0" x2="1">
                    <stop offset="0" stopColor="#F7DCCB" />
                    <stop offset="0.5" stopColor="#FBE9DD" />
                    <stop offset="1" stopColor="#EFCDB8" />
                </linearGradient>
            </defs>

            <g className="bq-sway">
                <path
                    className="bq-rise"
                    d="M112 300 L288 300 L216 498 L184 498 Z"
                    fill="#E9C3AE"
                />

                {SPRIGS.map((sprig, index) => {
                    const control = {
                        x: (sprig.x + GATHER.x) / 2,
                        y: sprig.y + 160,
                    };
                    const delay = STEM_START + 0.9 + index * 0.2;

                    return (
                        <g key={`sprig-${index}`}>
                            <path
                                className="bq-stem"
                                style={delayStyle(delay)}
                                pathLength={1}
                                d={`M${GATHER.x} ${GATHER.y} Q ${control.x} ${control.y} ${sprig.x} ${sprig.y}`}
                                stroke="#5C9A6E"
                                strokeWidth={1.5}
                                fill="none"
                            />
                            {Array.from({ length: 9 }, (_, dot) => (
                                <circle
                                    key={dot}
                                    className="bq-pop"
                                    style={delayStyle(
                                        delay + 1.4 + dot * 0.06,
                                        '50% 50%',
                                    )}
                                    cx={
                                        sprig.x +
                                        Math.cos(dot * 1.9) *
                                            (6 + (dot % 3) * 5)
                                    }
                                    cy={
                                        sprig.y +
                                        Math.sin(dot * 1.9) *
                                            (6 + (dot % 3) * 5)
                                    }
                                    r={2.4}
                                    fill="#FFFFFF"
                                />
                            ))}
                        </g>
                    );
                })}

                {FLOWERS.map((flower, index) => {
                    const stemDelay = STEM_START + index * 0.18;
                    const headDelay = stemDelay + 1.35;
                    const Head = HEADS[flower.kind];
                    const leaves = [0.42, 0.62].map((t, leafIndex) => {
                        const side = (index + leafIndex) % 2 === 0 ? 1 : -1;

                        return {
                            point: pointOnCurve(
                                GATHER,
                                flower.control,
                                flower.tip,
                                t,
                            ),
                            angle:
                                angleOnCurve(
                                    GATHER,
                                    flower.control,
                                    flower.tip,
                                    t,
                                ) +
                                side * 55,
                            delay: stemDelay + 0.6 + leafIndex * 0.2,
                        };
                    });

                    return (
                        <g key={index}>
                            <path
                                className="bq-stem"
                                style={delayStyle(stemDelay)}
                                pathLength={1}
                                d={`M${GATHER.x} ${GATHER.y} Q ${flower.control.x} ${flower.control.y} ${flower.tip.x} ${flower.tip.y}`}
                                stroke="#3F8A5A"
                                strokeWidth={3}
                                strokeLinecap="round"
                                fill="none"
                            />
                            {leaves.map((leaf, leafIndex) => (
                                <g
                                    key={leafIndex}
                                    transform={`translate(${leaf.point.x} ${leaf.point.y}) rotate(${leaf.angle})`}
                                >
                                    <path
                                        className="bq-pop"
                                        style={delayStyle(leaf.delay, '0% 50%')}
                                        d="M0 0 Q 14 -9 30 0 Q 14 9 0 0 Z"
                                        fill="#5DAA74"
                                        stroke="#3F8A5A"
                                        strokeWidth={0.8}
                                    />
                                </g>
                            ))}
                            <g
                                transform={`translate(${flower.tip.x} ${flower.tip.y})`}
                            >
                                <circle
                                    className="bq-glow"
                                    style={delayStyle(headDelay + 0.6)}
                                    r={flower.size * 1.1}
                                    fill={flower.color}
                                    filter={`url(#${glowId})`}
                                />
                                <g
                                    className="bq-head"
                                    style={delayStyle(headDelay)}
                                >
                                    <Head
                                        flower={flower}
                                        delay={headDelay + 0.1}
                                    />
                                </g>
                            </g>
                        </g>
                    );
                })}

                <g className="bq-rise">
                    <path
                        d="M98 328 Q200 372 302 328 L214 506 Q200 514 186 506 Z"
                        fill={`url(#${glowId}-paper)`}
                        stroke="#E2B9A2"
                        strokeWidth={1}
                    />
                    <path
                        d="M150 352 L196 500 M250 352 L204 500"
                        stroke="#E8C1AB"
                        strokeWidth={1}
                        opacity={0.8}
                    />
                    <path
                        d="M200 430 C 172 404, 150 420, 168 438 C 178 448, 192 440, 200 430 Z M200 430 C 228 404, 250 420, 232 438 C 222 448, 208 440, 200 430 Z"
                        fill="#D04A6B"
                    />
                    <path
                        d="M196 432 L180 478 M204 432 L222 476"
                        stroke="#D04A6B"
                        strokeWidth={5}
                        strokeLinecap="round"
                    />
                    <circle cx={200} cy={431} r={6} fill="#B33A59" />
                </g>
            </g>
        </svg>
    );
}

/**
 * A digital bouquet: the paper wrap rises, stems grow, leaves unfurl and
 * every flower blooms — then the note and sender fade in. The animation
 * waits for the opening gate so the recipient sees it from the start.
 */
export function BloomingBouquet() {
    const { experience, opened } = useExperience();
    const glowId = `bq-${useId().replace(/:/g, '')}`;
    const sectionRef = useRef<HTMLElement>(null);
    const [inView, setInView] = useState(false);
    const [cycle, setCycle] = useState(0);

    useEffect(() => {
        const element = sectionRef.current;

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
    }, []);

    const playing = opened && inView;

    return (
        <section
            ref={sectionRef}
            className={cn(
                'bouquet-scene relative flex min-h-svh flex-col items-center justify-end overflow-hidden px-5 pt-14 pb-10 text-center',
                playing && 'is-playing',
            )}
        >
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                {STARS.map((star, index) => (
                    <span
                        key={index}
                        className="bq-twinkle absolute rounded-full bg-white"
                        style={{
                            left: star.left,
                            top: star.top,
                            width: star.size,
                            height: star.size,
                            animationDelay: star.delay,
                        }}
                    />
                ))}
                {FIREFLIES.map((firefly, index) => (
                    <span
                        key={`${cycle}-${index}`}
                        className="bq-firefly absolute size-1.5 rounded-full"
                        style={
                            {
                                left: firefly.left,
                                bottom: firefly.bottom,
                                '--bq-drift': firefly.drift,
                                animationDelay: firefly.delay,
                                animationDuration: firefly.duration,
                            } as CSSProperties
                        }
                    />
                ))}
            </div>

            <div key={`text-${cycle}`} className="relative z-10 max-w-xl">
                {experience.recipient_name && (
                    <p
                        className="bq-fade text-xs font-semibold tracking-[0.35em] text-[var(--x-accent)] uppercase"
                        style={delayStyle(3.6)}
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
                    className="bq-fade mt-3 font-script text-6xl leading-[1.05] sm:text-7xl"
                    style={delayStyle(3.9)}
                >
                    <EditableText
                        field="title"
                        value={experience.title}
                        placeholder="Add a headline"
                        label="Headline"
                    />
                </h1>
                <div className="bq-fade" style={delayStyle(4.3)}>
                    <EditableText
                        block
                        multiline
                        field="flowers_note"
                        value={experience.flowers_note}
                        placeholder="Add a note for your flowers"
                        label="Flower note"
                        className="mt-4 font-display text-lg leading-relaxed text-[var(--x-muted)] italic sm:text-xl"
                    />
                </div>
            </div>

            <div key={`bouquet-${cycle}`} className="relative mt-6 w-full">
                <BouquetSvg glowId={glowId} />
            </div>

            <button
                type="button"
                onClick={() => setCycle((value) => value + 1)}
                className="bq-fade relative z-10 mt-4 inline-flex items-center gap-2 rounded-full border border-current/20 px-4 py-2 text-xs tracking-[0.2em] text-[var(--x-muted)] uppercase transition-colors hover:text-[var(--x-ink)]"
                style={delayStyle(5)}
                aria-label="Let the flowers bloom again"
            >
                <RotateCcw className="size-3.5" /> Bloom again
            </button>
        </section>
    );
}
