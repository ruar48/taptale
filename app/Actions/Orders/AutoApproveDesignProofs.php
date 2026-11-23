<?php

namespace App\Actions\Orders;

use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Enums\ProofStatus;
use App\Models\DesignProof;
use Illuminate\Support\Facades\DB;

/**
 * Approves design proofs the customer neither approved nor asked to change
 * within the allowed time (see the Terms of service), so finished designs do
 * not wait forever. Only the newest proof of an open order qualifies. The
 * approval is final, like one the customer gives, and both the customer and
 * the team are told.
 */
class AutoApproveDesignProofs
{
    /**
     * Proofs handled per run, so one run never takes long.
     */
    public const BATCH_SIZE = 25;

    /**
     * @return int How many proofs were approved.
     */
    public function handle(int $batchSize = self::BATCH_SIZE): int
    {
        $hours = (int) config('taptale.proof_auto_approve_hours');

        if ($hours <= 0) {
            return 0;
        }

        $proofs = DesignProof::query()
            ->with('order')
            ->where('status', ProofStatus::AwaitingResponse)
            ->where('created_at', '<=', now()->subHours($hours))
            ->oldest()
            ->limit($batchSize)
            ->get();

        $approved = 0;

        foreach ($proofs as $proof) {
            if ($this->approve($proof, $hours)) {
                $approved++;
            }
        }

        return $approved;
    }

    /**
     * Approve one proof, re-checking under a row lock that the customer has
     * not replied meanwhile and that it is still the newest proof.
     */
    private function approve(DesignProof $proof, int $hours): bool
    {
        $order = $proof->order;

        if ($order === null || ! $order->status->isOpen()) {
            return false;
        }

        return DB::transaction(function () use ($proof, $order, $hours): bool {
            $locked = DesignProof::query()->lockForUpdate()->find($proof->id);

            if ($locked === null || ! $locked->isAwaitingResponse() || $locked->version !== (int) $order->proofs()->max('version')) {
                return false;
            }

            $locked->update([
                'status' => ProofStatus::Approved,
                'responded_at' => now(),
            ]);

            // An unpaid order stays in its payment status and moves on to
            // "Design Approved" once the payment is verified.
            if (! $order->status->isPaymentStage()) {
                $order->update(['status' => OrderStatus::DesignApproved]);
            }

            $order->recordActivity(
                ActivityType::DesignApproved,
                "Design v{$locked->version} was approved automatically because we did not hear back within {$hours} hours. As our Terms of service explain, this approval is final.",
            );

            return true;
        });
    }
}
