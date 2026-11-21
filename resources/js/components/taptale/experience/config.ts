import type { CSSProperties } from 'react';
import type { ExperienceTemplateKey } from '@/types';

export type ExperienceTheme = {
    label: string;
    background: string;
    surface: string;
    ink: string;
    muted: string;
    accent: string;
    accentInk: string;
    paper: string;
    paperInk: string;
    dark: boolean;
    pattern?: string;
};

const heartPattern = (color: string) =>
    `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='${color}'><path d='M30 42c-5-6-15-3-15 5 0 7 15 15 15 15s15-8 15-15c0-8-10-11-15-5z'/><path d='M88 92c-4-4.5-11-2.2-11 3.7 0 5.2 11 11 11 11s11-5.8 11-11c0-5.9-7-8.2-11-3.7z'/><circle cx='95' cy='30' r='2'/><circle cx='20' cy='100' r='1.6'/></g></svg>`,
    )}")`;

export const EXPERIENCE_THEMES: Record<string, ExperienceTheme> = {
    crimson: {
        label: 'Crimson love',
        background: '#8B1A22',
        surface: '#741219',
        ink: '#FFF6F0',
        muted: 'rgb(255 246 240 / 0.75)',
        accent: '#F6C9C4',
        accentInk: '#741219',
        paper: '#FFFDF8',
        paperInk: '#3A2A2A',
        dark: true,
        pattern: heartPattern('rgba(255,255,255,0.06)'),
    },
    rose: {
        label: 'Dusty rose',
        background: '#B3605E',
        surface: '#A15250',
        ink: '#FFF7F2',
        muted: 'rgb(255 247 242 / 0.78)',
        accent: '#FFE0D8',
        accentInk: '#8E3F3D',
        paper: '#FFFBF6',
        paperInk: '#4A3030',
        dark: true,
        pattern: heartPattern('rgba(120,30,30,0.18)'),
    },
    blush: {
        label: 'Soft blush',
        background:
            'linear-gradient(180deg, #F7E2E6 0%, #FBF3EE 45%, #F5E1E8 100%)',
        surface: 'rgb(255 255 255 / 0.55)',
        ink: '#3A2A30',
        muted: '#7A6870',
        accent: '#B86F83',
        accentInk: '#FFFFFF',
        paper: '#FFFFFF',
        paperInk: '#3A2A30',
        dark: false,
    },
    plum: {
        label: 'Deep plum',
        background: '#3B1F2B',
        surface: '#4A2836',
        ink: '#F8EDF1',
        muted: 'rgb(248 237 241 / 0.72)',
        accent: '#E9C9C9',
        accentInk: '#3B1F2B',
        paper: '#FFFAF7',
        paperInk: '#3B1F2B',
        dark: true,
    },
    midnight: {
        label: 'Midnight',
        background: '#13111B',
        surface: '#1D1A28',
        ink: '#F4EFEA',
        muted: 'rgb(244 239 234 / 0.68)',
        accent: '#F2C6C2',
        accentInk: '#13111B',
        paper: '#FFFBF7',
        paperInk: '#2A2530',
        dark: true,
    },
    cream: {
        label: 'Classic cream',
        background: '#F8F3ED',
        surface: '#EFE6DC',
        ink: '#343039',
        muted: '#776D75',
        accent: '#A47E4E',
        accentInk: '#FFFFFF',
        paper: '#FFFFFF',
        paperInk: '#343039',
        dark: false,
    },
    sunset: {
        label: 'Beach sunset',
        background:
            'linear-gradient(180deg, #2B1B3D 0%, #6E3558 50%, #D9806A 100%)',
        surface: 'rgb(255 255 255 / 0.08)',
        ink: '#FFF4EE',
        muted: 'rgb(255 244 238 / 0.75)',
        accent: '#FFC9A8',
        accentInk: '#4A2440',
        paper: '#FFFBF6',
        paperInk: '#3D2A35',
        dark: true,
    },
    sage: {
        label: 'Garden sage',
        background: '#EEF2EA',
        surface: '#E1E8DB',
        ink: '#2F3B2A',
        muted: '#61705B',
        accent: '#7C9473',
        accentInk: '#FFFFFF',
        paper: '#FFFFFF',
        paperInk: '#2F3B2A',
        dark: false,
    },
};

