import { Head, router } from '@inertiajs/react';
import { Gift } from 'lucide-react';
import { useEffect, useState } from 'react';
import { themeFor, themeStyle } from '@/components/taptale/experience/config';

type Remaining = {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
};

function remainingUntil(target: number): Remaining | null {
    const milliseconds = target - Date.now();

    if (milliseconds <= 0) {
        return null;
    }

    const totalSeconds = Math.floor(milliseconds / 1000);

    return {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
    };
}

/**
 * Shown instead of the memory page until the moment the sender chose. When
 * the countdown reaches zero the page reloads and opens.
 */
export default function ExperienceLocked({
    unlocksAt,
    theme,
    recipientName,
    senderName,
}: {
    unlocksAt: string;
    theme: string;
    recipientName: string | null;
    senderName: string | null;
}) {
    const target = new Date(unlocksAt).getTime();
    const [remaining, setRemaining] = useState(() => remainingUntil(target));

    useEffect(() => {
        const timer = window.setInterval(() => {
            const next = remainingUntil(target);
            setRemaining(next);

            if (next === null) {
                window.clearInterval(timer);
                router.reload();
            }
        }, 1000);

        return () => window.clearInterval(timer);
    }, [target]);

    const units: [string, number][] = remaining
        ? [
              ['days', remaining.days],
              ['hours', remaining.hours],
              ['minutes', remaining.minutes],
              ['seconds', remaining.seconds],
          ]
        : [];

    return (
        <>
            <Head title="A surprise is waiting" />
            <main
                className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center"
                style={themeStyle(themeFor(theme))}
            >
                <Gift className="size-12 opacity-80" strokeWidth={1.5} />
                <p className="mt-6 font-script text-4xl leading-tight sm:text-5xl">
                    {recipientName
                        ? `For ${recipientName}`
                        : 'A little surprise'}
                </p>
                <p className="mt-3 max-w-sm text-sm opacity-80">
                    {senderName
                        ? `${senderName} made something for you. It opens in…`
                        : 'Something special is waiting for you. It opens in…'}
                </p>

                {remaining ? (
                    <div className="mt-8 grid grid-cols-4 gap-2 sm:gap-4">
                        {units.map(([label, value]) => (
                            <div
                                key={label}
                                className="min-w-16 rounded-2xl bg-white/15 px-2 py-3 ring-1 ring-white/25 backdrop-blur sm:min-w-20"
                            >
                                <p className="font-display text-3xl font-semibold tabular-nums sm:text-4xl">
                                    {String(value).padStart(2, '0')}
                                </p>
                                <p className="mt-1 text-[11px] tracking-wider uppercase opacity-75">
                                    {label}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-8 text-sm opacity-80">Opening…</p>
                )}

                <p className="mt-8 text-xs opacity-70">
                    {new Date(unlocksAt).toLocaleString(undefined, {
                        dateStyle: 'long',
                        timeStyle: 'short',
                    })}
                </p>
                <p className="mt-10 max-w-xs text-xs opacity-60">
                    Keep this page open, or tap your keepsake again when the
                    time comes.
                </p>
            </main>
        </>
    );
}
