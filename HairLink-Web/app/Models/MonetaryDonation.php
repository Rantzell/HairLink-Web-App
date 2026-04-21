<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MonetaryDonation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'amount',
        'currency',
        'payment_method',
        'reference_number',
        'status', // Pending, Completed, Failed
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
