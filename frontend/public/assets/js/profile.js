// JS logic for profile has been migrated to blade templates directly retrieving from PostgreSQL backend.

document.addEventListener('DOMContentLoaded', () => {
    const copyBtn = document.getElementById('copyCodeBtn');
    const codeEl = document.getElementById('myReferralCode');

    if (copyBtn && codeEl) {
        // ... previous copy logic ...
    }

    const profileForm = document.getElementById('profileUpdateForm');
    const editModal = document.getElementById('editProfileModal');

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = profileForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = "<i class='bx bx-loader-alt animate-spin'></i> Saving...";
            submitBtn.disabled = true;

            try {
                const formData = new FormData(profileForm);
                const response = await fetch('/profile/update', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    }
                });

                const data = await response.json();

                if (data.success) {
                    // Update UI elements
                    document.getElementById('profileNameDisplay').textContent = `${data.user.first_name} ${data.user.last_name}`;
                    document.getElementById('displayPhone').textContent = data.user.phone || 'Not set';
                    document.getElementById('displayBio').textContent = data.user.bio || 'Tell us why you donate!';
                    
                    if (data.user.profile_photo_path) {
                        const avatarImg = document.querySelector('#profileInitialsDisplay img');
                        const avatarPath = `https://` + window.location.hostname + `/storage/v1/object/public/profile-photos/${data.user.profile_photo_path}`;
                        // Note: For actual Supabase implementation, use the full URL from the model
                        window.location.reload(); // Hard refresh to update everything consistently
                    }

                    editModal.classList.add('hidden');
                } else {
                    alert('Error: ' + (data.message || 'Could not update profile'));
                }
            } catch (error) {
                console.error(error);
                alert('An unexpected error occurred.');
            } finally {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});
