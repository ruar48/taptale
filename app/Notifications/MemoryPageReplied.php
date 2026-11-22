<?php

namespace App\Notifications;

use App\Concerns\EscapesMarkdown;
use App\Models\DigitalExperience;
use App\Models\ExperienceReply;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the owner of a memory page that the person who tapped it wrote back.
 */
class MemoryPageReplied extends Notification implements ShouldQueue
{
    use EscapesMarkdown, Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public DigitalExperience $experience, public ExperienceReply $reply)
    {
        $this->onConnection(config('taptale.notifications_connection'));
        $this->afterCommit();
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
        $from = filled($this->reply->name) ? $this->reply->name : 'Someone';

        return (new MailMessage)
            ->subject("{$from} replied to your memory page 💌")
            ->greeting($this->plain($from).' wrote back!')
            ->line('They opened "'.$this->plain($this->experience->title).'" and left you a message:')
            ->line('“'.$this->plain($this->reply->message).'”')
            ->action('See all replies', route('account.experiences.edit', $this->experience).'#replies');
    }
}
