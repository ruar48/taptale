import { Head, Link } from '@inertiajs/react';
import { Eye, Music, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { BrandLogo } from '@/components/taptale/brand-logo';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import type { DigitalExperience } from '@/types';

const THEMES: Record<
    string,
    { page: string; card: string; accent: string; muted: string }
> = {
    blush: {
        page: 'bg-gradient-to-b from-blush-light via-cream to-cream text-charcoal',
        card: 'bg-white/70',
        accent: 'text-rose',
        muted: 'text-charcoal/65',
    },
    plum: {
        page: 'bg-gradient-to-b from-plum via-plum-dark to-charcoal text-cream',
        card: 'bg-white/10',
        accent: 'text-blush',
        muted: 'text-cream/70',
    },
    cream: {
        page: 'bg-cream text-charcoal',
        card: 'bg-white',
        accent: 'text-plum',
        muted: 'text-charcoal/65',
    },
    midnight: {
        page: 'bg-gradient-to-b from-[#1F1B2E] via-[#191624] to-[#100e17] text-cream',
        card: 'bg-white/[0.06]',
        accent: 'text-blush',
        muted: 'text-cream/65',
    },
};

/**
 * Turn common video links into an embeddable URL. Unknown hosts are shown
 * as a plain link instead of being embedded.
 */
function embedUrl(url: string): string | null {
    try {
        const parsed = new URL(url);

        if (parsed.hostname.includes('youtube.com')) {
            const id = parsed.searchParams.get('v');

            return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
        }

        if (parsed.hostname === 'youtu.be') {
            return `https://www.youtube-nocookie.com/embed${parsed.pathname}`;
        }

        if (parsed.hostname.includes('vimeo.com')) {
            const id = parsed.pathname.split('/').filter(Boolean).pop();

            return id ? `https://player.vimeo.com/video/${id}` : null;
        }
    } catch {
        return null;
    }

    return null;
}

export default function Experience({
    experience,
    isPreview,
}: {
    experience: DigitalExperience;
    isPreview: boolean;
}) {
    const theme = THEMES[experience.theme] ?? THEMES.blush;
    const [lightbox, setLightbox] = useState<string | null>(null);
    const video = experience.video_url ? embedUrl(experience.video_url) : null;

    return (
        <div className={cn('min-h-screen', theme.page)}>
            <Head title={experience.title} />

            {isPreview && (
                <div className="sticky top-0 z-20 flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
                    <Eye className="size-4" /> Preview — only you can see this
                    page until you publish it.
                </div>
            )}

            <main className="mx-auto max-w-lg px-5 pt-14 pb-16">
                <header className="animate-fade-up text-center">
                    <p
                        className={cn(
                            'text-xs font-semibold tracking-[0.35em] uppercase',
                            theme.accent,
                        )}
                    >
                        A Taptale memory
                    </p>
                    <h1 className="mt-4 font-display text-5xl leading-tight font-medium text-balance">
                        {experience.title}
                    </h1>
                    {experience.subtitle && (
                        <p className={cn('mt-3 text-lg italic', theme.muted)}>
                            {experience.subtitle}
                        </p>
                    )}
                    {experience.event_date && (
                        <p
                            className={cn(
                                'mt-4 text-sm tracking-[0.3em] uppercase',
                                theme.accent,
                            )}
                        >
                            {experience.event_date}
                        </p>
                    )}
                </header>

                {experience.photos.length > 0 && (
                    <section className="mt-10 grid grid-cols-2 gap-3">
                        {experience.photos.map((photo, index) => (
                            <button
                                key={photo.index}
                                type="button"
                                onClick={() => setLightbox(photo.url)}
                                className={cn(
                                    'animate-fade-up overflow-hidden rounded-2xl shadow-lg',
                                    index === 0 &&
                                        experience.photos.length % 2 === 1 &&
                                        'col-span-2',
                                )}
                                style={{ animationDelay: `${index * 80}ms` }}
                            >
                                <img
                                    src={photo.url}
                                    alt=""
                                    loading="lazy"
                                    className={cn(
                                        'w-full object-cover',
                                        index === 0 &&
                                            experience.photos.length % 2 === 1
                                            ? 'aspect-[4/3]'
                                            : 'aspect-square',
                                    )}
                                />
                            </button>
                        ))}
                    </section>
                )}

                {experience.message && (
                    <section
                        className={cn(
                            'mt-10 rounded-3xl p-7 backdrop-blur',
                            theme.card,
                        )}
                    >
                        <p className="font-display text-xl leading-relaxed whitespace-pre-line italic">
                            “{experience.message}”
                        </p>
                    </section>
                )}

                {experience.video_url && (
                    <section className="mt-8">
                        {video ? (
                            <div className="aspect-video overflow-hidden rounded-3xl shadow-lg">
                                <iframe
                                    src={video}
                                    title="Video"
                                    className="size-full"
                                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        ) : (
                            <a
                                href={experience.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    'flex items-center gap-3 rounded-3xl p-5 backdrop-blur',
                                    theme.card,
                                )}
                            >
                                <PlayCircle
                                    className={cn('size-8', theme.accent)}
                                />{' '}
                                Watch our video
                            </a>
                        )}
                    </section>
                )}

                {experience.music_url && (
                    <a
                        href={experience.music_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            'mt-4 flex items-center gap-3 rounded-3xl p-5 backdrop-blur',
                            theme.card,
                        )}
                    >
                        <Music className={cn('size-7', theme.accent)} />
                        <span>
                            <span className="block font-medium">Our song</span>
                            <span className={cn('text-sm', theme.muted)}>
                                Tap to listen
                            </span>
                        </span>
                    </a>
                )}

                <footer className="mt-16 flex flex-col items-center gap-2 text-center">
                    <Link
                        href={home()}
                        className="opacity-80 transition hover:opacity-100"
                    >
                        <BrandLogo
                            inverted={
                                experience.theme === 'plum' ||
                                experience.theme === 'midnight'
                            }
                            className="scale-90"
                        />
                    </Link>
                    <p className={cn('text-xs', theme.muted)}>
                        Every tap tells a story.
                    </p>
                </footer>
            </main>

            {lightbox && (
                <button
                    type="button"
                    onClick={() => setLightbox(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
                    aria-label="Close photo"
                >
                    <img
                        src={lightbox}
                        alt=""
                        className="max-h-full max-w-full rounded-xl"
                    />
                </button>
            )}
        </div>
    );
}
