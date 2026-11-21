import { Head, setLayoutProps, useForm } from '@inertiajs/react';
import { Download, ExternalLink, Loader2, Nfc, Trash2, Undo2 } from 'lucide-react';
import ExperienceController from '@/actions/App/Http/Controllers/Account/ExperienceController';
import InputError from '@/components/input-error';
import { FileDropzone } from '@/components/taptale/file-dropzone';
import { Panel } from '@/components/taptale/order-parts';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { edit } from '@/routes/account/experiences';
import { index as ordersIndex, show as orderShow } from '@/routes/account/orders';
import type { DigitalExperience } from '@/types';

type Props = {
    experience: DigitalExperience;
    order: { reference: string; product_name: string };
    themes: string[];
    maxPhotos: number;
};

const THEME_SWATCHES: Record<string, string> = {
    blush: 'linear-gradient(135deg, #F4E3E3, #F8F3ED)',
    plum: 'linear-gradient(135deg, #713D50, #343039)',
    cream: 'linear-gradient(135deg, #F8F3ED, #EFE6DC)',
    midnight: 'linear-gradient(135deg, #1F1B2E, #100E17)',
};

export default function EditExperience({ experience, order, themes, maxPhotos }: Props) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'My orders', href: ordersIndex() },
            { title: order.reference, href: orderShow(order.reference) },
            { title: 'Memory page', href: edit(experience.code) },
        ],
    });

    const form = useForm<{
        _method: 'put';
        title: string;
        subtitle: string;
        message: string;
        event_date: string;
        video_url: string;
        music_url: string;
        theme: string;
        is_published: boolean;
        new_photos: File[];
        remove_photos: number[];
    }>({
        _method: 'put',
        title: experience.title,
        subtitle: experience.subtitle ?? '',
        message: experience.message ?? '',
        event_date: experience.event_date ?? '',
        video_url: experience.video_url ?? '',
        music_url: experience.music_url ?? '',
        theme: experience.theme,
        is_published: experience.is_published,
        new_photos: [],
        remove_photos: [],
    });

    const { data, setData, errors } = form;
    const keptPhotos = experience.photos.length - data.remove_photos.length;
    const photoError = Object.entries(errors).find(([key]) => key.startsWith('new_photos'))?.[1];

    const toggleRemove = (index: number) =>
        setData(
            'remove_photos',
            data.remove_photos.includes(index)
                ? data.remove_photos.filter((value) => value !== index)
                : [...data.remove_photos, index],
        );

    return (
        <>
            <Head title="Memory page" />
            <form
                className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(ExperienceController.update.url(experience.code), {
                        forceFormData: true,
                        preserveScroll: true,
                        onSuccess: () => form.setData((current) => ({ ...current, new_photos: [], remove_photos: [] })),
                    });
                }}
            >
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="flex items-center gap-2 text-sm text-rose"><Nfc className="size-4" /> {order.product_name}</p>
                        <h1 className="mt-1 font-display text-3xl font-medium">Your memory page</h1>
                        <p className="mt-1 text-sm text-muted-foreground">This is what opens when someone taps your keepsake or scans its QR code.</p>
                    </div>
                    <Button asChild variant="outline" className="rounded-full">
                        <a href={experience.public_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-4" /> {experience.is_published ? 'View live page' : 'Preview page'}
                        </a>
                    </Button>
                </header>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="space-y-6">
                        <Panel title="Words">
                            <div className="grid gap-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="title">Title</Label>
                                        <Input id="title" value={data.title} onChange={(event) => setData('title', event.target.value)} maxLength={120} />
                                        <InputError message={errors.title} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="event_date">Date</Label>
                                        <Input id="event_date" value={data.event_date} onChange={(event) => setData('event_date', event.target.value)} placeholder="e.g. June 21, 2025" maxLength={60} />
                                        <InputError message={errors.event_date} />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="subtitle">Subtitle</Label>
                                    <Input id="subtitle" value={data.subtitle} onChange={(event) => setData('subtitle', event.target.value)} placeholder="e.g. Five years of us" maxLength={160} />
                                    <InputError message={errors.subtitle} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea id="message" value={data.message} onChange={(event) => setData('message', event.target.value)} rows={6} maxLength={3000} placeholder="Write the words you want them to read every time they tap." />
                                    <InputError message={errors.message} />
                                </div>
                            </div>
                        </Panel>

                        <Panel title="Photos" description={`Up to ${maxPhotos} photos. Tap a photo to remove it.`}>
                            {experience.photos.length > 0 && (
                                <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                                    {experience.photos.map((photo) => {
                                        const removing = data.remove_photos.includes(photo.index);

                                        return (
                                            <li key={photo.index}>
                                                <button type="button" onClick={() => toggleRemove(photo.index)} className="group relative block aspect-square w-full overflow-hidden rounded-xl border">
                                                    <img src={photo.url} alt="" className={cn('size-full object-cover transition', removing && 'opacity-30 grayscale')} />
                                                    <span className={cn('absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full shadow', removing ? 'bg-white text-charcoal' : 'bg-white/90 text-rose opacity-0 group-hover:opacity-100')}>
                                                        {removing ? <Undo2 className="size-4" /> : <Trash2 className="size-4" />}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <FileDropzone
                                id="new_photos"
                                files={data.new_photos}
                                onChange={(files) => setData('new_photos', files)}
                                maxFiles={Math.max(0, maxPhotos - keptPhotos)}
                                maxKilobytes={10240}
                                label="Add photos"
                                error={photoError}
                            />
                        </Panel>

                        <Panel title="Video & music" description="Paste a YouTube or Vimeo link and a Spotify or YouTube Music link.">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="video_url">Video link</Label>
                                    <Input id="video_url" type="url" value={data.video_url} onChange={(event) => setData('video_url', event.target.value)} placeholder="https://youtu.be/…" />
                                    <InputError message={errors.video_url} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="music_url">Song link</Label>
                                    <Input id="music_url" type="url" value={data.music_url} onChange={(event) => setData('music_url', event.target.value)} placeholder="https://open.spotify.com/…" />
                                    <InputError message={errors.music_url} />
                                </div>
                            </div>
                        </Panel>
                    </div>

                    <div className="space-y-6">
                        <Panel title="Look & feel">
                            <div className="grid grid-cols-2 gap-3">
                                {themes.map((theme) => (
                                    <button
                                        key={theme}
                                        type="button"
                                        onClick={() => setData('theme', theme)}
                                        className={cn('rounded-xl border-2 p-1.5 text-left text-sm capitalize transition', data.theme === theme ? 'border-rose' : 'border-transparent hover:border-rose/40')}
                                    >
                                        <span className="block h-14 rounded-lg" style={{ background: THEME_SWATCHES[theme] }} />
                                        <span className="mt-1 block px-1">{theme}</span>
                                    </button>
                                ))}
                            </div>
                        </Panel>

                        <Panel title="Share">
                            <img src={experience.qr_url} alt="QR code" className="mx-auto size-40 rounded-xl border bg-white p-2" />
                            <Button asChild variant="outline" className="mt-3 w-full rounded-full">
                                <a href={`${experience.qr_url}?download=1`}>
                                    <Download className="size-4" /> Download QR code
                                </a>
                            </Button>
                            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-muted/60 p-3 text-sm">
                                <Checkbox checked={data.is_published} onCheckedChange={(checked) => setData('is_published', checked === true)} className="mt-0.5" />
                                <span>
                                    <span className="block font-medium">Publish my page</span>
                                    <span className="text-muted-foreground">When off, only you can see it.</span>
                                </span>
                            </label>
                        </Panel>

                        <Button type="submit" disabled={form.processing} className="h-12 w-full rounded-full bg-plum text-white hover:bg-plum-dark dark:bg-blush dark:text-plum-dark">
                            {form.processing && <Loader2 className="size-4 animate-spin" />} Save memory page
                        </Button>
                    </div>
                </div>
            </form>
        </>
    );
}
