import { router } from "@inertiajs/react";
import {
    BookHeart,
    Crown,
    Film,
    Flower2,
    GalleryVerticalEnd,
    Heart,
    Images,
    Layers,
    LayoutGrid,
    Mail,
    Milestone,
    Minus,
    Music,
    Palette,
    PenLine,
    Plus,
    Quote,
    Route,
    Shapes,
    Timer,
    Trash2,
    Video,
    X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ComponentType } from "react";
import { toast } from "sonner";
import ExperienceSectionController from "@/actions/App/Http/Controllers/Account/ExperienceSectionController";
import type { SectionKey } from "@/components/taptale/experience/config";
import {
    ExperienceSection,
    FlowersSection,
    PolaroidConnector,
    ROTATIONS,
} from "@/components/taptale/experience/sections";
import {
    EditableText,
    PhotoFill,
    Polaroid,
    Reveal,
    ScriptHeading,
    SectionShell,
    useExperience,
} from "@/components/taptale/experience/shared";
import type { SectionChanges } from "@/components/taptale/experience/shared";
import { cn } from "@/lib/utils";
import type { ExperienceCustomSection, ExperienceSectionType } from "@/types";

/** Most photo slots one extra section can hold (mirrors the server limit). */
const MAX_SLOTS = 12;

/**
 * The section styles an owner can insert, in the order the picker shows them.
 * Styles with `shared` are the sections of the page designs themselves: they
 * show the page's own words, photos and moments rather than their own.
 */
const SECTION_STYLES: {
    type: ExperienceSectionType;
    label: string;
    description: string;
    titlePlaceholder: string;
    icon: ComponentType<{ className?: string }>;
    shared?: SectionKey;
}[] = [
    {
        type: "timeline",
        label: "Polaroid timeline",
        description: "Polaroids joined by a dashed line, each with a caption.",
        titlePlaceholder: "Our moments together",
        icon: Route,
    },
    {
        type: "film_strip",
        label: "Film strip",
        description: "Your photos on a vintage film roll with a caption.",
        titlePlaceholder: "My favorite person",
        icon: Film,
    },
    {
        type: "scrapbook",
        label: "Scrapbook board",
        description: "Taped photos on a gingham board with a sweet line.",
        titlePlaceholder: "Our little scrapbook",
        icon: BookHeart,
    },
    {
        type: "album",
        label: "Photo album",
        description: "A simple grid that shows off lots of photos.",
        titlePlaceholder: "Our album",
        icon: LayoutGrid,
    },
    {
        type: "note",
        label: "Text note",
        description: "A heading and a short message, no photos.",
        titlePlaceholder: "A little note",
        icon: PenLine,
    },
    {
        type: "story_timeline",
        label: "Story timeline",
        description: "Your moments down a timeline, each with a date and photo.",
        titlePlaceholder: "Every chapter of us",
        icon: Milestone,
        shared: "timeline",
    },
    {
        type: "polaroid_wall",
        label: "Polaroid wall",
        description: "Your moments pinned up as polaroids.",
        titlePlaceholder: "Our favorite moments",
        icon: Layers,
        shared: "polaroid_wall",
    },
    {
        type: "gallery",
        label: "Photo gallery",
        description: "Every photo on your page in one gallery.",
        titlePlaceholder: "Moments I love with you",
        icon: GalleryVerticalEnd,
        shared: "gallery",
    },
    {
        type: "letter",
        label: "Love letter",
        description: "Your message on a sheet of letter paper.",
        titlePlaceholder: "A letter for you",
        icon: Mail,
        shared: "letter_paper",
    },
    {
        type: "quote",
        label: "Quote",
        description: "Your favorite line, big and bold.",
        titlePlaceholder: "Our quote",
        icon: Quote,
        shared: "quote",
    },
    {
        type: "song",
        label: "Our song",
        description: "Your song with its player and lyrics.",
        titlePlaceholder: "Our song",
        icon: Music,
        shared: "song",
    },
    {
        type: "countdown",
        label: "Countdown",
        description: "A live countdown to your date.",
        titlePlaceholder: "Counting down",
        icon: Timer,
        shared: "countdown",
    },
    {
        type: "video",
        label: "Video",
        description: "Your video, played right on the page.",
        titlePlaceholder: "Our video",
        icon: Video,
        shared: "video",
    },
];

