import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS } from '@/lib/wizard';

export function WizardProgress({
    current,
    furthest,
    onSelect,
}: {
    current: number;
    furthest: number;
    onSelect: (step: number) => void;
}) {
    const percentage = (current / (WIZARD_STEPS.length - 1)) * 100;

    return (
        <div>
            {/* Mobile: compact bar */}
            <div className="md:hidden">
                <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-plum dark:text-blush">
                        Step {current + 1} of {WIZARD_STEPS.length}
                    </span>
                    <span className="text-muted-foreground">
                        {WIZARD_STEPS[current].title}
                    </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-plum/10">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-rose to-plum transition-all duration-500"
                        style={{ width: `${Math.max(6, percentage)}%` }}
                    />
                </div>
            </div>

            {/* Desktop: full stepper */}
            <ol className="hidden items-start md:flex">
                {WIZARD_STEPS.map((step, index) => {
                    const isDone = index < current;
                    const isCurrent = index === current;
                    const isReachable = index <= furthest;

                    return (
                        <li
                            key={step.key}
                            className="relative flex flex-1 flex-col items-center"
                        >
                            {index > 0 && (
                                <span
                                    className={cn(
                                        'absolute top-5 right-1/2 h-0.5 w-full -translate-y-1/2 transition-colors duration-500',
                                        index <= current
                                            ? 'bg-rose'
                                            : 'bg-plum/10',
                                    )}
                                />
                            )}
                            <button
                                type="button"
                                disabled={!isReachable}
                                onClick={() => onSelect(index)}
                                className={cn(
                                    'relative z-10 flex size-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all',
                                    isCurrent &&
                                        'scale-110 border-plum bg-plum text-white shadow-[0_8px_20px_-6px_rgb(113_61_80/0.6)] dark:border-blush dark:bg-blush dark:text-plum-dark',
                                    isDone && 'border-rose bg-rose text-white',
                                    !isCurrent &&
                                        !isDone &&
                                        'border-plum/15 bg-card text-muted-foreground',
                                    isReachable &&
                                        !isCurrent &&
                                        'cursor-pointer hover:border-rose',
                                )}
                                aria-current={isCurrent ? 'step' : undefined}
                            >
                                {isDone ? (
                                    <Check className="size-4" />
                                ) : (
                                    index + 1
                                )}
                            </button>
                            <span
                                className={cn(
                                    'mt-2 text-xs font-medium',
                                    isCurrent
                                        ? 'text-plum dark:text-blush'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {step.title}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
