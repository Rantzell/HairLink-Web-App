<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Donation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DonationController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        
        $hairDonations = $user->donations()
            ->with('user')
            ->get()
            ->map(function($d) {
                $d->donation_type = 'hair';
                return $d;
            });

        $monetaryDonations = \App\Models\MonetaryDonation::where('user_id', $user->id)
            ->get()
            ->map(function($d) {
                $d->donation_type = 'monetary';
                $d->type = 'monetary'; // For consistency with mobile logic
                return $d;
            });

        $combined = $hairDonations->concat($monetaryDonations)->sortByDesc('created_at')->values();

        return response()->json($combined);
    }

    public function store(Request $request)
    {
        $type = $request->input('type', 'hair');

        \Log::info('Donation Attempt', [
            'type' => $type,
            'all' => $request->all(),
            'files' => $request->allFiles(),
        ]);

        if ($type === 'monetary') {
            $validated = $request->validate([
                'reference' => 'required|string',
                'full_name' => 'required|string',
                'amount' => 'required|numeric',
                'words_amount' => 'nullable|string',
                'anonymous' => 'boolean',
                'proof_photo' => 'nullable|mimes:jpeg,png,jpg,gif,svg,webp,heic,heif|max:10240',
            ]);

            $proofPath = null;
            if ($request->hasFile('proof_photo')) {
                $proofPath = $request->file('proof_photo')->store('monetary-donations', 'public');
            }

            $donation = \App\Models\MonetaryDonation::create([
                'user_id' => Auth::id(),
                'name' => $validated['full_name'],
                'amount' => $validated['amount'],
                'currency' => 'PHP',
                'payment_method' => 'Mobile App',
                'reference_number' => $validated['reference'],
                'proof_path' => $proofPath,
                'status' => 'Submitted',
                'remarks' => $validated['words_amount'] ?? null,
            ]);

            Auth::user()->notify(new \App\Notifications\DonationSubmittedNotification($donation, 'monetary'));

            return response()->json($donation, 201);
        }

        // Hair Donation Logic
        $validated = $request->validate([
            'reference' => 'required|string|unique:donations',
            'type' => 'required|string|in:hair',
            'hair_length' => 'required|string',
            'hair_color' => 'required|string',
            'treated_hair' => 'boolean',
            'address' => 'nullable|string',
            'reason' => 'nullable|string',
            'photo_front' => 'nullable|mimes:jpeg,png,jpg,gif,svg,webp,heic,heif|max:10240',
            'photo_side' => 'nullable|mimes:jpeg,png,jpg,gif,svg,webp,heic,heif|max:10240',
        ]);

        if ($request->hasFile('photo_front')) {
            $validated['photo_front'] = $request->file('photo_front')->store('donations/photos', 'public');
        }

        if ($request->hasFile('photo_side')) {
            $validated['photo_side'] = $request->file('photo_side')->store('donations/photos', 'public');
        }

        $donation = Auth::user()->donations()->create($validated);

        $donation->statusHistories()->create([
            'status' => 'Submitted'
        ]);

        Auth::user()->notify(new \App\Notifications\DonationSubmittedNotification($donation, 'hair'));

        return response()->json($donation, 201);
    }

    public function show($reference)
    {
        $donation = Auth::user()->donations()
            ->where('reference', $reference)
            ->with(['statusHistories', 'user'])
            ->first();

        if (!$donation) {
            return response()->json(['message' => 'Donation not found'], 404);
        }

        return response()->json($donation);
    }

    public function updateStatus(Request $request, $reference)
    {
        $user = Auth::user();
        $query = Donation::where('reference', $reference);
        
        // If not staff/admin, they can only update their own (for legacy simulation, though we removed those buttons)
        if (!in_array($user->role, ['staff', 'admin'])) {
            $query->where('user_id', $user->id);
        }

        $donation = $query->firstOrFail();
        
        $validated = $request->validate([
            'status' => 'required|string',
            'remarks' => 'nullable|string',
        ]);

        if ($donation->status !== $validated['status']) {
            $updateData = ['status' => $validated['status']];

            // Generate certificate when hair is received by staff
            if ($validated['status'] === 'Received Hair' && !$donation->certificate_no) {
                $updateData['certificate_no'] = 'CERT-' . date('Y') . '-' . substr($donation->reference, -6);
            }

            // Stamp received_wig_at when wig is received back from wigmaker
            if ($validated['status'] === 'Wig Received') {
                $updateData['received_wig_at'] = now();
            }

            $donation->update($updateData);
            $donation->statusHistories()->create(['status' => $validated['status']]);
        }

        return response()->json($donation->load(['statusHistories', 'user']));
    }

    public function updateDeliveryLink(Request $request, $reference)
    {
        $user = Auth::user();
        $donation = Donation::where('reference', $reference)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $validated = $request->validate([
            'donor_delivery_link' => 'required|string',
        ]);

        $donation->update([
            'donor_delivery_link' => $validated['donor_delivery_link']
        ]);

        return response()->json($donation->load(['statusHistories', 'user']));
    }
}
