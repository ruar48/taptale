import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
    PhotoSlot,
    SectionActions,
} from '@/components/taptale/experience/shared';
import {
    clearPageDraft,
    loadPageDraft,
    loadPagePhotos,
    loadRainPhotos,
    MAX_CUSTOM_SECTIONS,
    MAX_RAIN_PHOTOS,
    MAX_SECTION_SLOTS,
    MOMENT_TEXT_LIMITS,
    PAGE_CHOICES,
    PAGE_TEXT_LIMITS,
    pageContentFrom,
    saveRainPhotos,
    savePageDraft,
    savePagePhotos,
    SECTION_SLOT_COUNTS,
    shrinkPhoto,
} from '@/lib/page-draft';
import type { PageDraftContent, PageDraftSection } from '@/lib/page-draft';
import type { DigitalExperience } from '@/types';

type TextField = keyof typeof PAGE_TEXT_LIMITS;
type ChoiceField = keyof typeof PAGE_CHOICES;

/** Longest text of an extra section's title, note and photo captions. */
const SECTION_TEXT_LIMITS = { title: 80, text: 2000, caption: 80 } as const;

function clean(value: string): string | null {
    const text = value.trim();

    return text === '' ? null : text;
}

function emptySlots(count: number): PageDraftSection['slots'] {
    return Array.from({ length: count }, () => ({
        photo: null,
        caption: null,
    }));
}

/** A section id like the server's: eight lowercase letters and digits. */
function newSectionId(): string {
    return Math.random().toString(36).slice(2, 10).padEnd(8, '0');
}

/** Drafts saved before a field existed get its default. */
function withDefaults(content: PageDraftContent): PageDraftContent {
    return {
        ...content,
        flower_addon: content.flower_addon ?? false,
        custom_sections: content.custom_sections ?? [],
    };
}

function useObjectUrls(files: File[]): string[] {
    const urls = useMemo(
        () => files.map((file) => URL.createObjectURL(file)),
        [files],
    );

    useEffect(
        () => () => urls.forEach((url) => URL.revokeObjectURL(url)),
        [urls],
    );

    return urls;
}

/**
 * Turns a demo into a page the visitor can edit in place, with the same
 * tools as the owner's page: words, photos, flowers, extra sections and the
 * photos that rain down. Everything is kept in this browser as a draft
 * (see page-draft.ts) and nothing is sent until they order with the page.
 */
