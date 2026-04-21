<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class HairRequestController extends Controller
{
    public function index()
    {
        $requests = Auth::user()->hairRequests()->with('user')->orderBy('created_at', 'desc')->get();
        return response()->json($requests);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'reference' => 'required|string|unique:hair_requests',
            'contact_number' => 'nullable|string',
            'gender' => 'nullable|string',
            'story' => 'nullable|string',
            'medical_certificate' => 'nullable|file|max:10240',
            'diagnosis_photo' => 'nullable|image|max:10240',
            'recipient_photo' => 'nullable|image|max:10240',
            'additional_photo' => 'nullable|image|max:10240',
            'documents.*' => 'nullable|file|max:10240',
            'appointment_at' => 'nullable|date',
            'notes' => 'nullable|string',
            'wig_length' => 'nullable|string',
            'wig_color' => 'nullable|string',
        ]);

        if ($request->hasFile('medical_certificate')) {
            $validated['medical_certificate'] = $request->file('medical_certificate')->store('requests/verification', 'public');
        }

        if ($request->hasFile('diagnosis_photo')) {
            $validated['diagnosis_photo'] = $request->file('diagnosis_photo')->store('requests/verification', 'public');
        }

        if ($request->hasFile('recipient_photo')) {
            $validated['recipient_photo'] = $request->file('recipient_photo')->store('requests/verification', 'public');
        }

        if ($request->hasFile('additional_photo')) {
            $validated['additional_photo'] = $request->file('additional_photo')->store('requests/photos', 'public');
        }

        if ($request->hasFile('documents')) {
            $docs = [];
            foreach ($request->file('documents') as $file) {
                $docs[] = $file->store('requests/documents', 'public');
            }
            $validated['documents'] = $docs;
        }

        $hairRequest = Auth::user()->hairRequests()->create($validated);

        // Record initial status in history
        $hairRequest->statusHistories()->create([
            'status' => 'Submitted'
        ]);

        return response()->json($hairRequest, 201);
    }

    public function show($reference)
    {
        $hairRequest = Auth::user()->hairRequests()
            ->where('reference', $reference)
            ->with(['statusHistories', 'user'])
            ->first();

        if (!$hairRequest) {
            return response()->json(['message' => 'Request not found'], 404);
        }

        return response()->json($hairRequest);
    }

    public function updateStatus(Request $request, $reference)
    {
        $user = Auth::user();
        $query = HairRequest::where('reference', $reference);
        
        // If not staff/admin, they can only update their own
        if (!in_array($user->role, ['staff', 'admin'])) {
            $query->where('user_id', $user->id);
        }

        $hairRequest = $query->firstOrFail();
        
        $validated = $request->validate([
            'status' => 'required|string'
        ]);

        if ($hairRequest->status !== $validated['status']) {
            $hairRequest->update(['status' => $validated['status']]);
            $hairRequest->statusHistories()->create(['status' => $validated['status']]);
        }

        return response()->json($hairRequest->load(['statusHistories', 'user']));
    }
}
