<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        $role = $user->role;

        // Redirect to the appropriate profile view based on role
        if ($role === 'donor') {
            return view('pages.donor-profile');
        } elseif ($role === 'recipient') {
            return view('pages.recipient-profile'); // Assuming this exists or will be created
        }

        return redirect()->back();
    }

    public function update(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'bio' => 'nullable|string|max:1000',
            'age' => 'nullable|integer|min:1|max:120',
            'gender' => 'nullable|string|in:male,female,other',
            'profile_photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120', // 5MB max
        ]);

        $updateData = [
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'phone' => $validated['phone'],
            'bio' => $validated['bio'],
            'age' => $validated['age'],
            'gender' => $validated['gender'],
        ];

        if ($request->hasFile('profile_photo')) {
            // Delete old photo if exists
            if ($user->profile_photo_path) {
                Storage::disk('supabase')->delete('profile-photos/' . $user->profile_photo_path);
            }

            // Store new photo
            $path = $request->file('profile_photo')->store('profile-photos', 'supabase');
            $updateData['profile_photo_path'] = basename($path);
        }

        $user->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully!',
            'user' => $user->fresh()
        ]);
    }
}
