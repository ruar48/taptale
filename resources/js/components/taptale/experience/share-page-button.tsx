import { useHttp } from '@inertiajs/react';
import { Check, Copy, Loader2, Share2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import ExperienceShareLinkController from '@/actions/App/Http/Controllers/Storefront/ExperienceShareLinkController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';

type ShareLink = { url: string; expires_at: string };

/**
 * Floating share button for the person who tapped the keepsake. They pick
 * how many days the link stays open; there is no lifetime link, so it
 * cannot stand in for the keychain itself.
 */
export function SharePageButton({
    code,
    title,
    days,
}: {
    code: string;
    title: string;
    days: number[];
}) {
    const [open, setOpen] = useState(false);
    const [shareLink, setShareLink] = useState<ShareLink | null>(null);
    const [copied, copy] = useClipboard();
    const http = useHttp<{ days: number }, ShareLink>({
        days: days.includes(7) ? 7 : days[0],
    });

    const createLink = () => {
        http.post(ExperienceShareLinkController.store.url(code), {
            onSuccess: (response) => setShareLink(response),
            onHttpException: () => {
                toast.error('The link could not be made. Please try again.');
            },
        });
    };

    const sendLink = async (link: ShareLink) => {
        if (navigator.share) {
            try {
                await navigator.share({ title, url: link.url });
            } catch {
                // The visitor closed the share sheet.
            }

            return;
        }

        copy(link.url);
    };

    const expiresOn = shareLink
        ? new Date(shareLink.expires_at).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
          })
        : null;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Share this page"
                className="flex size-14 items-center justify-center rounded-full bg-white/90 text-plum shadow-[0_10px_30px_-8px_rgb(0_0_0/0.5)] transition hover:scale-105"
            >
                <Share2 className="size-6" />
            </button>

            <Dialog
                open={open}
                onOpenChange={(isOpen) => {
                    setOpen(isOpen);

                    if (!isOpen) {
                        setShareLink(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>Share this page</DialogTitle>
                    <DialogDescription>
                        Anyone you send the link to can open this page until it
                        expires.
                    </DialogDescription>

                    {shareLink ? (
                        <div className="space-y-4">
                            <p className="rounded-xl bg-muted/60 p-3 font-mono text-xs break-all">
                                {shareLink.url}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Opens until {expiresOn}.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => copy(shareLink.url)}
                                >
                                    {copied ? (
                                        <Check className="size-4" />
                                    ) : (
                                        <Copy className="size-4" />
                                    )}{' '}
                                    {copied ? 'Copied' : 'Copy link'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => sendLink(shareLink)}
                                >
                                    <Share2 className="size-4" /> Send
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <p className="text-sm font-medium">
                                    Link stays open for
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {days.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() =>
                                                http.setData('days', option)
                                            }
                                            aria-pressed={
                                                http.data.days === option
                                            }
                                            className={cn(
                                                'rounded-full border px-4 py-2 text-sm transition',
                                                http.data.days === option
                                                    ? 'border-plum bg-plum text-white'
                                                    : 'hover:bg-muted',
                                            )}
                                        >
                                            {option === 1
                                                ? '1 day'
                                                : `${option} days`}
                                        </button>
                                    ))}
                                </div>
                                <InputError message={http.errors.days} />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={createLink}
                                    disabled={http.processing}
                                >
                                    {http.processing && (
                                        <Loader2 className="size-4 animate-spin" />
                                    )}{' '}
                                    Make link
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
