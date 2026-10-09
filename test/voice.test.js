import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unisciTrascrizioni } from '../public/js/components/voice.js';

test('trascrizioni incrementali vengono concatenate', () => {
    assert.equal(unisciTrascrizioni(['pasta 80 grammi', 'con 200 grammi di ragù']), 'pasta 80 grammi con 200 grammi di ragù');
});

test('trascrizioni cumulative di iOS non vengono duplicate', () => {
    assert.equal(unisciTrascrizioni(['pasta', 'pasta 80 grammi', 'pasta 80 grammi con ragù']), 'pasta 80 grammi con ragù');
});

test('un risultato ripetuto identico non viene aggiunto due volte', () => {
    assert.equal(unisciTrascrizioni(['pasta con ragù', 'pasta con ragù']), 'pasta con ragù');
});

test('parti vuote e spazi vengono ignorati', () => {
    assert.equal(unisciTrascrizioni(['', '  pollo ', undefined, 'e riso']), 'pollo e riso');
});
