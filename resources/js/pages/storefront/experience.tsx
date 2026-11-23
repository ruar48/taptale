import { Head, Link, router } from "@inertiajs/react";
import {
    Camera,
    Eye,
    Flower2,
    Pencil,
    RotateCcw,
    ShoppingBag,
    Sparkles,
    X,
} from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import ExperienceContentController from "@/actions/App/Http/Controllers/Account/ExperienceContentController";
import ExperiencePhotoController from "@/actions/App/Http/Controllers/Account/ExperiencePhotoController";
import ExperienceRainPhotoController from "@/actions/App/Http/Controllers/Account/ExperienceRainPhotoController";
import ExperienceVideoController from "@/actions/App/Http/Controllers/Account/ExperienceVideoController";
import {
    presetFor,
    themeFor,
    themeStyle,
} from "@/components/taptale/experience/config";
import {
    AddSectionButton,
    CustomSection,
} from "@/components/taptale/experience/custom-sections";
import type { FlowersOption } from "@/components/taptale/experience/custom-sections";
import { Gate } from "@/components/taptale/experience/gates";
import { RecipientActions } from "@/components/taptale/experience/recipient-actions";
import {
    ExperienceSection,
    FlowersSection,
} from "@/components/taptale/experience/sections";
import {
    AddPhotoButton,
    AudioProvider,
    ExperienceContext,
    MusicButton,
} from "@/components/taptale/experience/shared";
import type { PhotoSlot } from "@/components/taptale/experience/shared";
import { DesignSwitcher } from "@/components/taptale/experience/design-switcher";
import type { DesignOptions } from "@/components/taptale/experience/design-switcher";
import { useMoney } from "@/hooks/use-money";
import { usePageDraft } from "@/hooks/use-page-draft";
import { home } from "@/routes";
import { edit as editExperience } from "@/routes/account/experiences";
import { templates as memoryPages } from "@/routes/experiences";
import { create as startOrder } from "@/routes/orders";
import type { DigitalExperience } from "@/types";

