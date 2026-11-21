import { usePage } from '@inertiajs/react';
import { formatMoney } from '@/lib/money';

/**
 * Returns a formatter that renders centavos using the store currency symbol.
 */
export function useMoney(): (centavos: number) => string {
    const symbol = usePage().props.storefront?.currencySymbol ?? '₱';

    return (centavos: number) => formatMoney(centavos, symbol);
}
