import { Check, ExternalLink } from 'lucide-react';
import {
    presetFor,
    themeFor,
    themeStyle,
} from '@/components/taptale/experience/config';
import { cn } from '@/lib/utils';
import { demo } from '@/routes/experiences';
import type { ExperienceTemplateOption } from '@/types';

/**
 * Pick the memory-page website that opens when they tap or scan the gift.
 */
export function WebsitePicker({
    templates,
    selected,
    onSelect,
}: {
    templates: ExperienceTemplateOption[];
    selected: string;
    onSelect: (value: string) => void;
}) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {templates.map((option) => {
                const isSelected = selected === option.value;
                const gate = presetFor(option.value).gate;

                return (
                    <div
                        key={option.value}
                        className={cn(
                            'overflow-hidden rounded-3xl border-2 bg-card transition',
                            isSelected
                                ? 'border-rose shadow-[0_12px_30px_-16px_rgb(184_111_131/0.9)]'
                                : 'border-transparent hover:border-rose/40',
                        )}
                    >
                        <button
                            type="button"
                            onClick={() => onSelect(option.value)}
                            className="block w-full text-left"
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
                        </button>
                        <a
                            href={demo.url(option.value)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 pt-1.5 pb-3 text-xs font-medium text-plum hover:underline dark:text-blush"
                        >
                            See live demo <ExternalLink className="size-3" />
                        </a>
                    </div>
                );
            })}
        </div>
    );
}
