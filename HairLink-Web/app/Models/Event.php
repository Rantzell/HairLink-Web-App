<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'date',
        'description',
        'location',
        'status', // Upcoming, Completed, Cancelled
        'participants_count',
    ];

    protected $casts = [
        'date' => 'date',
    ];
}
