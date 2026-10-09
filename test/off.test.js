import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valoriDaOFF } from '../public/js/services/pantryService.js';

test('usa le kcal per 100 g quando ci sono', () => {
    assert.deepEqual(valoriDaOFF({
        product_name: 'Passata', nutriments: { 'energy-kcal_100g': 30, proteins_100g: 1.3, carbohydrates_100g: 5, fat_100g: 0.2 }
    }), { nome: 'Passata', calorie100: 30, proteine100: 1.3, carbo100: 5, grassi100: 0.2 });
});

test('converte i kJ in kcal se mancano le kcal', () => {
    const v = valoriDaOFF({ product_name: 'X', nutriments: { 'energy-kj_100g': 418.4 } });
    assert.equal(v.calorie100, 100);
    assert.equal(v.proteine100, 0);
});

test('nome di ripiego se il prodotto non ha nome', () => {
    assert.equal(valoriDaOFF({ nutriments: {} }).nome, 'Prodotto Sconosciuto');
});
