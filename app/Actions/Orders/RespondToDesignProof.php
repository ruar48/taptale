<?php

namespace App\Actions\Orders;

use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Enums\ProofStatus;
use App\Models\DesignProof;
use App\Models\Order;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * The customer's answer to a design proof, given from their order page or
 * from the approval link the studio shared with them.
 */
class RespondToDesignProof
{
    /**
     * Approve the latest design proof. Approval is final.
     *
     * @throws ValidationException
     */
    public function approve(Order $order, DesignProof $proof, ?string $comment, ?User $actor): void
    {
        $this->ensureRespondable($order, $proof);

        $proof->update([
            'status' => ProofStatus::Approved,
            'customer_comment' => $comment,
            'responded_at' => now(),
        ]);

        $this->moveUnlessAwaitingPayment($order, OrderStatus::DesignApproved);
        $order->recordActivity(
            ActivityType::DesignApproved,
            trim("Design v{$proof->version} approved. ".($comment ?? '')),
            $actor,
        );
    }

    /**
     * Ask the studio to change the latest design proof.
     *
     * @throws ValidationException
     */
    public function requestRevision(Order $order, DesignProof $proof, string $comment, ?User $actor): void
    {
        $this->ensureRespondable($order, $proof);

        $proof->update([
            'status' => ProofStatus::RevisionRequested,
            'customer_comment' => $comment,
            'responded_at' => now(),
        ]);

        $this->moveUnlessAwaitingPayment($order, OrderStatus::RevisionRequested);
        $order->recordActivity(
            ActivityType::RevisionRequested,
            "Revision requested for design v{$proof->version}: {$comment}",
            $actor,
        );
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
     * Only the latest proof of an open order can be answered, and only once.
     *
     * @throws ValidationException
     */
    private function ensureRespondable(Order $order, DesignProof $proof): void
    {
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
