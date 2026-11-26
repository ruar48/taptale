import { Head, Link, router, setLayoutProps, useForm } from "@inertiajs/react";
import {
    BadgeCheck,
    Banknote,
    Check,
    Copy,
    ExternalLink,
    FileText,
    Gift,
    Link2,
    Loader2,
    Mail,
    Nfc,
    Phone,
    Printer,
} from "lucide-react";
import { useState } from "react";
import ExperienceController from "@/actions/App/Http/Controllers/Admin/ExperienceController";
import OrderController from "@/actions/App/Http/Controllers/Admin/OrderController";
import PaymentController from "@/actions/App/Http/Controllers/Admin/PaymentController";
import InputError from "@/components/input-error";
import { AdminPage, FormField } from "@/components/taptale/admin-ui";
import {
    OrderPriceBreakdown,
    OrderSpecs,
    OrderTimeline,
    Panel,
    PersonalizationDetails,
} from "@/components/taptale/order-parts";
import {
    StatusBadge,
    paymentTone,
} from "@/components/taptale/status-badge";
import {
    productPalette,
    TemplatePreview,
} from "@/components/taptale/template-preview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClipboard } from "@/hooks/use-clipboard";
import { useConfirm } from "@/hooks/use-confirm";
import { useMoney } from "@/hooks/use-money";
import { formatDate, formatFileSize, toPesoInput } from "@/lib/money";
import { edit as experienceEdit } from "@/routes/account/experiences";
import { show as customerShow } from "@/routes/admin/customers";
import { index as ordersIndex, show as orderShow } from "@/routes/admin/orders";
import { index as reviewsIndex } from "@/routes/admin/reviews";
import type { Order, StatusOption } from "@/types";

