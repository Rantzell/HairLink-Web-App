<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\OneSignal\OneSignalChannel;
use NotificationChannels\OneSignal\OneSignalMessage;

class DonationApprovedNotification extends Notification
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
            ->subject('Your hair donation has been approved!')
            ->greeting('Hello ' . $notifiable->first_name . '!')
            ->line('Your hair donation request (#' . $this->donation->reference . ') has been verified and approved by our staff.')
            ->line('Please deliver your hair to our Receiving Area: Manila Downtown YMCA (945 Sabino Padilla St., Sta. Cruz, Manila).')
            ->line('We are excited to move forward with your donation.')
            ->action('Track Your Donation', url('/donor/tracking/' . $this->donation->reference))
            ->line('Thank you for your generosity!');
    }

    /**
     * Send OneSignal Push Notification.
     */
    public function toOneSignal($notifiable)
    {
        return OneSignalMessage::create()
            ->setSubject("Donation Approved! ✅")
            ->setBody("Approved! Please drop off your hair at Manila Downtown YMCA (945 Sabino Padilla St., Sta. Cruz, Manila).")
            ->setData('reference', $this->donation->reference)
            ->setData('type', 'donation_update');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $isHair = !isset($this->donation->amount);
        $typeLabel = $isHair ? 'Hair Donation' : 'Monetary Support';
        
        $message = $isHair 
            ? "Your hair donation #{$this->donation->reference} has been approved. Please deliver your hair to: Manila Downtown YMCA (945 Sabino Padilla St., Sta. Cruz, Manila)."
            : "Your monetary support (#{$this->donation->reference_number}) has been verified. Thank you for your generosity!";

        return [
            'title' => "$typeLabel Approved! ✅",
            'message' => $message,
            'type' => $isHair ? 'hair_donation' : 'monetary_donation',
            'reference' => $isHair ? $this->donation->reference : $this->donation->reference_number,
        ];
    }
}
