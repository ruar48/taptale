import { useId } from 'react';
import type { ReactNode, SVGProps } from 'react';

type IdFactory = (name: string) => string;

export const HEART_PATH =
    'M0 28 C-34 6 -40 -12 -30 -24 C-21 -34 -6 -30 0 -18 C6 -30 21 -34 30 -24 C40 -12 34 6 0 28 Z';

function Shadow({
    cx = 85,
    cy = 110,
    rx = 50,
}: {
    cx?: number;
    cy?: number;
    rx?: number;
}) {
    return (
        <ellipse cx={cx} cy={cy} rx={rx} ry={6} fill="#000" opacity={0.16} />
    );
}

/**
 * Animates its children around their own bounding box, so CSS keyframes work
 * on SVG shapes without clobbering any `transform` attribute inside.
 */
export function Motion({
    className,
    delay = 0,
    origin = 'center',
    children,
}: {
    className: string;
    delay?: number;
    origin?: string;
    children: ReactNode;
}) {
    return (
        <g
            className={className}
            style={{
                transformBox: 'fill-box',
                transformOrigin: origin,
                animationDelay: `${delay}s`,
            }}
        >
            {children}
        </g>
    );
}

export function Twinkle({
    x,
    y,
    size = 6,
    delay = 0,
    color = '#fff',
}: {
    x: number;
    y: number;
    size?: number;
    delay?: number;
    color?: string;
}) {
    return (
        <Motion className="animate-twinkle" delay={delay}>
            <path
                transform={`translate(${x} ${y})`}
                d={`M0 ${-size} Q0 0 ${size} 0 Q0 0 0 ${size} Q0 0 ${-size} 0 Q0 0 0 ${-size} Z`}
                fill={color}
            />
        </Motion>
    );
}

function Hearts(id: IdFactory): ReactNode {
    return (
        <>
            <defs>
                <radialGradient id={id('heart')} cx="0.35" cy="0.3" r="0.85">
                    <stop offset="0" stopColor="#ffc6d4" />
                    <stop offset="0.55" stopColor="#f0658c" />
                    <stop offset="1" stopColor="#c43a61" />
                </radialGradient>
            </defs>
            <Shadow cx={90} cy={108} rx={44} />
            <path
                d="M74 84 C 62 98, 50 104, 34 112"
                fill="none"
                stroke="#fff"
                strokeOpacity={0.6}
                strokeWidth={1.5}
            />
            {[
                'translate(68 56) rotate(-14) scale(0.92)',
                'translate(104 66) rotate(12) scale(1.05)',
            ].map((transform, index) => (
                <Motion
                    key={transform}
                    className="animate-heartbeat"
                    delay={index * 0.35}
                >
                    <g transform={transform}>
                        <path d={HEART_PATH} fill={`url(#${id('heart')})`} />
                        <ellipse
                            cx={-16}
                            cy={-17}
                            rx={8}
                            ry={4.5}
                            transform="rotate(-35 -16 -17)"
                            fill="#fff"
                            opacity={0.5}
                        />
                    </g>
                </Motion>
            ))}
            <Twinkle x={134} y={28} size={6} />
            <Twinkle x={40} y={34} size={4} delay={1.2} />
        </>
    );
}

function Rings(id: IdFactory): ReactNode {
    const ring = (cx: number, cy: number, angle: number) => (
        <g transform={`rotate(${angle} ${cx} ${cy})`}>
            <ellipse
                cx={cx}
                cy={cy}
                rx={30}
                ry={21}
                fill="none"
                stroke={`url(#${id('gold')})`}
                strokeWidth={8}
            />
            <ellipse
                cx={cx}
                cy={cy}
                rx={30}
                ry={21}
                fill="none"
                stroke="#fff8de"
                strokeOpacity={0.7}
                strokeWidth={1.5}
                strokeDasharray="36 160"
                strokeDashoffset={-8}
            />
        </g>
    );

    return (
        <>
            <defs>
                <linearGradient id={id('gold')} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#fff1c1" />
                    <stop offset="0.35" stopColor="#e8b65a" />
                    <stop offset="0.6" stopColor="#a86f1f" />
                    <stop offset="0.85" stopColor="#f6d68a" />
                    <stop offset="1" stopColor="#b98234" />
                </linearGradient>
                <linearGradient id={id('gem')} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#bcd7ee" />
                </linearGradient>
            </defs>
            <Shadow cx={84} cy={104} rx={52} />
            {ring(64, 76, -18)}
            {ring(102, 72, 16)}
            <path
                d="M100 44 L106 37 L112 44 L106 53 Z"
                fill={`url(#${id('gem')})`}
                stroke="#9fc1de"
                strokeWidth={0.8}
            />
            <path d="M100 44 L112 44" stroke="#9fc1de" strokeWidth={0.6} />
            <Twinkle x={120} y={32} size={7} />
            <Twinkle x={34} y={52} size={4} delay={1.4} />
        </>
    );
}

