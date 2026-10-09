import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anteprimaPorzione, pastoPerOra, etichettaPorzione } from '../public/js/services/mealPrepService.js';

const ragu = { calorie: 1550, proteine: 109, carboidrati: 35, grassi: 106.4, pesoTotaleCotto: 1250, porzioniPreviste: 4 };

test('anteprima in grammi coincide con il calcolo del server', () => {
    assert.deepEqual(anteprimaPorzione(ragu, { prepGrammi: 250 }), { calorie: 310, proteine: 21.8, carboidrati: 7, grassi: 21.3 });
});

test('anteprima in porzioni', () => {
    assert.equal(anteprimaPorzione(ragu, { prepPorzioni: 1 }).calorie, 387.5);
});

test('anteprima null se manca il dato per calcolare', () => {
    assert.equal(anteprimaPorzione({ ...ragu, porzioniPreviste: 0 }, { prepPorzioni: 1 }), null);
});

test('pasto proposto in base all\'ora', () => {
    assert.equal(pastoPerOra(8), 'Colazione');
    assert.equal(pastoPerOra(13), 'Pranzo');
    assert.equal(pastoPerOra(16), 'Spuntino');
    assert.equal(pastoPerOra(20), 'Cena');
});

test('etichetta quantità di una porzione', () => {
    assert.equal(etichettaPorzione({ prepGrammi: 250 }), '250 g');
    assert.equal(etichettaPorzione({ prepPorzioni: 1 }), '1 porzione');
    assert.equal(etichettaPorzione({ prepPorzioni: 0.5 }), '0,5 porzioni');
    assert.equal(etichettaPorzione({ prepPorzioni: 2 }), '2 porzioni');
});
