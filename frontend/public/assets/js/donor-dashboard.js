document.addEventListener('DOMContentLoaded', async () => {
    const greetingText = document.getElementById('greetingText');
    const userName = greetingText ? greetingText.dataset.name : 'Donor';

    const goal = 100;
    let points = 0;

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

    // Set greeting immediately (no flash)
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }
    if (greetingText) {
        greetingText.textContent = `${getGreeting()}, ${userName}!`;
    }

    // Initial render at 0 so bar animates in
    renderPoints(0);

    // Load real points from DB then animate bar
    // Load real points from SSR
    try {
        if (greetingText && greetingText.dataset.points) {
            points = parseInt(greetingText.dataset.points, 10);
        }
    } catch (error) {
        console.warn('Could not load donation points:', error);
    }

    // Small delay so CSS transition is visible
    requestAnimationFrame(() => {
        setTimeout(() => renderPoints(points), 80);
    });

    function renderPoints(pts) {
        const percent = Math.min((pts / goal) * 100, 100);
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
            progressFill.style.transition = 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
        }
        if (progressStar) {
            // Star is 1.6rem (~24px). To center it on the percentage point:
            const offset = 12; // Half of star width
            progressStar.style.left = `calc(${percent}% + 0.8rem - ${offset}px)`;
            progressStar.style.transition = 'left 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
            // Light up star when at goal
            progressStar.style.color = pts >= goal ? '#f59e0b' : '';
        }
        if (pointValue) pointValue.textContent = String(pts);
        if (rewardLine) {
            rewardLine.textContent = pts >= goal
                ? '🎉 Congratulations! You can now claim your free wig reward.'
                : `Earn ${goal - pts} more points for a free wig`;
        }

        // Highlight filled stars in the star-row
        const starRow = document.querySelectorAll('.star-row span');
        const filledCount = Math.round((pts / goal) * starRow.length);
        starRow.forEach((star, i) => {
            star.style.color = i < filledCount ? '#f59e0b' : '';
            star.style.transition = 'color 0.3s ease';
        });
    }

    // Referral code submit
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

                // Success! 5 stars (5 points) for referral
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
