import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import {
    Check,
    Download,
    ExternalLink,
    ImageOff,
    Loader2,
    MessageCircleHeart,
    Monitor,
    Music,
    Nfc,
    Plus,
    Smartphone,
    Trash2,
    Undo2,
} from 'lucide-react';
import ExperienceController from '@/actions/App/Http/Controllers/Account/ExperienceController';
import InputError from '@/components/input-error';
import {
    EXPERIENCE_THEMES,
    presetFor,
    themeFor,
    themeStyle,
} from '@/components/taptale/experience/config';
import { FileDropzone } from '@/components/taptale/file-dropzone';
import { Panel } from '@/components/taptale/order-parts';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { edit } from '@/routes/account/experiences';
import {
    index as ordersIndex,
    show as orderShow,
} from '@/routes/account/orders';
import { demo } from '@/routes/experiences';
import type {
    DigitalExperience,
    ExperienceTemplateKey,
    ExperienceTemplateOption,
} from '@/types';

type Props = {
    experience: DigitalExperience;
    order: { reference: string; product_name: string };
    templates: ExperienceTemplateOption[];
    themes: string[];
    maxPhotos: number;
    maxMoments: number;
    maxUploadKilobytes: number;
    isTemplateLocked: boolean;
    stats: {
        views: number;
        hearts: number;
        views_this_week: number;
        recent_views: { id: number; device: string; created_at: string }[];
    };
    replies: {
        id: number;
        name: string | null;
        message: string;
        created_at: string;
    }[];
};

/**
 * A stored ISO timestamp as the value of a datetime-local input, in the
 * visitor's own time zone.
 */
function toLocalInput(iso: string | null): string {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);

    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
}

const formatWhen = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

type MomentInput = {
    date: string;
    title: string;
    caption: string;
    photo: number | null;
};

type ExperienceForm = {
    _method: 'put';
    template: ExperienceTemplateKey;
    theme: string;
    title: string;
    subtitle: string;
    recipient_name: string;
    sender_name: string;
    message: string;
    quote: string;
    flowers_note: string;
    event_date: string;
    video_url: string;
    music_url: string;
    song_title: string;
    song_artist: string;
    is_published: boolean;
    unlocks_at: string;
    moments: MomentInput[];
    new_photos: File[];
    remove_photos: number[];
    audio: File | null;
    remove_audio: boolean;
};

