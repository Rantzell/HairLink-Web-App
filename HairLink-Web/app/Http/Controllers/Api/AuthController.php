<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Handle mobile login and issue token.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'device_name' => 'required|string',
            'onesignal_id' => 'nullable|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Check if user is active
        if (!$user->is_active) {
            return response()->json(['message' => 'Account is deactivated. Please contact support.'], 403);
        }

        // Sync OneSignal ID if provided
        if ($request->filled('onesignal_id')) {
            $user->update(['onesignal_id' => $request->onesignal_id]);
        }

        $token = $user->createToken($request->device_name)->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user
        ]);
    }

    /**
     * Handle mobile registration.
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|in:donor,recipient',
            'device_name' => 'required|string',
        ]);

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'name' => $validated['first_name'] . ' ' . $validated['last_name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_active' => true,
        ]);

        $token = $user->createToken($validated['device_name'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user
        ], 201);
    }

    /**
     * Logout and revoke current token.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'role' => 'nullable|string|in:Donor,Recipient',
            'email' => 'nullable|email|unique:users,email,' . $user->id,
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user
        ]);
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|max:10240',
        ]);

        $user = $request->user();
        
        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('profile-photos', 'public');
            $user->update(['profile_photo_path' => $path]);
            
            return response()->json([
                'message' => 'Avatar uploaded successfully',
                'avatar_url' => asset('storage/' . $path)
            ]);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }

    /**
     * Get authenticated user profile.
     */
    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Handle account deletion (App Store Compliance).
     */
    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        // Revoke all tokens
        $user->tokens()->delete();
        
        // Logical or physical delete based on requirements
        // Here we do a physical delete as it's a typical requirement for "Right to be forgotten"
        $user->delete();

        return response()->json(['message' => 'Your account has been permanently deleted. We are sorry to see you go.']);
    }
}
