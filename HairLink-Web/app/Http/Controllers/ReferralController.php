<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class ReferralController extends Controller
{
    public function submitCode(Request $request)
    {
        $request->validate([
            'referral_code' => 'required|string|max:20'
        ]);

        $user = Auth::user();
        $code = strtoupper(trim($request->referral_code));

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        // 1. Check if user already used a code
        if ($user->referred_by) {
            return response()->json(['success' => false, 'message' => 'You have already used a referral code.'], 400);
        }

        // 2. Prevent using own code
        if ($user->referral_code === $code) {
            return response()->json(['success' => false, 'message' => 'You cannot use your own referral code.'], 400);
        }

        // 3. Check if referral code exists
        $referrer = User::where('referral_code', $code)->first();
        if (!$referrer) {
            return response()->json(['success' => false, 'message' => 'Invalid referral code.'], 404);
        }

        // 4. Save
        $user->referred_by = $referrer->id;
        $user->save();

        return response()->json([
            'success' => true, 
            'message' => 'Referral code applied successfully!'
        ], 200);
    }
}
