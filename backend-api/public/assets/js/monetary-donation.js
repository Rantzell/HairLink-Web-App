document.addEventListener('DOMContentLoaded', () => {

    // ── Amount pills ──
    const pills = document.querySelectorAll('.pill-btn');
    const customInput = document.getElementById('custom-amount');
    const amountNumber = document.getElementById('amount-number');

    pills.forEach(btn => {
        btn.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            if (customInput) customInput.value = '';
            if (amountNumber) {
                amountNumber.value = Number(btn.dataset.amount).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
        });
    });

    if (customInput) {
        customInput.setAttribute('inputmode', 'numeric');
        
        customInput.addEventListener('keydown', (e) => {
            const allowedKeys = ['.', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'];
            if (!allowedKeys.includes(e.key) && !/^[0-9]$/.test(e.key)) {
                e.preventDefault();
            }
        });

        customInput.addEventListener('input', () => {
            // Strip any non-numeric/non-dot characters that bypassed keydown
            customInput.value = customInput.value.replace(/[^0-9.]/g, '');
            
            pills.forEach(p => p.classList.remove('active'));
            if (amountNumber && customInput.value) {
                amountNumber.value = Number(customInput.value).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
        });
    }

    if (amountNumber) {
        amountNumber.setAttribute('inputmode', 'numeric');
    }

    // ── Payment tabs ──
    const tabBtns = document.querySelectorAll('.tab-btn');
    const bankCards = {
        bank: document.getElementById('bank-card-bank'),
        instapay: document.getElementById('bank-card-instapay'),
    };

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            Object.keys(bankCards).forEach(key => {
                if (bankCards[key]) {
                    bankCards[key].classList.toggle('hidden', key !== tab);
                }
            });
        });
    });

    // ── Proof of donation file display ──
    const proofInput = document.getElementById('proof-donation');
    const fileList = document.getElementById('proof-file-list');

    if (proofInput && fileList) {
        proofInput.addEventListener('change', () => {
            fileList.innerHTML = '';
            Array.from(proofInput.files).forEach(file => {
                const item = document.createElement('span');
                item.className = 'file-item';
                item.textContent = file.name;
                fileList.appendChild(item);
            });
        });
    }

    const fillBtn = document.getElementById('fillMonetaryDemo');
    if (fillBtn) {
        fillBtn.addEventListener('click', () => {
            if (customInput) customInput.value = '1000';
            if (amountNumber) amountNumber.value = '1,000.00';
            document.getElementById('amount-words').value = 'One thousand pesos';
            pills.forEach(p => p.classList.remove('active'));
        });
    }

    // ── Form submit ──
    const form = document.getElementById('monetary-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = 'Processing...';
            submitBtn.disabled = true;

            const rNum = amountNumber ? parseFloat(amountNumber.value.replace(/,/g, '')) : 0;
            const bName = document.getElementById('billing-name').value;
            const currencyVal = document.getElementById('currency').value || 'PHP';
            const payMethod = document.querySelector('.tab-btn.active') ? document.querySelector('.tab-btn.active').dataset.tab : 'bank';

            const formData = new FormData();
            formData.append('amount', rNum);
            formData.append('name', bName);
            formData.append('currency', currencyVal);
            formData.append('payment_method', payMethod);

            const csrfToken = document.querySelector('meta[name="csrf-token"]');
            if(csrfToken) {
                formData.append('_token', csrfToken.getAttribute('content'));
            }

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken ? csrfToken.getAttribute('content') : ''
                    },
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    alert('Thank you! Your donation has been received. Reference: ' + data.reference);
                    form.reset();
                    if(amountNumber) amountNumber.value = '';
                    if(fileList) fileList.innerHTML = '';
                    pills.forEach(p => p.classList.remove('active'));
                } else {
                    alert('Error processing donation. Please try again.');
                }
            } catch (error) {
                console.error(error);
                alert('A network error occurred.');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});