function styleFor(type: ExperienceSectionType) {
    return (
        SECTION_STYLES.find((style) => style.type === type) ?? SECTION_STYLES[0]
    );
}

/** Ready-made background colors offered next to the free color picker. */
const BACKGROUND_SWATCHES = [
    "#741219",
    "#b3605e",
    "#f7e2e6",
    "#3b1f2b",
    "#13111b",
    "#f8f3ed",
    "#eef2ea",
    "#1e3346",
];

/**
 * Background, text and accent colors for a custom section color, picking
 * light or dark text so it stays readable on any background.
 */
function backgroundStyle(hex: string): CSSProperties {
    const [red, green, blue] = [1, 3, 5].map(
        (start) => parseInt(hex.slice(start, start + 2), 16) / 255,
    );
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const dark = luminance < 0.55;

    return {
        background: hex,
        color: dark ? "#FFF8F4" : "#2A2530",
        "--x-ink": dark ? "#FFF8F4" : "#2A2530",
        "--x-muted": dark ? "rgb(255 248 244 / 0.75)" : "rgb(42 37 48 / 0.7)",
    } as CSSProperties;
}

function showFirstError(errors: Record<string, string>, fallback: string) {
    toast.error(Object.values(errors)[0] ?? fallback);
}

function paragraphs(text: string | null): string[] {
    return (text ?? "")
        .split(/\n{2,}|\r\n\r\n/)
        .map((part) => part.trim())
        .filter(Boolean);
}

type SlotView = ExperienceCustomSection["slots"][number] & { index: number };

/**
 * A section the owner added themselves, in the style they picked, with
 * their own title, photo slots and optional background color.
 */
export function CustomSection({
    section,
}: {
    section: ExperienceCustomSection;
}) {
    const { editable } = useExperience();
    const [previewBackground, setPreviewBackground] = useState<string | null>(
        null,
    );
    const shared = styleFor(section.type).shared;

    if (section.type === "flowers") {
        return <PlacedFlowers section={section} />;
    }

    // A page design's own section, showing the page's words and photos.
    if (shared) {
        return (
            <div className="relative">
                {editable && (
                    <div className="pt-6">
                        <SectionToolbar
                            section={section}
                            onPreviewBackground={setPreviewBackground}
                        />
                    </div>
                )}
                <ExperienceSection section={shared} />
            </div>
        );
    }

    /*
     * Visitors only see slots that have something in them; the owner sees
     * every slot so they can fill it.
     */
    const slots: SlotView[] = section.slots
        .map((slot, index) => ({ ...slot, index }))
        .filter(
            (slot) =>
                editable ||
                slot.photo_url ||
                (section.type === "timeline" && slot.caption),
        );

    const isEmpty =
        section.type === "note"
            ? !section.title && !section.text
            : slots.length === 0;

    if (isEmpty && !editable) {
        return null;
    }

    const background = previewBackground ?? section.background;

    return (
        <SectionShell
            surface={!background}
            style={background ? backgroundStyle(background) : undefined}
        >
            {editable && (
                <SectionToolbar
                    section={section}
                    onPreviewBackground={setPreviewBackground}
                />
            )}
            <SectionTitle section={section} />
            {section.type === "timeline" && (
                <TimelineBody section={section} slots={slots} />
            )}
            {section.type === "film_strip" && (
                <FilmStripBody section={section} slots={slots} />
            )}
            {section.type === "scrapbook" && (
                <ScrapbookBody section={section} slots={slots} />
            )}
            {section.type === "album" && (
                <AlbumBody section={section} slots={slots} />
            )}
            {section.type === "note" && <NoteBody section={section} />}
        </SectionShell>
    );
}

/**
 * The flowers add-on at the spot the customer chose. Only bought flowers
 * show, and never a second time on the bouquet design.
 */
function PlacedFlowers({ section }: { section: ExperienceCustomSection }) {
    const { experience, preset, sectionActions } = useExperience();

    if (!experience.flower_addon || preset.sections.includes("bouquet")) {
        return null;
    }

    return (
        <FlowersSection
            isAddon
            onRemove={
                sectionActions
                    ? () => sectionActions.remove(section.id)
                    : undefined
            }
        />
    );
}

