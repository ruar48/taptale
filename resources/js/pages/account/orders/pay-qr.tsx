import { Head, Link, setLayoutProps, useForm, usePoll } from '@inertiajs/react';
import {
    ArrowLeft,
    Download,
    Loader2,
    RefreshCw,
    ScanLine,
    ShieldCheck,
    Smartphone,
    Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import QrPhPaymentController from '@/actions/App/Http/Controllers/Account/QrPhPaymentController';
import InputError from '@/components/input-error';
import { BrandLogo } from '@/components/taptale/brand-logo';
import { Button } from '@/components/ui/button';
import { useMoney } from '@/hooks/use-money';
import { cn } from '@/lib/utils';
import {
    index as ordersIndex,
    show as orderShow,
} from '@/routes/account/orders';

type Props = {
    order: { reference: string; product_name: string };
    payment: {
        amount: number;
        payment_method_id: number | null;
        qr_code: string | null;
        expires_at: string | null;
        is_active: boolean;
    };
};

export default function PayQr({ order, payment }: Props) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'My orders', href: ordersIndex() },
            { title: order.reference, href: orderShow(order.reference) },
            {
                title: 'Scan to pay',
                href: QrPhPaymentController.show(order.reference),
            },
        ],
    });

    const money = useMoney();
    const secondsLeft = useSecondsUntil(payment.expires_at);
    const isActive =
        payment.is_active && payment.qr_code !== null && secondsLeft > 0;

    const { start, stop } = usePoll(
        4000,
        { only: ['payment'] },
        { autoStart: false },
    );

    useEffect(() => {
        if (isActive) {
            start();
        } else {
            stop();
        }

        return stop;
    }, [isActive, start, stop]);

    return (
        <>
            <Head title={`Pay for ${order.reference}`} />
            <div className="mx-auto w-full max-w-md p-4 sm:py-10">
                <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_30px_80px_-40px_rgb(113_61_80/0.6)]">
                    <header className="relative overflow-hidden bg-gradient-to-br from-plum via-plum to-rose px-6 pt-6 pb-16 text-center text-cream">
                        <div
                            aria-hidden
                            className="absolute -top-16 -right-10 size-48 rounded-full bg-rose-light/30 blur-2xl"
                        />
                        <div
                            aria-hidden
                            className="absolute -bottom-20 -left-10 size-48 rounded-full bg-blush/20 blur-2xl"
                        />
                        <BrandLogo inverted className="relative" />
                        <p className="relative mt-5 text-xs font-medium tracking-[0.2em] text-blush uppercase">
                            Scan to pay
                        </p>
                        <p className="relative mt-1 font-display text-4xl font-semibold">
                            {money(payment.amount)}
                        </p>
                        <p className="relative mt-1 text-sm text-blush-light/90">
                            {order.product_name} · {order.reference}
                        </p>
                    </header>

                    <div className="-mt-10 px-6 pb-6">
                        <QrFrame
                            qrCode={isActive ? payment.qr_code : null}
                            reference={order.reference}
                        />

                        {isActive ? (
                            <>
                                <Countdown
                                    key={payment.expires_at}
                                    secondsLeft={secondsLeft}
                                />
                                <p className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-plum dark:text-blush">
                                    <span className="relative flex size-2.5">
                                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose opacity-75" />
                                        <span className="relative inline-flex size-2.5 rounded-full bg-rose" />
                                    </span>
                                    Waiting for your payment…
                                </p>
                                <ol className="mt-6 space-y-3 text-sm">
                                    <Step icon={Smartphone} number={1}>
                                        Open GCash, Maya or your bank app.
                                    </Step>
                                    <Step icon={ScanLine} number={2}>
                                        Scan this code. On this phone? Save the
                                        QR and upload it from your gallery.
                                    </Step>
                                    <Step icon={Wallet} number={3}>
                                        Confirm{' '}
                                        <span className="font-semibold text-foreground">
                                            {money(payment.amount)}
                                        </span>
                                        . This page updates on its own.
                                    </Step>
                                </ol>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="mt-6 h-11 w-full rounded-full"
                                >
                                    <a
                                        href={payment.qr_code ?? undefined}
                                        download={`taptale-${order.reference}.png`}
                                    >
                                        <Download className="size-4" />
                                        Save QR image
                                    </a>
                                </Button>
                            </>
                        ) : (
                            <ExpiredActions
                                reference={order.reference}
                                paymentMethodId={payment.payment_method_id}
                            />
                        )}

                        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                            <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            QR Ph payment secured by PayMongo
                        </p>
                    </div>
                </section>

                <Link
                    href={orderShow(order.reference)}
                    className="mx-auto mt-6 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to order
                </Link>
            </div>
        </>
    );
}

