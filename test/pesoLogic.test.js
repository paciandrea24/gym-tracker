import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unaPerGiorno, riassuntoPeso, righePesate, puntiLinea, segno, pesoScritto } from '../public/js/services/pesoLogic.js';

const oggi = new Date(2026, 9, 10, 21, 0);
const log = (g, ora, weight, id = `${g}-${ora}`) => ({ _id: id, weight, date: new Date(2026, 9, g, ora).toISOString() });

test('una pesata per giorno: resta la più recente del giorno', () => {
    const r = unaPerGiorno([log(9, 8, 75.2), log(10, 7, 75), log(10, 20, 74.8), log(8, 9, 75.4)]);
    assert.deepEqual(r.map(l => l.weight), [74.8, 75.2, 75.4]);
});

test('riassunto: ultimo peso, quando, variazione dalla prima pesata', () => {
    const r = riassuntoPeso([log(10, 8, 74.8), log(7, 8, 74.9), log(5, 8, 76.4)], oggi);
    assert.deepEqual(r, { ultimo: 74.8, quando: 'oggi', variazione: -1.6, dal: '5 ottobre', pesatoOggi: true });
    assert.deepEqual(riassuntoPeso([log(8, 8, 75)], oggi), { ultimo: 75, quando: 'giovedì 8 ottobre', variazione: null, dal: null, pesatoOggi: false });
    assert.equal(riassuntoPeso([], oggi), null);
    assert.equal(riassuntoPeso([log(9, 8, 75.1)], oggi).quando, 'ieri');
});

test('righe: giorno per esteso, differenza dalla pesata prima', () => {
    const r = righePesate([log(10, 8, 74.8), log(7, 8, 74.9), log(7, 6, 80), log(3, 8, 74.9)], oggi);
    assert.deepEqual(r.map(x => [x.giorno, x.kg, x.differenza]), [['Oggi', '74,8', '−0,1'], ['Mercoledì 7 ottobre', '74,9', ''], ['Sabato 3 ottobre', '74,9', '']]);
});

test('segno: meno tipografico, più, zero', () => {
    assert.equal(segno(-1.6), '−1,6');
    assert.equal(segno(0.4), '+0,4');
    assert.equal(segno(0.04), '0');
});

test('linea: dal più vecchio al più recente, piatta se un solo valore', () => {
    assert.equal(puntiLinea([76, 75, 74], 100, 30, 3), '0,3 50,15 100,27');
    assert.equal(puntiLinea([75], 100, 30, 3), '0,15 100,15');
    assert.equal(puntiLinea([75, 75], 100, 30, 3), '0,15 100,15');
    assert.equal(puntiLinea([], 100, 30, 3), '');
});

test('peso scritto: virgola o punto, spazi; vuoto o lettere non valgono', () => {
    assert.equal(pesoScritto('74,8'), 74.8);
    assert.equal(pesoScritto(' 74.8 '), 74.8);
    assert.equal(pesoScritto(''), null);
    assert.equal(pesoScritto('abc'), null);
    assert.equal(pesoScritto('0'), null);
});
