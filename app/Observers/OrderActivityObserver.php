<?php

namespace App\Observers;

use App\Enums\ActivityType;
use App\Models\OrderActivity;
use App\Models\User;
use App\Notifications\AdminOrderAlert;
use App\Notifications\OrderUpdated;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Every order event lands on the order timeline, so the timeline is where
 * customer and studio emails are sent from.
 */
class OrderActivityObserver
{
    /**
     * "Payment to verify" emails per customer per day, and for the whole shop
     * per hour. Anyone can upload a receipt, so without a ceiling a farm of
     * accounts sending junk receipts could flood the team's inbox. Payments
     * past the ceiling still appear on the admin Payments page.
     */
    private const RECEIPT_ALERTS_PER_CUSTOMER_PER_DAY = 3;

    private const RECEIPT_ALERTS_PER_HOUR = 30;

    /**
     * Handle the OrderActivity "created" event.
     */
    public function created(OrderActivity $activity): void
    {
        $order = $activity->order;

        if (OrderUpdated::isNotable($order, $activity) && $order->user !== null) {
            $order->user->notify(new OrderUpdated($order, $activity));
        }

        if (AdminOrderAlert::isNotable($order, $activity) && $this->withinReceiptAlertBudget($activity)) {
            $admins = User::query()->where('is_admin', true)->get();

            if ($admins->isNotEmpty()) {
                Notification::send($admins, new AdminOrderAlert($order, $activity));
            }
        }
    }

    private function withinReceiptAlertBudget(OrderActivity $activity): bool
    {
        if ($activity->type !== ActivityType::PaymentSubmitted) {
            return true;
        }

        $customerKey = 'admin-alerts:receipts:customer:'.$activity->order->user_id;
        $shopKey = 'admin-alerts:receipts:shop';

        if (RateLimiter::tooManyAttempts($customerKey, self::RECEIPT_ALERTS_PER_CUSTOMER_PER_DAY)
            || RateLimiter::tooManyAttempts($shopKey, self::RECEIPT_ALERTS_PER_HOUR)) {
            return false;
        }

        RateLimiter::hit($customerKey, 86400);
        RateLimiter::hit($shopKey, 3600);

        return true;
    }
}
