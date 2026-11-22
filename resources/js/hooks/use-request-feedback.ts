import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * After this long, a submission still on its way gets a "slow connection" notice.
 */
const SLOW_SUBMISSION_MS = 8000;

const SLOW_TOAST_ID = 'slow-submission';
const NETWORK_TOAST_ID = 'network-error';

/**
 * Errors that come from the web server or hosting proxy rather than from
 * Taptale, which answers with its own pages and toasts.
 */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
    413: 'That file is too large to upload. Please choose a smaller photo.',
    419: 'This page expired. Please refresh the page and try again.',
    429: 'Too many requests. Please wait a moment and try again.',
    502: 'Taptale is busy right now. Please try again in a moment.',
    503: 'Taptale is getting a quick update. Please try again in a few minutes.',
    504: 'Taptale took too long to answer. Check your connection and try again.',
};

function isSubmission(visit: { method: string; prefetch: boolean }): boolean {
    return visit.method !== 'get' && !visit.prefetch;
}

function warnBeforeLeaving(event: BeforeUnloadEvent): void {
    event.preventDefault();
}

/**
 * Keeps people informed when the connection is slow or drops:
 *
 * - a notice when a submission takes long, and the browser's "leave site?"
 *   prompt if they try to close or reload the tab while it is on its way;
 * - a toast instead of a crash when a request cannot reach the server;
 * - a toast instead of a raw error window for errors from the web server
 *   or proxy (upload too large, gateway timeouts). Taptale's own error pages
 *   are left for Inertia to show.
 */
export function useRequestFeedback(): void {
    useEffect(() => {
        let pendingSubmissions = 0;
        let slowTimer: number | undefined;

        const stopWaiting = (): void => {
            pendingSubmissions = 0;
            window.clearTimeout(slowTimer);
            window.removeEventListener('beforeunload', warnBeforeLeaving);
            toast.dismiss(SLOW_TOAST_ID);
        };

        const removeListeners = [
            router.on('start', (event) => {
                if (!isSubmission(event.detail.visit)) {
                    return;
                }

                pendingSubmissions += 1;

                if (pendingSubmissions === 1) {
                    window.addEventListener('beforeunload', warnBeforeLeaving);
                    slowTimer = window.setTimeout(() => {
                        toast.loading(
                            'Still working on it — your connection seems slow. Please keep this page open.',
                            { id: SLOW_TOAST_ID },
                        );
                    }, SLOW_SUBMISSION_MS);
                }
            }),
            router.on('finish', (event) => {
                if (!isSubmission(event.detail.visit)) {
                    return;
                }

                if (pendingSubmissions <= 1) {
                    stopWaiting();
                } else {
                    pendingSubmissions -= 1;
                }
            }),
            // Leaving for an external page, such as PayMongo's checkout.
            router.on('location', stopWaiting),
            router.on('networkError', () => {
                toast.error(
                    navigator.onLine
                        ? 'We could not reach Taptale. Check your connection and try again.'
                        : "You're offline. Reconnect to the internet and try again.",
                    { id: NETWORK_TOAST_ID },
                );

                return false;
            }),
            router.on('httpException', (event) => {
                const { response } = event.detail;

                if (
                    response.status < 400 ||
                    response.headers['x-inertia'] !== undefined
                ) {
                    return;
                }

                if (import.meta.env.DEV && response.status >= 500) {
                    return;
                }

                toast.error(
                    HTTP_ERROR_MESSAGES[response.status] ??
                        'Something went wrong. Please try again.',
                );

                return false;
            }),
        ];

        return () => {
            removeListeners.forEach((removeListener) => removeListener());
            stopWaiting();
        };
    }, []);
}