function TeddyBear(id: IdFactory): ReactNode {
    const fur = `url(#${id('fur')})`;

    return (
        <>
            <defs>
                <radialGradient id={id('fur')} cx="0.4" cy="0.35" r="0.8">
                    <stop offset="0" stopColor="#fdf6ec" />
                    <stop offset="1" stopColor="#e2cbb1" />
                </radialGradient>
            </defs>
            <ellipse
                cx={88}
                cy={106}
                rx={56}
                ry={12}
                fill="#fff"
                opacity={0.85}
            />
            <ellipse cx={72} cy={98} rx={13} ry={10} fill={fur} />
            <ellipse cx={108} cy={98} rx={13} ry={10} fill={fur} />
            <ellipse cx={72} cy={99} rx={7} ry={6} fill="#ead6bf" />
            <ellipse cx={108} cy={99} rx={7} ry={6} fill="#ead6bf" />
            <ellipse
                cx={64}
                cy={78}
                rx={9}
                ry={14}
                transform="rotate(25 64 78)"
                fill={fur}
            />
            <ellipse
                cx={116}
                cy={78}
                rx={9}
                ry={14}
                transform="rotate(-25 116 78)"
                fill={fur}
            />
            <ellipse cx={90} cy={80} rx={26} ry={24} fill={fur} />
            <ellipse cx={90} cy={85} rx={15} ry={13} fill="#fff8f0" />
            <Motion className="animate-sway" origin="50% 100%">
                <circle cx={70} cy={26} r={10} fill={fur} />
                <circle cx={110} cy={26} r={10} fill={fur} />
                <circle cx={70} cy={26} r={5} fill="#ecd3bd" />
                <circle cx={110} cy={26} r={5} fill="#ecd3bd" />
                <circle cx={90} cy={44} r={24} fill={fur} />
                <ellipse cx={90} cy={51} rx={10} ry={8} fill="#fff8f0" />
                <ellipse cx={90} cy={47.5} rx={4} ry={3} fill="#4a3a35" />
                <path
                    d="M86 53 Q90 57 94 53"
                    fill="none"
                    stroke="#4a3a35"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                />
                <circle cx={81} cy={40} r={2.6} fill="#3a2e2a" />
                <circle cx={99} cy={40} r={2.6} fill="#3a2e2a" />
                <ellipse
                    cx={75}
                    cy={49}
                    rx={4}
                    ry={2.5}
                    fill="#f2a7b5"
                    opacity={0.5}
                />
                <ellipse
                    cx={105}
                    cy={49}
                    rx={4}
                    ry={2.5}
                    fill="#f2a7b5"
                    opacity={0.5}
                />
            </Motion>
            <path d="M90 66 L76 58 L76 74 Z" fill="#86b9de" />
            <path d="M90 66 L104 58 L104 74 Z" fill="#86b9de" />
            <circle cx={90} cy={66} r={4} fill="#5f9cc9" />
        </>
    );
}

