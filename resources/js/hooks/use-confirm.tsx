import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type ConfirmOptions = {
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
};

export type UseConfirmReturn = {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    confirmDialog: ReactNode;
};

/**
 * An in-app replacement for window.confirm(). Render `confirmDialog`
 * somewhere in the component, then `await confirm({...})`.
 */
export function useConfirm(): UseConfirmReturn {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const resolver = useRef<((confirmed: boolean) => void) | null>(null);

    const settle = useCallback((confirmed: boolean) => {
        resolver.current?.(confirmed);
        resolver.current = null;
        setIsOpen(false);
    }, []);

    const confirm = useCallback((next: ConfirmOptions) => {
        resolver.current?.(false);
        setOptions(next);
        setIsOpen(true);

        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const confirmDialog = (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    settle(false);
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{options?.title}</DialogTitle>
                    {options?.description && (
                        <DialogDescription>{options.description}</DialogDescription>
                    )}
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => settle(false)}>
                        {options?.cancelLabel ?? 'Cancel'}
                    </Button>
                    <Button
                        variant={options?.destructive ? 'destructive' : 'default'}
                        onClick={() => settle(true)}
                        autoFocus
                    >
                        {options?.confirmLabel ?? 'Confirm'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return { confirm, confirmDialog };
}
