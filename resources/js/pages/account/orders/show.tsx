import { Head, Link, router, setLayoutProps, useForm } from "@inertiajs/react";
import {
    Banknote,
    Copy,
    ExternalLink,
    FileText,
    Gift,
    Loader2,
    Lock,
    Nfc,
    QrCode,
    ShieldCheck,
    Star,
    Truck,
    Upload,
} from "lucide-react";
import { useState } from "react";
import DesignProofController from "@/actions/App/Http/Controllers/Account/DesignProofController";
import OrderController from "@/actions/App/Http/Controllers/Account/OrderController";
import OnlinePaymentController from "@/actions/App/Http/Controllers/Account/OnlinePaymentController";
import OrderFileController from "@/actions/App/Http/Controllers/Account/OrderFileController";
import QrPhPaymentController from "@/actions/App/Http/Controllers/Account/QrPhPaymentController";
import PaymentController from "@/actions/App/Http/Controllers/Account/PaymentController";
import ReviewController from "@/actions/App/Http/Controllers/Account/ReviewController";
import InputError from "@/components/input-error";
import { FileDropzone } from "@/components/taptale/file-dropzone";
import { OrderDesignEditor } from "@/components/taptale/order-design-editor";
import { ProofApproval } from "@/components/taptale/proof-approval";
import {
    OrderPriceBreakdown,
    OrderProgress,
    OrderSpecs,
    OrderTimeline,
    Panel,
    PersonalizationDetails,
} from "@/components/taptale/order-parts";
import {
    StatusBadge,
    paymentTone,
    proofTone,
} from "@/components/taptale/status-badge";
import {
    productPalette,
    TemplatePreview,
} from "@/components/taptale/template-preview";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClipboard } from "@/hooks/use-clipboard";
import { useMoney } from "@/hooks/use-money";
import { formatDate, formatFileSize, toPesoInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import { edit as editExperience } from "@/routes/account/experiences";
import {
    index as ordersIndex,
    show as orderShow,
} from "@/routes/account/orders";
import type { Order, PaymentMethod } from "@/types";

type Props = {
    order: Order;
    paymentMethods: PaymentMethod[];
    maxUploadKilobytes: number;
};

export default function OrderShow({
    order,
    paymentMethods,
    maxUploadKilobytes,
}: Props) {
    setLayoutProps({
        breadcrumbs: [
            { title: "My orders", href: ordersIndex() },
            { title: order.reference, href: orderShow(order.reference) },
        ],
    });

    const money = useMoney();
    const [confirmCancel, setConfirmCancel] = useState(false);
    const latestProof = order.proofs?.[0] ?? null;
    const awaitingProof =
        latestProof?.status === "awaiting_response" ? latestProof : null;
    const pendingPayment = order.payments?.find(
        (payment) =>
            payment.kind === "payment" && payment.status === "submitted",
    );
    const needsPayment =
        order.accepts_payment &&
        (order.balance_due ?? 0) > 0 &&
        !pendingPayment;
    const paysOnDelivery =
        order.payment_method?.driver === "cod" &&
        !order.accepts_payment &&
        order.status !== "cancelled" &&
        (order.balance_due ?? 0) > 0;
    const designPhoto = order.files?.find(
        (file) => file.kind === "photo" && file.is_image,
    );

    return (
        <>
            <Head title={`Order ${order.reference}`} />
            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Order {order.reference}
                        </p>
                        <h1 className="mt-1 font-display text-3xl font-medium">
                            {order.product_name}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <StatusBadge tone={order.status_tone}>
                                {order.status_label}
                            </StatusBadge>
                            Placed {formatDate(order.created_at)}
                        </div>
                    </div>
                    {order.can_cancel && (
                        <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() => setConfirmCancel(true)}
                        >
                            Cancel order
                        </Button>
                    )}
                </header>

                <Panel>
                    <OrderProgress order={order} />
                </Panel>

                {needsPayment && (
                    <PaymentForm
                        order={order}
                        paymentMethods={paymentMethods}
                        maxUploadKilobytes={maxUploadKilobytes}
                    />
                )}

                {paysOnDelivery && (
                    <div className="flex gap-4 rounded-2xl border border-rose/30 bg-blush-light/50 p-5 dark:bg-rose/10">
                        <Banknote className="size-5 shrink-0 text-rose" />
                        <div className="text-sm">
                            <p className="font-medium">
                                Cash on delivery ·{" "}
                                {money(order.balance_due ?? order.total)}
                            </p>
                            <p className="mt-0.5 text-muted-foreground">
                                Nothing to pay now. Please have the exact amount
                                ready for the courier when your gift arrives.
                            </p>
                        </div>
                    </div>
                )}

                {pendingPayment && (
                    <div className="flex gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                        <Loader2 className="size-5 shrink-0 animate-spin" />
                        <div className="text-sm">
                            <p className="font-medium">
                                We're verifying your payment of{" "}
                                {money(pendingPayment.amount)}
                            </p>
                            <p className="mt-0.5 opacity-80">
                                Reference {pendingPayment.reference_number}.
                                We'll update your order as soon as it's
                                confirmed.
                            </p>
                        </div>
                    </div>
                )}

                {order.is_design_editable && (
                    <OrderDesignEditor
                        order={order}
                        maxUploadKilobytes={maxUploadKilobytes}
                    />
                )}

                {awaitingProof && (
                    <ProofApproval
                        proof={awaitingProof}
                        approveUrl={DesignProofController.approve.url({
                            order: order.reference,
                            proof: awaitingProof.id,
                        })}
                        revisionUrl={DesignProofController.requestRevision.url({
                            order: order.reference,
                            proof: awaitingProof.id,
                        })}
                    />
                )}

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-6">
                        <Panel
                            title="Your design"
                            description={order.design_mode_label}
                        >
                            <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
                                <div>
                                    {latestProof ? (
                                        <a
                                            href={latestProof.image_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block overflow-hidden rounded-2xl border"
                                        >
                                            <img
                                                src={latestProof.image_url}
                                                alt={`Design version ${latestProof.version}`}
                                                className="w-full"
                                            />
                                        </a>
                                    ) : order.design_mode === "self" &&
                                      order.design_layout ? (
                                        <div className="overflow-hidden rounded-2xl shadow">
                                            <TemplatePreview
                                                layout={order.design_layout}
                                                palette={productPalette(
                                                    order.product_art_style,
                                                )}
                                                photoUrl={designPhoto?.url}
                                                photos={order.files
                                                    ?.filter(
                                                        (file) =>
                                                            file.kind ===
                                                                "photo" &&
                                                            file.is_image,
                                                    )
                                                    .map((file) => file.url)}
                                                songTitle={
                                                    order.personalization
                                                        .song_title
                                                }
                                                artist={
                                                    order.personalization.artist
                                                }
                                                names={
                                                    order.personalization.names
                                                }
                                                date={
                                                    order.personalization.date
                                                }
                                                message={
                                                    order.personalization
                                                        .message
                                                }
                                                accent={
                                                    order.personalization.color
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                                            Our designers will share your design
                                            here.
                                        </div>
                                    )}
                                    <p className="mt-2 text-center text-xs text-muted-foreground">
                                        {latestProof
                                            ? `Design v${latestProof.version} · ${latestProof.status_label}`
                                            : order.preview_approved_at
                                              ? `Approved ${formatDate(order.preview_approved_at)} · final`
                                              : order.design_submitted_at
                                                ? `Sent to our designers ${formatDate(order.design_submitted_at)}`
                                                : "Awaiting your design"}
                                    </p>
                                </div>
                                <PersonalizationDetails order={order} />
                            </div>

                            {(order.proofs?.length ?? 0) > 1 && (
                                <div className="mt-6 border-t pt-4">
                                    <p className="mb-3 text-sm font-medium">
                                        Design history
                                    </p>
                                    <ul className="grid gap-3">
                                        {order.proofs?.slice(1).map((proof) => (
                                            <li
                                                key={proof.id}
                                                className="flex items-center gap-3 text-sm"
                                            >
                                                <a
                                                    href={proof.image_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="size-12 shrink-0 overflow-hidden rounded-lg border"
                                                >
                                                    <img
                                                        src={proof.image_url}
                                                        alt=""
                                                        className="size-full object-cover"
                                                    />
                                                </a>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium">
                                                        Version {proof.version}
                                                    </p>
                                                    {proof.customer_comment && (
                                                        <p className="truncate text-muted-foreground">
                                                            “
                                                            {
                                                                proof.customer_comment
                                                            }
                                                            ”
                                                        </p>
                                                    )}
                                                </div>
                                                <StatusBadge
                                                    tone={proofTone(
                                                        proof.status,
                                                    )}
                                                >
                                                    {proof.status_label}
                                                </StatusBadge>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </Panel>

                        <Panel
                            title="Photos & files"
                            description="Everything you've shared with our designers."
                        >
                            {(order.files?.length ?? 0) > 0 ? (
                                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                                    {order.files?.map((file) => (
                                        <li key={file.id}>
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="group block"
                                            >
                                                <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
                                                    {file.is_image ? (
                                                        <img
                                                            src={file.url}
                                                            alt={
                                                                file.original_name
                                                            }
                                                            className="size-full object-cover transition group-hover:scale-105"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="flex size-full items-center justify-center">
                                                            <FileText className="size-6 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                                                    {file.kind_label} ·{" "}
                                                    {formatFileSize(file.size)}
                                                </p>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No files uploaded yet.
                                </p>
                            )}
                            {order.status !== "completed" &&
                                order.status !== "cancelled" &&
                                !order.is_design_approved && (
                                    <UploadFiles
                                        order={order}
                                        maxUploadKilobytes={maxUploadKilobytes}
                                    />
                                )}
                        </Panel>

                        {order.is_reviewable && <ReviewPanel order={order} />}

                        <Panel title="Order updates">
                            <OrderTimeline
                                activities={order.activities ?? []}
                            />
                        </Panel>
                    </div>

                    <div className="space-y-6">
                        {order.experience && <ExperienceCard order={order} />}

                        <Panel title="Summary">
                            <OrderSpecs order={order} />
                            <div className="mt-5 border-t pt-4">
                                <OrderPriceBreakdown order={order} />
                            </div>
                        </Panel>

                        {(order.payments?.length ?? 0) > 0 && (
                            <Panel title="Payments">
                                <ul className="space-y-3 text-sm">
                                    {order.payments?.map((payment) => (
                                        <li
                                            key={payment.id}
                                            className="rounded-xl bg-muted/50 p-3"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium">
                                                    {payment.kind === "refund"
                                                        ? "Refund"
                                                        : (payment.method ??
                                                          "Payment")}{" "}
                                                    · {money(payment.amount)}
                                                </span>
                                                <StatusBadge
                                                    tone={paymentTone(
                                                        payment.status,
                                                    )}
                                                >
                                                    {payment.status_label}
                                                </StatusBadge>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {formatDate(payment.created_at)}
                                                {payment.reference_number &&
                                                    ` · Ref ${payment.reference_number}`}
                                            </p>
                                            {payment.status === "rejected" &&
                                                payment.review_notes && (
                                                    <p className="mt-2 text-xs text-rose">
                                                        {payment.review_notes}
                                                    </p>
                                                )}
                                        </li>
                                    ))}
                                </ul>
                            </Panel>
                        )}

                        <Panel title="Delivery">
                            <address className="text-sm leading-relaxed not-italic">
                                <span className="font-medium">
                                    {order.customer_name}
                                </span>
                                <br />
                                {order.address_line}
                                <br />
                                {order.city}, {order.province}{" "}
                                {order.postal_code}
                                <br />
                                {order.customer_phone}
                            </address>
                            {(order.tracking_number || order.tracking_url) && (
                                <div className="mt-4 rounded-xl bg-blush-light/50 p-3 text-sm dark:bg-rose/10">
                                    <div className="flex items-center gap-3">
                                        <Truck className="size-5 shrink-0 text-rose" />
                                        <div className="min-w-0">
                                            <p className="font-medium">
                                                {order.courier ?? "Courier"}
                                            </p>
                                            {order.tracking_number && (
                                                <p className="text-muted-foreground">
                                                    Tracking no.{" "}
                                                    <span className="font-mono">
                                                        {order.tracking_number}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {order.tracking_url && (
                                        <Button
                                            asChild
                                            size="sm"
                                            className="mt-3 w-full rounded-full"
                                        >
                                            <a
                                                href={order.tracking_url}
                                                target="_blank"
                                                rel="noreferrer noopener"
                                            >
                                                <ExternalLink className="size-4" />{" "}
                                                Track my package
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            )}
                            {order.is_gift && (
                                <div className="mt-4 flex gap-3 rounded-xl bg-muted/60 p-3 text-sm">
                                    <Gift className="size-5 shrink-0 text-rose" />
                                    <div>
                                        <p className="font-medium">
                                            Sent as a gift
                                        </p>
                                        <p className="text-muted-foreground">
                                            No prices on the packing slip.
                                        </p>
                                        {order.gift_message && (
                                            <p className="mt-1 whitespace-pre-line italic">
                                                “{order.gift_message}”
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Panel>
                    </div>
                </div>
            </div>

            <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
                <DialogContent>
                    <DialogTitle>Cancel this order?</DialogTitle>
                    <DialogDescription>
                        Your order {order.reference} will be cancelled. This
                        can't be undone, but you can always create a new gift.
                    </DialogDescription>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Keep my order</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={() =>
                                router.post(
                                    OrderController.cancel.url(order.reference),
                                    {},
                                    {
                                        onFinish: () => setConfirmCancel(false),
                                    },
                                )
                            }
                        >
                            Yes, cancel it
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function PaymentForm({ order, paymentMethods, maxUploadKilobytes }: Props) {
    const money = useMoney();
    const form = useForm<{
        payment_method_id: number | null;
        amount: string;
        reference_number: string;
        proof: File | null;
        notes: string;
    }>({
        payment_method_id:
            order.payment_method?.id ?? paymentMethods[0]?.id ?? null,
        amount: toPesoInput(order.balance_due ?? order.total),
        reference_number: "",
        proof: null,
        notes: "",
    });
    const method = paymentMethods.find(
        (item) => item.id === form.data.payment_method_id,
    );
    const isOnline =
        method?.driver === "paymongo" || method?.driver === "paymongo_qrph";
    const hasOpenCheckout =
        order.payments?.some((payment) => payment.status === "pending") ??
        false;
    const [, copy] = useClipboard();

    return (
        <section className="overflow-hidden rounded-2xl border-2 border-rose/40 bg-card">
            <div className="bg-blush-light/60 px-5 py-4 dark:bg-rose/10">
                <h2 className="font-display text-xl">Complete your payment</h2>
                <p className="text-sm text-muted-foreground">
                    Balance due:{" "}
                    <span className="font-semibold text-plum dark:text-blush">
                        {money(order.balance_due ?? order.total)}
                    </span>
                    . We'll start on your design once it's verified.
                </p>
            </div>
            <form
                className="grid gap-6 p-5 md:grid-cols-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(PaymentController.store.url(order.reference), {
                        forceFormData: true,
                        preserveScroll: true,
                        onSuccess: () => form.reset(),
                    });
                }}
            >
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Pay with</Label>
                        <div className="flex flex-wrap gap-2">
                            {paymentMethods.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() =>
                                        form.setData(
                                            "payment_method_id",
                                            item.id,
                                        )
                                    }
                                    className={cn(
                                        "rounded-full border-2 px-4 py-1.5 text-sm transition",
                                        form.data.payment_method_id === item.id
                                            ? "border-rose bg-blush-light/50 dark:bg-rose/10"
                                            : "border-border",
                                    )}
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                        <InputError message={form.errors.payment_method_id} />
                    </div>
                    {method && !isOnline && (
                        <div className="rounded-xl bg-muted/60 p-4 text-sm">
                            {method.account_name && (
                                <p className="text-muted-foreground">
                                    Account name:{" "}
                                    <span className="font-medium text-foreground">
                                        {method.account_name}
                                    </span>
                                </p>
                            )}
                            {method.account_number && (
                                <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                                    Account no.:{" "}
                                    <span className="font-mono font-medium text-foreground">
                                        {method.account_number}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            copy(method.account_number ?? "")
                                        }
                                        className="rounded p-1 hover:bg-background"
                                        aria-label="Copy account number"
                                    >
                                        <Copy className="size-3.5" />
                                    </button>
                                </p>
                            )}
                            {method.instructions && (
                                <p className="mt-2 text-muted-foreground">
                                    {method.instructions}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                {isOnline && method ? (
                    <OnlineCheckout
                        key={method.id}
                        order={order}
                        paymentMethodId={method.id}
                        isTaptaleQr={method.driver === "paymongo_qrph"}
                        hasOpenCheckout={hasOpenCheckout}
                    />
                ) : (
                    <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="amount">Amount paid</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    inputMode="decimal"
                                    value={form.data.amount}
                                    onChange={(event) =>
                                        form.setData(
                                            "amount",
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.amount} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="reference_number">
                                    Reference no.
                                </Label>
                                <Input
                                    id="reference_number"
                                    value={form.data.reference_number}
                                    onChange={(event) =>
                                        form.setData(
                                            "reference_number",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="From your receipt"
                                />
                                <InputError
                                    message={form.errors.reference_number}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Receipt screenshot</Label>
                            <FileDropzone
                                id="proof"
                                files={form.data.proof ? [form.data.proof] : []}
                                onChange={(files) =>
                                    form.setData("proof", files[0] ?? null)
                                }
                                maxFiles={1}
                                maxKilobytes={maxUploadKilobytes}
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                label="Upload receipt"
                                hint="Screenshot or photo of your payment confirmation"
                                error={form.errors.proof}
                            />
                        </div>
                        <InputError
                            message={
                                (form.errors as Record<string, string>).payment
                            }
                        />
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="h-11 w-full rounded-full"
                        >
                            {form.processing && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            Submit payment for verification
                        </Button>
                    </div>
                )}
            </form>
        </section>
    );
}

function OnlineCheckout({
    order,
    paymentMethodId,
    isTaptaleQr,
    hasOpenCheckout,
}: {
    order: Order;
    paymentMethodId: number;
    isTaptaleQr: boolean;
    hasOpenCheckout: boolean;
}) {
    const money = useMoney();
    const form = useForm({ payment_method_id: paymentMethodId });
    const errors = form.errors as Record<string, string>;

    return (
        <div className="space-y-4">
            <div className="flex gap-3 rounded-xl bg-muted/60 p-4 text-sm">
                <ShieldCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                    <p className="font-medium text-foreground">
                        {isTaptaleQr
                            ? "Scan a QR Ph code — secured by PayMongo"
                            : "Secure checkout by PayMongo"}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                        {isTaptaleQr
                            ? "Scan with GCash, Maya or any bank app. Your order updates automatically once the payment goes through."
                            : "You'll pay on PayMongo's encrypted page — we never see your card or wallet details. Your order updates automatically once the payment goes through."}
                    </p>
                </div>
            </div>
            <InputError message={errors.payment_method_id ?? errors.payment} />
            <Button
                type="button"
                disabled={form.processing}
                className="h-11 w-full rounded-full"
                onClick={() =>
                    form.post(
                        isTaptaleQr
                            ? QrPhPaymentController.store.url(order.reference)
                            : OnlinePaymentController.store.url(
                                  order.reference,
                              ),
                        { preserveScroll: true },
                    )
                }
            >
                {form.processing ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : isTaptaleQr ? (
                    <QrCode className="size-4" />
                ) : (
                    <Lock className="size-4" />
                )}
                {isTaptaleQr ? "Show QR code for" : "Pay"}{" "}
                {money(order.balance_due ?? order.total)}
                {isTaptaleQr ? "" : " securely"}
            </Button>
            {hasOpenCheckout && !isTaptaleQr && (
                <p className="text-center text-sm text-muted-foreground">
                    Already paid?{" "}
                    <Link
                        href={OnlinePaymentController.complete(order.reference)}
                        className="font-medium text-foreground underline underline-offset-4"
                    >
                        Check payment status
                    </Link>
                </p>
            )}
        </div>
    );
}

function UploadFiles({
    order,
    maxUploadKilobytes,
}: {
    order: Order;
    maxUploadKilobytes: number;
}) {
    const [open, setOpen] = useState(false);
    const form = useForm<{ files: File[]; note: string }>({
        files: [],
        note: "",
    });
    const fileError = Object.entries(form.errors).find(([key]) =>
        key.startsWith("files"),
    )?.[1];

    if (!open) {
        return (
            <Button
                variant="outline"
                className="mt-4 rounded-full"
                onClick={() => setOpen(true)}
            >
                <Upload className="size-4" /> Upload more photos or files
            </Button>
        );
    }

    return (
        <form
            className="mt-5 space-y-3 border-t pt-5"
            onSubmit={(event) => {
                event.preventDefault();
                form.post(OrderFileController.store.url(order.reference), {
                    forceFormData: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        form.reset();
                        setOpen(false);
                    },
                });
            }}
        >
            <FileDropzone
                id="additional-files"
                files={form.data.files}
                onChange={(files) => form.setData("files", files)}
                maxFiles={5}
                maxKilobytes={maxUploadKilobytes}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                label="Add photos or PDFs"
                error={fileError}
            />
            <Textarea
                value={form.data.note}
                onChange={(event) => form.setData("note", event.target.value)}
                placeholder="Add a note for our designers (optional)"
                rows={2}
            />
            <div className="flex gap-2">
                <Button
                    type="submit"
                    disabled={form.processing || form.data.files.length === 0}
                    className="rounded-full"
                >
                    {form.processing && (
                        <Loader2 className="size-4 animate-spin" />
                    )}{" "}
                    Upload
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    className="rounded-full"
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}

function ExperienceCard({ order }: { order: Order }) {
    const experience = order.experience!;

    return (
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-plum to-plum-dark p-5 text-white">
            <div className="flex items-center gap-2 text-blush">
                <Nfc className="size-5" />
                <p className="text-xs font-semibold tracking-[0.2em] uppercase">
                    Tap memory page
                </p>
            </div>
            <p className="mt-2 font-display text-xl">{experience.title}</p>
            <p className="text-sm text-white/70">
                {experience.is_published
                    ? `Live · ${experience.view_count ?? 0} opens`
                    : "Not published yet — add your photos and message."}
            </p>
            <div className="mt-4 flex items-center gap-4">
                {experience.qr_url && (
                    <img
                        src={experience.qr_url}
                        alt="QR code for your memory page"
                        className="size-24 rounded-xl bg-white p-1.5"
                    />
                )}
                <div className="min-w-0 space-y-2 text-sm">
                    <p className="text-xs text-white/70">
                        Whoever taps the keychain can share the page with a link
                        that lasts up to 30 days.
                    </p>
                    <a
                        href={experience.public_url ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-white/80 hover:text-white"
                    >
                        <ExternalLink className="size-3.5" /> Open page
                    </a>
                </div>
            </div>
            <Button
                asChild
                className="mt-4 w-full rounded-full bg-cream text-plum hover:bg-white"
            >
                <Link href={editExperience(experience.code)}>
                    Manage memory page
                </Link>
            </Button>
        </section>
    );
}

function ReviewPanel({ order }: { order: Order }) {
    const form = useForm({
        rating: 5,
        quote: "",
        author_name: order.customer_name.split(" ")[0] ?? "",
    });
    const review = order.review;

    if (review) {
        return (
            <Panel title="Your review">
                <div id="review" className="scroll-mt-24">
                    <Stars rating={review.rating} />
                    <p className="mt-2 text-sm whitespace-pre-line">
                        “{review.quote}”
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                        — {review.author_name} ·{" "}
                        {review.is_published
                            ? "Shown on our website. Thank you!"
                            : "Thank you! We show reviews after a quick check."}
                    </p>
                </div>
            </Panel>
        );
    }

    return (
        <Panel
            title="How did we do?"
            description="Your review helps other gift-givers. We show it on our website after a quick check."
        >
            <form
                id="review"
                className="scroll-mt-24 space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(ReviewController.store.url(order.reference), {
                        preserveScroll: true,
                    });
                }}
            >
                <div
                    className="flex gap-1"
                    role="radiogroup"
                    aria-label="Rating"
                >
                    {[1, 2, 3, 4, 5].map((value) => (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={form.data.rating === value}
                            aria-label={`${value} star${value > 1 ? "s" : ""}`}
                            onClick={() => form.setData("rating", value)}
                            className="text-amber-400 transition hover:scale-110"
                        >
                            <Star
                                className={cn(
                                    "size-7",
                                    value <= form.data.rating && "fill-current",
                                )}
                            />
                        </button>
                    ))}
                </div>
                <InputError message={form.errors.rating} />
                <div className="grid gap-2">
                    <Label htmlFor="review-quote">Your review</Label>
                    <Textarea
                        id="review-quote"
                        value={form.data.quote}
                        onChange={(event) =>
                            form.setData("quote", event.target.value)
                        }
                        rows={4}
                        maxLength={1000}
                        placeholder="She cried when she tapped it…"
                    />
                    <InputError message={form.errors.quote} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="review-name">Name to show</Label>
                    <Input
                        id="review-name"
                        value={form.data.author_name}
                        onChange={(event) =>
                            form.setData("author_name", event.target.value)
                        }
                        maxLength={80}
                    />
                    <InputError message={form.errors.author_name} />
                </div>
                <InputError
                    message={
                        (form.errors as Record<string, string | undefined>)
                            .review
                    }
                />
                <Button
                    type="submit"
                    disabled={form.processing}
                    className="rounded-full"
                >
                    {form.processing && (
                        <Loader2 className="size-4 animate-spin" />
                    )}{" "}
                    Send review
                </Button>
            </form>
        </Panel>
    );
}

function Stars({ rating }: { rating: number }) {
    return (
        <div
            className="flex gap-0.5 text-amber-400"
            aria-label={`${rating} out of 5`}
        >
            {[1, 2, 3, 4, 5].map((value) => (
                <Star
                    key={value}
                    className={cn("size-5", value <= rating && "fill-current")}
                />
            ))}
        </div>
    );
}
