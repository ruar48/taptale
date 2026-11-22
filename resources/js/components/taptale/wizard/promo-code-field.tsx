import { Loader2, TicketPercent, X } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMoney } from '@/hooks/use-money';
import type { AppliedPromo } from '@/lib/pricing';
import { check as checkPromoCode } from '@/routes/promo-codes';

/**
 * Checks a promo code with the server and shows the applied discount. The
 * order re-checks the code when it is placed.
 */
export function PromoCodeField({
    subtotal,
    applied,
    discount,
    onChange,
    serverError,
}: {
    subtotal: number;
    applied: AppliedPromo | null;
    discount: number;
    onChange: (promo: AppliedPromo | null) => void;
    serverError?: string;
}) {
    const money = useMoney();
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);

    const apply = async () => {
        if (!code.trim() || checking) {
            return;
        }

        setChecking(true);
        setError(null);

        try {
            const response = await fetch(
                checkPromoCode.url({
                    query: { code: code.trim(), subtotal },
                }),
                { headers: { Accept: 'application/json' } },
            );
            const body = await response.json();

            if (response.ok) {
                onChange(body as AppliedPromo);
                setCode('');
            } else {
                setError(
                    body?.errors?.code?.[0] ??
                        body?.message ??
                        'This promo code could not be applied.',
                );
            }
        } catch {
            setError('We could not check the code. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    if (applied) {
        return (
            <div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-rose/40 bg-blush-light/40 px-4 py-3 text-sm dark:bg-rose/10">
                    <span className="flex items-center gap-2">
                        <TicketPercent className="size-5 text-rose" />
                        <span>
                            <span className="font-mono font-semibold">
                                {applied.code}
                            </span>{' '}
                            {discount > 0 ? (
                                <span className="text-muted-foreground">
                                    · −{money(discount)}
                                </span>
                            ) : (
                                <span className="text-muted-foreground">
                                    · needs a subtotal of{' '}
                                    {money(applied.min_subtotal)}
                                </span>
                            )}
                        </span>
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onChange(null)}
                        aria-label="Remove promo code"
                    >
                        <X className="size-4" />
                    </Button>
                </div>
                <InputError message={serverError} className="mt-2" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex gap-2">
                <Input
                    value={code}
                    onChange={(event) =>
                        setCode(event.target.value.toUpperCase())
                    }
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            void apply();
                        }
                    }}
                    placeholder="Promo code"
                    className="font-mono"
                    maxLength={40}
                    aria-label="Promo code"
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => void apply()}
                    disabled={!code.trim() || checking}
                >
                    {checking && <Loader2 className="size-4 animate-spin" />}
                    Apply
                </Button>
            </div>
            <InputError message={error ?? serverError} className="mt-2" />
        </div>
    );
}
