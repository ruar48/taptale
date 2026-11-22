import { Music, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { embedFor } from "@/components/taptale/experience/config";
import {
    EditableText,
    useExperience,
    useExperienceAudio,
} from "@/components/taptale/experience/shared";
import { cn } from "@/lib/utils";
import { lookup } from "@/routes/songs";

type LyricLine = { time: number; text: string };

type SongDetails = {
    title: string;
    artist: string | null;
    artwork_url: string | null;
    preview_url: string | null;
    track_url: string | null;
    duration: number | null;
    synced_lyrics: LyricLine[];
    plain_lyrics: string[];
};

const BAR_COUNT = 64;

/**
 * Album art, a preview clip and lyrics from the free iTunes Search and
 * LRCLIB APIs, fetched through our own cached endpoint.
 */
function useSongDetails(title: string | null, artist: string | null) {
    const [details, setDetails] = useState<SongDetails | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!title) {
            setDetails(null);

            return;
        }

        const controller = new AbortController();
        setLoading(true);

        fetch(
            lookup.url({
                query: { title, ...(artist ? { artist } : {}) },
            }),
            {
                headers: { Accept: "application/json" },
                signal: controller.signal,
            },
        )
            .then((response) => (response.ok ? response.json() : null))
            .then((data: SongDetails | null) => setDetails(data))
            .catch(() => undefined)
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [title, artist]);

    return { details, loading };
}

/**
 * Reads playback position every frame while the song plays.
 */
