import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    Brush,
    Check,
    Heart,
    History,
    Loader2,
    MailCheck,
    Minus,
    Nfc,
    Plus,
    ShieldCheck,
    Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import PasswordInput from '@/components/password-input';
import { CategoryIcon } from '@/components/taptale/category-icon';
import { FileDropzone } from '@/components/taptale/file-dropzone';
import { ProductArt } from '@/components/taptale/product-art';
import { MUSIC_LAYOUTS } from '@/components/taptale/template-preview';
import { DesignPreview } from '@/components/taptale/wizard/design-preview';
import { OptionPicker } from '@/components/taptale/wizard/option-picker';
import { OrderSummary } from '@/components/taptale/wizard/order-summary';
import { ProductShowcase } from '@/components/taptale/wizard/product-showcase';
import { WebsitePicker } from '@/components/taptale/wizard/website-picker';
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
import { stepsFor } from '@/lib/wizard';
import type { DesignMode, WizardStepKey } from '@/lib/wizard';
import {
    canResume,
    clearDraft,
    loadDraft,
    loadPhotos,
    saveDraft,
    savePhotos,
} from '@/lib/wizard-draft';
import type { WizardDraft } from '@/lib/wizard-draft';
import { store as logIn } from '@/routes/login';
import { create as wizardRoute, store as storeOrder } from '@/routes/orders';
import { privacy, terms } from '@/routes/pages';
import { request as requestPasswordReset } from '@/routes/password';
import { store as registerAccount } from '@/routes/register';
import { send as sendVerification } from '@/routes/verification';
import type {
    Category,
    ExperienceTemplateOption,
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
    experienceTemplates: ExperienceTemplateOption[];
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
    } | null;
    passwordRules: string | null;
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
    personalize_later: boolean;
    experience_template: string;
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

/**
 * Contact and delivery details are never kept in the browser draft, so a
 * shared computer does not hold anyone's address. The account fills them.
 */
const CONTACT_FIELDS = [
    'customer_name',
    'customer_email',
    'customer_phone',
    'address_line',
    'city',
    'province',
    'postal_code',
] as const;

type DraftData = Omit<WizardForm, 'photos' | (typeof CONTACT_FIELDS)[number]>;

function toDraftData(data: WizardForm): DraftData {
    const draft: Partial<WizardForm> = { ...data };

    delete draft.photos;
    CONTACT_FIELDS.forEach((field) => delete draft[field]);

    return draft as DraftData;
}

const ERROR_STEPS: [RegExp, WizardStepKey][] = [
    [/^(category_id|product_id|template_id)/, 'product'],
    [/^experience_template/, 'website'],
    [/^(design_mode|personalization|photos)/, 'customize'],
    [/^(option_ids|quantity|approve_preview)/, 'specs'],
];

