<section class="contact section" id="contact">
    <div class="contact-card reveal">
        <div class="section-heading section-heading-left" style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <h2>Want to partner with Strand Up for Cancer?</h2>
                <p>Let's connect and grow together!</p>
            </div>
            <button type="button" class="demo-fill-btn" id="fillPartnershipDemo" style="margin-top: 0.5rem;">Quick Fill Demo</button>
        </div>

        <form class="contact-form" id="partnershipForm" action="{{ route('partnership.store') }}" method="POST" aria-label="Partnership interest form">
            @csrf
            <div class="form-row">
                <label>
                    <input type="text" name="full_name" placeholder="Full Name" required>
                </label>
                <label>
                    <input type="email" name="email" placeholder="Email" required>
                </label>
                <label>
                    <input type="text" name="phone" placeholder="Phone Number">
                </label>
            </div>

            <div class="form-row">
                <label>
                    <input type="text" name="organization" placeholder="Company Name">
                </label>
            </div>

            <label>
                <textarea name="message" rows="4" placeholder="Message" required></textarea>
            </label>

            <button type="submit" class="btn btn-primary">Submit</button>
        </form>
    </div>
</section>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('partnershipForm');
    if (form) {
        const fillBtn = document.getElementById('fillPartnershipDemo');
        if (fillBtn) {
            fillBtn.addEventListener('click', () => {
                form.querySelector('input[name="full_name"]').value = 'John Partner';
                form.querySelector('input[name="email"]').value = 'john@partnership.com';
                form.querySelector('input[name="phone"]').value = '+639171234567';
                form.querySelector('input[name="organization"]').value = 'Global Charities Inc.';
                form.querySelector('textarea[name="message"]').value = 'We are interested in collaborating on a hair donation drive for our employees. We would love to discuss how we can support your mission.';
            });
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = 'Sending...';

            try {
                const formData = new FormData(form);
                const response = await fetch(form.action, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json'
                    },
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Thank you! Your partnership inquiry has been received.');
                    form.reset();
                } else {
                    alert(data.message || 'Something went wrong. Please try again.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Connection error. Please check your network.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        });
    }
});
</script>
