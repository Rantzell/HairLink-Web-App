<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\OneSignal\OneSignalChannel;
use NotificationChannels\OneSignal\OneSignalMessage;

class DonationReceivedNotification extends Notification
{
    use Queueable;

    public $donation;

    /**
     * Create a new notification instance.
     */
    public function __construct($donation)
    {
        $this->donation = $donation;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'/*, OneSignalChannel::class*/];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('We have received your hair donation!')
            ->greeting('Hello ' . $notifiable->first_name . '!')
            ->line('We are happy to inform you that we have physically received your hair donation (#' . $this->donation->reference . ').')
            ->line('Your hair will now be queued for wig production.')
            ->action('View Progress', url('/donor/tracking/' . $this->donation->reference))
            ->line('Thank you for choosing to make a difference!');
    }

    /**
     * Send OneSignal Push Notification.
     */
    public function toOneSignal($notifiable)
    {
        return OneSignalMessage::create()
            ->setSubject("Hair Received! 📦")
            ->setBody("Your donation #{$this->donation->reference} has arrived safely! Tap to see what's next.")
            ->setData('reference', $this->donation->reference)
            ->setData('type', 'donation_received');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Hair Received! 📦',
            'message' => "Your donation #{$this->donation->reference} has arrived safely! Tap to see what's next.",
            'type' => 'donation',
            'reference' => $this->donation->reference,
        ];
    }
}
