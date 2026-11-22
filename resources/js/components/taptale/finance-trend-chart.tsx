import { useState } from 'react';
import { useMoney } from '@/hooks/use-money';
import { cn } from '@/lib/utils';
import type { FinanceSummary } from '@/types';

type Month = FinanceSummary['trend'][number];

const INCOME_COLOR = 'bg-[#2a78d6] dark:bg-[#3987e5]';
const EXPENSE_COLOR = 'bg-[#eb6834] dark:bg-[#d95926]';

const monthFormatter = new Intl.DateTimeFormat('en-PH', { month: 'short' });
const monthYearFormatter = new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    year: 'numeric',
});
const compactFormatter = new Intl.NumberFormat('en-PH', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function toDate(month: string): Date {
    const [year, monthNumber] = month.split('-').map(Number);

    return new Date(year, monthNumber - 1, 1);
}

/**
 * Round the axis maximum up to a friendly number so gridlines land on round values.
 */
function niceCeiling(value: number): number {
    if (value <= 0) {
        return 1;
    }

    const magnitude = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 2.5, 5, 10].find(
        (candidate) => candidate * magnitude >= value,
    )!;

    return step * magnitude;
}

/**
 * Grouped monthly bars comparing money in (sales + other income) with expenses.
 */
export function FinanceTrendChart({ trend }: { trend: Month[] }) {
    const money = useMoney();
    const [active, setActive] = useState<number | null>(null);
    const [showTable, setShowTable] = useState(false);

    const peak = Math.max(
        0,
        ...trend.flatMap((month) => [month.income, month.expenses]),
    );
    const ceiling = niceCeiling(peak);
    const ticks = [ceiling, ceiling / 2, 0];
    const height = (value: number) =>
        `${(Math.max(0, value) / ceiling) * 100}%`;
    const isEmpty = peak === 0;

    return (
        <section className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-display text-lg">
                        Money in vs expenses
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Last {trend.length} months
                    </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <LegendItem color={INCOME_COLOR} label="Money in" />
                    <LegendItem color={EXPENSE_COLOR} label="Expenses" />
                    <button
                        type="button"
                        onClick={() => setShowTable((value) => !value)}
                        className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                        {showTable ? 'Show chart' : 'Show table'}
                    </button>
                </div>
            </div>

            {showTable ? (
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm [&_td]:py-1.5 [&_th]:py-1.5">
                        <thead className="text-left text-xs text-muted-foreground uppercase">
                            <tr>
                                <th>Month</th>
                                <th className="text-right">Money in</th>
                                <th className="text-right">Expenses</th>
                                <th className="text-right">Net</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {trend.map((month) => (
                                <tr key={month.month}>
                                    <td>
                                        {monthYearFormatter.format(
                                            toDate(month.month),
                                        )}
                                    </td>
                                    <td className="text-right tabular-nums">
                                        {money(month.income)}
                                    </td>
                                    <td className="text-right tabular-nums">
                                        {money(month.expenses)}
                                    </td>
                                    <td className="text-right font-medium tabular-nums">
                                        {money(month.net_profit)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : isEmpty ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                    No sales or expenses recorded in the last {trend.length}{' '}
                    months yet.
                </p>
            ) : (
                <div className="mt-6 flex gap-2">
                    <div className="flex h-56 flex-col justify-between pb-0 text-right text-xs text-muted-foreground tabular-nums">
                        {ticks.map((tick) => (
                            <span
                                key={tick}
                                className="first:-translate-y-1/2 last:translate-y-1/2"
                            >
                                {compactFormatter.format(tick / 100)}
                            </span>
                        ))}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div
                            className="relative flex h-56 items-end gap-1 sm:gap-2"
                            onMouseLeave={() => setActive(null)}
                        >
                            {ticks.map((tick, index) => (
                                <div
                                    key={tick}
                                    className={cn(
                                        'pointer-events-none absolute inset-x-0 border-t',
                                        index === ticks.length - 1
                                            ? 'border-border'
                                            : 'border-dashed border-border/60',
                                    )}
                                    style={{
                                        top: `${(index / (ticks.length - 1)) * 100}%`,
                                    }}
                                />
                            ))}
                            {trend.map((month, index) => (
                                <div
                                    key={month.month}
                                    tabIndex={0}
                                    role="img"
                                    aria-label={`${monthYearFormatter.format(toDate(month.month))}: money in ${money(month.income)}, expenses ${money(month.expenses)}`}
                                    onMouseEnter={() => setActive(index)}
                                    onFocus={() => setActive(index)}
                                    onBlur={() => setActive(null)}
                                    className={cn(
                                        'relative flex h-full flex-1 items-end justify-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        active === index && 'bg-muted/50',
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'w-full max-w-4 rounded-t-[4px]',
                                            INCOME_COLOR,
                                        )}
                                        style={{ height: height(month.income) }}
                                    />
                                    <div
                                        className={cn(
                                            'w-full max-w-4 rounded-t-[4px]',
                                            EXPENSE_COLOR,
                                        )}
                                        style={{
                                            height: height(month.expenses),
                                        }}
                                    />
                                    {active === index && (
                                        <Tooltip
                                            month={month}
                                            align={
                                                index < 2
                                                    ? 'left'
                                                    : index >= trend.length - 2
                                                      ? 'right'
                                                      : 'center'
                                            }
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 flex gap-1 sm:gap-2">
                            {trend.map((month, index) => (
                                <span
                                    key={month.month}
                                    className={cn(
                                        'flex-1 text-center text-[11px] text-muted-foreground',
                                        index % 2 === 1 && 'max-sm:invisible',
                                    )}
                                >
                                    {monthFormatter.format(toDate(month.month))}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className={cn('size-2.5 rounded-sm', color)} />
            {label}
        </span>
    );
}

function Tooltip({
    month,
    align,
}: {
    month: Month;
    align: 'left' | 'center' | 'right';
}) {
    const money = useMoney();

    return (
        <div
            className={cn(
                'pointer-events-none absolute top-0 z-10 w-48 rounded-xl border bg-popover p-3 text-xs text-popover-foreground shadow-lg',
                align === 'left' && 'left-0',
                align === 'center' && 'left-1/2 -translate-x-1/2',
                align === 'right' && 'right-0',
            )}
        >
            <p className="mb-2 font-medium">
                {monthYearFormatter.format(toDate(month.month))}
            </p>
            <TooltipRow color={INCOME_COLOR} label="Money in">
                {money(month.income)}
            </TooltipRow>
            <TooltipRow color={EXPENSE_COLOR} label="Expenses">
                {money(month.expenses)}
            </TooltipRow>
            <div className="mt-2 flex justify-between border-t pt-2 font-medium">
                <span>Net</span>
                <span className="tabular-nums">{money(month.net_profit)}</span>
            </div>
        </div>
    );
}

function TooltipRow({
    color,
    label,
    children,
}: {
    color: string;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3 py-0.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn('size-2 rounded-sm', color)} />
                {label}
            </span>
            <span className="tabular-nums">{children}</span>
        </div>
    );
}
