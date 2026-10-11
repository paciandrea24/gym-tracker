# Peso e calorie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nella pagina del Peso, il mantenimento stimato dai pasti e dalle pesate dell'utente, le calorie per +0,25 kg a settimana (con "Usa come obiettivo") e la tabella settimana per settimana.

**Architecture:** I calcoli sono puri in `public/js/services/massaLogic.js` (node:test). Il server espone i totali dei pasti per giorno italiano (`GET /api/giorni`). `homeUi.renderPeso` disegna le due sezioni nuove; `HomeView.showPeso` carica i totali una volta e salva l'obiettivo.

**Tech Stack:** JS vanilla (moduli ES con `?v=N`), Tailwind CDN, Express 5 + Mongoose, node:test, playwright-core + mongodb-memory-server per l'e2e.

**Spec:** `docs/superpowers/specs/2026-10-11-peso-calorie-design.md`

## Global Constraints

- 1 kg ≈ 7700 kcal; periodo di 28 giorni che finisce ieri; pronto con almeno 14 giorni con pasti e 14 con pesata; ritmo +0,25 kg a settimana.
- Si contano tutti i giorni con almeno un pasto (scelta dell'utente); oggi escluso dalle calorie.
- L'obiettivo cambia solo col pulsante, e solo le calorie (Proteine, Carboidrati, Grassi restano).
- Regole della spec del restyle: macro per esteso, numeri con la virgola, niente emoji, un solo pulsante nero per schermata (qui resta "Salva"), pulsante secondario bianco.
- Ogni file del client cambiato: versione degli import da `?v=38` a `?v=39` in tutto `public/`.
- La Home non cambia.

## Review Focus

- Pausa lunga nei dati (estate): il ripiego deve finire in un giorno con pasti, non nel vuoto dopo l'ultima pesata — test nel Task 1.
- Pesate rumorose (±0,5 kg da un giorno all'altro): la stima non deve saltare di centinaia di kcal — test nel Task 1.
- Pasti di oggi già segnati (anche in anticipo): non entrano nella stima né nella media della settimana — test nel Task 1.
- Pasto vicino a mezzanotte: va nel giorno italiano giusto anche col server in UTC — e2e nel Task 2.
- `/api/giorni` che non risponde (Render che si sveglia): la pagina del Peso si mostra lo stesso, senza le sezioni nuove — e2e nel Task 3.

---

### Task 1: Calcoli puri (`massaLogic.js`)

**Files:**
- Create: `public/js/services/massaLogic.js`
- Test: `test/massaLogic.test.js`

**Interfaces:**
- Consumes: `chiaveGiorno`, `lunediDi` da `components/format.js`; `unaPerGiorno` da `services/pesoLogic.js`.
- Produces:
  - `stimaMantenimento(giorni, pesate, oggi = new Date())` →
    `{ attuale: true, da, a, calorie, kgSettimana, mantenimento, perMassa }` |
    `{ attuale: false, mancano, da, a, calorie, kgSettimana, mantenimento, perMassa }` |
    `{ nessuna: true, mancano }`; `giorni`: `[{ giorno: 'YYYY-MM-DD', calorie, pasti }]`, `pesate`: `[{ weight, date }]`.
  - `settimane(giorni, pesate, oggi = new Date())` → `[{ lunedi, inCorso, calorie|null, giorniPasti, peso|null, differenza|null }]` dalla più recente.
  - costanti `KCAL_KG = 7700`, `KG_SETTIMANA = 0.25`.

- [ ] **Step 1: Test che falliscono** — `test/massaLogic.test.js`:

```js
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
```

- [ ] **Step 2: Lanciare e vedere fallire** — `cd backend && npm test` → FAIL (`massaLogic.js` non esiste).

- [ ] **Step 3: Implementare** — `public/js/services/massaLogic.js`:

```js
// public/js/services/massaLogic.js
// Calcoli puri di "Peso e calorie" (niente DOM né rete): mantenimento stimato dai pasti segnati e
// dalle pesate, calorie per la massa, settimana per settimana. Testati con node:test.

import { chiaveGiorno, lunediDi } from '../components/format.js?v=39';
import { unaPerGiorno } from './pesoLogic.js?v=39';

export const KCAL_KG = 7700;          // 1 kg di peso corporeo, circa
export const KG_SETTIMANA = 0.25;     // ritmo scelto dall'utente per mettere massa
const GIORNI_PERIODO = 28;
const GIORNI_MINIMI = 14;

const media = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

// 'YYYY-MM-DD' spostato di n giorni (a mezzogiorno: niente sorprese col cambio dell'ora)
function spostaGiorno(chiave, n) {
    const [a, m, g] = chiave.split('-').map(Number);
    return chiaveGiorno(new Date(a, m - 1, g + n, 12));
}

// Calorie dei giorni con almeno un pasto, oggi escluso (non è finito)
const mappaCalorie = (giorni, oggiK) => new Map((giorni || [])
    .filter(g => g.giorno < oggiK && Number(g.pasti) > 0)
    .map(g => [g.giorno, Number(g.calorie) || 0]));

// Peso di ogni giorno (l'ultima pesata del giorno)
const mappaPesi = (pesate) => new Map(unaPerGiorno(pesate)
    .map(l => [chiaveGiorno(l.date), parseFloat(String(l.weight).replace(',', '.')) || 0])
    .filter(([, kg]) => kg > 0));

// Pendenza della retta dei minimi quadrati (y al giorno)
function pendenza(punti) {
    const mx = media(punti.map(p => p.x)), my = media(punti.map(p => p.y));
    const num = punti.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
    const den = punti.reduce((s, p) => s + (p.x - mx) ** 2, 0);
    return den ? num / den : 0;
}

// I 28 giorni che finiscono in `fine` (compreso) e quanti giorni mancano perché sia pronto
function periodo(fine, kcal, pesi) {
    const giorni = Array.from({ length: GIORNI_PERIODO }, (_, i) => spostaGiorno(fine, i - GIORNI_PERIODO + 1));
    const conPasti = giorni.filter(g => kcal.has(g));
    const conPeso = giorni.map((g, x) => ({ g, x })).filter(({ g }) => pesi.has(g));
    const mancano = Math.max(0, GIORNI_MINIMI - conPasti.length, GIORNI_MINIMI - conPeso.length);
    return { da: giorni[0], a: fine, conPasti, conPeso, mancano };
}

function calcola(p, kcal, pesi) {
    const calorie = media(p.conPasti.map(g => kcal.get(g)));
    const kgGiorno = pendenza(p.conPeso.map(({ g, x }) => ({ x, y: pesi.get(g) })));
    const mantenimento = calorie - kgGiorno * KCAL_KG;
    return { da: p.da, a: p.a, calorie, kgSettimana: kgGiorno * 7, mantenimento, perMassa: mantenimento + KG_SETTIMANA * KCAL_KG / 7 };
}

// Mantenimento dalle ultime 4 settimane (fino a ieri). Se non sono pronte, l'ultimo periodo pronto
// che finisce in un giorno con pasti (dopo una pausa non si prende un periodo che finisce nel vuoto).
export function stimaMantenimento(giorni, pesate, oggi = new Date()) {
    const oggiK = chiaveGiorno(oggi);
    const kcal = mappaCalorie(giorni, oggiK);
    const pesi = mappaPesi(pesate);
    const ieri = spostaGiorno(oggiK, -1);
    const adesso = periodo(ieri, kcal, pesi);
    if (adesso.mancano === 0) return { attuale: true, ...calcola(adesso, kcal, pesi) };
    for (const fine of [...kcal.keys()].filter(g => g < ieri).sort().reverse()) {
        const p = periodo(fine, kcal, pesi);
        if (p.mancano === 0) return { attuale: false, mancano: adesso.mancano, ...calcola(p, kcal, pesi) };
    }
    return { nessuna: true, mancano: adesso.mancano };
}

// Settimana per settimana (dal lunedì), dalla più recente. Calorie: media dei giorni con pasti, oggi
// escluso; peso: media delle pesate, oggi compreso; differenza dal peso medio della settimana subito prima.
export function settimane(giorni, pesate, oggi = new Date()) {
    const oggiK = chiaveGiorno(oggi);
    const per = new Map();
    const di = (g) => {
        const l = lunediDi(g);
        if (!per.has(l)) per.set(l, { calorie: [], pesi: [] });
        return per.get(l);
    };
    for (const [g, v] of mappaCalorie(giorni, oggiK)) di(g).calorie.push(v);
    for (const [g, v] of mappaPesi(pesate)) di(g).pesi.push(v);
    const pesoMedio = (l) => per.get(l)?.pesi.length ? media(per.get(l).pesi) : null;
    const lunediOggi = lunediDi(oggiK);
    return [...per.keys()].sort().reverse().map(l => {
        const s = per.get(l), peso = pesoMedio(l), prima = pesoMedio(spostaGiorno(l, -7));
        return {
            lunedi: l, inCorso: l === lunediOggi,
            calorie: s.calorie.length ? media(s.calorie) : null, giorniPasti: s.calorie.length,
            peso, differenza: peso !== null && prima !== null ? peso - prima : null
        };
    });
}
```

- [ ] **Step 4: Lanciare e vedere passare** — `cd backend && npm test` → PASS (tutti).
- [ ] **Step 5: Commit** — `git add public/js/services/massaLogic.js test/massaLogic.test.js && git commit -m "peso e calorie: calcoli puri (mantenimento, massa, settimane)"`.

### Task 2: Totali per giorno sul server (`GET /api/giorni`)

**Files:**
- Modify: `backend/server.js` (dopo `GET /api/history`)
- Modify: `public/js/services/nutriService.js`
- Test: e2e `e2e-peso-calorie.mjs` (scratchpad), primo passo

**Interfaces:**
- Produces: `GET /api/giorni` → `[{ giorno, calorie, proteine, carboidrati, grassi, pasti }]` dal più vecchio; `nutriService.getGiorni()` (lancia se la risposta non è ok).

- [ ] **Step 1: e2e che fallisce** — pasti alle 23:30 e alle 00:30 italiane (server con `TZ=UTC`): `/api/giorni` li mette in due giorni diversi con le somme giuste.
- [ ] **Step 2: Lanciare** → FAIL (404).
- [ ] **Step 3: Implementare** — in `server.js`:

```js
// --- API: TOTALI PER GIORNO (Peso e calorie) ---
// Calorie e macro di ogni giorno italiano con almeno un pasto, dal più vecchio
app.get('/api/giorni', async (req, res) => {
    try {
        const righe = await Meal.aggregate([
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$data', timezone: 'Europe/Rome' } },
                calorie: { $sum: '$calorie' }, proteine: { $sum: '$proteine' },
                carboidrati: { $sum: '$carboidrati' }, grassi: { $sum: '$grassi' }, pasti: { $sum: 1 }
            } },
            { $sort: { _id: 1 } }
        ]);
        res.json(righe.map(({ _id, ...totali }) => ({ giorno: _id, ...totali })));
    } catch (e) { res.status(500).json([]); }
});
```

e in `nutriService.js`:

```js
// Totali dei pasti per giorno (Peso e calorie): [{ giorno, calorie, proteine, carboidrati, grassi, pasti }]
export async function getGiorni() {
    const res = await fetch('/api/giorni');
    if (!res.ok) throw new Error('Totali per giorno non disponibili');
    return await leggiJSON(res);
}
```

- [ ] **Step 4: e2e** → PASS. **Step 5: Commit** insieme al Task 3 (la rotta da sola non si vede).

### Task 3: Pagina del Peso

**Files:**
- Modify: `public/js/views/homeUi.js` (`renderPeso` e due funzioni nuove)
- Modify: `public/js/views/HomeView.js` (`showPeso`)
- Modify: tutti gli import `?v=38` → `?v=39`

**Interfaces:**
- Consumes: `stimaMantenimento`, `settimane`, `KG_SETTIMANA` (Task 1); `nutriService.getGiorni` (Task 2); `showToast` da `services/pantrySync.js`.
- Produces: `renderPeso(container, pesate, { totaliGiorno, obiettivo, onIndietro, onSalva, onUsaObiettivo })`.

- [ ] **Step 1: e2e che fallisce** — seed di 28 giorni fino a ieri (2500 kcal, +0,25 kg/settimana): "ultime 4 settimane", "circa 2230" e "circa 2500", "Dal … al …: 2500 kcal al giorno, peso +0,25 kg a settimana"; "Usa 2500 kcal come obiettivo" → toast "Obiettivo: 2500 kcal", `nutriGoals.calorie` 2500 con Proteine/Carbo/Grassi invariati, pulsante sparito ("È il tuo obiettivo di calorie."); "Settimana per settimana" con "In corso", 4 righe e "Mostra tutte (5)"; ripiego ("stima di <mese>", "Fra circa 9 giorni … dati di <mese di oggi>"); nessuna stima ("ne mancano circa 9"); `/api/giorni` interrotto → niente `#riquadro-massa` né "Settimana per settimana", la pagina c'è.
- [ ] **Step 2: Lanciare** → FAIL.
- [ ] **Step 3: Implementare** `homeUi.js`:

```js
import { stimaMantenimento, settimane, KG_SETTIMANA } from '../services/massaLogic.js?v=39';
// (format.js: aggiungere nomeSettimana e intero all'import esistente)

const dieci = (v) => Math.round(v / 10) * 10;
const daChiave = (g) => { const [a, m, d] = g.split('-').map(Number); return new Date(a, m - 1, d, 12); };
const giornoMese = (g) => daChiave(g).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
const meseDi = (g) => daChiave(g).toLocaleDateString('it-IT', { month: 'long' });
const kgVirgola = (v) => String(v).replace('.', ',');
// Ritmo del peso con due decimali ("+0,25"): sotto 0,02 kg a settimana è stabile
const ritmo = (kg) => Math.abs(kg) < 0.02 ? 'peso stabile' : `peso ${kg < 0 ? '−' : '+'}${kgVirgola(Math.round(Math.abs(kg) * 100) / 100)} kg a settimana`;
const CARTA = 'bg-white rounded-[20px] border border-gray-100 shadow-sm p-4';

// "Per mettere massa": mantenimento e calorie per +0,25 kg a settimana (calcoli in massaLogic.js)
function riquadroMassa(stima, obiettivo, oggiK) {
    const nota = (t) => `<p class="text-[12px] font-semibold text-gray-400 mt-2">${t}</p>`;
    const titolo = (destra) => `
        <div class="flex justify-between items-baseline gap-2">
            <h3 class="text-[15px] font-black text-gray-900">Per mettere massa</h3>
            ${destra ? `<span class="text-[11px] font-bold text-gray-400">${destra}</span>` : ''}
        </div>`;
    if (stima.nessuna) {
        return `<div id="riquadro-massa" class="${CARTA}">${titolo('')}${nota(`Servono 14 giorni di pasti e di pesate per stimare il tuo mantenimento: ne mancano circa ${stima.mancano}.`)}</div>`;
    }
    const massa = dieci(stima.perMassa);
    const colonna = (etichetta, colore, kcal) => `
        <div>
            <p class="text-[11px] font-bold ${colore}">${etichetta}</p>
            <p class="text-gray-900"><span class="text-[12px] font-bold text-gray-400">circa</span> <span class="text-2xl font-black">${kcal}</span> <span class="text-[12px] font-bold text-gray-400">kcal</span></p>
        </div>`;
    return `
        <div id="riquadro-massa" class="${CARTA}">
            ${titolo(stima.attuale ? 'ultime 4 settimane' : `stima di ${meseDi(stima.a)}`)}
            <div class="grid grid-cols-2 gap-3 mt-3">
                ${colonna('Mantenimento', 'text-gray-400', dieci(stima.mantenimento))}
                ${colonna(`+${kgVirgola(KG_SETTIMANA)} kg a settimana`, 'text-indigo-600', massa)}
            </div>
            ${nota(`Dal ${giornoMese(stima.da)} al ${giornoMese(stima.a)}: ${intero(stima.calorie)} kcal al giorno, ${ritmo(stima.kgSettimana)}.`)}
            ${massa !== obiettivo ? `
                <button id="usa-obiettivo-btn" data-kcal="${massa}" class="mt-3 w-full bg-white border border-gray-200 text-gray-800 font-bold text-[14px] py-3 rounded-xl active:scale-95 transition-transform">Usa ${massa} kcal come obiettivo</button>
                ${nota(`Il tuo obiettivo adesso è ${obiettivo} kcal.`)}` : nota('È il tuo obiettivo di calorie.')}
            ${stima.attuale ? '' : nota(`Fra circa ${stima.mancano} giorni di pasti e pesate la stima si aggiorna con i dati di ${meseDi(oggiK)}.`)}
        </div>`;
}

// "Settimana per settimana": calorie medie e peso medio, le prime 4 e "Mostra tutte"
function sezioneSettimane(righe) {
    if (!righe.length) return '';
    const MOSTRATE = 4;
    return `
        <div>
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Settimana per settimana</h3>
            <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">
                ${righe.map((s, i) => `
                    <div class="riga-settimana py-3 flex justify-between items-baseline gap-2 ${i >= MOSTRATE ? 'hidden' : ''}">
                        <div class="min-w-0">
                            <p class="font-bold text-gray-800">${nomeSettimana(s.lunedi)}</p>
                            <p class="text-[12px] font-semibold text-gray-400">${[s.inCorso ? 'In corso' : '', s.calorie !== null ? `${intero(s.calorie)} kcal al giorno` : 'Nessun pasto segnato'].filter(Boolean).join(' · ')}</p>
                        </div>
                        ${s.peso !== null ? `<p class="whitespace-nowrap"><b class="font-black text-gray-900">${decimaleKg(s.peso)} kg</b>${s.differenza !== null && Math.abs(s.differenza) >= 0.05 ? ` <span class="text-[12px] font-bold text-gray-400 ml-1">${segno(s.differenza)}</span>` : ''}</p>` : ''}
                    </div>`).join('')}
                ${righe.length > MOSTRATE ? `<button id="mostra-settimane" class="w-full py-3 text-center text-[13px] font-bold text-indigo-600">Mostra tutte (${righe.length})</button>` : ''}
            </div>
        </div>`;
}
```

In `renderPeso`: firma `{ totaliGiorno, obiettivo, onIndietro, onSalva, onUsaObiettivo }`; `const oggiK = chiaveGiorno(new Date());` e `const stima = totaliGiorno ? stimaMantenimento(totaliGiorno, pesate) : null;`; dopo il riquadro "Peso di oggi" `${stima ? riquadroMassa(stima, Number(obiettivo), oggiK) : ''}`; dopo il grafico (dentro il blocco con le pesate) `${totaliGiorno ? sezioneSettimane(settimane(totaliGiorno, pesate)) : ''}`; eventi:

```js
document.getElementById('usa-obiettivo-btn')?.addEventListener('click', (e) => onUsaObiettivo(Number(e.currentTarget.dataset.kcal)));
document.getElementById('mostra-settimane')?.addEventListener('click', (e) => {
    container.querySelectorAll('.riga-settimana.hidden').forEach(r => r.classList.remove('hidden'));
    e.currentTarget.remove();
});
```

`HomeView.showPeso`:

```js
// Totali dei pasti per giorno: si caricano una volta; se non rispondono la pagina si mostra senza
// "Per mettere massa" e "Settimana per settimana"
async showPeso() {
    const vista = this.container.dataset.vista;
    if (this.totaliGiorno === undefined) {
        this.container.innerHTML = `<div class="flex items-center justify-center min-h-screen"><p class="text-gray-500 font-bold animate-pulse">Caricamento...</p></div>`;
        this.totaliGiorno = await nutriService.getGiorni().catch(() => null);
        if (this.superata(vista)) return;
    }
    homeUi.renderPeso(this.container, this.dati.pesate, {
        totaliGiorno: this.totaliGiorno,
        obiettivo: nutriService.getNutritionGoals().calorie,
        onIndietro: () => this.render(),
        onUsaObiettivo: (kcal) => {
            nutriService.saveNutritionGoals({ ...nutriService.getNutritionGoals(), calorie: kcal });
            showToast(`Obiettivo: ${kcal} kcal`);
            this.showPeso();
        },
        onSalva: /* come prima */
    });
}
```

- [ ] **Step 4: e2e** → PASS; prove esistenti (`e2e-home`, `e2e-mezzanotte`) → PASS; `npm test` → PASS.
- [ ] **Step 5: Versione** `?v=38` → `?v=39` in `public/`; **Commit** (rotta + pagina + versione) e **push** su `main`.

### Task 4: Spec e memoria

- [ ] Nella spec del restyle, sezione Home/Peso: rimando a `2026-10-11-peso-calorie-design.md`. Commit e push.