function Cake(id: IdFactory): ReactNode {
    const candles: Array<[number, number]> = [
        [65, 70],
        [75, 64],
        [85, 67],
        [95, 64],
        [105, 70],
    ];
    const drips = [
        [50, 7],
        [60, 10],
        [71, 6],
        [83, 9],
        [95, 7],
        [107, 10],
        [118, 6],
    ];
    const sprinkles: Array<[number, number, number, string]> = [
        [54, 84, 30, '#f28ca4'],
        [66, 92, -20, '#f6c453'],
        [78, 86, 60, '#8fc5e8'],
        [92, 93, 10, '#a5d6a7'],
        [102, 84, -40, '#f28ca4'],
        [114, 91, 35, '#f6c453'],
        [60, 98, -60, '#8fc5e8'],
        [86, 99, 20, '#f28ca4'],
        [110, 99, -15, '#a5d6a7'],
    ];

    return (
        <>
            <defs>
                <linearGradient id={id('side')} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#ecd8c4" />
                    <stop offset="0.4" stopColor="#fff8ef" />
                    <stop offset="1" stopColor="#e3ccb6" />
                </linearGradient>
                <radialGradient id={id('flame')} cx="0.5" cy="0.7" r="0.6">
                    <stop offset="0" stopColor="#fff6c2" />
                    <stop offset="0.6" stopColor="#ffb547" />
                    <stop offset="1" stopColor="#ff7a3d" />
                </radialGradient>
            </defs>
            <ellipse cx={85} cy={107} rx={54} ry={10} fill="#d8cabd" />
            <ellipse cx={85} cy={104} rx={54} ry={10} fill="#fdfaf6" />
            <path
                d="M45 68 L45 98 A40 8 0 0 0 125 98 L125 68 Z"
                fill={`url(#${id('side')})`}
            />
            <ellipse cx={85} cy={68} rx={40} ry={9} fill="#fffaf3" />
            {drips.map(([x, height]) => (
                <rect
                    key={x}
                    x={x - 3}
                    y={70}
                    width={6}
                    height={height}
                    rx={3}
                    fill="#fffaf3"
                />
            ))}
            {sprinkles.map(([x, y, angle, color]) => (
                <rect
                    key={`${x}-${y}`}
                    x={x - 3}
                    y={y - 1}
                    width={6}
                    height={2}
                    rx={1}
                    fill={color}
                    transform={`rotate(${angle} ${x} ${y})`}
                />
            ))}
            {candles.map(([x, base], index) => (
                <g key={x}>
                    <Motion className="animate-pulse" delay={index * 0.3}>
                        <circle
                            cx={x}
                            cy={base - 30}
                            r={8}
                            fill="#ffd27a"
                            opacity={0.35}
                        />
                    </Motion>
                    <rect
                        x={x - 2.5}
                        y={base - 22}
                        width={5}
                        height={22}
                        rx={1.5}
                        fill="#f7a8bc"
                    />
                    <path
                        d={`M${x - 2.5} ${base - 16} L${x + 2.5} ${base - 19} M${x - 2.5} ${base - 9} L${x + 2.5} ${base - 12}`}
                        stroke="#fff"
                        strokeWidth={1.2}
                    />
                    <path
                        d={`M${x} ${base - 22} L${x} ${base - 25}`}
                        stroke="#5a4a42"
                        strokeWidth={1}
                    />
                    <Motion
                        className="animate-flicker"
                        delay={index * 0.17}
                        origin="50% 100%"
                    >
                        <path
                            d={`M${x} ${base - 37} C${x + 4} ${base - 31} ${x + 3.5} ${base - 25} ${x} ${base - 25} C${x - 3.5} ${base - 25} ${x - 4} ${base - 31} ${x} ${base - 37} Z`}
                            fill={`url(#${id('flame')})`}
                        />
                    </Motion>
                </g>
            ))}
        </>
    );
}

