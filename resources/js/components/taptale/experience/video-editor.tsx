import { usePage } from '@inertiajs/react';
import { Film, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { useExperience } from '@/components/taptale/experience/shared';

type Business = {
    email: string | null;
    phone: string | null;
    facebook_url: string | null;
};

/** Where a customer with a bigger video can reach the shop. */
export function contactFor(
    business: Business | undefined,
): { href: string; label: string } | null {
    if (business?.facebook_url) {
        return { href: business.facebook_url, label: 'Message us on Facebook' };
    }

    if (business?.email) {
        return {
            href: `mailto:${business.email}?subject=${encodeURIComponent('A bigger video for my memory page')}`,
            label: `Email us at ${business.email}`,
        };
    }

    if (business?.phone) {
        return {
            href: `tel:${business.phone.replace(/\s+/g, '')}`,
            label: `Message us at ${business.phone}`,
        };
    }

    return null;
}

const VIDEO_TYPES = 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm';

/**
 * Lets whoever edits the page add its video: a short clip uploaded right
 * here, or a YouTube or Vimeo link for longer videos. Videos take a lot of
 * storage, so a file over the limit is stopped before it uploads and the
 * customer is pointed to the shop for help.
 */
export function VideoEditor() {
    const { experience, saveText, uploading, addVideo, removeVideo } =
        useExperience();
    const { storefront } = usePage().props;
    const maxBytes = (storefront?.maxVideoKilobytes ?? 51200) * 1024;
    const maxMegabytes = Math.round(maxBytes / 1024 / 1024);
    const contact = contactFor(storefront?.business);
    const [link, setLink] = useState(experience.video_url ?? '');
    const [tooBigMegabytes, setTooBigMegabytes] = useState<number | null>(null);
    const [savingLink, setSavingLink] = useState(false);

    const pick = (file: File | undefined) => {
        if (!file || !addVideo) {
            return;
        }

        if (file.size > maxBytes) {
            setTooBigMegabytes(Math.ceil(file.size / 1024 / 1024));

            return;
        }

        setTooBigMegabytes(null);
        addVideo(file);
    };

    const saveLink = async () => {
        setSavingLink(true);
        await saveText('video_url', link);
        setSavingLink(false);
    };

    const fileInput = (
        <input
            type="file"
            accept={VIDEO_TYPES}
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
                pick(event.target.files?.[0]);
                event.target.value = '';
            }}
            aria-label="Upload a video"
        />
    );

    return (
        <div className="mx-auto mt-6 max-w-xl rounded-3xl bg-white/95 p-5 text-left font-sans text-sm text-[#3A2A30] shadow-lg">
            <p className="flex items-center gap-2 font-semibold">
                <Film className="size-4 text-[#B23A62]" /> Your video
            </p>
            <p className="mt-1 text-xs text-[#776D75]">
                Upload a short clip up to {maxMegabytes} MB, or paste a YouTube
                or Vimeo link for a longer video.
            </p>

            {addVideo && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {experience.video_file_url ? (
                        <>
                            <span className="text-xs font-medium text-emerald-700">
                                Your video is on the page.
                            </span>
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E4D8CE] px-3 py-1.5 text-xs font-semibold hover:bg-black/5">
                                {fileInput}
                                <RefreshCw className="size-3.5" /> Replace
                            </label>
                            {removeVideo && (
                                <button
                                    type="button"
                                    onClick={removeVideo}
                                    disabled={uploading}
                                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[#B23A62] hover:bg-[#B23A62]/10"
                                >
                                    <Trash2 className="size-3.5" /> Remove
                                </button>
                            )}
                        </>
                    ) : (
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#713D50] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5e3242]">
                            {fileInput}
                            {uploading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <Upload className="size-3.5" />
                            )}
                            {uploading ? 'Uploading…' : 'Upload a video'}
                        </label>
                    )}
                </div>
            )}

            {tooBigMegabytes !== null && (
                <p className="mt-3 rounded-2xl bg-[#FDECEF] p-3 text-xs leading-relaxed text-[#8E3F3D]">
                    This video is {tooBigMegabytes} MB, more than the{' '}
                    {maxMegabytes} MB we can keep for each page.{' '}
                    {contact ? (
                        <a
                            href={contact.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold underline underline-offset-2"
                        >
                            {contact.label}
                        </a>
                    ) : (
                        'Message us'
                    )}{' '}
                    and we will help you add it, or put it on YouTube and paste
                    the link below.
                </p>
            )}

            <div className="mt-3 flex gap-2">
                <input
                    type="url"
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    placeholder="https://youtu.be/…"
                    className="min-w-0 flex-1 rounded-full border border-[#E4D8CE] px-4 py-2 text-sm outline-none focus:border-[#B86F83]"
                    aria-label="YouTube or Vimeo link"
                />
                <button
                    type="button"
                    onClick={() => void saveLink()}
                    disabled={
                        savingLink || link === (experience.video_url ?? '')
                    }
                    className="shrink-0 rounded-full border border-[#E4D8CE] px-4 py-2 text-xs font-semibold hover:bg-black/5 disabled:opacity-50"
                >
                    {savingLink ? 'Saving…' : 'Save link'}
                </button>
            </div>
            {experience.video_file_url && experience.video_url && (
                <p className="mt-2 text-xs text-[#776D75]">
                    The uploaded video plays on the page; the link is kept as a
                    backup.
                </p>
            )}
        </div>
    );
}