function QrFrame({
    qrCode,
    reference,
}: {
    qrCode: string | null;
    reference: string;
}) {
    return (
        <div className="relative mx-auto w-fit rounded-3xl bg-white p-5 shadow-lg ring-1 ring-black/5">
            {(
                [
                    'top-2 left-2',
                    'top-2 right-2 rotate-90',
                    'right-2 bottom-2 rotate-180',
                    'bottom-2 left-2 -rotate-90',
                ] as const
            ).map((position) => (
                <span
                    key={position}
                    aria-hidden
                    className={cn(
                        'absolute size-6 rounded-tl-lg border-t-[3px] border-l-[3px] border-rose',
                        position,
                    )}
                />
            ))}
            {qrCode ? (
                <img
                    src={qrCode}
                    alt={`QR Ph code to pay for order ${reference}`}
                    className="size-56 [image-rendering:pixelated] sm:size-60"
                />
            ) : (
                <div className="flex size-56 flex-col items-center justify-center gap-2 rounded-xl bg-blush-light/60 text-center sm:size-60">
                    <RefreshCw className="size-8 text-rose" />
                    <p className="px-6 text-sm font-medium text-plum">
                        This QR code has expired
                    </p>
                </div>
            )}
        </div>
    );
}

function Countdown({ secondsLeft }: { secondsLeft: number }) {
    const [totalSeconds] = useState(() => Math.max(secondsLeft, 1));
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = String(secondsLeft % 60).padStart(2, '0');
    const isEndingSoon = secondsLeft <= 60;

    return (
        <div className="mx-auto mt-5 max-w-60">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                    className={cn(
                        'h-full rounded-full transition-[width] duration-1000 ease-linear',
                        isEndingSoon ? 'bg-amber-500' : 'bg-rose',
                    )}
                    style={{
                        width: `${Math.min(100, (secondsLeft / totalSeconds) * 100)}%`,
                    }}
                />
            </div>
            <p
                className={cn(
                    'mt-2 text-center text-xs tabular-nums',
                    isEndingSoon
                        ? 'font-medium text-amber-700 dark:text-amber-400'
                        : 'text-muted-foreground',
                )}
            >
                Code expires in {minutes}:{seconds}
            </p>
        </div>
    );
}

function Step({
    icon: Icon,
    number,
    children,
}: {
    icon: typeof Smartphone;
    number: number;
    children: React.ReactNode;
}) {
    return (
        <li className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blush-light text-plum dark:bg-rose/15 dark:text-blush">
                <Icon className="size-4" aria-hidden />
                <span className="sr-only">Step {number}</span>
            </span>
            <span className="pt-1.5 text-muted-foreground">{children}</span>
        </li>
    );
}

function ExpiredActions({
    reference,
    paymentMethodId,
}: {
    reference: string;
    paymentMethodId: number | null;
}) {
    const form = useForm({ payment_method_id: paymentMethodId });
    const errors = form.errors as Record<string, string>;

    return (
        <div className="mt-6 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
                For your security, each QR code works for a limited time. Get a
                fresh one to continue — you have not been charged.
            </p>
            <InputError message={errors.payment_method_id ?? errors.payment} />
            <Button
                type="button"
                disabled={form.processing}
                className="h-11 w-full rounded-full"
                onClick={() =>
                    form.post(QrPhPaymentController.store.url(reference), {
                        preserveScroll: true,
                    })
                }
            >
                {form.processing ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    <RefreshCw className="size-4" />
                )}
                Get a new QR code
            </Button>
        </div>
    );
}

function useSecondsUntil(isoDate: string | null): number {
    const target = isoDate ? new Date(isoDate).getTime() : 0;
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(timer);
    }, []);

    return Math.max(0, Math.floor((target - now) / 1000));
}
