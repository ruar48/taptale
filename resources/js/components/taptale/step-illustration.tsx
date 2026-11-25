import { useId } from 'react';
import type { ReactNode, SVGProps } from 'react';
import {
    HEART_PATH,
    Motion,
    Twinkle,
} from '@/components/taptale/category-illustration';

type IdFactory = (name: string) => string;

export type StepScene = 'calendar' | 'keychain' | 'polaroid' | 'gift';

/** Soft folds of fabric that every step scene rests on. */
function Fabric() {
    return (
        <>
            <path
                d="M0 96 C40 82 76 104 118 94 C152 86 178 98 200 90 L200 130 L0 130 Z"
                fill="#f6d3db"
            />
            <path
                d="M0 110 C46 98 92 118 138 106 C164 100 184 108 200 104 L200 130 L0 130 Z"
                fill="#f1c2cd"
            />
            <path
                d="M24 112 C60 104 96 120 140 110"
                fill="none"
                stroke="#fff"
                strokeOpacity={0.45}
                strokeWidth={1.2}
            />
        </>
    );
}

function Rose({ x, y }: { x: number; y: number }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <ellipse
                cx={-14}
                cy={6}
                rx={10}
                ry={4.5}
                transform="rotate(-25 -14 6)"
                fill="#7fae7a"
            />
            <ellipse
                cx={13}
                cy={8}
                rx={9}
                ry={4}
                transform="rotate(20 13 8)"
                fill="#6c9a68"
            />
            <circle r={13} fill="#ef8ea6" />
            <circle cx={-4} cy={-3} r={9} fill="#f6a9bc" />
            <circle cx={3} cy={2} r={8} fill="#e9798f" />
            <path
                d="M-3 -1 a4 4 0 1 1 6 3 a6.5 6.5 0 1 1 -10 -5"
                fill="none"
                stroke="#c9566f"
                strokeWidth={1.3}
                strokeLinecap="round"
            />
        </g>
    );
}

function CalendarScene(): ReactNode {
    return (
        <>
            <Fabric />
            <path d="M66 46 L150 46 L164 112 L54 112 Z" fill="#f3e3df" />
            <path d="M62 42 L148 42 L158 108 L50 108 Z" fill="#fffaf6" />
            <path d="M62 42 L148 42 L150 54 L60 54 Z" fill="#f2a3b6" />
            {[0, 1, 2, 3, 4, 5].map((ring) => (
                <ellipse
                    key={ring}
                    cx={72 + ring * 14}
                    cy={41}
                    rx={2.6}
                    ry={5}
                    fill="none"
                    stroke="#d4a19a"
                    strokeWidth={1.6}
                />
            ))}
            {[0, 1, 2].map((row) =>
                [0, 1, 2, 3, 4, 5].map((column) => (
                    <rect
                        key={`${row}-${column}`}
                        x={64 + column * 14 - row * 1.5}
                        y={62 + row * 14}
                        width={8}
                        height={5}
                        rx={1}
                        fill="#f4e4e1"
                    />
                )),
            )}
            <Motion className="animate-heartbeat">
                <path
                    d={HEART_PATH}
                    transform="translate(106 80) scale(0.4)"
                    fill="none"
                    stroke="#d4506f"
                    strokeWidth={5}
                />
            </Motion>
            <Rose x={52} y={106} />
            <Twinkle x={168} y={36} size={5} color="#f0a6b8" />
        </>
    );
}

