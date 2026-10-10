import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passoPeso, pesoDrop, pesoReale, volumeSerie, testoSerie, stima1RM } from '../public/js/services/gymLogic.js';

test('passo del peso: 0,5 sotto 10 kg, 1 fino a 30, 2,5 sopra', () => {
    assert.equal(passoPeso(7.5, 'piu'), 8);
    assert.equal(passoPeso(7.3, 'piu'), 7.5);
    assert.equal(passoPeso(9.5, 'piu'), 10);
    assert.equal(passoPeso(10, 'piu'), 11);
    assert.equal(passoPeso(29, 'piu'), 30);
    assert.equal(passoPeso(30, 'piu'), 32.5);
    assert.equal(passoPeso(31, 'piu'), 32.5);
    assert.equal(passoPeso(32.5, 'meno'), 30);
    assert.equal(passoPeso(30, 'meno'), 29);
    assert.equal(passoPeso(10, 'meno'), 9.5);
    assert.equal(passoPeso(4.2, 'meno'), 4);
    assert.equal(passoPeso(0, 'meno'), 0);
});

test('da 7,5 a 4 kg con il meno: sette tocchi esatti', () => {
    let v = 7.5;
    for (let i = 0; i < 7; i++) v = passoPeso(v, 'meno');
    assert.equal(v, 4);
});

test('peso scritto a mano con la virgola o vuoto', () => {
    assert.equal(passoPeso('7,5', 'piu'), 8);
    assert.equal(passoPeso('', 'piu'), 0.5);
});

test('peso del drop: circa 80% arrotondato in giù al passo', () => {
    assert.equal(pesoDrop(65), 50);
    assert.equal(pesoDrop(7), 5.5);
    assert.equal(pesoDrop(20), 16);
});

test('peso reale: per lato conta doppio, il bilanciere si somma solo se c\'è peso', () => {
    assert.equal(pesoReale(5, { weightMultiplier: 2 }), 10);
    assert.equal(pesoReale(60, { barbellWeight: 20 }), 80);
    assert.equal(pesoReale(0, { barbellWeight: 20 }), 0);
    assert.equal(pesoReale('7,5', {}), 7.5);
});

test('volume di una serie: peso reale × ripetizioni, drop compresi; solo pesi', () => {
    const preacher = { type: 'sala-pesi', weightMultiplier: 2 };
    assert.equal(volumeSerie({ kg: 5, reps: 10 }, preacher), 100);
    assert.equal(volumeSerie({ kg: 65, reps: 8, drop: [{ kg: 50, reps: 5 }] }, { type: 'sala-pesi' }), 770);
    assert.equal(volumeSerie({ reps: 10 }, { type: 'corpo-libero' }), 0);
});

test('testo di una serie', () => {
    assert.equal(testoSerie({ kg: 67.5, reps: 8 }, 'sala-pesi'), '67,5 × 8');
    assert.equal(testoSerie({ kg: 65, reps: 8, drop: [{ kg: 50, reps: 5 }, { kg: 40, reps: 3 }] }, 'sala-pesi'), '65 × 8 → 50 × 5 → 40 × 3');
    assert.equal(testoSerie({ reps: 12 }, 'corpo-libero'), '12 rip');
    assert.equal(testoSerie({ reps: 15 }, 'cardio'), '15 min');
});

test('massimale stimato: solo la serie principale, con il peso reale', () => {
    assert.equal(stima1RM({ kg: 100, reps: 1, drop: [{ kg: 200, reps: 1 }] }, {}), 100);
    assert.equal(Math.round(stima1RM({ kg: 5, reps: 10 }, { weightMultiplier: 2 })), 13);
});

import { elementiDaFare, unisciSuperserie, separaSuperserie, completaSuperserie, giriSuperserie } from '../public/js/services/gymLogic.js';

const sessione = () => ({ id: 1, routineId: 'r', todo: ['a', 'b', 'c', 'd'], completed: [] });

