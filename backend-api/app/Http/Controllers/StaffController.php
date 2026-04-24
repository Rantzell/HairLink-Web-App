<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Donation;
use App\Models\HairRequest;
use App\Models\WigProduction;
use App\Models\User;
use App\Models\MonetaryDonation;
use App\Notifications\WigMatchedNotification;
use App\Notifications\MonetaryDonationStatusNotification;
use App\Notifications\DonationApprovedNotification;
use App\Notifications\DonationReceivedNotification;

class StaffController extends Controller
{
    public function dashboard()
    {
        $pendingDonations = Donation::where('status', 'Submitted')->count();
        $pendingRequests = HairRequest::where('status', 'Pending')->count();
        
        // Hair Inventory = Physically received hair but not yet a wig
        $totalStock = Donation::where('status', 'Received Hair')->count();
        
        // Wig Builds In Progress
        $productionCount = WigProduction::whereIn('status', ['assigned', 'processing'])->count();
        
        // Completed Wig Stock
        $wigStockCount = WigProduction::where('status', 'completed')->count();

        // Pending Monetary Donations
        $pendingMonetary = MonetaryDonation::where('status', 'Submitted')->count();

        return view('pages.staff-dashboard', compact(
            'pendingDonations', 
            'pendingRequests', 
            'totalStock', 
            'productionCount', 
            'wigStockCount',
            'pendingMonetary'
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
        // Only show 'Pending' requests — once approved they leave this queue
        $requests = HairRequest::with('user')->where('status', 'Pending')->get();
        return view('pages.staff-recipient-verification', compact('requests'));
    }

    public function monetaryVerification()
    {
        // Only show 'Submitted' monetary donations (aligned with submission controllers)
        $monetaryDonations = MonetaryDonation::with('user')->where('status', 'Submitted')->orderBy('created_at', 'desc')->get();
        return view('pages.staff-monetary-verification', compact('monetaryDonations'));
    }

    public function monetaryVerificationDetail($id)
    {
        $record = MonetaryDonation::with('user')->findOrFail($id);
        $type = 'monetary';
        $reference = $record->reference_number;
        return view('pages.staff-verification-detail', compact('type', 'reference', 'record'));
    }

    public function updateMonetaryStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:Approved,Failed',
            'remarks' => 'required|string',
        ]);

        $donation = MonetaryDonation::findOrFail($id);
        $donation->update([
            'status' => $validated['status'],
            'remarks' => $validated['remarks'],
        ]);

        // Notify user
        if ($donation->user) {
            $donation->user->notify(new MonetaryDonationStatusNotification($donation, $validated['status']));
        }

        return response()->json(['message' => 'Monetary donation status updated successfully', 'success' => true]);
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

        // NEW: Trigger Recipient Notification on Validation
        if ($type === 'recipient' && $validated['status'] === 'Approved') {
            $record->user->notify(new \App\Notifications\HairRequestStatusNotification($record, 'Approved'));
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
            ->whereIn('status', ['Approved', 'In Production', 'Matched', 'In Transit', 'Arrived', 'Completed'])
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
            'delivery_tracking_link' => 'nullable|url|max:2048',
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
            'Pending' => ['Approved', 'Rejected'],
            'Approved' => ['Matched'],
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
        
        // Save delivery tracking link when shipping to recipient
        if ($newStatus === 'In Transit' && !empty($validated['delivery_tracking_link'])) {
            $updateData['delivery_tracking_link'] = $validated['delivery_tracking_link'];
        }

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

        // NEW: Trigger Recipient Notification on status update
        if ($record instanceof HairRequest && $newStatus !== 'Matched') {
            // Matched has its own notification in matchWigToRequest
            $record->user->notify(new \App\Notifications\HairRequestStatusNotification($record, $newStatus));
        }

        return response()->json([
            'message' => "Status updated to {$newStatus}.",
            'success' => true,
            'received_wig_at' => ($record instanceof Donation && $record->received_wig_at) ? $record->received_wig_at->format('M d, Y h:i A') : null,
            'delivery_tracking_link' => ($record instanceof HairRequest) ? $record->delivery_tracking_link : null,
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
            '10-14 inch' => ['Black' => 0, 'Brown' => 0, 'Light' => 0],
            '15-20 inch' => ['Black' => 0, 'Brown' => 0, 'Light' => 0],
            'More than 20 inch' => ['Black' => 0, 'Brown' => 0, 'Light' => 0],
        ];

        foreach ($donations as $donation) {
            $len = $donation->hair_length;
            $col = ucfirst(strtolower($donation->hair_color));
            
            // Map old 'Short'/'Long' if they exist in DB to new categories for consistency
            if ($len === 'Short') $len = '10-14 inch';
            if ($len === 'Long') $len = '15-20 inch';

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
            ->whereIn('status', ['Approved', 'Matched', 'In Transit', 'Arrived', 'Completed'])
            ->orderBy('updated_at', 'desc')
            ->get();

        // Get completed wigs that are available (not yet assigned to a request)
        $availableWigs = WigProduction::where('status', 'completed')
            ->whereNull('hair_request_id')
            ->get();

        // Calculate best match for each Validated request
        foreach ($requests as $request) {
            if ($request->status !== 'Approved') {
                $request->best_match = null;
                continue;
            }
            $bestWig = null;
            $maxScore = -1;
            foreach ($availableWigs as $wig) {
                $score = $this->calculateCompatibility($request, $wig);
                if ($score > $maxScore) {
                    $maxScore = $score;
                    $bestWig = $wig;
                }
            }
            $request->best_match = $maxScore > 0 ? $bestWig : null;
            $request->match_score = $maxScore;
        }

        return view('pages.staff-recipient-matching-list', compact('requests'));
    }

    private function calculateCompatibility($request, $wig)
    {
        $score = 0;
        
        // 1. Length Matching (40 points)
        $reqLen = $request->wig_length;
        $wigLen = $wig->target_length;
        if ($reqLen === $wigLen) {
            $score += 40;
        } elseif (
            ($reqLen === '15-20 inch' && $wigLen === 'More than 20 inch') ||
            ($reqLen === '10-14 inch' && $wigLen === '15-20 inch')
        ) {
            $score += 20; // Closely compatible
        }

        // 2. Color Matching (40 points)
        $reqCol = strtolower($request->wig_color);
        $wigCol = strtolower($wig->target_color);
        if ($reqCol === $wigCol) {
            $score += 40;
        } elseif (
            (str_contains($reqCol, 'black') && str_contains($wigCol, 'brown')) ||
            (str_contains($reqCol, 'brown') && str_contains($wigCol, 'black'))
        ) {
            $score += 20; // Similar colors
        }

        // 3. Overall Availability (20 points)
        $score += 20;

        return $score;
    }

    public function ruleMatching()
    {
        $recipients = HairRequest::has('user')->with('user')
            ->whereIn('status', ['Approved', 'Pending'])
            ->get();
        
        $wigs = WigProduction::with('donation')
            ->where('status', 'completed')
            ->get();

        return view('pages.staff-rule-matching', compact('recipients', 'wigs'));
    }
}
