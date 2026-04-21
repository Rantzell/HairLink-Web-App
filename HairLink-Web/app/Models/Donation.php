<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Donation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'reference',
        'hair_length',
        'hair_color',
        'treated_hair',
        'address',
        'reason',
        'dropoff_location',
        'appointment_at',
        'status',
        'certificate_no',
        'received_wig_at',
        'photo_front',
        'photo_side'
    ];

    protected $appends = [
        'photo_front_url',
        'photo_side_url'
    ];

    protected $casts = [
        'treated_hair' => 'boolean',
        'appointment_at' => 'datetime',
        'received_wig_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function statusHistories()
    {
        return $this->morphMany(StatusHistory::class, 'trackable');
    }

    public function getPhotoFrontUrlAttribute()
    {
        return ($this->photo_front && $this->photo_front !== '0') ? asset('storage/' . $this->photo_front) : null;
    }

    public function getPhotoSideUrlAttribute()
    {
        return ($this->photo_side && $this->photo_side !== '0') ? asset('storage/' . $this->photo_side) : null;
    }
}