export default function EditExperience({
    experience,
    order,
    templates,
    themes,
    maxPhotos,
    maxMoments,
    maxUploadKilobytes,
    isTemplateLocked,
    stats,
    replies,
}: Props) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'My orders', href: ordersIndex() },
            { title: order.reference, href: orderShow(order.reference) },
            { title: 'Memory page', href: edit(experience.code) },
        ],
    });

    const form = useForm<ExperienceForm>({
        _method: 'put',
        template: experience.template,
        theme: experience.theme,
        title: experience.title,
        subtitle: experience.subtitle ?? '',
        recipient_name: experience.recipient_name ?? '',
        sender_name: experience.sender_name ?? '',
        message: experience.message ?? '',
        quote: experience.quote ?? '',
        flowers_note: experience.flowers_note ?? '',
        event_date: experience.event_date ?? '',
        video_url: experience.video_url ?? '',
        music_url: experience.music_url ?? '',
        song_title: experience.song_title ?? '',
        song_artist: experience.song_artist ?? '',
        is_published: experience.is_published,
        unlocks_at: toLocalInput(experience.unlocks_at),
        moments: experience.moments.map((moment) => ({
            date: moment.date ?? '',
            title: moment.title ?? '',
            caption: moment.caption ?? '',
            photo: moment.photo,
        })),
        new_photos: [],
        remove_photos: [],
        audio: null,
        remove_audio: false,
    });

    const { data, setData, errors } = form;
    const preset = presetFor(data.template);
    const usesMoments = preset.sections.some(
        (section) => section === 'timeline' || section === 'polaroid_wall',
    );
    const usesGifts = preset.sections.includes('gifts');
    const usesCountdown = preset.sections.includes('countdown');
    const keptPhotos = experience.photos.filter(
        (photo) => !data.remove_photos.includes(photo.index),
    );
    const photoError = Object.entries(errors).find(([key]) =>
        key.startsWith('new_photos'),
    )?.[1];
    const momentError = Object.entries(errors).find(([key]) =>
        key.startsWith('moments'),
    )?.[1];

    const toggleRemove = (index: number) =>
        setData(
            'remove_photos',
            data.remove_photos.includes(index)
                ? data.remove_photos.filter((value) => value !== index)
                : [...data.remove_photos, index],
        );

    const updateMoment = (position: number, changes: Partial<MomentInput>) =>
        setData(
            'moments',
            data.moments.map((moment, index) =>
                index === position ? { ...moment, ...changes } : moment,
            ),
        );

    const chooseTemplate = (option: ExperienceTemplateOption) =>
        setData((current) => ({
            ...current,
            template: option.value,
            theme: option.theme,
        }));

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.transform((values) => ({
            ...values,
            unlocks_at: values.unlocks_at
                ? new Date(values.unlocks_at).toISOString()
                : '',
            moments: values.moments.map((moment) => ({
                ...moment,
                photo: moment.photo ?? '',
            })),
        }));
        form.post(ExperienceController.update.url(experience.code), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () =>
                form.setData((current) => ({
                    ...current,
                    new_photos: [],
                    remove_photos: [],
                    audio: null,
                    remove_audio: false,
                })),
        });
    };

    return (
        <>
            <Head title="My Memory Page" />
            <form
                className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6"
                onSubmit={submit}
            >
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="flex items-center gap-2 text-sm text-rose">
                            <Nfc className="size-4" /> {order.product_name}
                        </p>
                        <h1 className="mt-1 font-display text-3xl font-medium">
                            Your memory page
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            This little website opens when someone taps your
                            keepsake or scans its QR code. A copied link
                            won&apos;t open it for anyone else.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="rounded-full">
                        <a
                            href={experience.public_url ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <ExternalLink className="size-4" />{' '}
                            {experience.is_published
                                ? 'View live page'
                                : 'Preview page'}
                        </a>
                    </Button>
                </header>

                <Panel
                    title="1. Choose a design"
                    description={
                        isTemplateLocked
                            ? 'Your keepsake has been released, so its design is set. You can still change the color theme and everything on the page.'
                            : 'Switch anytime until your keepsake ships — your words and photos carry over. Open a demo to see each design in action.'
                    }
                >
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                        {templates.map((option) => {
                            const selected = data.template === option.value;

                            return (
                                <div
                                    key={option.value}
                                    className={cn(
                                        'overflow-hidden rounded-2xl border-2 transition',
                                        selected
                                            ? 'border-rose shadow-md'
                                            : 'border-transparent hover:border-rose/40',
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => chooseTemplate(option)}
                                        disabled={isTemplateLocked && !selected}
                                        className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <div
                                            className="relative flex h-24 items-center justify-center px-2 text-center"
                                            style={themeStyle(
                                                themeFor(option.theme),
                                            )}
                                        >
                                            <span className="font-script text-2xl leading-tight">
                                                {option.label}
                                            </span>
                                            {selected && (
                                                <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-white text-rose shadow">
                                                    <Check
                                                        className="size-4"
                                                        strokeWidth={3}
                                                    />
                                                </span>
                                            )}
                                        </div>
                                        <p className="bg-card px-2.5 pt-2 text-sm font-medium">
                                            {option.label}
                                        </p>
                                    </button>
                                    <a
                                        href={demo.url(option.value)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block bg-card px-2.5 pb-2 text-xs text-plum hover:underline dark:text-blush"
                                    >
                                        See demo ↗
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                        {
                            templates.find(
                                (option) => option.value === data.template,
                            )?.description
                        }
                    </p>
                    <InputError message={errors.template} />

                    <p className="mt-6 mb-2 text-sm font-medium">Color theme</p>
                    <div className="flex flex-wrap gap-2">
                        {themes
                            .filter((theme) => EXPERIENCE_THEMES[theme])
                            .map((theme) => (
                                <button
                                    key={theme}
                                    type="button"
                                    onClick={() => setData('theme', theme)}
                                    className={cn(
                                        'flex items-center gap-2 rounded-full border-2 py-1 pr-3 pl-1 text-sm transition',
                                        data.theme === theme
                                            ? 'border-rose'
                                            : 'border-border hover:border-rose/40',
                                    )}
                                >
                                    <span
                                        className="size-7 rounded-full ring-1 ring-black/10"
                                        style={themeStyle(themeFor(theme))}
                                    />
                                    {EXPERIENCE_THEMES[theme].label}
                                </button>
                            ))}
                    </div>
                </Panel>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-6">
                        <Panel title="2. Your words">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Headline"
                                    error={errors.title}
                                    hint='e.g. "Happy 6th Monthsary" or "Hi my baby!"'
                                >
                                    <Input
                                        value={data.title}
                                        onChange={(event) =>
                                            setData('title', event.target.value)
                                        }
                                        maxLength={120}
                                    />
                                </Field>
                                <Field
                                    label="Sub-headline"
                                    error={errors.subtitle}
                                    hint='e.g. "My Love!" or "Would you like to see your gift?"'
                                >
                                    <Input
                                        value={data.subtitle}
                                        onChange={(event) =>
                                            setData(
                                                'subtitle',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={160}
                                    />
                                </Field>
                                <Field
                                    label="For (their name)"
                                    error={errors.recipient_name}
                                    hint='Shown as "To my langga," or "For Ana"'
                                >
                                    <Input
                                        value={data.recipient_name}
                                        onChange={(event) =>
                                            setData(
                                                'recipient_name',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={80}
                                    />
                                </Field>
                                <Field
                                    label="From (your name)"
                                    error={errors.sender_name}
                                >
                                    <Input
                                        value={data.sender_name}
                                        onChange={(event) =>
                                            setData(
                                                'sender_name',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={80}
                                    />
                                </Field>
                                <Field
                                    label={
                                        usesCountdown
                                            ? 'Event date'
                                            : 'Date or tagline'
                                    }
                                    error={errors.event_date}
                                    hint={
                                        usesCountdown
                                            ? 'Write a full date like "December 12, 2026" for a live countdown.'
                                            : 'e.g. "Our 6 months together" — also used as the polaroid wall title.'
                                    }
                                    className="sm:col-span-2"
                                >
                                    <Input
                                        value={data.event_date}
                                        onChange={(event) =>
                                            setData(
                                                'event_date',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={60}
                                    />
                                </Field>
                                <Field
                                    label="Your letter"
                                    error={errors.message}
                                    hint="Leave a blank line between paragraphs."
                                    className="sm:col-span-2"
                                >
                                    <Textarea
                                        value={data.message}
                                        onChange={(event) =>
                                            setData(
                                                'message',
                                                event.target.value,
                                            )
                                        }
                                        rows={9}
                                        maxLength={5000}
                                        placeholder="Hi love, it's kind of amazing how fast time has passed…"
                                    />
                                </Field>
                                <Field
                                    label="Favorite line or quote"
                                    error={errors.quote}
                                    className="sm:col-span-2"
                                >
                                    <Input
                                        value={data.quote}
                                        onChange={(event) =>
                                            setData('quote', event.target.value)
                                        }
                                        maxLength={255}
                                        placeholder="We are together in every situation."
                                    />
                                </Field>
                                {usesGifts && (
                                    <Field
                                        label='"Flowers for you" note'
                                        error={errors.flowers_note}
                                        className="sm:col-span-2"
                                    >
                                        <Textarea
                                            value={data.flowers_note}
                                            onChange={(event) =>
                                                setData(
                                                    'flowers_note',
                                                    event.target.value,
                                                )
                                            }
                                            rows={2}
                                            maxLength={500}
                                            placeholder="These white tulips make me think of your genuine soul."
                                        />
                                    </Field>
                                )}
                            </div>
                        </Panel>

                        <Panel
                            title="3. Photos"
                            description={`Up to ${maxPhotos} photos. The first photo is your cover. Tap a photo to remove it.`}
                        >
                            {experience.photos.length > 0 && (
                                <ul className="mb-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
                                    {experience.photos.map(
                                        (photo, position) => {
                                            const removing =
                                                data.remove_photos.includes(
                                                    photo.index,
                                                );

                                            return (
                                                <li key={photo.index}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleRemove(
                                                                photo.index,
                                                            )
                                                        }
                                                        className="group relative block aspect-square w-full overflow-hidden rounded-xl border"
                                                    >
                                                        <img
                                                            src={photo.url}
                                                            alt=""
                                                            className={cn(
                                                                'size-full object-cover transition',
                                                                removing &&
                                                                    'opacity-30 grayscale',
                                                            )}
                                                        />
                                                        {position === 0 &&
                                                            !removing && (
                                                                <span className="absolute top-1 left-1 rounded-full bg-plum px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                                                    Cover
                                                                </span>
                                                            )}
                                                        <span
                                                            className={cn(
                                                                'absolute top-1 right-1 flex size-6 items-center justify-center rounded-full shadow',
                                                                removing
                                                                    ? 'bg-white text-charcoal'
                                                                    : 'bg-white/90 text-rose opacity-0 group-hover:opacity-100',
                                                            )}
                                                        >
                                                            {removing ? (
                                                                <Undo2 className="size-3.5" />
                                                            ) : (
                                                                <Trash2 className="size-3.5" />
                                                            )}
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        },
                                    )}
                                </ul>
                            )}
                            <FileDropzone
                                id="new_photos"
                                files={data.new_photos}
                                onChange={(files) =>
                                    setData('new_photos', files)
                                }
                                maxFiles={Math.max(
                                    0,
                                    maxPhotos - keptPhotos.length,
                                )}
                                maxKilobytes={maxUploadKilobytes}
                                label="Add photos"
                                error={photoError}
                            />
                        </Panel>

                        {usesMoments && (
                            <Panel
                                title="4. Your moments"
                                description="Used for the timeline and polaroid wall. Save after adding new photos to pick them here."
                                action={
                                    data.moments.length < maxMoments && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setData('moments', [
                                                    ...data.moments,
                                                    {
                                                        date: '',
                                                        title: '',
                                                        caption: '',
                                                        photo: null,
                                                    },
                                                ])
                                            }
                                        >
                                            <Plus className="size-4" /> Add
                                            moment
                                        </Button>
                                    )
                                }
                            >
                                {data.moments.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        No moments yet — add your first date,
                                        trip or milestone.
                                    </p>
                                )}
                                <ol className="space-y-4">
                                    {data.moments.map((moment, position) => (
                                        <li
                                            key={position}
                                            className="rounded-2xl border p-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blush-light text-xs font-semibold text-plum">
                                                    {position + 1}
                                                </span>
                                                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                                                    <Input
                                                        value={moment.date}
                                                        onChange={(event) =>
                                                            updateMoment(
                                                                position,
                                                                {
                                                                    date: event
                                                                        .target
                                                                        .value,
                                                                },
                                                            )
                                                        }
                                                        placeholder="Date, e.g. September 20"
                                                        maxLength={60}
                                                    />
                                                    <Input
                                                        value={moment.title}
                                                        onChange={(event) =>
                                                            updateMoment(
                                                                position,
                                                                {
                                                                    title: event
                                                                        .target
                                                                        .value,
                                                                },
                                                            )
                                                        }
                                                        placeholder="Title, e.g. Our Baguio trip"
                                                        maxLength={80}
                                                    />
                                                    <Textarea
                                                        value={moment.caption}
                                                        onChange={(event) =>
                                                            updateMoment(
                                                                position,
                                                                {
                                                                    caption:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                        placeholder="What happened?"
                                                        rows={2}
                                                        maxLength={300}
                                                        className="sm:col-span-2"
                                                    />
                                                    <div className="sm:col-span-2">
                                                        <p className="mb-1.5 text-xs text-muted-foreground">
                                                            Photo
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateMoment(
                                                                        position,
                                                                        {
                                                                            photo: null,
                                                                        },
                                                                    )
                                                                }
                                                                className={cn(
                                                                    'flex size-12 items-center justify-center rounded-lg border-2',
                                                                    moment.photo ===
                                                                        null
                                                                        ? 'border-rose'
                                                                        : 'border-border',
                                                                )}
                                                                aria-label="No photo"
                                                            >
                                                                <ImageOff className="size-4 text-muted-foreground" />
                                                            </button>
                                                            {keptPhotos.map(
                                                                (photo) => (
                                                                    <button
                                                                        key={
                                                                            photo.index
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            updateMoment(
                                                                                position,
                                                                                {
                                                                                    photo: photo.index,
                                                                                },
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            'size-12 overflow-hidden rounded-lg border-2',
                                                                            moment.photo ===
                                                                                photo.index
                                                                                ? 'border-rose'
                                                                                : 'border-transparent',
                                                                        )}
                                                                    >
                                                                        <img
                                                                            src={
                                                                                photo.url
                                                                            }
                                                                            alt=""
                                                                            className="size-full object-cover"
                                                                        />
                                                                    </button>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        setData(
                                                            'moments',
                                                            data.moments.filter(
                                                                (_, index) =>
                                                                    index !==
                                                                    position,
                                                            ),
                                                        )
                                                    }
                                                    aria-label="Remove moment"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                                <InputError
                                    message={momentError}
                                    className="mt-2"
                                />
                            </Panel>
                        )}

                        <Panel
                            title={`${usesMoments ? '5' : '4'}. Song & video`}
                            description="Paste a YouTube or Spotify link, and/or upload an MP3 that plays in the background when the page opens."
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Song title"
                                    error={errors.song_title}
                                >
                                    <Input
                                        value={data.song_title}
                                        onChange={(event) =>
                                            setData(
                                                'song_title',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={120}
                                    />
                                </Field>
                                <Field
                                    label="Artist"
                                    error={errors.song_artist}
                                >
                                    <Input
                                        value={data.song_artist}
                                        onChange={(event) =>
                                            setData(
                                                'song_artist',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={120}
                                    />
                                </Field>
                                <Field
                                    label="Song link (YouTube or Spotify)"
                                    error={errors.music_url}
                                    className="sm:col-span-2"
                                >
                                    <Input
                                        type="url"
                                        value={data.music_url}
                                        onChange={(event) =>
                                            setData(
                                                'music_url',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="https://open.spotify.com/track/…"
                                    />
                                </Field>
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label>
                                        Background music (MP3, up to 15 MB)
                                    </Label>
                                    {experience.audio_url &&
                                        !data.remove_audio &&
                                        !data.audio && (
                                            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/60 p-3">
                                                <Music className="size-5 text-rose" />
                                                <audio
                                                    src={experience.audio_url}
                                                    controls
                                                    className="h-9 max-w-full flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setData(
                                                            'remove_audio',
                                                            true,
                                                        )
                                                    }
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        )}
                                    <FileDropzone
                                        id="audio"
                                        files={data.audio ? [data.audio] : []}
                                        onChange={(files) =>
                                            setData('audio', files[0] ?? null)
                                        }
                                        maxFiles={1}
                                        maxKilobytes={15360}
                                        accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav"
                                        label="Upload a song file"
                                        hint="It starts playing when they open the page (after the first tap)."
                                        error={errors.audio}
                                    />
                                </div>
                                <Field
                                    label="Video link (YouTube or Vimeo)"
                                    error={errors.video_url}
                                    className="sm:col-span-2"
                                >
                                    <Input
                                        type="url"
                                        value={data.video_url}
                                        onChange={(event) =>
                                            setData(
                                                'video_url',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="https://youtu.be/…"
                                    />
                                </Field>
                            </div>
                        </Panel>
                    </div>

                    <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                        <Panel title="Share">
                            {experience.qr_url && (
                                <img
                                    src={experience.qr_url}
                                    alt="QR code"
                                    className="mx-auto size-40 rounded-xl border bg-white p-2"
                                />
                            )}
                            {experience.qr_url && (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="mt-3 w-full rounded-full"
                                >
                                    <a href={`${experience.qr_url}?download=1`}>
                                        <Download className="size-4" /> Download
                                        QR code
                                    </a>
                                </Button>
                            )}
                            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-muted/60 p-3 text-sm">
                                <Checkbox
                                    checked={data.is_published}
                                    onCheckedChange={(checked) =>
                                        setData(
                                            'is_published',
                                            checked === true,
                                        )
                                    }
                                    className="mt-0.5"
                                />
                                <span>
                                    <span className="block font-medium">
                                        Publish my page
                                    </span>
                                    <span className="text-muted-foreground">
                                        When off, only you can see it.
                                    </span>
                                </span>
                            </label>
                            <p className="mt-3 text-xs text-muted-foreground">
                                Not sure yet?{' '}
                                <Link
                                    href={demo(data.template)}
                                    className="text-plum underline dark:text-blush"
                                >
                                    See this design with sample words
                                </Link>
                                .
                            </p>
                        </Panel>
                        <Panel
                            title="Open on a date"
                            description="Optional. Before this moment, a tap shows a countdown instead of your page — perfect for birthdays and anniversaries."
                        >
                            <div className="flex gap-2">
                                <Input
                                    type="datetime-local"
                                    value={data.unlocks_at}
                                    onChange={(event) =>
                                        setData(
                                            'unlocks_at',
                                            event.target.value,
                                        )
                                    }
                                    aria-label="Opening date and time"
                                />
                                {data.unlocks_at && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setData('unlocks_at', '')
                                        }
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                            <InputError
                                message={errors.unlocks_at}
                                className="mt-2"
                            />
                        </Panel>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="h-12 w-full rounded-full bg-plum text-white hover:bg-plum-dark dark:bg-blush dark:text-plum-dark"
                        >
                            {form.processing && (
                                <Loader2 className="size-4 animate-spin" />
                            )}{' '}
                            Save memory page
                        </Button>
                        <Panel title="Taps & replies">
                            <dl className="grid grid-cols-3 gap-2 text-center">
                                {(
                                    [
                                        ['Opens', stats.views],
                                        ['This week', stats.views_this_week],
                                        ['Hearts', stats.hearts],
                                    ] as const
                                ).map(([label, value]) => (
                                    <div
                                        key={label}
                                        className="rounded-xl bg-muted/60 px-2 py-3"
                                    >
                                        <dd className="font-display text-2xl font-semibold">
                                            {value}
                                        </dd>
                                        <dt className="text-xs text-muted-foreground">
                                            {label}
                                        </dt>
                                    </div>
                                ))}
                            </dl>
                            {stats.recent_views.length > 0 ? (
                                <ul className="mt-4 space-y-1.5 text-sm">
                                    {stats.recent_views.map((view) => (
                                        <li
                                            key={view.id}
                                            className="flex items-center justify-between gap-2 text-muted-foreground"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                {view.device === 'mobile' ? (
                                                    <Smartphone className="size-3.5" />
                                                ) : (
                                                    <Monitor className="size-3.5" />
                                                )}
                                                Opened
                                            </span>
                                            <span className="text-xs">
                                                {formatWhen(view.created_at)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-4 text-sm text-muted-foreground">
                                    No one has tapped your keepsake yet.
                                </p>
                            )}

                            <h3
                                id="replies"
                                className="mt-6 mb-2 flex scroll-mt-24 items-center gap-1.5 text-sm font-semibold"
                            >
                                <MessageCircleHeart className="size-4 text-rose" />{' '}
                                Replies
                            </h3>
                            {replies.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    When they write back, their messages appear
                                    here and in your email.
                                </p>
                            ) : (
                                <ul className="space-y-3">
                                    {replies.map((reply) => (
                                        <li
                                            key={reply.id}
                                            className="rounded-xl border p-3"
                                        >
                                            <p className="text-sm whitespace-pre-line">
                                                {reply.message}
                                            </p>
                                            <p className="mt-1.5 text-xs text-muted-foreground">
                                                {reply.name ?? 'Anonymous'} ·{' '}
                                                {formatWhen(reply.created_at)}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                    </div>
                </div>
            </form>
        </>
    );
}

function Field({
    label,
    error,
    hint,
    className,
    children,
}: {
    label: string;
    error?: string;
    hint?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={cn('grid content-start gap-2', className)}>
            <Label>{label}</Label>
            {children}
            {hint && !error && (
                <p className="text-xs text-muted-foreground">{hint}</p>
            )}
            <InputError message={error} />
        </div>
    );
}
