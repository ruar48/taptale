import { KeychainMockup } from '@/components/taptale/keychain-mockup';
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
