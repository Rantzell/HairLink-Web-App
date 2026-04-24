<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class HairRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'reference',
        'contact_number',
        'gender',
        'story',
        'additional_photo',
        'status',
        'appointment_at',
        'notes',
        'documents',
        'wig_length',
        'wig_color',
        'medical_certificate',
        'diagnosis_photo',
        'recipient_photo',
    ];

    protected $appends = [
        'medical_certificate_url',
        'diagnosis_photo_url',
        'recipient_photo_url',
        'additional_photo_url',
        'documents_urls'
    ];

    protected $casts = [
        'appointment_at' => 'datetime',
        'documents' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function statusHistories()
    {
        return $this->morphMany(StatusHistory::class, 'trackable');
    }

    public function getMedicalCertificateUrlAttribute()
    {
        return ($this->medical_certificate && $this->medical_certificate !== '0') ? Storage::disk('s3')->url($this->medical_certificate) : null;
    }

    public function getDiagnosisPhotoUrlAttribute()
    {
        return ($this->diagnosis_photo && $this->diagnosis_photo !== '0') ? Storage::disk('s3')->url($this->diagnosis_photo) : null;
    }

    public function getRecipientPhotoUrlAttribute()
    {
        return ($this->recipient_photo && $this->recipient_photo !== '0') ? Storage::disk('s3')->url($this->recipient_photo) : null;
    }

    public function getAdditionalPhotoUrlAttribute()
    {
        return ($this->additional_photo && $this->additional_photo !== '0') ? Storage::disk('s3')->url($this->additional_photo) : null;
    }

    public function getDocumentsUrlsAttribute()
    {
        if (!$this->documents || !is_array($this->documents)) return [];
        return array_map(function ($path) {
            return Storage::disk('s3')->url($path);
        }, $this->documents);
    }
}
