<?php

namespace App\Notifications;

use App\Concerns\EscapesMarkdown;
use App\Enums\ActivityType;
use App\Models\Order;
use App\Models\OrderActivity;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the studio team that a customer did something they need to act on.
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
    public static function isNotable(OrderActivity $activity): bool
    {
        return in_array($activity->type, [
            ActivityType::Placed,
            ActivityType::PaymentSubmitted,
            ActivityType::RevisionRequested,
            ActivityType::DesignApproved,
            ActivityType::Cancelled,
            ActivityType::ReviewSubmitted,
        ], true);
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
            ActivityType::Placed => "New order {$reference}",
            ActivityType::PaymentSubmitted => "Payment to verify on {$reference}",
            ActivityType::RevisionRequested => "Revision requested on {$reference}",
            ActivityType::DesignApproved => "Design approved on {$reference}",
            ActivityType::Cancelled => "Order {$reference} cancelled by the customer",
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
