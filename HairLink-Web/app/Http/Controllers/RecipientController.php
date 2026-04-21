<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\HairRequest;
use Illuminate\Support\Facades\Auth;

class RecipientController extends Controller
{
    public function dashboard()
    {
        $user = Auth::user();
        if (!$user) return redirect('/login');

        $requests = HairRequest::with(['statusHistories', 'user'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        // Points: 1 star for every ₱100 donated
        $monetaryDonations = \App\Models\MonetaryDonation::where('user_id', $user->id)
            ->where('status', 'Completed')
            ->sum('amount');
        
        $monetaryPoints = floor($monetaryDonations / 100);

        // 5 points for utilizing a referral code
        $referralPoints = $user->referred_by ? 5 : 0;
        
        $points = $monetaryPoints + $referralPoints;

        return view('pages.recipient-dashboard', compact('requests', 'points'));
    }

    public function tracking()
    {
        $user = Auth::user();
        if (!$user) return redirect('/login');

        $requests = HairRequest::with(['statusHistories', 'user'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return view('pages.recipient-tracking', compact('requests'));
    }

    public function trackingDetail($reference)
    {
        $user = Auth::user();
        if (!$user) return redirect('/login');

        $query = HairRequest::with(['statusHistories', 'user'])
            ->where('reference', $reference);
            
        if (!in_array($user->role, ['staff', 'admin'])) {
            $query->where('user_id', $user->id);
        }

        $requestData = $query->firstOrFail();

        return view('pages.recipient-tracking-detail', compact('requestData'));
    }

    public function confirmation(Request $request)
    {
        $user = Auth::user();
        if (!$user) return redirect('/login');

        $reference = $request->query('ref');
        $query = HairRequest::with(['statusHistories', 'user']);
            
        if (!in_array($user->role, ['staff', 'admin'])) {
            $query->where('user_id', $user->id);
        }

        if ($reference) {
            $requestData = $query->where('reference', $reference)->first();
        } else {
            $requestData = $query->orderBy('created_at', 'desc')->first();
        }

        if (!$requestData) {
            return redirect()->route('recipient.dashboard');
        }

        return view('pages.recipient-confirmation', compact('requestData'));
    }
}
