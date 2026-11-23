<?php

namespace App\Actions\Orders;

use App\Actions\Payments\ClosePayMongoCheckout;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\OrderFile;
use App\Models\Payment;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Cancels orders nobody paid for within the allowed time and deletes the
 * photos and files the customer uploaded for them (the order's files and its
 * memory page). Without this, accounts could park unpaid orders full of
 * uploads forever.
 *
 * Only untouched orders qualify: waiting for payment, no money received and
 * no receipt waiting to be checked. Design proofs and payment records stay
 * for the shop's history. The customer gets the usual cancellation email.
 */
class CancelAbandonedOrders
{
    /**
     * Orders handled per run, so one run never takes long.
     */
    public const BATCH_SIZE = 25;

    public function __construct(private ClosePayMongoCheckout $closeCheckout) {}

    /**
     * @return int How many orders were cancelled.
     */
    public function handle(int $batchSize = self::BATCH_SIZE): int
    {
        $days = (int) config('taptale.abandoned_order_days');

        if ($days <= 0) {
            return 0;
        }

        $orders = Order::query()
            ->with(['payments', 'files', 'experience'])
            ->whereIn('status', [OrderStatus::PendingOrder, OrderStatus::AwaitingPayment])
            ->where('created_at', '<=', now()->subDays($days))
            ->oldest()
            ->limit($batchSize)
            ->get();

        $cancelled = 0;

        foreach ($orders as $order) {
            if ($order->amountPaid() > 0 || ! $this->closeOpenCheckouts($order)) {
                continue;
            }

            $order->moveTo(
                OrderStatus::Cancelled,
                note: "Cancelled automatically because it was not paid within {$days} days. The photos you uploaded for it were removed. You are welcome to order again anytime.",
            );

            $this->deleteUploads($order);
            $cancelled++;
        }

        return $cancelled;
    }

    /**
     * Retire any online checkout still open, so nobody pays for an order
     * after it is cancelled. False when one turns out to be paid already (or
     * PayMongo can't be reached), in which case the order is left alone.
     */
    private function closeOpenCheckouts(Order $order): bool
    {
        $openCheckouts = $order->payments->filter(
            fn (Payment $payment): bool => $payment->status === PaymentStatus::Pending && $payment->gateway_checkout_id !== null,
        );

        try {
            foreach ($openCheckouts as $payment) {
                if (! $this->closeCheckout->handle($payment)) {
                    return false;
                }
            }
        } catch (Throwable $exception) {
            report($exception);

            return false;
        }

        return true;
    }

    private function deleteUploads(Order $order): void
    {
        $order->files->each(function (OrderFile $file): void {
            Storage::disk($file->disk)->delete($file->path);
            $file->delete();
        });

        $experience = $order->experience;

        if ($experience === null) {
            return;
        }

        $disk = Storage::disk((string) config('taptale.uploads_disk'));
        $disk->delete(array_values(array_filter([...($experience->photos ?? []), ...($experience->rain_photos ?? []), $experience->audio_path, $experience->video_path])));
        $experience->delete();
    }
}
