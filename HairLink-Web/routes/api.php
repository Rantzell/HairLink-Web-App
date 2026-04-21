<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'service' => 'HairLink API']);
});

// Authentication Routes
Route::post('/login', [App\Http\Controllers\Api\AuthController::class, 'login']);
Route::post('/register', [App\Http\Controllers\Api\AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [App\Http\Controllers\Api\AuthController::class, 'me']);
    Route::post('/logout', [App\Http\Controllers\Api\AuthController::class, 'logout']);
    Route::post('/profile/update', [App\Http\Controllers\Api\AuthController::class, 'updateProfile']);
    Route::post('/profile/avatar', [App\Http\Controllers\Api\AuthController::class, 'uploadAvatar']);
    Route::delete('/account', [App\Http\Controllers\Api\AuthController::class, 'deleteAccount']);

    // Donations
    Route::get('/donations', [App\Http\Controllers\Api\DonationController::class, 'index']);
    Route::post('/donations', [App\Http\Controllers\Api\DonationController::class, 'store']);
    Route::get('/donations/{reference}', [App\Http\Controllers\Api\DonationController::class, 'show']);

    // Hair Requests
    Route::get('/hair-requests', [App\Http\Controllers\Api\HairRequestController::class, 'index']);
    Route::post('/hair-requests', [App\Http\Controllers\Api\HairRequestController::class, 'store']);

    // Milestones & Gamification
    Route::get('/milestones', [App\Http\Controllers\Api\MilestoneController::class, 'summary']);

    // Notifications
    Route::get('/notifications', [App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);
});
