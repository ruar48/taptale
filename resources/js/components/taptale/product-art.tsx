import { KeychainMockup } from '@/components/taptale/keychain-mockup';
import {
    DieCutMockup,
    MiniCdMockup,
    WoodenMockup,
} from '@/components/taptale/product-mockups';
import { TemplatePreview } from '@/components/taptale/template-preview';
import { cn } from '@/lib/utils';
import type { ArtStyle, Product } from '@/types';

const PALETTES = [
    { background: '#F8E6E8', ink: '#713D50', accent: '#B86F83' },
    { background: '#FFFDF9', ink: '#343039', accent: '#B86F83' },
    { background: '#1F1B2E', ink: '#F8F3ED', accent: '#E9C9C9' },
    { background: '#FBF7F2', ink: '#4F5D4A', accent: '#C98D9D' },
];

/**
 * The product's cover photo, or an illustrated mockup when the studio has
 * not uploaded photography yet.
 */
export function ProductArt({
    product,
    className,
    accent,
}: {
    product: Pick<Product, 'name' | 'art_style' | 'id'> & {
        cover_image_url?: string | null;
    };
    className?: string;
    accent?: string;
}) {
    if (product.cover_image_url) {
        return (
            <div className={cn('overflow-hidden', className)}>
                <img
                    src={product.cover_image_url}
                    alt={product.name}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-blush-light via-cream to-cream-dark',
                className,
            )}
            style={{ containerType: 'inline-size' }}
            aria-label={product.name}
            role="img"
        >
            <div className="absolute -top-1/4 -right-1/4 size-2/3 rounded-full bg-blush/40 blur-2xl" />
            <div className="absolute -bottom-1/4 -left-1/4 size-1/2 rounded-full bg-rose/15 blur-2xl" />
            <Illustration
                style={product.art_style}
                seed={product.id}
                accent={accent}
            />
        </div>
    );
}

