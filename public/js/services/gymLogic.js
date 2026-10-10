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

// Riga di drop nuova: circa l'80% dell'ultimo peso della serie (la serie o il drop precedente)
export function nuovoDrop(set) {
    const catena = [set, ...(set.drop || [])];
    return { kg: pesoDrop(catena[catena.length - 1].kg), reps: '' };
}

// Serie pronta da salvare: peso e ripetizioni numerici (virgola accettata, vuoto = 0),
// i drop senza ripetizioni si tolgono
export function pulisciSerie(set) {
    const { drop, ...resto } = set;
    const pulita = { ...resto, kg: numero(set.kg), reps: numero(set.reps) };
    const drops = (drop || []).map(d => ({ kg: numero(d.kg), reps: numero(d.reps) })).filter(d => d.reps > 0);
    if (drops.length) pulita.drop = drops;
    return pulita;
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

// --- Superserie nella sessione attiva ---
// session: { todo: [id], completed: [...], superserie?: [[id, id, ...]] }. Le funzioni restituiscono
// una copia: la sessione passata non cambia. Un blocco ha sempre almeno due esercizi.

const copia = (session) => {
    const s = structuredClone(session);
    s.superserie = (s.superserie || []).map(g => [...g]);
    return s;
};

// Cosa resta da fare, nell'ordine: esercizi singoli e blocchi (al posto del primo membro)
export function elementiDaFare(session) {
    const gruppi = session.superserie || [];
    const todo = session.todo || [];
    const visti = new Set();
    const elementi = [];
    for (const id of todo) {
        const gruppo = gruppi.find(g => g.includes(id));
        if (!gruppo) { elementi.push({ tipo: 'esercizio', id }); continue; }
        const chiave = gruppo.join('+');
        if (visti.has(chiave)) continue;
        visti.add(chiave);
        elementi.push({ tipo: 'superserie', ids: gruppo.filter(x => todo.includes(x)) });
    }
    return elementi;
}

// Trascinare un esercizio su un altro (o su un membro di un blocco) li mette in superserie
export function unisciSuperserie(session, idTrascinato, idBersaglio) {
    const s = copia(session);
    if (idTrascinato === idBersaglio || !s.todo.includes(idTrascinato) || !s.todo.includes(idBersaglio)) return s;

    s.superserie = s.superserie.map(g => g.filter(id => id !== idTrascinato)).filter(g => g.length >= 2);
    let gruppo = s.superserie.find(g => g.includes(idBersaglio));
    if (gruppo) gruppo.push(idTrascinato);
    else { gruppo = [idBersaglio, idTrascinato]; s.superserie.push(gruppo); }

    // Nell'elenco il trascinato va subito dopo l'ultimo membro del blocco
    s.todo = s.todo.filter(id => id !== idTrascinato);
    const ultimo = Math.max(...gruppo.filter(id => id !== idTrascinato).map(id => s.todo.indexOf(id)));
    s.todo.splice(ultimo + 1, 0, idTrascinato);
    return s;
}

export function separaSuperserie(session, idMembro) {
    const s = copia(session);
    s.superserie = s.superserie.filter(g => !g.includes(idMembro));
    return s;
}

// Fine di un blocco: ogni esercizio va fra i fatti con le sue serie e il segno del blocco
export function completaSuperserie(session, ids, setsPerId, esercizi) {
    const s = copia(session);
    const chiave = ids.join('+');
    s.todo = s.todo.filter(id => !ids.includes(id));
    s.superserie = s.superserie.filter(g => !g.some(id => ids.includes(id)));
    for (const id of ids) {
        const es = esercizi.find(e => String(e.id) === String(id)) || {};
        s.completed = (s.completed || []).filter(c => String(c.exerciseId) !== String(id));
        s.completed.push({ exerciseId: id, name: es.name || '', type: es.type, sets: setsPerId[id] || [], superserie: chiave });
    }
    return s;
}

// Giri di un blocco: tante quante le serie dell'esercizio che ne ha di più
export function giriSuperserie(setsPerId) {
    return Math.max(0, ...Object.values(setsPerId).map(sets => sets.length));
}
