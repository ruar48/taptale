import { Heart, Music, Pause } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type {
    ExperiencePreset,
    ExperienceTheme,
} from '@/components/taptale/experience/config';
import { cn } from '@/lib/utils';
import type { DigitalExperience, ExperienceMoment } from '@/types';

export type ExperienceContextValue = {
    experience: DigitalExperience;
    preset: ExperiencePreset;
    theme: ExperienceTheme;
    photos: string[];
    photoAt: (index: number) => string | null;
    moments: ExperienceMoment[];
    openPhoto: (url: string) => void;
};

export const ExperienceContext = createContext<ExperienceContextValue | null>(
    null,
);

export function useExperience(): ExperienceContextValue {
    const context = useContext(ExperienceContext);

    if (!context) {
        throw new Error(
            'useExperience must be used inside an experience page.',
        );
    }

    return context;
}

type AudioState = {
    available: boolean;
    playing: boolean;
    play: () => void;
    toggle: () => void;
};

const AudioContext = createContext<AudioState>({
    available: false,
    playing: false,
    play: () => undefined,
    toggle: () => undefined,
});

export function useExperienceAudio(): AudioState {
    return useContext(AudioContext);
}

/**
 * Background song uploaded by the customer. Browsers only allow audio to
 * start after a tap, which the opening gate (or the music button) provides.
 */
export function AudioProvider({
    src,
    children,
}: {
    src: string | null;
    children: ReactNode;
}) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);

    const play = () => {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        void audio
            .play()
            .then(() => setPlaying(true))
            .catch(() => setPlaying(false));
    };

    const toggle = () => {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        if (audio.paused) {
            play();
        } else {
            audio.pause();
            setPlaying(false);
        }
    };

    return (
        <AudioContext.Provider
            value={{ available: !!src, playing, play, toggle }}
        >
            {src && (
                <audio
                    ref={audioRef}
                    src={src}
                    loop
                    preload="none"
                    onEnded={() => setPlaying(false)}
                />
            )}
            {children}
        </AudioContext.Provider>
    );
}

export function MusicButton() {
    const { available, playing, toggle } = useExperienceAudio();

    if (!available) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={toggle}
            className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-[var(--x-accent)] text-[var(--x-accent-ink)] shadow-[0_10px_30px_-8px_rgb(0_0_0/0.5)] transition hover:scale-105"
            aria-label={playing ? 'Pause our song' : 'Play our song'}
        >
            {playing ? (
                <Pause className="size-6" />
            ) : (
                <Music className="size-6" />
            )}
            {playing && (
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--x-accent)] opacity-30" />
            )}
        </button>
    );
}

/**
 * Fades content up as it scrolls into view.
 */
export function Reveal({
    children,
    className,
    delay = 0,
}: {
    children: ReactNode;
    className?: string;
    delay?: number;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;

        if (!element || typeof IntersectionObserver === 'undefined') {
            setVisible(true);

            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={cn(
                'transition-all duration-1000 ease-out',
                visible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-8 opacity-0',
                className,
            )}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

/**
 * A photo, or a soft themed placeholder when the customer hasn't added one.
 */
export function PhotoFill({
    src,
    className,
    style,
    onClick,
}: {
    src: string | null;
    className?: string;
    style?: CSSProperties;
    onClick?: () => void;
}) {
    if (src) {
        return (
            <img
                src={src}
                alt=""
                loading="lazy"
                onClick={onClick}
                className={cn(
                    'object-cover',
                    onClick && 'cursor-zoom-in',
                    className,
                )}
                style={style}
            />
        );
    }

    return (
        <div
            className={cn('flex items-center justify-center', className)}
            style={{
                background:
                    'linear-gradient(135deg, color-mix(in oklab, var(--x-accent) 70%, white), color-mix(in oklab, var(--x-accent) 30%, white))',
                ...style,
            }}
        >
            <Heart
                className="size-1/4 max-h-16 max-w-16 text-white/80"
                fill="currentColor"
            />
        </div>
    );
}

export function Polaroid({
    src,
    caption,
    rotate = 0,
    className,
    tape = false,
}: {
    src: string | null;
    caption?: string | null;
    rotate?: number;
    className?: string;
    tape?: boolean;
}) {
    const { openPhoto } = useExperience();

    return (
        <figure
            className={cn(
                'relative bg-white p-2.5 pb-3 shadow-[0_14px_30px_-12px_rgb(0_0_0/0.45)] transition-transform duration-500 hover:z-10 hover:scale-105 hover:rotate-0',
                className,
            )}
            style={{ transform: `rotate(${rotate}deg)` }}
        >
            {tape && (
                <span
                    className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 -rotate-3 opacity-85 shadow-sm"
                    style={{
                        background:
                            'color-mix(in oklab, var(--x-accent) 55%, white)',
                    }}
                />
            )}
            <PhotoFill
                src={src}
                className="aspect-square w-full"
                onClick={src ? () => openPhoto(src) : undefined}
            />
            {caption && (
                <figcaption className="mt-2 truncate text-center font-display text-sm text-[#3A2A2A] italic">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}

export function FloatingHearts({ count = 10 }: { count?: number }) {
    return (
        <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden
        >
            {Array.from({ length: count }, (_, index) => (
                <Heart
                    key={index}
                    className="absolute bottom-[-10%] animate-heart-rise text-[var(--x-accent)]"
                    fill="currentColor"
                    style={{
                        left: `${(index * 37) % 100}%`,
                        width: `${12 + ((index * 7) % 18)}px`,
                        height: `${12 + ((index * 7) % 18)}px`,
                        animationDelay: `${(index * 1.3) % 9}s`,
                        animationDuration: `${8 + (index % 5)}s`,
                        opacity: 0.6,
                    }}
                />
            ))}
        </div>
    );
}

export function SectionShell({
    children,
    className,
    surface = false,
}: {
    children: ReactNode;
    className?: string;
    surface?: boolean;
}) {
    return (
        <section
            className={cn(
                'relative overflow-hidden px-5 py-16 sm:px-8 sm:py-24',
                surface && 'bg-[var(--x-surface)]',
                className,
            )}
        >
            <div className="relative mx-auto max-w-5xl">{children}</div>
        </section>
    );
}

export function Eyebrow({ children }: { children: ReactNode }) {
    return (
        <p className="text-xs font-semibold tracking-[0.35em] text-[var(--x-accent)] uppercase">
            {children}
        </p>
    );
}

export function ScriptHeading({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <h2
            className={cn(
                'font-script text-5xl leading-tight sm:text-6xl',
                className,
            )}
        >
            {children}
        </h2>
    );
}
