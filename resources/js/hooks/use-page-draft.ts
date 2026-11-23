import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    clearPageDraft,
    loadPageDraft,
    loadPagePhotos,
    MOMENT_TEXT_LIMITS,
    PAGE_CHOICES,
    PAGE_TEXT_LIMITS,
    pageContentFrom,
    savePageDraft,
    savePagePhotos,
    shrinkPhoto,
} from '@/lib/page-draft';
import type { PageDraftContent } from '@/lib/page-draft';
import type { DigitalExperience } from '@/types';

type TextField = keyof typeof PAGE_TEXT_LIMITS;
type ChoiceField = keyof typeof PAGE_CHOICES;

function clean(value: string): string | null {
    const text = value.trim();

    return text === '' ? null : text;
}

/**
 * Turns a demo into a page the visitor can edit in place. Every word,
 * choice and photo is kept in this browser as a draft (see page-draft.ts)
 * and nothing is sent to the server until they order with the page.
 */
export function usePageDraft(
    demo: DigitalExperience,
    enabled: boolean,
    maxPhotos: number,
) {
    const template = demo.template;
    const [content, setContent] = useState<PageDraftContent | null>(null);
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        setContent(loadPageDraft(template)?.content ?? null);
        void loadPagePhotos(template).then((files) =>
            setPhotoFiles(files.slice(0, maxPhotos)),
        );
    }, [enabled, template, maxPhotos]);

    const photoUrls = useMemo(
        () => photoFiles.map((file) => URL.createObjectURL(file)),
        [photoFiles],
    );
    useEffect(
        () => () => photoUrls.forEach((url) => URL.revokeObjectURL(url)),
        [photoUrls],
    );

    const current = useMemo(
        () => content ?? pageContentFrom(demo),
        [content, demo],
    );

    const experience = useMemo<DigitalExperience>(() => {
        const { moments, ...fields } = current;
        const sameSong =
            fields.song_title === demo.song_title &&
            fields.song_artist === demo.song_artist;

        return {
            ...demo,
            ...fields,
            song_details: sameSong ? demo.song_details : null,
            photos: photoUrls.map((url, index) => ({ index, url })),
            moments: moments.map((moment) => ({
                ...moment,
                photo_url:
                    moment.photo !== null
                        ? (photoUrls[moment.photo] ?? null)
                        : null,
            })),
        };
    }, [current, demo, photoUrls]);

    const store = useCallback(
        (next: PageDraftContent) => {
            setContent(next);
            savePageDraft(template, next);
        },
        [template],
    );

    const storePhotos = (next: File[]) => {
        setPhotoFiles(next);
        void savePagePhotos(template, next);
    };

    const saveText = async (field: string, value: string): Promise<boolean> => {
        const moment = field.match(/^moments\.(\d+)\.(date|title|caption)$/);

        if (moment) {
            const index = Number(moment[1]);
            const part = moment[2] as keyof typeof MOMENT_TEXT_LIMITS;
            const text = clean(value);

            if (!current.moments[index]) {
                return false;
            }

            if ((text?.length ?? 0) > MOMENT_TEXT_LIMITS[part]) {
                toast.error(
                    `Please keep this under ${MOMENT_TEXT_LIMITS[part]} characters.`,
                );

                return false;
            }

            store({
                ...current,
                moments: current.moments.map((item, position) =>
                    position === index ? { ...item, [part]: text } : item,
                ),
            });

            return true;
        }

        if (field in PAGE_CHOICES) {
            const choices = PAGE_CHOICES[
                field as ChoiceField
            ] as readonly string[];

            if (!choices.includes(value)) {
                return false;
            }

            store({ ...current, [field]: value });

            return true;
        }

        if (!(field in PAGE_TEXT_LIMITS)) {
            toast.error('This part of the demo cannot be changed here.');

            return false;
        }

        const limit = PAGE_TEXT_LIMITS[field as TextField];
        const text = clean(value);

        if (field === 'title' && text === null) {
            toast.error('Please add a headline.');

            return false;
        }

        if ((text?.length ?? 0) > limit) {
            toast.error(`Please keep this under ${limit} characters.`);

            return false;
        }

        const isSongChange =
            (field === 'song_title' || field === 'song_artist') &&
            text !== current[field];

        store({
            ...current,
            [field]: text,
            // A new song is looked up by name instead of playing the demo video.
            ...(isSongChange ? { music_url: null } : {}),
        });

        return true;
    };

    const addPhotos = async (files: File[], moment?: number) => {
        const room = maxPhotos - photoFiles.length;

        if (room <= 0) {
            toast.error(`A page can hold up to ${maxPhotos} photos.`);

            return;
        }

        if (files.length > room) {
            toast.warning(
                `Only ${room} more ${room === 1 ? 'photo fits' : 'photos fit'} on the page.`,
            );
        }

        setProcessing(true);
        const shrunk = await Promise.all(files.slice(0, room).map(shrinkPhoto));
        setProcessing(false);

        const firstIndex = photoFiles.length;
        storePhotos([...photoFiles, ...shrunk]);

        if (moment !== undefined && current.moments[moment]) {
            store({
                ...current,
                moments: current.moments.map((item, position) =>
                    position === moment ? { ...item, photo: firstIndex } : item,
                ),
            });
        }
    };

    const replacePhoto = async (index: number, file: File) => {
        if (!photoFiles[index]) {
            return;
        }

        setProcessing(true);
        const shrunk = await shrinkPhoto(file);
        setProcessing(false);

        storePhotos(
            photoFiles.map((photo, position) =>
                position === index ? shrunk : photo,
            ),
        );
    };

    /** Add or remove the flowers on a design that does not include them. */
    const setFlowerAddon = (isAdded: boolean) => {
        store({ ...current, flower_addon: isAdded });
    };

    /** Keep the page as it looks now, even if nothing was changed yet. */
    const keep = () => {
        if (content === null) {
            store(current);
        }
    };

    const reset = () => {
        clearPageDraft(template);
        setContent(null);
        setPhotoFiles([]);
    };

    return {
        experience,
        saveText,
        addPhotos,
        replacePhoto,
        setFlowerAddon,
        keep,
        reset,
        processing,
        hasChanges: content !== null || photoFiles.length > 0,
    };
}
