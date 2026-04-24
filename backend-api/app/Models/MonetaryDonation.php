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
        'proof_path',
        'status', // Pending, Completed, Failed
        'remarks',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