test('trascinare c su b crea un blocco al posto di b', () => {
    const s = unisciSuperserie(sessione(), 'c', 'b');
    assert.deepEqual(s.superserie, [['b', 'c']]);
    assert.deepEqual(elementiDaFare(s), [{ tipo: 'esercizio', id: 'a' }, { tipo: 'superserie', ids: ['b', 'c'] }, { tipo: 'esercizio', id: 'd' }]);
});

test('trascinare su un blocco aggiunge al blocco; su sé stessi non fa niente', () => {
    let s = unisciSuperserie(sessione(), 'c', 'b');
    s = unisciSuperserie(s, 'a', 'c');
    assert.deepEqual(s.superserie, [['b', 'c', 'a']]);
    assert.deepEqual(elementiDaFare(s), [{ tipo: 'superserie', ids: ['b', 'c', 'a'] }, { tipo: 'esercizio', id: 'd' }]);
    assert.deepEqual(unisciSuperserie(sessione(), 'a', 'a').superserie || [], []);
});

test('un membro spostato in un altro blocco: il vecchio blocco da uno si scioglie', () => {
    let s = unisciSuperserie(sessione(), 'b', 'a');
    s = unisciSuperserie(s, 'b', 'd');
    assert.deepEqual(s.superserie, [['d', 'b']]);
});

test('separa scioglie il blocco; sessioni vecchie senza superserie funzionano', () => {
    const s = separaSuperserie(unisciSuperserie(sessione(), 'c', 'b'), 'c');
    assert.deepEqual(s.superserie, []);
    assert.equal(elementiDaFare(sessione()).length, 4);
});

test('la sessione originale non viene modificata', () => {
    const originale = sessione();
    unisciSuperserie(originale, 'c', 'b');
    assert.equal(originale.superserie, undefined);
});

test('completare un blocco: ogni esercizio va nei fatti con le sue serie e il segno del blocco', () => {
    const s0 = unisciSuperserie(sessione(), 'c', 'b');
    const es = [{ id: 'b', name: 'Curl', type: 'sala-pesi' }, { id: 'c', name: 'Tricipiti', type: 'sala-pesi' }];
    const s = completaSuperserie(s0, ['b', 'c'], { b: [{ kg: 7, reps: 10, completed: true }], c: [{ kg: 20, reps: 12, completed: true }] }, es);
    assert.deepEqual(s.todo, ['a', 'd']);
    assert.deepEqual(s.superserie, []);
    assert.deepEqual(s.completed.map(e => [e.exerciseId, e.name, e.superserie, e.sets.length]), [['b', 'Curl', 'b+c', 1], ['c', 'Tricipiti', 'b+c', 1]]);
});

test('giri = il massimo delle serie', () => {
    assert.equal(giriSuperserie({ b: [{}, {}, {}], c: [{}, {}, {}, {}] }), 4);
});

import { pulisciSerie, nuovoDrop } from '../public/js/services/gymLogic.js';

test('serie da salvare: virgola e vuoti diventano numeri, i drop senza ripetizioni spariscono', () => {
    assert.deepEqual(pulisciSerie({ kg: '7,5', reps: '10', completed: true }), { kg: 7.5, reps: 10, completed: true });
    assert.deepEqual(pulisciSerie({ kg: '', reps: '', completed: false }), { kg: 0, reps: 0, completed: false });
    assert.deepEqual(pulisciSerie({ kg: 65, reps: 8, drop: [{ kg: '50', reps: '5' }, { kg: 40, reps: '' }] }), { kg: 65, reps: 8, drop: [{ kg: 50, reps: 5 }] });
});

test('nuovo drop: circa 80% dell\'ultimo peso della serie, ripetizioni da scrivere', () => {
    assert.deepEqual(nuovoDrop({ kg: 4, reps: 12 }), { kg: 3, reps: '' });
    assert.deepEqual(nuovoDrop({ kg: '7,5', reps: 10 }), { kg: 6, reps: '' });
    assert.deepEqual(nuovoDrop({ kg: 65, reps: 8, drop: [{ kg: 50, reps: 5 }] }), { kg: 40, reps: '' });
});
