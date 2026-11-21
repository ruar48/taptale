import type { ReactNode } from 'react';
import {
    MiniCdBack,
    MiniCdDisc,
    resolveLayout,
} from '@/components/taptale/template-layouts';
import type { DesignContent } from '@/components/taptale/template-layouts';
import { TemplatePreview } from '@/components/taptale/template-preview';
import { cn } from '@/lib/utils';

function BallChain({ color }: { color: string }) {
    return (
        <svg viewBox="0 0 100 46" className="mx-auto -mb-[3%] block w-[46%]" aria-hidden>
            <path
                d="M28 46 C 26 4, 74 4, 72 46"
                fill="none"
                stroke={color}
                strokeWidth="5.5"
                strokeDasharray="0.01 7.2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function JewelCase({
    children,
    nfc = false,
    className,
}: {
    children: ReactNode;
    nfc?: boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'relative aspect-square overflow-hidden rounded-[5%] bg-white/50 p-[5%] shadow-[0_22px_44px_-18px_rgb(52_48_57/0.55)] ring-1 ring-black/10 backdrop-blur-sm',
                className,
            )}
            style={{ containerType: 'inline-size' }}
        >
            <div className="relative size-full overflow-hidden rounded-[2%]">{children}</div>
            <div className="pointer-events-none absolute inset-y-[5%] left-[5%] w-[7%] bg-gradient-to-r from-black/25 via-white/30 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgb(255_255_255/0.6)_0%,rgb(255_255_255/0)_35%,rgb(255_255_255/0)_70%,rgb(255_255_255/0.3)_100%)]" />
            {nfc && (
                <span className="absolute right-[7%] bottom-[7%] rounded-full bg-white/90 px-[4cqw] py-[1cqw] text-[max(9px,5cqw)] font-semibold text-plum shadow">
                    NFC
                </span>
            )}
        </div>
    );
}

/**
 * Mini CD album keychain: a jewel case with the cover, a ball chain and the
 * printed disc. The "full" variant shows front, back and inside like a
 * product listing.
 */
export function MiniCdMockup({
    content,
    chainColor = '#C0C0C0',
    nfc = false,
    variant = 'compact',
    className,
}: {
    content: DesignContent;
    chainColor?: string;
    nfc?: boolean;
    variant?: 'compact' | 'full';
    className?: string;
}) {
    const layout = resolveLayout(content);
    const cover = <TemplatePreview layout="mini_cd" fit={false} {...content} className="size-full" />;

    if (variant === 'compact') {
        return (
            <div className={cn('relative mx-auto w-full', className)}>
                <BallChain color={chainColor} />
                <div className="relative">
                    <MiniCdDisc {...layout} className="absolute top-[8%] -right-[22%] w-[84%] animate-[spin_16s_linear_infinite]" />
                    <JewelCase nfc={nfc}>{cover}</JewelCase>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('grid gap-x-4 gap-y-6 sm:grid-cols-2', className)}>
            <figure>
                <BallChain color={chainColor} />
                <JewelCase nfc={nfc}>{cover}</JewelCase>
                <figcaption className="mt-2 text-center font-display text-sm italic">Front</figcaption>
            </figure>
            <figure>
                <BallChain color={chainColor} />
                <JewelCase>
                    <MiniCdBack {...layout} />
                </JewelCase>
                <figcaption className="mt-2 text-center font-display text-sm italic">Back</figcaption>
            </figure>
            <figure className="sm:col-span-2">
                <div className="mx-auto grid max-w-md grid-cols-2 gap-1.5">
                    <JewelCase className="rounded-r-[2%]">
                        <TemplatePreview layout="mini_cd" fit={false} {...content} photos={[layout.photoAt(1)]} songTitle={layout.text.artist} className="size-full" />
                    </JewelCase>
                    <JewelCase className="rounded-l-[2%]">
                        <div className="flex size-full items-center justify-center bg-gradient-to-br from-white/70 to-cream-dark/60">
                            <MiniCdDisc {...layout} className="w-[88%]" />
                        </div>
                    </JewelCase>
                </div>
                <figcaption className="mt-2 text-center font-display text-sm italic">Inside</figcaption>
            </figure>
        </div>
    );
}

/**
 * Laser-engraved wooden tag with a drilled hole and metal ring.
 */
export function WoodenMockup({
    children,
    rounded = false,
    className,
}: {
    children: ReactNode;
    rounded?: boolean;
    className?: string;
}) {
    return (
        <div className={cn('relative mx-auto w-full', className)} style={{ containerType: 'inline-size' }}>
            <div className="relative z-10 mx-auto -mb-[11%] aspect-square w-[30%] rounded-full" style={{ border: 'clamp(3px, 1.8cqw, 9px) solid #B8B8B8', boxShadow: '0 2px 6px rgb(0 0 0 / 0.2)' }} />
            <div
                className={cn(
                    'relative overflow-hidden shadow-[0_24px_44px_-18px_rgb(74_44_23/0.6)] ring-1 ring-[#4A2C17]/20 [&>*]:size-full',
                    rounded ? 'rounded-t-full rounded-b-[14%]' : 'rounded-[10%]',
                )}
                style={{ aspectRatio: '4 / 5' }}
            >
                {children}
                <span className="absolute top-[4%] left-1/2 size-[9%] -translate-x-1/2 rounded-full bg-cream shadow-[inset_0_2px_4px_rgb(0_0_0/0.45)]" />
            </div>
        </div>
    );
}

/**
 * Die-cut acrylic charm that follows the outline of the design.
 */
export function DieCutMockup({
    children,
    ringColor = '#C0C0C0',
    className,
}: {
    children: ReactNode;
    ringColor?: string;
    className?: string;
}) {
    return (
        <div className={cn('relative mx-auto w-full', className)} style={{ containerType: 'inline-size' }}>
            <div className="relative z-10 mx-auto -mb-[8%] aspect-square w-[24%] rounded-full" style={{ border: `clamp(3px, 1.6cqw, 8px) solid ${ringColor}`, boxShadow: '0 2px 6px rgb(0 0 0 / 0.18)' }} />
            <div className="relative drop-shadow-[0_18px_22px_rgb(52_48_57/0.35)] [&>*]:size-full">{children}</div>
        </div>
    );
}