function KeychainScene(id: IdFactory): ReactNode {
    const roseGold = `url(#${id('rose-gold')})`;

    return (
        <>
            <defs>
                <linearGradient
                    id={id('rose-gold')}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                >
                    <stop offset="0" stopColor="#fbd9c9" />
                    <stop offset="0.5" stopColor="#e2a48c" />
                    <stop offset="1" stopColor="#b9735e" />
                </linearGradient>
            </defs>
            <Fabric />
            <ellipse
                cx={100}
                cy={116}
                rx={36}
                ry={5}
                fill="#c98d9b"
                opacity={0.35}
            />
            <Motion className="animate-sway" origin="72% 0%">
                <circle
                    cx={124}
                    cy={22}
                    r={13}
                    fill="none"
                    stroke={roseGold}
                    strokeWidth={4}
                />
                <ellipse
                    cx={116}
                    cy={38}
                    rx={3.2}
                    ry={5}
                    transform="rotate(30 116 38)"
                    fill="none"
                    stroke={roseGold}
                    strokeWidth={2}
                />
                <ellipse
                    cx={110}
                    cy={47}
                    rx={3.2}
                    ry={5}
                    transform="rotate(-10 110 47)"
                    fill="none"
                    stroke={roseGold}
                    strokeWidth={2}
                />
                <g transform="translate(100 84) rotate(-10) scale(1.25)">
                    <path d={HEART_PATH} fill={roseGold} />
                    <path
                        d={HEART_PATH}
                        transform="scale(0.86)"
                        fill="none"
                        stroke="#fff"
                        strokeOpacity={0.45}
                        strokeWidth={1.4}
                    />
                    <text
                        y={-6}
                        textAnchor="middle"
                        fontFamily="var(--font-script)"
                        fontSize={10}
                        fill="#7a4536"
                    >
                        Always
                    </text>
                    <text
                        y={6}
                        textAnchor="middle"
                        fontFamily="var(--font-script)"
                        fontSize={10}
                        fill="#7a4536"
                    >
                        Together ♡
                    </text>
                </g>
            </Motion>
            <Twinkle x={150} y={60} size={5} />
            <Twinkle x={50} y={40} size={4} delay={1.3} color="#f0a6b8" />
        </>
    );
}

function PolaroidScene(id: IdFactory): ReactNode {
    return (
        <>
            <defs>
                <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ffd9a8" />
                    <stop offset="0.55" stopColor="#f3a3a3" />
                    <stop offset="1" stopColor="#a785b5" />
                </linearGradient>
                <linearGradient id={id('pen')} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#f7b9c8" />
                    <stop offset="1" stopColor="#d9849b" />
                </linearGradient>
            </defs>
            <Fabric />
            <Motion className="animate-bob">
                <g transform="rotate(-8 92 74)">
                    <rect
                        x={50}
                        y={22}
                        width={86}
                        height={98}
                        rx={3}
                        fill="#c98d9b"
                        opacity={0.25}
                        transform="translate(3 4)"
                    />
                    <rect
                        x={50}
                        y={22}
                        width={86}
                        height={98}
                        rx={3}
                        fill="#fffefc"
                    />
                    <rect
                        x={57}
                        y={29}
                        width={72}
                        height={66}
                        fill={`url(#${id('sky')})`}
                    />
                    <circle
                        cx={108}
                        cy={70}
                        r={9}
                        fill="#ffe7b8"
                        opacity={0.9}
                    />
                    <rect
                        x={57}
                        y={76}
                        width={72}
                        height={19}
                        fill="#7f7fb0"
                        opacity={0.75}
                    />
                    <path
                        d="M57 82 Q75 79 93 82 T129 82"
                        fill="none"
                        stroke="#fff"
                        strokeOpacity={0.35}
                    />
                    <circle cx={80} cy={56} r={7} fill="#3d2f3c" />
                    <circle cx={95} cy={54} r={6.5} fill="#4a3542" />
                    <path
                        d="M66 95 C68 72 76 64 82 64 C88 64 90 72 88 95 Z"
                        fill="#3d2f3c"
                    />
                    <path
                        d="M84 95 C86 74 92 62 96 62 C103 62 108 74 108 95 Z"
                        fill="#4a3542"
                    />
                    <Motion className="animate-heartbeat">
                        <path
                            d={HEART_PATH}
                            transform="translate(88 40) scale(0.13)"
                            fill="#ff8fab"
                        />
                    </Motion>
                </g>
            </Motion>
            <Motion className="animate-wiggle" origin="50% 100%">
                <g transform="rotate(24 160 72)">
                    <rect
                        x={155}
                        y={26}
                        width={9}
                        height={78}
                        rx={4.5}
                        fill={`url(#${id('pen')})`}
                    />
                    <rect x={155} y={34} width={9} height={6} fill="#e6b980" />
                    <path d="M155 104 L159.5 116 L164 104 Z" fill="#eacbb8" />
                    <path
                        d="M158.5 113 L159.5 116 L160.5 113 Z"
                        fill="#5a3f46"
                    />
                </g>
            </Motion>
        </>
    );
}

