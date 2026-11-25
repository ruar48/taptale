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
 * Gives every frame of the page design's sections its own photo, so one
 * photo never fills the first frame of every section. A frame the owner put
 * a photo in keeps it. The other frames, in page order, take the photos
 * that have no place yet (not in a frame, a moment or an extra section):
 * first every section's minimum frames, then the sections that can grow.
 */
export function layoutPhotoFrames({
    sections,
    photoCount,
    chosen,
    placed,
}: {
    /** The page's sections with photo frames, in page order. */
    sections: PhotoFrameSection[];
    photoCount: number;
    /** The photo the owner put in each frame. */
    chosen: Partial<Record<string, (number | null)[]>>;
    /** Photos already shown in a moment or an extra section. */
    placed: (number | null)[];
}): FrameLayout {
    const order = [...new Set(sections)];
    const isPhoto = (photo: number | null | undefined): photo is number =>
        typeof photo === 'number' && photo >= 0 && photo < photoCount;
    const chosenFor = (section: PhotoFrameSection) =>
        (chosen[section] ?? []).slice(0, PHOTO_FRAME_COUNTS[section].max);

    const taken = new Set(placed.filter(isPhoto));
    order.forEach((section) =>
        chosenFor(section)
            .filter(isPhoto)
            .forEach((photo) => taken.add(photo)),
    );

    const spare = Array.from(
        { length: photoCount },
        (_, index) => index,
    ).filter((photo) => !taken.has(photo));
    const layout: FrameLayout = {};

    const fill = (section: PhotoFrameSection, from: number, to: number) => {
        const frames = (layout[section] ??= []);

        for (let index = from; index < to; index++) {
            const photo = chosenFor(section)[index];
            frames[index] = isPhoto(photo) ? photo : (spare.shift() ?? null);
        }
    };

    order.forEach((section) =>
        fill(section, 0, PHOTO_FRAME_COUNTS[section].min),
    );
    order.forEach((section) =>
        fill(
            section,
            PHOTO_FRAME_COUNTS[section].min,
            PHOTO_FRAME_COUNTS[section].max,
        ),
    );

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
