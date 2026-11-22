import { Check, Clock, Nfc, Package, Wand2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { TemplatePreview } from '@/components/taptale/template-preview';
import { useMoney } from '@/hooks/use-money';
import { cn } from '@/lib/utils';
import type { Product, Template } from '@/types';

/**
 * Shopee-style product view: a big live sample on the left, and on the
 * right the price, key facts and the design "variations" as chips.
 */
export function ProductShowcase({
    product,
    templates,
    selectedTemplateId,
    customSelected,
    onSelectTemplate,
    onSelectCustom,
    preview,
    hasTapPage,
    loading,
}: {
    product: Product;
    templates: Template[];
    selectedTemplateId: number | null;
    customSelected: boolean;
    onSelectTemplate: (id: number) => void;
    onSelectCustom: () => void;
    preview: ReactNode;
    hasTapPage: boolean;
    loading: boolean;
}) {
    const money = useMoney();

    return (
        <div
            className={cn(
                'grid gap-6 rounded-[2rem] border border-plum/10 bg-card p-4 transition-opacity sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]',
                loading && 'opacity-60',
            )}
        >
            <div className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-blush-light via-cream to-cream-dark p-6 dark:from-muted dark:via-background dark:to-muted">
                <div className="w-full max-w-xs">{preview}</div>
            </div>

            <div>
                <h2 className="font-display text-3xl leading-tight font-medium">
                    {product.name}
                </h2>
                {product.short_description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                        {product.short_description}
                    </p>
                )}

                <div className="mt-4 rounded-2xl bg-blush-light/50 px-4 py-3 dark:bg-rose/10">
                    <span className="text-sm text-muted-foreground">From </span>
                    <span className="font-display text-3xl font-semibold text-plum dark:text-blush">
                        {money(product.base_price)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {' '}
                        / piece
                    </span>
                </div>

                <dl className="mt-4 grid gap-2 text-sm">
                    <Fact
                        icon={Clock}
                        label="Production"
                        value={product.production_time}
                    />
                    {product.min_quantity > 1 && (
                        <Fact
                            icon={Package}
                            label="Minimum"
                            value={`${product.min_quantity} pieces`}
                        />
                    )}
                    {hasTapPage && (
                        <Fact
                            icon={Nfc}
                            label="Tap page"
                            value={
                                product.has_digital_experience
                                    ? 'Included — a website opens when they tap or scan'
                                    : 'Available with the NFC add-on'
                            }
                        />
                    )}
                </dl>

                <div className="mt-6">
                    <p className="mb-2 flex items-baseline justify-between text-sm font-semibold">
                        Design
                        <span className="text-xs font-normal text-muted-foreground">
                            {templates.length}{' '}
                            {templates.length === 1 ? 'design' : 'designs'}
                        </span>
                    </p>
                    <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto pr-1">
                        {templates.map((item) => {
                            const selected = selectedTemplateId === item.id;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onSelectTemplate(item.id)}
                                    className={cn(
                                        'relative inline-flex items-center gap-2 rounded-xl border-2 bg-background py-1 pr-3 pl-1 text-sm transition',
                                        selected
                                            ? 'border-rose text-plum dark:text-blush'
                                            : 'border-border hover:border-rose/50',
                                    )}
                                    aria-pressed={selected}
                                >
                                    <span className="size-9 shrink-0 overflow-hidden rounded-lg">
                                        <TemplatePreview
                                            layout={item.layout}
                                            palette={item.palette}
                                            imageUrl={item.preview_url}
                                            className="!aspect-square size-full"
                                        />
                                    </span>
                                    {item.name}
                                    {selected && (
                                        <span className="absolute -right-1.5 -bottom-1.5 flex size-4 items-center justify-center rounded-full bg-rose text-white">
                                            <Check
                                                className="size-2.5"
                                                strokeWidth={4}
                                            />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={onSelectCustom}
                            className={cn(
                                'relative inline-flex items-center gap-2 rounded-xl border-2 border-dashed py-1 pr-3 pl-1 text-sm transition',
                                customSelected
                                    ? 'border-rose bg-blush-light/40 text-plum dark:bg-rose/10 dark:text-blush'
                                    : 'border-plum/25 hover:border-rose/50',
                            )}
                            aria-pressed={customSelected}
                        >
                            <span className="flex size-9 items-center justify-center rounded-lg bg-blush-light text-rose dark:bg-rose/20">
                                <Wand2 className="size-4" />
                            </span>
                            Custom design{' '}
                            <span className="text-xs text-muted-foreground">
                                +{money(product.design_fee)}
                            </span>
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Tap a design to see it on your gift. You can add your
                        own photos and words next.
                    </p>
                </div>
            </div>
        </div>
    );
}

function Fact({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Clock;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <dt className="flex w-24 shrink-0 items-center gap-1.5 text-muted-foreground">
                <Icon className="size-4 text-rose" /> {label}
            </dt>
            <dd>{value}</dd>
        </div>
    );
}
