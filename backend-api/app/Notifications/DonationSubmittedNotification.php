<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DonationSubmittedNotification extends Notification
{
    use Queueable;

    public $donation;
    public $type;

    public function __construct($donation, $type = 'hair')
    {
        $this->donation = $donation;
        $this->type = $type;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $label = $this->type === 'hair' ? 'Hair Donation' : 'Monetary Support';
        $ref = $this->type === 'hair' ? $this->donation->reference : $this->donation->reference_number;

        return [
            'title' => "$label Submitted! 🎉",
            'message' => "Your $label (#$ref) has been successfully submitted and is now pending review. We will notify you once it's verified!",
            'type' => $this->type === 'hair' ? 'hair_donation' : 'monetary_donation',
            'reference' => $ref,
        ];
    }
}