export default function Experience({
    experience: pageExperience,
    isPreview,
    isDemo = false,
    canEdit = false,
    isRecipient = false,
    hasHearted = false,
    designOptions = null,
    orderProduct = null,
    maxDraftPhotos = 24,
    flowersAddonPrice = 0,
}: {
    experience: DigitalExperience;
    isPreview: boolean;
    isDemo?: boolean;
    canEdit?: boolean;
    isRecipient?: boolean;
    hasHearted?: boolean;
    designOptions?: DesignOptions | null;
    /** Demo only: the keychain the "order with this page" button opens. */
    orderProduct?: string | null;
    maxDraftPhotos?: number;
    /** Demo only: what adding the flowers to this design costs at checkout. */
    flowersAddonPrice?: number;
}) {
    /*
     * A demo is editable by anyone: their words and photos stay in this
     * browser as a draft until they order a keychain with the page.
     */
    const draft = usePageDraft(pageExperience, isDemo, maxDraftPhotos);
    const experience = isDemo ? draft.experience : pageExperience;
    const editable = canEdit || isDemo;
    const theme = themeFor(experience.theme);
    const preset = presetFor(experience.template);
    const money = useMoney();
    /*
     * Designs other than the bouquet show the flowers only when they were
     * added (bought at checkout, or chosen on a demo before ordering).
     */
    const hasOwnFlowers = preset.sections.includes("bouquet");
    const showsAddedFlowers = !hasOwnFlowers && experience.flower_addon;
    // Placed flowers show where they were put, instead of after the opening.
    const hasPlacedFlowers = (experience.custom_sections ?? []).some(
        (section) => section.type === "flowers",
    );
    /*
     * The premium flowers in the section picker: on a demo they add the
     * add-on (charged at checkout); on a page that bought them they move.
     */
    const flowersOption: FlowersOption = hasOwnFlowers
        ? null
        : isDemo
          ? {
                badge:
                    flowersAddonPrice > 0
                        ? `Premium · +${money(flowersAddonPrice)}`
                        : "Premium",
                description:
                    "Glowing flowers bloom right here, with petals or your photos raining down. Added to your keychain order at checkout.",
            }
          : canEdit && experience.flower_addon
            ? {
                  badge: "Bought",
                  description: "Move your flowers to this spot.",
              }
            : null;
    const [opened, setOpened] = useState(
        () =>
            preset.gate === null ||
            (typeof window !== "undefined" &&
                new URLSearchParams(window.location.search).get("intro") ===
                    "0"),
    );
    const [lightbox, setLightbox] = useState<string | null>(null);
    /*
     * The order wizard previews demos in a frame and has its own "use this
     * design" buttons, so the demo's navigation stays out of the frame.
     */
    const [isEmbedded, setIsEmbedded] = useState(false);
    useEffect(() => setIsEmbedded(window.self !== window.top), []);
    const [uploading, setUploading] = useState(false);

    const photos = experience.photos.map((photo) => photo.url);

    /*
     * The owner's extra sections, placed after the given number of template
     * sections. Positions past the end (after switching to a template with
     * fewer sections) fall back to the last slot.
     */
    const customSectionsAt = (position: number) =>
        (experience.custom_sections ?? []).filter(
            (customSection) =>
                Math.min(
                    Math.max(customSection.position, 1),
                    preset.sections.length,
                ) === position,
        );

    /*
     * Visitors see photos repeat so every frame is filled. Whoever edits
     * the page sees empty frames instead, so they can tap one and add a
     * picture.
     */
    const photoAt = (index: number): string | null => {
        if (editable) {
            return photos[index] ?? null;
        }

        return photos.length > 0 ? photos[index % photos.length] : null;
    };

    const addPhotos = (files: File[], moment?: number, slot?: PhotoSlot) => {
        if (isDemo) {
            if (!draft.processing) {
                void draft.addPhotos(files, moment, slot);
            }

            return;
        }

        if (!canEdit || uploading) {
            return;
        }

        router.post(
            ExperiencePhotoController.store.url(experience.code),
            {
                photos: files,
                ...(moment !== undefined ? { moment } : {}),
                ...(slot ? { section: slot.section, slot: slot.slot } : {}),
            },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onStart: () => setUploading(true),
                onFinish: () => setUploading(false),
                onError: (errors) => {
                    toast.error(
                        Object.values(errors)[0] ??
                            "The photo could not be added. Please try again.",
                    );
                },
            },
        );
    };

    const replacePhoto = (index: number, file: File) => {
        if (isDemo) {
            if (!draft.processing) {
                void draft.replacePhoto(index, file);
            }

            return;
        }

        if (!canEdit || uploading) {
            return;
        }

        router.post(
            ExperiencePhotoController.replace.url({
                experience: experience.code,
                index,
            }),
            { photo: file },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onStart: () => setUploading(true),
                onFinish: () => setUploading(false),
                onError: (errors) => {
                    toast.error(
                        Object.values(errors)[0] ??
                            "The photo could not be changed. Please try again.",
                    );
                },
            },
        );
    };

    const saveTextOnServer = (field: string, value: string): Promise<boolean> =>
        new Promise((resolve) => {
            router.patch(
                ExperienceContentController.update.url(experience.code),
                { field, value },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => resolve(true),
                    onError: (errors) => {
                        toast.error(
                            Object.values(errors)[0] ??
                                "Your text could not be saved.",
                        );
                        resolve(false);
                    },
                },
            );
        });

    const saveText = (field: string, value: string): Promise<boolean> =>
        isDemo
            ? draft.saveText(field, value)
            : saveTextOnServer(field, value);

    /*
     * Photos picked to rain over the flowers: kept in the browser on a demo,
     * uploaded straight away on the owner's page.
     */
    const addRainPhotos = (files: File[]) => {
        if (isDemo) {
            if (!draft.processing) {
                void draft.addRainPhotos(files);
            }

            return;
        }

        if (!canEdit || uploading) {
            return;
        }

        router.post(
            ExperienceRainPhotoController.store.url(experience.code),
            { photos: files },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onStart: () => setUploading(true),
                onFinish: () => setUploading(false),
                onError: (errors) => {
                    toast.error(
                        Object.values(errors)[0] ??
                            "The photos could not be added. Please try again.",
                    );
                },
            },
        );
    };

    const removeRainPhoto = (index: number) => {
        if (isDemo) {
            draft.removeRainPhoto(index);

            return;
        }

        if (!canEdit) {
            return;
        }

        router.delete(
            ExperienceRainPhotoController.destroy.url({
                experience: experience.code,
                index,
            }),
            { preserveScroll: true, preserveState: true },
        );
    };

    /*
     * The page video: kept in the browser on a demo, uploaded straight away
     * (within the size limit) on the owner's page.
     */
    const addVideo = (file: File) => {
        if (isDemo) {
            draft.addVideo(file);

            return;
        }

        if (!canEdit || uploading) {
            return;
        }

        router.post(
            ExperienceVideoController.store.url(experience.code),
            { video: file },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onStart: () => setUploading(true),
                onFinish: () => setUploading(false),
                onError: (errors) => {
                    toast.error(
                        Object.values(errors)[0] ??
                            "The video could not be uploaded. Please try again.",
                    );
                },
            },
        );
    };

    const removeVideo = () => {
        if (!window.confirm("Remove the video from your page?")) {
            return;
        }

        if (isDemo) {
            draft.removeVideo();

            return;
        }

        if (!canEdit) {
            return;
        }

        router.delete(ExperienceVideoController.destroy.url(experience.code), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <ExperienceContext.Provider
            value={{
                experience,
                preset,
                theme,
                photos,
                photoAt,
                moments: experience.moments,
                openPhoto: setLightbox,
                editable,
                uploading: isDemo ? draft.processing : uploading,
                addPhotos,
                replacePhoto,
                saveText,
                sectionActions: isDemo ? draft.sectionActions : undefined,
                addRainPhotos,
                removeRainPhoto,
                addVideo,
                removeVideo,
                opened,
            }}
        >
            <AudioProvider src={experience.audio_url}>
                <Head title={experience.title} />
                <div
                    className="min-h-screen overflow-x-hidden"
                    style={themeStyle(theme)}
                >
                    {(isPreview || isDemo || canEdit) && (
                        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
                            {isDemo ? (
                                <>
                                    <Sparkles className="size-4" />
                                    <span>
                                        Make it yours: tap any word or empty
                                        frame to change it. It stays on this
                                        device until you order.
                                    </span>
                                    <AddPhotoButton
                                        multiple
                                        className="inline-flex"
                                    >
                                        <span className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
                                            <Camera className="size-3.5" />
                                            {draft.processing
                                                ? "Adding…"
                                                : "Add photos"}
                                        </span>
                                    </AddPhotoButton>
                                    {!hasOwnFlowers &&
                                        !experience.flower_addon && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    draft.setFlowerAddon(true);
                                                    window.setTimeout(
                                                        () =>
                                                            document
                                                                .getElementById(
                                                                    "page-flowers",
                                                                )
                                                                ?.scrollIntoView({
                                                                    behavior:
                                                                        "smooth",
                                                                }),
                                                        50,
                                                    );
                                                }}
                                                className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                                            >
                                                <Flower2 className="size-3.5" />
                                                Add flowers
                                                {flowersAddonPrice > 0 &&
                                                    ` (+${money(flowersAddonPrice)})`}
                                            </button>
                                        )}
                                    {draft.hasChanges && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        "Start over with the sample page? Your words and photos on this design will be removed from this device.",
                                                    )
                                                ) {
                                                    draft.reset();
                                                }
                                            }}
                                            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                                        >
                                            <RotateCcw className="size-3.5" />
                                            Start over
                                        </button>
                                    )}
                                    {!isEmbedded && (
                                        <Link
                                            href={memoryPages()}
                                            className="font-semibold underline underline-offset-2"
                                        >
                                            More designs
                                        </Link>
                                    )}
                                    {!isEmbedded && (
                                        <Link
                                            href={startOrder({
                                                query: {
                                                    ...(orderProduct
                                                        ? {
                                                              product:
                                                                  orderProduct,
                                                          }
                                                        : {}),
                                                    page: experience.template,
                                                },
                                            })}
                                            onClick={() => draft.keep()}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-amber-900 px-3.5 py-1 font-semibold text-amber-50 shadow-sm transition hover:bg-amber-950"
                                        >
                                            <ShoppingBag className="size-3.5" />
                                            Order a keychain with this page
                                        </Link>
                                    )}
                                </>
                            ) : (
                                <>
                                    {isPreview ? (
                                        <Eye className="size-4" />
                                    ) : (
                                        <Camera className="size-4" />
                                    )}
                                    {isPreview
                                        ? "Preview — only you can see this page until you publish it."
                                        : "This is your page."}
                                    {canEdit && (
                                        <span>
                                            Tap any empty frame to add a photo.
                                        </span>
                                    )}
                                    {canEdit && (
                                        <AddPhotoButton
                                            multiple
                                            className="inline-flex"
                                        >
                                            <span className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
                                                <Camera className="size-3.5" />
                                                {uploading
                                                    ? "Uploading…"
                                                    : "Add photos"}
                                            </span>
                                        </AddPhotoButton>
                                    )}
                                    {canEdit && designOptions && (
                                        <DesignSwitcher
                                            experience={experience}
                                            options={designOptions}
                                        />
                                    )}
                                    {canEdit && (
                                        <Link
                                            href={editExperience(
                                                experience.code,
                                            )}
                                            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                                        >
                                            <Pencil className="size-3.5" /> Edit
                                            page
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {!opened && preset.gate && (
                        <Gate
                            kind={preset.gate}
                            onOpen={() => setOpened(true)}
                        />
                    )}

                    <main>
                        {preset.sections.map((section, index) => (
                            <Fragment key={section}>
                                <ExperienceSection section={section} />
                                {index === 0 &&
                                    showsAddedFlowers &&
                                    !hasPlacedFlowers && (
                                    <FlowersSection
                                        isAddon
                                        onRemove={
                                            isDemo
                                                ? () =>
                                                      draft.setFlowerAddon(
                                                          false,
                                                      )
                                                : undefined
                                        }
                                    />
                                )}
                                {customSectionsAt(index + 1).map(
                                    (customSection) => (
                                        <CustomSection
                                            key={customSection.id}
                                            section={customSection}
                                        />
                                    ),
                                )}
                                {editable && (
                                    <AddSectionButton
                                        position={index + 1}
                                        flowers={flowersOption}
                                    />
                                )}
                            </Fragment>
                        ))}
                    </main>

                    <footer className="pb-24 text-center text-xs opacity-70">
                        <Link href={home()} className="hover:underline">
                            Made with Taptale · Every tap tells a story
                        </Link>
                    </footer>

                    <MusicButton />

                    {isRecipient && opened && (
                        <RecipientActions
                            code={experience.code}
                            senderName={experience.sender_name}
                            hasHearted={hasHearted}
                        />
                    )}

                    {lightbox && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                            onClick={() => setLightbox(null)}
                        >
                            <button
                                type="button"
                                className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white"
                                aria-label="Close photo"
                            >
                                <X className="size-6" />
                            </button>
                            <img
                                src={lightbox}
                                alt=""
                                className="max-h-full max-w-full rounded-xl"
                            />
                        </div>
                    )}
                </div>
            </AudioProvider>
        </ExperienceContext.Provider>
    );
}
