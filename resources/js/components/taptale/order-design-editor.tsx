import { useForm } from "@inertiajs/react";
import {
    BadgeCheck,
    Lock,
    Paintbrush,
    Save,
    Send,
    ShieldAlert,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import OrderDesignController from "@/actions/App/Http/Controllers/Account/OrderDesignController";
import InputError from "@/components/input-error";
import { FileDropzone } from "@/components/taptale/file-dropzone";
import {
    MUSIC_LAYOUTS,
    productPalette,
    TemplatePreview,
} from "@/components/taptale/template-preview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Order, Personalization } from "@/types";

type Path = "self" | "send";

type DesignForm = {
    personalization: Required<Personalization>;
    photos: File[];
    remove_photos: number[];
    confirm_final: boolean;
};

/**
 * Lets the customer finish their design after ordering: customize it
 * themselves with a live preview and approve it (final), or send their
 * photos and details for the studio to put together.
 */
export function OrderDesignEditor({
    order,
    maxUploadKilobytes,
}: {
    order: Order;
    maxUploadKilobytes: number;
}) {
    // The product is the design: its layout shows the customer's details.
    const layout =
        order.design_mode === "self" ? (order.design_layout ?? null) : null;
    const palette = productPalette(order.product_art_style);
    const canSelfDesign = layout !== null;
    const [path, setPath] = useState<Path>(canSelfDesign ? "self" : "send");
    const [confirming, setConfirming] = useState<Path | null>(null);
    const needsMusic = layout !== null && MUSIC_LAYOUTS.includes(layout);
    const maxPhotos = Math.max(1, order.product_max_photos ?? 3);

    const form = useForm<DesignForm>({
        personalization: {
            names: order.personalization.names ?? "",
            date: order.personalization.date ?? "",
            message: order.personalization.message ?? "",
            song_title: order.personalization.song_title ?? "",
            artist: order.personalization.artist ?? "",
            color: order.personalization.color ?? "",
            design_brief: order.personalization.design_brief ?? "",
            instructions: order.personalization.instructions ?? "",
        },
        photos: [],
        remove_photos: [],
        confirm_final: false,
    });
    const errors = form.errors as Partial<Record<string, string>>;
    const details = form.data.personalization;

    const keptPhotos = (order.files ?? []).filter(
        (file) =>
            (file.kind === "photo" || file.kind === "reference") &&
            !form.data.remove_photos.includes(file.id),
    );
    const newPhotoUrls = useMemo(
        () => form.data.photos.map((file) => URL.createObjectURL(file)),
        [form.data.photos],
    );

    useEffect(
        () => () => newPhotoUrls.forEach((url) => URL.revokeObjectURL(url)),
        [newPhotoUrls],
    );

    const previewPhotos = [
        ...keptPhotos.filter((file) => file.is_image).map((file) => file.url),
        ...newPhotoUrls,
    ];
    const photoError =
        errors.photos ??
        Object.entries(errors).find(([key]) => key.startsWith("photos."))?.[1];

    const setDetail = (field: keyof Personalization, value: string) =>
        form.setData("personalization", { ...details, [field]: value });

    const send = (
        url: string,
        options: { confirmFinal?: boolean; onSuccess?: () => void } = {},
    ) => {
        form.transform((data) => ({
            ...data,
            confirm_final: options.confirmFinal ?? false,
        }));
        form.post(url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.setData((current) => ({
                    ...current,
                    photos: [],
                    remove_photos: [],
                    confirm_final: false,
                }));
                options.onSuccess?.();
            },
            onError: () => setConfirming(null),
        });
    };

    return (
        <section
            id="finish-design"
            className="scroll-mt-24 overflow-hidden rounded-2xl border-2 border-rose/40 bg-card"
        >
            <div className="bg-blush-light/60 px-5 py-4 dark:bg-rose/10">
                <h2 className="font-display text-xl">Finish your design</h2>
                <p className="text-sm text-muted-foreground">
                    We can't start making your gift until your design is
                    complete.{" "}
                    {canSelfDesign
                        ? "Design it yourself and approve it, or send us your photos and we will put it together for you."
                        : "Send us your photos and a short description, and our designers will send you the design to approve."}
                </p>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
                {canSelfDesign && (
                    <div
                        role="radiogroup"
                        aria-label="How do you want to finish your design?"
                        className="grid gap-3 sm:grid-cols-2"
                    >
                        <PathCard
                            selected={path === "self"}
                            onSelect={() => setPath("self")}
                            icon={<Paintbrush className="size-5" />}
                            title="Customize it myself"
                            description="Add your photos and words, see the live preview, then approve it."
                        />
                        <PathCard
                            selected={path === "send"}
                            onSelect={() => setPath("send")}
                            icon={<Send className="size-5" />}
                            title="Send it to Taptale"
                            description={`Just send your photos and details. We'll put them on ${order.product_name} and send it to you to approve.`}
                        />
                    </div>
                )}

                <div
                    className={cn(
                        "grid gap-6",
                        layout && "md:grid-cols-[240px_minmax(0,1fr)]",
                    )}
                >
                    {layout && (
                        <div className="md:sticky md:top-24 md:self-start">
                            <div className="overflow-hidden rounded-2xl shadow">
                                <TemplatePreview
                                    layout={layout}
                                    palette={palette}
                                    photoUrl={previewPhotos[0]}
                                    photos={previewPhotos}
                                    names={details.names}
                                    date={details.date}
                                    message={details.message}
                                    songTitle={details.song_title}
                                    artist={details.artist}
                                    accent={details.color || undefined}
                                />
                            </div>
                            <p className="mt-2 text-center text-xs text-muted-foreground">
                                {path === "self"
                                    ? `Live preview · ${order.product_name}`
                                    : `${order.product_name} · our designers will fine-tune it`}
                            </p>
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <Label className="mb-2 block">
                                Photos
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    up to {maxPhotos}
                                    {order.design_mode === "self" &&
                                        " · at least 1"}
                                </span>
                            </Label>
                            {keptPhotos.length > 0 && (
                                <ul className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                                    {keptPhotos.map((file) => (
                                        <li key={file.id} className="relative">
                                            <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
                                                {file.is_image && (
                                                    <img
                                                        src={file.url}
                                                        alt={file.original_name}
                                                        className="size-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    form.setData(
                                                        "remove_photos",
                                                        [
                                                            ...form.data
                                                                .remove_photos,
                                                            file.id,
                                                        ],
                                                    )
                                                }
                                                className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-foreground text-background shadow"
                                                aria-label={`Remove ${file.original_name}`}
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {keptPhotos.length < maxPhotos && (
                                <FileDropzone
                                    id="design-photos"
                                    files={form.data.photos}
                                    onChange={(files) =>
                                        form.setData("photos", files)
                                    }
                                    maxFiles={maxPhotos - keptPhotos.length}
                                    maxKilobytes={maxUploadKilobytes}
                                    label="Add your photos"
                                />
                            )}
                            <InputError message={photoError} className="mt-2" />
                        </div>

                        {order.design_mode === "assisted" && (
                            <Field
                                id="design-brief"
                                label="Describe your design"
                                hint={`${details.design_brief.length}/2000`}
                                error={errors["personalization.design_brief"]}
                            >
                                <Textarea
                                    id="design-brief"
                                    value={details.design_brief}
                                    onChange={(event) =>
                                        setDetail(
                                            "design_brief",
                                            event.target.value,
                                        )
                                    }
                                    rows={4}
                                    maxLength={2000}
                                    placeholder="Tell us the occasion, the style you like and what to feature."
                                />
                            </Field>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                id="design-names"
                                label={
                                    order.design_mode === "self"
                                        ? "Names"
                                        : "Names (optional)"
                                }
                                error={errors["personalization.names"]}
                            >
                                <Input
                                    id="design-names"
                                    value={details.names}
                                    onChange={(event) =>
                                        setDetail("names", event.target.value)
                                    }
                                    placeholder="e.g. Ana & Leo"
                                    maxLength={120}
                                />
                            </Field>
                            <Field
                                id="design-date"
                                label="Date (optional)"
                                error={errors["personalization.date"]}
                            >
                                <Input
                                    id="design-date"
                                    value={details.date}
                                    onChange={(event) =>
                                        setDetail("date", event.target.value)
                                    }
                                    placeholder="e.g. 02 · 14 · 2026"
                                    maxLength={60}
                                />
                            </Field>
                            <Field
                                id="design-song"
                                label={
                                    needsMusic
                                        ? "Song or album title"
                                        : "Song title (optional)"
                                }
                                error={errors["personalization.song_title"]}
                            >
                                <Input
                                    id="design-song"
                                    value={details.song_title}
                                    onChange={(event) =>
                                        setDetail(
                                            "song_title",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. Our Song"
                                    maxLength={80}
                                />
                            </Field>
                            <Field
                                id="design-artist"
                                label={
                                    needsMusic ? "Artist" : "Artist (optional)"
                                }
                                error={errors["personalization.artist"]}
                            >
                                <Input
                                    id="design-artist"
                                    value={details.artist}
                                    onChange={(event) =>
                                        setDetail("artist", event.target.value)
                                    }
                                    maxLength={80}
                                />
                            </Field>
                        </div>
                        <Field
                            id="design-message"
                            label="Message (optional)"
                            hint={`${details.message.length}/300`}
                            error={errors["personalization.message"]}
                        >
                            <Textarea
                                id="design-message"
                                value={details.message}
                                onChange={(event) =>
                                    setDetail("message", event.target.value)
                                }
                                placeholder="A short letter, quote or inside joke"
                                maxLength={300}
                                rows={3}
                            />
                        </Field>
                        {path === "send" && (
                            <Field
                                id="design-instructions"
                                label="Anything our designers should know? (optional)"
                                error={errors["personalization.instructions"]}
                            >
                                <Textarea
                                    id="design-instructions"
                                    value={details.instructions}
                                    onChange={(event) =>
                                        setDetail(
                                            "instructions",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. Use the beach photo as the main one."
                                    maxLength={2000}
                                    rows={3}
                                />
                            </Field>
                        )}

                        <InputError message={errors.design} />

                        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-full"
                                disabled={form.processing}
                                onClick={() =>
                                    send(
                                        OrderDesignController.update.url(
                                            order.reference,
                                        ),
                                    )
                                }
                            >
                                <Save className="size-4" /> Save for later
                            </Button>
                            <Button
                                type="button"
                                className="h-11 rounded-full bg-plum text-white hover:bg-plum-dark dark:bg-blush dark:text-plum-dark"
                                disabled={form.processing}
                                onClick={() => {
                                    form.setData("confirm_final", false);
                                    setConfirming(path);
                                }}
                            >
                                {path === "self" ? (
                                    <>
                                        <BadgeCheck className="size-4" /> Review
                                        & approve
                                    </>
                                ) : (
                                    <>
                                        <Send className="size-4" /> Send to
                                        Taptale
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog
                open={confirming === "self"}
                onOpenChange={(open) => !open && setConfirming(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogTitle>Approve your final design?</DialogTitle>
                    <DialogDescription>
                        This is the last step before we make your gift.
                    </DialogDescription>
                    <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                        {layout && (
                            <div className="overflow-hidden rounded-xl shadow">
                                <TemplatePreview
                                    layout={layout}
                                    palette={palette}
                                    photoUrl={previewPhotos[0]}
                                    photos={previewPhotos}
                                    names={details.names}
                                    date={details.date}
                                    message={details.message}
                                    songTitle={details.song_title}
                                    artist={details.artist}
                                    accent={details.color || undefined}
                                />
                            </div>
                        )}
                        <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                            <ShieldAlert className="size-5 shrink-0" />
                            <p>
                                <span className="font-semibold">
                                    Approval is final — there's no turning back.
                                </span>{" "}
                                We make your gift exactly as this preview shows.
                                After you approve, you can't change the photos,
                                names, dates or spelling, and mistakes in an
                                approved design can't be returned or refunded.
                            </p>
                        </div>
                    </div>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                        <Checkbox
                            checked={form.data.confirm_final}
                            onCheckedChange={(checked) =>
                                form.setData("confirm_final", checked === true)
                            }
                            className="mt-0.5"
                        />
                        <span>
                            I've checked the names, dates, spelling and photos,
                            and I understand my approved design is final.
                        </span>
                    </label>
                    <InputError message={errors.confirm_final} />
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Keep editing</Button>
                        </DialogClose>
                        <Button
                            disabled={
                                !form.data.confirm_final || form.processing
                            }
                            onClick={() =>
                                send(
                                    OrderDesignController.approve.url(
                                        order.reference,
                                    ),
                                    {
                                        confirmFinal: true,
                                        onSuccess: () => setConfirming(null),
                                    },
                                )
                            }
                            className="bg-plum text-white hover:bg-plum-dark dark:bg-blush dark:text-plum-dark"
                        >
                            <Lock className="size-4" /> Approve — it's final
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={confirming === "send"}
                onOpenChange={(open) => !open && setConfirming(null)}
            >
                <DialogContent>
                    <DialogTitle>Send your photos and details?</DialogTitle>
                    <DialogDescription>
                        Our designers will put your design together and send it
                        here for you to approve. After sending, these details
                        can't be edited here, but you can ask for changes when
                        you see the design.
                    </DialogDescription>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Not yet</Button>
                        </DialogClose>
                        <Button
                            disabled={form.processing}
                            onClick={() =>
                                send(
                                    OrderDesignController.submit.url(
                                        order.reference,
                                    ),
                                    { onSuccess: () => setConfirming(null) },
                                )
                            }
                        >
                            <Send className="size-4" /> Send to Taptale
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}

function PathCard({
    selected,
    onSelect,
    icon,
    title,
    description,
}: {
    selected: boolean;
    onSelect: () => void;
    icon: ReactNode;
    title: string;
    description: string;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={cn(
                "flex gap-3 rounded-2xl border-2 p-4 text-left transition",
                selected
                    ? "border-rose bg-blush-light/50 dark:bg-rose/10"
                    : "border-border hover:border-rose/40",
            )}
        >
            <span
                className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    selected
                        ? "bg-plum text-white dark:bg-blush dark:text-plum-dark"
                        : "bg-muted text-muted-foreground",
                )}
            >
                {icon}
            </span>
            <span>
                <span className="block font-medium">{title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                    {description}
                </span>
            </span>
        </button>
    );
}

function Field({
    id,
    label,
    hint,
    error,
    children,
}: {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={id}>{label}</Label>
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
