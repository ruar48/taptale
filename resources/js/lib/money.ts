const numberFormatter = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/**
 * Format an amount stored in centavos, e.g. 14900 → "₱149.00".
 */
export function formatMoney(centavos: number, symbol = '₱'): string {
    const sign = centavos < 0 ? '−' : '';

    return `${sign}${symbol}${numberFormatter.format(Math.abs(centavos) / 100)}`;
}

/**
 * Format a price modifier with an explicit sign, e.g. "+₱20.00".
 */
export function formatModifier(centavos: number, symbol = '₱'): string {
    if (centavos === 0) {
        return 'Included';
    }

    return `${centavos > 0 ? '+' : ''}${formatMoney(centavos, symbol)}`;
}

/**
 * Convert centavos to a peso string for admin inputs, e.g. 14900 → "149.00".
 */
export function toPesoInput(centavos: number | null | undefined): string {
    return ((centavos ?? 0) / 100).toFixed(2);
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
    if (!iso) {
        return '—';
    }

    return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    }).format(new Date(iso));
}
