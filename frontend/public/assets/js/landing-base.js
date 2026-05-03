document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const menu = document.getElementById('siteMenu');

    if (menuToggle && menu) {
        const menuToggleText = menuToggle.querySelector('.menu-toggle-text');

        const closeMenu = () => {
            menu.classList.remove('is-open');
            menuToggle.classList.remove('is-active');
            menuToggle.setAttribute('aria-expanded', 'false');
            if (menuToggleText) {
                menuToggleText.textContent = 'Menu';
            }
        };

        menuToggle.addEventListener('click', () => {
            const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
            menuToggle.setAttribute('aria-expanded', String(!expanded));
            menu.classList.toggle('is-open');
            menuToggle.classList.toggle('is-active', !expanded);
            if (menuToggleText) {
                menuToggleText.textContent = expanded ? 'Menu' : 'Close';
            }
        });

        menu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });

        document.addEventListener('click', (event) => {
            const isInsideNav = event.target.closest('.navbar');
            if (!isInsideNav) {
                closeMenu();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 980) {
                closeMenu();
            }
        });
    }

    const revealItems = document.querySelectorAll('.reveal');
    revealItems.forEach((item, index) => {
        item.style.transitionDelay = `${Math.min(index * 40, 260)}ms`;
    });

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    revealItems.forEach((item) => revealObserver.observe(item));

    const setupSlider = (trackId, dotsId, interval = 4200) => {
        const track = document.getElementById(trackId);
        const dotsRoot = document.getElementById(dotsId);

        if (!track) {
            return;
        }

        const slides = track.querySelectorAll('img');
        if (slides.length === 0) {
            return;
        }

        let index = 0;
        let timer;

        const renderDots = () => {
            if (!dotsRoot) {
                return;
            }

            dotsRoot.innerHTML = '';
            slides.forEach((_, i) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = `slider-dot${i === index ? ' active' : ''}`;
                dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
                dot.addEventListener('click', () => {
                    index = i;
                    update();
                    resetTimer();
                });
                dotsRoot.appendChild(dot);
            });
        };

        const update = () => {
            track.style.transform = `translateX(-${index * 100}%)`;
            renderDots();
        };

        const next = () => {
            index = (index + 1) % slides.length;
            update();
        };

        const resetTimer = () => {
            if (timer) {
                clearInterval(timer);
            }
            timer = setInterval(next, interval);
        };

        update();
        if (slides.length > 1) {
            resetTimer();
        }
    };

    setupSlider('aboutTrack', 'aboutDots', 4000);
    setupSlider('partnerTrack', 'partnerDots', 4500);

    const eventDate = new Date('April 18, 2026 09:00:00').getTime();
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    const pad = (n) => String(n).padStart(2, '0');

    const renderCountdown = () => {
        if (!daysEl || !hoursEl || !minutesEl || !secondsEl) {
            return;
        }

        const now = Date.now();
        let distance = eventDate - now;

        if (distance < 0) {
            distance = 0;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        daysEl.textContent = pad(days);
        hoursEl.textContent = pad(hours);
        minutesEl.textContent = pad(minutes);
        secondsEl.textContent = pad(seconds);
    };

    renderCountdown();
    setInterval(renderCountdown, 1000);
});
