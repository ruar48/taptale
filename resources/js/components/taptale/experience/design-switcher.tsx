import { router } from '@inertiajs/react';
import { Check, Loader2, Palette, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import ExperienceController from '@/actions/App/Http/Controllers/Account/ExperienceController';
import {
    EXPERIENCE_THEMES,
    themeFor,
    themeStyle,
} from '@/components/taptale/experience/config';
import { cn } from '@/lib/utils';
import type { DigitalExperience, ExperienceTemplateOption } from '@/types';

export type DesignOptions = {
    templates: ExperienceTemplateOption[];
    themes: string[];
};

/**
 * Lets the owner try every website design and color theme on their own
 * page. Choosing one saves it immediately and re-renders the page.
 */
export function DesignSwitcher({
    experience,
    options,
}: {
    experience: DigitalExperience;
    options: DesignOptions;
}) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);

    const save = (template: string, theme: string, key: string) => {
        router.put(
            ExperienceController.updateDesign.url(experience.code),
            { template, theme },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setSaving(key),
                onFinish: () => setSaving(null),
                onError: (errors) =>
                    toast.error(
                        Object.values(errors)[0] ??
                            'The design could not be changed.',
                    ),
            },
        );
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
            >
                <Palette className="size-3.5" /> Change design
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl bg-white p-5 text-left text-[#343039] shadow-2xl sm:rounded-3xl sm:p-7"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="font-display text-2xl">
                                    Choose your page design
                                </h2>
                                <p className="mt-1 text-sm text-[#776D75]">
                                    Tap a design to apply it. Your photos and
                                    words stay the same.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded-full p-1.5 hover:bg-black/5"
                                aria-label="Close"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {options.templates.map((option) => {
                                const selected =
                                    experience.template === option.value;
                                const key = `template:${option.value}`;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        disabled={saving !== null}
                                        onClick={() =>
                                            save(
                                                option.value,
                                                option.theme,
                                                key,
                                            )
                                        }
                                        className={cn(
                                            'overflow-hidden rounded-2xl border-2 text-left transition disabled:opacity-60',
                                            selected
                                                ? 'border-[#B86F83] shadow-md'
                                                : 'border-transparent hover:border-[#B86F83]/40',
                                        )}
                                    >
                                        <span
                                            className="relative flex h-24 items-center justify-center px-2 text-center"
                                            style={themeStyle(
                                                themeFor(option.theme),
                                            )}
                                        >
                                            <span className="font-script text-2xl leading-tight">
                                                {option.label}
                                            </span>
                                            {(selected || saving === key) && (
                                                <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-white text-[#B86F83] shadow">
                                                    {saving === key ? (
                                                        <Loader2 className="size-4 animate-spin" />
                                                    ) : (
                                                        <Check
                                                            className="size-4"
                                                            strokeWidth={3}
                                                        />
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                        <span className="block bg-white px-2.5 py-2">
                                            <span className="block text-sm font-medium">
                                                {option.label}
                                            </span>
                                            <span className="line-clamp-2 block text-xs text-[#776D75]">
                                                {option.description}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <p className="mt-6 mb-2 text-sm font-medium">
                            Color theme
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {options.themes
                                .filter((theme) => EXPERIENCE_THEMES[theme])
                                .map((theme) => {
                                    const key = `theme:${theme}`;

                                    return (
                                        <button
                                            key={theme}
                                            type="button"
                                            disabled={saving !== null}
                                            onClick={() =>
                                                save(
                                                    experience.template,
                                                    theme,
                                                    key,
                                                )
                                            }
                                            className={cn(
                                                'flex items-center gap-2 rounded-full border-2 py-1 pr-3 pl-1 text-sm transition disabled:opacity-60',
                                                experience.theme === theme
                                                    ? 'border-[#B86F83]'
                                                    : 'border-[#EBE1D8] hover:border-[#B86F83]/40',
                                            )}
                                        >
                                            <span
                                                className="size-7 rounded-full ring-1 ring-black/10"
                                                style={themeStyle(
                                                    themeFor(theme),
                                                )}
                                            />
                                            {saving === key ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                EXPERIENCE_THEMES[theme].label
                                            )}
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
