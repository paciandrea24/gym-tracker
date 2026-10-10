import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIPI, nomeTipo, statoProdotto, gruppiDispensa, daComprare, rifornimento, correzioneGrammi, rigaUtilizzo, trovaEsistente, percentuale } from '../public/js/services/pantryLogic.js';

const p = (nome, categoria, rimasti, totali) => ({ _id: nome, nome, categoria, grammiRimasti: rimasti, grammiTotali: totali, sogliaBassa: 20, pesoConfezione: totali });

test('tipi al plurale, sconosciuti in Altro', () => {
    assert.deepEqual(TIPI.map(t => t.nome), ['Proteine', 'Carboidrati', 'Latticini', 'Verdura', 'Frutta', 'Condimenti e grassi', 'Altro']);
    assert.equal(nomeTipo('Condimento/Grassi'), 'Condimenti e grassi');
    assert.equal(nomeTipo('Boh'), 'Altro');
    assert.equal(nomeTipo(undefined), 'Altro');
});

test('stato: finito a zero o meno, sta finendo sotto il 20%', () => {
    assert.equal(statoProdotto(p('Uova', 'Proteina', 60, 360)), 'sta-finendo');
    assert.equal(statoProdotto(p('Bresaola', 'Proteina', 0, 100)), 'finito');
    assert.equal(statoProdotto(p('Vecchio', 'Altro', -20, 100)), 'finito');
    assert.equal(statoProdotto(p('Pollo', 'Proteina', 650, 1000)), 'ok');
    assert.equal(statoProdotto(p('Senza totale', 'Altro', 50, 0)), 'ok');
    assert.equal(percentuale(p('Vecchio', 'Altro', -20, 100)), 0);
    assert.equal(percentuale(p('Troppo', 'Altro', 150, 100)), 100);
    assert.equal(percentuale(p('Senza totale', 'Altro', 50, 0)), 100);
});

test('gruppi: ordine dei tipi, alfabetico, finiti in fondo, sconosciuti in Altro', () => {
    const g = gruppiDispensa([p('Uova', 'Proteina', 60, 360), p('Riso', 'Carboidrato', 820, 1000), p('bresaola', 'Proteina', 0, 100), p('Petto di pollo', 'Proteina', 650, 1000), p('Strano', 'Boh', 10, 10)]);
    assert.deepEqual(g.map(x => [x.nome, x.prodotti.map(i => i.nome)]), [
        ['Proteine', ['Petto di pollo', 'Uova', 'bresaola']],
        ['Carboidrati', ['Riso']],
        ['Altro', ['Strano']]
    ]);
});

test('da comprare: finiti e quelli che stanno finendo, in ordine alfabetico', () => {
    const lista = daComprare([p('Uova', 'Proteina', 60, 360), p('Pollo', 'Proteina', 650, 1000), p('Bresaola', 'Proteina', 0, 100)]);
    assert.deepEqual(lista.map(i => i.nome), ['Bresaola', 'Uova']);
});

test('rifornimento: si somma a quello che resta e diventa il nuovo riferimento', () => {
    assert.deepEqual(rifornimento(p('Uova', 'Proteina', 60, 360), 2, 360), { pesoConfezione: 360, quantitaConfezioni: 2, grammiRimasti: 780, grammiTotali: 780 });
    assert.deepEqual(rifornimento(p('Vecchio', 'Altro', -20, 100), 1, '12,5'), { pesoConfezione: 12.5, quantitaConfezioni: 1, grammiRimasti: 12.5, grammiTotali: 12.5 });
    assert.deepEqual(rifornimento(p('Uova', 'Proteina', 60, 360), '', 360), { pesoConfezione: 360, quantitaConfezioni: 1, grammiRimasti: 420, grammiTotali: 420 });
});

test('correzione: i rimasti diventano quelli scritti, il riferimento sale se li supera', () => {
    assert.deepEqual(correzioneGrammi(p('Pollo', 'Proteina', 650, 1000), '600'), { grammiRimasti: 600, grammiTotali: 1000 });
    assert.deepEqual(correzioneGrammi(p('Pollo', 'Proteina', 650, 1000), '1200,5'), { grammiRimasti: 1200.5, grammiTotali: 1200.5 });
    assert.deepEqual(correzioneGrammi(p('Pollo', 'Proteina', 650, 1000), ''), { grammiRimasti: 0, grammiTotali: 1000 });
});

test('riga utilizzo: pasto e piatto, oggi/ieri con l\'ora, grammi tolti o rimessi', () => {
    const oggi = new Date(2026, 9, 10, 22, 0);
    assert.deepEqual(rigaUtilizzo({ nomePasto: 'Pranzo: Insalata di pollo', data: new Date(2026, 9, 10, 13, 10), grammiScalati: 80 }, oggi), { titolo: 'Pranzo · Insalata di pollo', quando: 'Oggi, 13:10', grammi: '−80 g' });
    assert.deepEqual(rigaUtilizzo({ nomePasto: 'Riduzione grammi', data: new Date(2026, 9, 9, 20, 30), grammiScalati: -40 }, oggi), { titolo: 'Riduzione grammi', quando: 'Ieri, 20:30', grammi: '+40 g' });
    assert.equal(rigaUtilizzo({ nomePasto: 'Cena: Pollo', data: new Date(2026, 9, 7, 20, 0), grammiScalati: 150 }, oggi).quando, 'Mercoledì 7 ottobre');
});

test('prodotto già presente: stesso codice, o stesso nome senza badare alle maiuscole', () => {
    const items = [{ _id: 'a', nome: 'Skyr bianco', barcode: '123' }, { _id: 'b', nome: 'Mozzarella', barcode: '' }];
    assert.equal(trovaEsistente(items, { barcode: '123', nome: 'Altro nome' })._id, 'a');
    assert.equal(trovaEsistente(items, { barcode: '', nome: ' mozzarella ' })._id, 'b');
    assert.equal(trovaEsistente(items, { barcode: '999', nome: 'Ricotta' }), null);
});

import { parolaFinito } from '../public/js/services/pantryLogic.js';

test('"finito" concorda con il nome del prodotto (prima parola)', () => {
    const casi = { 'Bresaola': 'finita', 'Pasta Barilla': 'finita', 'Latte parzialmente scremato': 'finito', 'Pane in cassetta': 'finito', 'Uova': 'finite', 'Mele': 'finite', 'Banane': 'finite', 'Olive': 'finite', 'Riso basmati': 'finito', 'Fagioli': 'finiti', 'Salmone': 'finito', 'Yogurt greco 0%': 'finito', 'Miele': 'finito' };
    for (const [nome, atteso] of Object.entries(casi)) assert.equal(parolaFinito(nome), atteso, nome);
});
