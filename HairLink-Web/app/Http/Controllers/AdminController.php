<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Donation;
use App\Models\HairRequest;
use App\Models\WigProduction;
use App\Models\Event;
use App\Models\CommunityPost;
use App\Models\MonetaryDonation;

class AdminController extends Controller
{
    public function dashboard()
    {
        $usersCount = User::count();
        $donationsCount = Donation::count();
        $requestsCount = HairRequest::count();
        $pendingVerifications = Donation::where('status', 'Received Hair')->count() + HairRequest::where('status', 'Submitted')->count();

        $recentUsers = User::orderBy('created_at', 'desc')->take(5)->get();
        $recentDonations = Donation::with('user')->orderBy('created_at', 'desc')->take(5)->get();
        $recentRequests = HairRequest::with('user')->orderBy('created_at', 'desc')->take(5)->get();

        // Dynamic counts for priority queue cards
        $approvedDonations = Donation::where('status', 'Completed')->count();
        $pendingDonationsCount = Donation::whereIn('status', ['Submitted', 'Received Hair'])->count();
        $rejectedDonations = Donation::where('status', 'Rejected')->count();

        $approvedRequests = HairRequest::where('status', 'Validated')->count();
        $pendingRequestsCount = HairRequest::where('status', 'Submitted')->count();
        $needsMatchRequests = HairRequest::whereIn('status', ['Validated'])->count();

        // Monetary donations
        $monetaryDonations = MonetaryDonation::orderBy('created_at', 'desc')->take(10)->get();

        return view('pages.admin-dashboard', compact(
            'usersCount', 'donationsCount', 'requestsCount', 'pendingVerifications',
            'recentUsers', 'recentDonations', 'recentRequests',
            'approvedDonations', 'pendingDonationsCount', 'rejectedDonations',
            'approvedRequests', 'pendingRequestsCount', 'needsMatchRequests',
            'monetaryDonations'
        ));
    }

    public function verification()
    {
        $pendingDonations = Donation::with('user')->whereIn('status', ['Received Hair', 'Submitted'])->get();
        $pendingRequests = HairRequest::with('user')->whereIn('status', ['Submitted'])->get();
        $approvedTodayCount = Donation::where('status', 'Completed')
            ->whereDate('updated_at', today())
            ->count()
            + HairRequest::where('status', 'Validated')
            ->whereDate('updated_at', today())
            ->count();
        $flaggedCount = Donation::where('status', 'Rejected')->count();

        // Get recent verification activity for the audit trail
        $recentActivity = collect();

        $donationActivity = Donation::with('user')->orderBy('updated_at', 'desc')->take(10)->get()
            ->map(function ($d) {
                return (object) [
                    'reference' => $d->reference,
                    'person' => ($d->user->first_name ?? '') . ' ' . ($d->user->last_name ?? ''),
                    'type' => 'Donor',
                    'latest_action' => 'Hair ' . strtolower($d->status),
                    'owner' => 'Staff',
                    'status' => $d->status,
                ];
            });

        $requestActivity = HairRequest::with('user')->orderBy('updated_at', 'desc')->take(10)->get()
            ->map(function ($r) {
                return (object) [
                    'reference' => $r->reference,
                    'person' => ($r->user->first_name ?? '') . ' ' . ($r->user->last_name ?? ''),
                    'type' => 'Recipient',
                    'latest_action' => 'Request ' . strtolower($r->status),
                    'owner' => 'Admin',
                    'status' => $r->status,
                ];
            });

        $recentActivity = $donationActivity->merge($requestActivity)->take(10);

        return view('pages.admin-verification', compact(
            'pendingDonations', 'pendingRequests', 'approvedTodayCount', 'flaggedCount', 'recentActivity'
        ));
    }

    public function matching()
    {
        $availableDonations = Donation::with('user')->where('status', 'Completed')->get();
        $approvedRequests = HairRequest::with('user')->where('status', 'Validated')->get();
        $completedWigs = WigProduction::with('donation')->where('status', 'completed')->get();

        $readyToMatch = $approvedRequests->count();
        $allocatedWigs = WigProduction::where('status', 'completed')->count();

        return view('pages.admin-matching', compact(
            'availableDonations', 'approvedRequests', 'completedWigs',
            'readyToMatch', 'allocatedWigs'
        ));
    }

    public function operations()
    {
        $staffCount = User::where('role', 'staff')->count();
        $wigTasksCount = WigProduction::count();
        $transitCount = WigProduction::where('status', 'processing')->count();
        $completedCount = WigProduction::where('status', 'completed')->count();
        
        $pendingDonationsCount = Donation::where('status', 'Received Hair')->count();
        $pendingRequestsCount = HairRequest::where('status', 'Submitted')->count();

        // Real operations monitor data
        $activeWigmakers = User::where('role', 'wigmaker')->count();
        $activeWigTasks = WigProduction::whereIn('status', ['assigned', 'processing'])->count();

        return view('pages.admin-operations', compact(
            'staffCount', 'wigTasksCount', 'transitCount', 'completedCount',
            'pendingDonationsCount', 'pendingRequestsCount',
            'activeWigmakers', 'activeWigTasks'
        ));
    }

