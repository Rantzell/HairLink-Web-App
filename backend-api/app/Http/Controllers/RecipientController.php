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

    public function confirmWigReceived(Request $request, $reference)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized', 'success' => false], 401);
        }

        $hairRequest = HairRequest::where('reference', $reference)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if ($hairRequest->status !== 'In Transit') {
            return response()->json([
                'message' => 'Wig can only be confirmed when status is In Transit.',
                'success' => false
            ], 422);
        }

        $hairRequest->update([
            'status' => 'Completed',
            'wig_received_at' => now(),
        ]);

        $hairRequest->statusHistories()->create([
            'status' => 'Completed',
            'notes' => 'Recipient confirmed wig received',
        ]);

        return response()->json([
            'message' => 'Wig received confirmed! Your request is now complete.',
            'success' => true,
            'wig_received_at' => $hairRequest->wig_received_at->format('M d, Y h:i A'),
        ]);
    }
}
