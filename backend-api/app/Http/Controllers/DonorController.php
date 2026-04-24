<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Donation;
use App\Models\HairRequest;
use Illuminate\Support\Facades\Auth;

class DonorController extends Controller
{
    public function dashboard()
    {
        $user = Auth::user();
        if (!$user) return redirect('/login');

        // Fetch hair donations first
        $donations = Donation::with('statusHistories')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        // Points: 1 star for every ₱100 donated monetary
        $monetaryDonations = \App\Models\MonetaryDonation::where('user_id', $user->id)
            ->where('status', 'Completed')
            ->sum('amount');
        
        $monetaryPoints = floor($monetaryDonations / 100);
        // 10 stars for hair donations where staff has actually received the hair
        $receivedStatuses = ['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'];
        $hairPoints = $donations->whereIn('status', $receivedStatuses)->count() * 10;
        
        // 5 stars for utilizing a referral code
        $referralPoints = $user->referred_by ? 5 : 0;
        
        $points = $monetaryPoints + $hairPoints + $referralPoints;

        return view('pages.donor-dashboard', compact('donations', 'points'));
    }

    public function tracking()
    {
        $user = Auth::user();
        if (!$user) return redirect('/login');

        $donations = Donation::with('statusHistories')->where('user_id', $user->id)->orderBy('created_at', 'desc')->get();
        return view('pages.donor-tracking', compact('donations'));
    }

    public function trackingDetail($reference)
    {
        $user = Auth::user();
        
        $query = Donation::with('statusHistories')->where('reference', $reference);
        if (!in_array($user->role, ['staff', 'admin'])) {
            $query->where('user_id', $user->id);
        }
        
        $donation = $query->firstOrFail();
        
        return view('pages.donor-tracking-detail', compact('donation'));
    }

    public function certificate(Request $request)
    {
        $user = Auth::user();
        if (!$user) return redirect('/login');

        $ref = $request->query('ref');
        
        $query = Donation::whereIn('status', ['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received']);
        
        if (!in_array($user->role, ['staff', 'admin'])) {
            $query->where('user_id', $user->id);
        }

        if ($ref) {
            $donation = $query->where('reference', $ref)->first();
        } else {
            $donation = $query->orderBy('created_at', 'desc')->first();
        }
                             
        return view('pages.donor-certificate', compact('donation'));
    }

    public function confirmation(Request $request)
    {
        $user = Auth::user();
        if (!$user) return redirect('/login');

        $ref = $request->query('ref');
        
        $query = Donation::query();
        if (!in_array($user->role, ['staff', 'admin'])) {
            $query->where('user_id', $user->id);
        }

        if ($ref) {
            $donation = $query->where('reference', $ref)->first();
        } else {
            $donation = $query->orderBy('created_at', 'desc')->first();
        }

        if (!$donation) return redirect()->route('donor.dashboard');

        return view('pages.donor-confirmation', compact('donation'));
    }
}
