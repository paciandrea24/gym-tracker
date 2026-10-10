import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    calcolaQuota, valoriPorzione, ricalcolaPasto, totaliDaIngredienti,
    riepilogoConsumo, senzaCollegamentiPrep, risolviRiferimentiPrep, pesoCrudo
} from './mealPrep.js';

// Ragù da 1200 g cotti: 2400 kcal, 160 P, 80 C, 150 G
const ragu = (extra = {}) => ({
    _id: 'prep1', nome: 'Ragù',
    calorie: 2400, proteine: 160, carboidrati: 80, grassi: 150,
    pesoTotaleCotto: 1200, porzioniPreviste: 3,
    ...extra
});

test('quota a peso = grammi presi / peso totale cotto', () => {
    assert.equal(calcolaQuota({ prepId: 'prep1', prepGrammi: 300 }, ragu()), 0.25);
});

test('quota a porzioni = porzioni / porzioni previste', () => {
    assert.equal(calcolaQuota({ prepId: 'prep1', prepPorzioni: 1 }, ragu({ porzioniPreviste: 4 })), 0.25);
});

test('quota null se manca il peso totale per una porzione in grammi', () => {
    assert.equal(calcolaQuota({ prepId: 'prep1', prepGrammi: 300 }, ragu({ pesoTotaleCotto: 0 })), null);
});

test('quota null se manca N per una porzione in porzioni', () => {
    assert.equal(calcolaQuota({ prepId: 'prep1', prepPorzioni: 1 }, ragu({ porzioniPreviste: 0 })), null);
});

test('valori porzione: 1 porzione su 3 prende un terzo dei macro e dei grammi', () => {
    assert.deepEqual(valoriPorzione({ prepId: 'prep1', prepPorzioni: 1 }, ragu()), {
        calorie: 800, proteine: 53.3, carboidrati: 26.7, grassi: 50, grammi: 400, prepDaCompletare: false
    });
});

test('valori porzione: dati mancanti danno zero e flag da completare', () => {
    assert.deepEqual(valoriPorzione({ prepId: 'prep1', prepGrammi: 250 }, ragu({ pesoTotaleCotto: 0 })), {
        calorie: 0, proteine: 0, carboidrati: 0, grassi: 0, grammi: 250, prepDaCompletare: true
    });
});

test('ricalcolo: passando da 3 a 4 porzioni cambia solo il ragù e il totale per differenza', () => {
    const meal = {
        calorie: 1150, proteine: 65.3, carboidrati: 96.7, grassi: 51.5,
        ingredienti: [
            { nome: 'Pasta', grammi: 100, calorie: 350, proteine: 12, carboidrati: 70, grassi: 1.5 },
            { nome: 'Ragù', prepId: 'prep1', prepPorzioni: 1, grammi: 400, calorie: 800, proteine: 53.3, carboidrati: 26.7, grassi: 50 }
        ]
    };
    const changed = ricalcolaPasto(meal, new Map([['prep1', ragu({ porzioniPreviste: 4 })]]));

    assert.equal(changed, true);
    assert.equal(meal.ingredienti[0].calorie, 350);
    assert.equal(meal.ingredienti[1].calorie, 600);
    assert.equal(meal.ingredienti[1].grammi, 300);
    assert.equal(meal.calorie, 950);
    assert.equal(meal.proteine, 52);
    assert.equal(meal.carboidrati, 90);
    assert.equal(meal.grassi, 39);
});

test('ricalcolo: una porzione nuova a zero viene riempita e sommata al totale', () => {
    const meal = {
        calorie: 350, proteine: 12, carboidrati: 70, grassi: 1.5,
        ingredienti: [
            { nome: 'Pasta', grammi: 100, calorie: 350, proteine: 12, carboidrati: 70, grassi: 1.5 },
            { nome: 'Ragù', prepId: 'prep1', prepGrammi: 300 }
        ]
    };
    ricalcolaPasto(meal, new Map([['prep1', ragu()]]));
    assert.equal(meal.calorie, 950);
    assert.equal(meal.ingredienti[1].calorie, 600);
});

test('ricalcolo: preparazione sconosciuta lascia il pasto invariato', () => {
    const meal = {
        calorie: 800, proteine: 53.3, carboidrati: 26.7, grassi: 50,
        ingredienti: [{ nome: 'Ragù', prepId: 'cancellata', prepPorzioni: 1, calorie: 800, proteine: 53.3, carboidrati: 26.7, grassi: 50 }]
    };
    assert.equal(ricalcolaPasto(meal, new Map()), false);
    assert.equal(meal.calorie, 800);
});

