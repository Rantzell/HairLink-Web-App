@extends('layouts.dashboard')

@section('title', 'HairLink | Donor Profile')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/profile.css') }}">
@endpush

@section('content')
    <section class="section-wrap profile-shell reveal" data-profile-page data-profile-type="donor">
        <header class="profile-head">
            <h1>My Profile</h1>
            <p>View your donor account details and contact information.</p>
        </header>

        <x-dashboard.profile-hero 
            :user="$user" 
            :initials="$initials" 
            :fullName="$fullName" 
        />

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2">
                <article class="bg-white p-6 rounded-2xl border border-[#f2ebf4] shadow-sm">
                    <div class="flex items-center gap-2 mb-6 border-b border-[#f2ebf4] pb-4">
                        <i class='bx bx-id-card text-[#ad246d] text-2xl'></i>
                        <h2 class="text-xl font-black text-gray-800 tracking-tight">Personal Details</h2>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="flex flex-col">
                            <label class="text-[10px] uppercase tracking-widest font-black text-[#ad246d] mb-1">Email Address</label>
                            <span class="text-gray-700 font-bold" id="displayEmail">{{ $user->email }}</span>
                        </div>
                        <div class="flex flex-col">
                            <label class="text-[10px] uppercase tracking-widest font-black text-[#ad246d] mb-1">Phone Number</label>
                            <span class="text-gray-700 font-bold" id="displayPhone">{{ $user->phone ?? 'Not set' }}</span>
                        </div>
                        <div class="flex flex-col">
                            <label class="text-[10px] uppercase tracking-widest font-black text-[#ad246d] mb-1">Age</label>
                            <span class="text-gray-700 font-bold" id="displayAge">{{ $user->age ?? 'Not set' }}</span>
                        </div>
                        <div class="flex flex-col">
                            <label class="text-[10px] uppercase tracking-widest font-black text-[#ad246d] mb-1">Gender</label>
                            <span class="text-gray-700 font-bold capitalize" id="displayGender">{{ $user->gender ?? 'Not set' }}</span>
                        </div>
                    </div>

                    <div class="mt-8 pt-6 border-t border-[#f2ebf4]">
                        <label class="text-[10px] uppercase tracking-widest font-black text-[#ad246d] mb-2 block">Short Bio</label>
                        <p class="text-[#5d4d62] text-sm leading-relaxed italic" id="displayBio">
                            {{ $user->bio ?? 'No bio provided. Tell us a bit about why you donate!' }}
                        </p>
                    </div>
                </article>
            </div>

            <div class="lg:col-span-1 space-y-6">
                <!-- Referral Card -->
                <article class="bg-white p-6 rounded-2xl border border-[#f2ebf4] shadow-sm overflow-hidden relative group">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <i class='bx bxs-gift text-6xl text-[#ad246d]'></i>
                    </div>
                    <h3 class="text-sm font-black text-[#ad246d] uppercase tracking-widest mb-4">Referral Reward</h3>
                    <div class="bg-[#fdf7fb] p-4 rounded-xl border border-[#ead7e8] mb-4">
                        <span class="block text-2xl font-black text-[#ad246d] tracking-widest mb-1" id="myReferralCode">HL-{{ strtoupper(substr(md5('hairlink-referral-' . $user->id), 0, 8)) }}</span>
                        <p class="text-[10px] text-[#8c7895] font-bold uppercase tracking-widest leading-none">Share to earn 5 points per donor</p>
                    </div>
                    <button class="w-full py-3 bg-[#ad246d] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md hover:bg-[#cf2f84] transition-all flex items-center justify-center gap-2" id="copyCodeBtn">
                        <i class='bx bx-copy'></i> Copy Code
                    </button>
                </article>

                <!-- Quick Stats -->
                <article class="bg-gradient-to-br from-[#ad246d] to-[#cf2f84] p-6 rounded-2xl shadow-lg text-white">
                    <div class="flex items-center gap-2 mb-4">
                        <i class='bx bxs-star-half text-2xl'></i>
                        <h3 class="text-sm font-black uppercase tracking-widest">Impact Stats</h3>
                    </div>
                    <div class="space-y-4">
                        <div class="flex justify-between items-end border-b border-white/20 pb-2">
                            <span class="text-xs font-bold text-white/80">Account Type</span>
                            <span class="font-black tracking-widest uppercase text-xs">{{ $user->role }}</span>
                        </div>
                        <div class="flex justify-between items-end">
                            <span class="text-xs font-bold text-white/80">Joined</span>
                            <span class="font-black text-xs">{{ $user->created_at?->format('F Y') }}</span>
                        </div>
                    </div>
                </article>
            </div>
        </div>

        <!-- Edit Profile Modal -->
        <div id="editProfileModal" class="fixed inset-0 bg-[#2d1136]/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 hidden">
            <div class="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <header class="p-6 border-b border-[#f2ebf4] flex justify-between items-center bg-[#fdf7fb]">
                    <h2 class="text-xl font-black text-[#ad246d] tracking-tight">Edit Your Profile</h2>
                    <button type="button" class="text-[#8c7895] hover:text-[#ad246d]" onclick="document.getElementById('editProfileModal').classList.add('hidden')">
                        <i class='bx bx-x text-3xl'></i>
                    </button>
                </header>
                
                <form id="profileUpdateForm" class="p-8 space-y-6">
                    @csrf
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group flex flex-col">
                            <label class="text-[10px] font-black uppercase tracking-widest text-[#ad246d] mb-1">First Name</label>
                            <input type="text" name="first_name" value="{{ $user->first_name }}" class="border-2 border-[#ead7e8] rounded-xl p-3 focus:border-[#ad246d] focus:outline-none font-bold text-gray-700">
                        </div>
                        <div class="form-group flex flex-col">
                            <label class="text-[10px] font-black uppercase tracking-widest text-[#ad246d] mb-1">Last Name</label>
                            <input type="text" name="last_name" value="{{ $user->last_name }}" class="border-2 border-[#ead7e8] rounded-xl p-3 focus:border-[#ad246d] focus:outline-none font-bold text-gray-700">
                        </div>
                    </div>

                    <div class="form-group flex flex-col">
                        <label class="text-[10px] font-black uppercase tracking-widest text-[#ad246d] mb-1">Phone Number</label>
                        <input type="text" name="phone" value="{{ $user->phone }}" class="border-2 border-[#ead7e8] rounded-xl p-3 focus:border-[#ad246d] focus:outline-none font-bold text-gray-700">
                    </div>

                    <div class="form-group flex flex-col">
                        <label class="text-[10px] font-black uppercase tracking-widest text-[#ad246d] mb-1">Quick Bio</label>
                        <textarea name="bio" rows="3" class="border-2 border-[#ead7e8] rounded-xl p-3 focus:border-[#ad246d] focus:outline-none font-medium text-gray-600 resize-none">{{ $user->bio }}</textarea>
                    </div>

                    <div class="form-group flex flex-col">
                        <label class="text-[10px] font-black uppercase tracking-widest text-[#ad246d] mb-1">Profile Photo</label>
                        <div class="relative">
                            <input type="file" name="profile_photo" class="absolute inset-0 opacity-0 cursor-pointer z-10">
                            <div class="p-4 border-2 border-dashed border-[#ead7e8] rounded-xl flex items-center justify-center gap-3 bg-[#fafafa]">
                                <i class='bx bx-cloud-upload text-2xl text-[#ad246d]'></i>
                                <span class="text-xs font-bold text-[#8c7895]">Select new image (JPG/PNG/WEBP)</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-3 pt-4">
                        <button type="submit" class="flex-1 py-4 bg-gradient-to-r from-[#ad246d] to-[#cf2f84] text-white font-black uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-xl transition-all">
                            Save Changes
                        </button>
                        <button type="button" class="px-8 py-4 bg-gray-100 text-gray-500 font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all" onclick="document.getElementById('editProfileModal').classList.add('hidden')">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/profile.js') }}" defer></script>
@endpush
