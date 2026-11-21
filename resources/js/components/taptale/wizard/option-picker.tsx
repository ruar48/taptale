import { Check, Nfc } from 'lucide-react';
import { formatModifier } from '@/lib/money';
import { groupOptions } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import type { ProductOption } from '@/types';

/**
 * Lets the customer pick one option per single-choice group (size, shape,
 * material...) and any number of add-ons.
 */
export function OptionPicker({
    options,
    selected,
    onChange,
    symbol = '₱',
}: {
    options: ProductOption[];
    selected: number[];
    onChange: (ids: number[]) => void;
    symbol?: string;
}) {
    const groups = groupOptions(options);

    const toggle = (option: ProductOption, groupOptionIds: number[]) => {
        if (option.multiple) {
            onChange(
                selected.includes(option.id)
                    ? selected.filter((id) => id !== option.id)
                    : [...selected, option.id],
            );

            return;
        }

        onChange([
            ...selected.filter((id) => !groupOptionIds.includes(id)),
            option.id,
        ]);
    };

    return (
        <div className="space-y-8">
            {groups.map((group) => {
                const ids = group.options.map((option) => option.id);
                const isSwatchGroup = group.options.every((option) => option.swatch);

                return (
                    <fieldset key={group.group}>
                        <legend className="mb-3 flex items-baseline gap-2">
                            <span className="font-display text-lg">{group.label}</span>
                            <span className="text-xs text-muted-foreground">
                                {group.multiple ? 'Optional · choose any' : 'Choose one'}
                            </span>
                        </legend>
                        <div
                            className={cn(
                                'grid gap-3',
                                isSwatchGroup ? 'grid-cols-2 sm:grid-cols-3' : 'sm:grid-cols-2',
                            )}
                        >
                            {group.options.map((option) => {
                                const isSelected = selected.includes(option.id);

                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        role={group.multiple ? 'checkbox' : 'radio'}
                                        aria-checked={isSelected}
                                        onClick={() => toggle(option, ids)}
                                        className={cn(
                                            'relative flex items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left transition-all',
                                            isSelected
                                                ? 'border-rose bg-blush-light/50 shadow-[0_8px_20px_-14px_rgb(184_111_131/0.9)] dark:bg-rose/10'
                                                : 'border-border hover:border-rose/40',
                                        )}
                                    >
                                        {option.swatch ? (
                                            <span
                                                className="size-7 shrink-0 rounded-full ring-2 ring-white shadow"
                                                style={{ backgroundColor: option.swatch }}
                                            />
                                        ) : option.enables_digital_experience ? (
                                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-plum text-white">
                                                <Nfc className="size-4" />
                                            </span>
                                        ) : null}
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium">{option.name}</span>
                                            {option.description && (
                                                <span className="block text-xs text-muted-foreground">
                                                    {option.description}
                                                </span>
                                            )}
                                            <span className={cn('block text-xs', option.price_modifier > 0 ? 'text-plum dark:text-blush' : 'text-muted-foreground')}>
                                                {formatModifier(option.price_modifier, symbol)}
                                                {option.price_modifier !== 0 && ' / pc'}
                                            </span>
                                        </span>
                                        <span
                                            className={cn(
                                                'flex size-5 shrink-0 items-center justify-center border-2 transition',
                                                group.multiple ? 'rounded-md' : 'rounded-full',
                                                isSelected ? 'border-rose bg-rose text-white' : 'border-border',
                                            )}
                                        >
                                            {isSelected && <Check className="size-3" strokeWidth={3} />}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>
                );
            })}
        </div>
    );
}