function Illustration({
    style,
    seed,
    accent,
}: {
    style: ArtStyle;
    seed: number;
    accent?: string;
}) {
    const palette = {
        ...PALETTES[seed % PALETTES.length],
        ...(accent ? { accent } : {}),
    };

    switch (style) {
        case 'qr':
            return (
                <div className="relative w-[52%] rotate-[-6deg] transition-transform duration-700 group-hover:rotate-0">
                    <div className="rounded-[10%] bg-white p-[8%] shadow-[0_20px_40px_-18px_rgb(52_48_57/0.5)]">
                        <QrPattern seed={seed} />
                        <p className="mt-[6%] text-center font-display text-[5cqw] text-plum italic">
                            Scan our story
                        </p>
                    </div>
                </div>
            );

        case 'photo':
            return (
                <div className="relative w-[50%] transition-transform duration-700 group-hover:-translate-y-1">
                    <div className="rounded-[4%] border-[1.4cqw] border-white/80 bg-white/40 shadow-[0_24px_40px_-16px_rgb(52_48_57/0.5)] backdrop-blur">
                        <TemplatePreview
                            layout="minimal"
                            palette={palette}
                            className="rounded-[2%]"
                        />
                    </div>
                    <div className="mx-auto h-[3cqw] w-[80%] rounded-b-md bg-gradient-to-b from-white/70 to-white/30" />
                </div>
            );

        case 'keepsake':
            return (
                <div className="relative flex w-[78%] items-start justify-center gap-[3%]">
                    <KeychainMockup className="w-1/2 -rotate-6" shape="heart">
                        <TemplatePreview layout="heart" palette={palette} />
                    </KeychainMockup>
                    <KeychainMockup
                        className="mt-[8%] w-1/2 rotate-6"
                        shape="heart"
                    >
                        <TemplatePreview
                            layout="heart"
                            palette={palette}
                            names="Forever"
                        />
                    </KeychainMockup>
                </div>
            );

        case 'nfc':
            return (
                <div className="relative w-[46%] animate-float">
                    <TapWaves />
                    <KeychainMockup nfc>
                        <TemplatePreview
                            layout="celestial"
                            palette={PALETTES[2]}
                        />
                    </KeychainMockup>
                </div>
            );

        case 'cd':
            return (
                <div className="relative w-[46%] -translate-x-[8%] rotate-[-4deg] transition-transform duration-700 group-hover:rotate-0">
                    <MiniCdMockup
                        content={{
                            palette: {
                                background: '#1A1A1F',
                                ink: '#F8F3ED',
                                accent: '#E9C9C9',
                            },
                            songTitle: 'Golden Days',
                            artist: 'Ana & Leo',
                        }}
                    />
                </div>
            );

        case 'music':
            return (
                <div className="relative flex w-[70%] items-start justify-center gap-[6%]">
                    <KeychainMockup
                        className="w-[44%] -rotate-6"
                        aspect={5 / 8}
                        ringColor="#C0C0C0"
                    >
                        <TemplatePreview
                            layout="music_player"
                            fit={false}
                            palette={{
                                background: '#FFFFFF',
                                ink: '#1F1D22',
                                accent: '#B86F83',
                            }}
                            songTitle="Our Song"
                            artist="Ana & Leo"
                        />
                    </KeychainMockup>
                    <KeychainMockup
                        className="mt-[10%] w-[44%] rotate-6"
                        aspect={5 / 8}
                        ringColor="#D4AF37"
                    >
                        <TemplatePreview
                            layout="music_player"
                            fit={false}
                            palette={{
                                background: '#121214',
                                ink: '#F5F5F5',
                                accent: '#E9C9C9',
                            }}
                            songTitle="Forever Yours"
                            artist="Mia"
                        />
                    </KeychainMockup>
                </div>
            );

        case 'strip':
            return (
                <div className="relative flex h-[86%] items-start justify-center gap-[4%]">
                    {[
                        {
                            background: '#FFFFFF',
                            ink: '#343039',
                            accent: '#B86F83',
                        },
                        {
                            background: '#F4E3EC',
                            ink: '#5A2E3E',
                            accent: '#B86F83',
                        },
                        {
                            background: '#141416',
                            ink: '#F5F5F5',
                            accent: '#E3A587',
                        },
                    ].map((stripPalette, index) => (
                        <KeychainMockup
                            key={index}
                            className={cn(
                                'w-[19cqw]',
                                index === 1 ? 'mt-[6%]' : 'rotate-[-3deg]',
                            )}
                            aspect={1 / 3}
                            ringColor="#C0C0C0"
                        >
                            <TemplatePreview
                                layout="photo_strip"
                                fit={false}
                                palette={stripPalette}
                            />
                        </KeychainMockup>
                    ))}
                </div>
            );

        case 'tag':
            return (
                <div className="relative w-[40%] animate-float">
                    <TapWaves />
                    <KeychainMockup shape="circle" ringColor="#343039" nfc>
                        <TemplatePreview
                            layout="tap_tag"
                            fit={false}
                            palette={{
                                background: '#1F1D22',
                                ink: '#FFFFFF',
                                accent: '#B86F83',
                            }}
                            names="@ana.leo"
                            message="Tap to connect"
                        />
                    </KeychainMockup>
                </div>
            );

        case 'wood':
            return (
                <div className="relative w-[42%] rotate-[5deg] transition-transform duration-700 group-hover:rotate-0">
                    <WoodenMockup>
                        <TemplatePreview
                            layout="engraved"
                            fit={false}
                            palette={{
                                background: '#C79B6D',
                                ink: '#4A2C17',
                                accent: '#7A4B2A',
                            }}
                            message="Drive safe, I need you here with me"
                            names="Love, Ana"
                        />
                    </WoodenMockup>
                </div>
            );

        case 'diecut':
            return (
                <div className="relative w-[50%] -rotate-3 transition-transform duration-700 group-hover:rotate-0">
                    <DieCutMockup>
                        <TemplatePreview
                            layout="die_cut"
                            fit={false}
                            bare
                            palette={palette}
                            names="Bestie!"
                        />
                    </DieCutMockup>
                </div>
            );

        default:
            return (
                <div className="relative w-[44%] rotate-[4deg] transition-transform duration-700 group-hover:rotate-0">
                    <KeychainMockup>
                        <TemplatePreview layout="polaroid" palette={palette} />
                    </KeychainMockup>
                </div>
            );
    }
}

function TapWaves() {
    return (
        <div className="pointer-events-none absolute top-[55%] -right-[38%] flex size-[60%] items-center justify-center">
            {[0, 0.8, 1.6].map((delay) => (
                <span
                    key={delay}
                    className="absolute size-full animate-tap-ring rounded-full border-2 border-rose/60"
                    style={{ animationDelay: `${delay}s` }}
                />
            ))}
        </div>
    );
}

function QrPattern({ seed }: { seed: number }) {
    const size = 15;
    const cells = Array.from({ length: size * size }, (_, index) => {
        const x = index % size;
        const y = Math.floor(index / size);
        const inFinder =
            (x < 5 && y < 5) ||
            (x >= size - 5 && y < 5) ||
            (x < 5 && y >= size - 5);

        if (inFinder) {
            return false;
        }

        return (x * 7 + y * 13 + seed * 5 + x * y) % 5 < 2;
    });

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="aspect-square w-full">
            {cells.map((filled, index) =>
                filled ? (
                    <rect
                        key={index}
                        x={index % size}
                        y={Math.floor(index / size)}
                        width="1"
                        height="1"
                        fill="#343039"
                    />
                ) : null,
            )}
            {[
                [0, 0],
                [size - 5, 0],
                [0, size - 5],
            ].map(([x, y]) => (
                <g key={`${x}-${y}`}>
                    <rect x={x} y={y} width="5" height="5" fill="#713D50" />
                    <rect
                        x={x + 1}
                        y={y + 1}
                        width="3"
                        height="3"
                        fill="#fff"
                    />
                    <rect
                        x={x + 1.75}
                        y={y + 1.75}
                        width="1.5"
                        height="1.5"
                        fill="#713D50"
                    />
                </g>
            ))}
        </svg>
    );
}
