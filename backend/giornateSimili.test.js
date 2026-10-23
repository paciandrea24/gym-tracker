import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slotPasti, distanzaMacro, suggerisciChiusure } from './giornateSimili.js';

const OBIETTIVI = { calorie: 2000, proteine: 150, carboidrati: 200, grassi: 60 };

// Pasto di prova con i suoi macro: [kcal, proteine, carboidrati, grassi]
function pasto(giorno, ora, tipo, alimenti, [calorie, proteine, carboidrati, grassi] = [300, 20, 30, 10]) {
    return {
        _id: `${giorno}-${ora}-${tipo}`,
        data: new Date(`${giorno}T${ora}:00+02:00`),
        pasto: tipo, alimenti, calorie, proteine, carboidrati, grassi,
        ingredienti: [{ nome: alimenti, calorie, proteine, carboidrati, grassi, grammi: 100 }]
    };
}

const OGGI = '2026-10-10';

// Oggi: colazione 400 kcal + pranzo 600 kcal = 1000 kcal · P 60 · C 130 · G 30
function oggiColazionePranzo() {
    return [
        pasto(OGGI, '08:00', 'Colazione', 'Latte e cereali', [400, 20, 60, 12]),
        pasto(OGGI, '13:00', 'Pranzo', 'Pasta al ragù', [600, 40, 70, 18])
    ];
}

// Giorno passato con colazione e pranzo dati e una cena
function giorno(g, [colazione, pranzo], cena = ['Pollo e patate', [550, 45, 40, 18]]) {
    return {
        giorno: g, pasti: [
            pasto(g, '08:00', 'Colazione', 'Colazione', colazione),
            pasto(g, '13:00', 'Pranzo', 'Pranzo', pranzo),
            pasto(g, '20:30', 'Cena', ...cena)
        ]
    };
}

test('i pasti principali hanno il loro posto, gli spuntini quello dopo il pasto precedente', () => {
    const g = '2026-10-03';
    const slot = slotPasti([
        pasto(g, '20:30', 'Cena', 'Pollo'),
        pasto(g, '08:00', 'Colazione', 'Latte'),
        pasto(g, '10:30', 'Spuntino', 'Mela'),
        pasto(g, '13:00', 'Pranzo', 'Pasta'),
        pasto(g, '17:00', 'Spuntino', 'Yogurt'),
        pasto(g, '22:30', 'Spuntino', 'Camomilla')
    ]).map(x => [x.pasto.pasto, x.slot]);

    assert.deepEqual(slot, [
        ['Colazione', 1], ['Spuntino', 2], ['Pranzo', 3], ['Spuntino', 4], ['Cena', 5], ['Spuntino', 6]
    ]);
});

test('uno spuntino senza pasti principali prima prende il posto prima del pasto successivo', () => {
    const g = '2026-10-03';
    const slot = slotPasti([
        pasto(g, '10:30', 'Spuntino', 'Mela'),
        pasto(g, '13:00', 'Pranzo', 'Pasta')
    ]).map(x => x.slot);
    assert.deepEqual(slot, [2, 3]);
});

test('distanza tra macro: zero se uguali, ogni macro pesa rispetto al proprio obiettivo', () => {
    const a = { calorie: 1000, proteine: 60, carboidrati: 130, grassi: 30 };
    assert.equal(distanzaMacro(a, a, OBIETTIVI), 0);

    // 200 kcal in più (10% dell'obiettivo) pesano come 15 g di proteine in più (10% di 150)
    const piuCalorie = distanzaMacro(a, { ...a, calorie: 1200 }, OBIETTIVI);
    const piuProteine = distanzaMacro(a, { ...a, proteine: 75 }, OBIETTIVI);
    assert.ok(Math.abs(piuCalorie - piuProteine) < 1e-9);
    assert.ok(piuCalorie > 0);
});

