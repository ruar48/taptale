import { Head, Link, router } from '@inertiajs/react';
import { Camera, Eye, Pencil, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import ExperienceContentController from '@/actions/App/Http/Controllers/Account/ExperienceContentController';
import ExperiencePhotoController from '@/actions/App/Http/Controllers/Account/ExperiencePhotoController';
import {
    presetFor,
    themeFor,
    themeStyle,
} from '@/components/taptale/experience/config';
import { Gate } from '@/components/taptale/experience/gates';
import { ExperienceSection } from '@/components/taptale/experience/sections';
import {
    AddPhotoButton,
    AudioProvider,
    ExperienceContext,
    MusicButton,
} from '@/components/taptale/experience/shared';
import { DesignSwitcher } from '@/components/taptale/experience/design-switcher';
import type { DesignOptions } from '@/components/taptale/experience/design-switcher';
import { home } from '@/routes';
import { edit as editExperience } from '@/routes/account/experiences';
import { templates as memoryPages } from '@/routes/experiences';
import { create as startOrder } from '@/routes/orders';
import type { DigitalExperience } from '@/types';

export default function Experience({
    experience,
    isPreview,
    isDemo = false,
    canEdit = false,
    designOptions = null,
}: {
    experience: DigitalExperience;
    isPreview: boolean;
    isDemo?: boolean;
    canEdit?: boolean;
    designOptions?: DesignOptions | null;
}) {
    const theme = themeFor(experience.theme);
    const preset = presetFor(experience.template);
    const [opened, setOpened] = useState(
        () =>
            preset.gate === null ||
            (typeof window !== 'undefined' &&
                new URLSearchParams(window.location.search).get('intro') ===
                    '0'),
    );
    const [lightbox, setLightbox] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const photos = experience.photos.map((photo) => photo.url);

    /*
     * Visitors see photos repeat so every frame is filled. The owner sees
     * empty frames instead, so they can tap one and add a picture.
     */
    const photoAt = (index: number): string | null => {
        if (canEdit) {
            return photos[index] ?? null;
        }

        return photos.length > 0 ? photos[index % photos.length] : null;
    };

    const addPhotos = (files: File[], moment?: number) => {
        if (!canEdit || uploading) {
            return;
        }

        router.post(
            ExperiencePhotoController.store.url(experience.code),
            {
                photos: files,
                ...(moment !== undefined ? { moment } : {}),
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
                            'The photo could not be added. Please try again.',
                    );
                },
            },
        );
    };

    const replacePhoto = (index: number, file: File) => {
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
                            'The photo could not be changed. Please try again.',
                    );
                },
            },
        );
    };

    const saveText = (field: string, value: string): Promise<boolean> =>
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
                                'Your text could not be saved.',
                        );
                        resolve(false);
                    },
                },
            );
        });

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
                editable: canEdit,
                uploading,
                addPhotos,
                replacePhoto,
                saveText,
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
                                    <Sparkles className="size-4" /> Demo of the
                                    “{experience.title}” design with sample
                                    words. You can edit every word and photo
                                    once you create yours.
                                    <Link
                                        href={memoryPages()}
                                        className="font-semibold underline underline-offset-2"
                                    >
                                        More designs
                                    </Link>
                                    <Link
                                        href={startOrder()}
                                        className="font-semibold underline underline-offset-2"
                                    >
                                        Create yours
                                    </Link>
                                </>
                            ) : (
                                <>
                                    {isPreview ? (
                                        <Eye className="size-4" />
                                    ) : (
                                        <Camera className="size-4" />
                                    )}
                                    {isPreview
                                        ? 'Preview — only you can see this page until you publish it.'
                                        : 'This is your page.'}
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
                                                    ? 'Uploading…'
                                                    : 'Add photos'}
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
                        {preset.sections.map((section) => (
                            <ExperienceSection
                                key={section}
                                section={section}
                            />
                        ))}
                    </main>

                    <footer className="pb-24 text-center text-xs opacity-70">
                        <Link href={home()} className="hover:underline">
                            Made with Taptale · Every tap tells a story
                        </Link>
                    </footer>

                    <MusicButton />

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
