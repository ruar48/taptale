<?php

namespace App\Notifications;

use App\Concerns\EscapesMarkdown;
use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderActivity;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * Emails the customer when something on their order needs their attention
 * or moves it forward. Driven by the order timeline (OrderActivityObserver).
 */
class OrderUpdated extends Notification implements ShouldQueue
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
     * Whether a timeline entry is worth an email to the customer. Customers
     * are not emailed about what they did themselves, except the order
     * confirmation.
     */
    public static function isNotable(Order $order, OrderActivity $activity): bool
    {
        if ($activity->is_internal) {
            return false;
        }

        if ($activity->type !== ActivityType::Placed && $activity->user_id !== null && $activity->user_id === $order->user_id) {
            return false;
        }

        return match ($activity->type) {
            ActivityType::Placed,
            ActivityType::PaymentVerified,
            ActivityType::PaymentRejected,
            ActivityType::ProofSent,
            ActivityType::Note => true,
            ActivityType::StatusChanged => in_array($activity->status, [OrderStatus::Shipped, OrderStatus::Completed, OrderStatus::Cancelled], true),
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
        $orderUrl = route('account.orders.show', $this->order);
        $mail = (new MailMessage)->greeting('Hi '.$this->plain(Str::before($this->order->customer_name, ' ')).',');

        return match (true) {
            $this->activity->type === ActivityType::Placed => $mail
                ->subject("We received your order {$reference}")
                ->line("Thank you for your order of {$this->order->product_name}! Your total is {$this->money($this->order->total)}.")
                ->line('If you have not paid yet, you can pay or upload your receipt from your order page.')
                ->action('View your order', $orderUrl),

            $this->activity->type === ActivityType::PaymentVerified => $mail
                ->subject("Payment received for {$reference}")
                ->line('We received and verified your payment. Thank you!')
                ->line('We will keep you posted as your gift moves to design and production.')
                ->action('View your order', $orderUrl),

            $this->activity->type === ActivityType::PaymentRejected => $mail
                ->subject("We could not verify your payment for {$reference}")
                ->line((string) $this->activity->body)
                ->line('Please check the details and submit your payment again from your order page.')
                ->action('Review your payment', $orderUrl),

            $this->activity->type === ActivityType::ProofSent => $mail
                ->subject("Your design for {$reference} is ready")
                ->line('Your design proof is ready. Please take a look and approve it, or tell us what to change.')
                ->line('Nothing goes into production until you approve it.')
                ->action('Review your design', $orderUrl),

            $this->activity->type === ActivityType::Note => $mail
                ->subject("A message about your order {$reference}")
                ->line((string) $this->activity->body)
                ->action('View your order', $orderUrl),

            $this->activity->status === OrderStatus::Shipped => $this->shippedMail($mail, $orderUrl),

            $this->activity->status === OrderStatus::Completed => $mail
                ->subject("Thank you for choosing Taptale ({$reference})")
                ->line('Your order is complete. We hope your gift made someone smile!')
                ->line('Would you share a short review? It helps other gift-givers and means a lot to our small team.')
                ->action('Leave a review', $orderUrl.'#review'),

            default => $mail
                ->subject("Your order {$reference} was cancelled")
                ->line('Your order has been cancelled.')
                ->lineIf(filled($this->activity->body), (string) $this->activity->body)
                ->line('If you paid already, we will contact you about your refund.')
                ->action('View your order', $orderUrl),
        };
    }

    private function shippedMail(MailMessage $mail, string $orderUrl): MailMessage
    {
        $mail->subject("Your order {$this->order->reference} is on its way")
            ->line("Good news — your {$this->order->product_name} has shipped!");

        if (filled($this->order->courier)) {
            $mail->line('Courier: '.$this->order->courier);
        }

        if (filled($this->order->tracking_number)) {
            $mail->line('Tracking number: '.$this->order->tracking_number);
        }

        return filled($this->order->tracking_url)
            ? $mail->action('Track your package', (string) $this->order->tracking_url)
            : $mail->action('View your order', $orderUrl);
    }

    private function money(int $centavos): string
    {
        return config('taptale.currency_symbol').number_format($centavos / 100, 2);
    }
}