export default function AdminOrderShow({
    order,
    statuses,
    websiteEditUrl,
    templates,
}: {
    order: Order;
    statuses: StatusOption[];
    websiteEditUrl: string | null;
    templates: { value: string; label: string }[];
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: "Orders", href: ordersIndex() },
            { title: order.reference, href: orderShow(order.reference) },
        ],
    });

    const money = useMoney();
    const designPhoto = order.files?.find(
        (file) => file.kind === "photo" && file.is_image,
    );

    return (
        <>
            <Head title={`Order ${order.reference}`} />
            <AdminPage>
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Placed {formatDate(order.created_at, true)}
                            {order.channel !== "website" &&
                                ` · ${order.channel_label} order`}
                        </p>
                        <h1 className="mt-1 font-display text-3xl font-medium">
                            {order.reference}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusBadge tone={order.status_tone}>
                                {order.status_label}
                            </StatusBadge>
                            <span className="text-sm text-muted-foreground">
                                {order.product_name} · {order.quantity} pcs ·{" "}
                                {money(order.total)}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <a
                                href={OrderController.packingSlip.url(
                                    order.reference,
                                )}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Printer className="size-4" /> Packing slip
                            </a>
                        </Button>
                    </div>
                </header>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-6">
                        <Panel
                            title="Customization"
                            description={order.design_mode_label}
                        >
                            <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
                                {order.design_mode === "self" &&
                                order.design_layout ? (
                                    <div>
                                        <div className="overflow-hidden rounded-xl border">
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
                                        <p className="mt-2 text-center text-xs text-muted-foreground">
                                            {order.product_name}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex aspect-[4/5] items-center justify-center rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
                                        Custom design requested
                                    </div>
                                )}
                                <PersonalizationDetails order={order} />
                            </div>
                        </Panel>

                        <Panel
                            title="Customer files"
                            description={`${order.files?.length ?? 0} files`}
                        >
                            {(order.files?.length ?? 0) === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    The customer hasn't uploaded any files.
                                </p>
                            ) : (
                                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
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
                                                <p className="mt-1 truncate text-[11px]">
                                                    {file.original_name}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {file.kind_label} ·{" "}
                                                    {formatFileSize(file.size)}
                                                </p>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>


                        <Panel title="Timeline & notes">
                            <NoteForm order={order} />
                            <div className="mt-6">
                                <OrderTimeline
                                    activities={order.activities ?? []}
                                    showAuthors
                                />
                            </div>
                        </Panel>
                    </div>

                    <div className="space-y-6">
                        {order.experience ? (
                            <ExperiencePanel order={order} />
                        ) : (
                            <CreateWebsitePanel
                                order={order}
                                templates={templates}
                            />
                        )}
                        <StatusPanel order={order} statuses={statuses} />
                        {order.experience && (
                            <WebsiteEditLinkPanel
                                order={order}
                                editUrl={websiteEditUrl}
                            />
                        )}
                        <PaymentsPanel order={order} />

                        <Panel title="Order summary">
                            <OrderSpecs order={order} />
                            <div className="mt-5 border-t pt-4">
                                <OrderPriceBreakdown order={order} />
                            </div>
                            <AdjustmentForm order={order} />
                        </Panel>

                        <Panel title="Customer & delivery">
                            <div className="space-y-1 text-sm">
                                <p className="font-medium">
                                    {order.customer_name}
                                </p>
                                {order.customer_email && (
                                    <p className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="size-3.5" />{" "}
                                        {order.customer_email}
                                    </p>
                                )}
                                {order.customer_phone && (
                                    <p className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="size-3.5" />{" "}
                                        {order.customer_phone}
                                    </p>
                                )}
                                {order.address_line || order.city ? (
                                    <address className="pt-2 not-italic">
                                        {order.address_line}
                                        <br />
                                        {[order.city, order.province]
                                            .filter(Boolean)
                                            .join(", ")}{" "}
                                        {order.postal_code}
                                    </address>
                                ) : (
                                    <p className="pt-2 text-muted-foreground">
                                        No delivery address (pickup, or not
                                        given yet).
                                    </p>
                                )}
                                {order.user && (
                                    <Link
                                        href={customerShow(order.user.id)}
                                        className="inline-block pt-2 text-sm font-medium text-plum hover:underline dark:text-blush"
                                    >
                                        View customer profile →
                                    </Link>
                                )}
                            </div>
                            {order.is_gift && (
                                <div className="mt-4 rounded-xl bg-blush-light/50 p-3 text-sm dark:bg-rose/10">
                                    <p className="flex items-center gap-1.5 font-medium">
                                        <Gift className="size-4 text-rose" />{" "}
                                        Gift order — leave prices out
                                    </p>
                                    {order.gift_message && (
                                        <p className="mt-1 whitespace-pre-line italic">
                                            “{order.gift_message}”
                                        </p>
                                    )}
                                </div>
                            )}
                            <ShippingForm order={order} />
                        </Panel>

                        {order.review && (
                            <Panel title="Customer review">
                                <p className="text-sm text-amber-500">
                                    {"★".repeat(order.review.rating)}
                                    <span className="text-muted-foreground/40">
                                        {"★".repeat(5 - order.review.rating)}
                                    </span>
                                </p>
                                <p className="mt-1 text-sm whitespace-pre-line">
                                    “{order.review.quote}”
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    — {order.review.author_name} ·{" "}
                                    {order.review.is_published
                                        ? "Published"
                                        : "Waiting for approval"}{" "}
                                    ·{" "}
                                    <Link
                                        href={reviewsIndex()}
                                        className="font-medium text-plum hover:underline dark:text-blush"
                                    >
                                        Manage reviews
                                    </Link>
                                </p>
                            </Panel>
                        )}
                    </div>
                </div>
            </AdminPage>
        </>
    );
}

