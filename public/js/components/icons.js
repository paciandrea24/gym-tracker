// public/js/components/icons.js
// Icone SVG a tratto (niente emoji nell'interfaccia). Prendono il colore dal testo (currentColor).
// Uso: icona.mic() oppure icona.mic('w-4 h-4 text-gray-400').

const svg = (percorsi, classi) =>
    `<svg class="${classi}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">${percorsi}</svg>`;

const crea = (percorsi, base = 'w-5 h-5') => (classi = base) => svg(percorsi, classi);

const STELLA = '<path d="M11.05 2.93c.3-.92 1.6-.92 1.9 0l1.52 4.67a1 1 0 00.95.69h4.91c.97 0 1.37 1.24.59 1.81l-3.98 2.89a1 1 0 00-.36 1.12l1.52 4.67c.3.92-.76 1.69-1.54 1.12l-3.98-2.89a1 1 0 00-1.17 0l-3.98 2.89c-.78.57-1.84-.2-1.54-1.12l1.52-4.67a1 1 0 00-.36-1.12L2.07 10.1c-.78-.57-.38-1.81.59-1.81h4.91a1 1 0 00.95-.69l1.53-4.67z"/>';

// Icone piene (punti): stessa forma, riempite
const piena = (percorsi) => (classi = 'w-5 h-5') => svg(percorsi, classi).replace('fill="none"', 'fill="currentColor"').replace('stroke="currentColor"', 'stroke="none"');

export const icona = {
    puntini: piena('<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>'),
    maniglia: piena('<circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/>'),
    play: crea('<circle cx="12" cy="12" r="9"/><path d="M10 9l5 3-5 3z"/>', 'w-6 h-6'),
    grafico: crea('<path d="M4 19h16M7 16V10m5 6V6m5 10v-4"/>'),
    spunta: crea('<path d="M5 13l4 4L19 7"/>', 'w-4 h-4'),
    stellaPiena: (classi = 'w-6 h-6') => svg(STELLA, classi).replace('fill="none"', 'fill="currentColor"'),
    mic: crea('<path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>'),
    piu: crea('<path d="M12 5v14M5 12h14"/>'),
    meno: crea('<path d="M5 12h14"/>'),
    fotocamera: crea('<path d="M3 9a2 2 0 012-2h.93a2 2 0 001.66-.89l.82-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.66.89l.82 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/>'),
    stella: crea(STELLA),
    pentola: crea('<path d="M3 11h18"/><path d="M5 11v5a4 4 0 004 4h6a4 4 0 004-4v-5"/><path d="M9 7h6"/><path d="M12 7V5"/><path d="M2 14h3M19 14h3"/>'),
    scintille: crea('<path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.29 6.86L21 12l-5.71 2.14L13 21l-2.29-6.86L5 12l5.71-2.14L13 3z"/>'),
    obiettivo: crea('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', 'w-4 h-4'),
    avanti: crea('<path d="M9 5l7 7-7 7"/>', 'w-4 h-4'),
    indietro: crea('<path d="M15 19l-7-7 7-7"/>', 'w-6 h-6'),
    chiudi: crea('<path d="M6 18L18 6M6 6l12 12"/>'),
    matita: crea('<path d="M15.23 5.23l3.54 3.54m-2.04-5.04a2.5 2.5 0 113.54 3.54L6.5 21.04H3v-3.57L16.73 3.73z"/>'),
    stop: crea('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
    attesa: crea('<path d="M12 3a9 9 0 109 9"/>', 'w-5 h-5 animate-spin'),
    scarica: crea('<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"/>'),
    avviso: crea('<path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>', 'w-4 h-4'),
    domanda: crea('<path d="M8.23 9c.55-1.17 2.03-2 3.77-2 2.21 0 4 1.34 4 3 0 1.4-1.28 2.58-3.01 2.91-.54.1-.99.54-.99 1.09m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'),
    info: crea('<path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'),
    carrello: crea('<path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.29 2.29c-.63.63-.18 1.71.71 1.71H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>')
};
