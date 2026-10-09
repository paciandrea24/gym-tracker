// backend/mealPrep.js
// Calcoli puri del meal prep: nessun accesso al DB, così sono testabili con node --test.

const MACRO = ['calorie', 'proteine', 'carboidrati', 'grassi'];
const CAMPI_PREP = ['prepId', 'prepGrammi', 'prepPorzioni', 'prepDaCompletare', 'prepRef'];

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

// Frazione del lotto consumata da un ingrediente-porzione, o null se mancano i dati per calcolarla
export function calcolaQuota(ing, prep) {
    const grammi = Number(ing.prepGrammi) || 0;
    if (grammi > 0) {
        const peso = Number(prep.pesoTotaleCotto) || 0;
        return peso > 0 ? grammi / peso : null;
    }
    const porzioni = Number(ing.prepPorzioni) || 0;
    const n = Number(prep.porzioniPreviste) || 0;
    return porzioni > 0 && n > 0 ? porzioni / n : null;
}

export function valoriPorzione(ing, prep) {
    const quota = calcolaQuota(ing, prep);
    const peso = Number(prep.pesoTotaleCotto) || 0;
    const valori = {};
    for (const k of MACRO) valori[k] = quota === null ? 0 : round1((Number(prep[k]) || 0) * quota);

    let grammi = Number(ing.prepGrammi) || 0;
    if (!grammi && quota !== null && peso > 0) grammi = Math.round(quota * peso);

    return { ...valori, grammi, prepDaCompletare: quota === null };
}

// Riallinea gli ingredienti collegati a una preparazione e applica la differenza ai totali del pasto.
// prepsById: Map<stringId, prep>. Muta il pasto (funziona anche su documenti mongoose).
export function ricalcolaPasto(meal, prepsById) {
    const delta = { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 };
    let changed = false;

    for (const ing of meal.ingredienti || []) {
        if (!ing.prepId) continue;
        const prep = prepsById.get(String(ing.prepId));
        if (!prep) continue;

        const v = valoriPorzione(ing, prep);
        for (const k of MACRO) {
            delta[k] += v[k] - (Number(ing[k]) || 0);
            ing[k] = v[k];
        }
        ing.grammi = v.grammi;
        ing.prepDaCompletare = v.prepDaCompletare;
        if (!ing.nome) ing.nome = prep.nome;
        changed = true;
    }

    if (changed) {
        for (const k of MACRO) meal[k] = Math.max(0, round1((Number(meal[k]) || 0) + delta[k]));
    }
    return changed;
}

export function totaliDaIngredienti(ingredienti) {
    const tot = { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 };
    for (const ing of ingredienti || []) {
        for (const k of MACRO) tot[k] += Number(ing[k]) || 0;
    }
    for (const k of MACRO) tot[k] = round1(tot[k]);
    return tot;
}

// porzioni: elenco degli ingredienti-porzione registrati nei pasti per questa preparazione
export function riepilogoConsumo(prep, porzioni) {
    let quota = 0;
    for (const ing of porzioni) quota += calcolaQuota(ing, prep) ?? 0;

    const peso = Number(prep.pesoTotaleCotto) || 0;
    const n = Number(prep.porzioniPreviste) || 0;
    return {
        quotaUsata: Math.round(quota * 1000) / 1000,
        grammiUsati: peso > 0 ? Math.round(quota * peso) : null,
        porzioniUsate: n > 0 ? round1(quota * n) : null
    };
}

// Copia per i preferiti: il collegamento alla preparazione si perde, restano i valori di quel giorno
export function senzaCollegamentiPrep(ingredienti) {
    return (ingredienti || []).map(ing => {
        const copia = { ...ing };
        for (const campo of CAMPI_PREP) delete copia[campo];
        return copia;
    });
}

// Output della voce: l'AI indica le preparazioni con riferimenti brevi (P1, P2...).
// refMap: { P1: prepId }. I valori li calcolerà ricalcolaPasto, quindi qui si azzerano.
export function risolviRiferimentiPrep(ingredienti, refMap) {
    return (ingredienti || []).map(ing => {
        if (!('prepRef' in ing)) return ing;
        const { prepRef, ...resto } = ing;
        const prepId = refMap[prepRef];
        if (!prepId) return resto;

        const grammi = Number(resto.prepGrammi) || 0;
        const porzioni = Number(resto.prepPorzioni) || 0;
        return {
            nome: resto.nome,
            prepId,
            prepGrammi: grammi > 0 ? grammi : 0,
            prepPorzioni: grammi > 0 ? 0 : (porzioni > 0 ? porzioni : 1),
            calorie: 0, proteine: 0, carboidrati: 0, grassi: 0
        };
    });
}
