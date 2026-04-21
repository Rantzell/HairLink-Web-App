<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;

Route::get('/', function () {
    return view('pages.landing');
});

Route::view('/login', 'pages.login')->name('login');
Route::post('/login', [AuthController::class, 'login'])->name('login.post');
Route::view('/register', 'pages.register')->name('register');
Route::post('/register', [AuthController::class, 'register'])->name('register.post');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Password Reset Routes
Route::get('/forgot-password', [AuthController::class, 'showForgotPassword'])->name('password.request');
Route::post('/forgot-password', [AuthController::class, 'sendResetLink'])->name('password.email');
Route::get('/reset-password/{token}', [AuthController::class, 'showResetPassword'])->name('password.reset');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.update');
Route::post('/internal-api/partnership', [App\Http\Controllers\PartnershipController::class, 'store'])->name('partnership.store');
Route::get('/dashboard', function () {
    $role = Illuminate\Support\Facades\Auth::user()->role;
    return redirect()->route($role . '.dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');


// Email Verification Routes
Route::get('/email/verify', function () {
    return view('pages.verify-email');
})->middleware('auth')->name('verification.notice');

Route::post('/email/verify-otp', function (Request $request) {
    $request->validate([
        'otp' => 'required|digits:6',
    ]);

    $user = $request->user();
    $cachedOtp = \Illuminate\Support\Facades\Cache::get('email_otp_' . $user->id);

    if (!$cachedOtp || $cachedOtp != $request->otp) {
        return back()->with('error', 'Invalid or expired OTP. Please try again or request a new one.');
    }

    if (!$user->hasVerifiedEmail()) {
        $user->markEmailAsVerified();
        event(new \Illuminate\Auth\Events\Verified($user));
        \Illuminate\Support\Facades\Cache::forget('email_otp_' . $user->id);
    }

    return redirect(route($user->role . '.dashboard'))->with('success', 'Email verified successfully!');
})->middleware(['auth'])->name('verification.verify.otp');

Route::post('/email/verification-notification', function (Request $request) {
    if ($request->expectsJson()) {
        $request->user()->sendEmailVerificationNotification();
        return response()->json(['message' => 'OTP sent!']);
    }

    $request->user()->sendEmailVerificationNotification();
    return back()->with('message', 'OTP sent! Please check your email.');
})->middleware(['auth', 'throttle:6,1'])->name('verification.send');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/donor/dashboard', [App\Http\Controllers\DonorController::class, 'dashboard'])->name('donor.dashboard');
    Route::view('/donor/donate', 'pages.donate-dashboard')->name('donor.donate');
    Route::get('/donor/tracking', [App\Http\Controllers\DonorController::class, 'tracking'])->name('donor.tracking');
    Route::get('/donor/tracking/{reference}', [App\Http\Controllers\DonorController::class, 'trackingDetail'])->name('donor.tracking.detail');
    Route::get('/donor/confirmation', [App\Http\Controllers\DonorController::class, 'confirmation'])->name('donor.confirmation');
    Route::get('/donor/certificate', [App\Http\Controllers\DonorController::class, 'certificate'])->name('donor.certificate');
    Route::view('/donor/profile', 'pages.donor-profile')->name('donor.profile');
    Route::post('/profile/update', [App\Http\Controllers\ProfileController::class, 'update'])->name('profile.update');
    Route::view('/donor/community', 'pages.donor-community')->name('donor.community');

    Route::get('/recipient/dashboard', [App\Http\Controllers\RecipientController::class, 'dashboard'])->name('recipient.dashboard');
    Route::view('/recipient/request', 'pages.recipient-request')->name('recipient.request');
    Route::get('/recipient/tracking', [App\Http\Controllers\RecipientController::class, 'tracking'])->name('recipient.tracking');
    Route::get('/recipient/tracking/{reference}', [App\Http\Controllers\RecipientController::class, 'trackingDetail'])->name('recipient.tracking.detail');
    Route::get('/recipient/confirmation', [App\Http\Controllers\RecipientController::class, 'confirmation'])->name('recipient.confirmation');
    Route::view('/recipient/profile', 'pages.recipient-profile')->name('recipient.profile');
    Route::view('/recipient/community', 'pages.recipient-community')->name('recipient.community');
    Route::view('/recipient/haircare', 'pages.recipient-haircare')->name('recipient.haircare');

    // Internal API Routes for AJAX interaction
    Route::prefix('internal-api')->group(function () {
        // Donations
        Route::get('/donations', [App\Http\Controllers\Api\DonationController::class, 'index']);
        Route::post('/donations', [App\Http\Controllers\Api\DonationController::class, 'store']);
        Route::get('/donations/{reference}', [App\Http\Controllers\Api\DonationController::class, 'show']);
        Route::post('/donations/{reference}/status', [App\Http\Controllers\Api\DonationController::class, 'updateStatus']);

        // Hair Requests
        Route::get('/requests', [App\Http\Controllers\Api\HairRequestController::class, 'index']);
        Route::post('/requests', [App\Http\Controllers\Api\HairRequestController::class, 'store']);
        Route::get('/requests/{reference}', [App\Http\Controllers\Api\HairRequestController::class, 'show']);
        Route::post('/requests/{reference}/status', [App\Http\Controllers\Api\HairRequestController::class, 'updateStatus']);

        // Community
        Route::get('/community/posts', [App\Http\Controllers\Api\CommunityController::class, 'index']);
        Route::post('/community/posts', [App\Http\Controllers\Api\CommunityController::class, 'storePost']);
        Route::post('/community/posts/{post}/comments', [App\Http\Controllers\Api\CommunityController::class, 'storeComment']);
        Route::post('/community/posts/{post}/like', [App\Http\Controllers\Api\CommunityController::class, 'toggleLike']);
        Route::delete('/community/posts/{post}', [App\Http\Controllers\Api\CommunityController::class, 'destroyPost']);
        Route::delete('/community/comments/{comment}', [App\Http\Controllers\Api\CommunityController::class, 'destroyComment']);

        // Haircare
        Route::get('/haircare/articles', [App\Http\Controllers\Api\HaircareController::class, 'articles']);
        Route::get('/haircare/articles/{id}', [App\Http\Controllers\Api\HaircareController::class, 'article']);
        Route::get('/haircare/videos', [App\Http\Controllers\Api\HaircareController::class, 'videos']);
        // Partnerships
        // Remaining sections...

        Route::post('/referral/submit', [App\Http\Controllers\ReferralController::class, 'submitCode'])->name('api.referral.submit');

    });

    Route::get('/donor/monetary-donation', function () {
        return view('pages.monetary-donation', ['userRole' => 'donor']);
    })->name('donor.monetary');
    Route::post('/donor/monetary-donation', [\App\Http\Controllers\MonetaryDonationController::class, 'store'])->name('donor.monetary.store');

    Route::get('/recipient/monetary-donation', function () {
        return view('pages.monetary-donation', ['userRole' => 'recipient']);
    })->name('recipient.monetary');
    Route::post('/recipient/monetary-donation', [\App\Http\Controllers\MonetaryDonationController::class, 'store'])->name('recipient.monetary.store');

    Route::get('/wigmaker/dashboard', [App\Http\Controllers\WigmakerController::class, 'dashboard'])->name('wigmaker.dashboard');
    Route::get('/wigmaker/production-tasks', [App\Http\Controllers\WigmakerController::class, 'productionTasks'])->name('wigmaker.production-tasks');
    Route::get('/wigmaker/tasks/{taskCode}', [App\Http\Controllers\WigmakerController::class, 'taskDetail'])->name('wigmaker.task.detail');
    Route::post('/wigmaker/tasks/{taskCode}/update', [App\Http\Controllers\WigmakerController::class, 'updateTask'])->name('wigmaker.task.update');

    Route::get('/staff/dashboard', [App\Http\Controllers\StaffController::class, 'dashboard'])->name('staff.dashboard');
    Route::get('/staff/donor-verification', [App\Http\Controllers\StaffController::class, 'donorVerification'])->name('staff.donor-verification');
    Route::get('/staff/recipient-verification', [App\Http\Controllers\StaffController::class, 'recipientVerification'])->name('staff.recipient-verification');
    Route::get('/staff/verification/{type}/{reference}', [App\Http\Controllers\StaffController::class, 'verificationDetail'])->whereIn('type', ['donor', 'recipient'])->name('staff.verification.detail');
    Route::post('/staff/verification/{type}/{reference}/status', [App\Http\Controllers\StaffController::class, 'updateVerificationStatus'])->whereIn('type', ['donor', 'recipient'])->name('staff.verification.status');
    Route::get('/staff/realtime-tracking', [App\Http\Controllers\StaffController::class, 'realtimeTracking'])->name('staff.realtime-tracking');
    Route::post('/staff/tracking/{reference}/assign-wigmaker', [App\Http\Controllers\StaffController::class, 'assignWigmaker'])->name('staff.tracking.assign-wigmaker');
    Route::post('/staff/tracking/{reference}/update-status', [App\Http\Controllers\StaffController::class, 'updateTrackingStatus'])->name('staff.tracking.update-status');
    Route::get('/staff/delivery-batches', [App\Http\Controllers\StaffController::class, 'deliveryBatches'])->name('staff.delivery-batches');
    Route::get('/staff/hair-stock', [App\Http\Controllers\StaffController::class, 'hairStock'])->name('staff.hair-stock');
    Route::get('/staff/wig-stock', [App\Http\Controllers\StaffController::class, 'wigStock'])->name('staff.wig-stock');
    Route::get('/staff/recipient-matching-list', [App\Http\Controllers\StaffController::class, 'recipientMatchingList'])->name('staff.recipient-matching-list');
    Route::get('/staff/rule-matching', [App\Http\Controllers\StaffController::class, 'ruleMatching'])->name('staff.rule-matching');
    Route::post('/staff/matching/match', [App\Http\Controllers\StaffController::class, 'matchWigToRequest'])->name('staff.matching.match');

    Route::get('/admin/dashboard', [App\Http\Controllers\AdminController::class, 'dashboard'])->name('admin.dashboard');
    Route::get('/admin/verification', [App\Http\Controllers\AdminController::class, 'verification'])->name('admin.verification');
    Route::get('/admin/matching', [App\Http\Controllers\AdminController::class, 'matching'])->name('admin.matching');
    Route::get('/admin/operations', [App\Http\Controllers\AdminController::class, 'operations'])->name('admin.operations');
    Route::get('/admin/inventory', [App\Http\Controllers\AdminController::class, 'inventory'])->name('admin.inventory');
    Route::get('/admin/users', [App\Http\Controllers\AdminController::class, 'users'])->name('admin.users');
    Route::post('/admin/users/{id}/toggle', [App\Http\Controllers\AdminController::class, 'toggleUser'])->name('admin.users.toggle');
    Route::get('/admin/events', [App\Http\Controllers\AdminController::class, 'events'])->name('admin.events');
    Route::post('/admin/events', [App\Http\Controllers\AdminController::class, 'storeEvent'])->name('admin.events.store');
    Route::get('/admin/community', [App\Http\Controllers\AdminController::class, 'community'])->name('admin.community');
    Route::delete('/admin/community/{id}', [App\Http\Controllers\AdminController::class, 'deleteCommunityPost'])->name('admin.community.delete');
    Route::get('/admin/reports', [App\Http\Controllers\AdminController::class, 'reports'])->name('admin.reports');
});
