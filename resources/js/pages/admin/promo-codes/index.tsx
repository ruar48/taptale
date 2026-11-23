import { Head, useForm } from '@inertiajs/react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import PromoCodeController from '@/actions/App/Http/Controllers/Admin/PromoCodeController';
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
import { useMoney } from '@/hooks/use-money';
import { formatDate, toPesoInput } from '@/lib/money';
import { index } from '@/routes/admin/promo-codes';

type PromoCode = {
    id: number;
    code: string;
    description: string | null;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    min_subtotal: number;
    max_uses: number | null;
    /** Orders placed with the code (cancelled ones excluded). */
    uses: number;
    /** Uses counted against the limit: paid orders plus unpaid ones still within the hold window. */
    held: number | null;
    /** First day the code works (YYYY-MM-DD, studio time zone). */
    starts_at: string | null;
    /** Last day the code works (YYYY-MM-DD, studio time zone). */
    ends_at: string | null;
    is_active: boolean;
    is_redeemable: boolean;
};

export default function AdminPromoCodes({
    promoCodes,
}: {
    promoCodes: PromoCode[];
}) {
    const money = useMoney();
    const [editing, setEditing] = useState<PromoCode | null | undefined>(
        undefined,
    );

    const discountLabel = (promoCode: PromoCode) =>
        promoCode.discount_type === 'percent'
            ? `${promoCode.discount_value}% off`
            : `${money(promoCode.discount_value)} off`;

    return (
        <>
            <Head title="Promo Codes" />
            <AdminPage>
                <PageHeader
                    title="Promo codes"
                    description="Discounts customers enter at checkout, once per customer. They apply to the items only. An unpaid order holds its use for 48 hours, then frees it for others."
                    actions={
                        <Button onClick={() => setEditing(null)}>
                            <Plus className="size-4" /> Add promo code
                        </Button>
                    }
                />
                <TableShell>
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Discount</th>
                            <th className="hidden md:table-cell">Used</th>
                            <th className="hidden lg:table-cell">Valid</th>
                            <th>Status</th>
                            <th className="w-24" />
                        </tr>
                    </thead>
                    <tbody>
                        {promoCodes.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="py-10 text-center text-muted-foreground"
                                >
                                    No promo codes yet.
                                </td>
                            </tr>
                        )}
                        {promoCodes.map((promoCode) => (
                            <tr key={promoCode.id}>
                                <td>
                                    <p className="font-mono font-medium">
                                        {promoCode.code}
                                    </p>
                                    {promoCode.description && (
                                        <p className="line-clamp-1 max-w-xs text-xs text-muted-foreground">
                                            {promoCode.description}
                                        </p>
                                    )}
                                </td>
                                <td>
                                    {discountLabel(promoCode)}
                                    {promoCode.min_subtotal > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Min. {money(promoCode.min_subtotal)}
                                        </p>
                                    )}
                                </td>
                                <td className="hidden md:table-cell">
                                    {promoCode.uses}
                                    {promoCode.max_uses !== null && (
                                        <p className="text-xs text-muted-foreground">
                                            {promoCode.held} of{' '}
                                            {promoCode.max_uses} taken
                                        </p>
                                    )}
                                </td>
                                <td className="hidden text-xs text-muted-foreground lg:table-cell">
                                    {promoCode.starts_at || promoCode.ends_at
                                        ? `${promoCode.starts_at ? formatDate(promoCode.starts_at) : 'Now'} – ${promoCode.ends_at ? formatDate(promoCode.ends_at) : 'No end'}`
                                        : 'Always'}
                                </td>
                                <td>
                                    <StatusBadge
                                        tone={
                                            promoCode.is_redeemable
                                                ? 'emerald'
                                                : 'zinc'
                                        }
                                    >
                                        {promoCode.is_redeemable
                                            ? 'Usable'
                                            : 'Not usable'}
                                    </StatusBadge>
                                </td>
                                <td>
                                    <div className="flex justify-end">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                setEditing(promoCode)
                                            }
                                            aria-label={`Edit ${promoCode.code}`}
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                        <ConfirmDelete
                                            title={`Delete ${promoCode.code}?`}
                                            description="Orders that used this code keep their discount."
                                            url={PromoCodeController.destroy.url(
                                                promoCode.id,
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
                        <PromoCodeForm
                            key={editing?.id ?? 'new'}
                            promoCode={editing}
                            onDone={() => setEditing(undefined)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminPromoCodes.layout = {
    breadcrumbs: [{ title: 'Promo codes', href: index() }],
};

function PromoCodeForm({
    promoCode,
    onDone,
}: {
    promoCode: PromoCode | null;
    onDone: () => void;
}) {
    const form = useForm({
        code: promoCode?.code ?? '',
        description: promoCode?.description ?? '',
        discount_type: promoCode?.discount_type ?? 'percent',
        discount_value: promoCode
            ? promoCode.discount_type === 'percent'
                ? String(promoCode.discount_value)
                : toPesoInput(promoCode.discount_value)
            : '10',
        min_subtotal: promoCode ? toPesoInput(promoCode.min_subtotal) : '',
        max_uses: promoCode?.max_uses ? String(promoCode.max_uses) : '',
        starts_at: promoCode?.starts_at ?? '',
        ends_at: promoCode?.ends_at ?? '',
        is_active: promoCode?.is_active ?? true,
    });
    const isPercent = form.data.discount_type === 'percent';
    const isBigDiscount = isPercent
        ? Number(form.data.discount_value) >= 50
        : Number(form.data.discount_value) >= 500;

    return (
        <form
            className="space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                const options = { preserveScroll: true, onSuccess: onDone };

                if (promoCode) {
                    form.put(
                        PromoCodeController.update.url(promoCode.id),
                        options,
                    );
                } else {
                    form.post(PromoCodeController.store.url(), options);
                }
            }}
        >
            <DialogTitle>
                {promoCode ? 'Edit promo code' : 'Add promo code'}
            </DialogTitle>
            <DialogDescription>
                Customers type the code at checkout. Letters are not case
                sensitive.
            </DialogDescription>
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Code" error={form.errors.code}>
                    <Input
                        value={form.data.code}
                        onChange={(event) =>
                            form.setData(
                                'code',
                                event.target.value.toUpperCase(),
                            )
                        }
                        placeholder="e.g. LOVE10"
                        className="font-mono"
                        maxLength={40}
                    />
                </FormField>
                <FormField label="Type" error={form.errors.discount_type}>
                    <Select
                        value={form.data.discount_type}
                        onValueChange={(value) =>
                            form.setData(
                                'discount_type',
                                value as 'percent' | 'fixed',
                            )
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="percent">Percent off</SelectItem>
                            <SelectItem value="fixed">
                                Amount off (₱)
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField
                    label={isPercent ? 'Percent off' : 'Amount off (₱)'}
                    error={form.errors.discount_value}
                    hint={
                        isBigDiscount
                            ? 'Big discount: use a long code that is hard to guess (like VIP-7KD3QZ), and set a usage limit. Customers can try codes at checkout.'
                            : undefined
                    }
                >
                    <Input
                        type="number"
                        min={1}
                        max={isPercent ? 100 : undefined}
                        step={isPercent ? 1 : 0.01}
                        value={form.data.discount_value}
                        onChange={(event) =>
                            form.setData('discount_value', event.target.value)
                        }
                    />
                </FormField>
                <FormField
                    label="Minimum subtotal (₱)"
                    error={form.errors.min_subtotal}
                    hint="Optional."
                >
                    <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.data.min_subtotal}
                        onChange={(event) =>
                            form.setData('min_subtotal', event.target.value)
                        }
                    />
                </FormField>
                <FormField
                    label="Starts"
                    error={form.errors.starts_at}
                    hint="Optional."
                >
                    <Input
                        type="date"
                        value={form.data.starts_at}
                        onChange={(event) =>
                            form.setData('starts_at', event.target.value)
                        }
                    />
                </FormField>
                <FormField
                    label="Ends"
                    error={form.errors.ends_at}
                    hint="Optional. Last day it works."
                >
                    <Input
                        type="date"
                        value={form.data.ends_at}
                        onChange={(event) =>
                            form.setData('ends_at', event.target.value)
                        }
                    />
                </FormField>
                <FormField
                    label="Usage limit"
                    error={form.errors.max_uses}
                    hint="Optional. Total orders that can use it."
                >
                    <Input
                        type="number"
                        min={1}
                        value={form.data.max_uses}
                        onChange={(event) =>
                            form.setData('max_uses', event.target.value)
                        }
                    />
                </FormField>
                <FormField
                    label="Note"
                    error={form.errors.description}
                    hint="Only your team sees this."
                >
                    <Input
                        value={form.data.description}
                        onChange={(event) =>
                            form.setData('description', event.target.value)
                        }
                        maxLength={255}
                    />
                </FormField>
            </div>
            <CheckboxField
                label="Active"
                checked={form.data.is_active}
                onChange={(value) => form.setData('is_active', value)}
            />
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
