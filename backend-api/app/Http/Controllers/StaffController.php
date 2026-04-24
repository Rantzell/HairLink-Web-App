<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Donation;
use App\Models\HairRequest;
use App\Models\WigProduction;
use App\Models\User;
use App\Notifications\WigMatchedNotification;
use App\Notifications\DonationApprovedNotification;
use App\Notifications\DonationReceivedNotification;

class StaffController extends Controller
{
    public function dashboard()
    {
        $pendingDonations = Donation::where('status', 'Submitted')->count();
        $pendingRequests = HairRequest::where('status', 'Submitted')->count();
        
        // Hair Inventory = Physically received hair but not yet a wig
        $totalStock = Donation::where('status', 'Received Hair')->count();
        
        // Wig Builds In Progress
        $productionCount = WigProduction::whereIn('status', ['assigned', 'processing'])->count();
        
        // Completed Wig Stock
        $wigStockCount = WigProduction::where('status', 'completed')->count();

        return view('pages.staff-dashboard', compact(
            'pendingDonations', 
            'pendingRequests', 
            'totalStock', 
            'productionCount', 
            'wigStockCount'
        ));
    }

    public function donorVerification()
    {
        // Only show 'Submitted' donations — once approved (Verified) they leave this queue
        $donations = Donation::with('user')->where('status', 'Submitted')->get();
        return view('pages.staff-donor-verification', compact('donations'));
    }

    public function recipientVerification()
    {
        // Only show 'Submitted' requests — once approved (Validated) they leave this queue
        $requests = HairRequest::with('user')->where('status', 'Submitted')->get();
        return view('pages.staff-recipient-verification', compact('requests'));
    }

    public function verificationDetail($type, $reference)
    {
        $record = null;
        if ($type === 'donor') {
            $record = Donation::with('user')->where('reference', $reference)->firstOrFail();
        } else {
            $record = HairRequest::with('user')->where('reference', $reference)->firstOrFail();
        }

        return view('pages.staff-verification-detail', compact('type', 'reference', 'record'));
    }

    public function updateVerificationStatus(Request $request, $type, $reference)
    {
        $validated = $request->validate([
            'status' => 'required|string',
            'remarks' => 'required|string',
        ]);

        $record = null;
        if ($type === 'donor') {
            $record = Donation::where('reference', $reference)->firstOrFail();
        } else {
            $record = HairRequest::where('reference', $reference)->firstOrFail();
        }

        $record->update([
            'status' => $validated['status'],
        ]);

        // Save the status change to history
        $record->statusHistories()->create([
            'status' => $validated['status'],
            'notes' => $validated['remarks'],
        ]);

        // NEW: Trigger Donor Notification on Approval
        if ($type === 'donor' && $validated['status'] === 'Verified') {
            $record->user->notify(new DonationApprovedNotification($record));
        }

        return response()->json(['message' => 'Status updated successfully', 'success' => true]);
    }

    public function realtimeTracking()
    {
        // Fetch donations in tracking workflow (Verified and beyond)
        $donations = Donation::with('user')
            ->whereIn('status', ['Verified', 'Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'])
            ->orderBy('updated_at', 'desc')
            ->get();

        // Load wigmakers for assignment dropdown
        $wigmakers = User::where('role', 'wigmaker')->where('is_active', true)->get();

        // Load wig production records keyed by donation_id for status sync
        $wigProductions = WigProduction::with(['wigmaker', 'statusHistories'])
            ->whereIn('donation_id', $donations->pluck('id'))
            ->get()
            ->keyBy('donation_id');

        $requests = HairRequest::with('user')
            ->whereIn('status', ['Validated', 'In Production', 'Matched', 'In Transit', 'Arrived', 'Completed'])
            ->orderBy('updated_at', 'desc')
            ->get();

        return view('pages.staff-realtime-tracking', compact('donations', 'requests', 'wigmakers', 'wigProductions'));
    }