function SectionTitle({ section }: { section: ExperienceCustomSection }) {
    const { editable } = useExperience();

    if (!editable && !section.title) {
        return null;
    }

    const title = (
        <EditableText
            field={`sections.${section.id}.title`}
            value={section.title}
            placeholder={styleFor(section.type).titlePlaceholder}
            label="Section title"
        />
    );

    return (
        <Reveal className="text-center">
            {section.type === "film_strip" ? (
                <h2 className="font-display text-3xl font-semibold tracking-wide uppercase">
                    {title}
                </h2>
            ) : (
                <ScriptHeading>{title}</ScriptHeading>
            )}
        </Reveal>
    );
}

/** The section's free text (film strip / scrapbook caption line). */
function SectionText({
    section,
    placeholder,
    className,
}: {
    section: ExperienceCustomSection;
    placeholder: string;
    className?: string;
}) {
    return (
        <EditableText
            block
            field={`sections.${section.id}.text`}
            value={section.text}
            placeholder={placeholder}
            label="Caption"
            className={className}
        >
            {section.text}
        </EditableText>
    );
}

function TimelineBody({
    section,
    slots,
}: {
    section: ExperienceCustomSection;
    slots: SlotView[];
}) {
    const { editable } = useExperience();

    return (
        <div className="relative mt-12 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {slots.map((slot, position) => (
                <Reveal key={slot.index} delay={(position % 4) * 100}>
                    <div className="relative">
                        <PolaroidConnector
                            index={position}
                            total={slots.length}
                        />
                        <Polaroid
                            src={slot.photo_url}
                            rotate={ROTATIONS[position % ROTATIONS.length]}
                            slot={{ section: section.id, slot: slot.index }}
                            caption={
                                editable || slot.caption ? (
                                    <EditableText
                                        field={`sections.${section.id}.slots.${slot.index}.caption`}
                                        value={slot.caption}
                                        placeholder="Add a caption"
                                        label="Photo caption"
                                    />
                                ) : null
                            }
                        />
                    </div>
                </Reveal>
            ))}
        </div>
    );
}

