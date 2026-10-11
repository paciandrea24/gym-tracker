import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordinaPerUso, leggiUsi, contaUso } from '../public/js/services/preferitiLogic.js';

// localStorage finto
const archivio = (iniziale = {}) => {
    const dati = { ...iniziale };
    return { getItem: (k) => dati[k] ?? null, setItem: (k, v) => { dati[k] = String(v); }, dati };
};
const fav = (alimenti) => ({ _id: alimenti, alimenti });

test('preferiti: i più usati in cima, a parità resta l\'ordine di prima', () => {
    const lista = [fav('Pasta al tonno'), fav('Yogurt e cereali'), fav('Pollo e riso'), fav('Piadina')];
    const usi = { 'pollo e riso': 5, 'piadina': 2, 'yogurt e cereali': 2 };
    assert.deepEqual(ordinaPerUso(lista, usi).map(f => f.alimenti), ['Pollo e riso', 'Yogurt e cereali', 'Piadina', 'Pasta al tonno']);
});

test('preferiti: senza conteggi l\'ordine non cambia', () => {
    const lista = [fav('B'), fav('A')];
    assert.deepEqual(ordinaPerUso(lista, {}).map(f => f.alimenti), ['B', 'A']);
    assert.deepEqual(ordinaPerUso(lista, null).map(f => f.alimenti), ['B', 'A']);
});

test('preferiti: il contatore va per nome (maiuscole e spazi non contano), anche tolto e rimesso', () => {
    const a = archivio();
    contaUso(fav('Pollo e riso'), a);
    contaUso({ _id: 'nuovo-id', alimenti: ' pollo E riso ' }, a);
    contaUso(fav('Piadina'), a);
    assert.deepEqual(leggiUsi(a), { 'pollo e riso': 2, 'piadina': 1 });
});

test('preferiti: localStorage rotto o assente non blocca niente', () => {
    assert.deepEqual(leggiUsi(archivio({ usoPreferiti: '{rotto' })), {});
    assert.deepEqual(leggiUsi({ getItem: () => { throw new Error('bloccato'); } }), {});
    assert.doesNotThrow(() => contaUso(fav('Piadina'), { getItem: () => null, setItem: () => { throw new Error('pieno'); } }));
    assert.deepEqual(leggiUsi(undefined), {});
});