export function themeFor(key: string): ExperienceTheme {
    return EXPERIENCE_THEMES[key] ?? EXPERIENCE_THEMES.blush;
}

/**
 * CSS variables consumed by every section (`var(--x-ink)` etc.).
 */
export function themeStyle(theme: ExperienceTheme): CSSProperties {
    return {
        '--x-bg': theme.background,
        '--x-surface': theme.surface,
        '--x-ink': theme.ink,
        '--x-muted': theme.muted,
        '--x-accent': theme.accent,
        '--x-accent-ink': theme.accentInk,
        '--x-paper': theme.paper,
        '--x-paper-ink': theme.paperInk,
        background: theme.pattern
            ? `${theme.pattern}, ${theme.background}`
            : theme.background,
        color: theme.ink,
    } as CSSProperties;
}

export type GateKind = 'envelope' | 'question' | 'tap' | null;

export type SectionKey =
    | 'hero_photo'
    | 'hero_script'
    | 'hero_doily'
    | 'note'
    | 'letter_card'
    | 'letter_paper'
    | 'polaroid_wall'
    | 'film_strip'
    | 'timeline'
    | 'gifts'
    | 'scrapbook'
    | 'song'
    | 'player'
    | 'gallery'
    | 'video'
    | 'quote'
    | 'countdown'
    | 'details'
    | 'closing';

export type ExperiencePreset = {
    gate: GateKind;
    sections: SectionKey[];
    labels?: Partial<{
        gate: string;
        gateHint: string;
        note: string;
        filmStrip: string;
        filmCaption: string;
        timeline: string;
        gallery: string;
        song: string;
        gifts: string;
        countdown: string;
        question: string;
        closing: string;
    }>;
};

export const EXPERIENCE_PRESETS: Record<
    ExperienceTemplateKey,
    ExperiencePreset
