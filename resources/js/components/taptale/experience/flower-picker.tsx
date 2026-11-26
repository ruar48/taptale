import { Check, Flower2, ImagePlus, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
    FLOWER_RAINS,
    FLOWER_STYLES,
} from '@/components/taptale/experience/config';
import { useExperience } from '@/components/taptale/experience/shared';
import { MAX_RAIN_PHOTOS } from '@/lib/page-draft';
import { cn } from '@/lib/utils';
import type { PhotoRainLayer, PhotoRainSource } from '@/types';

const PHOTO_LAYERS: { value: PhotoRainLayer; label: string }[] = [
    { value: 'front', label: 'In front' },
    { value: 'back', label: 'Behind flowers' },
];

const PHOTO_SOURCES: { value: PhotoRainSource; label: string }[] = [
    { value: 'all', label: 'All my photos' },
    { value: 'picked', label: 'Only ones I add' },
];

function Choice({
    selected,
    disabled,
    onClick,
    children,
}: {
    selected: boolean;
    disabled: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60',
                selected
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white',
            )}
        >
            {children}
        </button>
    );
}

/**
 * Lets whoever is editing the page (the owner, or a visitor shaping a demo)
 * pick the flowers and what rains over them. Each choice saves like any
 * other inline edit, so the page changes straight away.
 */
export function FlowerPicker({ onRemove }: { onRemove?: () => void }) {
    const { experience, saveText, uploading, addRainPhotos, removeRainPhoto } =
        useExperience();
    const rainPhotos = experience.rain_photos ?? [];
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const rain = experience.flower_rain ?? 'none';
    const hasPhotoRain = rain === 'photos' || rain === 'both';
    const rainSource = experience.photo_rain_source ?? 'all';

    const choose = async (field: string, value: string, current: string) => {
        if (value === current || saving) {
            return;
        }

        setSaving(field);
        await saveText(field, value);
        setSaving(null);
    };

    return (
        <div className="absolute top-4 left-4 z-30 max-w-[calc(100%-2rem)] text-left text-white">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/60 px-4 py-2 text-xs font-semibold tracking-wide shadow-lg backdrop-blur transition hover:bg-black/75"
            >
                {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    <Flower2 className="size-4" />
                )}
                Flowers & rain
            </button>

            {open && (
                <div className="mt-2 w-80 max-w-full space-y-4 rounded-3xl border border-white/15 bg-black/80 p-4 shadow-2xl backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">
                            Make the flowers yours
                        </p>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
                            aria-label="Close flower options"
                        >
                            <X className="size-4" />
                        </button>
                    </div>

                    <div>
                        <p className="mb-2 text-xs tracking-wide text-white/60 uppercase">
                            Flowers
                        </p>
                        <div
                            className="grid grid-cols-5 gap-2"
                            role="radiogroup"
                            aria-label="Flowers"
                        >
                            {FLOWER_STYLES.map((style) => {
                                const selected =
                                    experience.flower_style === style.value;

                                return (
                                    <button
                                        key={style.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        disabled={saving !== null}
                                        onClick={() =>
                                            choose(
                                                'flower_style',
                                                style.value,
                                                experience.flower_style,
                                            )
                                        }
                                        className="group flex flex-col items-center gap-1 disabled:opacity-60"
                                    >
                                        <span
                                            className={cn(
                                                'relative flex size-10 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-black transition',
                                                selected
                                                    ? 'ring-white'
                                                    : 'ring-transparent group-hover:ring-white/40',
                                            )}
                                            style={{ background: style.swatch }}
                                        >
                                            {selected && (
                                                <Check
                                                    className="size-4 text-black/70"
                                                    strokeWidth={3}
                                                />
                                            )}
                                        </span>
                                        <span className="text-[10px] text-white/80">
                                            {style.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <p className="mb-2 text-xs tracking-wide text-white/60 uppercase">
                            Raining down
                        </p>
                        <div
                            className="flex flex-wrap gap-2"
                            role="radiogroup"
                            aria-label="Raining down"
                        >
                            {FLOWER_RAINS.map((option) => (
                                <Choice
                                    key={option.value}
                                    selected={rain === option.value}
                                    disabled={saving !== null}
                                    onClick={() =>
                                        choose(
                                            'flower_rain',
                                            option.value,
                                            rain,
                                        )
                                    }
                                >
                                    {option.label}
                                </Choice>
                            ))}
                        </div>
                    </div>

                    {hasPhotoRain && (
                        <div>
                            <p className="mb-2 text-xs tracking-wide text-white/60 uppercase">
                                Falling photos
                            </p>
                            <div
                                className="flex flex-wrap gap-2"
                                role="radiogroup"
                                aria-label="Falling photos"
                            >
                                {PHOTO_LAYERS.map((option) => (
                                    <Choice
                                        key={option.value}
                                        selected={
                                            experience.photo_rain_layer ===
                                            option.value
                                        }
                                        disabled={saving !== null}
                                        onClick={() =>
                                            choose(
                                                'photo_rain_layer',
                                                option.value,
                                                experience.photo_rain_layer,
                                            )
                                        }
                                    >
                                        {option.label}
                                    </Choice>
                                ))}
                            </div>
                            <p className="mt-4 mb-2 text-xs tracking-wide text-white/60 uppercase">
                                Photos that fall
                            </p>
                            <div
                                className="flex flex-wrap gap-2"
                                role="radiogroup"
                                aria-label="Photos that fall"
                            >
                                {PHOTO_SOURCES.map((option) => (
                                    <Choice
                                        key={option.value}
                                        selected={rainSource === option.value}
                                        disabled={saving !== null}
                                        onClick={() =>
                                            choose(
                                                'photo_rain_source',
                                                option.value,
                                                rainSource,
                                            )
                                        }
                                    >
                                        {option.label}
                                    </Choice>
                                ))}
                            </div>
                            <p className="mt-3 text-xs text-white/60">
                                {rainSource === 'all'
                                    ? 'Your page photos rain down. Add more photos just for the rain here.'
                                    : rainPhotos.length > 0
                                      ? `These ${rainPhotos.length} photos rain down in a random order.`
                                      : 'Pick the photos that rain down. Only these photos fall.'}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {rainPhotos.map((photo) => (
                                    <span
                                        key={photo.url}
                                        className="relative size-12 overflow-hidden rounded-lg ring-1 ring-white/20"
                                    >
                                        <img
                                            src={photo.url}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                        {removeRainPhoto && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeRainPhoto(photo.index)
                                                }
                                                className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white hover:bg-black"
                                                aria-label="Take this photo out of the rain"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        )}
                                    </span>
                                ))}
                                {addRainPhotos &&
                                    rainPhotos.length < MAX_RAIN_PHOTOS && (
                                        <label
                                            className={cn(
                                                'flex size-12 cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/40 text-white/80 transition hover:bg-white/10',
                                                uploading &&
                                                    'pointer-events-none opacity-60',
                                            )}
                                            title="Add photos to the rain"
                                        >
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                multiple
                                                className="sr-only"
                                                disabled={uploading}
                                                onChange={(event) => {
                                                    const files = Array.from(
                                                        event.target.files ??
                                                            [],
                                                    );

                                                    if (files.length > 0) {
                                                        addRainPhotos(files);
                                                    }

                                                    event.target.value = '';
                                                }}
                                                aria-label="Add photos to the rain"
                                            />
                                            {uploading ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                <ImagePlus className="size-4" />
                                            )}
                                        </label>
                                    )}
                            </div>
                        </div>
                    )}

                    {onRemove && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="text-xs text-white/70 underline underline-offset-2 hover:text-white"
                        >
                            Remove the flowers from this page
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
