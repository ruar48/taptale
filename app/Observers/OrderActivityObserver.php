<?php

namespace App\Observers;

use App\Models\OrderActivity;
use App\Models\User;
use App\Notifications\AdminOrderAlert;
use App\Notifications\OrderUpdated;
use Illuminate\Support\Facades\Notification;

/**
 * Every order event lands on the order timeline, so the timeline is where
 * customer and studio emails are sent from.
 */
class OrderActivityObserver
{
    /**
     * Handle the OrderActivity "created" event.
     */
    public function created(OrderActivity $activity): void
    {
        $order = $activity->order;

        if (OrderUpdated::isNotable($order, $activity) && $order->user !== null) {
            $order->user->notify(new OrderUpdated($order, $activity));
        }

        if (AdminOrderAlert::isNotable($activity)) {
            $admins = User::query()->where('is_admin', true)->get();

            if ($admins->isNotEmpty()) {
                Notification::send($admins, new AdminOrderAlert($order, $activity));
            }
        }
    }
}
