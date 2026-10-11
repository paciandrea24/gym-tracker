import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valoriDaPer100 } from './voce.js';

test('voce: con i valori ogni 100 g il conto lo fa il server sui grammi mangiati', () => {
    // Banana da 180 g con la buccia: Gemini dà 117 g mangiati ma calorie calcolate su 180 g
    const [banana] = valoriDaPer100([{ nome: 'Banana', grammi: 117, calorie: 160, proteine: 2, carboidrati: 41, grassi: 0.5, kcal100: 89, proteine100: 1.1, carboidrati100: 22.8, grassi100: 0.3 }]);
    assert.deepEqual(banana, { nome: 'Banana', grammi: 117, calorie: 104.1, proteine: 1.3, carboidrati: 26.7, grassi: 0.4 });
});

test('voce: senza valori ogni 100 g (totali detti dall\'utente) restano i totali di Gemini', () => {
    const [panino] = valoriDaPer100([{ nome: 'Panino', grammi: 150, calorie: 450, proteine: 20, carboidrati: 50, grassi: 18, kcal100: null, proteine100: null, carboidrati100: null, grassi100: null }]);
    assert.deepEqual(panino, { nome: 'Panino', grammi: 150, calorie: 450, proteine: 20, carboidrati: 50, grassi: 18 });
});

test('voce: senza grammi restano i totali; i campi ogni 100 g non finiscono nel pasto', () => {
    const [x] = valoriDaPer100([{ nome: 'Pizza', grammi: 0, calorie: 900, proteine: 35, carboidrati: 110, grassi: 30, kcal100: 250, proteine100: 10, carboidrati100: 30, grassi100: 8 }]);
    assert.deepEqual(x, { nome: 'Pizza', grammi: 0, calorie: 900, proteine: 35, carboidrati: 110, grassi: 30 });
});

test('voce: le porzioni di meal prep non si toccano (le calcola l\'app)', () => {
    const prep = { nome: 'Ragù', prepId: 'p1', prepGrammi: 180, prepPorzioni: 0, calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 };
    assert.deepEqual(valoriDaPer100([prep]), [prep]);
});

test('voce: un macro ogni 100 g mancante vale 0, non NaN', () => {
    const [x] = valoriDaPer100([{ nome: 'Caffè', grammi: 7, calorie: 0, proteine: 0, carboidrati: 0, grassi: 0, kcal100: 2, proteine100: 0.1 }]);
    assert.deepEqual(x, { nome: 'Caffè', grammi: 7, calorie: 0.1, proteine: 0, carboidrati: 0, grassi: 0 });
});