test('ricalcolo: accetta id ObjectId-like confrontandoli come stringhe', () => {
    const objectIdLike = { toString: () => 'prep1' };
    const meal = { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0, ingredienti: [{ prepId: objectIdLike, prepPorzioni: 1 }] };
    ricalcolaPasto(meal, new Map([['prep1', ragu()]]));
    assert.equal(meal.calorie, 800);
});

test('totali da ingredienti: somma arrotondata al decimo', () => {
    assert.deepEqual(totaliDaIngredienti([
        { calorie: 100.04, proteine: 1.11, carboidrati: 2, grassi: 0.5 },
        { calorie: 50, proteine: 1.11, carboidrati: 3, grassi: 0.5 },
        { nome: 'senza valori' }
    ]), { calorie: 150, proteine: 2.2, carboidrati: 5, grassi: 1 });
});

test('riepilogo consumo: grammi mangiati, rimasti e ultima porzione (anche porzioni vecchie)', () => {
    // porzioni dalla più recente: 300 g, poi 1 porzione vecchia (1 di 4 su 1200 g = 300 g)
    const r = riepilogoConsumo(ragu({ porzioniPreviste: 4 }), [{ prepGrammi: 300 }, { prepPorzioni: 1 }]);
    assert.deepEqual(r, { quotaUsata: 0.5, grammiUsati: 600, grammiRimasti: 600, ultimiGrammi: 300 });
});

test('riepilogo consumo: rimasti mai sotto zero, ultima volta dalla porzione in grammi più recente', () => {
    const r = riepilogoConsumo(ragu(), [{ prepPorzioni: 1 }, { prepGrammi: 900 }, { prepGrammi: 500 }]);
    assert.equal(r.grammiRimasti, 0);
    assert.equal(r.ultimiGrammi, 900);
});

test('riepilogo consumo senza peso: niente grammi, porzioni non calcolabili ignorate', () => {
    const r = riepilogoConsumo(ragu({ pesoTotaleCotto: 0 }), [{ prepPorzioni: 1 }, { prepGrammi: 300 }]);
    assert.deepEqual(r, { quotaUsata: 0.333, grammiUsati: null, grammiRimasti: null, ultimiGrammi: 300 });
});

test('peso crudo: somma dei grammi degli ingredienti, arrotondata', () => {
    assert.equal(pesoCrudo([{ grammi: 500 }, { grammi: 700.4 }, { grammi: 20 }, { nome: 'sale' }]), 1220);
    assert.equal(pesoCrudo([]), 0);
    assert.equal(pesoCrudo(undefined), 0);
});

test('preferiti: gli ingredienti perdono il collegamento ma tengono i valori', () => {
    const [ing] = senzaCollegamentiPrep([
        { nome: 'Ragù', prepId: 'prep1', prepGrammi: 300, prepPorzioni: 0, prepDaCompletare: false, grammi: 300, calorie: 600 }
    ]);
    assert.deepEqual(ing, { nome: 'Ragù', grammi: 300, calorie: 600 });
});

test('voce: prepRef noto diventa prepId, sconosciuto viene ignorato', () => {
    const out = risolviRiferimentiPrep([
        { nome: 'Pasta', grammi: 80, calorie: 280 },
        { nome: 'Ragù', prepRef: 'P1', prepGrammi: 250, calorie: 999 },
        { nome: 'Sugo', prepRef: 'P9', grammi: 100, calorie: 90 }
    ], { P1: 'prep1' });

    assert.deepEqual(out[0], { nome: 'Pasta', grammi: 80, calorie: 280 });
    assert.deepEqual(out[1], { nome: 'Ragù', prepId: 'prep1', prepGrammi: 250, prepPorzioni: 0, calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 });
    assert.deepEqual(out[2], { nome: 'Sugo', grammi: 100, calorie: 90 });
});

test('voce: senza grammi si usano quelli dell\'ultima volta', () => {
    const [ing] = risolviRiferimentiPrep([{ nome: 'Ragù', prepRef: 'P1' }], { P1: 'prep1' }, { prep1: 250 });
    assert.equal(ing.prepGrammi, 250);
    assert.equal(ing.prepPorzioni, 0);
});

test('voce: senza grammi e senza ultima volta la porzione resta da completare', () => {
    const [ing] = risolviRiferimentiPrep([{ nome: 'Ragù', prepRef: 'P1', prepPorzioni: 1 }], { P1: 'prep1' });
    assert.equal(ing.prepGrammi, 0);
    assert.equal(ing.prepPorzioni, 0);
    assert.equal(valoriPorzione(ing, ragu()).prepDaCompletare, true);
});
