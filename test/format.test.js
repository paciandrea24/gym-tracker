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
