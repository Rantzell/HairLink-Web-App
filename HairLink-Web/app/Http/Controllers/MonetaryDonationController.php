<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MonetaryDonation;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class MonetaryDonationController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:10',
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'payment_method' => 'required|string',
            'proofDonation' => 'required|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:10240',
        ]);

        $reference = 'MD-' . strtoupper(Str::random(10));
        $proofPath = null;

        if ($request->hasFile('proofDonation')) {
            $proofPath = $request->file('proofDonation')->store('monetary-donations', 'supabase');
        }

        $donation = MonetaryDonation::create([
            'user_id' => Auth::check() ? Auth::id() : null,
            'name' => $validated['name'] ?? null,
            'email' => $validated['email'] ?? null,
            'amount' => $validated['amount'],
            'currency' => $request->input('currency', 'PHP'),
            'payment_method' => $validated['payment_method'],
            'reference_number' => $reference,
            'proof_path' => $proofPath,
            'status' => 'Submitted', // Changed from Completed to allow staff review
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Monetary donation processed successfully!',
                'reference' => $reference
            ]);
        }

        return redirect()->back()->with('success', 'Thank you! Your donation has been received. Reference: ' . $reference);
    }
}
