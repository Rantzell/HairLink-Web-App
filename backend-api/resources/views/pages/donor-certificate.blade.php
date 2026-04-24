@extends('layouts.dashboard')

@section('title', 'HairLink | Donor Certificate')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/donor-module.css') }}">
@endpush

@section('content')
    <section class="section-wrap donor-module-page reveal" id="certificateRoot">
        <header class="module-head">
            <h1>Donor Certificate</h1>
            <p>Automatically generated once staff confirms receipt of your hair donation.</p>
            <div class="action-row">
                <a class="ghost-btn" href="{{ route('donor.tracking') }}">Back to Tracking</a>
                @if($donation && in_array($donation->status, ['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received']))
                <button id="printCertificateBtn" class="soft-btn" type="button">Print / Save as PDF</button>
                @endif
            </div>
        </header>

        <article class="module-card certificate-shell">
            @if($donation)
            <div class="certificate-paper" id="certificatePaper">
                <div class="certificate-inner">
                    <div class="cert-header">
                        <div class="cert-logos">
                            <img src="{{ asset('assets/images/landing/pink-ribbon.png') }}" class="cert-logo-main" alt="HairLink Logo">
                            <img src="{{ asset('assets/images/landing/logo.jpg') }}" class="cert-logo-sufc" alt="Strand Up For Cancer Logo">
                        </div>
                        <h2 class="certificate-title">CERTIFICATE OF RECOGNITION</h2>
                        <p class="certificate-subtitle">This certificate is proudly presented to</p>
                    </div>

                    <h1 class="certificate-name" id="certName">{{ auth()->user()->first_name }} {{ auth()->user()->last_name }}</h1>

                    <div class="cert-body">
                        <p class="certificate-copy">In deep appreciation for your selfless and generous hair donation.</p>
                        <p class="certificate-copy-sub">Your contribution provides hope, confidence, and strength to patients experiencing medical hair loss. Thank you for making a beautiful difference.</p>
                    </div>

                    <div class="cert-footer">
                        <div class="cert-meta-wrap">
                            <p>Reference: <strong id="certReference">{{ $donation->reference }}</strong></p>
                            <p>Status: <strong id="certStatus">{{ $donation->status }}</strong></p>
                        </div>
                        
                        <div class="cert-signature">
                            <div class="signature-line"></div>
                            <p>HairLink Foundation</p>
                            <span>Authorized Signature</span>
                        </div>

                        <div class="cert-meta-wrap right-meta">
                            <p>Cert. No: <strong id="certNumber">{{ $donation->certificate_no ?? 'Pending' }}</strong></p>
                            <p>Date: <strong id="certIssued">{{ in_array($donation->status, ['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received']) ? $donation->updated_at->format('M d, Y') : 'Pending receipt' }}</strong></p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="note-box" id="certificateStatusNote">
                @if(in_array($donation->status, ['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received']))
                Certificate is ready. Click "Print / Save as PDF" to download.
                @else
                Certificate will be available once staff confirms receipt of your hair. Current status: {{ $donation->status }}.
                @endif
            </div>
            @else
            <div class="note-box">
                No verified or completed donation record found. Submit a donation and wait for verification to view your certificate.
            </div>
            @endif
        </article>
    </section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/donor-module.js') }}" defer></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const printBtn = document.getElementById('printCertificateBtn');
            if (printBtn) {
                printBtn.addEventListener('click', () => {
                    window.print();
                });
            }
        });
    </script>
@endpush
