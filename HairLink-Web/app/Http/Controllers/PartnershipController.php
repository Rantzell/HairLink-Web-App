<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Partnership;

class PartnershipController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'organization' => 'nullable|string|max:255',
            'message' => 'required|string',
        ]);

        Partnership::create($validated);

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Thank you for your interest! We will contact you soon.', 'success' => true]);
        }
        
        return back()->with('success', 'Thank you for your interest! We will contact you soon.');
    }
}
