<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class HairRequestSubmittedNotification extends Notification
{
    use Queueable;

    public $hairRequest;

    public function __construct($hairRequest)
    {
        $this->hairRequest = $hairRequest;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Request Pending! 💜',
            'message' => "Your hair request (#{$this->hairRequest->reference}) has been successfully submitted and is now pending medical review. We'll notify you once verified!",
            'type' => 'wig',
            'reference' => $this->hairRequest->reference,
        ];
    }
}