export default function CreateGift({
    categories,
    selectedCategory,
    products,
    selectedProduct,
    templates,
    experienceTemplates,
    initialTemplate,
    paymentMethods,
    pricing,
    customer,
    passwordRules,
}: Props) {
    const money = useMoney();
    const { storefront, auth } = usePage().props;
    const symbol = storefront?.currencySymbol ?? '₱';
    const isGuest = !auth.user;
    const isEmailVerified = Boolean(auth.user?.email_verified_at);
    const preselectedTemplate =
        templates.find((template) => template.slug === initialTemplate) ?? null;

    const initialStep = 0;
    const [step, setStep] = useState(initialStep);
    const [furthest, setFurthest] = useState(initialStep);
    const [templateSkipped, setTemplateSkipped] = useState(false);
    const [loadingSelection, setLoadingSelection] = useState<number | null>(
        null,
    );
    const [stepError, setStepError] = useState<string | null>(null);
    const [loadingIdea, setLoadingIdea] = useState<number | null>(null);
    const [verificationSent, setVerificationSent] = useState(false);
    const [sendingVerification, setSendingVerification] = useState(false);

    const form = useForm<WizardForm>({
        category_id: selectedCategory?.id ?? null,
        product_id: selectedProduct?.id ?? null,
        template_id: preselectedTemplate?.id ?? templates[0]?.id ?? null,
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
        personalize_later: false,
        experience_template: '',
        customer_name: customer?.name ?? '',
        customer_email: customer?.email ?? '',
        customer_phone: customer?.phone ?? '',
        address_line: customer?.address_line ?? '',
        city: customer?.city ?? '',
        province: customer?.province ?? '',
        postal_code: customer?.postal_code ?? '',
        customer_notes: '',
        payment_method_id: paymentMethods[0]?.id ?? null,
        save_details: !customer?.phone,
    });

    const { data, setData, errors } = form;

    // A guest who signs up or logs in at checkout stays on this page with
    // everything they made; fill in whatever their account already knows.
    useEffect(() => {
        if (!customer) {
            return;
        }

        setData((current) => ({
            ...current,
            customer_name: current.customer_name || customer.name || '',
            customer_email: current.customer_email || customer.email || '',
            customer_phone: current.customer_phone || customer.phone || '',
            address_line: current.address_line || customer.address_line || '',
            city: current.city || customer.city || '',
            province: current.province || customer.province || '',
            postal_code: current.postal_code || customer.postal_code || '',
            save_details: !customer.phone,
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer?.email]);

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
            template_id: templates[0]?.id ?? null,
            photos: current.photos.slice(0, selectedProduct.max_photos),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProduct?.id]);

    const template =
        templates.find((item) => item.id === data.template_id) ?? null;
    const designMode = data.design_mode || null;
    const hasTapPage =
        !!selectedProduct &&
        (selectedProduct.has_digital_experience ||
            (selectedProduct.options ?? []).some(
                (option) => option.enables_digital_experience,
            ));
    const steps = stepsFor(hasTapPage);
    const stepKey: WizardStepKey = steps[step]?.key ?? 'product';
    const stepIndex = (key: WizardStepKey) =>
        Math.max(
            0,
            steps.findIndex((item) => item.key === key),
        );
    const needsPreviewApproval =
        designMode === 'self' && !data.personalize_later;

    const userId = auth.user?.id ?? null;
    const [isDraftReady, setIsDraftReady] = useState(false);
    const [savedDraft, setSavedDraft] = useState<WizardDraft<DraftData> | null>(
        null,
    );
    const [wasRestored, setWasRestored] = useState(false);

    // Pick up a gift this visitor was crafting in this browser — after
    // logging in (even through two-factor), a refresh or a later visit.
    useEffect(() => {
        const draft = loadDraft<DraftData>();

        if (!draft || !canResume(draft, userId)) {
            setIsDraftReady(true);

            return;
        }

        if (!selectedProduct || selectedProduct.slug !== draft.productSlug) {
            setSavedDraft(draft);
            setIsDraftReady(true);

            return;
        }

        const optionIds = new Set(
            (selectedProduct.options ?? []).map((option) => option.id),
        );
        const restoredOptions = Array.isArray(draft.data.option_ids)
            ? draft.data.option_ids.filter((id) => optionIds.has(id))
            : [];
        const lastStep = steps.length - 1;

        setData((current) => ({
            ...current,
            ...draft.data,
            category_id: current.category_id,
            product_id: selectedProduct.id,
            personalization: {
                ...current.personalization,
                ...draft.data.personalization,
            },
            option_ids:
                restoredOptions.length > 0
                    ? restoredOptions
                    : current.option_ids,
            template_id: templates.some(
                (item) => item.id === draft.data.template_id,
            )
                ? draft.data.template_id
                : current.template_id,
            payment_method_id: paymentMethods.some(
                (method) => method.id === draft.data.payment_method_id,
            )
                ? draft.data.payment_method_id
                : current.payment_method_id,
        }));
        setTemplateSkipped(Boolean(draft.templateSkipped));
        setStep(Math.min(Math.max(0, draft.step), lastStep));
        setFurthest(Math.min(Math.max(0, draft.furthest), lastStep));
        setWasRestored(true);

        void loadPhotos()
            .then((photos) => {
                if (photos.length > 0) {
                    setData(
                        'photos',
                        photos.slice(0, selectedProduct.max_photos),
                    );
                }
            })
            .finally(() => setIsDraftReady(true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // An unrelated saved gift stays untouched until the visitor starts
    // changing this one (then the new gift replaces it).
    const isKeepingSavedDraft =
        savedDraft !== null && !form.isDirty && step === 0;

    const saveCurrentDraft = () => {
        if (!selectedProduct) {
            return;
        }

        saveDraft<DraftData>({
            ownerId: userId,
            productSlug: selectedProduct.slug,
            productName: selectedProduct.name,
            categorySlug: selectedCategory?.slug ?? null,
            step,
            furthest,
            templateSkipped,
            data: toDraftData(data),
        });
    };

    useEffect(() => {
        if (!isDraftReady || !selectedProduct || isKeepingSavedDraft) {
            return;
        }

        const timer = window.setTimeout(() => {
            saveCurrentDraft();
            setSavedDraft(null);
        }, 400);

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        data,
        step,
        furthest,
        templateSkipped,
        isDraftReady,
        isKeepingSavedDraft,
    ]);

    useEffect(() => {
        if (!isDraftReady || !selectedProduct || isKeepingSavedDraft) {
            return;
        }

        void savePhotos(data.photos);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.photos, isDraftReady, isKeepingSavedDraft]);

    const startOver = () => {
        clearDraft();
        router.visit(wizardRoute.url());
    };

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

    /**
     * Occasions are optional gift ideas: picking one only narrows the gift list.
     */
    const browseOccasion = (category: Category | null) => {
        setStepError(null);
        setLoadingIdea(category?.id ?? 0);
        router.get(
            wizardRoute.url({
                query: category ? { category: category.slug } : {},
            }),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['selectedCategory', 'products'],
                onFinish: () => setLoadingIdea(null),
            },
        );
    };

    const chooseProduct = (product: Product) => {
        setTemplateSkipped(false);
        reloadSelection(
            selectedCategory
                ? { category: selectedCategory.slug, product: product.slug }
                : { product: product.slug },
            0,
            product.id,
        );
    };

    const validateStep = (index: number): string | null => {
        switch (steps[index]?.key) {
            case 'product':
                if (!selectedProduct) {
                    return 'Please choose a gift.';
                }

                return data.template_id || templateSkipped
                    ? null
                    : 'Please choose a design, or pick “Custom design”.';
            case 'customize':
                if (data.personalize_later) {
                    return null;
                }

                if (!designMode) {
                    return 'Please choose how you would like to create your design, or skip this step.';
                }

                if (
                    designMode === 'self' &&
                    !data.personalization.names.trim()
                ) {
                    return 'Please enter the names to feature on your design, or skip this step.';
                }

                if (
                    designMode === 'assisted' &&
                    !data.personalization.design_brief.trim()
                ) {
                    return 'Please describe the design you would like us to create, or skip this step.';
                }

                return null;
            case 'specs': {
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

                if (needsPreviewApproval && !data.approve_preview) {
                    return 'Please approve your design preview to continue.';
                }

                return null;
            }
            default:
                return null;
        }
    };

    const skipPersonalize = () => {
        setData((current) => ({
            ...current,
            personalize_later: true,
            design_mode: templateSkipped ? 'assisted' : 'self',
            approve_preview: false,
        }));
        goTo(step + 1);
    };

    const next = () => {
        const error = validateStep(step);

        if (error) {
            setStepError(error);

            return;
        }

        if (stepKey === 'customize' && data.personalize_later && designMode) {
            setData('personalize_later', false);
        }

        goTo(step + 1);
    };

    const isAwaitingVerification =
        step === steps.length - 1 && !isEmailVerified && verificationSent;

    // Once the link is sent, quietly check until the customer clicks it.
    useEffect(() => {
        if (!isAwaitingVerification) {
            return;
        }

        const interval = window.setInterval(
            () => router.reload({ only: ['auth'] }),
            5000,
        );

        return () => window.clearInterval(interval);
    }, [isAwaitingVerification]);

    const sendVerificationLink = () => {
        setSendingVerification(true);
        router.post(
            sendVerification.url(),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                only: ['auth'],
                onSuccess: () => {
                    setVerificationSent(true);
                    setStepError(null);
                },
                onFinish: () => setSendingVerification(false),
            },
        );
    };

    const submit = () => {
        for (let index = 0; index < steps.length - 1; index++) {
            const error = validateStep(index);

            if (error) {
                goTo(index);
                setStepError(error);

                return;
            }
        }

        if (isGuest) {
            setStepError(
                'Create your free account or log in to place your order — your gift is saved right here.',
            );
            document
                .getElementById('checkout-account')
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });

            return;
        }

        if (!isEmailVerified) {
            setStepError(
                'Please confirm your email address before placing your order.',
            );

            return;
        }

        const isGiftInOccasion =
            selectedCategory !== null &&
            products.some((product) => product.id === data.product_id);

        form.transform((values) => ({
            ...values,
            category_id: isGiftInOccasion ? selectedCategory.id : null,
        }));

        // Cleared up front: a PayMongo order leaves the site straight away.
        clearDraft();

        form.post(storeOrder.url(), {
            forceFormData: true,
            preserveScroll: true,
            onError: (serverErrors) => {
                saveCurrentDraft();
                void savePhotos(data.photos);

                const firstKey = Object.keys(serverErrors)[0] ?? '';
                const key = ERROR_STEPS.find(([pattern]) =>
                    pattern.test(firstKey),
                )?.[1];
                const target = key ? stepIndex(key) : steps.length - 1;

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

    const isLastStep = step === steps.length - 1;

    return (
        <>
            <Head title="Order Your Gift" />

            <div className="mx-auto max-w-7xl px-4 pt-8 pb-36 sm:px-6 lg:px-8 lg:pb-16">
                {savedDraft && (
                    <DraftNotice
                        title={`Continue your ${savedDraft.productName}?`}
                        description="You started crafting this gift earlier — it's saved on this device. Starting a different gift replaces it."
                        action="Continue my gift"
                        onAction={() =>
                            router.visit(
                                wizardRoute.url({
                                    query: savedDraft.categorySlug
                                        ? {
                                              category: savedDraft.categorySlug,
                                              product: savedDraft.productSlug,
                                          }
                                        : { product: savedDraft.productSlug },
                                }),
                            )
                        }
                        onDismiss={() => {
                            clearDraft();
                            setSavedDraft(null);
                        }}
                        dismissLabel="Discard"
                    />
                )}
                {wasRestored && (
                    <DraftNotice
                        title="Welcome back — your gift is just as you left it"
                        description="We saved your choices on this device so you can pick up where you left off."
                        action="Start over"
                        onAction={startOver}
                        onDismiss={() => setWasRestored(false)}
                        dismissLabel="Got it"
                        isSubtle
                    />
                )}
                <div className="mb-8">
                    <WizardProgress
                        steps={steps}
                        current={step}
                        furthest={furthest}
                        onSelect={goTo}
                    />
                </div>

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div key={step} className="animate-fade-up">
                        {stepKey === 'product' && (
                            <StepShell
                                title={
                                    selectedProduct
                                        ? 'Your gift'
                                        : 'Choose your gift'
                                }
                                description={
                                    selectedProduct
                                        ? 'Pick a design to see it on your gift. Want something else? Choose another gift below.'
                                        : selectedCategory
                                          ? `Gift ideas for ${selectedCategory.name.toLowerCase()}. Tap a gift to see its details.`
                                          : 'Tap a gift to see its details and designs. Need ideas? Pick an occasion below.'
                                }
                            >
                                {selectedProduct && (
                                    <div className="mb-10">
                                        <ProductShowcase
                                            product={selectedProduct}
                                            templates={templates}
                                            selectedTemplateId={
                                                data.template_id
                                            }
                                            customSelected={templateSkipped}
                                            hasTapPage={hasTapPage}
                                            loading={loadingSelection !== null}
                                            onSelectTemplate={(id) => {
                                                setData((current) => ({
                                                    ...current,
                                                    template_id: id,
                                                    design_mode:
                                                        current.design_mode ===
                                                        'assisted'
                                                            ? ''
                                                            : current.design_mode,
                                                }));
                                                setTemplateSkipped(false);
                                                setStepError(null);
                                            }}
                                            onSelectCustom={() => {
                                                setData((current) => ({
                                                    ...current,
                                                    template_id: null,
                                                    design_mode: 'assisted',
                                                }));
                                                setTemplateSkipped(true);
                                                setStepError(null);
                                            }}
                                            preview={
                                                <DesignPreview
                                                    product={selectedProduct}
                                                    template={template}
                                                    selectedOptions={
                                                        price?.selected ?? []
                                                    }
                                                    photoUrl={photoUrl}
                                                    {...previewText}
                                                />
                                            }
                                        />
                                        <p className="mt-10 font-display text-xl">
                                            Other gifts
                                        </p>
                                    </div>
                                )}
                                <GiftIdeas
                                    categories={categories}
                                    selected={selectedCategory}
                                    loadingId={loadingIdea}
                                    onSelect={browseOccasion}
                                />
                                {products.length === 0 ? (
                                    <EmptyNote>
                                        No gifts for this occasion yet. Tap
                                        &ldquo;All gifts&rdquo; to see
                                        everything.
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

                        {stepKey === 'website' && selectedProduct && (
                            <StepShell
                                title="Choose your tap page design"
                                description="This little website opens when they tap the NFC or scan the QR code. Open a demo to see it in action — you can switch designs anytime later."
                            >
                                <WebsitePicker
                                    templates={experienceTemplates}
                                    selected={data.experience_template}
                                    onSelect={(value) => {
                                        setData('experience_template', value);
                                        setStepError(null);
                                    }}
                                />
                                <InputError
                                    message={errors.experience_template}
                                    className="mt-2"
                                />
                            </StepShell>
                        )}

                        {stepKey === 'customize' && selectedProduct && (
                            <StepShell
                                title="Add your story"
                                description="Add photos, names and a message now — or skip and add them later from your order page."
                            >
                                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-dashed border-plum/25 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground">
                                            Not ready yet?
                                        </span>{' '}
                                        You can upload your photos and details
                                        after you order. We will send your
                                        design for approval before anything is
                                        made.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="shrink-0 rounded-full"
                                        onClick={skipPersonalize}
                                    >
                                        Skip — I'll add them later
                                    </Button>
                                </div>
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
                                                    label={
                                                        isCdDesign
                                                            ? 'Album title'
                                                            : 'Song title'
                                                    }
                                                    error={
                                                        errors[
                                                            'personalization.song_title'
                                                        ]
                                                    }
                                                >
                                                    <Input
                                                        value={
                                                            data.personalization
                                                                .song_title
                                                        }
                                                        onChange={(event) =>
                                                            setPersonalization(
                                                                'song_title',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder={
                                                            isCdDesign
                                                                ? 'e.g. Golden Days'
                                                                : 'e.g. Our Song'
                                                        }
                                                        maxLength={80}
                                                    />
                                                </Field>
                                                <Field
                                                    label="Artist"
                                                    error={
                                                        errors[
                                                            'personalization.artist'
                                                        ]
                                                    }
                                                >
                                                    <Input
                                                        value={
                                                            data.personalization
                                                                .artist
                                                        }
                                                        onChange={(event) =>
                                                            setPersonalization(
                                                                'artist',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="e.g. Ana & Leo"
                                                        maxLength={80}
                                                    />
                                                </Field>
                                            </div>
                                        )}
                                        <Field
                                            label={
                                                isCdDesign
                                                    ? 'Tracklist (one song per line)'
                                                    : 'Message'
                                            }
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

                        {stepKey === 'specs' && selectedProduct && (
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
                                {needsPreviewApproval && (
                                    <div className="mt-10 grid items-center gap-6 rounded-[2rem] bg-gradient-to-br from-blush-light via-cream to-cream-dark p-6 sm:grid-cols-[220px_1fr] dark:from-muted dark:via-background dark:to-muted">
                                        <DesignPreview
                                            product={selectedProduct}
                                            template={template}
                                            selectedOptions={
                                                price?.selected ?? []
                                            }
                                            photoUrl={photoUrl}
                                            {...previewText}
                                            className="mx-auto w-full max-w-[220px]"
                                        />
                                        <label
                                            className={cn(
                                                'flex cursor-pointer gap-4 rounded-2xl border-2 bg-card p-5 transition',
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
                                                    I approve this design
                                                    preview
                                                </span>
                                                <span className="mt-1 block text-sm text-muted-foreground">
                                                    Our studio places your
                                                    photos and text as
                                                    previewed. If anything won't
                                                    print well, we'll send a
                                                    proof to approve before
                                                    production.
                                                </span>
                                            </span>
                                        </label>
                                    </div>
                                )}
                                {!needsPreviewApproval && (
                                    <div className="mt-10 flex gap-4 rounded-2xl border border-plum/15 bg-card p-5">
                                        <ShieldCheck className="size-6 shrink-0 text-rose" />
                                        <p className="text-sm text-muted-foreground">
                                            <span className="block font-medium text-foreground">
                                                You'll approve your design
                                                before we make it
                                            </span>
                                            {data.personalize_later
                                                ? 'After you order, add your photos and details from your order page. We prepare your design and send it for your approval.'
                                                : 'After your payment is verified, our designers prepare your design and post it to your account for approval.'}
                                        </p>
                                    </div>
                                )}
                                <InputError
                                    message={errors.approve_preview}
                                    className="mt-2"
                                />
                            </StepShell>
                        )}

                        {stepKey === 'checkout' && (
                            <StepShell
                                title="Delivery & payment"
                                description="Almost there! Tell us where to send your gift."
                            >
                                <div className="space-y-8">
                                    {isGuest ? (
                                        <GuestAccount
                                            passwordRules={passwordRules}
                                            defaultName={data.customer_name}
                                            defaultEmail={data.customer_email}
                                            onRegistered={() => {
                                                setVerificationSent(true);
                                                setStepError(null);
                                            }}
                                            onLoggedIn={() =>
                                                setStepError(null)
                                            }
                                        />
                                    ) : (
                                        <EmailConfirmation
                                            email={auth.user?.email ?? ''}
                                            isVerified={isEmailVerified}
                                            isSent={verificationSent}
                                            isSending={sendingVerification}
                                            onSend={sendVerificationLink}
                                            error={
                                                (
                                                    errors as Partial<
                                                        Record<string, string>
                                                    >
                                                ).email_verification
                                            }
                                        />
                                    )}
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
                                            {(
                                                {
                                                    paymongo:
                                                        "After placing your order you'll go straight to PayMongo's secure checkout — we never see your card or wallet details.",
                                                    paymongo_qrph:
                                                        "After placing your order you'll get a QR code to scan with GCash, Maya or any bank app.",
                                                } as Record<string, string>
                                            )[
                                                paymentMethods.find(
                                                    (method) =>
                                                        method.id ===
                                                        data.payment_method_id,
                                                )?.driver ?? ''
                                            ] ??
                                                "You'll see the account details and upload your receipt on your order page right after placing the order."}
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
                    </div>

                    <aside className="hidden lg:block">
                        <div className="sticky top-28 space-y-5">
                            {selectedProduct && stepKey !== 'product' && (
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
                                price={price}
                                pricing={pricing}
                                designModeLabel={
                                    designMode === 'self'
                                        ? 'Customized by you'
                                        : designMode === 'assisted'
                                          ? 'Designed by Taptale'
                                          : null
                                }
                            />
                            <div className="flex items-center gap-3">
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
                                <div className="flex-1 [&>button]:w-full">
                                    <PrimaryAction
                                        isLast={isLastStep}
                                        processing={form.processing}
                                        onNext={next}
                                        onSubmit={submit}
                                        total={
                                            price ? money(price.total) : null
                                        }
                                        disabled={
                                            step === 0 && !selectedProduct
                                        }
                                    />
                                </div>
                            </div>
                            {stepKey === 'customize' && (
                                <button
                                    type="button"
                                    onClick={skipPersonalize}
                                    className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                                >
                                    Skip personalizing for now
                                </button>
                            )}
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
                        {price ? (
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
                                {steps[step]?.description}
                            </p>
                        )}
                    </div>
                    <PrimaryAction
                        isLast={isLastStep}
                        processing={form.processing}
                        onNext={next}
                        onSubmit={submit}
                        total={null}
                        disabled={step === 0 && !selectedProduct}
                        compact
                    />
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

function GiftIdeas({
    categories,
    selected,
    loadingId,
    onSelect,
}: {
    categories: Category[];
    selected: Category | null;
    loadingId: number | null;
    onSelect: (category: Category | null) => void;
}) {
    if (categories.length === 0) {
        return null;
    }

    const chipClass = (isActive: boolean) =>
        cn(
            'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
            isActive
                ? 'border-rose bg-rose text-white'
                : 'border-border/70 bg-card hover:border-rose/50',
        );

    return (
        <div className="mb-6">
            <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-rose uppercase">
                Gift ideas
            </p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    className={chipClass(selected === null)}
                >
                    {loadingId === 0 && (
                        <Loader2 className="size-3.5 animate-spin" />
                    )}
                    All gifts
                </button>
                {categories.map((category) => {
                    const isActive = selected?.id === category.id;

                    return (
                        <button
                            key={category.id}
                            type="button"
                            title={category.tagline ?? undefined}
                            onClick={() => onSelect(isActive ? null : category)}
                            className={chipClass(isActive)}
                        >
                            {loadingId === category.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <CategoryIcon
                                    name={category.icon}
                                    className="size-3.5"
                                    style={
                                        isActive
                                            ? undefined
                                            : { color: category.accent_color }
                                    }
                                />
                            )}
                            {category.name}
                        </button>
                    );
                })}
            </div>
            {selected?.tagline && (
                <p className="mt-2 text-sm text-muted-foreground italic">
                    {selected.tagline}
                </p>
            )}
        </div>
    );
}

function EmailConfirmation({
    email,
    isVerified,
    isSent,
    isSending,
    onSend,
    error,
}: {
    email: string;
    isVerified: boolean;
    isSent: boolean;
    isSending: boolean;
    onSend: () => void;
    error?: string;
}) {
    if (isVerified) {
        return (
            <p className="flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">
                <BadgeCheck className="size-4 shrink-0" /> Email confirmed:{' '}
                {email}
            </p>
        );
    }

    return (
        <section className="rounded-3xl border-2 border-rose/40 bg-blush-light/50 p-5 dark:bg-rose/10">
            <div className="flex items-start gap-3">
                <MailCheck className="mt-0.5 size-5 shrink-0 text-rose" />
                <div className="min-w-0 flex-1">
                    <p className="font-display text-lg leading-tight">
                        Confirm your email to place your order
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {isSent ? (
                            <>
                                We sent a link to{' '}
                                <span className="font-medium text-foreground">
                                    {email}
                                </span>
                                . Open it, then come back here. This page
                                updates on its own.
                            </>
                        ) : (
                            <>
                                We'll send a quick link to{' '}
                                <span className="font-medium text-foreground">
                                    {email}
                                </span>{' '}
                                so we can send you order updates.
                            </>
                        )}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Button
                            type="button"
                            variant={isSent ? 'outline' : 'default'}
                            onClick={onSend}
                            disabled={isSending}
                            className="rounded-full"
                        >
                            {isSending && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            {isSent ? 'Resend link' : 'Send confirmation link'}
                        </Button>
                        {isSent && (
                            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="size-3 animate-spin" />{' '}
                                Waiting for confirmation…
                            </span>
                        )}
                    </div>
                    <InputError message={error} className="mt-2" />
                </div>
            </div>
        </section>
    );
}

/**
 * Sign up or log in without leaving the wizard. Fortify redirects back to
 * this page and `preserveState` keeps the gift, choices and photos intact.
 */
function GuestAccount({
    passwordRules,
    defaultName,
    defaultEmail,
    onRegistered,
    onLoggedIn,
}: {
    passwordRules: string | null;
    defaultName: string;
    defaultEmail: string;
    onRegistered: () => void;
    onLoggedIn: () => void;
}) {
    const [mode, setMode] = useState<'register' | 'login'>('register');
    const form = useForm({
        name: defaultName,
        email: defaultEmail,
        password: '',
        password_confirmation: '',
        remember: true,
    });
    const isRegistering = mode === 'register';

    const submitAccount = () => {
        form.transform(
            ({ name, email, password, password_confirmation, remember }) =>
                isRegistering
                    ? { name, email, password, password_confirmation }
                    : { email, password, remember },
        );

        form.post(isRegistering ? registerAccount.url() : logIn.url(), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset('password', 'password_confirmation');

                if (isRegistering) {
                    onRegistered();
                } else {
                    onLoggedIn();
                }
            },
        });
    };

    return (
        <section
            id="checkout-account"
            className="scroll-mt-24 rounded-3xl border-2 border-rose/40 bg-blush-light/50 p-5 dark:bg-rose/10"
        >
            <div className="flex items-start gap-3">
                <Heart className="mt-1 size-5 shrink-0 text-rose" />
                <div className="min-w-0 flex-1">
                    <p className="font-display text-lg leading-tight">
                        {isRegistering
                            ? 'Create your free account to place your order'
                            : 'Welcome back! Log in to place your order'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Everything you've made stays right here. Your account
                        lets you track your gift and approve your design.
                    </p>
                </div>
            </div>

            <div
                role="tablist"
                aria-label="Account"
                className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-background/80 p-1 text-sm font-medium"
            >
                {(
                    [
                        ['register', 'New here'],
                        ['login', 'I have an account'],
                    ] as const
                ).map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={mode === value}
                        onClick={() => {
                            setMode(value);
                            form.clearErrors();
                        }}
                        className={cn(
                            'rounded-full px-3 py-2 transition',
                            mode === value
                                ? 'bg-plum text-white shadow-sm dark:bg-blush dark:text-plum-dark'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    submitAccount();
                }}
                className="mt-4 grid gap-4 sm:grid-cols-2"
            >
                {isRegistering && (
                    <Field
                        label="Full name"
                        error={form.errors.name}
                        required
                        className="sm:col-span-2"
                    >
                        <Input
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            autoComplete="name"
                            required
                        />
                    </Field>
                )}
                <Field
                    label="Email address"
                    error={form.errors.email}
                    required
                    className="sm:col-span-2"
                >
                    <Input
                        type="email"
                        value={form.data.email}
                        onChange={(event) =>
                            form.setData('email', event.target.value)
                        }
                        autoComplete="email"
                        required
                    />
                </Field>
                <Field
                    label="Password"
                    error={form.errors.password}
                    required
                    className={isRegistering ? undefined : 'sm:col-span-2'}
                >
                    <PasswordInput
                        value={form.data.password}
                        onChange={(event) =>
                            form.setData('password', event.target.value)
                        }
                        autoComplete={
                            isRegistering ? 'new-password' : 'current-password'
                        }
                        passwordrules={
                            isRegistering
                                ? (passwordRules ?? undefined)
                                : undefined
                        }
                        required
                    />
                </Field>
                {isRegistering && (
                    <Field
                        label="Confirm password"
                        error={form.errors.password_confirmation}
                        required
                    >
                        <PasswordInput
                            value={form.data.password_confirmation}
                            onChange={(event) =>
                                form.setData(
                                    'password_confirmation',
                                    event.target.value,
                                )
                            }
                            autoComplete="new-password"
                            required
                        />
                    </Field>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:col-span-2">
                    <Button
                        type="submit"
                        disabled={form.processing}
                        className="rounded-full"
                    >
                        {form.processing && (
                            <Loader2 className="size-4 animate-spin" />
                        )}
                        {isRegistering ? 'Create account' : 'Log in'}
                    </Button>
                    {isRegistering ? (
                        <p className="text-xs text-muted-foreground">
                            By creating an account you agree to our{' '}
                            <a
                                href={terms.url()}
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-2"
                            >
                                Terms
                            </a>{' '}
                            and{' '}
                            <a
                                href={privacy.url()}
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-2"
                            >
                                Privacy Policy
                            </a>
                            .
                        </p>
                    ) : (
                        <a
                            href={requestPasswordReset.url()}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-muted-foreground underline underline-offset-2"
                        >
                            Forgot password?
                        </a>
                    )}
                </div>
            </form>
        </section>
    );
}

function DraftNotice({
    title,
    description,
    action,
    onAction,
    onDismiss,
    dismissLabel,
    isSubtle = false,
}: {
    title: string;
    description: string;
    action: string;
    onAction: () => void;
    onDismiss: () => void;
    dismissLabel: string;
    isSubtle?: boolean;
}) {
    return (
        <section
            role="status"
            className={cn(
                'mb-6 flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center',
                isSubtle
                    ? 'border border-border bg-card'
                    : 'border-2 border-rose/40 bg-blush-light/50 dark:bg-rose/10',
            )}
        >
            <History className="size-5 shrink-0 text-rose" aria-hidden />
            <div className="min-w-0 flex-1">
                <p className="font-display text-lg leading-tight">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>
            <div className="flex shrink-0 gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full"
                    onClick={onDismiss}
                >
                    {dismissLabel}
                </Button>
                <Button
                    type="button"
                    variant={isSubtle ? 'outline' : 'default'}
                    className="rounded-full"
                    onClick={onAction}
                >
                    {action}
                </Button>
            </div>
        </section>
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
