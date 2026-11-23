import { QrCode } from "lucide-react";
import {
    KeychainMockup,
    materialFromOption,
    shapeFromOption,
} from "@/components/taptale/keychain-mockup";
import {
    DieCutMockup,
    MiniCdMockup,
    WoodenMockup,
} from "@/components/taptale/product-mockups";
import {
    productPalette,
    TemplatePreview,
} from "@/components/taptale/template-preview";
import type { Product, ProductOption } from "@/types";

/**
 * Live preview of the customer's personalized design on the chosen product.
 */
export function DesignPreview({
    product,
    selectedOptions,
    photoUrl,
    photos,
    names,
    date,
    message,
    songTitle,
    artist,
    color,
    detailed = false,
    className,
}: {
    product: Product;
    selectedOptions: ProductOption[];
    photoUrl: string | null;
    photos?: (string | null)[];
    names?: string;
    date?: string;
    message?: string;
    songTitle?: string;
    artist?: string;
    color?: string;
    /** Show every side of the product (e.g. CD front, back and inside). */
    detailed?: boolean;
    className?: string;
}) {
    const byGroup = (group: string) =>
        selectedOptions.find((option) => option.group === group);

    const layout = product.design_layout;
    const palette = productPalette(
        product.art_style,
        byGroup("material")?.name,
    );
    const hasTap =
        product.has_digital_experience ||
        selectedOptions.some((option) => option.enables_digital_experience);

    const content = {
        palette,
        accent: color,
        photoUrl,
        photos,
        names,
        date,
        message,
        songTitle,
        artist,
    };

    const design = <TemplatePreview layout={layout} fit={false} {...content} />;

    switch (product.art_style) {
        case "cd":
            return (
                <div className={className}>
                    <MiniCdMockup
                        content={content}
                        chainColor={byGroup("color")?.swatch ?? "#C0C0C0"}
                        nfc={hasTap}
                        variant={detailed ? "full" : "compact"}
                        className={detailed ? undefined : "w-[70%]"}
                    />
                </div>
            );

        case "music":
            return (
                <div className={className}>
                    <KeychainMockup
                        className="w-[56%]"
                        aspect={5 / 8}
                        ringColor={byGroup("color")?.swatch ?? "#C0C0C0"}
                        nfc={hasTap}
                    >
                        {design}
                    </KeychainMockup>
                </div>
            );

        case "strip":
            return (
                <div className={className}>
                    <KeychainMockup
                        className="w-[36%]"
                        aspect={1 / 3}
                        material={materialFromOption(byGroup("material")?.name)}
                        ringColor={byGroup("color")?.swatch ?? "#C0C0C0"}
                    >
                        {design}
                    </KeychainMockup>
                </div>
            );

        case "calendar":
            return (
                <div className={className}>
                    <KeychainMockup
                        className="w-[54%]"
                        aspect={3 / 4}
                        material={materialFromOption(byGroup("material")?.name)}
                        ringColor={byGroup("color")?.swatch ?? "#D4AF37"}
                        nfc={hasTap}
                    >
                        {design}
                    </KeychainMockup>
                </div>
            );

        case "tag":
            return (
                <div className={className}>
                    <KeychainMockup
                        className="w-[62%]"
                        shape={
                            byGroup("shape")
                                ?.name.toLowerCase()
                                .includes("square")
                                ? "rect"
                                : "circle"
                        }
                        aspect={1}
                        ringColor={byGroup("color")?.swatch ?? "#343039"}
                        nfc
                    >
                        {design}
                    </KeychainMockup>
                </div>
            );

        case "wood":
            return (
                <div className={className}>
                    <WoodenMockup
                        className="w-[64%]"
                        rounded={byGroup("shape")
                            ?.name.toLowerCase()
                            .includes("round")}
                    >
                        {design}
                    </WoodenMockup>
                </div>
            );

        case "diecut":
            return (
                <div className={className}>
                    <DieCutMockup
                        className="w-[70%]"
                        ringColor={byGroup("color")?.swatch ?? "#C0C0C0"}
                    >
                        <TemplatePreview
                            layout={layout}
                            fit={false}
                            bare
                            {...content}
                        />
                    </DieCutMockup>
                </div>
            );
    }

    if (product.art_style === "photo") {
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

    if (product.art_style === "qr") {
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
                shape={shapeFromOption(byGroup("shape")?.name)}
                material={materialFromOption(byGroup("material")?.name)}
                ringColor={byGroup("color")?.swatch ?? "#C9A66B"}
                nfc={hasTap}
            >
                {design}
            </KeychainMockup>
        </div>
    );
}
