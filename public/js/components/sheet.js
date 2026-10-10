// public/js/components/sheet.js
// Foglio che sale dal basso, con lo stesso aspetto in tutta l'app.
// apriFoglio({ id }) → { box, chiudi, intestazione }: box è il contenitore da riempire.

export function apriFoglio({ id = 'foglio-app' } = {}) {
    document.getElementById(id)?.remove();

    const sfondo = document.createElement('div');
    sfondo.id = id;
    sfondo.className = 'fixed inset-0 z-[99990] flex items-end justify-center bg-gray-900/60 backdrop-blur-sm opacity-0 transition-opacity duration-300';
    sfondo.innerHTML = `<div class="bg-white w-full max-w-md rounded-t-[2rem] p-6 shadow-2xl transform translate-y-full transition-transform duration-300 max-h-[88vh] overflow-y-auto [&::-webkit-scrollbar]:hidden" style="padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));"></div>`;
    document.body.appendChild(sfondo);
    document.body.style.overflow = 'hidden';
    const box = sfondo.firstElementChild;

    const chiudi = () => {
        sfondo.classList.add('opacity-0');
        box.classList.add('translate-y-full');
        setTimeout(() => { sfondo.remove(); document.body.style.overflow = ''; }, 300);
    };
    // Tocco sullo sfondo scuro = chiudi
    sfondo.addEventListener('click', (e) => { if (e.target === sfondo) chiudi(); });

    requestAnimationFrame(() => {
        sfondo.classList.remove('opacity-0');
        box.classList.remove('translate-y-full');
    });

    // Titolo con la X per chiudere; sottotitolo facoltativo
    const intestazione = (titolo, sottotitolo = '') => `
        <div class="flex justify-between items-start gap-3 ${sottotitolo ? 'mb-1' : 'mb-5'}">
            <h2 class="text-xl font-black text-gray-900 leading-tight">${titolo}</h2>
            <button class="chiudi-foglio flex-shrink-0 text-gray-400 bg-gray-100 p-2 rounded-full active:scale-90 transition-transform" aria-label="Chiudi">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        ${sottotitolo ? `<p class="text-[13px] font-bold text-gray-400 mb-5">${sottotitolo}</p>` : ''}`;

    // Da chiamare dopo aver riempito box: collega la X
    const collegaChiudi = () => box.querySelectorAll('.chiudi-foglio').forEach(b => b.addEventListener('click', chiudi));

    return { box, chiudi, intestazione, collegaChiudi };
}
