// backend/nutrizionista.js
// L'AI sceglie ingredienti e grammi; i valori nutrizionali li calcoliamo noi dai dati veri
// (dispensa per 100 g, meal prep) invece di fidarci dei conti del modello.

import { tokenizza, classificaMatch, normalizzaNome } from './matching.js';
import { valoriPorzione, totaliDaIngredienti } from './mealPrep.js';

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

export function trovaProdotto(nome, dispensa) {
    const cercato = normalizzaNome(nome);
    const esatto = dispensa.find(p => normalizzaNome(p.nome) === cercato)
        || dispensa.find(p => classificaMatch(nome, p.nome) === 'exact');
    if (esatto) return esatto;

    // Altrimenti il prodotto con più parole in comune
    const parole = new Set(tokenizza(nome));
    let migliore = null, punteggio = 0;
    for (const p of dispensa) {
        const comuni = tokenizza(p.nome).filter(t => parole.has(t)).length;
        if (comuni > punteggio) { migliore = p; punteggio = comuni; }
    }
    return migliore;
}

function ingredienteDaDispensa(ing, dispensa) {
    const prodotto = trovaProdotto(ing.nome, dispensa);
    const richiesti = Number(ing.grammi) || 0;
    if (!prodotto || richiesti <= 0) return null;

    const grammi = Math.round(Math.min(richiesti, Number(prodotto.grammiRimasti) || richiesti));
    const f = grammi / 100;
    return {
        nome: prodotto.nome, grammi,
        calorie: round1(prodotto.calorie100 * f),
        proteine: round1(prodotto.proteine100 * f),
        carboidrati: round1(prodotto.carbo100 * f),
        grassi: round1(prodotto.grassi100 * f)
    };
}

function ingredienteDaPrep(ing, prepsPerRef) {
    const prep = prepsPerRef[ing.prepRef];
    if (!prep) return null;

    // Grammi dall'AI, altrimenti quelli dell'ultima volta; le porzioni valgono solo per le preparazioni vecchie
    const prepGrammi = Number(ing.prepGrammi) > 0 ? Number(ing.prepGrammi) : (Number(prep.riepilogo?.ultimiGrammi) || 0);
    const prepPorzioni = prepGrammi || !(prep.porzioniPreviste > 0) ? 0 : (Number(ing.prepPorzioni) > 0 ? Number(ing.prepPorzioni) : 1);
    const { prepDaCompletare, ...valori } = valoriPorzione({ prepGrammi, prepPorzioni }, prep);
    if (prepDaCompletare) return null;

    return {
        nome: prep.nome, prepId: String(prep._id), prepGrammi, prepPorzioni,
        grammi: valori.grammi,
        calorie: valori.calorie, proteine: valori.proteine, carboidrati: valori.carboidrati, grassi: valori.grassi
    };
}

// pastoAI: { nomePasto, messaggio, ingredienti: [{ nome, grammi } | { prepRef, prepGrammi|prepPorzioni }] }
// prepsPerRef: { P1: prep, ... }
export function componiPasto(pastoAI, dispensa, prepsPerRef) {
    const ingredienti = (pastoAI.ingredienti || [])
        .map(ing => ing.prepRef ? ingredienteDaPrep(ing, prepsPerRef) : ingredienteDaDispensa(ing, dispensa))
        .filter(Boolean);

    const tot = totaliDaIngredienti(ingredienti);
    return {
        nomePasto: pastoAI.nomePasto || 'Pasto',
        messaggio: pastoAI.messaggio || '',
        ingredienti,
        totaleCalorie: tot.calorie,
        totaleProteine: tot.proteine,
        totaleCarbo: tot.carboidrati,
        totaleGrassi: tot.grassi
    };
}

export function componiConsigli(opzioniAI, dispensa, prepsPerRef) {
    const consigli = [];
    for (const opzione of opzioniAI || []) {
        const principale = componiPasto(opzione, dispensa, prepsPerRef);
        if (principale.ingredienti.length === 0) continue;

        let variante = opzione.variante ? componiPasto(opzione.variante, dispensa, prepsPerRef) : null;
        if (variante && variante.ingredienti.length === 0) variante = null;
        consigli.push({ ...principale, variante });
    }
    return consigli;
}
