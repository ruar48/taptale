<?php

namespace App\Notifications;

use App\Concerns\EscapesMarkdown;
use App\Enums\ActivityType;
use App\Enums\OrderChannel;
use App\Models\Order;
use App\Models\OrderActivity;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the studio team that a customer did something they need to act on.
 *
 * Unpaid orders alone don't email the team: anyone can place (and cancel)
 * one, so alerting on those would let a script flood the team's inbox. The
 * team hears about an order once there is something to do: a receipt to
 * check, an online payment that landed, a free or cash-on-delivery order to
 * start, a design response or a review.
 */
class AdminOrderAlert extends Notification implements ShouldQueue
{
    use EscapesMarkdown, Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public Order $order, public OrderActivity $activity)
    {
        $this->onConnection(config('taptale.notifications_connection'));
        $this->afterCommit();
    }

    /**
     * Whether a timeline entry needs the team's attention.
     */
    public static function isNotable(Order $order, OrderActivity $activity): bool
    {
        return match ($activity->type) {
            // A free or cash-on-delivery order has no payment to wait for:
            // work starts now. Orders the studio took itself need no alert.
            ActivityType::Placed => $order->channel === OrderChannel::Website
                && ($order->total === 0 || $order->paymentMethod?->isCashOnDelivery() === true),
            // Paid online (confirmed by PayMongo, not by a team member).
            ActivityType::PaymentVerified => $activity->user_id === null,
            ActivityType::PaymentSubmitted,
            ActivityType::RevisionRequested,
            ActivityType::DesignApproved,
            ActivityType::DesignSubmitted,
            ActivityType::ReviewSubmitted => true,
            default => false,
        };
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $reference = $this->order->reference;

        $subject = match ($this->activity->type) {
            ActivityType::Placed => $this->order->total === 0 ? "New free order {$reference}" : "New cash on delivery order {$reference}",
            ActivityType::PaymentVerified => "Paid online: {$reference}",
            ActivityType::PaymentSubmitted => "Payment to verify on {$reference}",
            ActivityType::RevisionRequested => "Revision requested on {$reference}",
            ActivityType::DesignApproved => "Design approved on {$reference}",
            ActivityType::DesignSubmitted => "Photos and details ready to design on {$reference}",
            ActivityType::ReviewSubmitted => "New review to approve ({$reference})",
            default => "Update on {$reference}",
        };

        return (new MailMessage)
            ->subject($subject)
            ->greeting($subject)
            ->line($this->plain($this->order->customer_name).' · '.$this->plain($this->order->product_name))
            ->lineIf(filled($this->activity->body), $this->plain($this->activity->body))
            ->action('Open in admin', route('admin.orders.show', $this->order));
    }
}
