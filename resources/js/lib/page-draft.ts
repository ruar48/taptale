import { loadPhotoList, savePhotoList } from '@/lib/wizard-draft';
import type {
    DigitalExperience,
    FlowerRain,
    FlowerStyle,
    PhotoRainLayer,
} from '@/types';

/**
 * A memory page someone is shaping on a demo before ordering. Words and
 * choices live in localStorage and photos in IndexedDB, in this browser
 * only: nothing is uploaded until the keychain is ordered. Each design has
 * its own draft, and every access is guarded so blocked storage simply
 * means nothing is kept.
 */

const DRAFT_PREFIX = 'taptale:page-draft:';
const PHOTOS_PREFIX = 'page-photos:';
const DRAFT_VERSION = 1;
const DRAFT_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

/** Longest side, in pixels, of a photo kept in a draft. */
const MAX_PHOTO_SIDE = 2048;

export type PageDraftMoment = {
    date: string | null;
    title: string | null;
    caption: string | null;
    photo: number | null;
};

export type PageDraftContent = {
    title: string;
    subtitle: string | null;
    recipient_name: string | null;
    sender_name: string | null;
    message: string | null;
    quote: string | null;
    flowers_note: string | null;
    event_date: string | null;
    song_title: string | null;
    song_artist: string | null;
    music_url: string | null;
    flower_style: FlowerStyle;
    flower_rain: FlowerRain;
    /** Flowers added to a design without them, charged at checkout. */
    flower_addon: boolean;
    photo_rain_layer: PhotoRainLayer;
    song_ornament: 'none' | 'hearts';
    song_background: 'theme' | 'hearts';
    moments: PageDraftMoment[];
};

export type PageDraft = {
    version: typeof DRAFT_VERSION;
    savedAt: number;
    template: string;
    content: PageDraftContent;
};

/** Text fields a demo visitor can edit, with the longest text each takes. */
export const PAGE_TEXT_LIMITS = {
    title: 120,
    subtitle: 160,
    recipient_name: 80,
    sender_name: 80,
    message: 5000,
    quote: 255,
    flowers_note: 500,
    event_date: 60,
    song_title: 120,
    song_artist: 120,
} as const;

export const MOMENT_TEXT_LIMITS = {
    date: 60,
    title: 80,
    caption: 300,
} as const;

/** Choices a demo visitor can make, with the values each accepts. */
export const PAGE_CHOICES = {
    flower_style: [
        'bouquet',
        'teal',
        'pink',
        'lavender',
        'golden',
        'red',
        'white',
        'blue',
        'peach',
        'mixed',
    ],
    flower_rain: ['none', 'petals', 'photos', 'both'],
    photo_rain_layer: ['front', 'back'],
    song_ornament: ['none', 'hearts'],
    song_background: ['theme', 'hearts'],
} as const;

/**
 * The editable content of a page, starting from what the demo shows.
 */
export function pageContentFrom(
    experience: DigitalExperience,
): PageDraftContent {
    return {
        title: experience.title,
        subtitle: experience.subtitle,
        recipient_name: experience.recipient_name,
        sender_name: experience.sender_name,
        message: experience.message,
        quote: experience.quote,
        flowers_note: experience.flowers_note,
        event_date: experience.event_date,
        song_title: experience.song_title,
        song_artist: experience.song_artist,
        music_url: experience.music_url,
        flower_style: experience.flower_style,
        flower_rain: experience.flower_rain,
        flower_addon: experience.flower_addon,
        photo_rain_layer: experience.photo_rain_layer,
        song_ornament: experience.song_ornament,
        song_background: experience.song_background,
        moments: experience.moments.map((moment) => ({
            date: moment.date,
            title: moment.title,
            caption: moment.caption,
            photo: moment.photo,
        })),
    };
}

export function loadPageDraft(template: string): PageDraft | null {
    if (!template) {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(DRAFT_PREFIX + template);

        if (!raw) {
            return null;
        }

        const draft = JSON.parse(raw) as PageDraft;

        if (
            draft.version !== DRAFT_VERSION ||
            draft.template !== template ||
            Date.now() - draft.savedAt > DRAFT_LIFETIME_MS
        ) {
            clearPageDraft(template);

            return null;
        }

        return draft;
    } catch {
        return null;
    }
}

export function savePageDraft(
    template: string,
    content: PageDraftContent,
): void {
    try {
        window.localStorage.setItem(
            DRAFT_PREFIX + template,
            JSON.stringify({
                version: DRAFT_VERSION,
                savedAt: Date.now(),
                template,
                content,
            } satisfies PageDraft),
        );
    } catch {
        // Storage is full or blocked; the page still works for this visit.
    }
}

export function clearPageDraft(template: string): void {
    try {
        window.localStorage.removeItem(DRAFT_PREFIX + template);
    } catch {
        // Nothing to clear.
    }

    void savePagePhotos(template, []);
}

export function savePagePhotos(
    template: string,
    photos: File[],
): Promise<void> {
    return savePhotoList(PHOTOS_PREFIX + template, photos);
}

export function loadPagePhotos(template: string): Promise<File[]> {
    return loadPhotoList(PHOTOS_PREFIX + template);
}

/**
 * A phone photo scaled down (and turned upright) for keeping in the draft,
 * so a page full of photos stays small enough to upload at checkout. Any
 * photo the browser cannot redraw is kept as it is.
 */
export async function shrinkPhoto(file: File): Promise<File> {
    if (
        typeof createImageBitmap === 'undefined' ||
        typeof document === 'undefined'
    ) {
        return file;
    }

    try {
        const bitmap = await createImageBitmap(file, {
            imageOrientation: 'from-image',
        });
        const scale = Math.min(
            1,
            MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height),
        );

        if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
            bitmap.close();

            return file;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));

        const context = canvas.getContext('2d');

        if (!context) {
            bitmap.close();

            return file;
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', 0.86),
        );

        if (!blob) {
            return file;
        }

        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });
    } catch {
        return file;
    }
}
