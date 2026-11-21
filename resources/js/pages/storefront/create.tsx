import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    Brush,
    Check,
    Loader2,
    Minus,
    Nfc,
    Plus,
    ShieldCheck,
    Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CategoryIcon } from '@/components/taptale/category-icon';
import { FileDropzone } from '@/components/taptale/file-dropzone';
import { ProductArt } from '@/components/taptale/product-art';
import {
    MUSIC_LAYOUTS,
    TemplatePreview,
} from '@/components/taptale/template-preview';
import { DesignPreview } from '@/components/taptale/wizard/design-preview';
import { OptionPicker } from '@/components/taptale/wizard/option-picker';
import { OrderSummary } from '@/components/taptale/wizard/order-summary';
import { WizardProgress } from '@/components/taptale/wizard/wizard-progress';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMoney } from '@/hooks/use-money';
import { calculatePrice, defaultOptionIds, groupOptions } from '@/lib/pricing';
import type { PricingConfig } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS } from '@/lib/wizard';
import type { DesignMode } from '@/lib/wizard';
import { create as wizardRoute, store as storeOrder } from '@/routes/orders';
import type {
    Category,
    PaymentMethod,
    Personalization,
    Product,
    Template,
} from '@/types';

type Props = {
    categories: Category[];
    selectedCategory: Category | null;
    products: Product[];
    selectedProduct: Product | null;
    templates: Template[];
    initialTemplate: string | null;
    paymentMethods: PaymentMethod[];
    pricing: PricingConfig & { max_upload_kilobytes: number };
    customer: {
        name: string;
        email: string;
        phone: string | null;
        address_line: string | null;
        city: string | null;
        province: string | null;
        postal_code: string | null;
    };
};

type WizardForm = {
    category_id: number | null;
    product_id: number | null;
    template_id: number | null;
    design_mode: DesignMode | '';
    option_ids: number[];
    quantity: number;
    personalization: Required<Personalization>;
    photos: File[];
    approve_preview: boolean;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    address_line: string;
    city: string;
    province: string;
    postal_code: string;
    customer_notes: string;
    payment_method_id: number | null;
    save_details: boolean;
};

const COLOR_CHOICES = [
    '#B86F83',
    '#713D50',
    '#C9A66B',
    '#7C9473',
    '#5B6C8F',
    '#343039',
];

const ERROR_STEPS: [RegExp, number][] = [
    [/^category_id/, 0],
    [/^product_id/, 1],
    [/^template_id/, 2],
    [/^(design_mode|personalization|photos)/, 3],
    [/^(option_ids|quantity)/, 4],
    [/^approve_preview/, 5],
];

