import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizzaBarcode } from '../public/js/components/scanner.js';

test('accetta un EAN-13 togliendo spazi e trattini', () => {
    assert.equal(normalizzaBarcode(' 800 1234-567890 '), '8001234567890');
});

test('accetta EAN-8', () => {
    assert.equal(normalizzaBarcode('96385074'), '96385074');
});

test('rifiuta codici troppo corti o con lettere', () => {
    assert.equal(normalizzaBarcode('12345'), null);
    assert.equal(normalizzaBarcode('80012345A7890'), null);
    assert.equal(normalizzaBarcode(''), null);
});