    public function inventory()
    {
        // Hair stock counts by length and color
        $completedDonations = Donation::where('status', 'Completed')->get();
        $stock = [
            'Short' => ['Black' => 0, 'Brown' => 0, 'Light' => 0],
            'Medium' => ['Black' => 0, 'Brown' => 0, 'Light' => 0],
            'Long' => ['Black' => 0, 'Brown' => 0, 'Light' => 0],
        ];
        foreach ($completedDonations as $donation) {
            $len = ucfirst(strtolower($donation->hair_length));
            $col = ucfirst(strtolower($donation->hair_color));
            if (isset($stock[$len])) {
                if (str_contains($col, 'Black')) $col = 'Black';
                if (str_contains($col, 'Brown')) $col = 'Brown';
                if (str_contains($col, 'Light') || str_contains($col, 'Blonde')) $col = 'Light';
                if (isset($stock[$len][$col])) {
                    $stock[$len][$col]++;
                }
            }
        }
        $totalHairRecords = $completedDonations->count();

        // Wig stock
        $wigStock = WigProduction::with(['donation', 'wigmaker'])
            ->where('status', 'completed')
            ->orderBy('updated_at', 'desc')
            ->get();
        $wigCount = $wigStock->count();

        // All hair donation records for the table
        $allDonations = Donation::with('user')
            ->orderBy('created_at', 'desc')
            ->get();
        $allDonationsCount = $allDonations->count();

        return view('pages.admin-inventory', compact(
            'stock', 'totalHairRecords', 'wigStock', 'wigCount',
            'allDonations', 'allDonationsCount'
        ));
    }

    public function users()
    {
        $users = User::paginate(10);
        $donorCount = User::where('role', 'donor')->count();
        $recipientCount = User::where('role', 'recipient')->count();
        $staffCount = User::where('role', 'staff')->count();
        $wigmakerCount = User::where('role', 'wigmaker')->count();

        return view('pages.admin-users', compact('users', 'donorCount', 'recipientCount', 'staffCount', 'wigmakerCount'));
    }

    public function events()
    {
        $upcomingEvents = Event::where('status', 'Upcoming')->orderBy('date', 'asc')->get();
        $pastEvents = Event::where('status', 'Completed')->orderBy('date', 'desc')->get();
        
        return view('pages.admin-events', compact('upcomingEvents', 'pastEvents'));
    }

    public function storeEvent(Request $request)
    {
        $validated = $request->validate([
            'event_title' => 'required|string|max:255',
            'event_date' => 'required|date',
            'event_description' => 'nullable|string',
            'event_location' => 'nullable|string|max:255',
        ]);

        Event::create([
            'title' => $validated['event_title'],
            'date' => $validated['event_date'],
            'description' => $validated['event_description'] ?? '',
            'location' => $validated['event_location'] ?? '',
            'status' => 'Upcoming',
            'participants_count' => 0,
        ]);

        return response()->json(['message' => 'Event created successfully', 'success' => true]);
    }

    public function community()
    {
        $posts = CommunityPost::with('user')->orderBy('created_at', 'desc')->get();
        $recentCount = CommunityPost::where('created_at', '>=', now()->subDays(7))->count();
        
        return view('pages.admin-community', compact('posts', 'recentCount'));
    }

    public function reports()
    {
        $donationsCount = Donation::count();
        $requestsCount = HairRequest::count();
        $wigsDistributed = WigProduction::where('status', 'completed')->count();
        $usersCount = User::count();
        $monetaryTotal = MonetaryDonation::where('status', 'Completed')->sum('amount');
        $eventsCount = Event::count();
        $recipientsServed = HairRequest::whereIn('status', ['Validated', 'Matched', 'Completed'])->count();

        // Monthly breakdown for last 3 months
        $monthlyData = collect();
        for ($i = 2; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $startOfMonth = $month->copy()->startOfMonth();
            $endOfMonth = $month->copy()->endOfMonth();

            $monthlyData->push((object) [
                'label' => $month->format('F Y'),
                'monetary' => MonetaryDonation::where('status', 'Completed')
                    ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
                    ->sum('amount'),
                'hair_submissions' => Donation::whereBetween('created_at', [$startOfMonth, $endOfMonth])->count(),
                'wigs_produced' => WigProduction::where('status', 'completed')
                    ->whereBetween('updated_at', [$startOfMonth, $endOfMonth])
                    ->count(),
                'wigs_distributed' => WigProduction::where('status', 'completed')
                    ->whereBetween('updated_at', [$startOfMonth, $endOfMonth])
                    ->count(),
                'new_users' => User::whereBetween('created_at', [$startOfMonth, $endOfMonth])->count(),
            ]);
        }

        return view('pages.admin-reports', compact(
            'donationsCount', 'requestsCount', 'wigsDistributed', 'usersCount',
            'monetaryTotal', 'eventsCount', 'recipientsServed', 'monthlyData'
        ));
    }

    public function toggleUser($id)
    {
        $user = User::findOrFail($id);
        $user->is_active = !$user->is_active;
        $user->save();

        return response()->json([
            'message' => $user->is_active ? 'User activated.' : 'User deactivated.',
            'success' => true,
        ]);
    }

    public function deleteCommunityPost($id)
    {
        $post = CommunityPost::findOrFail($id);
        $post->delete();
        
        return redirect()->back()->with('success', 'Community post deleted successfully.');
    }
}
