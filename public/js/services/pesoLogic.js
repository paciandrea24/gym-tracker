// public/js/services/pesoLogic.js
// Calcoli puri del peso (niente DOM né rete): una pesata per giorno, riassunto per la Home,
// righe dello storico con la differenza, punti della linea dell'andamento. Testati con node:test.

import { chiaveGiorno, nomeGiorno, decimale } from '../components/format.js?v=34';

const numero = (v) => parseFloat(String(v ?? '').replace(',', '.')) || 0;
const unDecimale = (v) => Math.round(v * 10) / 10;
const minuscola = (s) => s.charAt(0).toLowerCase() + s.slice(1);

// Dal più recente; per ogni giorno resta la pesata più recente (le doppie salvate prima)
export function unaPerGiorno(logs) {
    const visti = new Set();
    return [...(logs || [])]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .filter(l => {
            const k = chiaveGiorno(l.date);
            if (visti.has(k)) return false;
            visti.add(k);
            return true;
        });
}

// "−1,6", "+0,4", "0" (sotto il mezzo decimo)
export function segno(n) {
    const v = unDecimale(n);
    if (v === 0) return '0';
    return `${v < 0 ? '−' : '+'}${decimale(Math.abs(v))}`;
}

// Per la Home: { ultimo, quando: "oggi" | "ieri" | "giovedì 8 ottobre", variazione dalla prima
// pesata (null se ce n'è una sola), dal: "5 settembre", pesatoOggi }; null se non ci sono pesate
export function riassuntoPeso(logs, oggi = new Date()) {
    const giorni = unaPerGiorno(logs);
    if (giorni.length === 0) return null;
    const ultimo = giorni[0];
    const primo = giorni[giorni.length - 1];
    const k = chiaveGiorno(ultimo.date);
    return {
        ultimo: numero(ultimo.weight),
        quando: minuscola(nomeGiorno(k, oggi)),
        variazione: giorni.length > 1 ? unDecimale(numero(ultimo.weight) - numero(primo.weight)) : null,
        dal: giorni.length > 1 ? new Date(primo.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) : null,
        pesatoOggi: k === chiaveGiorno(oggi)
    };
}

// Storico: una riga per giorno con la differenza dalla pesata prima ('' se uguale o se è la prima)
export function righePesate(logs, oggi = new Date()) {
    const giorni = unaPerGiorno(logs);
    return giorni.map((l, i) => {
        const prima = giorni[i + 1];
        const diff = prima ? numero(l.weight) - numero(prima.weight) : 0;
        return {
            id: l._id,
            giorno: nomeGiorno(chiaveGiorno(l.date), oggi),
            kg: decimale(numero(l.weight)),
            differenza: prima && Math.abs(diff) >= 0.05 ? segno(diff) : ''
        };
    });
}

// Punti "x,y" di una linea (valori dal più vecchio al più recente): il valore più alto sta in alto
export function puntiLinea(valori, larghezza = 100, altezza = 30, margine = 3) {
    if (!valori.length) return '';
    const max = Math.max(...valori);
    const min = Math.min(...valori);
    if (valori.length === 1 || max === min) return `0,${altezza / 2} ${larghezza},${altezza / 2}`;
    const tondo = (v) => Math.round(v * 10) / 10;
    return valori.map((v, i) => {
        const x = tondo(i * larghezza / (valori.length - 1));
        const y = tondo(margine + (max - v) / (max - min) * (altezza - 2 * margine));
        return `${x},${y}`;
    }).join(' ');
}

// Peso scritto a mano: virgola o punto, spazi ammessi; null se non è un numero maggiore di zero
export function pesoScritto(testo) {
    const pulito = String(testo ?? '').trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(pulito)) return null;
    const v = Number(pulito);
    return v > 0 ? v : null;
}
