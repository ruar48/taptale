<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\ConvertsPesos;
use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    use ConvertsPesos;

    /**
     * List submitted payments and refunds.
     */
    public function index(Request $request): Response
    {
        $status = PaymentStatus::tryFrom($request->string('status', PaymentStatus::Submitted->value)->toString());

        return Inertia::render('admin/payments/index', [
            'payments' => PaymentResource::collection(
                Payment::query()
                    ->with(['order:id,reference,customer_name,total,status', 'method:id,name'])
                    ->when($status, fn ($query) => $query->where('status', $status))
                    ->latest()
                    ->latest('id')
                    ->paginate(20)
                    ->withQueryString()
            ),
            'filters' => ['status' => $status->value ?? 'all'],
            'pendingCount' => Payment::query()->where('status', PaymentStatus::Submitted)->count(),
        ]);
    }

    /**
     * Verify a submitted payment and advance the order when fully paid.
     */
    public function verify(Request $request, Payment $payment): RedirectResponse
    {
        $this->ensureSubmitted($payment);

        $validated = $request->validate([
            'review_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($request, $payment, $validated): void {
            $payment->update([
                'status' => PaymentStatus::Verified,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'review_notes' => $validated['review_notes'] ?? null,
            ]);

            $order = $payment->order;

            $order->recordActivity(ActivityType::PaymentVerified, 'Payment verified. Thank you!', $request->user());

            $order->advanceAfterPayment($request->user());
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Payment verified.')]);

        return back();
    }

    /**
     * Reject a submitted payment and ask the customer to pay again.
     */
    public function reject(Request $request, Payment $payment): RedirectResponse
    {
        $this->ensureSubmitted($payment);

        $validated = $request->validate([
            'review_notes' => ['required', 'string', 'max:1000'],
        ], ['review_notes.required' => 'Please tell the customer why the payment was rejected.']);

        $payment->update([
            'status' => PaymentStatus::Rejected,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $validated['review_notes'],
        ]);

        $order = $payment->order;

        if ($order->status === OrderStatus::PaymentVerification) {
            $order->update(['status' => OrderStatus::AwaitingPayment]);
        }

        $order->recordActivity(ActivityType::PaymentRejected, "Payment could not be verified: {$validated['review_notes']}", $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Payment rejected and the customer was notified on their order page.')]);

        return back();
    }

    /**
     * Record a refund against an order.
     */
    public function refund(Request $request, Order $order): RedirectResponse
    {
        $order->load('payments');

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:'.($order->amountPaid() / 100)],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['required', 'string', 'max:1000'],
        ], ['amount.max' => 'A refund cannot exceed the amount paid.']);

        $order->payments()->create([
            'kind' => PaymentKind::Refund,
            'status' => PaymentStatus::Verified,
            'amount' => $this->toCentavos($validated['amount']),
            'reference_number' => $validated['reference_number'] ?? null,
            'notes' => $validated['notes'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'payment_method_id' => $order->payment_method_id,
        ]);

        $order->recordActivity(ActivityType::Refunded, "Refund issued: {$validated['notes']}", $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Refund recorded.')]);

        return back();
    }

    /**
     * @throws ValidationException
     */
    private function ensureSubmitted(Payment $payment): void
    {
        if ($payment->status !== PaymentStatus::Submitted || $payment->kind !== PaymentKind::Payment) {
            throw ValidationException::withMessages(['payment' => 'This payment has already been reviewed.']);
        }
    }
}