function WebsiteEditLinkPanel({
    order,
    editUrl,
}: {
    order: Order;
    editUrl: string | null;
}) {
    const [copiedText, copy] = useClipboard();
    const [processing, setProcessing] = useState(false);
    const { confirm, confirmDialog } = useConfirm();
    const visitOptions = {
        preserveScroll: true,
        onStart: () => setProcessing(true),
        onFinish: () => setProcessing(false),
    };
    const issueLink = () =>
        router.post(
            OrderController.issueApprovalLink.url(order.reference),
            {},
            visitOptions,
        );

    return (
        <Panel
            title="Website edit link"
            description="Send this to the customer on Messenger. They add their photos and words to the website, no account needed. When they are done, link the NFC tag below."
        >
            {editUrl ? (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            readOnly
                            value={editUrl}
                            onFocus={(event) => event.target.select()}
                            className="font-mono text-xs"
                            aria-label="Website edit link"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => void copy(editUrl)}
                            aria-label="Copy website edit link"
                        >
                            {copiedText === editUrl ? (
                                <Check className="size-4 text-emerald-600" />
                            ) : (
                                <Copy className="size-4" />
                            )}
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                            <a
                                href={editUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink className="size-4" /> Open
                            </a>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={processing}
                            onClick={async () => {
                                const isConfirmed = await confirm({
                                    title: "Create a new link?",
                                    description:
                                        "The link you already sent will stop working.",
                                    confirmLabel: "Create new link",
                                });

                                if (isConfirmed) {
                                    issueLink();
                                }
                            }}
                        >
                            New link
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={processing}
                            className="text-destructive"
                            onClick={() =>
                                router.delete(
                                    OrderController.revokeApprovalLink.url(
                                        order.reference,
                                    ),
                                    visitOptions,
                                )
                            }
                        >
                            Turn off
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={processing}
                    onClick={issueLink}
                >
                    <Link2 className="size-4" /> Create website edit link
                </Button>
            )}

            {confirmDialog}
        </Panel>
    );
}

function StatusPanel({
    order,
    statuses,
}: {
    order: Order;
    statuses: StatusOption[];
}) {
    const form = useForm({ status: order.status, note: "" });

    return (
        <Panel title="Order status">
            <form
                className="space-y-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.put(
                        OrderController.updateStatus.url(order.reference),
                        {
                            preserveScroll: true,
                            onSuccess: () => form.setData("note", ""),
                        },
                    );
                }}
            >
                <Select
                    value={form.data.status}
                    onValueChange={(value) => form.setData("status", value)}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {statuses.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                                {status.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Textarea
                    value={form.data.note}
                    onChange={(event) =>
                        form.setData("note", event.target.value)
                    }
                    placeholder="Note for the customer (optional, shown on their timeline)"
                    rows={2}
                />
                <InputError message={form.errors.status} />
                <Button
                    type="submit"
                    className="w-full"
                    disabled={
                        form.processing ||
                        form.data.status === order.status
                    }
                >
                    {form.processing && (
                        <Loader2 className="size-4 animate-spin" />
                    )}{" "}
                    Update status
                </Button>
            </form>
        </Panel>
    );
}

