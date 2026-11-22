import { Music, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { embedFor, youTubeIdFor } from '@/components/taptale/experience/config';
import {
    EditableText,
    useExperience,
    useExperienceAudio,
} from '@/components/taptale/experience/shared';
import { useYouTubePlayer } from '@/components/taptale/experience/youtube-player';
import { cn } from '@/lib/utils';
import { lookup } from '@/routes/songs';
import type { SongDetails } from '@/types';

type LyricLine = SongDetails['synced_lyrics'][number];

type Clock = { current: number; duration: number };

const BAR_COUNT = 64;

/**
 * Album art, a preview clip and lyrics. Saved on the experience when the
 * song is added; demos fall back to our cached lookup endpoint.
 */
function useSongDetails(
    title: string | null,
    artist: string | null,
    saved: SongDetails | null,
) {
    const [fetched, setFetched] = useState<SongDetails | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!title || saved) {
            setFetched(null);

            return;
        }

        const controller = new AbortController();
        setLoading(true);

        fetch(
            lookup.url({
                query: { title, ...(artist ? { artist } : {}) },
            }),
            {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            },
        )
            .then((response) => (response.ok ? response.json() : null))
            .then((data: SongDetails | null) => setFetched(data))
            .catch(() => undefined)
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [title, artist, saved]);

    return { details: saved ?? fetched, loading };
}

/**
 * Reads playback position every frame while the song plays.
 */
function usePlaybackClock(read: () => Clock | null, playing: boolean) {
    const [clock, setClock] = useState<Clock>({ current: 0, duration: 0 });

    useEffect(() => {
        let frame = 0;

        const tick = () => {
            const next = read();

            if (next) {
                setClock(next);
            }

            if (playing) {
                frame = requestAnimationFrame(tick);
            }
        };

        tick();

        return () => cancelAnimationFrame(frame);
    }, [read, playing]);

    return clock;
}

function clockFrom(element: HTMLAudioElement | null): Clock | null {
    if (!element) {
        return null;
    }

    return {
        current: element.currentTime,
        duration: Number.isFinite(element.duration) ? element.duration : 0,
    };
}

/** Deterministic bar heights so each song gets its own waveform shape. */
function waveformFor(seed: string): number[] {
    let hash = 2166136261;

    for (const character of seed) {
        hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    }

    return Array.from({ length: BAR_COUNT }, (_, index) => {
        hash = Math.imul(hash ^ (hash >>> 15), 2246822507) ^ index;
        const noise = ((hash >>> 0) % 1000) / 1000;
        const envelope = Math.sin((index / (BAR_COUNT - 1)) * Math.PI);

        return 0.18 + 0.82 * (0.35 * envelope + 0.65 * noise * envelope + 0.1);
    });
}

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return '0:00';
    }

    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);

    return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

