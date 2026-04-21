<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HaircareArticle extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'category',
        'author',
        'excerpt',
        'content',
        'read_time',
        'image'
    ];
}
