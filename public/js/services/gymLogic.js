// public/js/services/gymLogic.js
// Calcoli puri della palestra (niente DOM né rete): passo dei pulsanti, drop set, peso reale,
// volume, testo delle serie e operazioni sulle superserie della sessione. Testati con node:test.

const numero = (v) => parseFloat(String(v ?? '').replace(',', '.')) || 0;
const tondo = (v) => Math.round(v * 100) / 100;
const dec = (v) => String(tondo(numero(v))).replace('.', ',');

// Passo dei pulsanti + e − del peso: 0,5 sotto 10 kg, 1 fino a 30 kg, 2,5 sopra.
// Per scendere conta la fascia sotto (da 10 si va a 9,5, da 30 a 29).
const passoSu = (v) => v < 10 ? 0.5 : v < 30 ? 1 : 2.5;
const passoGiu = (v) => v <= 10 ? 0.5 : v <= 30 ? 1 : 2.5;

// Gradino successivo (o precedente) sulla griglia del passo: 7,3 → 7,5; 30 → 32,5; 32,5 → 30
export function passoPeso(valore, direzione) {
    const v = numero(valore);
    if (direzione === 'piu') {
        const p = passoSu(v);
        return tondo(Math.floor(v / p + 1e-9) * p + p);
    }
    const p = passoGiu(v);
    return Math.max(0, tondo(Math.ceil(v / p - 1e-9) * p - p));
}

// Peso proposto per un drop: circa l'80%, arrotondato in giù al passo
export function pesoDrop(kg) {
    const v = numero(kg) * 0.8;
    const p = passoSu(v);
    return tondo(Math.floor(v / p + 1e-9) * p);
}

// Peso davvero sollevato: per lato conta doppio, il bilanciere si somma (solo se c'è un peso)
export function pesoReale(kg, esercizio = {}) {
    const v = numero(kg);
    if (!(v > 0)) return 0;
    return tondo(v * (Number(esercizio.weightMultiplier) || 1) + (Number(esercizio.barbellWeight) || 0));
}

// Volume di una serie (drop compresi); conta solo per gli esercizi con i pesi
export function volumeSerie(set, esercizio = {}) {
    if (esercizio.type && esercizio.type !== 'sala-pesi') return 0;
    return [set, ...(set.drop || [])].reduce((s, x) => s + pesoReale(x.kg, esercizio) * numero(x.reps), 0);
}

// "67,5 × 8", con i drop: "65 × 8 → 50 × 5"; "12 rip" a corpo libero, "15 min" di cardio
export function testoSerie(set, tipo) {
    if (tipo === 'cardio') return `${dec(set.reps)} min`;
    if (tipo === 'corpo-libero') return `${dec(set.reps)} rip`;
    return [set, ...(set.drop || [])].map(x => `${dec(x.kg)} × ${dec(x.reps)}`).join(' → ');
}

// Massimale stimato (Brzycki) della serie principale, con il peso reale; i drop non contano
export function stima1RM(set, esercizio = {}) {
    const kg = pesoReale(set.kg, esercizio);
    const reps = numero(set.reps);
    if (!(kg > 0 && reps > 0)) return 0;
    return reps === 1 ? kg : kg * (36 / (37 - reps));
}
