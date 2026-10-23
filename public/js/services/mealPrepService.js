// public/js/services/mealPrepService.js

// --- CALCOLI LATO APP (solo anteprima: i valori salvati li calcola sempre il server) ---

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

export function anteprimaPorzione(prep, { prepGrammi = 0, prepPorzioni = 0 }) {
    let quota = null;
    if (prepGrammi > 0) quota = prep.pesoTotaleCotto > 0 ? prepGrammi / prep.pesoTotaleCotto : null;
    else if (prepPorzioni > 0) quota = prep.porzioniPreviste > 0 ? prepPorzioni / prep.porzioniPreviste : null;
    if (quota === null) return null;

    return {
        calorie: round1(prep.calorie * quota),
        proteine: round1(prep.proteine * quota),
        carboidrati: round1(prep.carboidrati * quota),
        grassi: round1(prep.grassi * quota)
    };
}

export function pastoPerOra(ora) {
    if (ora < 11) return 'Colazione';
    if (ora < 15) return 'Pranzo';
    if (ora < 18) return 'Spuntino';
    return 'Cena';
}

const formatNumero = (n) => String(round1(n)).replace('.', ',');

export function etichettaPorzione(ing) {
    if (ing.prepGrammi > 0) return `${formatNumero(ing.prepGrammi)} g`;
    const p = Number(ing.prepPorzioni) || 0;
    return p === 1 ? '1 porzione' : `${formatNumero(p)} porzioni`;
}

// --- CHIAMATE AL SERVER ---

async function richiesta(url, method = 'GET', body) {
    const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
    });
    return await res.json();
}

export const listPreps = (stato = 'tutte') => richiesta(`/api/preps?stato=${stato}`);
export const getPrep = (id) => richiesta(`/api/preps/${id}`);
export const createPrep = (nome) => richiesta('/api/preps', 'POST', { nome });
export const updatePrep = (id, data) => richiesta(`/api/preps/${id}`, 'PUT', data);
export const deletePrep = (id) => richiesta(`/api/preps/${id}`, 'DELETE');
export const analyzePrepVoice = (id, audio) => richiesta(`/api/preps/${id}/analyze`, 'POST', { audio });

// porzione: { mealId } per aggiungerla a un pasto esistente, altrimenti { pasto } per un nuovo pasto;
// più { prepGrammi } oppure { prepPorzioni }
export const addPortion = (id, porzione) => richiesta(`/api/preps/${id}/portion`, 'POST', porzione);
