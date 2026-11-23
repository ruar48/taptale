import { Head } from "@inertiajs/react";
import { BadgeCheck, Clock, PencilLine } from "lucide-react";
import DesignReviewController from "@/actions/App/Http/Controllers/Storefront/DesignReviewController";
import { ProofApproval } from "@/components/taptale/proof-approval";
import { StatusBadge, proofTone } from "@/components/taptale/status-badge";
import { formatDate } from "@/lib/money";
import type { DesignProof, Personalization, StatusTone } from "@/types";

type ReviewProof = DesignProof & { is_awaiting_response: boolean };

type Props = {
    accessKey: string;
    order: {
        reference: string;
        customer_first_name: string;
        product_name: string;
        quantity: number;
        status_label: string;
        status_tone: StatusTone;
        is_open: boolean;
        is_payment_stage: boolean;
        personalization: Personalization;
    };
    proofs: ReviewProof[];
};

/**
 * The private approval link the studio sends a customer over Messenger (or
 * any chat) to see their design and approve it, no account needed.
 */
export default function DesignReview({ accessKey, order, proofs }: Props) {
    const latest = proofs[0] ?? null;
    const awaiting = latest?.is_awaiting_response ? latest : null;
    const earlier = awaiting ? proofs.slice(1) : proofs;
    const routeArgs = (proof: ReviewProof) => ({
        order: order.reference,
        proof: proof.id,
    });
    const details: [string, string | undefined][] = [
        ["Names", order.personalization.names],
        ["Date", order.personalization.date],
        ["Message", order.personalization.message],
    ];

    return (
        <>
            <Head title={`Your design · ${order.reference}`} />
            <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
                <header>
                    <p className="text-xs font-semibold tracking-[0.2em] text-rose uppercase">
                        Order {order.reference}
                    </p>
                    <h1 className="mt-2 font-display text-3xl sm:text-4xl">
                        Hi {order.customer_first_name}, here's your design
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <StatusBadge tone={order.status_tone}>
                            {order.status_label}
                        </StatusBadge>
                        <span>
                            {order.product_name} · {order.quantity} pcs
                        </span>
                    </div>
                </header>

                <div className="mt-8 space-y-8">
                    {awaiting ? (
                        <ProofApproval
                            proof={awaiting}
                            approveUrl={DesignReviewController.approve.url(
                                routeArgs(awaiting),
                                { query: { k: accessKey } },
                            )}
                            revisionUrl={DesignReviewController.requestRevision.url(
                                routeArgs(awaiting),
                                { query: { k: accessKey } },
                            )}
                        />
                    ) : (
                        <StatusMessage latest={latest} isOpen={order.is_open} />
                    )}

                    {details.some(([, value]) => value) && (
                        <section className="rounded-2xl border bg-card p-5 sm:p-6">
                            <h2 className="font-display text-xl">
                                Your details
                            </h2>
                            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                                {details
                                    .filter(([, value]) => value)
                                    .map(([label, value]) => (
                                        <div key={label}>
                                            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                {label}
                                            </dt>
                                            <dd className="mt-0.5 whitespace-pre-line">
                                                {value}
                                            </dd>
                                        </div>
                                    ))}
                            </dl>
                        </section>
                    )}

                    {earlier.length > 0 && (
                        <section>
                            <h2 className="font-display text-xl">
                                {awaiting ? "Earlier versions" : "All versions"}
                            </h2>
                            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {earlier.map((proof) => (
                                    <li
                                        key={proof.id}
                                        className="overflow-hidden rounded-2xl border bg-card"
                                    >
                                        <a
                                            href={proof.image_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block aspect-[4/3] bg-muted"
                                        >
                                            <img
                                                src={proof.image_url}
                                                alt={`Design version ${proof.version}`}
                                                className="size-full object-contain"
                                                loading="lazy"
                                            />
                                        </a>
                                        <div className="p-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">
                                                    v{proof.version}
                                                </p>
                                                <StatusBadge
                                                    tone={proofTone(
                                                        proof.status,
                                                    )}
                                                >
                                                    {proof.status_label}
                                                </StatusBadge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Sent{" "}
                                                {formatDate(
                                                    proof.created_at,
                                                    true,
                                                )}
                                            </p>
                                            {proof.customer_comment && (
                                                <p className="mt-2 text-xs whitespace-pre-line">
                                                    “{proof.customer_comment}”
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            </div>
        </>
    );
}

function StatusMessage({
    latest,
    isOpen,
}: {
    latest: ReviewProof | null;
    isOpen: boolean;
}) {
    const [Icon, title, body] =
        latest?.status === "approved"
            ? [
                  BadgeCheck,
                  `You approved design v${latest.version}`,
                  "Thank you! We are making your gift exactly as approved.",
              ]
            : latest?.status === "revision_requested"
              ? [
                    PencilLine,
                    "We're working on your changes",
                    "Our designers are revising your design. We'll send you the new version here soon.",
                ]
              : [
                    Clock,
                    isOpen ? "Your design is on its way" : "This order is closed",
                    isOpen
                        ? "Our designers are preparing your design. Open this link again once we message you that it's ready."
                        : "There is nothing left to review on this order.",
                ];

    return (
        <section className="flex gap-4 rounded-2xl border bg-card p-5 sm:p-6">
            <Icon className="mt-1 size-6 shrink-0 text-rose" />
            <div>
                <h2 className="font-display text-xl">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
        </section>
    );
}