function FilmStripBody({
    section,
    slots,
}: {
    section: ExperienceCustomSection;
    slots: SlotView[];
}) {
    const { openPhoto } = useExperience();
    const sprockets =
        "repeating-linear-gradient(90deg, transparent 0 10px, #F5F0E8 10px 22px, transparent 22px 34px)";

    return (
        <>
            <Reveal delay={150}>
                <div className="-mx-5 mt-10 scrollbar-none overflow-x-auto px-5 pb-4">
                    <div className="relative mx-auto w-max -rotate-1 bg-[#141414] px-4 py-7 shadow-[0_24px_50px_-20px_rgb(0_0_0/0.7)]">
                        <div
                            className="absolute inset-x-0 top-2 h-3 opacity-90"
                            style={{
                                backgroundImage: sprockets,
                                backgroundSize: "34px 12px",
                            }}
                        />
                        <div className="flex gap-3">
                            {slots.map((slot, position) => (
                                <div key={slot.index} className="w-44 sm:w-56">
                                    <p className="mb-1 flex justify-between font-mono text-[9px] tracking-widest text-[#E8A33D]">
                                        <span>TAPTALE 400</span>
                                        <span>{position + 1}A</span>
                                    </p>
                                    <PhotoFill
                                        src={slot.photo_url}
                                        className="aspect-[4/3] w-full"
                                        slot={{
                                            section: section.id,
                                            slot: slot.index,
                                        }}
                                        onClick={
                                            slot.photo_url
                                                ? () =>
                                                      openPhoto(
                                                          slot.photo_url ?? "",
                                                      )
                                                : undefined
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                        <div
                            className="absolute inset-x-0 bottom-2 h-3 opacity-90"
                            style={{
                                backgroundImage: sprockets,
                                backgroundSize: "34px 12px",
                            }}
                        />
                    </div>
                </div>
            </Reveal>
            <Reveal className="mt-6 text-center">
                <SectionText
                    section={section}
                    placeholder="Add a caption under the film"
                    className="font-display text-2xl font-semibold uppercase"
                />
            </Reveal>
        </>
    );
}

function ScrapbookBody({
    section,
    slots,
}: {
    section: ExperienceCustomSection;
    slots: SlotView[];
}) {
    return (
        <Reveal className="mt-10">
            <div
                className="relative mx-auto max-w-3xl rotate-1 rounded-[2rem] p-6 shadow-[0_30px_60px_-24px_rgb(0_0_0/0.6)] sm:p-10"
                style={{
                    backgroundColor: "#FBE3E6",
                    backgroundImage:
                        "linear-gradient(90deg, rgb(208 74 107 / 0.18) 50%, transparent 50%), linear-gradient(rgb(208 74 107 / 0.18) 50%, transparent 50%)",
                    backgroundSize: "36px 36px",
                }}
            >
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                    {slots.map((slot, position) => (
                        <Polaroid
                            key={slot.index}
                            src={slot.photo_url}
                            rotate={
                                ROTATIONS[(position + 3) % ROTATIONS.length]
                            }
                            tape={position % 2 === 0}
                            slot={{ section: section.id, slot: slot.index }}
                        />
                    ))}
                </div>
                <SectionText
                    section={section}
                    placeholder="Add a sweet line"
                    className="mt-8 text-center font-script text-4xl text-[#8B1A22]"
                />
            </div>
        </Reveal>
    );
}

const ALBUM_ASPECTS = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]"];

function AlbumBody({
    section,
    slots,
}: {
    section: ExperienceCustomSection;
    slots: SlotView[];
}) {
    const { openPhoto } = useExperience();

    return (
        <div className="mt-10 columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
            {slots.map((slot, position) => (
                <Reveal
                    key={slot.index}
                    delay={(position % 3) * 100}
                    className="break-inside-avoid"
                >
                    <PhotoFill
                        src={slot.photo_url}
                        className={cn(
                            "w-full rounded-2xl shadow-lg",
                            ALBUM_ASPECTS[position % ALBUM_ASPECTS.length],
                        )}
                        slot={{ section: section.id, slot: slot.index }}
                        onClick={
                            slot.photo_url
                                ? () => openPhoto(slot.photo_url ?? "")
                                : undefined
                        }
                    />
                </Reveal>
            ))}
        </div>
    );
}

function NoteBody({ section }: { section: ExperienceCustomSection }) {
    return (
        <Reveal delay={150} className="mx-auto mt-6 max-w-2xl text-center">
            <Heart
                className="mx-auto size-5 text-[var(--x-accent)]"
                fill="currentColor"
                aria-hidden
            />
            <EditableText
                block
                multiline
                field={`sections.${section.id}.text`}
                value={section.text}
                placeholder="Tap to write your message"
                label="Your message"
                className="mt-5 space-y-4 text-lg leading-relaxed text-[var(--x-muted)]"
            >
                {paragraphs(section.text).map((part, index) => (
                    <p key={index} className="whitespace-pre-line">
                        {part}
                    </p>
                ))}
            </EditableText>
        </Reveal>
    );
}

/**
 * Owner-only controls for an extra section: style, background color,
 * number of photo slots, and removing the section.
 */
function SectionToolbar({
    section,
    onPreviewBackground,
}: {
    section: ExperienceCustomSection;
    onPreviewBackground: (color: string | null) => void;
}) {
    const { experience, sectionActions } = useExperience();
    const colorInput = useRef<HTMLInputElement>(null);
    const url = ExperienceSectionController.update.url({
        experience: experience.code,
        section: section.id,
    });

    const save = (data: SectionChanges) =>
        sectionActions
            ? sectionActions.update(section.id, data, () =>
                  onPreviewBackground(null),
              )
            : router.patch(url, data, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => onPreviewBackground(null),
            onError: (errors) =>
                showFirstError(errors, "Your change could not be saved."),
        });

    /*
     * The color picker fires "input" while dragging (preview only) and
     * "change" once a color is chosen (saved).
     */
    useEffect(() => {
        const input = colorInput.current;

        if (!input) {
            return;
        }

        const commit = () => save({ background: input.value });
        input.addEventListener("change", commit);

        return () => input.removeEventListener("change", commit);
    });

    const remove = () => {
        if (
            !window.confirm(
                "Remove this section? Its photos stay on your page.",
            )
        ) {
            return;
        }

        if (sectionActions) {
            sectionActions.remove(section.id);

            return;
        }

        router.delete(
            ExperienceSectionController.destroy.url({
                experience: experience.code,
                section: section.id,
            }),
            {
                preserveScroll: true,
                preserveState: true,
                onError: (errors) =>
                    showFirstError(errors, "The section could not be removed."),
            },
        );
    };

    const count = section.slots.length;
    // A page design's own section keeps the page's look and photos.
    const isShared = Boolean(styleFor(section.type).shared);

    return (
        <div className="relative z-20 mx-auto mb-8 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl bg-white/95 px-4 py-2.5 font-sans text-sm text-[#3A2A30] shadow-lg">
            <label className="flex items-center gap-1.5">
                <Shapes className="size-4 text-[#B23A62]" aria-hidden />
                <span className="sr-only">Section style</span>
                <select
                    value={section.type}
                    onChange={(event) =>
                        save({
                            type: event.target.value as ExperienceSectionType,
                        })
                    }
                    className="rounded-full border border-[#E4D8CE] bg-white py-1 pr-7 pl-2.5 text-xs font-medium"
                >
                    {SECTION_STYLES.map((style) => (
                        <option key={style.type} value={style.type}>
                            {style.label}
                        </option>
                    ))}
                </select>
            </label>

            {isShared ? (
                <span className="text-xs text-[#776D75]">
                    Shows what is already on your page
                </span>
            ) : (
            <div className="flex flex-wrap items-center gap-1.5">
                <Palette className="size-4 text-[#B23A62]" aria-hidden />
                <span className="sr-only">Background color</span>
                <button
                    type="button"
                    onClick={() => save({ background: null })}
                    className={cn(
                        "rounded-full border px-2 py-0.5 text-xs font-medium",
                        section.background === null
                            ? "border-[#B23A62] text-[#B23A62]"
                            : "border-[#E4D8CE]",
                    )}
                >
                    Theme
                </button>
                {BACKGROUND_SWATCHES.map((color) => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => save({ background: color })}
                        className={cn(
                            "size-6 rounded-full border border-black/10 transition hover:scale-110",
                            section.background === color &&
                                "ring-2 ring-[#B23A62] ring-offset-2",
                        )}
                        style={{ background: color }}
                        aria-label={`Use background ${color}`}
                    />
                ))}
                <label
                    className="relative size-6 cursor-pointer overflow-hidden rounded-full border border-black/10"
                    style={{
                        background:
                            "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                    }}
                    title="Pick any color"
                >
                    <input
                        ref={colorInput}
                        type="color"
                        defaultValue={section.background ?? "#741219"}
                        onChange={(event) =>
                            onPreviewBackground(event.target.value)
                        }
                        className="absolute inset-0 cursor-pointer opacity-0"
                        aria-label="Pick any background color"
                    />
                </label>
            </div>
            )}

            {!isShared && section.type !== "note" && (
                <div className="flex items-center gap-1.5">
                    <Images className="size-4 text-[#B23A62]" aria-hidden />
                    <button
                        type="button"
                        onClick={() => save({ slot_count: count - 1 })}
                        disabled={count <= 1}
                        className="flex size-7 items-center justify-center rounded-full border border-[#E4D8CE] hover:bg-black/5 disabled:opacity-40"
                        aria-label="Remove a photo slot"
                    >
                        <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-14 text-center text-xs font-medium">
                        {count} {count === 1 ? "photo" : "photos"}
                    </span>
                    <button
                        type="button"
                        onClick={() => save({ slot_count: count + 1 })}
                        disabled={count >= MAX_SLOTS}
                        className="flex size-7 items-center justify-center rounded-full border border-[#E4D8CE] hover:bg-black/5 disabled:opacity-40"
                        aria-label="Add a photo slot"
                    >
                        <Plus className="size-3.5" />
                    </button>
                </div>
            )}

            <button
                type="button"
                onClick={remove}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-[#B23A62] hover:bg-[#B23A62]/10"
            >
                <Trash2 className="size-3.5" /> Remove
            </button>
        </div>
    );
}

/** How the premium flowers show in the section picker, if they can be added. */
export type FlowersOption = { badge: string; description: string } | null;

/**
 * Button between sections for whoever edits the page. It opens a picker of
 * section styles and inserts the chosen one at that spot.
 */
export function AddSectionButton({
    position,
    flowers = null,
}: {
    position: number;
    flowers?: FlowersOption;
}) {
    const { experience, sectionActions } = useExperience();
    const [picking, setPicking] = useState(false);
    const [adding, setAdding] = useState(false);

    const add = (type: ExperienceSectionType) => {
        if (sectionActions) {
            sectionActions.add(type, position);
            setPicking(false);

            return;
        }

        router.post(
            ExperienceSectionController.store.url(experience.code),
            { position, type },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setAdding(true),
                onSuccess: () => setPicking(false),
                onFinish: () => setAdding(false),
                onError: (errors) =>
                    showFirstError(errors, "The section could not be added."),
            },
        );
    };

    return (
        <div className="relative z-10 flex justify-center py-3">
            <button
                type="button"
                onClick={() => setPicking(true)}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-current/40 px-4 py-1.5 font-sans text-xs font-semibold opacity-70 transition hover:border-current/70 hover:opacity-100"
            >
                <Plus className="size-3.5" />
                Add a section here
            </button>

            {picking && (
                <SectionPicker
                    adding={adding}
                    flowers={flowers}
                    onPick={add}
                    onClose={() => !adding && setPicking(false)}
                />
            )}
        </div>
    );
}

function SectionPicker({
    adding,
    flowers,
    onPick,
    onClose,
}: {
    adding: boolean;
    flowers: FlowersOption;
    onPick: (type: ExperienceSectionType) => void;
    onClose: () => void;
}) {
    return (
        <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6"
            onClick={onClose}
        >
            <div
                className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 text-left font-sans text-[#343039] shadow-2xl sm:rounded-3xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-label="Choose a section style"
            >
                <div className="flex items-center justify-between">
                    <p className="text-base font-semibold">
                        Choose a section style
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1.5 hover:bg-black/5"
                        aria-label="Close"
                    >
                        <X className="size-4" />
                    </button>
                </div>
                <p className="mt-1 text-sm text-[#776D75]">
                    You can change the style, colors and number of photos
                    afterwards.
                </p>
                {flowers && (
                    <button
                        type="button"
                        disabled={adding}
                        onClick={() => onPick("flowers")}
                        className="mt-4 flex w-full items-start gap-3 rounded-2xl border-2 border-[#E9B949] bg-gradient-to-br from-[#FFF8E6] to-[#FDEBEF] p-3 text-left transition hover:border-[#D9A21E] disabled:opacity-50"
                    >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#B23A62] text-white">
                            <Flower2 className="size-4" />
                        </span>
                        <span className="flex-1">
                            <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                                Blooming flowers
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#E9B949] px-2 py-0.5 text-[11px] font-bold text-[#4A3203]">
                                    <Crown className="size-3" />
                                    {flowers.badge}
                                </span>
                            </span>
                            <span className="mt-0.5 block text-xs text-[#776D75]">
                                {flowers.description}
                            </span>
                        </span>
                    </button>
                )}
                {[
                    {
                        heading: "With its own photos",
                        styles: SECTION_STYLES.filter((style) => !style.shared),
                    },
                    {
                        heading:
                            "From the page designs, using your page's words, moments and photos",
                        styles: SECTION_STYLES.filter((style) => style.shared),
                    },
                ].map((group) => (
                    <div key={group.heading} className="mt-4">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-[#776D75] uppercase">
                            {group.heading}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {group.styles.map((style) => (
                                <button
                                    key={style.type}
                                    type="button"
                                    disabled={adding}
                                    onClick={() => onPick(style.type)}
                                    className="flex items-start gap-3 rounded-2xl border border-[#E4D8CE] p-3 text-left transition hover:border-[#B86F83] hover:bg-[#FBF3EE] disabled:opacity-50"
                                >
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FBE3E6] text-[#B23A62]">
                                        <style.icon className="size-4" />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold">
                                            {style.label}
                                        </span>
                                        <span className="mt-0.5 block text-xs text-[#776D75]">
                                            {style.description}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