function Vinyl({
    spinning,
    label,
    artwork,
}: {
    spinning: boolean;
    label: string | null;
    artwork: string | null;
}) {
    return (
        <div className="relative pr-[16%]">
            <div
                className={cn(
                    'relative aspect-square w-full rounded-full shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)] ring-1 ring-white/5',
                    spinning && 'animate-[spin_5s_linear_infinite]',
                )}
                style={{
                    background:
                        'repeating-radial-gradient(circle, #121212 0 1.5px, #1c1c1c 1.5px 3px)',
                }}
            >
                <div className="absolute inset-[31%] overflow-hidden rounded-full bg-[var(--x-accent)] text-[var(--x-accent-ink)] ring-4 ring-black/40">
                    {artwork ? (
                        <img
                            src={artwork}
                            alt=""
                            className="size-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <span className="absolute inset-x-3 top-[20%] line-clamp-2 text-center text-[10px] font-semibold tracking-wide uppercase">
                            {label ?? 'Our song'}
                        </span>
                    )}
                </div>
                <div className="absolute inset-[48%] rounded-full bg-[#0d0d0d] ring-1 ring-white/30" />
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_30deg,transparent_0deg,rgb(255_255_255/0.10)_40deg,transparent_90deg,transparent_180deg,rgb(255_255_255/0.07)_220deg,transparent_270deg)]" />
            </div>

            {/* Tonearm: rests beside the record, swings onto it while playing. */}
            <svg
                viewBox="0 0 60 240"
                aria-hidden
                className={cn(
                    'absolute top-[-4%] right-0 w-[22%] origin-[50%_12%] drop-shadow-[0_8px_10px_rgb(0_0_0/0.45)] transition-transform duration-1000 ease-out',
                    spinning ? 'rotate-[24deg]' : 'rotate-[4deg]',
                )}
            >
                <defs>
                    <linearGradient id="tonearm-metal" x1="0" x2="1">
                        <stop offset="0" stopColor="#f4f4f5" />
                        <stop offset="1" stopColor="#a1a1aa" />
                    </linearGradient>
                </defs>
                <circle cx="30" cy="28" r="22" fill="#27272a" />
                <circle cx="30" cy="28" r="15" fill="url(#tonearm-metal)" />
                <circle cx="30" cy="28" r="5" fill="#3f3f46" />
                <path
                    d="M30 28 L30 178 L18 206"
                    fill="none"
                    stroke="url(#tonearm-metal)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <rect
                    x="6"
                    y="200"
                    width="20"
                    height="30"
                    rx="3"
                    transform="rotate(25 16 215)"
                    fill="#3f3f46"
                />
            </svg>
        </div>
    );
}

function Waveform({
    bars,
    progress,
    playing,
    onSeek,
}: {
    bars: number[];
    progress: number;
    playing: boolean;
    onSeek?: (fraction: number) => void;
}) {
    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
        if (!onSeek) {
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        onSeek(
            Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
        );
    };

    return (
        <div
            role={onSeek ? 'slider' : undefined}
            aria-label="Song progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            onClick={handleClick}
            className={cn(
                'flex h-16 items-center gap-[2px] sm:h-20',
                onSeek && 'cursor-pointer',
            )}
        >
            {bars.map((height, index) => {
                const played = index / bars.length < progress;

                return (
                    <span
                        key={index}
                        className="flex h-full flex-1 items-center"
                    >
                        <span
                            className={cn(
                                'w-full rounded-full transition-colors duration-300',
                                played
                                    ? 'bg-[var(--x-accent)]'
                                    : 'bg-[var(--x-ink)] opacity-25',
                                playing && 'animate-soundwave',
                            )}
                            style={{
                                height: `${height * 100}%`,
                                animationDelay: `${(index % 9) * -0.12}s`,
                            }}
                        />
                    </span>
                );
            })}
        </div>
    );
}

/**
 * One lyric line at a time. The colour wipes across the words while it is
 * sung, then the next line rises in to replace it.
 */
