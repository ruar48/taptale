import {
    Clapperboard,
    Film,
    Heart,
    Image as ImageIcon,
    Smartphone,
    Square,
    Tv,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import '../../../../css/video-frames.css';
import type { VideoBackground, VideoFrame } from '@/types';

/**
 * Backdrops behind the page video. "theme" keeps the page's own color; the
 * others are designed scenes, previewed in the picker by their swatch class.
 */
export const VIDEO_BACKGROUNDS: { value: VideoBackground; label: string }[] = [
    { value: 'theme', label: 'Theme' },
    { value: 'theater', label: 'Theater' },
    { value: 'starry', label: 'Starry night' },
    { value: 'hearts', label: 'Hearts' },
    { value: 'sunset', label: 'Sunset' },
    { value: 'retro', label: 'Retro' },
    { value: 'confetti', label: 'Confetti' },
];

/** The extra pieces some backdrops paint behind the video. */
export function VideoBackdropArt({
    background,
}: {
    background: VideoBackground;
}) {
    switch (background) {
        case 'theater':
            return (
                <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden
                >
                    <span className="vb-theater-light" />
                    <span className="vb-theater-valance" />
                    <span className="vb-theater-seats" />
                </div>
            );
        case 'starry':
            return (
                <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden
                >
                    <span className="vb-starry-stars" />
                    <span className="vb-starry-moon" />
                </div>
            );
        case 'sunset':
            return (
                <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden
                >
                    <span className="vb-sunset-sun" />
                    <span className="vb-sunset-sea" />
                </div>
            );
        default:
            return null;
    }
}

/** The frames a page video can play in, in the order the picker shows them. */
export const VIDEO_FRAMES: {
    value: VideoFrame;
    label: string;
    icon: ComponentType<{ className?: string }>;
}[] = [
    { value: 'plain', label: 'Plain', icon: Square },
    { value: 'polaroid', label: 'Polaroid', icon: ImageIcon },
    { value: 'film', label: 'Film reel', icon: Film },
    { value: 'tv', label: 'Retro TV', icon: Tv },
    { value: 'hearts', label: 'Hearts', icon: Heart },
    { value: 'cinema', label: 'Cinema', icon: Clapperboard },
    { value: 'phone', label: 'Phone', icon: Smartphone },
];

/** Hearts floating around the hearts frame: [left, top, size, delay]. */
const FLOATING_HEARTS = [
    ['-14px', '18%', 26, 0],
    ['calc(100% - 12px)', '8%', 20, 0.8],
    ['-10px', '78%', 18, 1.6],
    ['calc(100% - 16px)', '70%', 28, 2.2],
] as const;

function Bow() {
    return (
        <svg
            viewBox="0 0 120 60"
            className="absolute -top-7 left-1/2 w-24 -translate-x-1/2 drop-shadow"
            aria-hidden
        >
            <path
                d="M60 30 C 40 6 10 8 16 30 C 22 50 46 40 60 30 Z"
                fill="#ff4f93"
            />
            <path
                d="M60 30 C 80 6 110 8 104 30 C 98 50 74 40 60 30 Z"
                fill="#ff4f93"
            />
            <path d="M56 34 L 44 58 L 54 54 L 59 36 Z" fill="#e8367a" />
            <path d="M64 34 L 76 58 L 66 54 L 61 36 Z" fill="#e8367a" />
            <circle cx="60" cy="31" r="7" fill="#ff7ab8" />
        </svg>
    );
}

/**
 * The page video inside the frame its owner picked. `children` is the
 * player, which fills the frame's screen.
 */
export function VideoFrameView({
    frame,
    title,
    children,
}: {
    frame: VideoFrame;
    title: string;
    children: ReactNode;
}) {
    switch (frame) {
        case 'polaroid':
            return (
                <div className="mx-auto max-w-3xl px-2">
                    <div className="vf-polaroid">
                        <div className="overflow-hidden rounded-[2px] bg-black">
                            {children}
                        </div>
                        <p className="absolute inset-x-4 bottom-4 truncate text-center font-script text-3xl text-[#3a2a30]">
                            {title}
                        </p>
                    </div>
                </div>
            );
        case 'film':
            return (
                <div className="mx-auto max-w-3xl">
                    <div className="vf-film">
                        <div className="overflow-hidden rounded bg-black">
                            {children}
                        </div>
                    </div>
                </div>
            );
        case 'tv':
            return (
                <div className="mx-auto max-w-3xl">
                    <div className="vf-tv">
                        <div className="vf-tv-screen">{children}</div>
                        <div className="vf-tv-panel" aria-hidden>
                            <span className="vf-tv-knob" />
                            <span className="vf-tv-knob" />
                            <span className="vf-tv-grille" />
                        </div>
                    </div>
                </div>
            );
        case 'hearts':
            return (
                <div className="mx-auto max-w-3xl px-3">
                    <div className="vf-hearts">
                        <Bow />
                        {FLOATING_HEARTS.map(([left, top, size, delay]) => (
                            <Heart
                                key={`${left}-${top}`}
                                className="vf-hearts-heart"
                                fill="currentColor"
                                style={{
                                    left,
                                    top,
                                    width: size,
                                    height: size,
                                    animationDelay: `${delay}s`,
                                }}
                                aria-hidden
                            />
                        ))}
                        <div className="overflow-hidden rounded-[22px] bg-black">
                            {children}
                        </div>
                    </div>
                </div>
            );
        case 'cinema':
            return (
                <div className="mx-auto max-w-3xl">
                    <div className="vf-cinema">
                        <p className="vf-cinema-marquee">
                            Now showing · {title}
                        </p>
                        <div className="overflow-hidden rounded-md bg-black shadow-[0_0_40px_rgb(255_215_106/0.15)]">
                            {children}
                        </div>
                    </div>
                </div>
            );
        case 'phone':
            return (
                <div className="vf-phone">
                    <div className="vf-phone-screen">{children}</div>
                </div>
            );
        default:
            return (
                <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-black shadow-2xl">
                    {children}
                </div>
            );
    }
}