export default function CreateGift({
    categories,
    selectedCategory,
    products,
    selectedProduct,
    templates,
    initialTemplate,
    paymentMethods,
    pricing,
    customer,
}: Props) {
    const money = useMoney();
    const symbol = usePage().props.storefront?.currencySymbol ?? '₱';
    const preselectedTemplate =
        templates.find((template) => template.slug === initialTemplate) ?? null;

    const initialStep = selectedProduct ? 2 : selectedCategory ? 1 : 0;
    const [step, setStep] = useState(initialStep);
    const [furthest, setFurthest] = useState(initialStep);
    const [templateSkipped, setTemplateSkipped] = useState(false);
    const [loadingSelection, setLoadingSelection] = useState<number | null>(
        null,
    );
    const [stepError, setStepError] = useState<string | null>(null);

    const form = useForm<WizardForm>({
        category_id: selectedCategory?.id ?? null,
        product_id: selectedProduct?.id ?? null,
        template_id: preselectedTemplate?.id ?? null,
        design_mode: '',
        option_ids: selectedProduct
            ? defaultOptionIds(selectedProduct.options ?? [])
            : [],
        quantity: selectedProduct?.min_quantity ?? 1,
        personalization: {
            names: '',
            date: '',
            message: '',
            song_title: '',
            artist: '',
            color: '',
            design_brief: '',
            instructions: '',
        },
        photos: [],
        approve_preview: false,
        customer_name: customer.name ?? '',
        customer_email: customer.email ?? '',
        customer_phone: customer.phone ?? '',
        address_line: customer.address_line ?? '',
        city: customer.city ?? '',
        province: customer.province ?? '',
        postal_code: customer.postal_code ?? '',
        customer_notes: '',
        payment_method_id: paymentMethods[0]?.id ?? null,
        save_details: !customer.phone,
    });

    const { data, setData, errors } = form;

    // Reset product-specific choices when a different product is loaded.
    useEffect(() => {
        if (!selectedProduct || selectedProduct.id === data.product_id) {
            return;
        }

        setData((current) => ({
            ...current,
            product_id: selectedProduct.id,
            option_ids: defaultOptionIds(selectedProduct.options ?? []),
            quantity: selectedProduct.min_quantity,
            template_id: null,
            photos: current.photos.slice(0, selectedProduct.max_photos),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProduct?.id]);

    const template =
        templates.find((item) => item.id === data.template_id) ?? null;
    const designMode = data.design_mode || null;

    const price = useMemo(
        () =>
            selectedProduct
                ? calculatePrice(
                      selectedProduct,
                      data.option_ids,
                      data.quantity,
                      designMode,
                      pricing,
                  )
                : null,
        [selectedProduct, data.option_ids, data.quantity, designMode, pricing],
    );

    const photoUrls = useMemo(
        () => data.photos.map((photo) => URL.createObjectURL(photo)),
        [data.photos],
    );
    useEffect(
        () => () => photoUrls.forEach((url) => URL.revokeObjectURL(url)),
        [photoUrls],
    );
    const photoUrl = photoUrls[0] ?? null;
    const activeLayout = template?.layout ?? null;
    const isMusicDesign =
        (activeLayout !== null && MUSIC_LAYOUTS.includes(activeLayout)) ||
        selectedProduct?.art_style === 'cd' ||
        selectedProduct?.art_style === 'music';
    const isCdDesign =
        activeLayout === 'mini_cd' || selectedProduct?.art_style === 'cd';
    const previewText = {
        photos: photoUrls,
        names: data.personalization.names,
        date: data.personalization.date,
        message: data.personalization.message,
        songTitle: data.personalization.song_title,
        artist: data.personalization.artist,
        color: data.personalization.color,
    };

    const goTo = (target: number) => {
        setStepError(null);
        setStep(target);
        setFurthest((value) => Math.max(value, target));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const reloadSelection = (
        query: Record<string, string>,
        nextStep: number,
        loadingId: number,
    ) => {
        setLoadingSelection(loadingId);
        router.get(
            wizardRoute.url({ query }),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: [
                    'selectedCategory',
                    'products',
                    'selectedProduct',
                    'templates',
                ],
                onSuccess: () => goTo(nextStep),
                onFinish: () => setLoadingSelection(null),
            },
        );
    };

    const chooseCategory = (category: Category) => {
        setData((current) => ({
            ...current,
            category_id: category.id,
            product_id: null,
            template_id: null,
        }));
        setTemplateSkipped(false);
        reloadSelection({ category: category.slug }, 1, category.id);
    };

    const chooseProduct = (product: Product) => {
        if (!selectedCategory) {
            return;
        }

        setTemplateSkipped(false);
        reloadSelection(
            { category: selectedCategory.slug, product: product.slug },
            2,
            product.id,
        );
    };

    const validateStep = (index: number): string | null => {
        switch (index) {
            case 0:
                return data.category_id ? null : 'Please choose an occasion.';
            case 1:
                return selectedProduct ? null : 'Please choose a gift.';
            case 2:
                return data.template_id || templateSkipped
                    ? null
                    : 'Please choose a template, or let our designers start from scratch.';
            case 3:
                if (!designMode) {
                    return 'Please choose how you would like to create your design.';
                }

                if (
                    designMode === 'self' &&
                    !data.personalization.names.trim()
                ) {
                    return 'Please enter the names to feature on your design.';
                }

                if (
                    designMode === 'assisted' &&
                    !data.personalization.design_brief.trim()
                ) {
                    return 'Please describe the design you would like us to create.';
                }

                return null;
            case 4: {
                const missing = groupOptions(selectedProduct?.options ?? [])
                    .filter((group) => !group.multiple)
                    .find(
                        (group) =>
                            !group.options.some((option) =>
                                data.option_ids.includes(option.id),
                            ),
                    );

                if (missing) {
                    return `Please choose a ${missing.label.toLowerCase()}.`;
                }

                if (
                    !selectedProduct ||
                    data.quantity < selectedProduct.min_quantity ||
                    data.quantity > selectedProduct.max_quantity
                ) {
                    return `Quantity must be between ${selectedProduct?.min_quantity} and ${selectedProduct?.max_quantity}.`;
                }

                return null;
            }
            case 5:
                return designMode === 'self' && !data.approve_preview
                    ? 'Please approve your design preview to continue.'
                    : null;
            default:
                return null;
        }
    };

    const next = () => {
        const error = validateStep(step);

        if (error) {
            setStepError(error);

            return;
        }

        goTo(step + 1);
    };

    const submit = () => {
        for (let index = 0; index < WIZARD_STEPS.length - 1; index++) {
            const error = validateStep(index);

            if (error) {
                goTo(index);
                setStepError(error);

                return;
            }
        }

        form.post(storeOrder.url(), {
            forceFormData: true,
            preserveScroll: true,
            onError: (serverErrors) => {
                const firstKey = Object.keys(serverErrors)[0] ?? '';
                const target =
                    ERROR_STEPS.find(([pattern]) =>
                        pattern.test(firstKey),
                    )?.[1] ?? 6;

                if (target !== step) {
                    goTo(target);
                }
            },
        });
    };

    const setPersonalization = (key: keyof Personalization, value: string) =>
        setData('personalization', { ...data.personalization, [key]: value });

    const photoErrors = Object.entries(errors)
        .filter(([key]) => key.startsWith('photos'))
        .map(([, message]) => message)[0];

    const isLastStep = step === WIZARD_STEPS.length - 1;

    return (
        <>
            <Head title="Create your personalized gift" />

            <div className="mx-auto max-w-7xl px-4 pt-8 pb-36 sm:px-6 lg:px-8 lg:pb-16">
                <div className="mb-8">
                    <WizardProgress
                        current={step}
                        furthest={furthest}
                        onSelect={goTo}
                    />
                </div>

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div key={step} className="animate-fade-up">
                        {step === 0 && (
                            <StepShell
                                title="What's the occasion?"
                                description="Each occasion has gifts and templates made just for it."
                            >
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {categories.map((category) => (
                                        <SelectableCard
                                            key={category.id}
                                            selected={
                                                data.category_id === category.id
                                            }
                                            loading={
                                                loadingSelection === category.id
                                            }
                                            onClick={() =>
                                                chooseCategory(category)
                                            }
                                        >
                                            <span
                                                className="flex size-11 items-center justify-center rounded-2xl text-white"
                                                style={{
                                                    backgroundColor:
                                                        category.accent_color,
                                                }}
                                            >
                                                <CategoryIcon
                                                    name={category.icon}
                                                    className="size-5"
                                                />
                                            </span>
                                            <span className="mt-3 block font-display text-lg leading-tight">
                                                {category.name}
                                            </span>
                                            {category.tagline && (
                                                <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                                                    {category.tagline}
                                                </span>
                                            )}
                                        </SelectableCard>
                                    ))}
                                </div>
                            </StepShell>
                        )}

                        {step === 1 && (
                            <StepShell
                                title="Choose your keepsake"
                                description={
                                    selectedCategory
                                        ? `Gifts for ${selectedCategory.name.toLowerCase()}.`
                                        : undefined
                                }
                            >
                                {products.length === 0 ? (
                                    <EmptyNote>
                                        There are no gifts in this occasion yet.
                                        Please choose another occasion.
                                    </EmptyNote>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {products.map((product) => (
                                            <SelectableCard
                                                key={product.id}
                                                selected={
                                                    data.product_id ===
                                                    product.id
                                                }
                                                loading={
                                                    loadingSelection ===
                                                    product.id
                                                }
                                                onClick={() =>
                                                    chooseProduct(product)
                                                }
                                                className="p-0"
                                            >
                                                <ProductArt
                                                    product={product}
                                                    className="aspect-[16/10] w-full rounded-t-[1.1rem]"
                                                />
                                                <span className="block p-4">
                                                    <span className="flex items-start justify-between gap-2">
                                                        <span className="font-display text-lg leading-tight">
                                                            {product.name}
                                                        </span>
                                                        <span className="shrink-0 font-semibold text-plum dark:text-blush">
                                                            {money(
                                                                product.base_price,
                                                            )}
                                                        </span>
                                                    </span>
                                                    <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                                                        {
                                                            product.short_description
                                                        }
                                                    </span>
                                                    <span className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                        <span>
                                                            {
                                                                product.production_time
                                                            }
                                                        </span>
                                                        {product.min_quantity >
                                                            1 && (
                                                            <span>
                                                                · min.{' '}
                                                                {
                                                                    product.min_quantity
                                                                }{' '}
                                                                pcs
                                                            </span>
                                                        )}
                                                        {product.has_digital_experience && (
                                                            <span className="inline-flex items-center gap-1 text-plum dark:text-blush">
                                                                ·{' '}
                                                                <Nfc className="size-3" />{' '}
                                                                Tap memory page
                                                            </span>
                                                        )}
                                                    </span>
                                                </span>
                                            </SelectableCard>
                                        ))}
                                    </div>
                                )}
                            </StepShell>
                        )}

                        {step === 2 && selectedProduct && (
                            <StepShell
                                title="Pick a template"
                                description="Tap a design to preview it. You'll personalize it in the next step."
                            >
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                    {templates.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                setData('template_id', item.id);
                                                setTemplateSkipped(false);
                                                setStepError(null);
                                            }}
                                            className={cn(
                                                'group rounded-3xl border-2 bg-card p-2 text-left transition-all',
                                                data.template_id === item.id
                                                    ? 'border-rose shadow-[0_12px_30px_-16px_rgb(184_111_131/0.9)]'
                                                    : 'border-transparent hover:border-rose/40',
                                            )}
                                        >
                                            <div className="relative overflow-hidden rounded-2xl">
                                                <TemplatePreview
                                                    layout={item.layout}
                                                    palette={item.palette}
                                                    imageUrl={item.preview_url}
                                                />
                                                {data.template_id ===
                                                    item.id && (
                                                    <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-rose text-white shadow">
                                                        <Check
                                                            className="size-4"
                                                            strokeWidth={3}
                                                        />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-2 px-1 font-display">
                                                {item.name}
                                            </p>
                                            <p className="px-1 pb-1 text-xs text-muted-foreground">
                                                {item.layout_label}
                                            </p>
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setData((current) => ({
                                                ...current,
                                                template_id: null,
                                                design_mode: 'assisted',
                                            }));
                                            setTemplateSkipped(true);
                                            setStepError(null);
                                        }}
                                        className={cn(
                                            'flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition-all',
                                            templateSkipped
                                                ? 'border-rose bg-blush-light/50 dark:bg-rose/10'
                                                : 'border-plum/20 hover:border-rose/50',
                                        )}
                                    >
                                        <Wand2 className="size-8 text-rose" />
                                        <span className="font-display text-lg leading-tight">
                                            Start from scratch
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Describe your idea and our designers
                                            create something original.
                                        </span>
                                    </button>
                                </div>
                                {templates.length > 0 && template && (
                                    <div className="mt-6 grid items-center gap-6 rounded-3xl bg-blush-light/50 p-5 sm:grid-cols-[200px_1fr] dark:bg-muted/40">
                                        <DesignPreview
                                            product={selectedProduct}
                                            template={template}
                                            selectedOptions={
                                                price?.selected ?? []
                                            }
                                            photoUrl={null}
                                        />
                                        <div>
                                            <p className="text-xs font-semibold tracking-[0.2em] text-rose uppercase">
                                                Example mockup
                                            </p>
                                            <p className="mt-1 font-display text-2xl">
                                                {template.name}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {template.description}
                                            </p>
                                            {template.mockup_url && (
                                                <img
                                                    src={template.mockup_url}
                                                    alt={`${template.name} mockup`}
                                                    className="mt-3 max-h-40 rounded-xl"
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </StepShell>
                        )}

                        {step === 3 && selectedProduct && (
                            <StepShell
                                title="Add your story"
                                description="Choose how you'd like to create your design."
                            >
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <ModeCard
                                        icon={Brush}
                                        title="I'll customize it myself"
                                        body="Upload photos, add names, dates and a message. See a live preview."
                                        selected={designMode === 'self'}
                                        disabled={templateSkipped}
                                        disabledNote="Choose a template to customize it yourself."
                                        onClick={() =>
                                            setData('design_mode', 'self')
                                        }
                                    />
                                    <ModeCard
                                        icon={Wand2}
                                        title="Let Taptale design it for me"
                                        body={`Share your photos and ideas — we'll prepare the design for your approval. +${money(selectedProduct.design_fee)}`}
                                        selected={designMode === 'assisted'}
                                        onClick={() =>
                                            setData('design_mode', 'assisted')
                                        }
                                    />
                                </div>
                                <InputError
                                    message={errors.design_mode}
                                    className="mt-2"
                                />

                                {designMode && (
                                    <div className="mt-8 space-y-6">
                                        <div>
                                            <Label className="mb-2 block text-base">
                                                {designMode === 'self'
                                                    ? 'Your photos'
                                                    : 'Reference photos'}
                                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                                    up to{' '}
                                                    {selectedProduct.max_photos}
                                                </span>
                                            </Label>
                                            <FileDropzone
                                                id="photos"
                                                files={data.photos}
                                                onChange={(files) =>
                                                    setData('photos', files)
                                                }
                                                maxFiles={
                                                    selectedProduct.max_photos
                                                }
                                                maxKilobytes={
                                                    pricing.max_upload_kilobytes
                                                }
                                                label={
                                                    designMode === 'self'
                                                        ? 'Add your photos'
                                                        : 'Add reference photos'
                                                }
                                                error={photoErrors}
                                            />
                                            {designMode === 'self' && (
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    The first photo appears in
                                                    your preview. Our team
                                                    places every photo by hand
                                                    before printing.
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <Field
                                                label="Names"
                                                error={
                                                    errors[
                                                        'personalization.names'
                                                    ]
                                                }
                                                required={designMode === 'self'}
                                            >
                                                <Input
                                                    value={
                                                        data.personalization
                                                            .names
                                                    }
                                                    onChange={(event) =>
                                                        setPersonalization(
                                                            'names',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g. Ana & Leo"
                                                    maxLength={120}
                                                />
                                            </Field>
                                            <Field
                                                label="Date"
                                                error={
                                                    errors[
                                                        'personalization.date'
                                                    ]
                                                }
                                            >
                                                <Input
                                                    value={
                                                        data.personalization
                                                            .date
                                                    }
                                                    onChange={(event) =>
                                                        setPersonalization(
                                                            'date',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g. 02 · 14 · 2026"
                                                    maxLength={60}
                                                />
                                            </Field>
                                        </div>
                                        {isMusicDesign && (
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <Field
                                                    label={isCdDesign ? 'Album title' : 'Song title'}
                                                    error={errors['personalization.song_title']}
                                                >
                                                    <Input
                                                        value={data.personalization.song_title}
                                                        onChange={(event) => setPersonalization('song_title', event.target.value)}
                                                        placeholder={isCdDesign ? 'e.g. Golden Days' : 'e.g. Our Song'}
                                                        maxLength={80}
                                                    />
                                                </Field>
                                                <Field
                                                    label="Artist"
                                                    error={errors['personalization.artist']}
                                                >
                                                    <Input
                                                        value={data.personalization.artist}
                                                        onChange={(event) => setPersonalization('artist', event.target.value)}
                                                        placeholder="e.g. Ana & Leo"
                                                        maxLength={80}
                                                    />
                                                </Field>
                                            </div>
                                        )}
                                        <Field
                                            label={isCdDesign ? 'Tracklist (one song per line)' : 'Message'}
                                            error={
                                                errors[
                                                    'personalization.message'
                                                ]
                                            }
                                            hint={`${data.personalization.message.length}/300`}
                                        >
                                            <Textarea
                                                value={
                                                    data.personalization.message
                                                }
                                                onChange={(event) =>
                                                    setPersonalization(
                                                        'message',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder={
                                                    isCdDesign
                                                        ? 'First date\nOur song\nForever starts today'
                                                        : 'A short line, quote or inside joke'
                                                }
                                                maxLength={300}
                                                rows={isCdDesign ? 5 : 2}
                                            />
                                        </Field>

                                        {designMode === 'self' && (
                                            <div>
                                                <Label className="mb-2 block">
                                                    Accent color
                                                </Label>
                                                <div className="flex flex-wrap gap-3">
                                                    {[
                                                        template?.palette
                                                            .accent,
                                                        ...COLOR_CHOICES,
                                                    ]
                                                        .filter(
                                                            (
                                                                color,
                                                                index,
                                                                all,
                                                            ): color is string =>
                                                                !!color &&
                                                                all.indexOf(
                                                                    color,
                                                                ) === index,
                                                        )
                                                        .map((color) => (
                                                            <button
                                                                key={color}
                                                                type="button"
                                                                onClick={() =>
                                                                    setPersonalization(
                                                                        'color',
                                                                        color,
                                                                    )
                                                                }
                                                                className={cn(
                                                                    'size-10 rounded-full ring-2 ring-offset-2 ring-offset-background transition',
                                                                    (data
                                                                        .personalization
                                                                        .color ||
                                                                        template
                                                                            ?.palette
                                                                            .accent) ===
                                                                        color
                                                                        ? 'ring-plum dark:ring-blush'
                                                                        : 'ring-transparent hover:ring-plum/30',
                                                                )}
                                                                style={{
                                                                    backgroundColor:
                                                                        color,
                                                                }}
                                                                aria-label={`Accent color ${color}`}
                                                            />
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {designMode === 'assisted' && (
                                            <Field
                                                label="Describe your dream design"
                                                error={
                                                    errors[
                                                        'personalization.design_brief'
                                                    ]
                                                }
                                                required
                                            >
                                                <Textarea
                                                    value={
                                                        data.personalization
                                                            .design_brief
                                                    }
                                                    onChange={(event) =>
                                                        setPersonalization(
                                                            'design_brief',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Tell us the mood, colors, style and any details you'd love to see. The more you share, the closer our first draft will be."
                                                    rows={5}
                                                    maxLength={2000}
                                                />
                                            </Field>
                                        )}

                                        <Field
                                            label="Special instructions"
                                            error={
                                                errors[
                                                    'personalization.instructions'
                                                ]
                                            }
                                        >
                                            <Textarea
                                                value={
                                                    data.personalization
                                                        .instructions
                                                }
                                                onChange={(event) =>
                                                    setPersonalization(
                                                        'instructions',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Anything else we should know? e.g. which photo goes on the front."
                                                rows={3}
                                                maxLength={2000}
                                            />
                                        </Field>
                                    </div>
                                )}
                            </StepShell>
                        )}

                        {step === 4 && selectedProduct && (
                            <StepShell
                                title="Size, finish & quantity"
                                description="Your price updates as you choose."
                            >
                                <OptionPicker
                                    options={selectedProduct.options ?? []}
                                    selected={data.option_ids}
                                    onChange={(ids) =>
                                        setData('option_ids', ids)
                                    }
                                    symbol={symbol}
                                />
                                <InputError
                                    message={errors.option_ids}
                                    className="mt-2"
                                />

                                <fieldset className="mt-8">
                                    <legend className="mb-3 flex items-baseline gap-2">
                                        <span className="font-display text-lg">
                                            Quantity
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {selectedProduct.min_quantity > 1
                                                ? `Minimum ${selectedProduct.min_quantity} pieces`
                                                : `Up to ${selectedProduct.max_quantity}`}
                                        </span>
                                    </legend>
                                    <div className="inline-flex items-center rounded-full border-2 border-border bg-card p-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-full"
                                            onClick={() =>
                                                setData(
                                                    'quantity',
                                                    Math.max(
                                                        selectedProduct.min_quantity,
                                                        data.quantity - 1,
                                                    ),
                                                )
                                            }
                                            aria-label="Decrease quantity"
                                        >
                                            <Minus className="size-4" />
                                        </Button>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={selectedProduct.min_quantity}
                                            max={selectedProduct.max_quantity}
                                            value={data.quantity}
                                            onChange={(event) =>
                                                setData(
                                                    'quantity',
                                                    Number.parseInt(
                                                        event.target.value,
                                                        10,
                                                    ) || 0,
                                                )
                                            }
                                            className="w-16 [appearance:textfield] bg-transparent text-center text-lg font-semibold outline-none [&::-webkit-inner-spin-button]:appearance-none"
                                            aria-label="Quantity"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-full"
                                            onClick={() =>
                                                setData(
                                                    'quantity',
                                                    Math.min(
                                                        selectedProduct.max_quantity,
                                                        data.quantity + 1,
                                                    ),
                                                )
                                            }
                                            aria-label="Increase quantity"
                                        >
                                            <Plus className="size-4" />
                                        </Button>
                                    </div>
                                    <InputError
                                        message={errors.quantity}
                                        className="mt-2"
                                    />
                                </fieldset>
                            </StepShell>
                        )}

                        {step === 5 && selectedProduct && (
                            <StepShell
                                title="Preview your design"
                                description={
                                    designMode === 'self'
                                        ? 'This is how your keepsake will look. Approve it to continue.'
                                        : 'Here is your chosen starting point.'
                                }
                            >
                                <div className="grid items-center gap-8 rounded-[2rem] bg-gradient-to-br from-blush-light via-cream to-cream-dark p-6 sm:p-10 md:grid-cols-[1.1fr_1fr] dark:from-muted dark:via-background dark:to-muted">
                                    <DesignPreview
                                        product={selectedProduct}
                                        template={template}
                                        selectedOptions={price?.selected ?? []}
                                        photoUrl={photoUrl}
                                        {...previewText}
                                        detailed
                                        className="mx-auto w-full max-w-sm"
                                    />
                                    <div className="space-y-4">
                                        <p className="font-display text-2xl">
                                            {selectedProduct.name}
                                        </p>
                                        <ul className="space-y-1.5 text-sm">
                                            {price?.selected.map((option) => (
                                                <li
                                                    key={option.id}
                                                    className="flex gap-2"
                                                >
                                                    <Check className="mt-0.5 size-4 shrink-0 text-rose" />
                                                    <span>
                                                        <span className="text-muted-foreground">
                                                            {option.group_label}
                                                            :
                                                        </span>{' '}
                                                        {option.name}
                                                    </span>
                                                </li>
                                            ))}
                                            <li className="flex gap-2">
                                                <Check className="mt-0.5 size-4 shrink-0 text-rose" />
                                                <span>
                                                    <span className="text-muted-foreground">
                                                        Quantity:
                                                    </span>{' '}
                                                    {data.quantity}
                                                </span>
                                            </li>
                                        </ul>
                                        {data.photos.length > 1 && (
                                            <p className="text-xs text-muted-foreground">
                                                + {data.photos.length - 1} more{' '}
                                                {data.photos.length === 2
                                                    ? 'photo'
                                                    : 'photos'}{' '}
                                                attached for our designers.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {designMode === 'self' ? (
                                    <label
                                        className={cn(
                                            'mt-6 flex cursor-pointer gap-4 rounded-2xl border-2 bg-card p-5 transition',
                                            data.approve_preview
                                                ? 'border-rose'
                                                : 'border-border',
                                        )}
                                    >
                                        <Checkbox
                                            checked={data.approve_preview}
                                            onCheckedChange={(checked) => {
                                                setData(
                                                    'approve_preview',
                                                    checked === true,
                                                );
                                                setStepError(null);
                                            }}
                                            className="mt-0.5 size-5"
                                        />
                                        <span>
                                            <span className="block font-medium">
                                                I approve this design preview
                                            </span>
                                            <span className="mt-1 block text-sm text-muted-foreground">
                                                Our studio will place your
                                                photos and text exactly as
                                                previewed. If we notice anything
                                                that won't print well, we'll
                                                send you a proof to approve
                                                before production.
                                            </span>
                                        </span>
                                    </label>
                                ) : (
                                    <div className="mt-6 flex gap-4 rounded-2xl border border-plum/15 bg-card p-5">
                                        <ShieldCheck className="size-6 shrink-0 text-rose" />
                                        <div className="text-sm">
                                            <p className="font-medium">
                                                You'll approve your design
                                                before we make it
                                            </p>
                                            <p className="mt-1 text-muted-foreground">
                                                After your payment is verified,
                                                our designers prepare your
                                                design and post it to your
                                                account. You can approve it or
                                                request revisions — production
                                                starts only after your approval.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <InputError
                                    message={errors.approve_preview}
                                    className="mt-2"
                                />
                            </StepShell>
                        )}

                        {step === 6 && (
                            <StepShell
                                title="Delivery & payment"
                                description="Almost there! Tell us where to send your gift."
                            >
                                <div className="space-y-8">
                                    <section className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            label="Full name"
                                            error={errors.customer_name}
                                            required
                                        >
                                            <Input
                                                value={data.customer_name}
                                                onChange={(event) =>
                                                    setData(
                                                        'customer_name',
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="name"
                                            />
                                        </Field>
                                        <Field
                                            label="Contact number"
                                            error={errors.customer_phone}
                                            required
                                        >
                                            <Input
                                                value={data.customer_phone}
                                                onChange={(event) =>
                                                    setData(
                                                        'customer_phone',
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="tel"
                                                inputMode="tel"
                                                placeholder="09XX XXX XXXX"
                                            />
                                        </Field>
                                        <Field
                                            label="Email address"
                                            error={errors.customer_email}
                                            required
                                            className="sm:col-span-2"
                                        >
                                            <Input
                                                type="email"
                                                value={data.customer_email}
                                                onChange={(event) =>
                                                    setData(
                                                        'customer_email',
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="email"
                                            />
                                        </Field>
                                        <Field
                                            label="Street address"
                                            error={errors.address_line}
                                            required
                                            className="sm:col-span-2"
                                        >
                                            <Input
                                                value={data.address_line}
                                                onChange={(event) =>
                                                    setData(
                                                        'address_line',
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="street-address"
                                                placeholder="House no., street, barangay"
                                            />
                                        </Field>
                                        <Field
                                            label="City / Municipality"
                                            error={errors.city}
                                            required
                                        >
                                            <Input
                                                value={data.city}
                                                onChange={(event) =>
                                                    setData(
                                                        'city',
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="address-level2"
                                            />
                                        </Field>
                                        <Field
                                            label="Province"
                                            error={errors.province}
                                            required
                                        >
                                            <Input
                                                value={data.province}
                                                onChange={(event) =>
                                                    setData(
                                                        'province',
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="address-level1"
                                            />
                                        </Field>
                                        <Field
                                            label="Postal code"
                                            error={errors.postal_code}
                                            required
                                        >
                                            <Input
                                                value={data.postal_code}
                                                onChange={(event) =>
                                                    setData(
                                                        'postal_code',
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="postal-code"
                                                inputMode="numeric"
                                            />
                                        </Field>
                                        <label className="flex items-center gap-3 self-end pb-2 text-sm">
                                            <Checkbox
                                                checked={data.save_details}
                                                onCheckedChange={(checked) =>
                                                    setData(
                                                        'save_details',
                                                        checked === true,
                                                    )
                                                }
                                            />
                                            Save these details to my account
                                        </label>
                                    </section>

                                    <section>
                                        <h3 className="mb-3 font-display text-lg">
                                            Payment method
                                        </h3>
                                        {paymentMethods.length === 0 ? (
                                            <EmptyNote>
                                                Online ordering is temporarily
                                                unavailable — no payment methods
                                                are active. Please contact us.
                                            </EmptyNote>
                                        ) : (
                                            <div className="grid gap-3">
                                                {paymentMethods.map(
                                                    (method) => (
                                                        <button
                                                            key={method.id}
                                                            type="button"
                                                            onClick={() =>
                                                                setData(
                                                                    'payment_method_id',
                                                                    method.id,
                                                                )
                                                            }
                                                            className={cn(
                                                                'rounded-2xl border-2 bg-card p-4 text-left transition',
                                                                data.payment_method_id ===
                                                                    method.id
                                                                    ? 'border-rose bg-blush-light/40 dark:bg-rose/10'
                                                                    : 'border-border hover:border-rose/40',
                                                            )}
                                                        >
                                                            <span className="flex items-center justify-between gap-3">
                                                                <span className="font-medium">
                                                                    {
                                                                        method.name
                                                                    }
                                                                </span>
                                                                <span
                                                                    className={cn(
                                                                        'flex size-5 items-center justify-center rounded-full border-2',
                                                                        data.payment_method_id ===
                                                                            method.id
                                                                            ? 'border-rose bg-rose text-white'
                                                                            : 'border-border',
                                                                    )}
                                                                >
                                                                    {data.payment_method_id ===
                                                                        method.id && (
                                                                        <Check
                                                                            className="size-3"
                                                                            strokeWidth={
                                                                                3
                                                                            }
                                                                        />
                                                                    )}
                                                                </span>
                                                            </span>
                                                            {data.payment_method_id ===
                                                                method.id &&
                                                                method.instructions && (
                                                                    <span className="mt-2 block text-sm text-muted-foreground">
                                                                        {
                                                                            method.instructions
                                                                        }
                                                                    </span>
                                                                )}
                                                        </button>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                        <InputError
                                            message={errors.payment_method_id}
                                            className="mt-2"
                                        />
                                        <p className="mt-3 text-xs text-muted-foreground">
                                            You'll see the account details and
                                            upload your receipt on your order
                                            page right after placing the order.
                                        </p>
                                    </section>

                                    <Field
                                        label="Additional instructions"
                                        error={errors.customer_notes}
                                    >
                                        <Textarea
                                            value={data.customer_notes}
                                            onChange={(event) =>
                                                setData(
                                                    'customer_notes',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Delivery notes, gift message for the package, preferred schedule…"
                                            rows={3}
                                            maxLength={2000}
                                        />
                                    </Field>
                                </div>
                            </StepShell>
                        )}

                        {stepError && (
                            <p
                                className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                                role="alert"
                            >
                                {stepError}
                            </p>
                        )}

                        {/* Desktop navigation */}
                        <div className="mt-10 hidden items-center justify-between lg:flex">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => goTo(step - 1)}
                                disabled={step === 0}
                                className="rounded-full"
                            >
                                <ArrowLeft className="size-4" /> Back
                            </Button>
                            {step >= 1 && (
                                <PrimaryAction
                                    isLast={isLastStep}
                                    processing={form.processing}
                                    onNext={next}
                                    onSubmit={submit}
                                    total={price ? money(price.total) : null}
                                    disabled={step === 1 && !selectedProduct}
                                />
                            )}
                        </div>
                    </div>

                    <aside className="hidden lg:block">
                        <div className="sticky top-28 space-y-5">
                            {selectedProduct && step >= 2 && (
                                <div className="rounded-3xl bg-gradient-to-br from-blush-light to-cream-dark/70 p-6 dark:from-muted dark:to-background">
                                    <p className="mb-4 text-center text-xs font-semibold tracking-[0.2em] text-rose uppercase">
                                        Live preview
                                    </p>
                                    <DesignPreview
                                        product={selectedProduct}
                                        template={template}
                                        selectedOptions={price?.selected ?? []}
                                        photoUrl={photoUrl}
                                        {...previewText}
                                        className="mx-auto max-w-[260px]"
                                    />
                                </div>
                            )}
                            <OrderSummary
                                category={selectedCategory}
                                product={selectedProduct}
                                template={template}
                                quantity={data.quantity}
                                price={step >= 1 ? price : null}
                                pricing={pricing}
                                designModeLabel={
                                    designMode === 'self'
                                        ? 'Customized by you'
                                        : designMode === 'assisted'
                                          ? 'Designed by Taptale'
                                          : null
                                }
                            />
                            <p className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                                <BadgeCheck className="size-4 text-rose" />{' '}
                                Nothing is produced until your design is
                                approved.
                            </p>
                        </div>
                    </aside>
                </div>
            </div>

            {/* Mobile sticky action bar */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-plum/10 bg-cream/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden dark:bg-background/95">
                <div className="mx-auto flex max-w-xl items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-12 shrink-0 rounded-full"
                        onClick={() => goTo(step - 1)}
                        disabled={step === 0}
                        aria-label="Back"
                    >
                        <ArrowLeft className="size-5" />
                    </Button>
                    <div className="min-w-0 flex-1">
                        {price && step >= 1 ? (
                            <>
                                <p className="text-xs text-muted-foreground">
                                    Total
                                </p>
                                <p className="font-display text-xl leading-tight font-semibold text-plum dark:text-blush">
                                    {money(price.total)}
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {WIZARD_STEPS[step].description}
                            </p>
                        )}
                    </div>
                    {step >= 1 && (
                        <PrimaryAction
                            isLast={isLastStep}
                            processing={form.processing}
                            onNext={next}
                            onSubmit={submit}
                            total={null}
                            disabled={step === 1 && !selectedProduct}
                            compact
                        />
                    )}
                </div>
            </div>
        </>
    );
}

function StepShell({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section>
            <h1 className="font-display text-3xl leading-tight font-medium text-charcoal sm:text-4xl dark:text-cream">
                {title}
            </h1>
            {description && (
                <p className="mt-2 text-muted-foreground">{description}</p>
            )}
            <div className="mt-8">{children}</div>
        </section>
    );
}

function SelectableCard({
    selected,
    loading,
    onClick,
    className,
    children,
}: {
    selected: boolean;
    loading?: boolean;
    onClick: () => void;
    className?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className={cn(
                'relative overflow-hidden rounded-[1.25rem] border-2 bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5',
                selected
                    ? 'border-rose shadow-[0_14px_30px_-18px_rgb(184_111_131/0.9)]'
                    : 'border-border/70 hover:border-rose/40',
                className,
            )}
        >
            {children}
            {(selected || loading) && (
                <span className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-rose text-white shadow">
                    {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Check className="size-4" strokeWidth={3} />
                    )}
                </span>
            )}
        </button>
    );
}

function ModeCard({
    icon: Icon,
    title,
    body,
    selected,
    disabled,
    disabledNote,
    onClick,
}: {
    icon: typeof Brush;
    title: string;
    body: string;
    selected: boolean;
    disabled?: boolean;
    disabledNote?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'flex gap-4 rounded-3xl border-2 bg-card p-5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50',
                selected
                    ? 'border-rose bg-blush-light/40 shadow-[0_14px_30px_-18px_rgb(184_111_131/0.9)] dark:bg-rose/10'
                    : 'border-border hover:border-rose/40',
            )}
        >
            <span
                className={cn(
                    'flex size-12 shrink-0 items-center justify-center rounded-2xl',
                    selected
                        ? 'bg-rose text-white'
                        : 'bg-blush-light text-plum dark:bg-rose/20 dark:text-blush',
                )}
            >
                <Icon className="size-6" />
            </span>
            <span>
                <span className="block font-display text-lg leading-tight">
                    {title}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                    {disabled && disabledNote ? disabledNote : body}
                </span>
            </span>
        </button>
    );
}

function Field({
    label,
    error,
    hint,
    required,
    className,
    children,
}: {
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={cn('grid gap-2', className)}>
            <div className="flex items-baseline justify-between">
                <Label>
                    {label}
                    {required && <span className="ml-0.5 text-rose">*</span>}
                </Label>
                {hint && (
                    <span className="text-xs text-muted-foreground">
                        {hint}
                    </span>
                )}
            </div>
            {children}
            <InputError message={error} />
        </div>
    );
}

function EmptyNote({ children }: { children: ReactNode }) {
    return (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            {children}
        </p>
    );
}

function PrimaryAction({
    isLast,
    processing,
    onNext,
    onSubmit,
    total,
    disabled,
    compact = false,
}: {
    isLast: boolean;
    processing: boolean;
    onNext: () => void;
    onSubmit: () => void;
    total: string | null;
    disabled?: boolean;
    compact?: boolean;
}) {
    return (
        <Button
            type="button"
            onClick={isLast ? onSubmit : onNext}
            disabled={processing || disabled}
            className={cn(
                'rounded-full bg-plum text-white shadow-[0_10px_24px_-10px_rgb(113_61_80/0.7)] hover:bg-plum-dark dark:bg-blush dark:text-plum-dark',
                compact ? 'h-12 px-6' : 'h-12 px-8 text-base',
            )}
        >
            {processing && <Loader2 className="size-4 animate-spin" />}
            {isLast ? (
                <>Place order{total && !compact ? ` · ${total}` : ''}</>
            ) : (
                <>
                    Continue <ArrowRight className="size-4" />
                </>
            )}
        </Button>
    );
}