test('suggerisce come è finito il giorno con macro simili allo stesso punto', () => {
    const giorni = [
        giorno('2026-10-03', [[420, 22, 58, 12], [580, 38, 72, 17]]),           // quasi uguale
        giorno('2026-10-04', [[150, 10, 20, 4], [300, 15, 40, 8]], ['Pizza', [900, 35, 110, 30]]) // molto meno
    ];

    const r = suggerisciChiusure(oggiColazionePranzo(), giorni, { obiettivi: OBIETTIVI });

    assert.equal(r.length, 1);
    assert.equal(r[0].giorno, '2026-10-03');
    assert.deepEqual(r[0].pasti.map(p => p.alimenti), ['Pollo e patate']);
    assert.deepEqual(r[0].totali, { calorie: 550, proteine: 45, carboidrati: 40, grassi: 18 });
    assert.deepEqual(r[0].aQuelPunto, { calorie: 1000, proteine: 60, carboidrati: 130, grassi: 29 });
    assert.deepEqual(r[0].giorniUguali, []);
});

test('si confrontano solo i pasti fino allo stesso punto: spuntini e cena dopo non contano', () => {
    const g = '2026-10-03';
    const giorni = [{
        giorno: g, pasti: [
            pasto(g, '08:00', 'Colazione', 'Colazione', [400, 20, 60, 12]),
            pasto(g, '13:00', 'Pranzo', 'Pranzo', [600, 40, 70, 18]),
            pasto(g, '17:00', 'Spuntino', 'Yogurt greco', [150, 15, 10, 4]),
            pasto(g, '20:30', 'Cena', 'Salmone e riso', [700, 40, 80, 22])
        ]
    }];

    const r = suggerisciChiusure(oggiColazionePranzo(), giorni, { obiettivi: OBIETTIVI });

    assert.equal(r.length, 1);
    assert.deepEqual(r[0].pasti.map(p => p.pasto), ['Spuntino', 'Cena']);
    assert.equal(r[0].totali.calorie, 850);
});

test('i giorni senza pasti dopo quelli di oggi non vengono suggeriti', () => {
    const g = '2026-10-03';
    const giorni = [{
        giorno: g, pasti: [
            pasto(g, '08:00', 'Colazione', 'Colazione', [400, 20, 60, 12]),
            pasto(g, '13:00', 'Pranzo', 'Pranzo', [600, 40, 70, 18])
        ]
    }];
    assert.deepEqual(suggerisciChiusure(oggiColazionePranzo(), giorni, { obiettivi: OBIETTIVI }), []);
});

test('giorni finiti allo stesso modo diventano un solo consiglio', () => {
    const giorni = ['2026-10-01', '2026-10-02', '2026-10-03'].map(g => giorno(g, [[400, 20, 60, 12], [600, 40, 70, 18]]));

    const r = suggerisciChiusure(oggiColazionePranzo(), giorni, { obiettivi: OBIETTIVI });

    assert.equal(r.length, 1);
    assert.equal(r[0].giorno, '2026-10-03'); // il più recente
    assert.deepEqual(r[0].giorniUguali, ['2026-10-02', '2026-10-01']);
});

test('tra i giorni simili si propone il più recente, anche se un altro ha macro più vicini', () => {
    const giorni = [
        giorno('2026-10-01', [[400, 20, 60, 12], [600, 40, 70, 18]], ['Pizza', [1300, 45, 150, 50]]),        // identico
        giorno('2026-10-03', [[450, 25, 65, 14], [650, 42, 75, 20]], ['Salmone e riso', [1050, 60, 110, 35]]), // simile, più recente
        giorno('2026-10-04', [[150, 10, 20, 4], [300, 15, 40, 8]], ['Bistecca', [1100, 60, 0, 40]])           // troppo diverso
    ];

    const r = suggerisciChiusure(oggiColazionePranzo(), giorni, { obiettivi: OBIETTIVI });

    assert.deepEqual(r.map(x => x.giorno), ['2026-10-03']);
});

// Oggi 1000 kcal, obiettivo 2000: servono pasti da almeno 950 kcal (50 kcal di margine)
test('si propone il giorno più recente che fa arrivare all\'obiettivo, non uno rimasto sotto', () => {
    const giorni = [
        giorno('2026-10-01', [[400, 20, 60, 12], [600, 40, 70, 18]], ['Pizza', [1100, 45, 130, 40]]),   // 2100: arriva
        giorno('2026-10-03', [[400, 20, 60, 12], [600, 40, 70, 18]], ['Insalata', [840, 40, 60, 30]])    // 1840: sotto
    ];

    const r = suggerisciChiusure(oggiColazionePranzo(), giorni, { obiettivi: OBIETTIVI });

    assert.deepEqual(r.map(x => x.giorno), ['2026-10-01']);
    assert.equal(r[0].proiezione, 2100);
});

