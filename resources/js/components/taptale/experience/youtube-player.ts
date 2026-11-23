import { useCallback, useEffect, useRef, useState } from "react";

/** The parts of the YouTube IFrame Player API we use. */
type YouTubePlayer = {
    playVideo: () => void;
    pauseVideo: () => void;
    mute: () => void;
    unMute: () => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    destroy: () => void;
};

type YouTubeNamespace = {
    Player: new (
        element: HTMLElement,
        options: {
            videoId: string;
            host?: string;
            width?: string;
            height?: string;
            playerVars?: Record<string, number | string>;
            events?: {
                onReady?: () => void;
                onStateChange?: (event: { data: number }) => void;
            };
        },
    ) => YouTubePlayer;
};

declare global {
    interface Window {
        YT?: YouTubeNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

const PLAYING = 1;
const BUFFERING = 3;

let apiPromise: Promise<YouTubeNamespace> | null = null;

/** Loads https://www.youtube.com/iframe_api once per page. */
function loadYouTubeApi(): Promise<YouTubeNamespace> {
    if (window.YT?.Player) {
        return Promise.resolve(window.YT);
    }

    apiPromise ??= new Promise((resolve) => {
        const previous = window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady = () => {
            previous?.();
            resolve(window.YT as YouTubeNamespace);
        };

        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.head.appendChild(script);
    });

    return apiPromise;
}

/**
 * Official YouTube player (full song, licensed by YouTube) that we can
 * control from our own play button and read the playback time from, so
 * the lyrics can follow along.
 */
export function useYouTubePlayer(videoId: string | null) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YouTubePlayer | null>(null);
    const [ready, setReady] = useState(false);
    const [playing, setPlaying] = useState(false);
    const playingRef = useRef(false);

    useEffect(() => {
        const container = containerRef.current;

        if (!videoId || !container) {
            return;
        }

        let cancelled = false;
        const mount = document.createElement("div");
        container.appendChild(mount);

        void loadYouTubeApi().then((YT) => {
            if (cancelled) {
                return;
            }

            playerRef.current = new YT.Player(mount, {
                videoId,
                host: "https://www.youtube-nocookie.com",
                width: "100%",
                height: "100%",
                playerVars: {
                    playsinline: 1,
                    rel: 0,
                    modestbranding: 1,
                },
                events: {
                    onReady: () => setReady(true),
                    onStateChange: ({ data }) => {
                        playingRef.current =
                            data === PLAYING || data === BUFFERING;
                        setPlaying(playingRef.current);
                    },
                },
            });
        });

        return () => {
            cancelled = true;
            playerRef.current?.destroy();
            playerRef.current = null;
            container.replaceChildren();
            setReady(false);
            setPlaying(false);
        };
    }, [videoId]);

    const toggle = useCallback(() => {
        const player = playerRef.current;

        if (!player) {
            return;
        }

        if (playing) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    }, [playing]);

    const play = useCallback(() => {
        playerRef.current?.playVideo();
    }, []);

    /**
     * Starts with sound when the browser allows it. Otherwise it starts
     * muted (always allowed) and resolves true so the caller can offer
     * "tap for sound".
     */
    const autoplay = useCallback(
        () =>
            new Promise<boolean>((resolve) => {
                const player = playerRef.current;

                if (!player) {
                    resolve(false);

                    return;
                }

                player.playVideo();

                window.setTimeout(() => {
                    if (playingRef.current || playerRef.current !== player) {
                        resolve(false);

                        return;
                    }

                    player.mute();
                    player.playVideo();
                    resolve(true);
                }, 1200);
            }),
        [],
    );

    const unmute = useCallback(() => {
        playerRef.current?.unMute();
    }, []);

    const seek = useCallback((seconds: number) => {
        playerRef.current?.seekTo(seconds, true);
    }, []);

    const readClock = useCallback(() => {
        const player = playerRef.current;

        if (!player || !ready) {
            return null;
        }

        return {
            current: player.getCurrentTime() || 0,
            duration: player.getDuration() || 0,
        };
    }, [ready]);

    return {
        containerRef,
        ready,
        playing,
        play,
        autoplay,
        unmute,
        toggle,
        seek,
        readClock,
    };
}
