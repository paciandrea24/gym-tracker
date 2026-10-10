import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trovaProdotto, componiPasto, componiConsigli } from './nutrizionista.js';

const dispensa = [
    { nome: 'Pasta Barilla', grammiRimasti: 500, calorie100: 359, proteine100: 14, carbo100: 70, grassi100: 2 },
    { nome: 'Petto di pollo', grammiRimasti: 150, calorie100: 110, proteine100: 23, carbo100: 0, grassi100: 1.5 },
    { nome: 'Passata di pomodoro', grammiRimasti: 700, calorie100: 30, proteine100: 1.3, carbo100: 5, grassi100: 0.2 }
];
const ragu = { _id: 'prep1', nome: 'Ragù', calorie: 1460, proteine: 109.1, carboidrati: 35, grassi: 96.4, pesoTotaleCotto: 1000, porzioniPreviste: 4 };
const preps = { P1: ragu };

test('trova il prodotto con il nome esatto ignorando maiuscole', () => {
    assert.equal(trovaProdotto('pasta barilla', dispensa).nome, 'Pasta Barilla');
});

test('trova il prodotto anche con piccole differenze nel nome', () => {
    assert.equal(trovaProdotto('Passata pomodoro', dispensa).nome, 'Passata di pomodoro');
    assert.equal(trovaProdotto('pollo', dispensa).nome, 'Petto di pollo');
});

test('nessun prodotto per un alimento che non è in dispensa', () => {
    assert.equal(trovaProdotto('Salmone', dispensa), null);
});

test('i valori vengono calcolati dalla dispensa, non presi dall\'AI', () => {
    const pasto = componiPasto({
        nomePasto: 'Pasta al pomodoro', messaggio: 'ok',
        ingredienti: [{ nome: 'Pasta Barilla', grammi: 80, calorie: 9999 }, { nome: 'Passata di pomodoro', grammi: 100 }]
    }, dispensa, preps);

    assert.deepEqual(pasto.ingredienti[0], { nome: 'Pasta Barilla', grammi: 80, calorie: 287.2, proteine: 11.2, carboidrati: 56, grassi: 1.6 });
    assert.equal(pasto.totaleCalorie, 317.2);
    assert.equal(pasto.totaleProteine, 12.5);
    assert.equal(pasto.totaleCarbo, 61);
    assert.equal(pasto.totaleGrassi, 1.8);
});

test('i grammi non superano quelli disponibili in dispensa', () => {
    const pasto = componiPasto({ nomePasto: 'Pollo', ingredienti: [{ nome: 'Petto di pollo', grammi: 300 }] }, dispensa, preps);
    assert.equal(pasto.ingredienti[0].grammi, 150);
    assert.equal(pasto.totaleCalorie, 165);
});

test('ingredienti inventati (non in dispensa) vengono scartati', () => {
    const pasto = componiPasto({ nomePasto: 'X', ingredienti: [{ nome: 'Salmone', grammi: 100 }, { nome: 'Pasta Barilla', grammi: 100 }] }, dispensa, preps);
    assert.deepEqual(pasto.ingredienti.map(i => i.nome), ['Pasta Barilla']);
});

test('una porzione di meal prep usa i valori della preparazione e resta collegata', () => {
    const pasto = componiPasto({
        nomePasto: 'Pasta al ragù',
        ingredienti: [{ nome: 'Pasta Barilla', grammi: 80 }, { prepRef: 'P1', prepPorzioni: 1 }]
    }, dispensa, preps);

    assert.deepEqual(pasto.ingredienti[1], {
        nome: 'Ragù', prepId: 'prep1', prepGrammi: 0, prepPorzioni: 1, grammi: 250,
        calorie: 365, proteine: 27.3, carboidrati: 8.8, grassi: 24.1
    });
    assert.equal(pasto.totaleCalorie, 652.2);
});

test('meal prep a grammi: senza grammi dall\'AI valgono quelli dell\'ultima volta, senza nessun dato si scarta', () => {
    const nuovo = { _id: 'prep2', nome: 'Chili', calorie: 1200, proteine: 80, carboidrati: 100, grassi: 40, pesoTotaleCotto: 1200, porzioniPreviste: 0, riepilogo: { ultimiGrammi: 300 } };
    const conGrammi = componiPasto({ nomePasto: 'A', ingredienti: [{ prepRef: 'P2', prepGrammi: 200 }] }, dispensa, { P2: nuovo });
    assert.equal(conGrammi.ingredienti[0].prepGrammi, 200);
    assert.equal(conGrammi.ingredienti[0].calorie, 200);

    const senzaGrammi = componiPasto({ nomePasto: 'B', ingredienti: [{ prepRef: 'P2', prepPorzioni: 1 }] }, dispensa, { P2: nuovo });
    assert.equal(senzaGrammi.ingredienti[0].prepGrammi, 300);
    assert.equal(senzaGrammi.ingredienti[0].prepPorzioni, 0);

    const maiMangiato = { ...nuovo, riepilogo: { ultimiGrammi: null } };
    const scartato = componiPasto({ nomePasto: 'C', ingredienti: [{ prepRef: 'P2' }] }, dispensa, { P2: maiMangiato });
    assert.equal(scartato.ingredienti.length, 0);
});

test('consigli: le opzioni senza ingredienti validi vengono tolte, una variante non valida diventa null', () => {
    const consigli = componiConsigli([
        { nomePasto: 'Vuoto', ingredienti: [{ nome: 'Salmone', grammi: 100 }] },
        {
            nomePasto: 'Pollo', messaggio: 'proteico', ingredienti: [{ nome: 'Petto di pollo', grammi: 100 }],
            variante: { nomePasto: 'Inventata', ingredienti: [{ nome: 'Tofu', grammi: 100 }] }
        }
    ], dispensa, preps);

    assert.equal(consigli.length, 1);
    assert.equal(consigli[0].nomePasto, 'Pollo');
    assert.equal(consigli[0].messaggio, 'proteico');
    assert.equal(consigli[0].variante, null);
});