test('bastano 50 kcal in meno dell\'obiettivo, non di più', () => {
    const giorni = [
        giorno('2026-10-01', [[400, 20, 60, 12], [600, 40, 70, 18]], ['Pizza', [1100, 45, 130, 40]]),   // 2100
        giorno('2026-10-02', [[400, 20, 60, 12], [600, 40, 70, 18]], ['Piadina', [950, 40, 100, 35]]),   // 1950: va bene
        giorno('2026-10-03', [[400, 20, 60, 12], [600, 40, 70, 18]], ['Toast', [940, 40, 100, 35]])      // 1940: no
    ];

    const r = suggerisciChiusure(oggiColazionePranzo(), giorni, { obiettivi: OBIETTIVI });

    assert.deepEqual(r.map(x => x.giorno), ['2026-10-02']);
});

test('se nessun giorno arriva all\'obiettivo si propone quello che ci va più vicino', () => {
    const giorni = [
        giorno('2026-10-01', [[400, 20, 60, 12], [600, 40, 70, 18]], ['Pizza', [900, 45, 100, 30]]),     // 1900
        giorno('2026-10-02', [[400, 20, 60, 12], [600, 40, 70, 18]], ['Insalata', [500, 30, 30, 20]]),   // 1500
        giorno('2026-10-03', [[400, 20, 60, 12], [600, 40, 70, 18]], ['Toast', [700, 40, 80, 25]])       // 1700
    ];

    const r = suggerisciChiusure(oggiColazionePranzo(), giorni, { obiettivi: OBIETTIVI });

    assert.deepEqual(r.map(x => x.giorno), ['2026-10-01']);
});

test('i giorni uguali elencati sono solo quelli arrivati all\'obiettivo', () => {
    const g = (giorno, kcal) => ({ giorno, pasti: [
        pasto(giorno, '08:00', 'Colazione', 'Colazione', [400, 20, 60, 12]),
        pasto(giorno, '13:00', 'Pranzo', 'Pranzo', [600, 40, 70, 18]),
        pasto(giorno, '20:30', 'Cena', 'Pollo e patate', [kcal, 45, 80, 18])
    ] });
    const giorni = [g('2026-10-01', 1000), g('2026-10-02', 700), g('2026-10-03', 1050)];

    const r = suggerisciChiusure(oggiColazionePranzo(), giorni, { obiettivi: OBIETTIVI });

    assert.equal(r[0].giorno, '2026-10-03');
    assert.deepEqual(r[0].giorniUguali, ['2026-10-01']);
});

test('un solo consiglio di default', () => {
    const giorni = [];
    for (let i = 1; i <= 5; i++) {
        giorni.push(giorno(`2026-09-0${i}`, [[400, 20, 60, 12], [600 + i * 10, 40, 70, 18]], [`Cena ${"abcde"[i - 1]}`, [500, 40, 40, 15]]));
    }
    const r = suggerisciChiusure(oggiColazionePranzo(), giorni, { obiettivi: OBIETTIVI });
    assert.deepEqual(r.map(x => x.giorno), ['2026-09-05']);
});

test('pasti di oggi spezzati in più voci dello stesso tipo: conta il totale', () => {
    const oggi = [
        pasto(OGGI, '08:00', 'Colazione', 'Latte', [150, 10, 15, 5]),
        pasto(OGGI, '08:05', 'Colazione', 'Cereali', [250, 10, 45, 7]),
        pasto(OGGI, '13:00', 'Pranzo', 'Pasta al ragù', [600, 40, 70, 18])
    ];
    const r = suggerisciChiusure(oggi, [giorno('2026-10-03', [[400, 20, 60, 12], [600, 40, 70, 18]])], { obiettivi: OBIETTIVI });
    assert.equal(r.length, 1);
    assert.equal(r[0].distanza, 0);
    assert.deepEqual(r[0].pasti.map(p => p.pasto), ['Cena']);
});
