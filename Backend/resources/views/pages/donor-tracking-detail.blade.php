@extends('layouts.dashboard')

@section('title', 'HairLink | Tracking Detail')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/donor-module.css') }}">
@endpush

@section('content')
    <section class="section-wrap donor-module-page" id="trackingDetailRoot" data-reference="{{ $donation->reference }}">
        <header class="module-head">
            <h1>Donation Tracking Detail</h1>
            <p>Reference: <strong>{{ $donation->reference }}</strong></p>
            <div class="action-row">
                <a class="ghost-btn" href="{{ route('donor.tracking') }}">Back to Tracking List</a>
            </div>
        </header>

        <!-- Refined Summary Grid -->
        <div class="summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.8rem; margin-bottom: 1rem;">
            <div class="summary-item" style="background: #fff; border: 1px solid #ead7e8; border-radius: 12px; padding: 0.8rem; display: flex; align-items: center; gap: 0.75rem;">
                <div style="background: #fdf2f8; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;">
                    <i class='bx bx-hash' style="color: #ad246d; font-size: 1.2rem;"></i>
                </div>
                <div>
                    <small style="display: block; color: #8c7895; font-size: 0.7rem; text-transform: uppercase; font-weight: 800;">Reference</small>
                    <strong style="color: #3b2e43; font-size: 0.85rem;">{{ $donation->reference }}</strong>
                </div>
            </div>
            <div class="summary-item" style="background: #fff; border: 1px solid #ead7e8; border-radius: 12px; padding: 0.8rem; display: flex; align-items: center; gap: 0.75rem;">
                <div style="background: #fdf2f8; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;">
                    <i class='bx bx-info-circle' style="color: #ad246d; font-size: 1.2rem;"></i>
                </div>
                <div>
                    <small style="display: block; color: #8c7895; font-size: 0.7rem; text-transform: uppercase; font-weight: 800;">Status</small>
                    <span id="detailStatusPill" class="status-pill status-{{ strtolower(str_replace(' ', '-', $donation->status)) }}" style="margin-top: 0.2rem; display: inline-block;">{{ $donation->status }}</span>
                </div>
            </div>
            <div class="summary-item" style="background: #fff; border: 1px solid #ead7e8; border-radius: 12px; padding: 0.8rem; display: flex; align-items: center; gap: 0.75rem;">
                <div style="background: #fdf2f8; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;">
                    <i class='bx bx-calendar' style="color: #ad246d; font-size: 1.2rem;"></i>
                </div>
                <div>
                    <small style="display: block; color: #8c7895; font-size: 0.7rem; text-transform: uppercase; font-weight: 800;">Submitted</small>
                    <strong style="color: #3b2e43; font-size: 0.85rem;">{{ $donation->created_at->format('M d, Y') }}</strong>
                </div>
            </div>
            <div class="summary-item" style="background: #fff; border: 1px solid #ead7e8; border-radius: 12px; padding: 0.8rem; display: flex; align-items: center; gap: 0.75rem;">
                <div style="background: #fdf2f8; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;">
                    <i class='bx bx-user' style="color: #ad246d; font-size: 1.2rem;"></i>
                </div>
                <div>
                    <small style="display: block; color: #8c7895; font-size: 0.7rem; text-transform: uppercase; font-weight: 800;">Donor</small>
                    <strong style="color: #3b2e43; font-size: 0.85rem;">{{ auth()->user()->first_name }} {{ auth()->user()->last_name }}</strong>
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 260px; gap: 1rem; align-items: start;">
            <!-- Status Timeline -->
            <div class="module-card" style="background: #fff; border: 1px solid #ead7e8; border-radius: 16px; padding: 1.25rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <i class='bx bx-git-commit' style="color: #ad246d; font-size: 1.4rem;"></i>
                    <h3 style="margin: 0;">Donation Roadmap</h3>
                </div>
                <ul class="timeline" id="detailTimeline" style="padding-left: 0.5rem; list-style: none;">
                    @forelse($donation->statusHistories()->orderBy('created_at', 'desc')->get() as $history)
                    <li class="timeline-item" style="border-left: 2px solid #f2ebf4; padding-left: 1.5rem; padding-bottom: 1.25rem; position: relative;">
                        <div style="position: absolute; left: -7px; top: 0; width: 12px; height: 12px; background: #ad246d; border-radius: 50%; border: 2px solid #fff;"></div>
                        <div class="timeline-meta" style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                            <strong style="font-size: 0.9rem; color: #ad246d;">{{ $history->status }}</strong>
                            <time style="font-size: 0.75rem; color: #8c7895;">{{ $history->created_at->format('M d, Y h:i A') }}</time>
                        </div>
                        <div class="timeline-desc" style="background: #fdf7fb; padding: 0.6rem 0.8rem; border-radius: 8px; border: 1px solid #f2ebf4; font-size: 0.85rem; color: #4d3f56;">
                            @php
                                $note = $history->notes ?? 'Status changed to ' . $history->status;
                                if (str_contains($note, ': ')) {
                                    $note = \Illuminate\Support\Str::after($note, ': ');
                                }
                            @endphp
                            {{ $note }}
                        </div>
                    </li>
                    @empty
                    <li class="timeline-item" style="border-left: 2px solid #f2ebf4; padding-left: 1.5rem; position: relative;">
                        <div style="position: absolute; left: -7px; top: 0; width: 12px; height: 12px; background: #ad246d; border-radius: 50%; border: 2px solid #fff;"></div>
                        <div class="timeline-meta" style="margin-bottom: 0.25rem;">
                            <strong style="font-size: 0.9rem; color: #ad246d;">Submitted</strong>
                        </div>
                        <div class="timeline-desc" style="background: #fdf7fb; padding: 0.6rem 0.8rem; border-radius: 8px; border: 1px solid #f2ebf4; font-size: 0.85rem; color: #4d3f56;">
                            Donation record received and queued for review.
                        </div>
                    </li>
                    @endforelse
                </ul>

                <div class="action-row" style="margin-top: 1rem; border-top: 1px dashed #f2ebf4; padding-top: 1rem;">
                    @if(in_array($donation->status, ['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received']))
                        <a class="soft-btn" href="{{ route('donor.certificate') }}" style="display: flex; align-items: center; gap: 0.5rem; width: fit-content; padding: 0.6rem 1.5rem; background: linear-gradient(135deg, #ad246d 0%, #cf2f84 100%); color: #fff; border: none;">
                            <i class='bx bx-award'></i> Download Certificate
                        </a>
                    @endif
                </div>
            </div>

            <!-- Side Info Box -->
            <div class="side-box" style="display: grid; gap: 1rem;">
                <div style="background: #fff; border: 1px solid #ead7e8; border-radius: 16px; padding: 1.25rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                        <i class='bx bx-cut' style="color: #ad246d; font-size: 1.4rem;"></i>
                        <h3 style="margin: 0;">Hair Info</h3>
                    </div>
                    <div style="display: grid; gap: 0.4rem; font-size: 0.88rem;">
                        <p style="margin: 0;"><strong>Length:</strong> {{ $donation->hair_length }}</p>
                        <p style="margin: 0; margin-bottom: 0.5rem;"><strong>Color:</strong> {{ $donation->hair_color }}</p>
                        <div style="background: #fdf7fb; padding: 0.5rem; border-radius: 8px; border: 1px solid #f2ebf4; font-size: 0.82rem; font-style: italic; color: #665772;">
                            "{{ $donation->reason ?? 'No reason provided' }}"
                        </div>
                    </div>
                </div>

                <div style="background: #fff; border: 1px solid #ead7e8; border-radius: 16px; padding: 1rem; text-align: center;">
                    <small style="display: block; margin-bottom: 0.5rem; color: #ad246d; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.7rem;">Donation Reference Photo</small>
                    <div id="photoPreview" style="width: 200px; height: 200px; margin: 0 auto; border-radius: 12px; overflow: hidden; background: #fff5fa; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(173, 36, 109, 0.05); border: 1px solid #ead7e8;">
                        @if($donation->photo_front)
                            <a href="{{ $donation->photo_front_url }}" target="_blank" class="file-thumbnail" style="width: 100%; height: 100%; display: block; position: relative;">
                                <img src="{{ $donation->photo_front_url }}" style="width: 100%; height: 100%; object-fit: cover;">
                                <div class="preview-overlay" style="position: absolute; inset: 0; background: rgba(173, 36, 109, 0.4); opacity: 0; display: flex; align-items: center; justify-content: center; color: #fff; transition: opacity 0.2s;"><i class='bx bx-search'></i></div>
                            </a>
                        @else
                            <i class='bx bx-image' style="font-size: 3rem; color: #ead7e8;"></i>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/donor-module.js') }}" defer></script>
    <script src="{{ asset('assets/js/donor-tracking-detail.js') }}" defer></script>
@endpush
