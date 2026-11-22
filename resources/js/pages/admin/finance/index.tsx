import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowUpRight,
    Coins,
    Loader2,
    Pencil,
    PiggyBank,
    Plus,
    Receipt,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import FinanceController from '@/actions/App/Http/Controllers/Admin/FinanceController';
import {
    AdminPage,
    ConfirmDelete,
    FormField,
    PageHeader,
    TableShell,
} from '@/components/taptale/admin-ui';
import { FinanceTrendChart } from '@/components/taptale/finance-trend-chart';
import { Pagination } from '@/components/taptale/pagination';
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
import { useMoney } from '@/hooks/use-money';
import { formatDate, toPesoInput } from '@/lib/money';
import { cn } from '@/lib/utils';
import { index } from '@/routes/admin/finance';
import type {
    FinanceEntry,
    FinanceEntryTypeValue,
    FinanceSummary,
    Paginated,
    StatusTone,
} from '@/types';

type Option = { value: string; label: string };

type Props = {
    summary: FinanceSummary;
    entries: Paginated<FinanceEntry>;
    filters: { period: string; type: string };
    periods: Option[];
    types: Option[];
    categories: Option[];
};

const TYPE_TONES: Record<FinanceEntryTypeValue, StatusTone> = {
    capital: 'plum',
    expense: 'amber',
    withdrawal: 'zinc',
    income: 'emerald',
};

const MONEY_OUT: FinanceEntryTypeValue[] = ['expense', 'withdrawal'];

