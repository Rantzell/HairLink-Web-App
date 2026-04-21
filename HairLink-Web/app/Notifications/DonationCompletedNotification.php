<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\OneSignal\OneSignalChannel;
use NotificationChannels\OneSignal\OneSignalMessage;

class DonationCompletedNotification extends Notification
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
            ->subject('Your donation has been transformed into a wig!')
            ->greeting('Hello ' . $notifiable->first_name . '!')
            ->line('Wonderful news! The wig creation process for your donation (#' . $this->donation->reference . ') is complete.')
            ->line('Your hair has now been transformed into a beautiful wig, ready to be matched with a recipient in need.')
            ->action('View My Impact', url('/donor/tracking/' . $this->donation->reference))
            ->line('Thank you for your incredible contribution to the HairLink community!');
    }

    /**
     * Send OneSignal Push Notification.
     */
    public function toOneSignal($notifiable)
    {
        return OneSignalMessage::create()
            ->setSubject("Impact Alert! ✨")
            ->setBody("Your hair has been transformed into a beautiful wig! Tap to see your impact.")
            ->setData('reference', $this->donation->reference)
            ->setData('type', 'donation_complete');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Impact Alert! ✨',
            'message' => "Your hair has been transformed into a beautiful wig! Tap to see your impact.",
            'type' => 'wig',
            'reference' => $this->donation->reference,
        ];
    }
}
