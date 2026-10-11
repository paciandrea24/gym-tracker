import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intero, decimale, macroTesto, macroColonne, perCento } from '../public/js/components/format.js';

test('numeri: interi arrotondati, un decimale con la virgola e mai ",0"', () => {
    assert.equal(intero(341.7), '342');
    assert.equal(intero(undefined), '0');
    assert.equal(decimale(22.34), '22,3');
    assert.equal(decimale(7), '7');
    assert.equal(decimale(7.04), '7');
    assert.equal(decimale('67.5'), '67,5');
});

test('macro in una riga: sempre con il nome, mai la sola iniziale', () => {
    const v = { proteine: 22.34, carboidrati: 7.2, grassi: 23.94 };
    assert.equal(macroTesto(v), 'Proteine 22,3 g · Carboidrati 7,2 g · Grassi 23,9 g');
    assert.equal(macroTesto(v, { breve: true }), 'Proteine 22,3 g · Carbo 7,2 g · Grassi 23,9 g');
});

test('macro a colonne: tre etichette per esteso con i grammi', () => {
    const html = macroColonne({ proteine: 8.93, carboidrati: 2.87, grassi: 9.54 });
    for (const atteso of ['Proteine', 'Carboidrati', 'Grassi', '8,9 g', '2,9 g', '9,5 g']) assert.ok(html.includes(atteso), atteso);
    assert.ok(!/>[PCG] /.test(html));
});

test('valori ogni 100 g da un totale e un peso', () => {
    assert.deepEqual(perCento({ calorie: 1640, proteine: 109, carboidrati: 35, grassi: 116.4 }, 1220),
        { calorie: 134.4, proteine: 8.9, carboidrati: 2.9, grassi: 9.5 });
    assert.equal(perCento({ calorie: 100 }, 0), null);
});

import { chiaveGiorno, lunediDi, nomeGiorno, nomeSettimana, ripartizioneCalorie } from '../public/js/components/format.js';

test('chiave del giorno in ora locale e lunedì della settimana', () => {
    assert.equal(chiaveGiorno(new Date(2026, 9, 9, 23, 30)), '2026-10-09');
    assert.equal(lunediDi('2026-10-10'), '2026-10-05');
    assert.equal(lunediDi('2026-10-05'), '2026-10-05');
    assert.equal(lunediDi('2026-10-11'), '2026-10-05'); // domenica
    assert.equal(lunediDi('2026-10-01'), '2026-09-28');
});

test('nomi dei giorni come si direbbero: Oggi, Ieri, giorno per esteso (con l\'anno solo se diverso)', () => {
    const oggi = new Date(2026, 9, 10, 12);
    assert.equal(nomeGiorno('2026-10-10', oggi), 'Oggi');
    assert.equal(nomeGiorno('2026-10-09', oggi), 'Ieri');
    assert.equal(nomeGiorno('2026-10-08', oggi), 'Giovedì 8 ottobre');
    assert.equal(nomeGiorno('2025-12-30', oggi), 'Martedì 30 dicembre 2025');
});

test('nome della settimana dal lunedì alla domenica', () => {
    const oggi = new Date(2026, 9, 10, 12);
    assert.equal(nomeSettimana('2026-10-05', oggi), '5 – 11 ottobre');
    assert.equal(nomeSettimana('2026-09-28', oggi), '28 settembre – 4 ottobre');
    assert.equal(nomeSettimana('2025-12-29', oggi), '29 dicembre 2025 – 4 gennaio 2026');
    assert.equal(nomeSettimana('2025-06-02', oggi), '2 – 8 giugno 2025');
});

test('da dove vengono le calorie: percentuali dai grammi (4, 4, 9 kcal) che sommano a 100', () => {
    assert.deepEqual(ripartizioneCalorie({ proteine: 105, carboidrati: 161, grassi: 10.8 }), { proteine: 36, carboidrati: 56, grassi: 8 });
    // 40 + 40 + 90 kcal: 23,5% · 23,5% · 52,9% → il punto mancante va ai resti più grandi
    assert.deepEqual(ripartizioneCalorie({ proteine: 10, carboidrati: 10, grassi: 10 }), { proteine: 24, carboidrati: 23, grassi: 53 });
    assert.equal(ripartizioneCalorie({ proteine: 0, carboidrati: 0, grassi: 0 }), null);
});

test('macro in una riga con i grammi interi', () => {
    assert.equal(macroTesto({ proteine: 104.6, carboidrati: 161.2, grassi: 10.8 }, { breve: true, interi: true }), 'Proteine 105 g · Carbo 161 g · Grassi 11 g');
});

import { msAllaMezzanotte } from '../public/js/components/format.js';

test('quanto manca alla prossima mezzanotte (ora locale, anche col cambio dell\'ora)', () => {
    assert.equal(msAllaMezzanotte(new Date(2026, 9, 11, 23, 59, 58)), 2000);
    assert.equal(msAllaMezzanotte(new Date(2026, 9, 11, 0, 0, 0)), 24 * 60 * 60 * 1000);
    assert.equal(msAllaMezzanotte(new Date(2026, 9, 31, 12, 0, 0)), 12 * 60 * 60 * 1000);
    // 25 ottobre: in Italia si torna all'ora solare, il giorno può durare 25 ore
    assert.equal(msAllaMezzanotte(new Date(2026, 9, 25, 0, 0, 0)), new Date(2026, 9, 26) - new Date(2026, 9, 25));
});