export default function AdminFinance({
    summary,
    entries,
    filters,
    periods,
    types,
    categories,
}: Props) {
    const money = useMoney();
    const [editing, setEditing] = useState<
        FinanceEntry | FinanceEntryTypeValue | undefined
    >(undefined);
    const { overview, period } = summary;
    const periodLabel =
        periods.find((option) => option.value === filters.period)?.label ?? '';

    return (
        <>
            <Head title="Finance" />
            <AdminPage>
                <PageHeader
                    title="Finance"
                    description="Track your puhunan, expenses and profit in one place. Order sales are added automatically once a payment is verified."
                    actions={
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setEditing('capital')}
                            >
                                <PiggyBank className="size-4" /> Add puhunan
                            </Button>
                            <Button onClick={() => setEditing('expense')}>
                                <Plus className="size-4" /> Record expense
                            </Button>
                        </>
                    }
                />

                <CapitalPanel overview={overview} />

                <div className="flex flex-wrap gap-2">
                    {periods.map((option) => (
                        <FilterChip
                            key={option.value}
                            href={index.url({
                                query: {
                                    period: option.value,
                                    type:
                                        filters.type === 'all'
                                            ? undefined
                                            : filters.type,
                                },
                            })}
                            active={filters.period === option.value}
                        >
                            {option.label}
                        </FilterChip>
                    ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                        icon={Receipt}
                        label="Order sales"
                        value={money(period.sales)}
                        hint="Verified payments, minus refunds"
                    />
                    <Metric
                        icon={Coins}
                        label="Other income"
                        value={money(period.other_income)}
                        hint="Recorded outside of orders"
                    />
                    <Metric
                        icon={ArrowDownRight}
                        label="Expenses"
                        value={money(period.expenses)}
                        hint={periodLabel}
                    />
                    <Metric
                        icon={TrendingUp}
                        label="Net profit"
                        value={money(period.net_profit)}
                        hint={
                            period.margin_percent === null
                                ? periodLabel
                                : `${period.margin_percent}% margin · ${periodLabel}`
                        }
                        tone={period.net_profit < 0 ? 'loss' : 'default'}
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <FinanceTrendChart trend={summary.trend} />
                    </div>
                    <ExpenseBreakdown
                        rows={summary.expense_breakdown}
                        periodLabel={periodLabel}
                    />
                </div>

                <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-display text-lg">Ledger</h2>
                        <div className="flex flex-wrap gap-2">
                            {[{ value: 'all', label: 'All' }, ...types].map(
                                (option) => (
                                    <FilterChip
                                        key={option.value}
                                        href={index.url({
                                            query: {
                                                period: filters.period,
                                                type:
                                                    option.value === 'all'
                                                        ? undefined
                                                        : option.value,
                                            },
                                        })}
                                        active={filters.type === option.value}
                                    >
                                        {option.label}
                                    </FilterChip>
                                ),
                            )}
                        </div>
                    </div>
                    <TableShell>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th className="hidden md:table-cell">Type</th>
                                <th className="text-right">Amount</th>
                                <th className="w-24" />
                            </tr>
                        </thead>
                        <tbody>
                            {entries.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-10 text-center text-muted-foreground"
                                    >
                                        No entries for this period. Start by
                                        adding your puhunan or an expense.
                                    </td>
                                </tr>
                            )}
                            {entries.data.map((entry) => {
                                const isMoneyOut = MONEY_OUT.includes(
                                    entry.type,
                                );

                                return (
                                    <tr key={entry.id}>
                                        <td className="whitespace-nowrap">
                                            {formatDate(entry.occurred_on)}
                                        </td>
                                        <td>
                                            <p className="font-medium">
                                                {entry.description}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {[
                                                    entry.category_label,
                                                    entry.recorded_by &&
                                                        `by ${entry.recorded_by}`,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </p>
                                            {entry.notes && (
                                                <p className="line-clamp-1 max-w-sm text-xs text-muted-foreground">
                                                    {entry.notes}
                                                </p>
                                            )}
                                        </td>
                                        <td className="hidden md:table-cell">
                                            <StatusBadge
                                                tone={TYPE_TONES[entry.type]}
                                            >
                                                {entry.type_label}
                                            </StatusBadge>
                                        </td>
                                        <td
                                            className={cn(
                                                'text-right font-medium whitespace-nowrap tabular-nums',
                                                !isMoneyOut &&
                                                    'text-emerald-700 dark:text-emerald-400',
                                            )}
                                        >
                                            {isMoneyOut ? '−' : '+'}
                                            {money(entry.amount)}
                                        </td>
                                        <td>
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        setEditing(entry)
                                                    }
                                                    aria-label={`Edit ${entry.description}`}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <ConfirmDelete
                                                    title={`Delete "${entry.description}"?`}
                                                    description="This removes the entry from your ledger and totals."
                                                    url={FinanceController.destroy.url(
                                                        entry.id,
                                                    )}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </TableShell>
                    <Pagination links={entries.meta.links} />
                </section>
            </AdminPage>

            <Dialog
                open={editing !== undefined}
                onOpenChange={(open) => !open && setEditing(undefined)}
            >
                <DialogContent className="sm:max-w-lg">
                    {editing !== undefined && (
                        <EntryForm
                            key={
                                typeof editing === 'string'
                                    ? `new-${editing}`
                                    : editing.id
                            }
                            entry={typeof editing === 'string' ? null : editing}
                            initialType={
                                typeof editing === 'string'
                                    ? editing
                                    : editing.type
                            }
                            types={types}
                            categories={categories}
                            onDone={() => setEditing(undefined)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminFinance.layout = {
    breadcrumbs: [{ title: 'Finance', href: index() }],
};

function CapitalPanel({ overview }: { overview: FinanceSummary['overview'] }) {
    const money = useMoney();
    const recovered = overview.recovered_percent;
    const isRecovered = recovered !== null && recovered >= 100;

    return (
        <section className="grid gap-4 rounded-2xl border bg-card p-5 lg:grid-cols-[1.4fr_1fr]">
            <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <PiggyBank className="size-4 text-rose" />
                    Total puhunan (capital invested)
                </div>
                <p className="mt-1 font-display text-4xl">
                    {money(overview.capital)}
                </p>

                {recovered === null ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                        Add the money you put into the business to see how much
                        of it has been earned back.
                    </p>
                ) : (
                    <div className="mt-4">
                        <div className="flex items-baseline justify-between text-sm">
                            <span className="font-medium">
                                {isRecovered
                                    ? 'Puhunan fully earned back'
                                    : `${recovered}% earned back`}
                            </span>
                            <span className="text-muted-foreground">
                                {isRecovered
                                    ? `${money(overview.net_profit - overview.capital)} beyond puhunan`
                                    : `${money(overview.left_to_recover)} to go`}
                            </span>
                        </div>
                        <div
                            className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"
                            role="meter"
                            aria-label="Puhunan earned back"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.min(100, recovered)}
                        >
                            <div
                                className="h-full rounded-full bg-plum dark:bg-blush"
                                style={{
                                    width: `${Math.min(100, recovered)}%`,
                                }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Based on all-time net profit of{' '}
                            {money(overview.net_profit)}.
                        </p>
                    </div>
                )}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
                <PanelStat
                    icon={Wallet}
                    label="Cash on hand"
                    value={money(overview.cash_on_hand)}
                    hint="Puhunan + profit − withdrawals"
                />
                <PanelStat
                    icon={ArrowUpRight}
                    label="All-time sales"
                    value={money(overview.sales + overview.other_income)}
                />
                <PanelStat
                    icon={ArrowDownRight}
                    label="All-time expenses"
                    value={money(overview.expenses)}
                />
                <PanelStat
                    icon={Coins}
                    label="Owner withdrawals"
                    value={money(overview.withdrawals)}
                />
            </dl>
        </section>
    );
}

function PanelStat({
    icon: Icon,
    label,
    value,
    hint,
}: {
    icon: typeof Wallet;
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <div className="rounded-xl bg-muted/40 p-3">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="size-3.5" />
                {label}
            </dt>
            <dd className="mt-1 font-display text-xl">{value}</dd>
            {hint && (
                <dd className="text-[11px] text-muted-foreground">{hint}</dd>
            )}
        </div>
    );
}

function Metric({
    icon: Icon,
    label,
    value,
    hint,
    tone = 'default',
}: {
    icon: typeof Wallet;
    label: string;
    value: string;
    hint?: string;
    tone?: 'default' | 'loss';
}) {
    return (
        <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="size-5 text-rose" />
            </div>
            <p
                className={cn(
                    'mt-2 font-display text-3xl',
                    tone === 'loss' && 'text-destructive',
                )}
            >
                {value}
            </p>
            {hint && (
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            )}
        </div>
    );
}

function ExpenseBreakdown({
    rows,
    periodLabel,
}: {
    rows: FinanceSummary['expense_breakdown'];
    periodLabel: string;
}) {
    const money = useMoney();
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    const largest = rows[0]?.amount ?? 0;

    return (
        <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-display text-lg">Where the money went</h2>
            <p className="text-sm text-muted-foreground">
                Expenses by category · {periodLabel}
            </p>
            {rows.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                    No expenses recorded.
                </p>
            ) : (
                <ul className="mt-5 space-y-4">
                    {rows.map((row) => (
                        <li key={row.category} className="text-sm">
                            <div className="flex items-baseline justify-between gap-3">
                                <span>{row.label}</span>
                                <span className="font-medium tabular-nums">
                                    {money(row.amount)}
                                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                        {Math.round((row.amount * 100) / total)}
                                        %
                                    </span>
                                </span>
                            </div>
                            <div className="mt-1.5 h-2 rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-[#eb6834] dark:bg-[#d95926]"
                                    style={{
                                        width: `${(row.amount / largest) * 100}%`,
                                    }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function FilterChip({
    href,
    active,
    children,
}: {
    href: string;
    active: boolean;
    children: ReactNode;
}) {
    return (
        <Link
            href={href}
            preserveScroll
            className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition',
                active
                    ? 'border-plum bg-plum text-white dark:border-blush dark:bg-blush dark:text-plum-dark'
                    : 'bg-card hover:border-rose',
            )}
        >
            {children}
        </Link>
    );
}

const TYPE_HELP: Record<FinanceEntryTypeValue, string> = {
    capital: 'Money you put into the business (puhunan).',
    expense: 'Money spent to run the business, e.g. materials or shipping.',
    withdrawal: 'Money you took out of the business for personal use.',
    income: 'Money earned outside of website orders, e.g. bazaar sales.',
};

function EntryForm({
    entry,
    initialType,
    types,
    categories,
    onDone,
}: {
    entry: FinanceEntry | null;
    initialType: FinanceEntryTypeValue;
    types: Option[];
    categories: Option[];
    onDone: () => void;
}) {
    const form = useForm({
        type: initialType,
        category: entry?.category ?? '',
        amount: entry ? toPesoInput(entry.amount) : '',
        description: entry?.description ?? '',
        occurred_on:
            entry?.occurred_on ?? new Date().toLocaleDateString('en-CA'),
        notes: entry?.notes ?? '',
    });

    return (
        <form
            className="space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                const options = { preserveScroll: true, onSuccess: onDone };

                if (entry) {
                    form.put(FinanceController.update.url(entry.id), options);
                } else {
                    form.post(FinanceController.store.url(), options);
                }
            }}
        >
            <DialogTitle>{entry ? 'Edit entry' : 'New entry'}</DialogTitle>
            <DialogDescription>{TYPE_HELP[form.data.type]}</DialogDescription>

            <FormField label="Type" error={form.errors.type}>
                <div className="grid grid-cols-2 gap-2">
                    {types.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                                form.setData(
                                    'type',
                                    option.value as FinanceEntryTypeValue,
                                )
                            }
                            className={cn(
                                'rounded-xl border px-3 py-2 text-left text-sm transition',
                                form.data.type === option.value
                                    ? 'border-plum bg-blush-light/60 font-medium dark:border-blush dark:bg-rose/15'
                                    : 'hover:border-rose',
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                    label="Amount (₱)"
                    htmlFor="amount"
                    error={form.errors.amount}
                >
                    <Input
                        id="amount"
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        value={form.data.amount}
                        onChange={(event) =>
                            form.setData('amount', event.target.value)
                        }
                        placeholder="0.00"
                    />
                </FormField>
                <FormField
                    label="Date"
                    htmlFor="occurred_on"
                    error={form.errors.occurred_on}
                >
                    <Input
                        id="occurred_on"
                        type="date"
                        value={form.data.occurred_on}
                        onChange={(event) =>
                            form.setData('occurred_on', event.target.value)
                        }
                    />
                </FormField>
            </div>

            {form.data.type === 'expense' && (
                <FormField label="Category" error={form.errors.category}>
                    <Select
                        value={form.data.category}
                        onValueChange={(value) =>
                            form.setData('category', value)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="What was it for?" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
            )}

            <FormField
                label="Description"
                htmlFor="description"
                error={form.errors.description}
            >
                <Input
                    id="description"
                    value={form.data.description}
                    onChange={(event) =>
                        form.setData('description', event.target.value)
                    }
                    placeholder={
                        form.data.type === 'capital'
                            ? 'e.g. Initial investment'
                            : 'e.g. Acrylic sheets from supplier'
                    }
                />
            </FormField>

            <FormField label="Notes (optional)" error={form.errors.notes}>
                <Textarea
                    value={form.data.notes}
                    onChange={(event) =>
                        form.setData('notes', event.target.value)
                    }
                    rows={2}
                />
            </FormField>

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
