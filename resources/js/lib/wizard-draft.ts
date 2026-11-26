/**
 * Keeps a gift that is being crafted in this browser, so it survives a
 * refresh, logging in, a password reset or simply
 * coming back later. Choices live in localStorage and photos in IndexedDB,
 * which can store real files. Every access is guarded: private windows and
 * blocked storage simply mean nothing is saved.
 */

const DRAFT_KEY = 'taptale:wizard-draft';
const DRAFT_VERSION = 1;
const DRAFT_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;

const DB_NAME = 'taptale';
const PHOTO_STORE = 'wizard-photos';
const PHOTOS_KEY = 'photos';

export type WizardDraft<T> = {
    version: typeof DRAFT_VERSION;
    savedAt: number;
    /** The account that made the draft, or null for a guest. */
    ownerId: number | null;
    productSlug: string;
    productName: string;
    categorySlug: string | null;
    step: number;
    furthest: number;
    customDesign: boolean;
    data: T;
};

export function loadDraft<T>(): WizardDraft<T> | null {
    try {
        const raw = window.localStorage.getItem(DRAFT_KEY);

        if (!raw) {
            return null;
        }

        const draft = JSON.parse(raw) as WizardDraft<T>;

        if (
            draft.version !== DRAFT_VERSION ||
            Date.now() - draft.savedAt > DRAFT_LIFETIME_MS
        ) {
            clearDraft();

            return null;
        }

        return draft;
    } catch {
        return null;
    }
}

export function saveDraft<T>(
    draft: Omit<WizardDraft<T>, 'version' | 'savedAt'>,
): void {
    try {
        window.localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({
                ...draft,
                version: DRAFT_VERSION,
                savedAt: Date.now(),
            }),
        );
    } catch {
        // Storage is full or blocked; the wizard still works without a draft.
    }
}

export function clearDraft(): void {
    try {
        window.localStorage.removeItem(DRAFT_KEY);
    } catch {
        // Nothing to clear.
    }

    void savePhotos([]);
}

/**
 * Whether the signed-in visitor may resume this draft. A guest's draft can
 * be picked up by whoever signs in; an account's draft only by that account.
 */
export function canResume(
    draft: WizardDraft<unknown>,
    userId: number | null,
): boolean {
    return draft.ownerId === null || draft.ownerId === userId;
}

function openPhotoStore(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
            request.result.createObjectStore(PHOTO_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function savePhotos(photos: File[]): Promise<void> {
    return savePhotoList(PHOTOS_KEY, photos);
}

export function loadPhotos(): Promise<File[]> {
    return loadPhotoList(PHOTOS_KEY);
}

/**
 * Keep a list of photos in this browser under a key. The wizard keeps its
 * photos under one key; memory pages drafted on a demo use their own.
 */
export async function savePhotoList(
    key: string,
    photos: File[],
): Promise<void> {
    try {
        const db = await openPhotoStore();

        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(PHOTO_STORE, 'readwrite');
            transaction.objectStore(PHOTO_STORE).put(photos, key);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });

        db.close();
    } catch {
        // Photos are a convenience; the customer can add them again.
    }
}

export async function loadPhotoList(key: string): Promise<File[]> {
    try {
        const db = await openPhotoStore();

        const photos = await new Promise<unknown>((resolve, reject) => {
            const request = db
                .transaction(PHOTO_STORE, 'readonly')
                .objectStore(PHOTO_STORE)
                .get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        db.close();

        return Array.isArray(photos)
            ? photos.filter((photo): photo is File => photo instanceof File)
            : [];
    } catch {
        return [];
    }
}
