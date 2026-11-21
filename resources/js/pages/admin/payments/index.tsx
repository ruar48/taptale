import { Head, Link, router, useForm } from '@inertiajs/react';
import { BadgeCheck, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import PaymentController from '@/actions/App/Http/Controllers/Admin/PaymentController';
import InputError from '@/components/input-error';
import {
    AdminPage,
    PageHeader,
    TableShell,
} from '@/components/taptale/admin-ui';
import { Pagination } from '@/components/taptale/pagination';
import { StatusBadge, paymentTone } from '@/components/taptale/status-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useMoney } from '@/hooks/use-money';
import { formatDate } from '@/lib/money';
import { cn } from '@/lib/utils';
import { show as orderShow } from '@/routes/admin/orders';
import { index } from '@/routes/admin/payments';
import type { Paginated, Payment } from '@/types';

const FILTERS = [
    { value: 'submitted', label: 'To verify' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
];

export default function AdminPayments({
    payments,
    filters,
    pendingCount,
}: {
    payments: Paginated<Payment>;
    filters: { status: string };
    pendingCount: number;
}) {
    const money = useMoney();
    const [rejecting, setRejecting] = useState<Payment | null>(null);
    const rejectForm = useForm({ review_notes: '' });

    return (
        <>
            <Head title="Payments" />
            <AdminPage>
                <PageHeader
                    title="Payments"
                    description={`${pendingCount} ${pendingCount === 1 ? 'payment' : 'payments'} awaiting verification.`}
                />
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((filter) => (
                        <Link
                            key={filter.value}
                            href={index.url({
                                query: { status: filter.value },
                            })}
                            className={cn(
                                'rounded-full border px-3 py-1.5 text-sm transition',
                                filters.status === filter.value
                                    ? 'border-plum bg-plum text-white dark:border-blush dark:bg-blush dark:text-plum-dark'
                                    : 'bg-card hover:border-rose',
                            )}
                        >
                            {filter.label}
                        </Link>
                    ))}
                </div>
                <TableShell>
                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Amount</th>
                            <th className="hidden md:table-cell">
                                Method & reference
                            </th>
                            <th>Status</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="py-12 text-center text-muted-foreground"
                                >
                                    Nothing here.
                                </td>
                            </tr>
                        )}
                        {payments.data.map((payment) => (
                            <tr key={payment.id}>
                                <td>
                                    {payment.order && (
                                        <>
                                            <Link
                                                href={orderShow(
                                                    payment.order.reference,
                                                )}
                                                className="font-medium text-plum hover:underline dark:text-blush"
                                            >
                                                {payment.order.reference}
                                            </Link>
                                            <p className="text-xs text-muted-foreground">
                                                {payment.order.customer_name} ·{' '}
                                                {formatDate(
                                                    payment.created_at,
                                                    true,
                                                )}
                                            </p>
                                        </>
                                    )}
                                </td>
                                <td>
                                    <p className="font-medium">
                                        {payment.kind === 'refund' ? '−' : ''}
                                        {money(payment.amount)}
                                    </p>
                                    {payment.order && (
                                        <p className="text-xs text-muted-foreground">
                                            of {money(payment.order.total)}
                                        </p>
                                    )}
                                </td>
                                <td className="hidden md:table-cell">
                                    <p>
                                        {payment.kind === 'refund'
                                            ? 'Refund'
                                            : (payment.method ?? '—')}
                                    </p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {payment.reference_number ?? '—'}
                                    </p>
                                </td>
                                <td>
                                    <StatusBadge
                                        tone={paymentTone(payment.status)}
                                    >
                                        {payment.status_label}
                                    </StatusBadge>
                                </td>
                                <td>
                                    <div className="flex flex-wrap justify-end gap-2">
                                        {payment.proof_url && (
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="ghost"
                                            >
                                                <a
                                                    href={payment.proof_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <ExternalLink className="size-4" />{' '}
                                                    Receipt
                                                </a>
                                            </Button>
                                        )}
                                        {payment.status === 'submitted' &&
                                            payment.kind === 'payment' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            router.post(
                                                                PaymentController.verify.url(
                                                                    payment.id,
                                                                ),
                                                                {},
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            )
                                                        }
                                                    >
                                                        <BadgeCheck className="size-4" />{' '}
                                                        Verify
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setRejecting(
                                                                payment,
                                                            )
                                                        }
                                                    >
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableShell>
                <Pagination links={payments.meta.links} />
            </AdminPage>

            <Dialog
                open={rejecting !== null}
                onOpenChange={(open) => !open && setRejecting(null)}
            >
                <DialogContent>
                    <DialogTitle>Reject payment</DialogTitle>
                    <DialogDescription>
                        The customer will see this reason on their order and can
                        submit a new payment.
                    </DialogDescription>
                    <form
                        className="space-y-3"
                        onSubmit={(event) => {
                            event.preventDefault();

                            if (!rejecting) {
                                return;
                            }

                            rejectForm.post(
                                PaymentController.reject.url(rejecting.id),
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
                                    'review_notes',
                                    event.target.value,
                                )
                            }
                            rows={3}
                            placeholder="e.g. The reference number doesn't match our records."
                        />
                        <InputError message={rejectForm.errors.review_notes} />
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRejecting(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={rejectForm.processing}
                            >
                                Reject payment
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminPayments.layout = {
    breadcrumbs: [{ title: 'Payments', href: index() }],
};