function usePlaybackClock(
    getElement: () => HTMLAudioElement | null,
    playing: boolean,
) {
    const [clock, setClock] = useState({ current: 0, duration: 0 });

    useEffect(() => {
        let frame = 0;

        const read = () => {
            const element = getElement();

            if (element) {
                setClock({
                    current: element.currentTime,
                    duration: Number.isFinite(element.duration)
                        ? element.duration
                        : 0,
                });
            }

            if (playing) {
                frame = requestAnimationFrame(read);
            }
        };

        read();

        return () => cancelAnimationFrame(frame);
    }, [getElement, playing]);

    return clock;
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
        return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);

    return `${minutes}:${rest.toString().padStart(2, "0")}`;
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
        <div className="relative">
            <div
                className={cn(
                    "relative aspect-square w-full rounded-full shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)]",
                    spinning && "animate-[spin_6s_linear_infinite]",
                )}
                style={{
                    background:
                        "repeating-radial-gradient(circle, #111 0 2px, #1d1d1d 2px 4px)",
                }}
            >
                <div className="absolute inset-[30%] overflow-hidden rounded-full bg-[var(--x-accent)] text-[var(--x-accent-ink)]">
                    {artwork ? (
                        <img
                            src={artwork}
                            alt=""
                            className="size-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <span className="absolute inset-x-2 top-[18%] line-clamp-1 text-center text-[9px] font-semibold tracking-wide uppercase">
                            {label ?? "Our song"}
                        </span>
                    )}
                </div>
                <div className="absolute inset-[47.5%] rounded-full bg-[#111] ring-2 ring-white/20" />
                <div className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgb(255_255_255/0.14),transparent_40%,rgb(255_255_255/0.06)_60%,transparent)]" />
            </div>
            {/* Tonearm swings onto the record while it plays. */}
            <div
                className={cn(
                    "absolute -top-[4%] -right-[6%] h-[62%] w-[8%] origin-[50%_6%] transition-transform duration-700",
                    spinning ? "rotate-[22deg]" : "rotate-[2deg]",
                )}
            >
                <div className="mx-auto size-[180%] -translate-x-[22%] rounded-full bg-gradient-to-br from-zinc-200 to-zinc-500 shadow-md" />
                <div className="mx-auto -mt-[40%] h-full w-[28%] rounded-full bg-gradient-to-b from-zinc-200 to-zinc-400" />
                <div className="mx-auto -mt-[10%] h-[14%] w-[90%] rounded-sm bg-zinc-700" />
            </div>
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
            role={onSeek ? "slider" : undefined}
            aria-label="Song progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            onClick={handleClick}
            className={cn(
                "flex h-16 items-center gap-[2px] sm:h-20",
                onSeek && "cursor-pointer",
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
                                "w-full rounded-full transition-colors duration-300",
                                played
                                    ? "bg-[var(--x-accent)]"
                                    : "bg-[var(--x-ink)] opacity-25",
                                playing && "animate-soundwave",
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
    const containerRef = useRef<HTMLDivElement>(null);
    const lines = synced.length > 0 ? synced.map((line) => line.text) : plain;

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

    useEffect(() => {
        const container = containerRef.current;
        const line = container?.querySelector<HTMLElement>(
            `[data-line="${activeIndex}"]`,
        );

        if (!container || !line) {
            return;
        }

        container.scrollTo({
            top:
                line.offsetTop -
                container.clientHeight / 2 +
                line.clientHeight / 2,
            behavior: "smooth",
        });
    }, [activeIndex]);

    if (lines.length === 0) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative overflow-y-auto overscroll-contain px-1 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] [scrollbar-width:none]",
                compact ? "h-48" : "h-64 sm:h-72",
            )}
        >
            <div className="py-[40%] text-center md:text-left">
                {lines.map((text, index) => (
                    <p
                        key={index}
                        data-line={index}
                        className={cn(
                            "font-display leading-snug transition-all duration-500",
                            compact
                                ? "py-1 text-lg"
                                : "py-1.5 text-xl sm:text-2xl",
                            !isSynced && "opacity-80",
                            isSynced &&
                                (index === activeIndex
                                    ? "scale-[1.02] font-semibold text-[var(--x-accent)] opacity-100"
                                    : index < activeIndex
                                      ? "opacity-35"
                                      : "opacity-55"),
                            text === "" && "h-4",
                        )}
                    >
                        {text || "♪"}
                    </p>
                ))}
            </div>
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
    );
    const embed = embedFor(experience.music_url);

    const previewRef = useRef<HTMLAudioElement>(null);
    const [previewPlaying, setPreviewPlaying] = useState(false);

    // Prefer the customer's uploaded song; fall back to the 30-second preview.
    const usingPreview = !pageAudio.available && !!details?.preview_url;
    const playing = usingPreview ? previewPlaying : pageAudio.playing;
    const canPlay = pageAudio.available || usingPreview;

    const pageElement = pageAudio.getElement;
    const getElement = useCallback(
        () => (usingPreview ? previewRef.current : pageElement()),
        [usingPreview, pageElement],
    );

    const clock = usePlaybackClock(getElement, playing);
    const duration = clock.duration || details?.duration || 0;
    const progress = duration > 0 ? clock.current / duration : 0;

    const bars = useMemo(
        () =>
            waveformFor(
                `${experience.song_title ?? ""}${experience.song_artist ?? ""}`,
            ),
        [experience.song_title, experience.song_artist],
    );

    const toggle = () => {
        if (!usingPreview) {
            pageAudio.toggle();

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
        const element = getElement();

        if (element && Number.isFinite(element.duration)) {
            element.currentTime = fraction * element.duration;
        }
    };

    const hasLyrics =
        (details?.synced_lyrics.length ?? 0) > 0 ||
        (details?.plain_lyrics.length ?? 0) > 0;

    return (
        <div
            className={cn(
                "grid items-center gap-10",
                !compact && "md:grid-cols-[0.85fr_1.15fr] md:gap-14",
            )}
        >
            {usingPreview && details?.preview_url && (
                <audio
                    ref={previewRef}
                    src={details.preview_url}
                    preload="none"
                    onEnded={() => setPreviewPlaying(false)}
                />
            )}

            <div
                className={cn(
                    "mx-auto w-full",
                    compact ? "max-w-[12rem]" : "max-w-[18rem] sm:max-w-xs",
                )}
            >
                <Vinyl
                    spinning={playing}
                    label={experience.song_title}
                    artwork={details?.artwork_url ?? null}
                />
            </div>

            <div className="min-w-0">
                <div className="flex items-center gap-4">
                    {canPlay && (
                        <button
                            type="button"
                            onClick={toggle}
                            className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--x-accent)] text-[var(--x-accent-ink)] shadow-lg transition hover:scale-105"
                            aria-label={
                                playing ? "Pause our song" : "Play our song"
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
                            className="truncate font-display text-2xl sm:text-3xl"
                        >
                            {experience.song_title}
                        </EditableText>
                        <EditableText
                            block
                            field="song_artist"
                            value={experience.song_artist}
                            placeholder="Add the artist"
                            label="Artist"
                            className="truncate opacity-70"
                        >
                            {experience.song_artist}
                        </EditableText>
                    </div>
                </div>

                <div className="mt-6">
                    <Waveform
                        bars={bars}
                        progress={progress}
                        playing={playing}
                        onSeek={canPlay && duration > 0 ? seek : undefined}
                    />
                    <div className="mt-1 flex justify-between text-xs tabular-nums opacity-60">
                        <span>{formatTime(clock.current)}</span>
                        <span>
                            {usingPreview && "Preview · "}
                            {formatTime(duration)}
                        </span>
                    </div>
                </div>

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
                    <div className="mt-6">
                        <Lyrics
                            synced={details.synced_lyrics}
                            plain={details.plain_lyrics}
                            current={clock.current}
                            isSynced={
                                !usingPreview &&
                                pageAudio.available &&
                                details.synced_lyrics.length > 0
                            }
                            compact={compact}
                        />
                    </div>
                )}

                {embed && (
                    <div
                        className={cn(
                            "mt-6 overflow-hidden rounded-2xl shadow-xl",
                            embed.kind === "video"
                                ? "aspect-video"
                                : "h-[152px]",
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
                                Lyrics via{" "}
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
                        {hasLyrics && details.track_url && " · "}
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
    );
}
