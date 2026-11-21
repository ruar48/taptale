import { QrCode } from 'lucide-react';
import {
    KeychainMockup,
    materialFromOption,
    shapeFromOption,
} from '@/components/taptale/keychain-mockup';
import { TemplatePreview } from '@/components/taptale/template-preview';
import type {
    Palette,
    Product,
    ProductOption,
    Template,
    TemplateLayout,
} from '@/types';

const FALLBACK_PALETTE: Palette = {
    background: '#F8F3ED',
    ink: '#343039',
    accent: '#B86F83',
};

/**
 * Live preview of the customer's personalized design on the chosen product.
 */
export function DesignPreview({
    product,
    template,
    selectedOptions,
    photoUrl,
    names,
    date,
    message,
    color,
    className,
}: {
    product: Product;
    template: Template | null;
    selectedOptions: ProductOption[];
    photoUrl: string | null;
    names?: string;
    date?: string;
    message?: string;
    color?: string;
    className?: string;
}) {
    const byGroup = (group: string) =>
        selectedOptions.find((option) => option.group === group);

    const layout: TemplateLayout = template?.layout ?? 'polaroid';
    const palette = template?.palette ?? FALLBACK_PALETTE;
    const hasTap =
        product.has_digital_experience ||
        selectedOptions.some((option) => option.enables_digital_experience);

    const design = (
        <TemplatePreview
            layout={layout}
            palette={palette}
            photoUrl={photoUrl}
            names={names}
            date={date}
            message={message}
            accent={color}
        />
    );

    if (product.art_style === 'photo') {
        return (
            <div className={className}>
                <div className="mx-auto w-[78%]">
                    <div className="rounded-[4%] border-[10px] border-white/80 bg-white/40 shadow-[0_30px_60px_-24px_rgb(52_48_57/0.55)] backdrop-blur">
                        {design}
                    </div>
                    <div className="mx-auto h-4 w-[86%] rounded-b-lg bg-gradient-to-b from-white/80 to-white/30 shadow" />
                </div>
            </div>
        );
    }

    if (product.art_style === 'qr') {
        return (
            <div className={className}>
                <div className="relative mx-auto w-[82%] rounded-[1.5rem] bg-white p-4 shadow-[0_30px_60px_-24px_rgb(52_48_57/0.55)]">
                    <div className="overflow-hidden rounded-xl">{design}</div>
                    <div className="absolute right-6 bottom-6 flex size-16 items-center justify-center rounded-xl bg-white shadow-md sm:size-20">
                        <QrCode
                            className="size-12 text-charcoal sm:size-16"
                            strokeWidth={1.2}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            <KeychainMockup
                className="w-[72%]"
                shape={shapeFromOption(byGroup('shape')?.name)}
                material={materialFromOption(byGroup('material')?.name)}
                ringColor={byGroup('color')?.swatch ?? '#C9A66B'}
                nfc={hasTap}
            >
                {design}
            </KeychainMockup>
        </div>
    );
}
