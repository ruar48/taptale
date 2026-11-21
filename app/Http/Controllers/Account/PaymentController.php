<?php

namespace App\Http\Controllers\Account;

use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PaymentController extends Controller
{
    /**
     * Submit proof of a manual payment for verification.
     */
    public function store(Request $request, Order $order): RedirectResponse
    {
        Gate::authorize('update', $order);

        $order->load('payments');

        if (! $order->status->acceptsPayment() || $order->balanceDue() === 0) {
            throw ValidationException::withMessages(['payment' => 'This order is not awaiting payment.']);
        }

        if ($order->payments->contains(fn ($payment) => $payment->status === PaymentStatus::Submitted)) {
            throw ValidationException::withMessages(['payment' => 'A payment is already awaiting verification.']);
        }

        $validated = $request->validate([
            'payment_method_id' => ['required', 'integer', Rule::exists('payment_methods', 'id')->where('is_active', true)],
            'amount' => ['required', 'numeric', 'min:1', 'max:'.($order->balanceDue() / 100)],
            'reference_number' => ['required', 'string', 'max:100'],
            'proof' => ['required', File::types(['jpg', 'jpeg', 'png', 'webp', 'pdf'])->max((int) config('taptale.max_upload_kilobytes'))],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'amount.max' => 'The amount cannot be more than the balance due.',
            'proof.required' => 'Please upload a screenshot or photo of your payment receipt.',
        ]);

        $disk = (string) config('taptale.uploads_disk');

        $order->payments()->create([
            'payment_method_id' => $validated['payment_method_id'],
            'kind' => PaymentKind::Payment,
            'status' => PaymentStatus::Submitted,
            'amount' => (int) round($validated['amount'] * 100),
            'reference_number' => $validated['reference_number'],
            'proof_disk' => $disk,
            'proof_path' => $request->file('proof')->store("payments/{$order->id}", $disk),
            'notes' => $validated['notes'] ?? null,
        ]);

        $order->update([
            'payment_method_id' => $validated['payment_method_id'],
            'status' => OrderStatus::PaymentVerification,
        ]);
        $order->recordActivity(ActivityType::PaymentSubmitted, "Payment submitted (ref. {$validated['reference_number']}).", $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Payment submitted! We will verify it shortly.')]);

        return back();
    }
}