function GiftScene(id: IdFactory): ReactNode {
    const ribbon = `url(#${id('ribbon')})`;

    return (
        <>
            <defs>
                <linearGradient id={id('paper')} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#fffaf3" />
                    <stop offset="1" stopColor="#ead9c7" />
                </linearGradient>
                <linearGradient id={id('ribbon')} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#b23a5a" />
                    <stop offset="1" stopColor="#7d2140" />
                </linearGradient>
            </defs>
            <Fabric />
            <ellipse
                cx={100}
                cy={118}
                rx={50}
                ry={5}
                fill="#c98d9b"
                opacity={0.35}
            />
            <rect
                x={58}
                y={66}
                width={84}
                height={52}
                rx={2}
                fill={`url(#${id('paper')})`}
            />
            <rect x={52} y={54} width={96} height={16} rx={3} fill="#fffaf3" />
            <rect x={52} y={66} width={96} height={4} fill="#e3cfbb" />
            <rect x={93} y={54} width={14} height={64} fill={ribbon} />
            <rect x={58} y={86} width={84} height={10} fill={ribbon} />
            <Motion className="animate-wiggle" origin="50% 80%">
                <path
                    d="M98 52 L86 70 L92 67 L94 74 L102 54 Z"
                    fill="#7d2140"
                />
                <path
                    d="M102 52 L114 70 L108 67 L106 74 L98 54 Z"
                    fill="#7d2140"
                />
                <path
                    d="M100 51 C80 26 60 38 74 51 C82 57 92 55 100 51 Z"
                    fill={ribbon}
                />
                <path
                    d="M100 51 C120 26 140 38 126 51 C118 57 108 55 100 51 Z"
                    fill={ribbon}
                />
                <ellipse cx={100} cy={51} rx={6} ry={5} fill="#9a2b4b" />
            </Motion>
            <Motion className="animate-sway" origin="0% 0%" delay={0.6}>
                <path
                    d="M108 54 C120 58 130 62 136 70"
                    fill="none"
                    stroke="#c99a86"
                    strokeWidth={1}
                />
                <g transform="rotate(18 146 80)">
                    <path
                        d="M136 70 L156 70 L160 80 L156 90 L136 90 Z"
                        fill="#fff3ee"
                        stroke="#ecd3cb"
                        strokeWidth={0.8}
                    />
                    <circle cx={156} cy={80} r={1.4} fill="#c99a86" />
                    <path
                        d={HEART_PATH}
                        transform="translate(145 80) scale(0.16)"
                        fill="#d9607f"
                    />
                </g>
            </Motion>
            <Twinkle x={44} y={40} size={5} color="#f6c453" />
            <Twinkle x={160} y={30} size={4} delay={1.1} color="#f6c453" />
        </>
    );
}

const SCENES: Record<StepScene, (id: IdFactory) => ReactNode> = {
    calendar: CalendarScene,
    keychain: KeychainScene,
    polaroid: PolaroidScene,
    gift: GiftScene,
};

/**
 * Small animated scene shown at the foot of each "How Taptale works" step.
 */
export function StepIllustration({
    scene,
    ...props
}: { scene: StepScene } & SVGProps<SVGSVGElement>) {
    const prefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const id: IdFactory = (part) => `${prefix}-${part}`;

    return (
        <svg
            viewBox="0 0 200 130"
            aria-hidden="true"
            focusable="false"
            preserveAspectRatio="xMidYMax meet"
            {...props}
        >
            {SCENES[scene](id)}
        </svg>
    );
}