function Lyrics({
    synced,
    plain,
    current,
    isSynced,
    compact,
}: {
    synced: LyricLine[];
    plain: string[];
    current: number;
    isSynced: boolean;
    compact: boolean;
}) {
    const activeIndex = useMemo(() => {
        if (!isSynced) {
            return -1;
        }

        let index = -1;

        for (let i = 0; i < synced.length; i++) {
            if (synced[i].time <= current) {
                index = i;
            } else {
                break;
            }
        }

        return index;
    }, [synced, current, isSynced]);

    const firstLine = synced[0]?.text ?? plain[0] ?? null;

    if (!firstLine) {
        return null;
    }

    let text: string;
    let fill = 0;

    if (!isSynced || activeIndex < 0) {
        // Before the singing starts (or no timing): show the opening line dimmed.
        text = firstLine;
    } else {
        const start = synced[activeIndex].time;
        const next = synced[activeIndex + 1]?.time ?? start + 4;
        const singing = Math.max(0.6, Math.min(next - start, 6) * 0.9);

        text = synced[activeIndex].text || '♪ ♪ ♪';
        fill = Math.round(
            Math.min(1, Math.max(0, (current - start) / singing)) * 100,
        );
    }

    const active = isSynced && activeIndex >= 0;

    return (
        <div
            aria-live="off"
            className={cn(
                'pointer-events-none flex items-center select-none',
                compact ? 'min-h-24 justify-center' : 'min-h-24 sm:min-h-40',
            )}
        >
            <p
                key={activeIndex}
                className={cn(
                    'animate-fade-up font-display leading-tight font-semibold text-balance',
                    compact
                        ? 'text-center text-2xl'
                        : 'text-xl sm:text-3xl md:text-4xl lg:text-[2.6rem]',
                    !active && 'opacity-50',
                )}
            >
                {/*
                 * Inline span: its background is painted as one strip across
                 * wrapped rows, so the wipe follows reading order.
                 */}
                <span
                    style={
                        active
                            ? {
                                  backgroundImage: `linear-gradient(90deg, var(--x-accent) ${fill}%, color-mix(in srgb, var(--x-ink) 45%, transparent) ${fill}%)`,
                                  WebkitBackgroundClip: 'text',
                                  backgroundClip: 'text',
                                  WebkitBoxDecorationBreak: 'slice',
                                  boxDecorationBreak: 'slice',
                                  color: 'transparent',
                              }
                            : undefined
                    }
                >
                    {text}
                </span>
            </p>
        </div>
    );
}

/**
 * Soundtrack-style player for the memory page song: spinning vinyl, an
 * animated waveform and lyrics that follow along with the music.
 */
