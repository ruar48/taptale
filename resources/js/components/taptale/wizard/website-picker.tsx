import { Check, Clock, Eye, ExternalLink, PenLine } from 'lucide-react';
import { useState } from 'react';
import {
    presetFor,
    themeFor,
    themeStyle,
} from '@/components/taptale/experience/config';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { demo } from '@/routes/experiences';
import type { ExperienceTemplateOption } from '@/types';

export type PageDetailsTiming = 'now' | 'later';

/**
 * Pick the memory-page website that opens when they tap or scan the gift.
 * Tapping a design opens its live demo, where the customer uses it (adding
 * their details now or later) or goes back to look at another one.
 */
export function WebsitePicker({
    templates,
    selected,
    onChoose,
}: {
    templates: ExperienceTemplateOption[];
    selected: string;
    onChoose: (value: string, timing: PageDetailsTiming) => void;
}) {
    const [previewing, setPreviewing] =
        useState<ExperienceTemplateOption | null>(null);

    const choose = (timing: PageDetailsTiming) => {
        if (!previewing) {
            return;
        }

        onChoose(previewing.value, timing);
        setPreviewing(null);
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {templates.map((option) => {
                    const isSelected = selected === option.value;
                    const gate = presetFor(option.value).gate;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setPreviewing(option)}
                            className={cn(
                                'group overflow-hidden rounded-3xl border-2 bg-card text-left transition',
                                isSelected
                                    ? 'border-rose shadow-[0_12px_30px_-16px_rgb(184_111_131/0.9)]'
                                    : 'border-transparent hover:border-rose/40',
                            )}
                            aria-pressed={isSelected}
                        >
                            <span
                                className="relative flex h-32 items-center justify-center px-3 text-center"
                                style={themeStyle(themeFor(option.theme))}
                            >
                                <span className="font-script text-3xl leading-tight">
                                    {option.label}
                                </span>
                                {isSelected && (
                                    <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white text-rose shadow">
                                        <Check
                                            className="size-4"
                                            strokeWidth={3}
                                        />
                                    </span>
                                )}
                                {gate && (
                                    <span className="absolute bottom-2 left-2 rounded-full bg-black/20 px-2 py-0.5 text-[10px] backdrop-blur">
                                        {gate === 'envelope'
                                            ? 'Envelope intro'
                                            : gate === 'question'
                                              ? 'Yes / no intro'
                                              : 'Tap-to-open intro'}
                                    </span>
                                )}
                            </span>
                            <span className="block px-3 pt-2.5">
                                <span className="block font-display">
                                    {option.label}
                                </span>
                                <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                                    {option.description}
                                </span>
                            </span>
                            <span className="flex items-center gap-1 px-3 pt-1.5 pb-3 text-xs font-medium text-plum group-hover:underline dark:text-blush">
                                <Eye className="size-3" />
                                {isSelected
                                    ? 'Your design · preview'
                                    : 'Preview'}
                            </span>
                        </button>
                    );
                })}
            </div>

            <Dialog
                open={previewing !== null}
                onOpenChange={(open) => !open && setPreviewing(null)}
            >
                <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-4xl">
                    {previewing && (
                        <div className="grid md:grid-cols-[minmax(0,1fr)_300px]">
                            <div className="bg-muted/60 p-4 sm:p-6">
                                <div className="mx-auto aspect-[9/16] max-h-[70vh] w-full max-w-[340px] overflow-hidden rounded-[2rem] border-4 border-charcoal/80 bg-background shadow-xl">
                                    <iframe
                                        key={previewing.value}
                                        src={demo.url(previewing.value)}
                                        title={`${previewing.label} demo`}
                                        className="size-full"
                                        loading="lazy"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-5 p-6">
                                <div className="pr-6">
                                    <DialogTitle className="font-display text-2xl leading-tight font-medium">
                                        {previewing.label}
                                    </DialogTitle>
                                    <DialogDescription className="mt-2">
                                        {previewing.description}
                                    </DialogDescription>
                                    <a
                                        href={demo.url(previewing.value)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-plum hover:underline dark:text-blush"
                                    >
                                        Open full screen{' '}
                                        <ExternalLink className="size-3" />
                                    </a>
                                </div>

                                <div className="mt-auto space-y-2.5">
                                    <Button
                                        type="button"
                                        className="w-full rounded-full"
                                        onClick={() => choose('now')}
                                    >
                                        <PenLine className="size-4" /> Use this
                                        & add my details now
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full rounded-full"
                                        onClick={() => choose('later')}
                                    >
                                        <Clock className="size-4" /> Use this —
                                        I'll add details later
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full rounded-full"
                                        onClick={() => setPreviewing(null)}
                                    >
                                        Choose another design
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    You can switch to another design anytime
                                    until your keepsake ships.
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
