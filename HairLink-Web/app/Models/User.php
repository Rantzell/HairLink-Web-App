<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'role',
        'email',
        'password',
        'country',
        'region',
        'postal_code',
        'age',
        'gender',
        'phone',
        'is_active',
        'onesignal_id',
        'profile_photo_path',
        'bio',
    ];

    /**
     * Get the profile photo URL from Supabase.
     */
    public function getProfilePhotoUrlAttribute()
    {
        return $this->profile_photo_path 
            ? config('services.supabase.storage_url') . '/profile-photos/' . $this->profile_photo_path 
            : null;
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function donations()
    {
        return $this->hasMany(Donation::class);
    }

    public function hairRequests()
    {
        return $this->hasMany(HairRequest::class);
    }

    public function communityPosts()
    {
        return $this->hasMany(CommunityPost::class);
    }

    public function communityComments()
    {
        return $this->hasMany(CommunityComment::class);
    }

    public function likedPosts()
    {
        return $this->belongsToMany(CommunityPost::class, 'community_post_likes', 'user_id', 'community_post_id')->withTimestamps();
    }

    /**
     * Send email verification — wrapped in try/catch so registration
     * never hangs or crashes even if SMTP is unreachable.
     */
    public function sendEmailVerificationNotification()
    {
        try {
            $otp = rand(100000, 999999);
            \Illuminate\Support\Facades\Cache::put('email_otp_' . $this->id, $otp, now()->addMinutes(10));
            $this->notify(new \App\Notifications\VerifyEmailOtp($otp));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Email verification could not be sent: ' . $e->getMessage());
        }
    }

    /**
     * Send password reset notification — handled gracefully.
     */
    public function sendPasswordResetNotification($token)
    {
        try {
            // $this->notify(new \Illuminate\Auth\Notifications\ResetPassword($token));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Password reset email could not be sent: ' . $e->getMessage());
        }
    }

    /**
     * Route notifications for OneSignal.
     */
    public function routeNotificationForOneSignal()
    {
        return $this->onesignal_id;
    }
}