function PaymentsPanel({ order }: { order: Order }) {
    const money = useMoney();
    const [rejecting, setRejecting] = useState<number | null>(null);
    const rejectForm = useForm({ review_notes: "" });
    const [refunding, setRefunding] = useState(false);
    const refundForm = useForm({ amount: "", reference_number: "", notes: "" });
    const [recording, setRecording] = useState(false);
    const recordForm = useForm({
        amount: toPesoInput(order.balance_due ?? 0),
        reference_number: "",
        notes: "",
    });
    const canRecordPayment =
        (order.balance_due ?? 0) > 0 && order.status !== "cancelled";

    return (
        <Panel
            title="Payments"
            description={
                order.payment_method
                    ? `Chosen method: ${order.payment_method.name}`
                    : undefined
            }
        >
            {(order.payments?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No payments submitted yet.
                </p>
            ) : (
                <ul className="space-y-3">
                    {order.payments?.map((payment) => (
                        <li
                            key={payment.id}
                            className="rounded-xl border p-3 text-sm"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">
                                    {payment.kind === "refund"
                                        ? "Refund"
                                        : (payment.method ?? "Payment")}{" "}
                                    · {money(payment.amount)}
                                </span>
                                <StatusBadge tone={paymentTone(payment.status)}>
                                    {payment.status_label}
                                </StatusBadge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {formatDate(payment.created_at, true)}
                                {payment.reference_number &&
                                    ` · Ref ${payment.reference_number}`}
                            </p>
                            {payment.notes && (
                                <p className="mt-1 text-xs">{payment.notes}</p>
                            )}
                            {payment.review_notes && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Review: {payment.review_notes}
                                </p>
                            )}
                            {payment.proof_url && (
                                <a
                                    href={payment.proof_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-plum hover:underline dark:text-blush"
                                >
                                    <ExternalLink className="size-3" /> View
                                    receipt
                                </a>
                            )}
                            {payment.status === "submitted" &&
                                payment.kind === "payment" &&
                                (rejecting === payment.id ? (
                                    <form
                                        className="mt-3 space-y-2"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            rejectForm.post(
                                                PaymentController.reject.url(
                                                    payment.id,
                                                ),
                                                {
                                                    preserveScroll: true,
                                                    onSuccess: () => {
                                                        rejectForm.reset();
                                                        setRejecting(null);
                                                    },
                                                },
                                            );
                                        }}
                                    >
                                        <Textarea
                                            value={rejectForm.data.review_notes}
                                            onChange={(event) =>
                                                rejectForm.setData(
                                                    "review_notes",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Reason shown to the customer"
                                            rows={2}
                                            autoFocus
                                        />
                                        <InputError
                                            message={
                                                rejectForm.errors.review_notes
                                            }
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                disabled={rejectForm.processing}
                                            >
                                                Reject payment
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                type="button"
                                                onClick={() =>
                                                    setRejecting(null)
                                                }
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="mt-3 flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                router.post(
                                                    PaymentController.verify.url(
                                                        payment.id,
                                                    ),
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <BadgeCheck className="size-4" />{" "}
                                            Verify
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setRejecting(payment.id)
                                            }
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                ))}
                        </li>
                    ))}
                </ul>
            )}

            {canRecordPayment &&
                (recording ? (
                    <form
                        className="mt-4 space-y-2 rounded-xl bg-muted/40 p-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            recordForm.post(
                                PaymentController.record.url(order.reference),
                                {
                                    preserveScroll: true,
                                    onSuccess: () => setRecording(false),
                                },
                            );
                        }}
                    >
                        <p className="text-sm font-medium">
                            Record a payment received
                        </p>
                        <p className="text-xs text-muted-foreground">
                            For cash collected on delivery or money received
                            outside the website.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                type="number"
                                step="0.01"
                                min="1"
                                placeholder={`Max ${toPesoInput(order.balance_due)}`}
                                value={recordForm.data.amount}
                                onChange={(event) =>
                                    recordForm.setData(
                                        "amount",
                                        event.target.value,
                                    )
                                }
                            />
                            <Input
                                placeholder="Reference no. (optional)"
                                value={recordForm.data.reference_number}
                                onChange={(event) =>
                                    recordForm.setData(
                                        "reference_number",
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                        <InputError message={recordForm.errors.amount} />
                        <Textarea
                            placeholder="Notes, e.g. collected by J&T on delivery"
                            value={recordForm.data.notes}
                            onChange={(event) =>
                                recordForm.setData("notes", event.target.value)
                            }
                            rows={2}
                        />
                        <InputError message={recordForm.errors.notes} />
                        <div className="flex gap-2">
                            <Button size="sm" disabled={recordForm.processing}>
                                Record payment
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                type="button"
                                onClick={() => setRecording(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 mr-2"
                        onClick={() => {
                            recordForm.setData(
                                "amount",
                                toPesoInput(order.balance_due ?? 0),
                            );
                            setRecording(true);
                        }}
                    >
                        <Banknote className="size-4" /> Record payment
                    </Button>
                ))}

            {(order.amount_paid ?? 0) > 0 &&
                (refunding ? (
                    <form
                        className="mt-4 space-y-2 rounded-xl bg-muted/40 p-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            refundForm.post(
                                PaymentController.refund.url(order.reference),
                                {
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        refundForm.reset();
                                        setRefunding(false);
                                    },
                                },
                            );
                        }}
                    >
                        <p className="text-sm font-medium">Record a refund</p>
                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                type="number"
                                step="0.01"
                                min="1"
                                placeholder={`Max ${toPesoInput(order.amount_paid)}`}
                                value={refundForm.data.amount}
                                onChange={(event) =>
                                    refundForm.setData(
                                        "amount",
                                        event.target.value,
                                    )
                                }
                            />
                            <Input
                                placeholder="Reference no."
                                value={refundForm.data.reference_number}
                                onChange={(event) =>
                                    refundForm.setData(
                                        "reference_number",
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                        <InputError message={refundForm.errors.amount} />
                        <Textarea
                            placeholder="Reason for the refund"
                            value={refundForm.data.notes}
                            onChange={(event) =>
                                refundForm.setData("notes", event.target.value)
                            }
                            rows={2}
                        />
                        <InputError message={refundForm.errors.notes} />
                        <div className="flex gap-2">
                            <Button size="sm" disabled={refundForm.processing}>
                                Record refund
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                type="button"
                                onClick={() => setRefunding(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3"
                        onClick={() => setRefunding(true)}
                    >
                        Issue a refund
                    </Button>
                ))}
        </Panel>
    );
}