export function usePageDraft(
    demo: DigitalExperience,
    enabled: boolean,
    maxPhotos: number,
) {
    const template = demo.template;
    const [content, setContent] = useState<PageDraftContent | null>(null);
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [rainFiles, setRainFiles] = useState<File[]>([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const saved = loadPageDraft(template)?.content;

        setContent(saved ? withDefaults(saved) : null);
        void loadPagePhotos(template).then((files) =>
            setPhotoFiles(files.slice(0, maxPhotos)),
        );
        void loadRainPhotos(template).then((files) =>
            setRainFiles(files.slice(0, MAX_RAIN_PHOTOS)),
        );
    }, [enabled, template, maxPhotos]);

    const photoUrls = useObjectUrls(photoFiles);
    const rainUrls = useObjectUrls(rainFiles);

    const current = useMemo(
        () => content ?? pageContentFrom(demo),
        [content, demo],
    );

    const experience = useMemo<DigitalExperience>(() => {
        const { moments, custom_sections: sections, ...fields } = current;
        const sameSong =
            fields.song_title === demo.song_title &&
            fields.song_artist === demo.song_artist;
        const urlOf = (photo: number | null) =>
            photo !== null ? (photoUrls[photo] ?? null) : null;

        return {
            ...demo,
            ...fields,
            song_details: sameSong ? demo.song_details : null,
            photos: photoUrls.map((url, index) => ({ index, url })),
            rain_photos: rainUrls.map((url, index) => ({ index, url })),
            moments: moments.map((moment) => ({
                ...moment,
                photo_url: urlOf(moment.photo),
            })),
            custom_sections: sections.map((section) => ({
                ...section,
                slots: section.slots.map((slot) => ({
                    ...slot,
                    photo_url: urlOf(slot.photo),
                })),
            })),
        };
    }, [current, demo, photoUrls, rainUrls]);

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

    const storeRainPhotos = (next: File[]) => {
        setRainFiles(next);
        void saveRainPhotos(template, next);
    };

    const tooLong = (text: string | null, limit: number): boolean => {
        if ((text?.length ?? 0) <= limit) {
            return false;
        }

        toast.error(`Please keep this under ${limit} characters.`);

        return true;
    };

    const updateSection = (
        id: string,
        change: (section: PageDraftSection) => PageDraftSection,
    ) =>
        store({
            ...current,
            custom_sections: current.custom_sections.map((section) =>
                section.id === id ? change(section) : section,
            ),
        });

    const saveSectionText = (field: string, value: string): boolean | null => {
        const match = field.match(
            /^sections\.([a-z0-9]+)\.(title|text|slots\.(\d+)\.caption)$/,
        );

        if (!match) {
            return null;
        }

        const section = current.custom_sections.find(
            (item) => item.id === match[1],
        );
        const slot = match[3] !== undefined ? Number(match[3]) : null;
        const part = slot !== null ? 'caption' : (match[2] as 'title' | 'text');
        const text = clean(value);

        if (!section || (slot !== null && !section.slots[slot])) {
            return false;
        }

        if (tooLong(text, SECTION_TEXT_LIMITS[part])) {
            return false;
        }

        updateSection(section.id, (item) =>
            slot !== null
                ? {
                      ...item,
                      slots: item.slots.map((entry, position) =>
                          position === slot
                              ? { ...entry, caption: text }
                              : entry,
                      ),
                  }
                : { ...item, [part]: text },
        );

        return true;
    };

    const saveText = async (field: string, value: string): Promise<boolean> => {
        const sectionResult = saveSectionText(field, value);

        if (sectionResult !== null) {
            return sectionResult;
        }

        const moment = field.match(/^moments\.(\d+)\.(date|title|caption)$/);

        if (moment) {
            const index = Number(moment[1]);
            const part = moment[2] as keyof typeof MOMENT_TEXT_LIMITS;
            const text = clean(value);

            if (
                !current.moments[index] ||
                tooLong(text, MOMENT_TEXT_LIMITS[part])
            ) {
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

        const text = clean(value);

        if (field === 'title' && text === null) {
            toast.error('Please add a headline.');

            return false;
        }

        if (tooLong(text, PAGE_TEXT_LIMITS[field as TextField])) {
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

    const shrinkAll = async (files: File[]): Promise<File[]> => {
        setProcessing(true);

        try {
            return await Promise.all(files.map(shrinkPhoto));
        } finally {
            setProcessing(false);
        }
    };

    const addPhotos = async (
        files: File[],
        moment?: number,
        slot?: PhotoSlot,
    ) => {
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

        const shrunk = await shrinkAll(files.slice(0, room));
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

        if (slot) {
            updateSection(slot.section, (section) => ({
                ...section,
                slots: section.slots.map((entry, position) =>
                    position === slot.slot
                        ? { ...entry, photo: firstIndex }
                        : entry,
                ),
            }));
        }
    };

    const replacePhoto = async (index: number, file: File) => {
        if (!photoFiles[index]) {
            return;
        }

        const [shrunk] = await shrinkAll([file]);

        storePhotos(
            photoFiles.map((photo, position) =>
                position === index ? shrunk : photo,
            ),
        );
    };

    const addRainPhotos = async (files: File[]) => {
        const room = MAX_RAIN_PHOTOS - rainFiles.length;

        if (room <= 0) {
            toast.error(`Up to ${MAX_RAIN_PHOTOS} photos can rain down.`);

            return;
        }

        if (files.length > room) {
            toast.warning(
                `Only ${room} more ${room === 1 ? 'photo' : 'photos'} can rain down.`,
            );
        }

        storeRainPhotos([
            ...rainFiles,
            ...(await shrinkAll(files.slice(0, room))),
        ]);
    };

    const removeRainPhoto = (index: number) =>
        storeRainPhotos(rainFiles.filter((_, position) => position !== index));

    const sectionActions: SectionActions = {
        add: (type, position) => {
            const flowers = current.custom_sections.find(
                (section) => section.type === 'flowers',
            );

            // The flowers are one paid add-on: adding them again moves them.
            if (type === 'flowers' && flowers) {
                store({
                    ...current,
                    flower_addon: true,
                    custom_sections: current.custom_sections.map((section) =>
                        section.id === flowers.id
                            ? { ...section, position }
                            : section,
                    ),
                });

                return;
            }

            if (current.custom_sections.length >= MAX_CUSTOM_SECTIONS) {
                toast.error(
                    `Your page can have at most ${MAX_CUSTOM_SECTIONS} extra sections.`,
                );

                return;
            }

            store({
                ...current,
                // Picking the flowers adds the add-on, charged at checkout.
                ...(type === 'flowers' ? { flower_addon: true } : {}),
                custom_sections: [
                    ...current.custom_sections,
                    {
                        id: newSectionId(),
                        type,
                        position,
                        title: null,
                        text: null,
                        background: null,
                        slots: emptySlots(SECTION_SLOT_COUNTS[type]),
                    },
                ],
            });
        },
        update: (id, changes, onFinish) => {
            updateSection(id, (section) => {
                const next = { ...section };

                if (changes.type) {
                    next.type = changes.type;

                    if (next.slots.length === 0) {
                        next.slots = emptySlots(
                            SECTION_SLOT_COUNTS[changes.type],
                        );
                    }
                }

                if (
                    changes.background === null ||
                    /^#[0-9a-f]{6}$/i.test(changes.background ?? '')
                ) {
                    next.background = changes.background?.toLowerCase() ?? null;
                }

                if (changes.slot_count !== undefined) {
                    const count = Math.min(
                        MAX_SECTION_SLOTS,
                        Math.max(1, changes.slot_count),
                    );

                    next.slots = [
                        ...next.slots.slice(0, count),
                        ...emptySlots(Math.max(0, count - next.slots.length)),
                    ];
                }

                return next;
            });
            onFinish?.();
        },
        remove: (id) => {
            const removed = current.custom_sections.find(
                (section) => section.id === id,
            );

            store({
                ...current,
                ...(removed?.type === 'flowers' ? { flower_addon: false } : {}),
                custom_sections: current.custom_sections.filter(
                    (section) => section.id !== id,
                ),
            });
        },
    };

    /**
     * Add or remove the flowers on a design that does not include them.
     * Removing them also takes away the spot they were placed in.
     */
    const setFlowerAddon = (isAdded: boolean) => {
        store({
            ...current,
            flower_addon: isAdded,
            custom_sections: isAdded
                ? current.custom_sections
                : current.custom_sections.filter(
                      (section) => section.type !== 'flowers',
                  ),
        });
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
        setRainFiles([]);
    };

    return {
        experience,
        saveText,
        addPhotos,
        replacePhoto,
        addRainPhotos,
        removeRainPhoto,
        sectionActions,
        setFlowerAddon,
        keep,
        reset,
        processing,
        hasChanges:
            content !== null || photoFiles.length > 0 || rainFiles.length > 0,
    };
}