export function SongPlayer({ compact = false }: { compact?: boolean }) {
    const { experience } = useExperience();
    const pageAudio = useExperienceAudio();
    const { details, loading } = useSongDetails(
        experience.song_title,
        experience.song_artist,
        experience.song_details,
    );

    const previewRef = useRef<HTMLAudioElement>(null);
    const [previewPlaying, setPreviewPlaying] = useState(false);

    /*
     * Source priority: the customer's uploaded song, then the official
     * YouTube video (full song), then the 30-second iTunes preview.
     */
    const youTubeId = pageAudio.available
        ? null
        : youTubeIdFor(experience.music_url);
    const youTube = useYouTubePlayer(youTubeId);
    const source: 'upload' | 'youtube' | 'preview' | 'none' =
        pageAudio.available
            ? 'upload'
            : youTubeId
              ? 'youtube'
              : details?.preview_url
                ? 'preview'
                : 'none';
    const embed = source === 'youtube' ? null : embedFor(experience.music_url);

    const playing =
        source === 'upload'
            ? pageAudio.playing
            : source === 'youtube'
              ? youTube.playing
              : previewPlaying;
    const canPlay =
        source === 'upload' ||
        source === 'preview' ||
        (source === 'youtube' && youTube.ready);
    const fullSong = source === 'upload' || source === 'youtube';

    const pageElement = pageAudio.getElement;
    const youTubeClock = youTube.readClock;
    const readClock = useCallback(
        () =>
            source === 'youtube'
                ? youTubeClock()
                : clockFrom(
                      source === 'upload' ? pageElement() : previewRef.current,
                  ),
        [source, pageElement, youTubeClock],
    );

    const clock = usePlaybackClock(readClock, playing);
    const duration =
        clock.duration || (fullSong ? (details?.duration ?? 0) : 0);
    const progress = duration > 0 ? clock.current / duration : 0;

    const bars = useMemo(
        () =>
            waveformFor(
                `${experience.song_title ?? ''}${experience.song_artist ?? ''}`,
            ),
        [experience.song_title, experience.song_artist],
    );

    const toggle = () => {
        if (source === 'upload') {
            pageAudio.toggle();

            return;
        }

        if (source === 'youtube') {
            youTube.toggle();

            return;
        }

        const preview = previewRef.current;

        if (!preview) {
            return;
        }

        if (preview.paused) {
            void preview
                .play()
                .then(() => setPreviewPlaying(true))
                .catch(() => setPreviewPlaying(false));
        } else {
            preview.pause();
            setPreviewPlaying(false);
        }
    };

    const seek = (fraction: number) => {
        if (source === 'youtube') {
            youTube.seek(fraction * duration);

            return;
        }

        const element =
            source === 'upload' ? pageElement() : previewRef.current;

        if (element && Number.isFinite(element.duration)) {
            element.currentTime = fraction * element.duration;
        }
    };

    const hasLyrics =
        (details?.synced_lyrics.length ?? 0) > 0 ||
        (details?.plain_lyrics.length ?? 0) > 0;
    const showsLyricsColumn = (loading && !details) || (!!details && hasLyrics);
    const hasMedia = !!youTubeId || !!embed;

    /*
     * On phones the full-size layout keeps the desktop feel: the record sits
     * beside the video, the play button beside the lyrics, and the waveform
     * runs underneath. The two column wrappers become `contents` there so
     * their children share one grid; from `md` up they are regular columns.
     */
    const place = (mobile: string) => (compact ? '' : mobile);

    return (
        <div
            className={cn(
                'grid items-center',
                compact
                    ? 'gap-10'
                    : 'grid-cols-12 gap-y-6 md:grid-cols-[0.85fr_1.15fr] md:gap-14',
            )}
        >
            {source === 'preview' && details?.preview_url && (
                <audio
                    ref={previewRef}
                    src={details.preview_url}
                    preload="none"
                    onEnded={() => setPreviewPlaying(false)}
                />
            )}

            <div
                className={cn(
                    compact
                        ? 'mx-auto w-full max-w-[14rem]'
                        : 'contents md:mx-auto md:block md:w-full md:max-w-sm',
                )}
            >
                <div
                    className={place(
                        hasMedia
                            ? 'max-md:col-span-4 max-md:col-start-1 max-md:row-start-1'
                            : 'max-md:col-span-12 max-md:row-start-1 max-md:mx-auto max-md:w-full max-md:max-w-[16rem]',
                    )}
                >
                    <Vinyl
                        spinning={playing}
                        label={experience.song_title}
                        artwork={details?.artwork_url ?? null}
                    />
                </div>

                {/* On phones the waveform runs faded behind the title and lyrics. */}
                <div
                    className={cn(
                        'mt-8',
                        place(
                            'max-md:col-span-12 max-md:row-start-2 max-md:mt-0 max-md:self-center max-md:opacity-30',
                        ),
                    )}
                >
                    <Waveform
                        bars={bars}
                        progress={progress}
                        playing={playing}
                        onSeek={canPlay && duration > 0 ? seek : undefined}
                    />
                </div>
                <div
                    className={cn(
                        'mt-1 flex justify-between text-xs tabular-nums opacity-60',
                        place(
                            'max-md:col-span-12 max-md:row-start-3 max-md:-mt-3',
                        ),
                    )}
                >
                    <span>{formatTime(clock.current)}</span>
                    <span>
                        {source === 'preview' && 'Preview · '}
                        {formatTime(duration)}
                    </span>
                </div>

                <div
                    className={cn(
                        'mt-6 flex min-w-0 items-center gap-4',
                        place(
                            cn(
                                'max-md:relative max-md:z-10 max-md:row-start-2 max-md:mt-0 max-md:gap-3',
                                showsLyricsColumn
                                    ? 'max-md:col-span-6 max-md:col-start-1'
                                    : 'max-md:col-span-12',
                            ),
                        ),
                    )}
                >
                    {canPlay && (
                        <button
                            type="button"
                            onClick={toggle}
                            className={cn(
                                'relative flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--x-accent)] text-[var(--x-accent-ink)] shadow-lg transition hover:scale-105',
                                place('max-md:size-12'),
                            )}
                            aria-label={
                                playing ? 'Pause our song' : 'Play our song'
                            }
                        >
                            {playing ? (
                                <Pause className="size-6" fill="currentColor" />
                            ) : (
                                <Play
                                    className="ml-0.5 size-6"
                                    fill="currentColor"
                                />
                            )}
                            {playing && (
                                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--x-accent)] opacity-25" />
                            )}
                        </button>
                    )}
                    <div className="min-w-0 text-left">
                        <EditableText
                            block
                            field="song_title"
                            value={experience.song_title}
                            placeholder="Add the song title"
                            label="Song title"
                            className={cn(
                                'truncate font-display text-2xl sm:text-3xl',
                                place('max-sm:text-xl'),
                            )}
                        >
                            {experience.song_title}
                        </EditableText>
                        <EditableText
                            block
                            field="song_artist"
                            value={experience.song_artist}
                            placeholder="Add the artist"
                            label="Artist"
                            className={cn(
                                'truncate opacity-70',
                                place('max-sm:text-sm'),
                            )}
                        >
                            {experience.song_artist}
                        </EditableText>
                    </div>
                </div>
            </div>

            <div
                className={cn(
                    compact ? 'min-w-0' : 'contents md:block md:min-w-0',
                )}
            >
                {showsLyricsColumn && (
                    <div
                        className={cn(
                            'min-w-0',
                            place(
                                'max-md:relative max-md:z-10 max-md:col-span-6 max-md:col-start-7 max-md:row-start-2 max-md:pl-3',
                            ),
                        )}
                    >
                        {loading && !details && (
                            <div className="mt-6 space-y-3">
                                {[70, 50, 80, 40].map((width) => (
                                    <div
                                        key={width}
                                        className="h-5 animate-pulse rounded-full bg-[var(--x-ink)] opacity-10"
                                        style={{ width: `${width}%` }}
                                    />
                                ))}
                            </div>
                        )}

                        {details && hasLyrics && (
                            <Lyrics
                                synced={details.synced_lyrics}
                                plain={details.plain_lyrics}
                                current={clock.current}
                                isSynced={
                                    fullSong && details.synced_lyrics.length > 0
                                }
                                compact={compact}
                            />
                        )}
                    </div>
                )}

                {hasMedia && (
                    <div
                        className={cn(
                            'mt-6 min-w-0',
                            place(
                                'max-md:col-span-8 max-md:col-start-5 max-md:row-start-1 max-md:mt-0 max-md:pl-3',
                            ),
                        )}
                    >
                        {youTubeId && (
                            <div className="overflow-hidden rounded-2xl bg-black/20 shadow-xl">
                                {/* YouTube asks for its player to stay visible (about 200px). */}
                                <div
                                    ref={youTube.containerRef}
                                    className={cn(
                                        'aspect-video min-h-[200px] w-full',
                                        place(
                                            'max-md:aspect-square max-md:min-h-0',
                                        ),
                                    )}
                                />
                            </div>
                        )}

                        {embed && (
                            <div
                                className={cn(
                                    'overflow-hidden rounded-2xl shadow-xl',
                                    embed.kind === 'video'
                                        ? 'aspect-video'
                                        : 'h-[152px]',
                                )}
                            >
                                <iframe
                                    src={embed.src}
                                    title="Our song"
                                    className="size-full"
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                    loading="lazy"
                                />
                            </div>
                        )}
                    </div>
                )}

                <div
                    className={cn(
                        'min-w-0',
                        place('max-md:col-span-12 max-md:row-start-4'),
                    )}
                >
                    {!embed && experience.music_url && (
                        <a
                            href={experience.music_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 inline-flex items-center gap-2 underline underline-offset-4"
                        >
                            <Music className="size-4" /> Listen to our song
                        </a>
                    )}

                    {details && (hasLyrics || details.preview_url) && (
                        <p className="mt-4 text-[11px] opacity-45">
                            {hasLyrics && (
                                <>
                                    Lyrics via{' '}
                                    <a
                                        href="https://lrclib.net"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline"
                                    >
                                        LRCLIB
                                    </a>
                                </>
                            )}
                            {hasLyrics && details.track_url && ' · '}
                            {details.track_url && (
                                <a
                                    href={details.track_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                >
                                    Listen on Apple Music
                                </a>
                            )}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