    /**
     * Staff assigns a wigmaker to a donation and moves it to In Queue.
     */
    public function assignWigmaker(Request $request, $reference)
    {
        $validated = $request->validate([
            'wigmaker_id' => 'required|exists:users,id',
        ]);

        $donation = Donation::where('reference', $reference)->firstOrFail();

        // Only allow assignment from 'Received Hair' status
        if ($donation->status !== 'Received Hair') {
            return response()->json([
                'message' => 'Wigmaker can only be assigned after hair is received.',
                'success' => false
            ], 422);
        }

        $wigmaker = User::where('id', $validated['wigmaker_id'])->where('role', 'wigmaker')->firstOrFail();

        // Create WigProduction task
        $taskCode = 'WG-' . strtoupper(substr(md5($donation->reference . now()), 0, 6));
        
        WigProduction::create([
            'task_code' => $taskCode,
            'wigmaker_id' => $wigmaker->id,
            'donation_id' => $donation->id,
            'target_length' => $donation->hair_length,
            'target_color' => $donation->hair_color,
            'status' => 'assigned',
            'due_date' => now()->addDays(30)->toDateString(),
        ]);

        // Move donation to In Queue
        $donation->update(['status' => 'In Queue']);
        $donation->statusHistories()->create([
            'status' => 'In Queue',
            'notes' => "Wigmaker: {$wigmaker->first_name} {$wigmaker->last_name}",
        ]);

        return response()->json([
            'message' => "Assigned to {$wigmaker->first_name} {$wigmaker->last_name}. Donation moved to In Queue.",
            'success' => true,
            'task_code' => $taskCode,
        ]);
    }

    public function matchWigToRequest(Request $request)
    {
        $validated = $request->validate([
            'request_reference' => 'required|string|exists:hair_requests,reference',
            'wig_id' => 'required|exists:wig_productions,id',
        ]);

        $hairRequest = HairRequest::where('reference', $validated['request_reference'])->firstOrFail();
        $wig = WigProduction::where('id', $validated['wig_id'])->firstOrFail();

        // 1. Update Hair Request
        $hairRequest->update(['status' => 'Matched']);
        $hairRequest->statusHistories()->create([
            'status' => 'Matched',
            'notes' => "Matched with Wig #{$wig->task_code}",
        ]);

        // 2. Update Wig Production record
        $wig->update([
            'hair_request_id' => $hairRequest->id,
            'status' => 'matched'
        ]);

        // 3. Notify Recipient
        $hairRequest->user->notify(new WigMatchedNotification($hairRequest));

        return response()->json([
            'message' => "Request #{$hairRequest->reference} successfully matched with Wig #{$wig->task_code}. Notification sent.",
            'success' => true
        ]);
    }

