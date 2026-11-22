<?php

namespace App\Http\Controllers\Account;

use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Enums\ProofStatus;
use App\Http\Controllers\Controller;
use App\Models\DesignProof;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class DesignProofController extends Controller
{
    /**
     * Approve the latest design proof.
     */
    public function approve(Request $request, Order $order, DesignProof $proof): RedirectResponse
    {
        $this->ensureRespondable($order, $proof);

        $validated = $request->validate([
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $proof->update([
            'status' => ProofStatus::Approved,
            'customer_comment' => $validated['comment'] ?? null,
            'responded_at' => now(),
        ]);

        $this->moveUnlessAwaitingPayment($order, OrderStatus::DesignApproved);
        $order->recordActivity(
            ActivityType::DesignApproved,
            trim("Design v{$proof->version} approved. ".($validated['comment'] ?? '')),
            $request->user(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => $order->status->isPaymentStage()
            ? __('Design approved! We will start production once your payment is complete.')
            : __('Design approved! We will start production soon.')]);

        return back();
    }

    /**
     * Request changes to the latest design proof.
     */
    public function requestRevision(Request $request, Order $order, DesignProof $proof): RedirectResponse
    {
        $this->ensureRespondable($order, $proof);

        $validated = $request->validate([
            'comment' => ['required', 'string', 'min:5', 'max:2000'],
        ], ['comment.required' => 'Please tell us what you would like to change.']);

        $proof->update([
            'status' => ProofStatus::RevisionRequested,
            'customer_comment' => $validated['comment'],
            'responded_at' => now(),
        ]);

        $this->moveUnlessAwaitingPayment($order, OrderStatus::RevisionRequested);
        $order->recordActivity(
            ActivityType::RevisionRequested,
            "Revision requested for design v{$proof->version}: {$validated['comment']}",
            $request->user(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Thanks! Our designers will revise your design.')]);

        return back();
    }

    /**
     * Responding to a design must never skip payment: an unpaid order stays
     * in its payment status (the response is kept on the proof) and moves
     * on to the right design status once the payment is verified.
     */
    private function moveUnlessAwaitingPayment(Order $order, OrderStatus $status): void
    {
        if (! $order->status->isPaymentStage()) {
            $order->update(['status' => $status]);
        }
    }

    /**
     * Only the order owner may respond, only to the latest proof, and only once.
     *
     * @throws ValidationException
     */
    private function ensureRespondable(Order $order, DesignProof $proof): void
    {
        Gate::authorize('update', $order);

        abort_unless($proof->order_id === $order->id, 404);

        $latestVersion = (int) $order->proofs()->max('version');

        if ($proof->version !== $latestVersion || ! $proof->isAwaitingResponse()) {
            throw ValidationException::withMessages([
                'proof' => 'This design is no longer awaiting your response.',
            ]);
        }

        if (! $order->status->isOpen()) {
            throw ValidationException::withMessages([
                'proof' => 'This order is closed.',
            ]);
        }
    }
}
