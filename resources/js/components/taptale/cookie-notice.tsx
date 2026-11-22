import { Link } from '@inertiajs/react';
import { Cookie } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cookies } from '@/routes/pages';

const STORAGE_KEY = 'taptale.cookie-notice-dismissed';

/**
 * A one-time notice that the site only uses essential and preference cookies.
 * No consent choice is needed because nothing optional is set; dismissing it
 * is remembered in local storage for this browser.
 */
export function CookieNotice() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        try {
            setVisible(window.localStorage.getItem(STORAGE_KEY) === null);
        } catch {
            setVisible(true);
        }
    }, []);

    if (!visible) {
        return null;
    }

    const dismiss = () => {
        setVisible(false);

        try {
            window.localStorage.setItem(STORAGE_KEY, '1');
        } catch {
            // Storage can be blocked; the notice will simply show again next visit.
        }
    };

    return (
        <div
            role="region"
            aria-label="Cookie notice"
            className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-plum/10 bg-white p-4 text-sm shadow-xl sm:flex-row sm:items-center dark:border-border dark:bg-card"
        >
            <Cookie className="hidden size-6 shrink-0 text-rose sm:block" />
            <p className="flex-1 text-muted-foreground">
                We only use cookies that keep you signed in, protect your
                account and remember your settings. No ads or tracking.{' '}
                <Link
                    href={cookies()}
                    className="font-medium text-plum underline underline-offset-2 dark:text-blush"
                >
                    Learn more
                </Link>
            </p>
            <Button
                onClick={dismiss}
                className="shrink-0 rounded-full bg-plum text-white hover:bg-plum-dark dark:bg-blush dark:text-plum-dark"
            >
                Got it
            </Button>
        </div>
    );
}
