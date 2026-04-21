document.addEventListener('DOMContentLoaded', function() {
    // Set greeting
    const greetingText = document.getElementById('greetingText');
    const userName = greetingText ? greetingText.dataset.name : 'Friend';
    
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }

    if (greetingText) {
        greetingText.textContent = `${getGreeting()}, ${userName}!`;
    }

    // Points Logic
    const goal = 100;
    let points = parseInt(greetingText?.dataset.points || '0', 10);

    const progressFill = document.getElementById('progressFill');
    const progressStar = document.getElementById('progressStar');
    const pointValue   = document.getElementById('pointValue');
    const rewardLine   = document.getElementById('rewardLine');
    const submitCodeBtn = document.getElementById('submitCodeBtn');
    const referralCode  = document.getElementById('referralCode');
    const fillReferralBtn = document.getElementById('fillReferralDemo');

    if (fillReferralBtn && referralCode) {
        fillReferralBtn.addEventListener('click', () => {
            referralCode.value = 'HL-GALA-2026';
        });
    }

    function renderPoints(pts) {
        const percent = Math.min((pts / goal) * 100, 100);
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        if (progressStar) {
            progressStar.style.left = `calc(${percent}% - 12px)`;
            progressStar.style.color = pts >= goal ? '#f59e0b' : '';
        }
        if (pointValue) pointValue.textContent = String(pts);
        if (rewardLine) {
            rewardLine.textContent = pts >= goal
                ? '🎉 Congratulations! You have reached your reward milestone.'
                : `Earn ${goal - pts} more points for a free gift`;
        }

        // Highlight stars
        const starRow = document.querySelectorAll('.star-row span');
        const filledCount = Math.round((pts / goal) * starRow.length);
        starRow.forEach((star, i) => {
            star.style.color = i < filledCount ? '#f59e0b' : '';
        });
    }

    // Initial render
    renderPoints(0);
    setTimeout(() => renderPoints(points), 100);

    // Referral code submit (Simulation)
    if (submitCodeBtn && referralCode) {
        submitCodeBtn.addEventListener('click', async () => {
            const code = referralCode.value.trim();
            if (!code) {
                referralCode.focus();
                referralCode.style.outline = '2px solid #e74c3c';
                setTimeout(() => { referralCode.style.outline = ''; }, 1500);
                return;
            }
            
            // Disable button during req
            submitCodeBtn.disabled = true;
            submitCodeBtn.textContent = 'Verifying...';

            try {
                const response = await fetch('/internal-api/referral/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ referral_code: code })
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.message || 'Invalid code');
                    submitCodeBtn.disabled = false;
                    submitCodeBtn.textContent = 'Submit Code';
                    return;
                }

                // 5 pts for referral code submission as per requirement
                points = Math.min(points + 5, goal);
                renderPoints(points);
                referralCode.value = '';
                submitCodeBtn.textContent = '✓ Code Applied';
                // Remain disabled since it can only be used once
            } catch (error) {
                console.error('Referral error:', error);
                alert('Something went wrong. Please try again.');
                submitCodeBtn.disabled = false;
                submitCodeBtn.textContent = 'Submit Code';
            }
        });
    }
});
