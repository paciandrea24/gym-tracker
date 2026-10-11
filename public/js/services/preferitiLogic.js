// public/js/services/preferitiLogic.js
// Preferiti in ordine d'uso: un contatore nascosto, solo sul telefono (localStorage, niente sul
// server), conta quante volte si usa ogni preferito e i più usati vanno in cima. Testato con node:test.

const CHIAVE = 'usoPreferiti';

// Per nome e non per id: un preferito tolto e rimesso (stella) ritrova i suoi usi
const nome = (fav) => String(fav?.alimenti || '').trim().toLowerCase();

// I più usati prima; a parità resta l'ordine di partenza
export function ordinaPerUso(preferiti, usi) {
    return preferiti
        .map((f, i) => ({ f, i, n: Number(usi?.[nome(f)]) || 0 }))
        .sort((a, b) => b.n - a.n || a.i - b.i)
        .map(x => x.f);
}

// { nome: volte } — vuoto se localStorage manca, è bloccato o rotto
export function leggiUsi(archivio = globalThis.localStorage) {
    try { return JSON.parse(archivio.getItem(CHIAVE)) || {}; } catch { return {}; }
}

// Un uso in più (pasto nuovo, aggiunta a un pasto, ingrediente del meal prep)
export function contaUso(fav, archivio = globalThis.localStorage) {
    try {
        const usi = leggiUsi(archivio);
        usi[nome(fav)] = (Number(usi[nome(fav)]) || 0) + 1;
        archivio.setItem(CHIAVE, JSON.stringify(usi));
    } catch { /* senza localStorage l'ordine resta quello di sempre */ }
}
