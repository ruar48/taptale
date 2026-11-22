<?php

namespace App\Http\Controllers\Admin;

use App\Enums\FinanceEntryType;
use App\Enums\FinancePeriod;
use App\Enums\OrderStatus;
use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\FinanceEntry;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * CSV downloads of orders and money movements for spreadsheets and
 * bookkeeping. Amounts are in pesos.
 */
class ExportController extends Controller
{
    /**
     * Orders matching the same filters as the orders list.
     */
    public function orders(Request $request): StreamedResponse
    {
        $status = OrderStatus::tryFrom($request->string('status')->toString());
        $search = $request->string('search')->trim()->toString();

        $orders = Order::query()
            ->with('payments')
            ->filtered($status, $search)
            ->latest()
            ->latest('id');

        return $this->download('taptale-orders-'.now()->format('Y-m-d').'.csv', [
            'Reference', 'Date', 'Status', 'Customer', 'Email', 'Phone', 'Product', 'Quantity',
            'Subtotal', 'Promo code', 'Discount', 'Design fee', 'Delivery', 'Adjustment', 'Total', 'Paid', 'Balance',
            'City', 'Province', 'Gift', 'Courier', 'Tracking number',
        ], function () use ($orders): iterable {
            foreach ($orders->lazy(200) as $order) {
                yield [
                    $order->reference,
                    $order->created_at?->format('Y-m-d H:i'),
                    $order->status->label(),
                    $order->customer_name,
                    $order->customer_email,
                    $order->customer_phone,
                    $order->product_name,
                    $order->quantity,
                    $this->pesos($order->subtotal),
                    $order->promo_code,
                    $this->pesos($order->discount),
                    $this->pesos($order->customization_fee),
                    $this->pesos($order->delivery_fee),
                    $this->pesos($order->adjustment),
                    $this->pesos($order->total),
                    $this->pesos($order->amountPaid()),
                    $this->pesos($order->balanceDue()),
                    $order->city,
                    $order->province,
                    $order->is_gift ? 'Yes' : 'No',
                    $order->courier,
                    $order->tracking_number,
                ];
            }
        });
    }

    /**
     * Every money movement in the period: verified order payments and refunds
     * plus the manual ledger. Money in is positive, money out negative.
     */
    public function finance(Request $request): StreamedResponse
    {
        $period = FinancePeriod::tryFrom($request->string('period')->toString()) ?? FinancePeriod::ThisMonth;
        $start = $period->start();
        $end = $period->end();

        $payments = Payment::query()
            ->with('order:id,reference')
            ->where('status', PaymentStatus::Verified)
            ->when($start, fn (Builder $query) => $query->whereRaw('coalesce(reviewed_at, created_at) >= ?', [$start]))
            ->when($end, fn (Builder $query) => $query->whereRaw('coalesce(reviewed_at, created_at) <= ?', [$end]))
            ->orderByRaw('coalesce(reviewed_at, created_at)');

        $entries = FinanceEntry::query()->filtered($period)->orderBy('occurred_on')->orderBy('id');

        return $this->download("taptale-finance-{$period->value}-".now()->format('Y-m-d').'.csv', [
            'Date', 'Type', 'Category', 'Description', 'Order', 'Amount', 'Notes',
        ], function () use ($payments, $entries): iterable {
            foreach ($payments->lazy(200) as $payment) {
                $isRefund = $payment->kind === PaymentKind::Refund;

                yield [
                    ($payment->reviewed_at ?? $payment->created_at)?->format('Y-m-d'),
                    $isRefund ? 'Refund' : 'Order payment',
                    null,
                    $payment->reference_number,
                    $payment->order?->reference,
                    $this->pesos($isRefund ? -$payment->amount : $payment->amount),
                    $payment->notes,
                ];
            }

            foreach ($entries->lazy(200) as $entry) {
                $isMoneyOut = in_array($entry->type, [FinanceEntryType::Expense, FinanceEntryType::Withdrawal], true);

                yield [
                    $entry->occurred_on->format('Y-m-d'),
                    $entry->type->label(),
                    $entry->category?->label(),
                    $entry->description,
                    null,
                    $this->pesos($isMoneyOut ? -$entry->amount : $entry->amount),
                    $entry->notes,
                ];
            }
        });
    }

    /**
     * Stream rows as a CSV file Excel opens with the right encoding.
     *
     * @param  list<string>  $headers
     * @param  callable(): iterable<list<string|int|float|null>>  $rows
     */
    private function download(string $filename, array $headers, callable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows): void {
            $output = fopen('php://output', 'w');

            if ($output === false) {
                throw new RuntimeException('The CSV output stream could not be opened.');
            }

            fwrite($output, "\xEF\xBB\xBF");
            fputcsv($output, $headers, escape: '');

            foreach ($rows() as $row) {
                fputcsv($output, array_map($this->cell(...), $row), escape: '');
            }

            fclose($output);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Customer-typed text that starts like a formula (=, +, -, @) would run
     * as one in a spreadsheet, so it is prefixed with an apostrophe. Numbers
     * we generate are left alone.
     */
    private function cell(string|int|float|null $value): string|int|float|null
    {
        if (is_string($value) && $value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'".$value;
        }

        return $value;
    }

    private function pesos(int $centavos): float
    {
        return round($centavos / 100, 2);
    }
}
