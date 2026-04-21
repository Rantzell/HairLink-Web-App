@extends('layouts.dashboard')

@section('title', 'HairLink | Staff Real-time Tracking')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/staff-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal staff-page">
    <div class="section-title-block">
        <h1>Real-time Staff and Partner Wigmaker Tracking</h1>
        <p>Track each donation batch assigned to partner wigmakers and move workflow stages.</p>
    </div>

    <div class="tracking-split-layout" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 2rem; align-items: start;">
        <!-- Column 1: Donation Trackers -->
        <article class="staff-block">
            <div class="batch-line">
                <strong>Donation Trackers</strong>
                <small style="color: #8c7895; font-size: 0.8rem; font-weight: 500;">{{ $donations->count() }} active trackers</small>
                <span></span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
            @forelse($donations as $donation)
                @php
                    $normStatus = str_replace(' ', '-', strtolower($donation->status));
                    $wigProd = $wigProductions[$donation->id] ?? null;
                    $assignedWigmaker = $wigProd ? $wigProd->wigmaker : null;
                    $isWigmakerControlled = in_array($donation->status, ['In Queue', 'In Progress']);
                    $isCompleted = $donation->status === 'Completed';
                    $isWigReceived = $donation->status === 'Wig Received';
                    $isFinalState = $isWigReceived;
                @endphp
                <article class="tracking-item" data-track-card data-card-id="{{ $donation->reference }}" data-current-status="{{ $normStatus }}" data-card-type="donor"
                    data-donation-status="{{ $donation->status }}"
                    @if($assignedWigmaker) data-wigmaker-name="{{ $assignedWigmaker->first_name }} {{ $assignedWigmaker->last_name }}" @endif
                    @if($donation->received_wig_at) data-wig-received-at="{{ $donation->received_wig_at->format('M d, Y h:i A') }}" @endif
                >
                    <div class="tracking-head">
                        <strong>Donation # {{ $donation->reference }}</strong>
                        <span class="status-chip" data-status-chip>{{ $donation->status }}</span>
                    </div>
                    <div class="tracking-meta" style="flex-wrap: wrap; gap: 0.5rem 1.5rem;">
                        <span>Donor: <strong>{{ $donation->user->first_name ?? '' }} {{ $donation->user->last_name ?? '' }}</strong></span>
                        <span>Hair Length: <strong>{{ $donation->hair_length }}</strong></span>
                        <span>Hair Color: <strong>{{ $donation->hair_color }}</strong></span>
                    </div>
                    <div class="stage-row" style="margin-top: 1rem; border-top: 1px dashed #f2ebf4; padding-top: 1rem;">
                        <div class="stage" data-stage="verified"><i class='bx bx-check-circle'></i><small>Verified</small></div>
                        <div class="stage" data-stage="received"><i class='bx bx-package'></i><small>Received Hair</small></div>
                        <div class="stage" data-stage="in-queue"><i class='bx bx-time-five'></i><small>In Queue</small></div>
                        <div class="stage" data-stage="in-progress"><i class='bx bxs-star'></i><small>In P...</small></div>
                        <div class="stage" data-stage="completed"><i class='bx bx-heart'></i><small>Done</small></div>
                        <div class="stage" data-stage="wig-received"><i class='bx bx-gift'></i><small>Received</small></div>
                    </div>

                    {{-- ACTION ZONE: Contextual controls based on current status --}}
                    <div class="track-actions" data-donor-actions style="display: flex; gap: 1.25rem; align-items: stretch; margin-top: 1.25rem;">
                        <div class="action-left-pane" style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">
                            {{-- Stage: Verified → Staff can confirm hair received --}}
                            @if($donation->status === 'Verified')
                                <button type="button" class="soft-btn" data-confirm-received style="padding: 1rem; font-size: 0.9rem;">
                                    <i class='bx bx-package' style="font-size: 1.2rem;"></i> Confirm Hair Received from Donor
                                </button>
                            @endif

                            {{-- Stage: Received Hair → Staff picks wigmaker, then assigns --}}
                            @if($donation->status === 'Received Hair')
                                <div class="assignment-section" style="margin-top: 0; padding-top: 0; border: none;">
                                    <label class="assignment-label" style="font-size: 0.8rem; color: #8c7895;"><i class='bx bx-user-plus'></i> STEP 1: CHOOSE A PARTNER WIGMAKER</label>
                                    <div class="progress-editor" style="background: #fff; border: 1px solid #f2ebf4; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                                        <div class="progress-editor-row" style="grid-template-columns: 1fr auto;">
                                            <select data-wigmaker-assignment style="border: none; background: transparent; font-weight: 700; color: #4a3f4e;">
                                                <option value="" disabled selected>Select Wigmaker...</option>
                                                @foreach($wigmakers as $wm)
                                                    <option value="{{ $wm->id }}">{{ $wm->first_name }} {{ $wm->last_name }}</option>
                                                @endforeach
                                            </select>
                                            <button type="button" class="save-task-btn" data-assign-wigmaker style="border-radius: 8px; padding: 0.5rem 1rem;">Assign Now</button>
                                        </div>
                                    </div>
                                </div>
                            @endif

                            {{-- Stage: In Queue / In Progress → Read-only, synced from wigmaker --}}
                            @if($isWigmakerControlled)
                                <div class="sync-notice" style="background: #fdf7fb; border: 1px solid #f3e6f0; border-radius: 12px; padding: 1rem; display: flex; align-items: center; gap: 0.8rem;">
                                    <div style="width: 38px; height: 38px; background: #fceef6; border-radius: 50%; display: grid; place-items: center; color: #ad246d; flex-shrink: 0;">
                                        <i class='bx bx-sync bx-spin' style="font-size: 1.3rem;"></i>
                                    </div>
                                    <div style="font-size: 0.82rem; line-height: 1.4; color: #5f5068;">
                                        <div style="font-weight: 800; color: #3b2e43;">Wigmaker Controlled</div>
                                        Status synced with <strong>{{ $assignedWigmaker ? "{$assignedWigmaker->first_name} {$assignedWigmaker->last_name}" : 'partner' }}</strong>.
                                    </div>
                                </div>
                            @endif

                            {{-- Stage: Completed → Staff confirms wig delivery --}}
                            @if($isCompleted)
                                <button type="button" class="soft-btn" data-confirm-wig-received style="padding: 1rem; background: #fdf2f8; border-color: #f1a8cf; color: #ad246d; font-weight: 800;">
                                    <i class='bx bx-gift' style="font-size: 1.2rem;"></i> Confirm Wig Received from Wigmaker
                                </button>
                                @if($assignedWigmaker)
                                    <div style="margin-top: 8px; font-size: 0.75rem; color: #8c7895; display: flex; align-items: center; gap: 0.3rem; padding-left: 0.5rem;">
                                        <i class='bx bx-check-circle' style="color: #28a745;"></i>
                                        Completed by: <strong>{{ $assignedWigmaker->first_name }} {{ $assignedWigmaker->last_name }}</strong>
                                    </div>
                                @endif
                            @endif

                            {{-- Stage: Wig Received → Final state --}}
                            @if($isWigReceived)
                                <div class="final-state-info" style="background: #f8fff9; border: 1px solid #d4edda; border-radius: 12px; padding: 1rem; display: flex; align-items: center; gap: 0.8rem;">
                                    <div style="width: 38px; height: 38px; background: #e9f7ec; border-radius: 50%; display: grid; place-items: center; color: #28a745; flex-shrink: 0;">
                                        <i class='bx bx-check-double' style="font-size: 1.4rem;"></i>
                                    </div>
                                    <div style="font-size: 0.82rem; line-height: 1.4; color: #155724;">
                                        <div style="font-weight: 800;">Workflow Complete</div>
                                        Wig received: <strong>{{ $donation->received_wig_at ? $donation->received_wig_at->format('M d, Y') : 'N/A' }}</strong>.
                                    </div>
                                </div>
                            @endif
                        </div>

                        {{-- Wigmaker Progress UI --}}
                        @php
                            $latestUpdate = null;
                            if ($wigProd && $wigProd->statusHistories) {
                                // Find the latest history entry that has a preview photo
                                $latestUpdate = $wigProd->statusHistories->sortByDesc('created_at')->first(function($hist) {
                                    return !empty($hist->preview_photo_url);
                                });
                                
                                // Fallback to just the latest note if no photo found
                                if (!$latestUpdate) {
                                    $latestUpdate = $wigProd->statusHistories->sortByDesc('created_at')->first();
                                }
                            }
                        @endphp
                        @if($latestUpdate && ($latestUpdate->preview_photo_url || $latestUpdate->notes))
                            <div class="wigmaker-update-card" style="width: 160px; flex-shrink: 0; background: #fff; border: 1px solid #f2ebf4; border-radius: 14px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.6rem; box-shadow: 0 4px 15px rgba(173, 36, 109, 0.05);">
                                <div style="display: flex; align-items: center; gap: 0.4rem; color: #ad246d; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
                                    <i class='bx bxs-camera'></i> Latest Update
                                </div>
                                
                                @if($latestUpdate->preview_photo_url)
                                    <a href="{{ $latestUpdate->preview_photo_url }}" target="_blank" class="file-thumbnail" style="width: 100%; aspect-ratio: 1.2; border-radius: 8px; margin: 0; border: 1px solid #f2ebf4;">
                                        <img src="{{ $latestUpdate->preview_photo_url }}" style="width: 100%; height: 100%; object-fit: cover;">
                                        <div class="preview-overlay" style="background: rgba(173, 36, 109, 0.4);"><i class='bx bx-zoom-in'></i></div>
                                    </a>
                                @endif

                                @if($latestUpdate->notes)
                                    <div style="position: relative; background: #fdf7fb; border: 1px solid #f9daeb; border-radius: 8px; padding: 0.5rem; font-size: 0.74rem; color: #4d3f56; line-height: 1.35; font-style: italic;">
                                        {{ Str::limit($latestUpdate->notes, 80) }}
                                        <div style="position: absolute; top: -6px; left: 15px; width: 10px; height: 10px; background: #fdf7fb; border-left: 1px solid #f9daeb; border-top: 1px solid #f9daeb; transform: rotate(45deg);"></div>
                                    </div>
                                @endif
                            </div>
                        @endif
                    </div>

                    <p class="tracking-footnote" data-last-updated>Last updated: {{ $donation->updated_at->diffForHumans() }}</p>
                </article>
            @empty
                <div style="padding: 1rem; color: #665772;">No donations currently in the tracking workflow.</div>
            @endforelse
            </div>
        </article>

        <!-- Column 2: Recipient Trackers -->
        <article class="staff-block">
            <div class="batch-line">
                <strong>Recipient Trackers</strong>
                <small style="color: #8c7895; font-size: 0.8rem; font-weight: 500;">{{ $requests->count() }} active trackers</small>
                <span></span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
            @forelse($requests as $request)
                @php
                    $normStatus = str_replace(' ', '-', strtolower($request->status));
                @endphp
                <article class="tracking-item" data-track-card data-card-id="{{ $request->reference }}" data-current-status="{{ $normStatus }}" data-card-type="recipient">
                    <div class="tracking-head">
                        <strong>Request # {{ $request->reference }}</strong>
                        <span class="status-chip" data-status-chip>{{ $request->status }}</span>
                    </div>
                    <div class="tracking-meta" style="flex-wrap: wrap; gap: 0.5rem 1.5rem;">
                        <span>Patient: <strong>{{ $request->user->first_name ?? '' }} {{ $request->user->last_name ?? '' }}</strong></span>
                        <span>Wig Length: <strong>{{ ucfirst($request->wig_length ?? 'N/A') }}</strong></span>
                        <span>Wig Color: <strong>{{ ucfirst($request->wig_color ?? 'N/A') }}</strong></span>
                    </div>
                    <div class="stage-row" style="margin-top: 1rem; border-top: 1px dashed #f2ebf4; padding-top: 1rem;">
                        <div class="stage" data-stage="validated"><i class='bx bx-check-circle'></i><small>Validated</small></div>
                        <div class="stage" data-stage="matched"><i class='bx bx-user-check'></i><small>Matched</small></div>
                        <div class="stage" data-stage="in-transit"><i class='bx bx-bus'></i><small>In Transit</small></div>
                        <div class="stage" data-stage="completed"><i class='bx bx-check-double'></i><small>Completed</small></div>
                    </div>
                    <div class="track-actions">
                        @if($request->status === 'Validated')
                            <a href="{{ route('staff.rule-matching') }}" class="soft-btn">
                                <i class='bx bx-user-check'></i> Go to Matching Page
                            </a>
                        @elseif($request->status === 'Matched')
                            <button type="button" class="soft-btn" data-ship-wig>
                                <i class='bx bx-bus'></i> Confirm Shipment / In Transit
                            </button>
                        @elseif($request->status === 'In Transit')
                            <button type="button" class="soft-btn" data-complete-delivery>
                                <i class='bx bx-check-double'></i> Confirm Delivery / Completed
                            </button>
                        @elseif($request->status === 'Completed')
                            <div class="sync-notice final-notice">
                                <i class='bx bx-check-double'></i>
                                <span>Request fulfilled. Workflow complete.</span>
                            </div>
                        @endif
                    </div>
                    <p class="tracking-footnote" data-last-updated>Last updated: {{ $request->updated_at->diffForHumans() }}</p>
                </article>
            @empty
                <div style="padding: 1rem; color: #665772;">No recipient requests currently in tracking.</div>
            @endforelse
            </div>
        </article>
    </div>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/staff-module.js') }}" defer></script>
@endpush
