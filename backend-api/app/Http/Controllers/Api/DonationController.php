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
        $donations = Auth::user()->donations()->with('user')->orderBy('created_at', 'desc')->get();
        return response()->json($donations);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'reference' => 'required|string|unique:donations',
            'type' => 'required|string|in:hair,monetary',
            // Hair fields
            'hair_length' => 'required_if:type,hair|string',
            'hair_color' => 'required_if:type,hair|string',
            'treated_hair' => 'boolean',
            'address' => 'nullable|string',
            'reason' => 'nullable|string',
            // Monetary fields
            'full_name' => 'required_if:type,monetary|string',
            'amount' => 'required_if:type,monetary|numeric',
            'words_amount' => 'nullable|string',
            'anonymous' => 'boolean',
            // Files
            'photo_front' => 'nullable|image|max:10240',
            'photo_side' => 'nullable|image|max:10240',
            'proof_photo' => 'nullable|image|max:10240',
        ]);

        if ($request->hasFile('photo_front')) {
            $validated['photo_front'] = $request->file('photo_front')->store('donations/photos', 'public');
        }

        if ($request->hasFile('photo_side')) {
            $validated['photo_side'] = $request->file('photo_side')->store('donations/photos', 'public');
        }

        if ($request->hasFile('proof_photo')) {
            $validated['proof_url'] = $request->file('proof_photo')->store('donations/proofs', 'public');
        }

        $donation = Auth::user()->donations()->create($validated);

        // Record initial status in history
        $donation->statusHistories()->create([
            'status' => 'Submitted'
        ]);

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
}