function AdjustmentForm({ order }: { order: Order }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        adjustment: toPesoInput(order.adjustment),
        adjustment_note: order.adjustment_note ?? "",
    });

    if (!open) {
        return (
            <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setOpen(true)}
            >
                Adjust total
            </Button>
        );
    }

    return (
        <form
            className="mt-4 space-y-2 rounded-xl bg-muted/40 p-3"
            onSubmit={(event) => {
                event.preventDefault();
                form.put(OrderController.adjust.url(order.reference), {
                    preserveScroll: true,
                    onSuccess: () => setOpen(false),
                });
            }}
        >
            <FormField
                label="Adjustment (₱)"
                error={form.errors.adjustment}
                hint="Negative for a discount, positive for an extra charge."
            >
                <Input
                    type="number"
                    step="0.01"
                    value={form.data.adjustment}
                    onChange={(event) =>
                        form.setData("adjustment", event.target.value)
                    }
                />
            </FormField>
            <FormField label="Reason" error={form.errors.adjustment_note}>
                <Input
                    value={form.data.adjustment_note}
                    onChange={(event) =>
                        form.setData("adjustment_note", event.target.value)
                    }
                    placeholder="e.g. Loyalty discount"
                />
            </FormField>
            <div className="flex gap-2">
                <Button size="sm" disabled={form.processing}>
                    Save adjustment
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => setOpen(false)}
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}

function ShippingForm({ order }: { order: Order }) {
    const form = useForm({
        courier: order.courier ?? "",
        tracking_number: order.tracking_number ?? "",
        tracking_url: order.tracking_url ?? "",
    });

    return (
        <form
            className="mt-5 space-y-2 border-t pt-4"
            onSubmit={(event) => {
                event.preventDefault();
                form.put(OrderController.updateShipping.url(order.reference), {
                    preserveScroll: true,
                });
            }}
        >
            <p className="text-sm font-medium">Shipping</p>
            <div className="grid grid-cols-2 gap-2">
                <Input
                    value={form.data.courier}
                    onChange={(event) =>
                        form.setData("courier", event.target.value)
                    }
                    placeholder="Courier (e.g. J&T)"
                />
                <Input
                    value={form.data.tracking_number}
                    onChange={(event) =>
                        form.setData("tracking_number", event.target.value)
                    }
                    placeholder="Tracking no."
                />
            </div>
            <Input
                type="url"
                value={form.data.tracking_url}
                onChange={(event) =>
                    form.setData("tracking_url", event.target.value)
                }
                placeholder="Tracking link (customer gets a “Track my package” button)"
            />
            <InputError
                message={
                    form.errors.courier ??
                    form.errors.tracking_number ??
                    form.errors.tracking_url
                }
            />
            <Button
                size="sm"
                variant="outline"
                disabled={form.processing || !form.isDirty}
            >
                Save shipping details
            </Button>
        </form>
    );
}

function NoteForm({ order }: { order: Order }) {
    const form = useForm({ body: "", is_internal: true });

    return (
        <form
            className="space-y-2"
            onSubmit={(event) => {
                event.preventDefault();
                form.post(OrderController.storeNote.url(order.reference), {
                    preserveScroll: true,
                    onSuccess: () => form.reset(),
                });
            }}
        >
            <Textarea
                value={form.data.body}
                onChange={(event) => form.setData("body", event.target.value)}
                placeholder="Add a note…"
                rows={2}
            />
            <InputError message={form.errors.body} />
            <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                        checked={!form.data.is_internal}
                        onCheckedChange={(value) =>
                            form.setData("is_internal", value !== true)
                        }
                    />
                    Visible to customer
                </label>
                <Button
                    size="sm"
                    disabled={form.processing || !form.data.body.trim()}
                >
                    Add note
                </Button>
            </div>
        </form>
    );
}

