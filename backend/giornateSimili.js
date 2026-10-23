// backend/giornateSimili.js
// "Come chiudi di solito": trova l'ultimo giorno arrivato allo stesso punto con macro simili
// a quelli di oggi e propone come è finito. Il più recente, non il più simile: è quello di cui
// verosimilmente si hanno ancora gli ingredienti. Conta però solo un giorno i cui pasti dopo
// portano oggi all'obiettivo di calorie (fino a 50 kcal sotto; sopra va bene, l'utente mette massa):
// copiare una giornata rimasta corta non serve. Se nessuno ci arriva, quello che ci va più vicino.
//
// Ogni pasto ha un posto nella giornata: Colazione 1, Pranzo 3, Cena 5; gli spuntini (e ogni altro
// tipo) prendono il posto subito dopo il pasto principale che li precede (2, 4, 6).
// Oggi si è arrivati al posto più alto già segnato: di ogni giorno passato si sommano i macro
// fino a quel posto, si confrontano con quelli di oggi e si propongono i pasti dopo.

import { normalizzaNome } from './matching.js';

const MACRO = ['calorie', 'proteine', 'carboidrati', 'grassi'];
const OBIETTIVI_BASE = { calorie: 2000, proteine: 150, carboidrati: 200, grassi: 60 };

function slotPrincipale(tipo) {
    const t = String(tipo || '').toLowerCase();
    if (t.includes('colaz')) return 1;
    if (t.includes('pranzo')) return 3;
    if (t.includes('cena')) return 5;
    return null;
}

function oraItaliana(data) {
    return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Rome' }).format(new Date(data)));
}

// Pasti di un giorno → [{ pasto, slot }] in ordine di orario
export function slotPasti(pasti) {
    const ordinati = [...pasti].sort((a, b) => new Date(a.data) - new Date(b.data));
    const principali = ordinati.map(p => slotPrincipale(p.pasto));

    return ordinati.map((pasto, i) => {
        if (principali[i] !== null) return { pasto, slot: principali[i] };

        const prima = principali.slice(0, i).filter(s => s !== null);
        if (prima.length) return { pasto, slot: Math.max(...prima) + 1 };

        const dopo = principali.slice(i + 1).find(s => s !== null);
        if (dopo != null) return { pasto, slot: dopo - 1 };

        const ora = oraItaliana(pasto.data);
        return { pasto, slot: ora < 12 ? 2 : ora < 17 ? 4 : 6 };
    });
}

function ingredientiDi(pasto) {
    if (Array.isArray(pasto.ingredienti) && pasto.ingredienti.length > 0) return pasto.ingredienti;
    return [{ nome: pasto.alimenti }];
}

// Differenza media tra due totali, ogni macro in proporzione al proprio obiettivo
// (200 kcal su 2000 pesano come 15 g di proteine su 150). 0 = uguali.
export function distanzaMacro(a, b, obiettivi) {
    let somma = 0;
    for (const k of MACRO) somma += Math.abs((Number(a[k]) || 0) - (Number(b[k]) || 0)) / (Number(obiettivi[k]) || OBIETTIVI_BASE[k]);
    return somma / MACRO.length;
}

function totali(pasti) {
    const t = Object.fromEntries(MACRO.map(k => [k, 0]));
    for (const p of pasti) for (const k of MACRO) t[k] += Number(p[k]) || 0;
    for (const k of MACRO) t[k] = Math.round(t[k] * 10) / 10;
    return t;
}

function firma(pasti) {
    return pasti.map(p => ingredientiDi(p).map(i => normalizzaNome(i.nome)).sort().join('+')).join(' | ');
}

// pastiOggi: pasti già segnati oggi. giorni: [{ giorno: 'YYYY-MM-DD', pasti }] dei giorni passati.
// Ritorna al massimo `max` consigli: [{ giorno, distanza, aQuelPunto, pasti, totali, proiezione, giorniUguali }]
// (proiezione: le calorie di oggi se si aggiungono quei pasti)
export function suggerisciChiusure(pastiOggi, giorni, { obiettivi = OBIETTIVI_BASE, max = 1, soglia = 0.15, margine = 50 } = {}) {
    if (!pastiOggi || pastiOggi.length === 0) return [];

    const arrivati = Math.max(...slotPasti(pastiOggi).map(x => x.slot));
    const oggi = totali(pastiOggi);

    const candidati = [];
    for (const { giorno, pasti } of giorni) {
        const conSlot = slotPasti(pasti);
        const rimanenti = conSlot.filter(x => x.slot > arrivati).map(x => x.pasto);
        if (rimanenti.length === 0) continue;

        const aQuelPunto = totali(conSlot.filter(x => x.slot <= arrivati).map(x => x.pasto));
        const distanza = distanzaMacro(oggi, aQuelPunto, obiettivi);
        if (distanza > soglia) continue;

        candidati.push({
            giorno,
            distanza: Math.round(distanza * 1000) / 1000,
            aQuelPunto,
            pasti: rimanenti,
            totali: totali(rimanenti),
            firma: firma(rimanenti)
        });
    }
    for (const c of candidati) c.proiezione = Math.round((oggi.calorie + c.totali.calorie) * 10) / 10;

    // I giorni che portano all'obiettivo, dal più recente; se non ce n'è, dal più vicino
    const minimo = (Number(obiettivi.calorie) || OBIETTIVI_BASE.calorie) - margine;
    let scelti = candidati.filter(c => c.proiezione >= minimo);
    if (scelti.length > 0) scelti.sort((a, b) => b.giorno.localeCompare(a.giorno));
    else scelti = candidati.sort((a, b) => b.proiezione - a.proiezione || b.giorno.localeCompare(a.giorno));

    // Chiusure identiche: un solo consiglio (il primo) con l'elenco degli altri giorni
    const perFirma = new Map();
    for (const c of scelti) {
        if (perFirma.has(c.firma)) perFirma.get(c.firma).giorniUguali.push(c.giorno);
        else perFirma.set(c.firma, { giorno: c.giorno, distanza: c.distanza, aQuelPunto: c.aQuelPunto, pasti: c.pasti, totali: c.totali, proiezione: c.proiezione, giorniUguali: [] });
    }
    return [...perFirma.values()].slice(0, max);
}
