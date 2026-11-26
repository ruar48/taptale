import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    Check,
    Heart,
    History,
    Loader2,
    LocateFixed,
    MailCheck,
    Minus,
    Nfc,
    PenLine,
    Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import PasswordInput from "@/components/password-input";
import { CategoryIcon } from "@/components/taptale/category-icon";
import { FileDropzone } from "@/components/taptale/file-dropzone";
import { ProductArt } from "@/components/taptale/product-art";
import { DesignPreview } from "@/components/taptale/wizard/design-preview";
import { OptionPicker } from "@/components/taptale/wizard/option-picker";
import { OrderSummary } from "@/components/taptale/wizard/order-summary";
import { PromoCodeField } from "@/components/taptale/wizard/promo-code-field";
import { ProductShowcase } from "@/components/taptale/wizard/product-showcase";
import { WebsitePicker } from "@/components/taptale/wizard/website-picker";
import { WizardProgress } from "@/components/taptale/wizard/wizard-progress";
import InputError from "@/components/input-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentAddress } from "@/hooks/use-current-address";
import { useMoney } from "@/hooks/use-money";
import { calculatePrice, defaultOptionIds, groupOptions } from "@/lib/pricing";
import type { AppliedPromo } from "@/lib/pricing";
import type { PricingConfig } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { stepsFor } from "@/lib/wizard";
import type { DesignMode, WizardStepKey } from "@/lib/wizard";
import {
    canResume,
    clearDraft,
    loadDraft,
    loadPhotos,
    saveDraft,
    savePhotos,
} from "@/lib/wizard-draft";
import type { WizardDraft } from "@/lib/wizard-draft";
import {
    clearPageDraft,
    loadPageDraft,
    loadPagePhotos,
    loadPageVideo,
    loadRainPhotos,
    MAX_RAIN_PHOTOS,
    savePageDraft,
    savePagePhotos,
    savePageVideo,
    saveRainPhotos,
} from "@/lib/page-draft";
import type { PageDraft } from "@/lib/page-draft";
import { demo as demoPage } from "@/routes/experiences";
import { store as logIn } from "@/routes/login";
import { create as wizardRoute, store as storeOrder } from "@/routes/orders";
import { privacy, terms } from "@/routes/pages";
import { request as requestPasswordReset } from "@/routes/password";
import { store as registerAccount } from "@/routes/register";
import { send as sendVerification } from "@/routes/verification";
import type {
    Category,
    ExperienceTemplateOption,
    PaymentMethod,
    Personalization,
    Product,
} from "@/types";

type Props = {
    categories: Category[];
    selectedCategory: Category | null;
    products: Product[];
    selectedProduct: Product | null;
    experienceTemplates: ExperienceTemplateOption[];
    /** The memory page design whose demo draft the customer is ordering with. */
    initialPage: string | null;
    maxPagePhotos: number;
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
    design_mode: DesignMode | "";
    option_ids: number[];
    quantity: number;
    personalization: Required<Personalization>;
    photos: File[];
    approve_preview: boolean;
    personalize_later: boolean;
    experience_template: string;
    flower_addon: boolean;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    address_line: string;
    city: string;
    province: string;
    postal_code: string;
    customer_notes: string;
    is_gift: boolean;
    gift_message: string;
    payment_method_id: number | null;
    save_details: boolean;
};

/**
 * Contact and delivery details are never kept in the browser draft, so a
 * shared computer does not hold anyone's address. The account fills them.
 */
const CONTACT_FIELDS = [
    "customer_name",
    "customer_email",
    "customer_phone",
    "address_line",
    "city",
    "province",
    "postal_code",
] as const;

type DraftData = Omit<WizardForm, "photos" | (typeof CONTACT_FIELDS)[number]>;

function toDraftData(data: WizardForm): DraftData {
    const draft: Partial<WizardForm> = { ...data };

    delete draft.photos;
    CONTACT_FIELDS.forEach((field) => delete draft[field]);

    return draft as DraftData;
}

const ERROR_STEPS: [RegExp, WizardStepKey][] = [
    [/^(category_id|product_id|design_mode)/, "product"],
    [/^(experience_template|personalization|photos|page)/, "website"],
    [/^(option_ids|quantity|approve_preview)/, "specs"],
];