    /**
     * Staff updates tracking status with strict workflow rules.
     */
    public function updateTrackingStatus(Request $request, $reference)
    {
        $validated = $request->validate([
            'status' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $record = Donation::where('reference', $reference)->first();
        if (!$record) {
            $record = HairRequest::where('reference', $reference)->firstOrFail();
        }
        
        $newStatus = $validated['status'];

        // Enforce allowed transitions for staff
        $donationSteps = [
            'Verified' => ['Received Hair'],           // Staff confirms hair receipt
            'Received Hair' => ['In Queue'],           // Staff assigns to Wigmaker
            'In Queue' => ['In Progress'],
            'In Progress' => ['Completed'],
            'Completed' => ['Wig Received'],      // Staff confirms wig from wigmaker
        ];

        $recipientSteps = [
            'Submitted' => ['Validated', 'Rejected'],
            'Validated' => ['Matched'],
            'Matched' => ['In Transit'],
            'In Transit' => ['Completed']
        ];

        $allowedNext = $record instanceof Donation
            ? ($donationSteps[$record->status] ?? [])
            : ($recipientSteps[$record->status] ?? []);

        // Legacy compatibility for simple toggles
        if ($newStatus === 'Verified') {
            $allowedNext = ['Verified', 'Rejected'];
        }
        if ($newStatus === 'Received Hair' && $record->status === 'Verified') {
            $allowedNext[] = 'Received Hair';
        }

        if (!in_array($newStatus, $allowedNext) && $newStatus !== 'Rejected') {
            return response()->json(['message' => 'Invalid status transition.'], 422);
        }

        $updateData = ['status' => $newStatus];
        
        if ($newStatus === 'Wig Received') {
            $updateData['received_wig_at'] = now();
        }

        // 1. If Donation status becomes 'Received Hair', generate Certificate
        if ($newStatus === 'Received Hair' && $record instanceof Donation && !$record->certificate_no) {
            $updateData['certificate_no'] = 'CERT-' . date('Y') . '-' . substr($record->reference, -6);
        }

        $record->update($updateData);
        $record->statusHistories()->create([
            'status' => $newStatus,
            'notes' => $validated['notes'] ?? "Status updated to {$newStatus} by staff",
        ]);

        // NEW: Trigger Donor Notification on Receipt
        if ($record instanceof Donation && $newStatus === 'Received Hair') {
            $record->user->notify(new DonationReceivedNotification($record));
        }

        return response()->json([
            'message' => "Status updated to {$newStatus}.",
            'success' => true,
            'received_wig_at' => ($record instanceof Donation && $record->received_wig_at) ? $record->received_wig_at->format('M d, Y h:i A') : null,
        ]);
    }

    public function deliveryBatches()
    {
        $batches = WigProduction::with(['wigmaker', 'donation'])
            ->whereIn('status', ['completed', 'processing'])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->groupBy(function ($task) {
                // Group by wigmaker and month for batch grouping
                return $task->wigmaker_id . '-' . $task->created_at->format('Y-m');
            })
            ->map(function ($group, $key) {
                static $batchNum = 0;
                $batchNum++;
                return (object) [
                    'batch_number' => $batchNum,
                    'date' => $group->first()->updated_at,
                    'count' => $group->count(),
                    'status' => $group->every(fn($t) => $t->status === 'completed') ? 'Completed' : 'In Process',
                ];
            })
            ->values();

        return view('pages.staff-delivery-batches', compact('batches'));
    }

    public function hairStock()
    {
        $donations = Donation::where('status', 'Completed')->get();
        
        $stock = [
            'Short' => ['Black' => 0, 'Brown' => 0, 'Light' => 0],
            'Medium' => ['Black' => 0, 'Brown' => 0, 'Light' => 0],
            'Long' => ['Black' => 0, 'Brown' => 0, 'Light' => 0],
        ];

        foreach ($donations as $donation) {
            $len = ucfirst(strtolower($donation->hair_length));
            $col = ucfirst(strtolower($donation->hair_color));
            
            if (isset($stock[$len])) {
                // Map color aliases if needed
                if (str_contains($col, 'Black')) $col = 'Black';
                if (str_contains($col, 'Brown')) $col = 'Brown';
                if (str_contains($col, 'Light') || str_contains($col, 'Blonde')) $col = 'Light';

                if (isset($stock[$len][$col])) {
                    $stock[$len][$col]++;
                }
            }
        }

        return view('pages.staff-hair-stock', compact('stock'));
    }

    public function wigStock()
    {
        $wigs = WigProduction::with(['donation', 'statusHistories'])
            ->where('status', 'completed')
            ->orderBy('updated_at', 'desc')
            ->paginate(10);

        return view('pages.staff-wig-stock', compact('wigs'));
    }

    public function recipientMatchingList()
    {
        $requests = HairRequest::with('user')
            ->whereIn('status', ['Validated', 'Matched', 'In Transit', 'Arrived'])
            ->orderBy('updated_at', 'desc')
            ->get();

        // Get completed wigs to find assigned wig codes
        $wigs = WigProduction::where('status', 'completed')->get()->keyBy('id');

        return view('pages.staff-recipient-matching-list', compact('requests', 'wigs'));
    }

    public function ruleMatching()
    {
        $recipients = HairRequest::has('user')->with('user')
            ->whereIn('status', ['Validated', 'Submitted'])
            ->get();
        
        $wigs = WigProduction::with('donation')
            ->where('status', 'completed')
            ->get();

        return view('pages.staff-rule-matching', compact('recipients', 'wigs'));
    }
}