function CreateWebsitePanel({
    order,
    templates,
}: {
    order: Order;
    templates: { value: string; label: string }[];
}) {
    const form = useForm({ experience_template: templates[0]?.value ?? "" });

    return (
        <Panel
            title="NFC & QR"
            description="This order has no website yet. Pick a template to create one, then send the customer the edit link and program the tag."
        >
            <form
                className="space-y-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(
                        OrderController.createWebsite.url(order.reference),
                        { preserveScroll: true },
                    );
                }}
            >
                <Select
                    value={form.data.experience_template}
                    onValueChange={(value) =>
                        form.setData("experience_template", value)
                    }
                >
                    <SelectTrigger aria-label="Website template">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {templates.map((template) => (
                            <SelectItem
                                key={template.value}
                                value={template.value}
                            >
                                {template.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={form.errors.experience_template} />
                <Button
                    type="submit"
                    className="w-full"
                    disabled={form.processing}
                >
                    {form.processing && (
                        <Loader2 className="size-4 animate-spin" />
                    )}{" "}
                    Create website
                </Button>
            </form>
        </Panel>
    );
}

function ExperiencePanel({ order }: { order: Order }) {
    const experience = order.experience!;
    const form = useForm({ nfc_tag_uid: experience.nfc_tag_uid ?? "" });
    const [copiedText, copy] = useClipboard();

    return (
        <Panel title="NFC & QR">
            <div className="flex gap-4">
                <img
                    src={experience.qr_url ?? undefined}
                    alt="QR code"
                    className="size-24 shrink-0 rounded-lg border bg-white p-1"
                />
                <div className="min-w-0 space-y-1 text-sm">
                    <p className="flex items-center gap-1.5 font-medium">
                        <Nfc className="size-4 text-rose" />{" "}
                        {experience.is_published
                            ? "Published"
                            : "Not published yet"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Link to write on the tag:
                    </p>
                    <div className="flex gap-2">
                        <Input
                            readOnly
                            value={experience.tag_url ?? ""}
                            onFocus={(event) => event.target.select()}
                            className="h-8 font-mono text-xs"
                            aria-label="Tag link"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => void copy(experience.tag_url ?? "")}
                        >
                            {copiedText === experience.tag_url ? (
                                <Check className="size-4 text-emerald-600" />
                            ) : (
                                <Copy className="size-4" />
                            )}
                            Copy
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        In NXP TagWriter, turn on the UID mirror and counter
                        mirror over the{" "}
                        <span className="font-mono">00000000000000x000000</span>{" "}
                        at the end, then tap the tag once to activate it.
                    </p>
                    <p className="text-xs font-medium">
                        {experience.is_tag_check_active
                            ? "Tag check active: copied tags and the QR code won't open the page."
                            : "Tag not activated yet: tap it once after programming."}
                    </p>
                    <div className="flex gap-3 pt-1 text-xs">
                        <Link
                            href={experienceEdit(experience.code)}
                            className="font-medium text-plum hover:underline dark:text-blush"
                        >
                            Edit page
                        </Link>
                        <a
                            href={experience.public_url ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-plum hover:underline dark:text-blush"
                        >
                            Open page
                        </a>
                        <a
                            href={`${experience.qr_url}?download=1`}
                            className="font-medium text-plum hover:underline dark:text-blush"
                        >
                            Download QR
                        </a>
                    </div>
                </div>
            </div>
            <form
                className="mt-4 space-y-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.put(ExperienceController.update.url(experience.code), {
                        preserveScroll: true,
                    });
                }}
            >
                <FormField
                    label="NFC tag UID"
                    error={form.errors.nfc_tag_uid}
                    hint="Link the physical tag shipped with this order."
                >
                    <Input
                        value={form.data.nfc_tag_uid}
                        onChange={(event) =>
                            form.setData("nfc_tag_uid", event.target.value)
                        }
                        placeholder="04:A2:3B:1C:5D:80"
                        className="font-mono"
                    />
                </FormField>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={form.processing || !form.isDirty}
                >
                    Save tag
                </Button>
            </form>
        </Panel>
    );
}
