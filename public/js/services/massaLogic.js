// public/js/services/massaLogic.js
// Calcoli puri di "Peso e calorie" (niente DOM né rete): mantenimento stimato dai pasti segnati e
// dalle pesate, calorie per la massa, settimana per settimana. Testati con node:test.

import { chiaveGiorno, lunediDi } from '../components/format.js?v=38';
import { unaPerGiorno } from './pesoLogic.js?v=38';

export const KCAL_KG = 7700;          // 1 kg di peso corporeo, circa
export const KG_SETTIMANA = 0.25;     // ritmo scelto dall'utente per mettere massa
const GIORNI_PERIODO = 28;
const GIORNI_MINIMI = 14;

const media = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

// 'YYYY-MM-DD' spostato di n giorni (a mezzogiorno: niente sorprese col cambio dell'ora)
function spostaGiorno(chiave, n) {
    const [a, m, g] = chiave.split('-').map(Number);
    return chiaveGiorno(new Date(a, m - 1, g + n, 12));
}

// Calorie dei giorni con almeno un pasto, oggi escluso (non è finito)
const mappaCalorie = (giorni, oggiK) => new Map((giorni || [])
    .filter(g => g.giorno < oggiK && Number(g.pasti) > 0)
    .map(g => [g.giorno, Number(g.calorie) || 0]));

// Peso di ogni giorno (l'ultima pesata del giorno)
const mappaPesi = (pesate) => new Map(unaPerGiorno(pesate)
    .map(l => [chiaveGiorno(l.date), parseFloat(String(l.weight).replace(',', '.')) || 0])
    .filter(([, kg]) => kg > 0));

// Pendenza della retta dei minimi quadrati (y al giorno)
function pendenza(punti) {
    const mx = media(punti.map(p => p.x)), my = media(punti.map(p => p.y));
    const num = punti.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
    const den = punti.reduce((s, p) => s + (p.x - mx) ** 2, 0);
    return den ? num / den : 0;
}

// I 28 giorni che finiscono in `fine` (compreso) e quanti giorni mancano perché sia pronto
function periodo(fine, kcal, pesi) {
    const giorni = Array.from({ length: GIORNI_PERIODO }, (_, i) => spostaGiorno(fine, i - GIORNI_PERIODO + 1));
    const conPasti = giorni.filter(g => kcal.has(g));
    const conPeso = giorni.map((g, x) => ({ g, x })).filter(({ g }) => pesi.has(g));
    const mancano = Math.max(0, GIORNI_MINIMI - conPasti.length, GIORNI_MINIMI - conPeso.length);
    return { da: giorni[0], a: fine, conPasti, conPeso, mancano };
}

function calcola(p, kcal, pesi) {
    const calorie = media(p.conPasti.map(g => kcal.get(g)));
    const kgGiorno = pendenza(p.conPeso.map(({ g, x }) => ({ x, y: pesi.get(g) })));
    const mantenimento = calorie - kgGiorno * KCAL_KG;
    return { da: p.da, a: p.a, calorie, kgSettimana: kgGiorno * 7, mantenimento, perMassa: mantenimento + KG_SETTIMANA * KCAL_KG / 7 };
}

// Mantenimento dalle ultime 4 settimane (fino a ieri). Se non sono pronte, l'ultimo periodo pronto
// che finisce in un giorno con pasti (dopo una pausa non si prende un periodo che finisce nel vuoto).
export function stimaMantenimento(giorni, pesate, oggi = new Date()) {
    const oggiK = chiaveGiorno(oggi);
    const kcal = mappaCalorie(giorni, oggiK);
    const pesi = mappaPesi(pesate);
    const ieri = spostaGiorno(oggiK, -1);
    const adesso = periodo(ieri, kcal, pesi);
    if (adesso.mancano === 0) return { attuale: true, ...calcola(adesso, kcal, pesi) };
    for (const fine of [...kcal.keys()].filter(g => g < ieri).sort().reverse()) {
        const p = periodo(fine, kcal, pesi);
        if (p.mancano === 0) return { attuale: false, mancano: adesso.mancano, ...calcola(p, kcal, pesi) };
    }
    return { nessuna: true, mancano: adesso.mancano };
}

// Settimana per settimana (dal lunedì), dalla più recente. Calorie: media dei giorni con pasti, oggi
// escluso; peso: media delle pesate, oggi compreso; differenza dal peso medio della settimana subito prima.
export function settimane(giorni, pesate, oggi = new Date()) {
    const oggiK = chiaveGiorno(oggi);
    const per = new Map();
    const di = (g) => {
        const l = lunediDi(g);
        if (!per.has(l)) per.set(l, { calorie: [], pesi: [] });
        return per.get(l);
    };
    for (const [g, v] of mappaCalorie(giorni, oggiK)) di(g).calorie.push(v);
    for (const [g, v] of mappaPesi(pesate)) di(g).pesi.push(v);
    const pesoMedio = (l) => per.get(l)?.pesi.length ? media(per.get(l).pesi) : null;
    const lunediOggi = lunediDi(oggiK);
    return [...per.keys()].sort().reverse().map(l => {
        const s = per.get(l), peso = pesoMedio(l), prima = pesoMedio(spostaGiorno(l, -7));
        return {
            lunedi: l, inCorso: l === lunediOggi,
            calorie: s.calorie.length ? media(s.calorie) : null, giorniPasti: s.calorie.length,
            peso, differenza: peso !== null && prima !== null ? peso - prima : null
        };
    });
}
