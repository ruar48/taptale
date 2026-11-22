import { Heart } from 'lucide-react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useExperience } from '@/components/taptale/experience/shared';
import { cn } from '@/lib/utils';
import type { DigitalExperience } from '@/types';

/**
 * Text colors for the hearts backdrop, which is always a deep rose night,
 * so light and dark page themes both stay readable on it.
 */
export const HEARTS_BACKDROP_STYLE = {
    '--x-ink': '#FBEFF3',
    '--x-muted': '#E3C3CF',
    color: '#FBEFF3',
} as CSSProperties;

/**
 * Swirling line with a small heart in the middle, drawn above and below the
 * song heading (and once more to close the section).
 */
export function HeartFlourish({
    flip = false,
    className,
}: {
    flip?: boolean;
    className?: string;
}) {
    return (
        <svg
            viewBox="0 0 320 40"
            aria-hidden
            className={cn(
                'mx-auto h-8 w-64 text-[var(--x-accent)] sm:w-80',
                flip && '-scale-y-100',
                className,
            )}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.4"
        >
            <path d="M8 30 C60 30 90 12 128 22 C140 25 146 28 150 26" />
            <path d="M312 30 C260 30 230 12 192 22 C180 25 174 28 170 26" />
            <path d="M118 21 C112 14 102 16 104 23" opacity="0.7" />
            <path d="M202 21 C208 14 218 16 216 23" opacity="0.7" />
            <path
                d="M160 32 C146 22 146 12 153 10 C157 9 160 12 160 15 C160 12 163 9 167 10 C174 12 174 22 160 32 Z"
                strokeWidth="1.8"
            />
            <circle cx="40" cy="29" r="1.6" fill="currentColor" stroke="none" />
            <circle
                cx="280"
                cy="29"
                r="1.6"
                fill="currentColor"
                stroke="none"
            />
        </svg>
    );
}

const BACKDROP_HEARTS = [
    { left: '6%', top: '12%', size: 34, blur: 2, delay: 0 },
    { left: '84%', top: '8%', size: 26, blur: 1, delay: 1.5 },
    { left: '90%', top: '38%', size: 44, blur: 3, delay: 0.8 },
    { left: '3%', top: '52%', size: 28, blur: 1, delay: 2.2 },
    { left: '12%', top: '84%', size: 40, blur: 3, delay: 1.1 },
    { left: '78%', top: '78%', size: 30, blur: 2, delay: 2.8 },
    { left: '48%', top: '4%', size: 18, blur: 1, delay: 3.4 },
    { left: '60%', top: '92%', size: 22, blur: 1, delay: 0.4 },
];

/**
 * Full-bleed rose night behind the song section: soft glows in the theme
 * accent with blurred hearts drifting slowly.
 */
export function HeartsBackdrop() {
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{
                background: [
                    'radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--x-accent) 30%, transparent), transparent 42%)',
                    'radial-gradient(circle at 88% 70%, color-mix(in srgb, var(--x-accent) 26%, transparent), transparent 48%)',
                    'radial-gradient(circle at 50% 110%, color-mix(in srgb, var(--x-accent) 22%, transparent), transparent 55%)',
                    'linear-gradient(180deg, #1B0F1A 0%, #2A1226 50%, #1B0F1A 100%)',
                ].join(', '),
            }}
        >
            {BACKDROP_HEARTS.map((heart, index) => (
                <Heart
                    key={index}
                    className="absolute animate-float-slow text-[var(--x-accent)]"
                    fill="currentColor"
                    strokeWidth={0}
                    style={{
                        left: heart.left,
                        top: heart.top,
                        width: heart.size,
                        height: heart.size,
                        opacity: 0.22,
                        filter: `blur(${heart.blur}px)`,
                        animationDelay: `${heart.delay}s`,
                    }}
                />
            ))}
        </div>
    );
}

/**
 * Owner-only switches for the hearts heading and the hearts background.
 * Saved like any other inline edit.
 */
export function SongStyleSwitch({
    ornament,
    background,
}: {
    ornament: DigitalExperience['song_ornament'];
    background: DigitalExperience['song_background'];
}) {
    const { saveText } = useExperience();
    const [saving, setSaving] = useState<string | null>(null);

    const toggle = async (
        field: 'song_ornament' | 'song_background',
        value: string,
    ) => {
        if (saving) {
            return;
        }

        setSaving(field);
        await saveText(field, value);
        setSaving(null);
    };

    const options = [
        {
            field: 'song_ornament',
            label: 'Heart heading',
            active: ornament === 'hearts',
            next: ornament === 'hearts' ? 'none' : 'hearts',
        },
        {
            field: 'song_background',
            label: 'Heart background',
            active: background === 'hearts',
            next: background === 'hearts' ? 'theme' : 'hearts',
        },
    ] as const;

    return (
        <div
            className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1 rounded-full border border-white/20 bg-black/60 p-1 text-xs text-white/80 backdrop-blur"
            aria-label="Song section style"
        >
            {options.map((option) => (
                <button
                    key={option.field}
                    type="button"
                    aria-pressed={option.active}
                    disabled={saving !== null}
                    onClick={() => toggle(option.field, option.next)}
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors disabled:opacity-60',
                        option.active
                            ? 'bg-[var(--x-accent)] text-[var(--x-accent-ink)]'
                            : 'hover:text-white',
                    )}
                >
                    <Heart
                        className="size-3"
                        fill={option.active ? 'currentColor' : 'none'}
                    />
                    {option.label}
                </button>
            ))}
        </div>
    );
}
