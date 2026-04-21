<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class StatusHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'trackable_id',
        'trackable_type',
        'status',
        'notes',
        'metadata',
    ];

    protected $appends = [
        'preview_photo_url'
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function trackable()
    {
        return $this->morphTo();
    }

    public function getPreviewPhotoUrlAttribute()
    {
        $data = $this->metadata;
        if (is_array($data) && isset($data['preview_photo'])) {
            return Storage::disk('s3')->url($data['preview_photo']);
        }
        return null;
    }
}
