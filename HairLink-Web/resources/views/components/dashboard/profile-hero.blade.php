@props([
    'user',
    'initials',
    'fullName'
])

<div {{ $attributes->merge(['class' => 'profile-hero flex items-center gap-6 p-6 bg-gradient-to-r from-[#fdf7fb] to-white rounded-2xl border border-[#f2ebf4] mb-8 shadow-sm transition-all hover:shadow-md']) }}>
    <div class="relative group">
        <div class="profile-avatar w-24 h-24 rounded-full bg-[#ad246d] text-white flex items-center justify-center text-3xl font-black shadow-inner border-4 border-white overflow-hidden" id="profileInitialsDisplay">
            @if($user->profile_photo_url)
                <img src="{{ $user->profile_photo_url }}" alt="Profile" class="w-full h-full object-cover">
            @else
                {{ $initials }}
            @endif
        </div>
        <button type="button" class="absolute bottom-0 right-0 bg-[#ad246d] text-white p-2 rounded-full shadow-lg border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity" onclick="document.getElementById('editProfileModal').classList.remove('hidden')">
            <i class='bx bxs-camera'></i>
        </button>
    </div>
    
    <div>
        <p class="profile-name text-2xl font-black text-[#ad246d] mb-1 leading-tight" id="profileNameDisplay">{{ $fullName }}</p>
        <span class="profile-role inline-flex items-center px-3 py-1 bg-[#fdf7fb] text-[#ad246d] text-xs font-black rounded-full border border-[#f2ebf4] uppercase tracking-widest" id="profileRoleDisplay">
            {{ ucfirst($user->role ?? 'Donor') }}
        </span>
    </div>
    
    <div class="ml-auto">
        <button type="button" class="soft-btn flex items-center gap-2" onclick="document.getElementById('editProfileModal').classList.remove('hidden')">
            <i class='bx bx-edit-alt'></i> Edit Profile
        </button>
    </div>
</div>
