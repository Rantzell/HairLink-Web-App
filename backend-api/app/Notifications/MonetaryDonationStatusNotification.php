<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class MonetaryDonationStatusNotification extends Notification
{
    use Queueable;

    public $donation;
    public $status;

    public function __construct($donation, $status)
    {
        $this->donation = $donation;
        $this->status = $status;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $isApproved = $this->status === 'Approved';
        $title = $isApproved ? 'Monetary Donation Approved! 💖' : 'Monetary Donation Update ⚠️';
        $message = $isApproved 
            ? "Thank you! Your monetary donation (#{$this->donation->reference_number}) of {$this->donation->currency} " . number_format($this->donation->amount, 2) . " has been verified and approved. You have earned star points for this contribution!"
            : "Your monetary donation (#{$this->donation->reference_number}) could not be verified. Remarks: {$this->donation->remarks}";

        return [
            'title' => $title,
            'message' => $message,
            'type' => 'monetary_donation',
            'status' => $this->status,
            'reference' => $this->donation->reference_number,
        ];
    }
}
