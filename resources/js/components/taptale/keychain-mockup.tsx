import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type KeychainShape = 'rect' | 'circle' | 'heart';
export type KeychainMaterial = 'clear' | 'frosted' | 'glitter';

/**
 * Derive a mockup shape / material from free-text option names chosen by
 * the customer, e.g. "Heart" or "Frosted acrylic".
 */
export function shapeFromOption(name?: string | null): KeychainShape {
    const value = (name ?? '').toLowerCase();

    if (value.includes('heart')) {
        return 'heart';
    }

    if (value.includes('circle') || value.includes('round ')) {
        return 'circle';
    }

    return 'rect';
}

export function materialFromOption(name?: string | null): KeychainMaterial {
    const value = (name ?? '').toLowerCase();

    if (value.includes('glitter')) {
        return 'glitter';
    }

    if (value.includes('frost')) {
        return 'frosted';
    }

    return 'clear';
}

/**
 * Wraps a design in a photographic-feeling acrylic keychain: metal ring,
 * acrylic edge with gloss highlight and an optional NFC badge.
 */
export function KeychainMockup({
    children,
    shape = 'rect',
    material = 'clear',
    ringColor = '#C9A66B',
    nfc = false,
    className,
}: {
    children: ReactNode;
    shape?: KeychainShape;
    material?: KeychainMaterial;
    ringColor?: string;
    nfc?: boolean;
    className?: string;
}) {
    const clipId = useId().replace(/:/g, '');

    const edgeShape =
        shape === 'circle'
            ? 'rounded-full aspect-square'
            : shape === 'heart'
              ? 'aspect-square'
              : 'rounded-[12%] aspect-[4/5]';

    return (
        <div
            className={cn('relative mx-auto w-full', className)}
            style={{ containerType: 'inline-size' }}
        >
            <svg width="0" height="0" className="absolute">
                <defs>
                    <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                        <path d="M0.5,0.95 C0.5,0.95 0.02,0.64 0.02,0.31 C0.02,0.13 0.16,0.02 0.3,0.02 C0.4,0.02 0.47,0.07 0.5,0.15 C0.53,0.07 0.6,0.02 0.7,0.02 C0.84,0.02 0.98,0.13 0.98,0.31 C0.98,0.64 0.5,0.95 0.5,0.95 Z" />
                    </clipPath>
                </defs>
            </svg>

            {/* Ring + jump ring */}
            <div className="relative z-10 mx-auto flex w-[34%] flex-col items-center">
                <div
                    className="aspect-square w-full rounded-full"
                    style={{
                        border: `clamp(3px, 1.6cqw, 9px) solid ${ringColor}`,
                        boxShadow: `inset 0 0 0 1px rgb(255 255 255 / 0.5), 0 2px 6px rgb(0 0 0 / 0.18)`,
                    }}
                />
                <div
                    className="-mt-[6%] h-[18px] w-[18px] rounded-full sm:h-6 sm:w-6"
                    style={{
                        border: `3px solid ${ringColor}`,
                    }}
                />
            </div>

            <div
                className={cn(
                    'relative -mt-2 overflow-hidden p-[4%] shadow-[0_24px_50px_-20px_rgb(52_48_57/0.45)] transition-all duration-500',
                    edgeShape,
                )}
                style={{
                    clipPath: shape === 'heart' ? `url(#${clipId})` : undefined,
                    background:
                        material === 'frosted'
                            ? 'linear-gradient(145deg, rgb(255 255 255 / 0.85), rgb(240 236 240 / 0.7))'
                            : material === 'glitter'
                              ? 'radial-gradient(circle at 20% 30%, #fff 0 1px, transparent 2px), radial-gradient(circle at 70% 60%, #f4e3e3 0 1px, transparent 2px), radial-gradient(circle at 40% 80%, #fff 0 1px, transparent 2px), linear-gradient(145deg, #f9eef0, #e9c9c9)'
                              : 'linear-gradient(145deg, rgb(255 255 255 / 0.95), rgb(233 236 240 / 0.75))',
                    backgroundSize:
                        material === 'glitter'
                            ? '9px 9px, 13px 13px, 11px 11px, auto'
                            : undefined,
                }}
            >
                <div
                    className={cn(
                        'relative size-full overflow-hidden',
                        shape === 'circle'
                            ? 'rounded-full'
                            : shape === 'heart'
                              ? ''
                              : 'rounded-[9%]',
                        material === 'frosted' && 'opacity-90 saturate-[0.9]',
                    )}
                    style={{
                        clipPath:
                            shape === 'heart' ? `url(#${clipId})` : undefined,
                    }}
                >
                    <div className="size-full [&>*]:size-full [&>*]:!aspect-auto">
                        {children}
                    </div>
                </div>

                {/* Gloss */}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/0.55)_0%,rgb(255_255_255/0)_38%,rgb(255_255_255/0)_70%,rgb(255_255_255/0.25)_100%)]" />

                {nfc && (
                    <div className="absolute right-[7%] bottom-[7%] flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-plum shadow-sm backdrop-blur sm:text-xs">
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose opacity-60" />
                            <span className="relative inline-flex size-2 rounded-full bg-rose" />
                        </span>
                        TAP
                    </div>
                )}
            </div>
        </div>
    );
}