> = {
    monthsary: {
        gate: 'envelope',
        sections: [
            'hero_photo',
            'letter_card',
            'polaroid_wall',
            'film_strip',
            'letter_paper',
            'scrapbook',
            'song',
            'quote',
            'closing',
        ],
    },
    birthday: {
        gate: 'tap',
        sections: [
            'hero_photo',
            'note',
            'gallery',
            'song',
            'video',
            'quote',
            'closing',
        ],
        labels: {
            closing: 'Happy birthday, my love',
            gate: 'A birthday surprise',
            note: 'A little note',
            gallery: 'Moments I love with you',
            song: 'A birthday song for you',
        },
    },
    love_story: {
        gate: null,
        sections: ['note', 'timeline', 'quote', 'gallery', 'song', 'closing'],
    },
    little_something: {
        gate: 'tap',
        sections: ['hero_script', 'gifts', 'letter_paper', 'quote', 'closing'],
        labels: { gate: 'A little something for you' },
    },
    girlfriends_day: {
        gate: 'envelope',
        sections: [
            'hero_doily',
            'letter_paper',
            'scrapbook',
            'film_strip',
            'song',
            'closing',
        ],
        labels: {
            gate: 'Hi baby! Got a mail for you',
            filmStrip: 'My favorite girl',
        },
    },
    valentines: {
        gate: 'question',
        sections: [
            'hero_script',
            'letter_card',
            'polaroid_wall',
            'song',
            'quote',
            'closing',
        ],
    },
    apology: {
        gate: 'question',
        sections: [
            'hero_script',
            'letter_paper',
            'gallery',
            'quote',
            'closing',
        ],
        labels: {
            closing: 'I love you, always',
            question: 'Will you forgive me?',
            gallery: 'The moments worth fixing it for',
        },
    },
    our_song: {
        gate: 'tap',
        sections: ['player', 'letter_card', 'gallery', 'quote', 'closing'],
        labels: { gate: 'Press play on our song' },
    },
    anniversary: {
        gate: 'envelope',
        sections: [
            'hero_photo',
            'film_strip',
            'timeline',
            'letter_paper',
            'song',
            'closing',
        ],
        labels: {
            filmStrip: 'Our year in frames',
            timeline: 'Every chapter of us',
        },
    },
    wedding: {
        gate: null,
        sections: [
            'hero_photo',
            'note',
            'countdown',
            'timeline',
            'gallery',
            'video',
            'song',
            'quote',
            'closing',
        ],
        labels: {
            closing: 'Thank you for celebrating with us',
            note: 'With love and gratitude',
            timeline: 'Our love story',
            gallery: 'Our wedding album',
            song: 'Our wedding song',
            countdown: 'Until forever',
        },
    },
    save_the_date: {
        gate: 'envelope',
        sections: ['hero_script', 'countdown', 'details', 'gallery', 'closing'],
        labels: {
            closing: 'See you there!',
            gate: "You're invited!",
            gateHint: 'Tap the seal to open your invitation',
            countdown: 'Counting down',
            gallery: 'Us',
        },
    },
    bestie: {
        gate: 'tap',
        sections: [
            'hero_script',
            'scrapbook',
            'film_strip',
            'polaroid_wall',
            'letter_card',
            'song',
            'closing',
        ],
        labels: {
            closing: 'Love you, bestie!',
            gate: 'For my favorite person',
            filmCaption: 'Best friends forever!',
        },
    },
    family: {
        gate: null,
        sections: ['hero_photo', 'note', 'gallery', 'quote', 'closing'],
        labels: {
            closing: 'With love and gratitude',
            note: 'A blessing to our family',
            gallery: 'Our little moments',
        },
    },
    graduation: {
        gate: null,
        sections: [
            'hero_photo',
            'note',
            'polaroid_wall',
            'gallery',
            'quote',
            'closing',
        ],
        labels: {
            closing: 'The best is yet to come',
            note: 'We are so proud of you',
            gallery: 'The journey',
        },
    },
    classic: {
        gate: null,
        sections: [
            'hero_script',
            'gallery',
            'note',
            'video',
            'song',
            'closing',
        ],
        labels: { closing: 'Every tap tells our story' },
    },
};

export function presetFor(key: string): ExperiencePreset {
    return (
        EXPERIENCE_PRESETS[key as ExperienceTemplateKey] ??
        EXPERIENCE_PRESETS.classic
    );
}

/**
 * Convert a YouTube, Vimeo or Spotify share link into an embeddable URL.
 */
export function embedFor(
    url: string | null | undefined,
): { src: string; kind: 'video' | 'spotify' } | null {
    if (!url) {
        return null;
    }

    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\.|^m\./, '');

        if (host === 'youtube.com' || host === 'music.youtube.com') {
            const id =
                parsed.searchParams.get('v') ??
                parsed.pathname.match(/\/(shorts|embed)\/([\w-]+)/)?.[2];

            return id
                ? {
                      src: `https://www.youtube-nocookie.com/embed/${id}`,
                      kind: 'video',
                  }
                : null;
        }

        if (host === 'youtu.be') {
            return {
                src: `https://www.youtube-nocookie.com/embed${parsed.pathname}`,
                kind: 'video',
            };
        }

        if (host === 'vimeo.com') {
            const id = parsed.pathname.split('/').filter(Boolean).pop();

            return id
                ? { src: `https://player.vimeo.com/video/${id}`, kind: 'video' }
                : null;
        }

        if (host === 'open.spotify.com') {
            const match = parsed.pathname.match(
                /\/(track|album|playlist|episode)\/([\w]+)/,
            );

            return match
                ? {
                      src: `https://open.spotify.com/embed/${match[1]}/${match[2]}`,
                      kind: 'spotify',
                  }
                : null;
        }
    } catch {
        return null;
    }

    return null;
}

/**
 * Parse a free-text date ("December 12, 2026") for the countdown.
 */
export function parseEventDate(value: string | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