function GraduationCap(id: IdFactory): ReactNode {
    return (
        <>
            <defs>
                <linearGradient id={id('board')} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#4a4b57" />
                    <stop offset="1" stopColor="#1b1c22" />
                </linearGradient>
                <linearGradient id={id('tassel')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#f6d68a" />
                    <stop offset="1" stopColor="#c48e2f" />
                </linearGradient>
            </defs>
            <Shadow cx={88} cy={108} rx={58} />
            <g transform="rotate(-18 120 92)">
                <rect
                    x={94}
                    y={84}
                    width={54}
                    height={15}
                    rx={7.5}
                    fill="#f8efdf"
                />
                <ellipse cx={146} cy={91.5} rx={4} ry={7.5} fill="#eadcc4" />
                <ellipse cx={146} cy={91.5} rx={1.6} ry={3.5} fill="#d2c0a2" />
                <rect x={116} y={84} width={7} height={15} fill="#c0392b" />
                <path
                    d="M119.5 99 L114 110 L119.5 106 L125 110 Z"
                    fill="#a93226"
                />
            </g>
            <path d="M46 60 L46 80 Q76 96 106 80 L106 60 Z" fill="#23242b" />
            <path
                d="M22 50 L76 72 L130 50 L130 54 L76 76 L22 54 Z"
                fill="#111217"
            />
            <path
                d="M76 28 L130 50 L76 72 L22 50 Z"
                fill={`url(#${id('board')})`}
            />
            <Motion className="animate-sway" origin="0% 0%">
                <path
                    d="M76 50 Q98 56 110 58 L110 80"
                    fill="none"
                    stroke={`url(#${id('tassel')})`}
                    strokeWidth={2}
                />
                <rect
                    x={107}
                    y={78}
                    width={6}
                    height={15}
                    rx={2}
                    fill={`url(#${id('tassel')})`}
                />
            </Motion>
            <ellipse cx={76} cy={50} rx={4} ry={2.5} fill="#e3b45a" />
            <Twinkle x={138} y={30} size={6} />
            <Twinkle x={26} y={84} size={4} delay={1.3} />
        </>
    );
}

function Chalkboard(id: IdFactory): ReactNode {
    return (
        <>
            <defs>
                <linearGradient id={id('wood')} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#e0aa6f" />
                    <stop offset="1" stopColor="#a96d33" />
                </linearGradient>
                <radialGradient id={id('slate')} cx="0.5" cy="0.45" r="0.7">
                    <stop offset="0" stopColor="#3f4e45" />
                    <stop offset="1" stopColor="#27322c" />
                </radialGradient>
            </defs>
            <Shadow cx={88} cy={108} rx={56} />
            <g transform="rotate(-6 86 62)">
                <rect
                    x={40}
                    y={20}
                    width={94}
                    height={76}
                    rx={7}
                    fill={`url(#${id('wood')})`}
                />
                <rect
                    x={47}
                    y={27}
                    width={80}
                    height={62}
                    rx={3}
                    fill={`url(#${id('slate')})`}
                />
                <ellipse
                    cx={70}
                    cy={70}
                    rx={18}
                    ry={6}
                    fill="#fff"
                    opacity={0.05}
                />
                <text
                    x={86}
                    y={54}
                    textAnchor="middle"
                    fontFamily="var(--font-script)"
                    fontSize={20}
                    fill="#f4f1ea"
                >
                    Thank
                </text>
                <text
                    x={84}
                    y={77}
                    textAnchor="middle"
                    fontFamily="var(--font-script)"
                    fontSize={20}
                    fill="#f4f1ea"
                >
                    you!
                </text>
                <Motion className="animate-heartbeat">
                    <path
                        d={HEART_PATH}
                        transform="translate(108 72) scale(0.14)"
                        fill="#f28ca4"
                    />
                </Motion>
            </g>
            <Twinkle x={142} y={24} size={5} delay={0.6} />
            <rect x={28} y={98} width={24} height={10} rx={2} fill="#8b5e3c" />
            <rect x={28} y={98} width={24} height={5} rx={2} fill="#f5e6d0" />
            <rect
                x={58}
                y={103}
                width={18}
                height={4}
                rx={2}
                fill="#fffdf8"
                transform="rotate(-8 67 105)"
            />
        </>
    );
}

function Mugs(id: IdFactory): ReactNode {
    const mug = (x: number, y: number, handle: 'left' | 'right') => {
        const handlePath =
            handle === 'right'
                ? `M${x + 36} ${y + 12} C${x + 50} ${y + 12} ${x + 50} ${y + 34} ${x + 36} ${y + 34}`
                : `M${x} ${y + 12} C${x - 14} ${y + 12} ${x - 14} ${y + 34} ${x} ${y + 34}`;

        return (
            <g>
                {[x + 12, x + 24].map((wispX, index) => (
                    <Motion
                        key={wispX}
                        className="animate-steam"
                        delay={index * 1.1 + (handle === 'right' ? 0.5 : 0)}
                        origin="50% 100%"
                    >
                        <path
                            d={`M${wispX} ${y - 4} q-4 -6 0 -11 q4 -5 0 -11`}
                            fill="none"
                            stroke="#fff"
                            strokeOpacity={0.8}
                            strokeWidth={2}
                            strokeLinecap="round"
                        />
                    </Motion>
                ))}
                <path
                    d={handlePath}
                    fill="none"
                    stroke="#e3d7c7"
                    strokeWidth={6}
                />
                <rect
                    x={x}
                    y={y}
                    width={36}
                    height={48}
                    rx={6}
                    fill={`url(#${id('mug')})`}
                />
                <ellipse cx={x + 18} cy={y} rx={18} ry={5} fill="#f3ebe0" />
                <ellipse
                    cx={x + 18}
                    cy={y + 0.5}
                    rx={15}
                    ry={3.5}
                    fill="#7a4a32"
                />
                {[
                    [6, 10],
                    [27, 15],
                    [10, 38],
                    [29, 40],
                    [20, 8],
                ].map(([dx, dy]) => (
                    <circle
                        key={`${dx}-${dy}`}
                        cx={x + dx}
                        cy={y + dy}
                        r={0.9}
                        fill="#b8a894"
                    />
                ))}
                <path
                    d={HEART_PATH}
                    transform={`translate(${x + 18} ${y + 26}) scale(0.2)`}
                    fill="#d9534f"
                />
            </g>
        );
    };

    return (
        <>
            <defs>
                <linearGradient id={id('mug')} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#e2d6c6" />
                    <stop offset="0.4" stopColor="#fffaf3" />
                    <stop offset="1" stopColor="#d6c7b4" />
                </linearGradient>
            </defs>
            <ellipse cx={86} cy={106} rx={62} ry={13} fill="#eba78c" />
            {[100, 106, 112].map((y) => (
                <path
                    key={y}
                    d={`M36 ${y} q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0`}
                    fill="none"
                    stroke="#d98d71"
                    strokeWidth={1.2}
                    opacity={0.7}
                />
            ))}
            {mug(46, 52, 'left')}
            {mug(92, 48, 'right')}
        </>
    );
}

function Calendar(id: IdFactory): ReactNode {
    return (
        <>
            <defs>
                <radialGradient id={id('heart')} cx="0.35" cy="0.3" r="0.85">
                    <stop offset="0" stopColor="#ffc6d4" />
                    <stop offset="0.55" stopColor="#e0607f" />
                    <stop offset="1" stopColor="#b13758" />
                </radialGradient>
            </defs>
            <Shadow cx={86} cy={106} rx={46} />
            <g transform="rotate(-5 86 64)">
                <rect
                    x={50}
                    y={28}
                    width={72}
                    height={74}
                    rx={9}
                    fill="#fffaf5"
                />
                <path
                    d="M50 37 A9 9 0 0 1 59 28 L113 28 A9 9 0 0 1 122 37 L122 48 L50 48 Z"
                    fill="#c25b78"
                />
                <rect
                    x={66}
                    y={21}
                    width={5}
                    height={13}
                    rx={2.5}
                    fill="#8e8a8a"
                />
                <rect
                    x={101}
                    y={21}
                    width={5}
                    height={13}
                    rx={2.5}
                    fill="#8e8a8a"
                />
                {[0, 1, 2, 3, 4].map((column) => (
                    <circle
                        key={column}
                        cx={60 + column * 13}
                        cy={93}
                        r={1.6}
                        fill="#e7d9d2"
                    />
                ))}
                <Motion className="animate-heartbeat">
                    <path
                        d={HEART_PATH}
                        transform="translate(86 70) scale(0.55)"
                        fill={`url(#${id('heart')})`}
                    />
                </Motion>
            </g>
            <Motion className="animate-bob" delay={0.8}>
                <path
                    d={HEART_PATH}
                    transform="translate(134 34) rotate(14) scale(0.22)"
                    fill="#f0658c"
                />
            </Motion>
            <Twinkle x={36} y={40} size={5} delay={1.1} />
        </>
    );
}

function Crown(id: IdFactory): ReactNode {
    return (
        <>
            <defs>
                <linearGradient id={id('gold')} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#fff1c1" />
                    <stop offset="0.45" stopColor="#e8b65a" />
                    <stop offset="1" stopColor="#a86f1f" />
                </linearGradient>
            </defs>
            <Shadow cx={85} cy={106} rx={44} />
            <path
                d="M48 90 L40 44 L64 64 L85 32 L106 64 L130 44 L122 90 Z"
                fill={`url(#${id('gold')})`}
            />
            <rect x={46} y={86} width={78} height={14} rx={3} fill="#c58f35" />
            <circle cx={40} cy={44} r={5} fill="#f28ca4" />
            <circle cx={85} cy={32} r={6} fill="#8fc5e8" />
            <circle cx={130} cy={44} r={5} fill="#f28ca4" />
            {[62, 85, 108].map((x) => (
                <circle
                    key={x}
                    cx={x}
                    cy={93}
                    r={3.5}
                    fill={x === 85 ? '#f28ca4' : '#8fc5e8'}
                />
            ))}
            <Twinkle x={98} y={24} size={6} />
            <Twinkle x={142} y={64} size={4} delay={0.9} />
            <Twinkle x={28} y={70} size={4} delay={1.7} />
        </>
    );
}

function Gift(id: IdFactory): ReactNode {
    return (
        <>
            <defs>
                <linearGradient id={id('front')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fdf3ea" />
                    <stop offset="1" stopColor="#ead5c4" />
                </linearGradient>
                <linearGradient id={id('ribbon')} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#d9566f" />
                    <stop offset="1" stopColor="#9e2a45" />
                </linearGradient>
            </defs>
            <Shadow cx={84} cy={110} rx={50} />
            <path
                d="M40 60 L100 60 L100 110 L40 110 Z"
                fill={`url(#${id('front')})`}
            />
            <path d="M100 60 L125 46 L125 96 L100 110 Z" fill="#dcc3af" />
            <path d="M40 60 L65 46 L125 46 L100 60 Z" fill="#fff8f1" />
            <rect
                x={64}
                y={60}
                width={12}
                height={50}
                fill={`url(#${id('ribbon')})`}
            />
            <path d="M64 60 L76 60 L101 46 L89 46 Z" fill="#c8445c" />
            <path
                d="M47.3 55.9 L107.3 55.9 L117.7 50.1 L57.7 50.1 Z"
                fill="#c8445c"
            />
            <path
                d="M107.3 55.9 L117.7 50.1 L117.7 100.1 L107.3 105.9 Z"
                fill="#9e2a45"
            />
            <Motion className="animate-wiggle" origin="50% 70%">
                <path d="M80 53 L70 68 L75 65 L77 70 L83 55 Z" fill="#b2344f" />
                <path d="M85 53 L95 68 L90 65 L88 70 L82 55 Z" fill="#b2344f" />
                <path
                    d="M82.5 51 C66 30 50 42 64 52 C71 56 78 54 82.5 51 Z"
                    fill={`url(#${id('ribbon')})`}
                />
                <path
                    d="M82.5 51 C99 30 115 42 101 52 C94 56 87 54 82.5 51 Z"
                    fill={`url(#${id('ribbon')})`}
                />
                <ellipse cx={82.5} cy={51} rx={5} ry={4} fill="#b8364f" />
                <path
                    d="M68 40 C72 38 76 42 78 46"
                    fill="none"
                    stroke="#fff"
                    strokeOpacity={0.45}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                />
            </Motion>
            <Twinkle x={138} y={34} size={6} color="#f6c453" />
            <Twinkle x={28} y={52} size={4} delay={1.2} color="#f6c453" />
        </>
    );
}

const ILLUSTRATIONS: Record<string, (id: IdFactory) => ReactNode> = {
    heart: Hearts,
    gem: Rings,
    baby: TeddyBear,
    cake: Cake,
    'graduation-cap': GraduationCap,
    apple: Chalkboard,
    users: Mugs,
    'calendar-heart': Calendar,
    crown: Crown,
    gift: Gift,
};

/**
 * Decorative scene drawn for an occasion, picked by the category's icon name.
 * Falls back to a wrapped gift for icons without a dedicated drawing.
 */
export function CategoryIllustration({
    name,
    ...props
}: { name: string } & SVGProps<SVGSVGElement>) {
    const prefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const id: IdFactory = (part) => `${prefix}-${part}`;
    const draw = ILLUSTRATIONS[name] ?? Gift;

    return (
        <svg
            viewBox="0 0 160 120"
            aria-hidden="true"
            focusable="false"
            {...props}
        >
            {draw(id)}
        </svg>
    );
}
