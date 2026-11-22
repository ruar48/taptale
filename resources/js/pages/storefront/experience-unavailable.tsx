import { Head, Link } from '@inertiajs/react';
import { Nfc, ScanLine } from 'lucide-react';
import { themeFor, themeStyle } from '@/components/taptale/experience/config';
import { home } from '@/routes';

/**
 * Shown when a memory page address does not open: a link copied from the
 * address bar or shared in a chat, a browser that forgot the tap, a wrong
 * code, or a page that is not published yet. It never tells which one, so
 * the page stays private; it explains how memory pages are opened instead.
 */
export default function ExperienceUnavailable() {
    return (
        <>
            <Head title="Tap to open" />
            <main
                className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center"
                style={themeStyle(themeFor('plum'))}
            >
                <div className="flex items-center gap-3 opacity-85">
                    <Nfc className="size-10" strokeWidth={1.5} />
                    <ScanLine className="size-10" strokeWidth={1.5} />
                </div>

                <h1 className="mt-6 font-script text-4xl leading-tight sm:text-5xl">
                    This memory opens with a tap
                </h1>
                <p className="mt-4 max-w-sm text-sm opacity-85">
                    Memory pages open from their keepsake. Hold your phone to
                    the keychain, or scan its QR code with the camera.
                </p>
                <p className="mt-3 max-w-sm text-sm opacity-75">
                    A link copied from the address bar or sent in a chat won't
                    open it — that keeps the memories private to whoever holds
                    the gift.
                </p>
                <p className="mt-8 max-w-xs text-xs opacity-60">
                    Tapped it and still seeing this? The page may not be ready
                    yet. Ask the person who gave it to you.
                </p>

                <Link
                    href={home()}
                    className="mt-12 text-xs underline-offset-4 opacity-70 hover:underline hover:opacity-100"
                >
                    Made with Taptale · Create your own
                </Link>
            </main>
        </>
    );
}
