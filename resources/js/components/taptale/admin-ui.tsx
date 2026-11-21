import { router } from '@inertiajs/react';
import { Loader2, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6', className)}>{children}</div>;
}

export function PageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="font-display text-2xl font-medium sm:text-3xl">{title}</h1>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

/**
 * Search box that updates the current URL's query string as the admin types.
 */
export function SearchBox({
    value,
    placeholder,
    url,
    extra = {},
}: {
    value: string;
    placeholder: string;
    url: string;
    extra?: Record<string, string | undefined>;
}) {
    const [term, setTerm] = useState(value);
    const firstRender = useRef(true);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;

            return;
        }

        const timeout = window.setTimeout(() => {
            router.get(url, { ...extra, search: term || undefined }, { preserveState: true, preserveScroll: true, replace: true });
        }, 350);

        return () => window.clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term]);

    return (
        <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder={placeholder} className="pl-9" />
        </div>
    );
}

export function ConfirmDelete({
    title,
    description,
    url,
    trigger,
}: {
    title: string;
    description: string;
    url: string;
    trigger?: ReactNode;
}) {
    const [processing, setProcessing] = useState(false);
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label={title}>
                        <Trash2 className="size-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        disabled={processing}
                        onClick={() =>
                            router.delete(url, {
                                preserveScroll: true,
                                onStart: () => setProcessing(true),
                                onFinish: () => {
                                    setProcessing(false);
                                    setOpen(false);
                                },
                            })
                        }
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />} Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function CheckboxField({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition hover:bg-muted/40">
            <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-0.5" />
            <span>
                <span className="block font-medium">{label}</span>
                {description && <span className="text-muted-foreground">{description}</span>}
            </span>
        </label>
    );
}

export function FormField({
    label,
    htmlFor,
    error,
    hint,
    className,
    children,
}: {
    label: string;
    htmlFor?: string;
    error?: string;
    hint?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={cn('grid content-start gap-2', className)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
            <InputError message={error} />
        </div>
    );
}

export function TableShell({ children }: { children: ReactNode }) {
    return (
        <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase [&_thead]:bg-muted/50 [&_tr]:border-b [&_tbody_tr:last-child]:border-0">
                    {children}
                </table>
            </div>
        </div>
    );
}

export function ColorInput({
    value,
    onChange,
    id,
}: {
    value: string;
    onChange: (value: string) => void;
    id?: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#b86f83'}
                onChange={(event) => onChange(event.target.value)}
                className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
                aria-label="Pick color"
            />
            <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={7} className="font-mono" />
        </div>
    );
}
