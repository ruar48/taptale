import { Head, useForm } from '@inertiajs/react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import PaymentMethodController from '@/actions/App/Http/Controllers/Admin/PaymentMethodController';
import {
    AdminPage,
    CheckboxField,
    ConfirmDelete,
    FormField,
    PageHeader,
    TableShell,
} from '@/components/taptale/admin-ui';
import { StatusBadge } from '@/components/taptale/status-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { index } from '@/routes/admin/payment-methods';
import type { PaymentMethod } from '@/types';

const DRIVER_LABELS: Record<string, string> = {
    manual: 'Manual — customer uploads a receipt',
    paymongo: 'PayMongo — hosted checkout page',
    paymongo_qrph: 'PayMongo QR Ph — Taptale-branded QR page',
    cod: 'Cash on delivery — customer pays the courier',
};

export default function AdminPaymentMethods({
    paymentMethods,
    drivers,
}: {
    paymentMethods: PaymentMethod[];
    drivers: string[];
}) {
    const [editing, setEditing] = useState<PaymentMethod | null | undefined>(
        undefined,
    );

    return (
        <>
            <Head title="Payment Methods" />
            <AdminPage>
                <PageHeader
                    title="Payment methods"
                    description="PayMongo methods confirm themselves. Manual methods are verified from the customer's receipt, and cash on delivery is recorded on the order once collected."
                    actions={
                        <Button onClick={() => setEditing(null)}>
                            <Plus className="size-4" /> Add method
                        </Button>
                    }
                />
                <TableShell>
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th className="hidden md:table-cell">Account</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th className="w-24" />
                        </tr>
                    </thead>
                    <tbody>
                        {paymentMethods.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="py-10 text-center text-muted-foreground"
                                >
                                    No payment methods yet. Customers can't
                                    check out until you add one.
                                </td>
                            </tr>
                        )}
                        {paymentMethods.map((method) => (
                            <tr key={method.id}>
                                <td>
                                    <p className="font-medium">{method.name}</p>
                                    <p className="line-clamp-1 max-w-sm text-xs text-muted-foreground">
                                        {method.instructions}
                                    </p>
                                </td>
                                <td className="hidden md:table-cell">
                                    <p>{method.account_name}</p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {method.account_number}
                                    </p>
                                </td>
                                <td className="capitalize">{method.driver}</td>
                                <td>
                                    <StatusBadge
                                        tone={
                                            method.is_active
                                                ? 'emerald'
                                                : 'zinc'
                                        }
                                    >
                                        {method.is_active
                                            ? 'Active'
                                            : 'Inactive'}
                                    </StatusBadge>
                                </td>
                                <td>
                                    <div className="flex justify-end">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditing(method)}
                                            aria-label={`Edit ${method.name}`}
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                        <ConfirmDelete
                                            title={`Delete ${method.name}?`}
                                            description="Orders that used this method keep their payment history."
                                            url={PaymentMethodController.destroy.url(
                                                method.id,
                                            )}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableShell>
            </AdminPage>

            <Dialog
                open={editing !== undefined}
                onOpenChange={(open) => !open && setEditing(undefined)}
            >
                <DialogContent className="sm:max-w-lg">
                    {editing !== undefined && (
                        <MethodForm
                            key={editing?.id ?? 'new'}
                            method={editing}
                            drivers={drivers}
                            onDone={() => setEditing(undefined)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminPaymentMethods.layout = {
    breadcrumbs: [{ title: 'Payment methods', href: index() }],
};

function MethodForm({
    method,
    drivers,
    onDone,
}: {
    method: PaymentMethod | null;
    drivers: string[];
    onDone: () => void;
}) {
    const form = useForm({
        name: method?.name ?? '',
        code: method?.code ?? '',
        driver: method?.driver ?? 'manual',
        account_name: method?.account_name ?? '',
        account_number: method?.account_number ?? '',
        instructions: method?.instructions ?? '',
        is_active: method?.is_active ?? true,
        sort_order: method?.sort_order ?? 0,
    });

    return (
        <form
            className="space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                const options = { preserveScroll: true, onSuccess: onDone };

                if (method) {
                    form.put(
                        PaymentMethodController.update.url(method.id),
                        options,
                    );
                } else {
                    form.post(PaymentMethodController.store.url(), options);
                }
            }}
        >
            <DialogTitle>
                {method ? 'Edit payment method' : 'Add payment method'}
            </DialogTitle>
            <DialogDescription>
                Customers see these details when they pay for an order.
            </DialogDescription>
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name" error={form.errors.name}>
                    <Input
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                        placeholder="e.g. GCash"
                    />
                </FormField>
                <FormField
                    label="Code"
                    error={form.errors.code}
                    hint="Leave blank to generate."
                >
                    <Input
                        value={form.data.code}
                        onChange={(event) =>
                            form.setData('code', event.target.value)
                        }
                        className="font-mono"
                    />
                </FormField>
                <FormField
                    label="Account name"
                    error={form.errors.account_name}
                >
                    <Input
                        value={form.data.account_name}
                        onChange={(event) =>
                            form.setData('account_name', event.target.value)
                        }
                    />
                </FormField>
                <FormField
                    label="Account number"
                    error={form.errors.account_number}
                >
                    <Input
                        value={form.data.account_number}
                        onChange={(event) =>
                            form.setData('account_number', event.target.value)
                        }
                    />
                </FormField>
            </div>
            <FormField
                label="How customers pay"
                error={form.errors.driver}
                hint={
                    form.data.driver === 'paymongo'
                        ? 'Customers pay on PayMongo’s hosted page and the order is confirmed automatically. Account fields are not needed.'
                        : form.data.driver === 'paymongo_qrph'
                          ? 'Customers scan a QR Ph code on Taptale’s own branded page and the order is confirmed automatically. Account fields are not needed.'
                          : form.data.driver === 'cod'
                            ? 'Orders go straight to design. Record the cash on the order once the courier remits it. Account fields are not needed.'
                            : undefined
                }
            >
                <Select
                    value={form.data.driver}
                    onValueChange={(value) => form.setData('driver', value)}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {drivers.map((driver) => (
                            <SelectItem key={driver} value={driver}>
                                {DRIVER_LABELS[driver] ?? driver}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>
            <FormField label="Instructions" error={form.errors.instructions}>
                <Textarea
                    value={form.data.instructions}
                    onChange={(event) =>
                        form.setData('instructions', event.target.value)
                    }
                    rows={3}
                />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Sort order" error={form.errors.sort_order}>
                    <Input
                        type="number"
                        min={0}
                        value={form.data.sort_order}
                        onChange={(event) =>
                            form.setData(
                                'sort_order',
                                Number(event.target.value),
                            )
                        }
                    />
                </FormField>
                <div className="self-end">
                    <CheckboxField
                        label="Active"
                        checked={form.data.is_active}
                        onChange={(value) => form.setData('is_active', value)}
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onDone}>
                    Cancel
                </Button>
                <Button type="submit" disabled={form.processing}>
                    {form.processing && (
                        <Loader2 className="size-4 animate-spin" />
                    )}{' '}
                    Save
                </Button>
            </div>
        </form>
    );
}
