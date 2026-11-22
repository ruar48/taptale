import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useRequestFeedback } from '@/hooks/use-request-feedback';

function subscribe(onChange: () => void): () => void {
    window.addEventListener('online', onChange);
    window.addEventListener('offline', onChange);

    return () => {
        window.removeEventListener('online', onChange);
        window.removeEventListener('offline', onChange);
    };
}

/**
 * Tells people the moment their device goes offline, and turns on the
 * slow-connection and error notices (useRequestFeedback) for every page.
 */
export function ConnectionStatus() {
    useRequestFeedback();

    const isOnline = useSyncExternalStore(
        subscribe,
        () => navigator.onLine,
        () => true,
    );

    if (isOnline) {
        return null;
    }

    return (
        <div
            role="status"
            className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-charcoal px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 text-center text-sm text-cream shadow-lg"
        >
            <WifiOff className="size-4 shrink-0" />
            You're offline. Reconnect to continue — what you've entered stays on
            this page.
        </div>
    );
}
