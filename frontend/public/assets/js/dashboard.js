document.addEventListener('DOMContentLoaded', () => {
    const burger = document.querySelector('[data-dash-burger]');
    const links = document.querySelector('[data-dash-links]');

    if (!burger || !links) return;

    burger.addEventListener('click', () => {
        links.classList.toggle('open');
    });

    document.addEventListener('click', (event) => {
        if (!links.contains(event.target) && !burger.contains(event.target)) {
            links.classList.remove('open');
        }
    });
});
