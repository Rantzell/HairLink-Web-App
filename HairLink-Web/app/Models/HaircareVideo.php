<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HaircareVideo extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'category',
        'source',
        'video_id',
        'author',
        'duration',
        'views',
        'description'
    ];
}
