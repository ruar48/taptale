import type { CSSProperties } from 'react';
import type { PhotoFrame } from '@/components/taptale/experience/photo-frames';
import { PhotoFill, useExperience } from '@/components/taptale/experience/shared';
import type { PhotoSlot } from '@/components/taptale/experience/shared';
import { cn } from '@/lib/utils';

/** One frame of film: its photo and where a photo added into it is kept. */
export type FilmFrame = {
    key: string | number;
    src: string | null;
    slot?: PhotoSlot;
    frame?: PhotoFrame;
};

/** Seconds each frame takes to slide past, so the roll moves slowly. */
const SECONDS_PER_FRAME = 6;

const SPROCKETS_ACROSS =
    'repeating-linear-gradient(90deg, transparent 0 10px, #F5F0E8 10px 22px, transparent 22px 34px)';
const SPROCKETS_DOWN =
    'repeating-linear-gradient(180deg, transparent 0 10px, #F5F0E8 10px 22px, transparent 22px 34px)';

/**
 * The roll only moves once every frame has a photo, so the owner can still
 * fill empty frames, and never for visitors who prefer less motion.
 */
function isRolling(frames: FilmFrame[]): boolean {
    return frames.length > 0 && frames.every((frame) => frame.src);
}

/**
 * Enough copies of the frames that one copy is longer than the screen, so
 * the loop never shows a gap. The roll is this list twice.
 */
function loopOf(frames: FilmFrame[], minimum: number): FilmFrame[] {
    const copies = Math.max(1, Math.ceil(minimum / frames.length));

    return Array.from({ length: copies }, () => frames).flat();
}

function FrameLabel({ number }: { number: number }) {
    return (
        <p className="mb-1 flex justify-between font-mono text-[9px] tracking-widest text-[#E8A33D]">
            <span>TAPTALE 400</span>
            <span>{number}A</span>
        </p>
    );
}

function FramePhoto({
    frame,
    className,
}: {
    frame: FilmFrame;
    className: string;
}) {
    const { openPhoto } = useExperience();

    return (
        <PhotoFill
            src={frame.src}
            className={className}
            slot={frame.slot}
            frame={frame.frame}
            onClick={frame.src ? () => openPhoto(frame.src ?? '') : undefined}
        />
    );
}

/**
 * A tilted film roll across the page that slowly slides by on its own and
 * loops, pausing while hovered.
 */
export function FilmRoll({ frames }: { frames: FilmFrame[] }) {
    const rolling = isRolling(frames);
    const half = rolling ? loopOf(frames, 6) : frames;
    const roll = rolling ? [...half, ...half] : half;

    return (
        <div
            className={cn(
                '-mx-5 mt-10 py-4',
                rolling
                    ? '[mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]'
                    : 'scrollbar-none overflow-x-auto px-5',
            )}
        >
            {/* The tilt sits on this band so the roll slides along it, level. */}
            <div
                className={cn(
                    '-rotate-1 bg-[#141414] shadow-[0_24px_50px_-20px_rgb(0_0_0/0.7)]',
                    rolling
                        ? 'overflow-hidden motion-reduce:overflow-x-auto'
                        : 'mx-auto w-max',
                )}
            >
            <div
                className={cn(
                    'relative w-max py-7',
                    rolling
                        ? 'animate-film-x hover:[animation-play-state:paused] motion-reduce:animate-none'
                        : 'px-4',
                )}
                style={
                    {
                        '--film-duration': `${half.length * SECONDS_PER_FRAME}s`,
                    } as CSSProperties
                }
            >
                <div
                    className="absolute inset-x-0 top-2 h-3 opacity-90"
                    style={{
                        backgroundImage: SPROCKETS_ACROSS,
                        backgroundSize: '34px 12px',
                    }}
                />
                <div className={cn('flex', !rolling && 'gap-3')}>
                    {roll.map((frame, position) => (
                        <div
                            key={position}
                            aria-hidden={position >= frames.length || undefined}
                            className={cn(
                                'w-44 sm:w-56',
                                rolling && 'box-content pl-3',
                            )}
                        >
                            <FrameLabel
                                number={(position % frames.length) + 1}
                            />
                            <FramePhoto
                                frame={frame}
                                className="aspect-[4/3] w-full"
                            />
                        </div>
                    ))}
                </div>
                <div
                    className="absolute inset-x-0 bottom-2 h-3 opacity-90"
                    style={{
                        backgroundImage: SPROCKETS_ACROSS,
                        backgroundSize: '34px 12px',
                    }}
                />
            </div>
            </div>
        </div>
    );
}

/** One upright strip; `reverse` makes it roll downward instead of up. */
function StandingStrip({
    frames,
    numberOf,
    rolling,
    reverse,
    className,
}: {
    frames: FilmFrame[];
    numberOf: (position: number) => number;
    rolling: boolean;
    reverse?: boolean;
    className?: string;
}) {
    const half = rolling ? loopOf(frames, 4) : frames;
    const roll = rolling ? [...half, ...half] : half;

    return (
        <div
            className={cn(
                'relative w-36 bg-[#141414] px-7 shadow-[0_24px_50px_-20px_rgb(0_0_0/0.7)] sm:w-52',
                rolling &&
                    'h-[30rem] overflow-hidden [mask-image:linear-gradient(180deg,transparent,black_8%,black_92%,transparent)] motion-reduce:overflow-y-auto sm:h-[36rem]',
                !rolling && 'py-4',
                className,
            )}
        >
            <div
                className={cn(
                    'flex flex-col',
                    !rolling && 'gap-3',
                    rolling &&
                        'animate-film-y hover:[animation-play-state:paused] motion-reduce:animate-none',
                    rolling && reverse && '[animation-direction:reverse]',
                )}
                style={
                    {
                        '--film-duration': `${half.length * SECONDS_PER_FRAME}s`,
                    } as CSSProperties
                }
            >
                {roll.map((frame, position) => (
                    <div
                        key={position}
                        aria-hidden={position >= frames.length || undefined}
                        className={cn(rolling && 'pt-3')}
                    >
                        <FrameLabel
                            number={numberOf(position % frames.length)}
                        />
                        <FramePhoto
                            frame={frame}
                            className="aspect-[3/4] w-full"
                        />
                    </div>
                ))}
            </div>
            {(['left-1.5', 'right-1.5'] as const).map((side) => (
                <div
                    key={side}
                    className={cn('absolute inset-y-0 w-3 opacity-90', side)}
                    style={{
                        backgroundImage: SPROCKETS_DOWN,
                        backgroundSize: '12px 34px',
                    }}
                />
            ))}
        </div>
    );
}

/**
 * Two upright film strips side by side, sharing the photos between them:
 * one slowly rolls up while the other rolls down.
 */
export function StandingFilmRolls({ frames }: { frames: FilmFrame[] }) {
    const rolling = isRolling(frames);
    const left = frames.filter((_, index) => index % 2 === 0);
    const right = frames.filter((_, index) => index % 2 === 1);

    return (
        <div className="mt-10 flex items-start justify-center gap-5 sm:gap-10">
            {left.length > 0 && (
                <StandingStrip
                    frames={left}
                    numberOf={(position) => position * 2 + 1}
                    rolling={rolling}
                    className="-rotate-2"
                />
            )}
            {right.length > 0 && (
                <StandingStrip
                    frames={right}
                    numberOf={(position) => position * 2 + 2}
                    rolling={rolling}
                    reverse
                    className={cn('rotate-2', !rolling && 'mt-12')}
                />
            )}
        </div>
    );
}
