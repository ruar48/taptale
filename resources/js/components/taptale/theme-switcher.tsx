import type { LucideIcon } from 'lucide-react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

const THEMES: { value: Appearance; icon: LucideIcon; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'Match my phone' },
];

/**
 * Lets shoppers pick the site background: the light brand look, dark, or follow their device.
 */
export function ThemeSwitcher({ className }: { className?: string }) {
    const { appearance, resolvedAppearance, updateAppearance } =
        useAppearance();
    const TriggerIcon = resolvedAppearance === 'dark' ? Moon : Sun;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn('rounded-full hover:bg-plum/5', className)}
                    aria-label="Change theme"
                >
                    <TriggerIcon className="size-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2">
                <DropdownMenuLabel className="text-xs font-semibold tracking-[0.2em] text-rose uppercase">
                    Background
                </DropdownMenuLabel>
                {THEMES.map(({ value, icon: Icon, label }) => (
                    <DropdownMenuItem
                        key={value}
                        onSelect={() => updateAppearance(value)}
                        className="cursor-pointer gap-3 rounded-xl px-3 py-2.5"
                    >
                        <Icon className="size-4" />
                        <span className="flex-1">{label}</span>
                        {appearance === value && (
                            <Check className="size-4 text-plum dark:text-blush" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
