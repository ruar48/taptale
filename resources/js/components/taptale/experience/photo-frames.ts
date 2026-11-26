import type { SectionKey } from '@/components/taptale/experience/config';

/** Sections of the page designs that have their own photo frames. */
export type PhotoFrameSection =
    | 'hero_photo'
    | 'note'
    | 'letter_card'
    | 'letter_paper'
    | 'player'
    | 'film_strip'
    | 'scrapbook'
    | 'polaroid_wall';

/** One frame of a page design section, e.g. the second film strip frame. */
export type PhotoFrame = { section: PhotoFrameSection; index: number };

/**
 * How many frames each section always shows, and how many it can grow to
 * with spare photos (`max` mirrors DigitalExperience::PHOTO_FRAMES).
 */
export const PHOTO_FRAME_COUNTS: Record<
    PhotoFrameSection,
    { min: number; max: number }
> = {
    hero_photo: { min: 1, max: 1 },
    note: { min: 1, max: 1 },
    letter_card: { min: 2, max: 2 },
    letter_paper: { min: 1, max: 1 },
    player: { min: 1, max: 1 },
    film_strip: { min: 3, max: 6 },
    scrapbook: { min: 4, max: 6 },
    polaroid_wall: { min: 4, max: 12 },
};

export function isPhotoFrameSection(
    section: SectionKey,
): section is PhotoFrameSection {
    return section in PHOTO_FRAME_COUNTS;
}

/** The photo (its position in the page's photo list) in each frame; null is an empty frame. */
export type FrameLayout = Partial<Record<PhotoFrameSection, (number | null)[]>>;

/**
 * Shows in every frame of the page design's sections only the photo the
 * owner put there. A photo added somewhere else (another frame, the album,
 * a moment or an extra section) never fills a frame on its own, so empty
 * frames stay empty until someone adds a picture to them.
 */
export function layoutPhotoFrames({
    sections,
    photoCount,
    chosen,
}: {
    /** The page's sections with photo frames, in page order. */
    sections: PhotoFrameSection[];
    photoCount: number;
    /** The photo the owner put in each frame. */
    chosen: Partial<Record<string, (number | null)[]>>;
}): FrameLayout {
    const order = [...new Set(sections)];
    const isPhoto = (photo: number | null | undefined): photo is number =>
        typeof photo === 'number' && photo >= 0 && photo < photoCount;
    const layout: FrameLayout = {};

    order.forEach((section) => {
        const chosenFrames = chosen[section] ?? [];

        layout[section] = Array.from(
            { length: PHOTO_FRAME_COUNTS[section].max },
            (_, index) => {
                const photo = chosenFrames[index];

                return isPhoto(photo) ? photo : null;
            },
        );
    });

    // Frames past the minimum show only when they, or a later frame, have a photo.
    order.forEach((section) => {
        const frames = layout[section] ?? [];
        let count = frames.length;

        while (
            count > PHOTO_FRAME_COUNTS[section].min &&
            frames[count - 1] === null
        ) {
            count--;
        }

        layout[section] = frames.slice(0, count);
    });

    return layout;
}