export default function CreateGift({
    categories,
    selectedCategory,
    products,
    selectedProduct,
    experienceTemplates,
    initialPage,
    maxPagePhotos,
    paymentMethods,
    pricing,
    customer,
    passwordRules,
}: Props) {
    const money = useMoney();
    const { storefront, auth } = usePage().props;
    const symbol = storefront?.currencySymbol ?? "₱";
    const isGuest = !auth.user;
    const isEmailVerified = Boolean(auth.user?.email_verified_at);

    // The keychain is already chosen when arriving from its page, so start
    // right at its website.
    const initialStep = selectedProduct ? 1 : 0;
    const [step, setStep] = useState(initialStep);
    const [furthest, setFurthest] = useState(initialStep);
    const [customDesign, setCustomDesign] = useState(false);
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
        design_mode: "",
        option_ids: selectedProduct
            ? defaultOptionIds(selectedProduct.options ?? [])
            : [],
        quantity: selectedProduct?.min_quantity ?? 1,
        personalization: {
            names: "",
            date: "",
            message: "",
            song_title: "",
            artist: "",
            color: "",
            design_brief: "",
            instructions: "",
        },
        photos: [],
        approve_preview: false,
        personalize_later: true,
        experience_template: initialPage ?? "",
        flower_addon: false,
        customer_name: customer?.name ?? "",
        customer_email: customer?.email ?? "",
        customer_phone: customer?.phone ?? "",
        address_line: customer?.address_line ?? "",
        city: customer?.city ?? "",
        province: customer?.province ?? "",
        postal_code: customer?.postal_code ?? "",
        customer_notes: "",
        is_gift: false,
        gift_message: "",
        payment_method_id: paymentMethods[0]?.id ?? null,
        save_details: !customer?.phone,
    });
    const [promo, setPromo] = useState<AppliedPromo | null>(null);

    const { data, setData, errors } = form;

    const currentAddress = useCurrentAddress();

    const fillAddressFromLocation = async () => {
        const detected = await currentAddress.locate();

        if (!detected) {
            return;
        }

        setData((current) => ({
            ...current,
            address_line: detected.address_line || current.address_line,
            city: detected.city || current.city,
            province: detected.province || current.province,
            postal_code: detected.postal_code || current.postal_code,
        }));
        form.clearErrors("address_line", "city", "province", "postal_code");
    };

    // A guest who signs up or logs in at checkout stays on this page with
    // everything they made; fill in whatever their account already knows.
    useEffect(() => {
        if (!customer) {
            return;
        }

        setData((current) => ({
            ...current,
            customer_name: current.customer_name || customer.name || "",
            customer_email: current.customer_email || customer.email || "",
            customer_phone: current.customer_phone || customer.phone || "",
            address_line: current.address_line || customer.address_line || "",
            city: current.city || customer.city || "",
            province: current.province || customer.province || "",
            postal_code: current.postal_code || customer.postal_code || "",
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
            photos: current.photos.slice(0, selectedProduct.max_photos),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProduct?.id]);

    /*
     * Details are always finished after ordering (or optionally on the
     * website step), so a custom design means Taptale designs it and the
     * gift as shown means the customer's own details go on it.
     */
    const designMode: DesignMode = customDesign ? "assisted" : "self";
    const [isEditingPage, setIsEditingPage] = useState(false);
    const chosenPage =
        experienceTemplates.find(
            (option) => option.value === data.experience_template,
        ) ?? null;

    /*
     * A page the customer shaped on a demo of the chosen design (words,
     * flowers and photos kept in this browser) goes along with the order
     * and becomes their memory page, unless they set it aside.
     */
    const [pageDraft, setPageDraft] = useState<PageDraft | null>(null);
    const [pagePhotos, setPagePhotos] = useState<File[]>([]);
    const [pageRainPhotos, setPageRainPhotos] = useState<File[]>([]);
    const [pageVideo, setPageVideo] = useState<File | null>(null);
    const [isPageDraftSetAside, setIsPageDraftSetAside] = useState(false);
    const attachedPage = isPageDraftSetAside ? null : pageDraft;

    useEffect(() => {
        const found = loadPageDraft(data.experience_template);

        setPageDraft(found);
        setPagePhotos([]);
        setPageRainPhotos([]);
        setPageVideo(null);
        setIsPageDraftSetAside(false);

        if (!found) {
            return;
        }

        // Flowers added on the demo come along (and are charged) at checkout.
        setData("flower_addon", Boolean(found.content.flower_addon));

        let isCurrent = true;

        void Promise.all([
            loadPagePhotos(found.template),
            loadRainPhotos(found.template),
            loadPageVideo(found.template),
        ]).then(([photos, rainPhotos, video]) => {
            if (isCurrent) {
                setPagePhotos(photos.slice(0, maxPagePhotos));
                setPageRainPhotos(rainPhotos.slice(0, MAX_RAIN_PHOTOS));
                setPageVideo(video);
            }
        });

        return () => {
            isCurrent = false;
        };
    }, [data.experience_template, maxPagePhotos]);

    const hasPageDetails =
        attachedPage !== null ||
        data.photos.length > 0 ||
        [
            data.personalization.names,
            data.personalization.date,
            data.personalization.message,
            data.personalization.song_title,
        ].some((value) => value.trim() !== "");
    const hasTapPage =
        !!selectedProduct &&
        (selectedProduct.has_digital_experience ||
            (selectedProduct.options ?? []).some(
                (option) => option.enables_digital_experience,
            ));
    const steps = stepsFor(hasTapPage);
    const stepKey: WizardStepKey = steps[step]?.key ?? "product";
    const stepIndex = (key: WizardStepKey) =>
        Math.max(
            0,
            steps.findIndex((item) => item.key === key),
        );

    const userId = auth.user?.id ?? null;
    const [isDraftReady, setIsDraftReady] = useState(false);
    const [savedDraft, setSavedDraft] = useState<WizardDraft<DraftData> | null>(
        null,
    );
    const [wasRestored, setWasRestored] = useState(false);

    // Pick up a gift this visitor was crafting in this browser — after
    // logging in, a refresh or a later visit.
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
            // Coming from a demo with "order with this page" picks that page.
            experience_template:
                initialPage ?? draft.data.experience_template ?? "",
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
            payment_method_id: paymentMethods.some(
                (method) => method.id === draft.data.payment_method_id,
            )
                ? draft.data.payment_method_id
                : current.payment_method_id,
        }));
        setCustomDesign(Boolean(draft.customDesign));
        setIsEditingPage(
            Boolean(
                draft.data.experience_template &&
                (draft.data.personalization?.names ||
                    draft.data.personalization?.message),
            ),
        );
        setStep(Math.min(Math.max(0, draft.step), lastStep));
        setFurthest(Math.min(Math.max(0, draft.furthest), lastStep));
        setWasRestored(true);

        void loadPhotos()
            .then((photos) => {
                if (photos.length > 0) {
                    setData(
                        "photos",
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
            customDesign,
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
        customDesign,
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

    /*
     * "A Bouquet For You" comes with its flowers; any other tap page design
     * can have them added for a small fee, charged once.
     */
    const pageHasOwnFlowers = data.experience_template === "digital_bouquet";
    const wantsFlowers =
        hasTapPage &&
        data.flower_addon &&
        data.experience_template !== "" &&
        !pageHasOwnFlowers;

    const price = useMemo(
        () =>
            selectedProduct
                ? calculatePrice(
                      selectedProduct,
                      data.option_ids,
                      data.quantity,
                      designMode,
                      pricing,
                      promo,
                      wantsFlowers,
                  )
                : null,
        [
            selectedProduct,
            data.option_ids,
            data.quantity,
            designMode,
            pricing,
            promo,
            wantsFlowers,
        ],
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
        window.scrollTo({ top: 0, behavior: "smooth" });
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
                    "selectedCategory",
                    "products",
                    "selectedProduct",
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
                only: ["selectedCategory", "products"],
                onFinish: () => setLoadingIdea(null),
            },
        );
    };

    const chooseProduct = (product: Product) => {
        setCustomDesign(false);
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
            case "product":
                if (!selectedProduct) {
                    return "Please choose a gift.";
                }

                return null;
            case "specs": {
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
            default:
                return null;
        }
    };

    const openPageDetails = () => {
        setIsEditingPage(true);
        window.setTimeout(
            () =>
                document
                    .getElementById("page-details")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
            50,
        );
    };

    const choosePageLater = () => {
        setData("experience_template", "");
        setIsEditingPage(false);
        goTo(step + 1);
    };

    const next = () => {
        const error = validateStep(step);

        if (error) {
            setStepError(error);

            return;
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
            () => router.reload({ only: ["auth"] }),
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
                only: ["auth"],
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
                "Create your free account or log in to place your order — your gift is saved right here.",
            );
            document
                .getElementById("checkout-account")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });

            return;
        }

        if (!isEmailVerified) {
            setStepError(
                "Please confirm your email address before placing your order.",
            );

            return;
        }

        const isGiftInOccasion =
            selectedCategory !== null &&
            products.some((product) => product.id === data.product_id);

        const orderedPage =
            attachedPage && attachedPage.template === data.experience_template
                ? attachedPage
                : null;

        form.transform((values) => ({
            ...values,
            category_id: isGiftInOccasion ? selectedCategory.id : null,
            design_mode: designMode,
            personalize_later: true,
            approve_preview: false,
            promo_code: promo?.code ?? "",
            flower_addon: wantsFlowers,
            ...(orderedPage
                ? {
                      page: orderedPage.content,
                      page_photos: pagePhotos,
                      page_rain_photos: pageRainPhotos,
                      ...(pageVideo ? { page_video: pageVideo } : {}),
                  }
                : {}),
        }));

        // Cleared up front: a PayMongo order leaves the site straight away.
        clearDraft();

        if (orderedPage) {
            clearPageDraft(orderedPage.template);
        }

        form.post(storeOrder.url(), {
            forceFormData: true,
            preserveScroll: true,
            onError: (serverErrors) => {
                saveCurrentDraft();
                void savePhotos(data.photos);

                if (orderedPage) {
                    savePageDraft(orderedPage.template, orderedPage.content);
                    void savePagePhotos(orderedPage.template, pagePhotos);
                    void saveRainPhotos(orderedPage.template, pageRainPhotos);
                    void savePageVideo(orderedPage.template, pageVideo);
                }

                // Problems with the order as a whole (e.g. too many unpaid
                // orders) have no field to sit under.
                const orderError = (
                    serverErrors as Partial<Record<string, string>>
                ).order;

                if (orderError) {
                    setStepError(orderError);
                }

                const firstKey = Object.keys(serverErrors)[0] ?? "";
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
        setData("personalization", { ...data.personalization, [key]: value });

    const photoErrors = Object.entries(errors)
        .filter(([key]) => key.startsWith("photos"))
        .map(([, message]) => message)[0];

    const pageErrors = Object.entries(errors)
        .filter(([key]) => key.startsWith("page"))
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

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div key={step} className="min-w-0 animate-fade-up">
                        {stepKey === "product" && (
                            <StepShell
                                title={
                                    selectedProduct
                                        ? "Your gift"
                                        : "Choose your gift"
                                }
                                description={
                                    selectedProduct
                                        ? "This is how your gift will look with your photos and words. Want something else? Choose another gift below."
                                        : selectedCategory
                                          ? `Gift ideas for ${selectedCategory.name.toLowerCase()}. Tap a gift to see its details.`
                                          : "Tap a gift to see its details. Need ideas? Pick an occasion below."
                                }
                            >
                                {selectedProduct && (
                                    <div className="mb-10">
                                        <ProductShowcase
                                            product={selectedProduct}
                                            customSelected={customDesign}
                                            hasTapPage={hasTapPage}
                                            loading={loadingSelection !== null}
                                            onSelectAsShown={() => {
                                                setData((current) => ({
                                                    ...current,
                                                    design_mode:
                                                        current.design_mode ===
                                                        "assisted"
                                                            ? ""
                                                            : current.design_mode,
                                                }));
                                                setCustomDesign(false);
                                                setStepError(null);
                                            }}
                                            onSelectCustom={() => {
                                                setData((current) => ({
                                                    ...current,
                                                    design_mode: "assisted",
                                                }));
                                                setCustomDesign(true);
                                                setStepError(null);
                                            }}
                                            preview={
                                                <DesignPreview
                                                    product={selectedProduct}
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
                                                                · min.{" "}
                                                                {
                                                                    product.min_quantity
                                                                }{" "}
                                                                pcs
                                                            </span>
                                                        )}
                                                        {product.has_digital_experience && (
                                                            <span className="inline-flex items-center gap-1 text-plum dark:text-blush">
                                                                ·{" "}
                                                                <Nfc className="size-3" />{" "}
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

                        {stepKey === "website" && selectedProduct && (
                            <StepShell
                                title="Choose your tap page design"
                                description="This little website opens when they tap the NFC or scan the QR code. Tap a design to preview it — you can switch designs anytime until your keepsake ships."
                            >
                                {chosenPage && attachedPage && (
                                    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-rose/30 bg-blush-light/40 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-rose/10">
                                        <p className="text-sm">
                                            <span className="block text-muted-foreground">
                                                Your tap page, made on the demo
                                            </span>
                                            <span className="font-display text-lg">
                                                {chosenPage.label}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-muted-foreground">
                                                “{attachedPage.content.title}” ·{" "}
                                                {pagePhotos.length === 1
                                                    ? "1 photo"
                                                    : `${pagePhotos.length} photos`}
                                                {pageRainPhotos.length > 0 &&
                                                    ` · ${pageRainPhotos.length} raining`}
                                                {pageVideo && " · a video"}
                                                {(attachedPage.content
                                                    .custom_sections?.length ??
                                                    0) > 0 &&
                                                    ` · ${attachedPage.content.custom_sections.length} extra ${attachedPage.content.custom_sections.length === 1 ? "section" : "sections"}`}{" "}
                                                · It opens exactly as you made
                                                it, and you can still change it
                                                after checkout.
                                            </span>
                                        </p>
                                        <div className="flex shrink-0 flex-wrap gap-2">
                                            <Button
                                                asChild
                                                variant="outline"
                                                className="rounded-full"
                                            >
                                                <Link
                                                    href={demoPage(
                                                        {
                                                            template:
                                                                attachedPage.template,
                                                        },
                                                        {
                                                            query: {
                                                                intro: "0",
                                                            },
                                                        },
                                                    )}
                                                >
                                                    <PenLine className="size-4" />{" "}
                                                    Edit page
                                                </Link>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="rounded-full"
                                                onClick={() =>
                                                    setIsPageDraftSetAside(true)
                                                }
                                            >
                                                Start from a blank page
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {chosenPage && !attachedPage && (
                                    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-rose/30 bg-blush-light/40 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-rose/10">
                                        <p className="text-sm">
                                            <span className="block text-muted-foreground">
                                                Your tap page
                                                {pageDraft && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setIsPageDraftSetAside(
                                                                false,
                                                            )
                                                        }
                                                        className="ml-2 font-medium text-plum underline underline-offset-2 dark:text-blush"
                                                    >
                                                        Use the page I made on
                                                        the demo
                                                    </button>
                                                )}
                                            </span>
                                            <span className="font-display text-lg">
                                                {chosenPage.label}
                                            </span>
                                            <span className="ml-2 text-xs text-muted-foreground">
                                                {hasPageDetails
                                                    ? "· Details added"
                                                    : "· Add your details anytime"}
                                            </span>
                                        </p>
                                        <Button
                                            type="button"
                                            variant={
                                                isEditingPage
                                                    ? "ghost"
                                                    : "outline"
                                            }
                                            className="shrink-0 rounded-full"
                                            onClick={() =>
                                                isEditingPage
                                                    ? setIsEditingPage(false)
                                                    : openPageDetails()
                                            }
                                        >
                                            {isEditingPage ? (
                                                "I'll finish this later"
                                            ) : (
                                                <>
                                                    <PenLine className="size-4" />{" "}
                                                    {hasPageDetails
                                                        ? "Edit details"
                                                        : "Add details now"}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                                {chosenPage && !pageHasOwnFlowers && (
                                    <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-rose/40">
                                        <Checkbox
                                            checked={data.flower_addon}
                                            onCheckedChange={(checked) =>
                                                setData(
                                                    "flower_addon",
                                                    checked === true,
                                                )
                                            }
                                            className="mt-0.5"
                                        />
                                        <span className="text-sm">
                                            <span className="font-medium">
                                                Add blooming flowers to your
                                                page
                                            </span>{" "}
                                            <span className="font-semibold text-plum dark:text-blush">
                                                +
                                                {money(
                                                    pricing.flowers_addon_price,
                                                )}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-muted-foreground">
                                                A bouquet or glowing flowers
                                                bloom right after the opening,
                                                with petals or your photos
                                                raining down. Pick the flowers
                                                anytime after ordering.
                                            </span>
                                        </span>
                                    </label>
                                )}
                                <WebsitePicker
                                    templates={experienceTemplates}
                                    selected={data.experience_template}
                                    onChoose={(value, timing) => {
                                        setData("experience_template", value);
                                        setStepError(null);

                                        if (timing === "now") {
                                            openPageDetails();
                                        } else {
                                            setIsEditingPage(false);
                                        }
                                    }}
                                />
                                <InputError
                                    message={errors.experience_template}
                                    className="mt-2"
                                />
                                <InputError
                                    message={pageErrors}
                                    className="mt-2"
                                />

                                {isEditingPage &&
                                    chosenPage &&
                                    !attachedPage && (
                                        <section
                                            id="page-details"
                                            className="mt-8 scroll-mt-28 space-y-6 rounded-3xl border border-border bg-card p-5 sm:p-6"
                                        >
                                            <div>
                                                <h2 className="font-display text-2xl">
                                                    Add your story
                                                </h2>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    Everything is optional —
                                                    fill in what you have. You
                                                    can change it all from your
                                                    order page after checkout.
                                                </p>
                                            </div>
                                            <div>
                                                <Label className="mb-2 block">
                                                    Photos
                                                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                                                        up to{" "}
                                                        {
                                                            selectedProduct.max_photos
                                                        }
                                                    </span>
                                                </Label>
                                                <FileDropzone
                                                    id="photos"
                                                    files={data.photos}
                                                    onChange={(files) =>
                                                        setData("photos", files)
                                                    }
                                                    maxFiles={
                                                        selectedProduct.max_photos
                                                    }
                                                    maxKilobytes={
                                                        pricing.max_upload_kilobytes
                                                    }
                                                    label="Add your photos"
                                                    error={photoErrors}
                                                />
                                            </div>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <Field
                                                    label="Names"
                                                    error={
                                                        errors[
                                                            "personalization.names"
                                                        ]
                                                    }
                                                >
                                                    <Input
                                                        value={
                                                            data.personalization
                                                                .names
                                                        }
                                                        onChange={(event) =>
                                                            setPersonalization(
                                                                "names",
                                                                event.target
                                                                    .value,
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
                                                            "personalization.date"
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
                                                                "date",
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="e.g. 02 · 14 · 2026"
                                                        maxLength={60}
                                                    />
                                                </Field>
                                                <Field
                                                    label="Song title"
                                                    error={
                                                        errors[
                                                            "personalization.song_title"
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
                                                                "song_title",
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="e.g. Our Song"
                                                        maxLength={80}
                                                    />
                                                </Field>
                                                <Field
                                                    label="Artist"
                                                    error={
                                                        errors[
                                                            "personalization.artist"
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
                                                                "artist",
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        maxLength={80}
                                                    />
                                                </Field>
                                            </div>
                                            <Field
                                                label="Message"
                                                error={
                                                    errors[
                                                        "personalization.message"
                                                    ]
                                                }
                                                hint={`${data.personalization.message.length}/300`}
                                            >
                                                <Textarea
                                                    value={
                                                        data.personalization
                                                            .message
                                                    }
                                                    onChange={(event) =>
                                                        setPersonalization(
                                                            "message",
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="A short letter, quote or inside joke"
                                                    maxLength={300}
                                                    rows={3}
                                                />
                                            </Field>
                                            <div className="flex justify-end">
                                                <Button
                                                    type="button"
                                                    className="rounded-full"
                                                    onClick={next}
                                                >
                                                    Done — continue{" "}
                                                    <ArrowRight className="size-4" />
                                                </Button>
                                            </div>
                                        </section>
                                    )}

                                <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-dashed border-plum/25 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground">
                                            Not sure yet?
                                        </span>{" "}
                                        We'll start you with a design for your
                                        occasion — pick another from your order
                                        page anytime until your keepsake ships.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="shrink-0 rounded-full"
                                        onClick={choosePageLater}
                                    >
                                        Choose later
                                    </Button>
                                </div>
                            </StepShell>
                        )}

                        {stepKey === "specs" && selectedProduct && (
                            <StepShell
                                title="Quantity"
                                description="How many would you like?"
                            >
                                <OptionPicker
                                    options={selectedProduct.options ?? []}
                                    selected={data.option_ids}
                                    onChange={(ids) =>
                                        setData("option_ids", ids)
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
                                                    "quantity",
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
                                                    "quantity",
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
                                                    "quantity",
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

                        {stepKey === "checkout" && (
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
                                            email={auth.user?.email ?? ""}
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
                                                        "customer_name",
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
                                                        "customer_phone",
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
                                                        "customer_email",
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="email"
                                            />
                                        </Field>
                                        {currentAddress.isSupported && (
                                            <div className="grid gap-2 sm:col-span-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full sm:w-fit"
                                                    onClick={
                                                        fillAddressFromLocation
                                                    }
                                                    disabled={
                                                        currentAddress.isLocating
                                                    }
                                                >
                                                    {currentAddress.isLocating ? (
                                                        <Loader2 className="animate-spin" />
                                                    ) : (
                                                        <LocateFixed />
                                                    )}
                                                    {currentAddress.isLocating
                                                        ? "Finding your address…"
                                                        : "Use my current location"}
                                                </Button>
                                                {currentAddress.error ? (
                                                    <InputError
                                                        message={
                                                            currentAddress.error
                                                        }
                                                    />
                                                ) : (
                                                    <p
                                                        className={cn(
                                                            "text-xs",
                                                            currentAddress.notice
                                                                ? "text-amber-700 dark:text-amber-400"
                                                                : "text-muted-foreground",
                                                        )}
                                                    >
                                                        {currentAddress.notice ??
                                                            "Works best on your phone with location on. Please double-check your house number and barangay."}
                                                    </p>
                                                )}
                                            </div>
                                        )}
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
                                                        "address_line",
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
                                                        "city",
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
                                                        "province",
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
                                                        "postal_code",
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
                                                        "save_details",
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
                                                                    "payment_method_id",
                                                                    method.id,
                                                                )
                                                            }
                                                            className={cn(
                                                                "rounded-2xl border-2 bg-card p-4 text-left transition",
                                                                data.payment_method_id ===
                                                                    method.id
                                                                    ? "border-rose bg-blush-light/40 dark:bg-rose/10"
                                                                    : "border-border hover:border-rose/40",
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
                                                                        "flex size-5 items-center justify-center rounded-full border-2",
                                                                        data.payment_method_id ===
                                                                            method.id
                                                                            ? "border-rose bg-rose text-white"
                                                                            : "border-border",
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
                                                        "After placing your order you'll get a QR code to scan with GCash, Maya, MariBank or any bank app.",
                                                    cod: "Nothing to pay now — pay the courier in cash when your gift arrives.",
                                                } as Record<string, string>
                                            )[
                                                paymentMethods.find(
                                                    (method) =>
                                                        method.id ===
                                                        data.payment_method_id,
                                                )?.driver ?? ""
                                            ] ??
                                                "You'll see the account details and upload your receipt on your order page right after placing the order."}
                                        </p>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="font-display text-lg">
                                            Gift & promo
                                        </h3>
                                        <PromoCodeField
                                            subtotal={price?.subtotal ?? 0}
                                            applied={promo}
                                            discount={price?.discount ?? 0}
                                            onChange={setPromo}
                                            serverError={
                                                (
                                                    errors as Record<
                                                        string,
                                                        string | undefined
                                                    >
                                                ).promo_code
                                            }
                                        />
                                        <label className="flex items-start gap-3 text-sm">
                                            <Checkbox
                                                checked={data.is_gift}
                                                onCheckedChange={(checked) =>
                                                    setData(
                                                        "is_gift",
                                                        checked === true,
                                                    )
                                                }
                                                className="mt-0.5"
                                            />
                                            <span>
                                                <span className="block font-medium">
                                                    This is a gift
                                                </span>
                                                <span className="text-muted-foreground">
                                                    We leave the prices off the
                                                    packing slip.
                                                </span>
                                            </span>
                                        </label>
                                        {data.is_gift && (
                                            <Field
                                                label="Gift message on the packing slip"
                                                error={errors.gift_message}
                                            >
                                                <Textarea
                                                    value={data.gift_message}
                                                    onChange={(event) =>
                                                        setData(
                                                            "gift_message",
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Happy anniversary, my love!"
                                                    rows={2}
                                                    maxLength={300}
                                                />
                                            </Field>
                                        )}
                                    </section>

                                    <Field
                                        label="Additional instructions"
                                        error={errors.customer_notes}
                                    >
                                        <Textarea
                                            value={data.customer_notes}
                                            onChange={(event) =>
                                                setData(
                                                    "customer_notes",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Delivery notes, preferred schedule…"
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
                            <OrderSummary
                                category={selectedCategory}
                                product={selectedProduct}
                                quantity={data.quantity}
                                price={price}
                                pricing={pricing}
                                promoCode={promo?.code}
                                designModeLabel={
                                    designMode === "self"
                                        ? "Customized by you"
                                        : designMode === "assisted"
                                          ? "Designed by Taptale"
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
                "relative overflow-hidden rounded-[1.25rem] border-2 bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5",
                selected
                    ? "border-rose shadow-[0_14px_30px_-18px_rgb(184_111_131/0.9)]"
                    : "border-border/70 hover:border-rose/40",
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
        <div className={cn("grid gap-2", className)}>
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
            "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
            isActive
                ? "border-rose bg-rose text-white"
                : "border-border/70 bg-card hover:border-rose/50",
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
                <BadgeCheck className="size-4 shrink-0" /> Email confirmed:{" "}
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
                                We sent a link to{" "}
                                <span className="font-medium text-foreground">
                                    {email}
                                </span>
                                . Open it, then come back here. This page
                                updates on its own.
                            </>
                        ) : (
                            <>
                                We'll send a quick link to{" "}
                                <span className="font-medium text-foreground">
                                    {email}
                                </span>{" "}
                                so we can send you order updates.
                            </>
                        )}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Button
                            type="button"
                            variant={isSent ? "outline" : "default"}
                            onClick={onSend}
                            disabled={isSending}
                            className="rounded-full"
                        >
                            {isSending && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            {isSent ? "Resend link" : "Send confirmation link"}
                        </Button>
                        {isSent && (
                            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="size-3 animate-spin" />{" "}
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
    const [mode, setMode] = useState<"register" | "login">("register");
    const form = useForm({
        name: defaultName,
        email: defaultEmail,
        password: "",
        password_confirmation: "",
        remember: true,
    });
    const isRegistering = mode === "register";

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
                form.reset("password", "password_confirmation");

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
                            ? "Create your free account to place your order"
                            : "Welcome back! Log in to place your order"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Everything you've made stays right here. Your account
                        lets you track your gift and edit your website.
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
                        ["register", "New here"],
                        ["login", "I have an account"],
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
                            "rounded-full px-3 py-2 transition",
                            mode === value
                                ? "bg-plum text-white shadow-sm dark:bg-blush dark:text-plum-dark"
                                : "text-muted-foreground hover:text-foreground",
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
                                form.setData("name", event.target.value)
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
                            form.setData("email", event.target.value)
                        }
                        autoComplete="email"
                        required
                    />
                </Field>
                <Field
                    label="Password"
                    error={form.errors.password}
                    required
                    className={isRegistering ? undefined : "sm:col-span-2"}
                >
                    <PasswordInput
                        value={form.data.password}
                        onChange={(event) =>
                            form.setData("password", event.target.value)
                        }
                        autoComplete={
                            isRegistering ? "new-password" : "current-password"
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
                                    "password_confirmation",
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
                        {isRegistering ? "Create account" : "Log in"}
                    </Button>
                    {isRegistering ? (
                        <p className="text-xs text-muted-foreground">
                            By creating an account you agree to our{" "}
                            <a
                                href={terms.url()}
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-2"
                            >
                                Terms
                            </a>{" "}
                            and{" "}
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
                "mb-6 flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center",
                isSubtle
                    ? "border border-border bg-card"
                    : "border-2 border-rose/40 bg-blush-light/50 dark:bg-rose/10",
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
                    variant={isSubtle ? "outline" : "default"}
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
                "rounded-full bg-plum text-white shadow-[0_10px_24px_-10px_rgb(113_61_80/0.7)] hover:bg-plum-dark dark:bg-blush dark:text-plum-dark",
                compact ? "h-12 px-6" : "h-12 px-8 text-base",
            )}
        >
            {processing && <Loader2 className="size-4 animate-spin" />}
            {isLast ? (
                <>Place order{total && !compact ? ` · ${total}` : ""}</>
            ) : (
                <>
                    Continue <ArrowRight className="size-4" />
                </>
            )}
        </Button>
    );
}
