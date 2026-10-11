import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stimaMantenimento, settimane } from '../public/js/services/massaLogic.js';

const oggi = new Date(2026, 9, 11, 9);                       // domenica 11 ottobre
const k = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const giornoFa = (n) => new Date(2026, 9, 11 - n, 12);
const pasti = (da, a, kcal) => { const r = []; for (let n = da; n >= a; n--) r.push({ giorno: k(giornoFa(n)), calorie: typeof kcal === 'function' ? kcal(n) : kcal, pasti: 3 }); return r; };
const pesate = (da, a, kg) => { const r = []; for (let n = da; n >= a; n--) r.push({ weight: kg(n), date: new Date(2026, 9, 11 - n, 7).toISOString() }); return r; };

test('stima: 2500 kcal al giorno e +0,25 kg a settimana → mantenimento 2225, per la massa 2500', () => {
    const s = stimaMantenimento(pasti(28, 1, 2500), pesate(28, 1, (n) => 60 + (28 - n) * 0.25 / 7), oggi);
    assert.equal(s.attuale, true);
    assert.equal(s.da, '2026-09-13');
    assert.equal(s.a, '2026-10-10');
    assert.equal(Math.round(s.calorie), 2500);
    assert.equal(Math.round(s.kgSettimana * 100) / 100, 0.25);
    assert.equal(Math.round(s.mantenimento), 2225);
    assert.equal(Math.round(s.perMassa), 2500);
});

test('stima: pesate che oscillano di mezzo chilo non spostano il mantenimento di molto', () => {
    const s = stimaMantenimento(pasti(28, 1, 2300), pesate(28, 1, (n) => 62 + (n % 2 ? 0.5 : -0.5)), oggi);
    assert.ok(Math.abs(s.mantenimento - 2300) < 40, `mantenimento ${s.mantenimento}`);
});

test('stima: i pasti di oggi non contano (anche segnati in anticipo)', () => {
    const base = stimaMantenimento(pasti(28, 1, 2500), pesate(28, 1, () => 62), oggi);
    const conOggi = stimaMantenimento([...pasti(28, 1, 2500), { giorno: '2026-10-11', calorie: 9000, pasti: 5 }], pesate(28, 1, () => 62), oggi);
    assert.equal(Math.round(conOggi.calorie), Math.round(base.calorie));
});

test('stima: pochi giorni e nessun periodo pronto → quanti giorni mancano', () => {
    assert.deepEqual(stimaMantenimento(pasti(6, 1, 2400), pesate(5, 1, () => 62), oggi), { nessuna: true, mancano: 9 });
});

test('stima: dopo una pausa si usa l\'ultimo periodo pronto, che finisce in un giorno con pasti', () => {
    // Pasti da 110 a 83 giorni fa (28 giorni), pesate fino a 80 giorni fa; poi pausa; ultimi 6 giorni
    const g = [...pasti(110, 83, 2300), ...pasti(6, 1, 2400)];
    const p = [...pesate(110, 80, () => 63), ...pesate(5, 1, () => 61.5)];
    const s = stimaMantenimento(g, p, oggi);
    assert.equal(s.attuale, false);
    assert.equal(s.a, k(giornoFa(83)));
    assert.equal(s.mancano, 9);
    assert.equal(Math.round(s.mantenimento), 2300);
});

test('settimane: media senza oggi, peso con oggi, in corso, differenza solo con la settimana subito prima', () => {
    const g = [...pasti(16, 14, 2000), ...pasti(13, 7, 2200), ...pasti(6, 1, 2400), { giorno: '2026-10-11', calorie: 5000, pasti: 4 }];
    const p = [...pesate(13, 7, () => 61), ...pesate(6, 0, () => 61.5)];
    const r = settimane(g, p, oggi);
    assert.deepEqual(r.map(s => s.lunedi), ['2026-10-05', '2026-09-28', '2026-09-21']);
    assert.equal(r[0].inCorso, true);
    assert.equal(r[0].calorie, 2400);
    assert.equal(r[0].giorniPasti, 6);
    assert.equal(r[0].peso, 61.5);
    assert.equal(Math.round(r[0].differenza * 10) / 10, 0.5);
    assert.equal(r[1].inCorso, false);
    assert.equal(r[1].calorie, 2200);
    assert.equal(r[1].differenza, null);           // la settimana prima non ha pesate
    assert.equal(r[2].peso, null);
});
