<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class HairRequestStatusNotification extends Notification
{
    use Queueable;

    public $hairRequest;
    public $status;

    public function __construct($hairRequest, $status)
    {
        $this->hairRequest = $hairRequest;
        $this->status = $status;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $statusLabel = ucfirst($this->status);
        $icon = ($this->status === 'approved' || $this->status === 'Validated') ? '🎉' : '✨';
        
        return [
            'title' => "Request $statusLabel! $icon",
            'message' => "Great news! Your hair request (#{$this->hairRequest->reference}) status has been updated to: $statusLabel.",
            'type' => 'wig',
            'reference' => $this->hairRequest->reference,
        ];
    }
}
