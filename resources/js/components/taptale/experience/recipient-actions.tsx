import { router, useForm } from '@inertiajs/react';
import { Heart, Loader2, MessageCircleHeart } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import ExperienceReactionController from '@/actions/App/Http/Controllers/Storefront/ExperienceReactionController';
import InputError from '@/components/input-error';
import { SharePageButton } from '@/components/taptale/experience/share-page-button';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Lets the person who tapped the keepsake send a heart or a private note
 * back to the sender, or share the page with family and friends. Sits
 * bottom-left, opposite the music button.
 */
export function RecipientActions({
    code,
    senderName,
    hasHearted,
    title,
    canShare = false,
    shareLinkDays = [],
}: {
    code: string;
    senderName: string | null;
    hasHearted: boolean;
    title: string;
    /** Only someone who tapped the genuine tag can make share links. */
    canShare?: boolean;
    shareLinkDays?: number[];
}) {
    const [hearted, setHearted] = useState(hasHearted);
    const [writing, setWriting] = useState(false);
    const form = useForm({ name: '', message: '' });

    const sendHeart = () => {
        if (hearted) {
            return;
        }

        setHearted(true);
        router.post(
            ExperienceReactionController.heart.url(code),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => setHearted(false),
            },
        );
    };

    return (
        <>
            <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 flex gap-2">
                <button
                    type="button"
                    onClick={sendHeart}
                    aria-pressed={hearted}
                    aria-label={hearted ? 'Heart sent' : 'Send a heart'}
                    className="flex size-14 items-center justify-center rounded-full bg-white/90 text-rose shadow-[0_10px_30px_-8px_rgb(0_0_0/0.5)] transition hover:scale-105"
                >
                    <Heart
                        className={cn(
                            'size-6 transition',
                            hearted && 'scale-110 fill-current',
                        )}
                    />
                </button>
                <button
                    type="button"
                    onClick={() => setWriting(true)}
                    className="flex h-14 items-center gap-2 rounded-full bg-white/90 px-5 text-sm font-semibold text-plum shadow-[0_10px_30px_-8px_rgb(0_0_0/0.5)] transition hover:scale-105"
                >
                    <MessageCircleHeart className="size-5" /> Write back
                </button>
                {canShare && shareLinkDays.length > 0 && (
                    <SharePageButton
                        code={code}
                        title={title}
                        days={shareLinkDays}
                    />
                )}
            </div>

            <Dialog open={writing} onOpenChange={setWriting}>
                <DialogContent className="sm:max-w-md">
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.post(
                                ExperienceReactionController.reply.url(code),
                                {
                                    preserveScroll: true,
                                    preserveState: true,
                                    onSuccess: () => {
                                        form.reset();
                                        setWriting(false);
                                    },
                                    onError: (errors) => {
                                        if (!errors.message && !errors.name) {
                                            toast.error(
                                                'Your message could not be sent. Please try again.',
                                            );
                                        }
                                    },
                                },
                            );
                        }}
                    >
                        <DialogTitle>
                            Write back
                            {senderName ? ` to ${senderName}` : ''}
                        </DialogTitle>
                        <DialogDescription>
                            Only the person who made this page will see your
                            message.
                        </DialogDescription>
                        <div className="grid gap-2">
                            <Input
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                placeholder="Your name (optional)"
                                maxLength={80}
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Textarea
                                value={form.data.message}
                                onChange={(event) =>
                                    form.setData('message', event.target.value)
                                }
                                placeholder="Thank you, I love it…"
                                rows={4}
                                maxLength={1000}
                                required
                            />
                            <InputError message={form.errors.message} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setWriting(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing && (
                                    <Loader2 className="size-4 animate-spin" />
                                )}{' '}
                                Send
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
