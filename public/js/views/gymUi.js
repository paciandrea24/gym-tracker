// public/js/views/gymUi.js
// Schermate della palestra (restyle 4/6): schede, scheda con storico, modulo esercizio,
// allenamento in corso con superserie, esercizio con drop set, superserie a giri, progressi.
// Solo disegno ed eventi: i dati e i salvataggi li gestisce GymView.

import { icona } from '../components/icons.js?v=37';
import { apriFoglio } from '../components/sheet.js?v=37';
import * as modal from '../components/modal.js?v=37';
import { decimale, intero, chiaveGiorno, lunediDi, nomeGiorno, nomeSettimana } from '../components/format.js?v=37';
import { testoSerie, volumeSerie, passoPeso, giriDelBlocco, recuperoBlocco, testoMigliore } from '../services/gymLogic.js?v=37';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const minuscola = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const numero = (v) => parseFloat(String(v ?? '').replace(',', '.')) || 0;
const minuti = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const BTN_PRINCIPALE = 'w-full bg-gray-900 text-white font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform';
const BTN_SECONDARIO = 'w-full bg-white border border-gray-200 text-gray-800 font-bold text-[15px] py-3.5 rounded-2xl shadow-sm active:scale-95 transition-transform';
const ETICHETTA = 'text-xs font-bold text-gray-400 uppercase tracking-widest';

function intestazione(titolo, { idIndietro = null, sopra = '', sotto = '', destra = '' } = {}) {
    return `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center justify-between gap-2">
            <div class="flex items-center min-w-0">
                ${idIndietro ? `<button id="${idIndietro}" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2" aria-label="Indietro">${icona.indietro()}</button>` : ''}
                <div class="min-w-0">
                    ${sopra ? `<p class="text-[12px] font-bold text-gray-400">${sopra}</p>` : ''}
                    <h1 class="text-xl font-bold text-gray-900 truncate leading-tight">${titolo}</h1>
                    ${sotto ? `<p class="text-[12px] font-semibold text-gray-400">${sotto}</p>` : ''}
                </div>
            </div>
            ${destra}
        </header>`;
}

// "4 × 8 · 60 kg + bilanciere · recupero 2:00"
export function riassuntoEsercizio(ex) {
    if (ex.type === 'cardio') return `${ex.targetReps} minuti · cardio`;
    const parti = [`${ex.targetSets} × ${ex.targetReps}`];
    if (ex.type === 'corpo-libero') parti.push('corpo libero');
    else if (numero(ex.baseKg) > 0) parti.push(`${decimale(ex.baseKg)} kg${Number(ex.weightMultiplier) === 2 ? ' per lato' : ''}${numero(ex.barbellWeight) > 0 ? ' + bilanciere' : ''}`);
    parti.push(`recupero ${minuti(Number(ex.restSeconds) || 90)}`);
    return parti.join(' · ');
}

const chevron = () => icona.avanti('w-4 h-4 text-gray-300 flex-shrink-0');

// ─── SCHEDE ────────────────────────────────────────────────────────────────
// ultimi: { [routineId]: endTime dell'ultimo allenamento }
export function renderSchede(container, routines, ultimi, { onApri, onNuova }) {
    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-5 sticky top-0 z-10">
            <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Le mie schede</h1>
        </header>
        <main class="p-4 space-y-4 pb-24 safe-pb bg-gray-50">
            ${routines.length === 0 ? `
                <div class="bg-white rounded-[20px] border border-gray-100 p-6 text-center">
                    <p class="font-bold text-gray-700">Nessuna scheda</p>
                    <p class="text-[14px] font-medium text-gray-500 mt-1">Crea la tua prima scheda e aggiungi gli esercizi.</p>
                </div>
            ` : `
                <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">
                    ${routines.map(r => {
                        const n = r.exercises.length;
                        const ultimo = ultimi[r.id];
                        return `
                            <button data-id="${esc(r.id)}" class="riga-scheda w-full flex items-center gap-2 py-3.5 text-left active:opacity-60">
                                <div class="flex-1 min-w-0">
                                    <p class="text-[16px] font-black text-gray-900">${esc(r.name)}</p>
                                    <p class="text-[12px] font-semibold text-gray-400">${n} ${n === 1 ? 'esercizio' : 'esercizi'} · ${ultimo ? `ultimo allenamento ${minuscola(nomeGiorno(chiaveGiorno(ultimo)))}` : 'mai fatta'}</p>
                                </div>
                                ${chevron()}
                            </button>`;
                    }).join('')}
                </div>
            `}
            <button id="create-routine-btn" class="${routines.length ? BTN_SECONDARIO : BTN_PRINCIPALE}">+ Nuova scheda</button>
        </main>
    `;
    container.querySelectorAll('.riga-scheda').forEach(b => b.addEventListener('click', () => onApri(b.dataset.id)));
    document.getElementById('create-routine-btn').addEventListener('click', onNuova);
}

// ─── SCHEDA (tab Scheda e Storico) ─────────────────────────────────────────
export function renderScheda(container, routine, history, tab, { onTab, onInizia, onAggiungi, onEsercizio, onMenu, onIndietro, onScarica }) {
    const esercizi = routine.exercises;
    const contenuto = tab === 'scheda' ? (esercizi.length ? `
        <button id="start-session-btn" class="${BTN_PRINCIPALE} !text-[16px] flex justify-center items-center gap-2">${icona.play()} Inizia allenamento</button>
        <div>
            <div class="flex justify-between items-end px-1 mb-2">
                <h3 class="${ETICHETTA}">Esercizi</h3>
                <button id="add-ex-btn" class="text-[13px] font-bold text-indigo-600">+ Aggiungi</button>
            </div>
            <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">
                ${esercizi.map(ex => `
                    <button data-id="${esc(ex.id)}" class="riga-esercizio w-full flex items-center gap-2 py-3 text-left active:opacity-60">
                        <div class="flex-1 min-w-0">
                            <p class="text-[15px] font-bold text-gray-800">${esc(ex.name)}</p>
                            <p class="text-[12px] font-semibold text-gray-400">${riassuntoEsercizio(ex)}</p>
                        </div>
                        ${chevron()}
                    </button>`).join('')}
            </div>
        </div>
    ` : `
        <div class="bg-white rounded-[20px] border border-gray-100 p-6 text-center">
            <p class="font-bold text-gray-700">Questa scheda è vuota</p>
            <p class="text-[14px] font-medium text-gray-500 mt-1">Aggiungi gli esercizi che fai, nell'ordine in cui li fai.</p>
        </div>
        <button id="add-ex-btn" class="${BTN_PRINCIPALE}">Aggiungi un esercizio</button>
    `) : storicoScheda(routine, history);

    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10">
            <div class="flex items-center justify-between gap-2 mb-4">
                <div class="flex items-center min-w-0">
                    <button id="back-list-btn" class="mr-2 text-gray-500 hover:text-gray-900 p-2 -ml-2" aria-label="Indietro">${icona.indietro()}</button>
                    <h1 class="text-2xl font-bold text-gray-900 tracking-tight truncate">${esc(routine.name)}</h1>
                </div>
                <button id="menu-scheda-btn" class="p-2 text-gray-500 bg-gray-100 rounded-full active:scale-95" aria-label="Altre azioni">${icona.puntini()}</button>
            </div>
            <div class="flex bg-gray-100 p-1 rounded-xl">
                <button id="tab-scheda" class="flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === 'scheda' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}">Scheda</button>
                <button id="tab-storico" class="flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === 'storico' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}">Storico</button>
            </div>
        </header>
        <main class="p-4 space-y-4 pb-24 safe-pb bg-gray-50">${contenuto}</main>
    `;

    const $ = (id) => document.getElementById(id);
    $('back-list-btn').addEventListener('click', onIndietro);
    $('menu-scheda-btn').addEventListener('click', onMenu);
    $('tab-scheda').addEventListener('click', () => onTab('scheda'));
    $('tab-storico').addEventListener('click', () => onTab('storico'));
    $('start-session-btn')?.addEventListener('click', onInizia);
    $('add-ex-btn')?.addEventListener('click', onAggiungi);
    $('export-csv-btn')?.addEventListener('click', onScarica);
    container.querySelectorAll('.riga-esercizio').forEach(b => b.addEventListener('click', () => onEsercizio(b.dataset.id)));
}

// Serie di un esercizio in una riga, con i drop in arancione: "65 × 8 → 50 × 5 · 65 × 8"
function serieInRiga(sets, tipo) {
    return sets.map(set => {
        const principale = esc(testoSerie({ ...set, drop: [] }, tipo));
        const drop = (set.drop || []).map(d => ` → ${esc(testoSerie(d, tipo))}`).join('');
        return drop ? `${principale}<span class="text-orange-600">${drop}</span>` : principale;
    }).join(' · ');
}

// Volume di un allenamento con il peso reale (per lato e bilanciere presi dalla scheda)
function volumeAllenamento(session, routine) {
    let totale = 0;
    for (const ex of session.exercises || []) {
        const def = routine.exercises.find(e => String(e.id) === String(ex.exerciseId)) || { type: ex.type };
        for (const set of ex.sets || []) totale += volumeSerie(set, { ...def, type: ex.type || def.type });
    }
    return totale;
}

function storicoScheda(routine, history) {
    const sessioni = [...history].sort((a, b) => b.endTime - a.endTime);
    if (sessioni.length === 0) {
        return `<div class="bg-white rounded-[20px] border border-gray-100 p-6 text-center text-gray-500 font-medium">Nessun allenamento salvato per questa scheda.</div>`;
    }
    const settimane = new Map();
    for (const s of sessioni) {
        const lunedi = lunediDi(chiaveGiorno(s.endTime));
        if (!settimane.has(lunedi)) settimane.set(lunedi, []);
        settimane.get(lunedi).push(s);
    }

    const rigaEsercizio = (ex) => {
        const def = routine.exercises.find(e => String(e.id) === String(ex.exerciseId)) || {};
        return `
            <div>
                <p class="font-bold text-gray-800">${esc(ex.name)}${Number(def.weightMultiplier) === 2 ? ' <span class="font-semibold text-gray-400">· per lato</span>' : ''}</p>
                <p class="font-semibold text-gray-500">${serieInRiga(ex.sets || [], ex.type)}</p>
            </div>`;
    };
    // Esercizi di fila con lo stesso segno di superserie vanno nello stesso blocco
    const corpo = (session) => {
        const blocchi = [];
        for (const ex of session.exercises || []) {
            const ultimo = blocchi[blocchi.length - 1];
            if (ex.superserie && ultimo && ultimo.chiave === ex.superserie) ultimo.esercizi.push(ex);
            else blocchi.push({ chiave: ex.superserie || null, esercizi: [ex] });
        }
        return blocchi.map(b => b.chiave && b.esercizi.length > 1 ? `
            <div class="border-l-2 border-indigo-300 pl-3 space-y-2">
                <p class="text-[11px] font-black text-indigo-600">Superserie</p>
                ${b.esercizi.map(rigaEsercizio).join('')}
            </div>` : b.esercizi.map(rigaEsercizio).join('')).join('');
    };

    return `
        ${[...settimane].map(([lunedi, lista]) => {
            const media = lista.reduce((s, x) => s + volumeAllenamento(x, routine), 0) / lista.length;
            return `
                <div class="space-y-2">
                    <div class="px-1">
                        <h2 class="text-[15px] font-black text-gray-900">${nomeSettimana(lunedi)}</h2>
                        <p class="text-[12px] font-semibold text-gray-400">${lista.length} ${lista.length === 1 ? 'allenamento' : 'allenamenti'} · volume medio ${intero(media)} kg</p>
                    </div>
                    ${lista.map(s => `
                        <details class="allenamento-storico bg-white rounded-[20px] border border-gray-100 group">
                            <summary class="p-4 flex justify-between items-center cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                                <span class="text-[15px] font-black text-gray-900">${nomeGiorno(chiaveGiorno(s.endTime))}</span>
                                <span class="text-gray-300 transition-transform group-open:rotate-90">${chevron()}</span>
                            </summary>
                            <div class="px-4 pb-4 text-[13px] space-y-2">${corpo(s)}</div>
                        </details>`).join('')}
                </div>`;
        }).join('')}
        <button id="export-csv-btn" class="${BTN_SECONDARIO} !text-[14px] !py-3 flex justify-center items-center gap-2">${icona.scarica('w-5 h-5 text-gray-600')} Scarica i dati (CSV)</button>
    `;
}

// ─── FOGLI ─────────────────────────────────────────────────────────────────
export function apriFoglioEsercizio(ex, { onProgressi, onModifica }) {
    const { box, chiudi, intestazione: titolo, collegaChiudi } = apriFoglio({ id: 'foglio-esercizio' });
    box.innerHTML = `
        ${titolo(esc(ex.name), riassuntoEsercizio(ex))}
        <div class="space-y-2">
            <button id="progressi-esercizio-btn" class="${BTN_SECONDARIO} flex justify-center items-center gap-2">${icona.grafico('w-5 h-5 text-indigo-500')} Vedi i progressi</button>
            <button id="modifica-esercizio-btn" class="${BTN_SECONDARIO} flex justify-center items-center gap-2">${icona.matita('w-5 h-5 text-gray-600')} Modifica</button>
        </div>`;
    collegaChiudi();
    box.querySelector('#progressi-esercizio-btn').addEventListener('click', () => { chiudi(); onProgressi(); });
    box.querySelector('#modifica-esercizio-btn').addEventListener('click', () => { chiudi(); onModifica(); });
}

export function apriMenuScheda(routine, { onRinomina, onElimina }) {
    const { box, chiudi, intestazione: titolo, collegaChiudi } = apriFoglio({ id: 'foglio-scheda' });
    box.innerHTML = `
        ${titolo(esc(routine.name))}
        <button id="rinomina-scheda-btn" class="${BTN_SECONDARIO}">Rinomina</button>
        <button id="elimina-scheda-btn" class="w-full text-red-600 font-bold text-sm py-3 mt-2">Elimina scheda</button>`;
    collegaChiudi();
    box.querySelector('#rinomina-scheda-btn').addEventListener('click', () => { chiudi(); onRinomina(); });
    box.querySelector('#elimina-scheda-btn').addEventListener('click', () => { chiudi(); onElimina(); });
}

// ─── MODULO ESERCIZIO (nuovo e modifica) ───────────────────────────────────
const RECUPERI = [45, 60, 90, 120, 150, 180];

export function renderModuloEsercizio(container, ex, { onSalva, onAnnulla, onElimina }) {
    const stato = {
        tipo: ex?.type || 'sala-pesi',
        peso: Number(ex?.weightMultiplier) === 2 ? 2 : 1,
        sec: Number(ex?.restSeconds) || 90
    };
    const recuperi = RECUPERI.includes(stato.sec) || !ex ? RECUPERI : [...RECUPERI, stato.sec].sort((a, b) => a - b);
    const campo = (id, etichetta, valore, attr = '') => `
        <div class="min-w-0" ${attr}>
            <label for="${id}" class="block text-[11px] font-semibold text-gray-400 uppercase mb-1">${etichetta}</label>
            <input id="${id}" type="text" inputmode="decimal" value="${valore ?? ''}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-gray-900">
        </div>`;
    const segmento = (gruppo, voci, scelto) => `
        <div class="flex bg-gray-100 p-1 rounded-xl">
            ${voci.map(([valore, testo]) => `<button type="button" data-${gruppo}="${valore}" class="seg-${gruppo} flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${String(valore) === String(scelto) ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}">${testo}</button>`).join('')}
        </div>`;

    container.innerHTML = `
        ${intestazione(ex ? esc(ex.name) : 'Nuovo esercizio', { idIndietro: 'cancel-btn' })}
        <main class="p-4 space-y-4 pb-24 safe-pb bg-gray-50">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div>
                    <label for="ex-name" class="block text-xs font-semibold text-gray-400 uppercase mb-2">Nome</label>
                    <input id="ex-name" type="text" value="${esc(ex?.name || '')}" placeholder="es. Panca piana" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-gray-900">
                </div>
                <div>
                    <p class="text-xs font-semibold text-gray-400 uppercase mb-2">Tipo</p>
                    ${segmento('tipo', [['sala-pesi', 'Pesi'], ['corpo-libero', 'Corpo libero'], ['cardio', 'Cardio']], stato.tipo)}
                </div>
                <div class="grid grid-cols-3 gap-2">
                    ${campo('ex-sets', 'Serie', ex?.targetSets ?? 3, 'id="box-serie"')}
                    ${campo('ex-reps', '<span id="label-reps">Ripetizioni</span>', ex?.targetReps ?? 10)}
                    ${campo('ex-kg', 'Peso iniziale', ex && numero(ex.baseKg) > 0 ? decimale(ex.baseKg) : '', 'id="box-peso"')}
                </div>
                <div id="box-per-lato">
                    <p class="text-xs font-semibold text-gray-400 uppercase mb-2">Peso segnato</p>
                    ${segmento('peso', [[1, 'Totale'], [2, 'Per lato']], stato.peso)}
                    <p class="text-[12px] font-medium text-gray-400 mt-1">Per lato: manubri o due cavi. Nei grafici e nel volume conta il doppio.</p>
                </div>
                <div id="box-bilanciere">
                    <label for="ex-barbell" class="block text-xs font-semibold text-gray-400 uppercase mb-2">Bilanciere o attrezzo da aggiungere (kg)</label>
                    <input id="ex-barbell" type="text" inputmode="decimal" value="${ex && numero(ex.barbellWeight) > 0 ? decimale(ex.barbellWeight) : '0'}" class="w-28 bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900">
                    <p class="text-[12px] font-medium text-gray-400 mt-1">Si somma nei grafici (es. 20 per il bilanciere olimpico).</p>
                </div>
                <div id="box-recupero">
                    <p class="text-xs font-semibold text-gray-400 uppercase mb-2">Recupero</p>
                    <div class="grid grid-cols-3 gap-1.5">
                        ${recuperi.map(sec => `<button type="button" data-sec="${sec}" class="chip-sec py-2 rounded-xl text-[13px] font-bold border transition-colors ${sec === stato.sec ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-gray-200'}">${minuti(sec)}</button>`).join('')}
                    </div>
                </div>
            </div>
            <button id="save-ex-btn" class="${BTN_PRINCIPALE}">Salva</button>
            ${ex ? `<button id="delete-ex-btn" class="w-full text-red-600 font-bold text-sm py-2">Elimina esercizio</button>` : ''}
        </main>
    `;

    const $ = (id) => document.getElementById(id);
    const aggiornaVisibili = () => {
        const pesi = stato.tipo === 'sala-pesi';
        const cardio = stato.tipo === 'cardio';
        $('box-serie').classList.toggle('invisible', cardio);
        $('box-peso').classList.toggle('invisible', !pesi);
        $('box-per-lato').classList.toggle('hidden', !pesi);
        $('box-bilanciere').classList.toggle('hidden', !pesi);
        $('box-recupero').classList.toggle('hidden', cardio);
        $('label-reps').textContent = cardio ? 'Minuti' : 'Ripetizioni';
    };
    const segliSegmento = (gruppo, valore) => container.querySelectorAll(`.seg-${gruppo}`).forEach(b => {
        const attivo = b.dataset[gruppo] === String(valore);
        b.className = `seg-${gruppo} flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${attivo ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`;
    });
    container.querySelectorAll('.seg-tipo').forEach(b => b.addEventListener('click', () => { stato.tipo = b.dataset.tipo; segliSegmento('tipo', stato.tipo); aggiornaVisibili(); }));
    container.querySelectorAll('.seg-peso').forEach(b => b.addEventListener('click', () => { stato.peso = Number(b.dataset.peso); segliSegmento('peso', stato.peso); }));
    container.querySelectorAll('.chip-sec').forEach(b => b.addEventListener('click', () => {
        stato.sec = Number(b.dataset.sec);
        container.querySelectorAll('.chip-sec').forEach(c => {
            const attivo = Number(c.dataset.sec) === stato.sec;
            c.className = `chip-sec py-2 rounded-xl text-[13px] font-bold border transition-colors ${attivo ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-gray-200'}`;
        });
    }));
    aggiornaVisibili();

    $('cancel-btn').addEventListener('click', onAnnulla);
    $('delete-ex-btn')?.addEventListener('click', async () => {
        const ok = await modal.showModal({ type: 'confirm', title: 'Elimina esercizio', message: `Eliminare "${ex.name}" dalla scheda? Lo storico resta.`, confirmText: 'Elimina', cancelText: 'Annulla', pericolo: true });
        if (ok) onElimina();
    });
    $('save-ex-btn').addEventListener('click', () => {
        const name = $('ex-name').value.trim();
        const pesi = stato.tipo === 'sala-pesi';
        const cardio = stato.tipo === 'cardio';
        const sets = cardio ? 1 : Math.round(numero($('ex-sets').value));
        const reps = Math.round(numero($('ex-reps').value));
        if (!name || !(sets > 0) || !(reps > 0)) {
            return modal.showModal({ type: 'error', title: 'Manca qualcosa', message: cardio ? 'Scrivi il nome e i minuti.' : 'Scrivi il nome, le serie e le ripetizioni.' });
        }
        onSalva({
            id: ex?.id || 'ex-' + Date.now(),
            name, type: stato.tipo, targetSets: sets, targetReps: reps,
            baseKg: pesi ? numero($('ex-kg').value) : 0,
            restSeconds: cardio ? 0 : stato.sec,
            weightMultiplier: pesi ? stato.peso : 1,
            barbellWeight: pesi ? numero($('ex-barbell').value) : 0
        });
    });
}

// ─── ALLENAMENTO IN CORSO ──────────────────────────────────────────────────
// elementi: da elementiDaFare(session) — esercizi singoli e blocchi superserie
const riassuntoBreve = (ex) => riassuntoEsercizio(ex).replace(/ · recupero \d+:\d+$/, '').replace(' + bilanciere', '');

export function renderAllenamento(container, session, routine, elementi, { onApri, onApriFatto, onUnisci, onSepara, onTermina }) {
    const trova = (id) => routine.exercises.find(e => String(e.id) === String(id));
    const cardEsercizio = (ex) => `
        <div class="card-da-fare bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-1 p-2 transition" data-id="${esc(ex.id)}">
            <span class="maniglia p-2 text-gray-300 cursor-grab" style="touch-action: none" aria-label="Trascina per fare la superserie">${icona.maniglia()}</span>
            <button class="apri-esercizio flex-1 min-w-0 flex items-center gap-2 text-left py-2 pr-2" data-id="${esc(ex.id)}">
                <span class="flex-1 min-w-0">
                    <span class="block font-bold text-gray-900">${esc(ex.name)}</span>
                    <span class="block text-[12px] font-semibold text-gray-400">${riassuntoBreve(ex)}</span>
                    <span class="testo-rilascio hidden text-[12px] font-bold text-indigo-600">Rilascia qui per fare la superserie</span>
                </span>
                ${chevron()}
            </button>
        </div>`;
    const blocco = (ids) => `
        <div class="blocco-superserie bg-white rounded-2xl border border-gray-100 shadow-sm p-4 transition" data-id="${esc(ids[0])}">
            <div class="flex justify-between items-center mb-2">
                <span class="text-[11px] font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">Superserie</span>
                <button class="separa-btn text-[13px] font-bold text-indigo-600" data-id="${esc(ids[0])}">Separa</button>
            </div>
            <button class="apri-blocco w-full flex items-center gap-3 text-left" data-ids="${ids.map(esc).join(',')}">
                <span class="w-1 self-stretch rounded-full bg-indigo-400"></span>
                <span class="flex-1 min-w-0 space-y-2">
                    ${ids.map(trova).filter(Boolean).map(ex => `<span class="block"><span class="block font-bold text-gray-900">${esc(ex.name)}</span><span class="block text-[12px] font-semibold text-gray-400">${riassuntoBreve(ex)}</span></span>`).join('')}
                </span>
                ${chevron()}
            </button>
            <span class="testo-rilascio hidden text-[12px] font-bold text-indigo-600 mt-2">Rilascia qui per aggiungerlo alla superserie</span>
        </div>`;
    const fatti = session.completed || [];
    const rigaFatto = (c) => {
        const sets = c.sets || [];
        const migliore = sets.reduce((m, x) => (!m || numero(x.kg) > numero(m.kg)) ? x : m, null);
        const riassunto = migliore ? `${sets.length} serie · ${testoSerie({ ...migliore, drop: [] }, c.type)}` : 'nessuna serie';
        return `
            <button class="riga-fatto w-full flex items-center gap-3 py-3 text-left active:opacity-60" data-id="${esc(c.exerciseId)}">
                <span class="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">${icona.spunta()}</span>
                <span class="flex-1 min-w-0"><span class="block font-bold text-gray-800">${esc(c.name)}</span><span class="block text-[12px] font-semibold text-gray-400">${riassunto}</span></span>
                <span class="text-[13px] font-bold text-indigo-600">Modifica</span>
            </button>`;
    };

    container.innerHTML = `
        ${intestazione('Allenamento in corso', { sopra: esc(routine.name), sotto: elementi.length ? `${session.todo.length} da fare` : 'Tutto fatto' })}
        <main class="p-4 space-y-3 pb-24 safe-pb bg-gray-50">
            ${elementi.length >= 2 ? `<p class="text-[12px] font-semibold text-gray-400 px-1 flex items-center gap-1.5">${icona.maniglia('w-4 h-4')} Tieni premuto un esercizio e trascinalo su un altro per farli in superserie</p>` : ''}
            ${elementi.length ? `
                <h3 class="${ETICHETTA} px-1">Da fare</h3>
                ${elementi.map(el => el.tipo === 'superserie' ? blocco(el.ids) : (trova(el.id) ? cardEsercizio(trova(el.id)) : '')).join('')}
            ` : `
                <div class="bg-white rounded-[20px] border border-gray-100 p-5 text-center">
                    <p class="font-black text-gray-900">Hai fatto tutto</p>
                    <p class="text-[14px] font-medium text-gray-500 mt-1">Salva l'allenamento per ritrovarlo nello storico.</p>
                </div>
            `}
            ${fatti.length ? `
                <h3 class="${ETICHETTA} px-1 pt-2">Fatti</h3>
                <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">${fatti.map(rigaFatto).join('')}</div>
            ` : ''}
            <button id="end-session-btn" class="${elementi.length ? BTN_SECONDARIO : BTN_PRINCIPALE}">${elementi.length ? 'Termina allenamento' : 'Salva allenamento'}</button>
        </main>
    `;

    container.querySelectorAll('.apri-esercizio').forEach(b => b.addEventListener('click', () => onApri({ tipo: 'esercizio', id: b.dataset.id })));
    container.querySelectorAll('.apri-blocco').forEach(b => b.addEventListener('click', () => onApri({ tipo: 'superserie', ids: b.dataset.ids.split(',') })));
    container.querySelectorAll('.separa-btn').forEach(b => b.addEventListener('click', () => onSepara(b.dataset.id)));
    container.querySelectorAll('.riga-fatto').forEach(b => b.addEventListener('click', () => onApriFatto(b.dataset.id)));
    document.getElementById('end-session-btn').addEventListener('click', onTermina);
    attivaTrascinamento(container, onUnisci);
}

// Trascinamento per fare le superserie: un clone segue il dito, la card o il blocco sotto si
// evidenzia, al rilascio sopra un altro elemento nasce la superserie.
// - Dito (Touch Events, come su iPhone): tenendo premuta la card si stacca; dalla maniglia parte
//   subito. Se il dito si muove prima del tocco lungo è uno scorrimento della pagina. Mentre si
//   trascina touchmove blocca lo scorrimento e touchend il click (che aprirebbe l'esercizio).
// - Mouse (Pointer Events): dalla maniglia.
const TOCCO_LUNGO_MS = 400;
const TOLLERANZA_DITO_PX = 10;

function attivaTrascinamento(container, onUnisci) {
    const evidenzia = (el, attivo) => {
        el.classList.toggle('ring-2', attivo);
        el.classList.toggle('ring-indigo-400', attivo);
        el.classList.toggle('bg-indigo-50', attivo);
        el.querySelector('.testo-rilascio')?.classList.toggle('hidden', !attivo);
    };
    // Stacca la card nel punto (x, y): restituisce muovi(x, y) e fine(annullato)
    const stacca = (card, x, y) => {
        const r = card.getBoundingClientRect();
        const dx = x - r.left;
        const dy = y - r.top;
        const clone = card.cloneNode(true);
        Object.assign(clone.style, {
            position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, margin: '0',
            zIndex: '9999', pointerEvents: 'none', transform: 'rotate(-2deg)', boxShadow: '0 20px 40px rgba(0,0,0,0.18)'
        });
        document.body.appendChild(clone);
        card.style.opacity = '0.4';
        let bersaglio = null;
        return {
            muovi(px, py) {
                clone.style.left = `${px - dx}px`;
                clone.style.top = `${py - dy}px`;
                const sotto = document.elementFromPoint(px, py)?.closest('.card-da-fare, .blocco-superserie');
                const nuovo = sotto && sotto !== card && container.contains(sotto) ? sotto : null;
                if (nuovo === bersaglio) return;
                if (bersaglio) evidenzia(bersaglio, false);
                if (nuovo) evidenzia(nuovo, true);
                bersaglio = nuovo;
            },
            fine(annullato) {
                clone.remove();
                card.style.opacity = '';
                if (bersaglio) evidenzia(bersaglio, false);
                if (!annullato && bersaglio) onUnisci(card.dataset.id, bersaglio.dataset.id);
            }
        };
    };

    container.querySelectorAll('.card-da-fare').forEach(card => {
        const maniglia = card.querySelector('.maniglia');

        // Dito
        let attesa = null;
        let partenza = null;
        let presa = null;
        const smettiDiAspettare = () => { clearTimeout(attesa); attesa = null; };
        const lascia = (annullato) => { const p = presa; presa = null; p?.fine(annullato); };
        card.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) { smettiDiAspettare(); return lascia(true); }
            const t = e.touches[0];
            partenza = { x: t.clientX, y: t.clientY };
            if (maniglia.contains(e.target)) {
                e.preventDefault();
                presa = stacca(card, partenza.x, partenza.y);
                return;
            }
            attesa = setTimeout(() => { attesa = null; presa = stacca(card, partenza.x, partenza.y); }, TOCCO_LUNGO_MS);
        }, { passive: false });
        card.addEventListener('touchmove', (e) => {
            const t = e.touches[0];
            if (presa) {
                // Se la pagina ha già iniziato a scorrere il gesto non è più nostro
                if (!e.cancelable) return lascia(true);
                e.preventDefault();
                presa.muovi(t.clientX, t.clientY);
            } else if (attesa && Math.hypot(t.clientX - partenza.x, t.clientY - partenza.y) > TOLLERANZA_DITO_PX) {
                smettiDiAspettare();
            }
        }, { passive: false });
        card.addEventListener('touchend', (e) => {
            smettiDiAspettare();
            if (!presa) return;
            e.preventDefault();
            lascia(false);
        }, { passive: false });
        card.addEventListener('touchcancel', () => { smettiDiAspettare(); lascia(true); });
        card.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse
        maniglia.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') return;
            e.preventDefault();
            const p = stacca(card, e.clientX, e.clientY);
            try { maniglia.setPointerCapture(e.pointerId); } catch { }
            const muovi = (ev) => p.muovi(ev.clientX, ev.clientY);
            const termina = (annullato) => {
                maniglia.removeEventListener('pointermove', muovi);
                maniglia.removeEventListener('pointerup', rilascia);
                maniglia.removeEventListener('pointercancel', annulla);
                p.fine(annullato);
            };
            const rilascia = () => termina(false);
            const annulla = () => termina(true);
            maniglia.addEventListener('pointermove', muovi);
            maniglia.addEventListener('pointerup', rilascia);
            maniglia.addEventListener('pointercancel', annulla);
        });
    });
}

// ─── ESERCIZIO (serie, drop set, + e −) ────────────────────────────────────
// Valore nel campo: con la virgola, fino a due decimali (anche i vecchi 61,25 restano esatti)
const inCampo = (v) => v === '' || v == null ? '' : String(Math.round(numero(v) * 100) / 100).replace('.', ',');
const indice = (v) => v === undefined ? null : parseInt(v, 10);

// Numero con + e −: il campo 'kg' usa il passo del peso, gli altri ±1. attr: data-* di chi lo usa
// (indice della serie, del drop, id dell'esercizio). variante 'drop': piccolo e arancione.
function stepper(campo, valore, etichetta, attr = '', variante = '') {
    const drop = variante === 'drop';
    const tasto = `px-3 ${drop ? 'py-2' : 'py-2.5'} text-gray-500 font-black text-lg leading-none active:bg-gray-200`;
    return `
        <div class="stepper min-w-0 ${drop ? 'flex-1' : ''}" data-campo="${campo}" ${attr}>
            ${etichetta ? `<p class="text-[11px] font-semibold text-gray-400 uppercase mb-1">${etichetta}</p>` : ''}
            <div class="flex items-center ${drop ? 'bg-orange-50/60 border-orange-200' : 'bg-gray-50 border-gray-200'} border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-gray-900">
                <button type="button" class="stepper-meno ${tasto}" aria-label="Meno">−</button>
                <input type="text" inputmode="decimal" data-campo="${campo}" value="${inCampo(valore)}" placeholder="0" class="w-full min-w-0 text-center ${drop ? 'text-base' : 'text-xl'} font-black bg-transparent outline-none p-0">
                <button type="button" class="stepper-piu ${tasto}" aria-label="Più">+</button>
            </div>
        </div>`;
}

// + e − scrivono nel campo senza ridisegnare (il focus resta); anche quello che si scrive
// arriva a onValore(stepper, valore)
function collegaStepper(container, onValore) {
    container.querySelectorAll('.stepper').forEach(st => {
        const input = st.querySelector('input');
        const cambia = (direzione) => {
            const v = numero(input.value);
            const nuovo = st.dataset.campo === 'kg' ? passoPeso(v, direzione) : Math.max(0, v + (direzione === 'piu' ? 1 : -1));
            input.value = inCampo(nuovo);
            onValore(st, nuovo);
        };
        st.querySelector('.stepper-meno').addEventListener('click', () => cambia('meno'));
        st.querySelector('.stepper-piu').addEventListener('click', () => cambia('piu'));
        input.addEventListener('input', () => onValore(st, input.value));
    });
}

// "Peso per lato · recupero 1:00"
function sottotitoloEsercizio(ex) {
    const parti = [];
    if (ex.type === 'cardio') parti.push('Cardio');
    if (ex.type === 'corpo-libero') parti.push('Corpo libero');
    if (ex.type === 'sala-pesi' && Number(ex.weightMultiplier) === 2) parti.push('Peso per lato');
    if (ex.type === 'sala-pesi' && numero(ex.barbellWeight) > 0) parti.push(`bilanciere ${decimale(ex.barbellWeight)} kg`);
    if (ex.type !== 'cardio') parti.push(`recupero ${minuti(Number(ex.restSeconds) || 90)}`);
    const testo = parti.join(' · ');
    return testo.charAt(0).toUpperCase() + testo.slice(1);
}

const etichettaPeso = (ex) => Number(ex.weightMultiplier) === 2 ? 'kg per lato' : 'kg';

function ultimaVoltaHtml(ultimaVolta, tipo) {
    const stile = 'bg-gray-100 rounded-xl px-3 py-2 text-[13px] font-semibold text-gray-600';
    if (!ultimaVolta?.sets?.length) return `<div class="${stile}">Prima volta con questo esercizio</div>`;
    return `<div class="${stile}">Ultima volta: <span class="font-bold text-gray-900">${serieInRiga(ultimaVolta.sets, tipo)}</span></div>`;
}

// Campi di una serie da fare: peso e ripetizioni (o minuti), poi i drop in arancione con la x.
// Li usa anche la superserie. attr: data-* comuni a stepper e pulsanti della serie
function campiSerie(ex, set, attr) {
    const reps = stepper('reps', set.reps, ex.type === 'cardio' ? 'Minuti' : 'Ripetizioni', attr);
    if (ex.type !== 'sala-pesi') return reps;
    const drop = set.drop || [];
    return `
        <div class="grid grid-cols-2 gap-3">${stepper('kg', set.kg, etichettaPeso(ex), attr)}${reps}</div>
        ${drop.length ? `
            <div class="mt-3 pt-3 border-t border-dashed border-gray-200 space-y-2">
                ${drop.map((d, j) => `
                    <div class="riga-drop flex items-center gap-2">
                        <span class="text-[11px] font-black text-orange-600 w-11 flex-shrink-0">Drop ${j + 1}</span>
                        ${stepper('kg', d.kg, '', `${attr} data-drop="${j}"`, 'drop')}
                        ${stepper('reps', d.reps, '', `${attr} data-drop="${j}"`, 'drop')}
                        <button type="button" class="togli-drop p-1 text-gray-300 active:text-gray-600 flex-shrink-0" ${attr} data-drop="${j}" aria-label="Togli il drop">${icona.chiudi()}</button>
                    </div>`).join('')}
            </div>` : ''}`;
}

export function renderEsercizio(container, ex, ultimaVolta, serie, { onCambia, onAggiungiDrop, onTogliDrop, onSalvaSerie, onModificaSerie, onTermina, onIndietro }) {
    const primaDaFare = serie.findIndex(s => !s.completed);
    const nome = (i) => ex.type === 'cardio' ? 'Durata' : `Serie ${i + 1}`;

    const fatta = (set, i) => `
        <div class="serie-fatta bg-white rounded-2xl border border-green-200 px-4 py-3 flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">${icona.spunta()}</span>
            <p class="flex-1 min-w-0 font-bold text-gray-800">${nome(i)} <span class="font-semibold text-gray-500 ml-1">${serieInRiga([set], ex.type)}</span></p>
            <button type="button" class="modifica-serie text-[13px] font-bold text-indigo-600" data-idx="${i}">Modifica</button>
        </div>`;
    const daFare = (set, i) => {
        const prima = i === primaDaFare;
        return `
            <div class="serie-da-fare bg-white rounded-2xl border ${prima ? 'border-gray-200 shadow-sm' : 'border-gray-100'} p-4" data-idx="${i}">
                <p class="font-black text-gray-900 mb-3">${nome(i)}</p>
                ${campiSerie(ex, set, `data-idx="${i}"`)}
                <div class="flex items-center justify-between mt-3">
                    ${ex.type === 'sala-pesi' ? `<button type="button" class="aggiungi-drop text-[13px] font-bold text-indigo-600 py-1" data-idx="${i}">+ Drop</button>` : '<span></span>'}
                    <button type="button" class="salva-serie border font-black text-[14px] px-6 py-2.5 rounded-xl active:scale-95 transition-transform ${prima ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-200'}" data-idx="${i}">Salva serie</button>
                </div>
            </div>`;
    };

    container.innerHTML = `
        ${intestazione(esc(ex.name), { idIndietro: 'back-btn', sotto: sottotitoloEsercizio(ex) })}
        <main class="p-4 space-y-3 pb-24 safe-pb bg-gray-50">
            ${ultimaVoltaHtml(ultimaVolta, ex.type)}
            ${serie.map((set, i) => set.completed ? fatta(set, i) : daFare(set, i)).join('')}
            <button id="complete-btn" class="${primaDaFare === -1 ? BTN_PRINCIPALE : BTN_SECONDARIO}">Termina esercizio</button>
        </main>
    `;

    document.getElementById('back-btn').addEventListener('click', onIndietro);
    document.getElementById('complete-btn').addEventListener('click', onTermina);
    collegaStepper(container, (st, valore) => onCambia(indice(st.dataset.idx), st.dataset.campo, valore, indice(st.dataset.drop)));
    container.querySelectorAll('.aggiungi-drop').forEach(b => b.addEventListener('click', () => onAggiungiDrop(indice(b.dataset.idx))));
    container.querySelectorAll('.togli-drop').forEach(b => b.addEventListener('click', () => onTogliDrop(indice(b.dataset.idx), indice(b.dataset.drop))));
    container.querySelectorAll('.salva-serie').forEach(b => b.addEventListener('click', () => onSalvaSerie(indice(b.dataset.idx))));
    container.querySelectorAll('.modifica-serie').forEach(b => b.addEventListener('click', () => onModificaSerie(indice(b.dataset.idx))));
}

// ─── SUPERSERIE A GIRI ─────────────────────────────────────────────────────
// Un giro = una serie di ogni esercizio del blocco. setsPerId: { [id]: serie }; ultimeVolte: { [id]: record | null }
export function renderSuperserie(container, esercizi, setsPerId, ultimeVolte, { onCambia, onAggiungiDrop, onTogliDrop, onSalvaGiro, onModificaGiro, onTermina, onIndietro }) {
    const ids = esercizi.map(e => String(e.id));
    const perId = Object.fromEntries(esercizi.map(e => [String(e.id), e]));
    const giri = giriDelBlocco(ids, setsPerId);
    const attivo = giri.find(g => !g.fatto);
    const recupero = recuperoBlocco(esercizi);

    const conStorico = esercizi.filter(e => ultimeVolte[e.id]?.sets?.length);
    const ultimaVolta = conStorico.length ? `
        <div class="bg-gray-100 rounded-xl px-3 py-2 text-[13px] font-semibold text-gray-600 space-y-0.5">
            <p>Ultima volta</p>
            ${conStorico.map(e => `<p><span class="font-bold text-gray-900">${esc(e.name)}</span> ${serieInRiga(ultimeVolte[e.id].sets, e.type)}</p>`).join('')}
        </div>` : `<div class="bg-gray-100 rounded-xl px-3 py-2 text-[13px] font-semibold text-gray-600">Prima volta con questi esercizi</div>`;

    const fatto = (g) => `
        <div class="giro-fatto bg-white rounded-2xl border border-green-200 px-4 py-3">
            <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">${icona.spunta()}</span>
                <p class="flex-1 font-bold text-gray-800">Giro ${g.giro + 1}</p>
                <button type="button" class="modifica-giro text-[13px] font-bold text-indigo-600" data-giro="${g.giro}">Modifica</button>
            </div>
            <p class="text-[13px] font-semibold text-gray-500 mt-1 ml-9">${g.ids.map(id => `${esc(perId[id].name)} ${serieInRiga([setsPerId[id][g.giro]], perId[id].type)}`).join(' · ')}</p>
        </div>`;
    const inCorso = (g) => `
        <div class="giro-attivo bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
            <p class="font-black text-gray-900">Giro ${g.giro + 1}</p>
            ${g.ids.map((id, k) => `
                <div class="blocco-esercizio ${k ? 'border-t border-gray-100 pt-3' : ''}">
                    <p class="text-[14px] font-bold text-gray-800 mb-2">${esc(perId[id].name)}</p>
                    ${campiSerie(perId[id], setsPerId[id][g.giro], `data-id="${esc(id)}" data-idx="${g.giro}"`)}
                    ${perId[id].type === 'sala-pesi' ? `<button type="button" class="aggiungi-drop text-[13px] font-bold text-indigo-600 mt-2 py-1" data-id="${esc(id)}" data-idx="${g.giro}">+ Drop</button>` : ''}
                </div>`).join('')}
            <button id="salva-giro-btn" type="button" class="w-full bg-gray-900 text-white font-black text-[15px] py-3 rounded-xl active:scale-95 transition-transform" data-giro="${g.giro}">Salva giro</button>
        </div>`;
    const dopo = (g) => `
        <div class="giro-dopo bg-white rounded-2xl border border-gray-100 px-4 py-3 opacity-70">
            <p class="font-bold text-gray-800">Giro ${g.giro + 1}</p>
            ${g.ids.length < ids.length ? `<p class="text-[12px] font-semibold text-gray-400">Solo ${g.ids.map(id => esc(perId[id].name)).join(' e ')}</p>` : ''}
        </div>`;

    const sotto = esercizi.map(e => esc(e.name)).join(' + ') + (recupero ? ` · recupero ${minuti(recupero)}` : '');
    container.innerHTML = `
        ${intestazione('Superserie', { idIndietro: 'back-btn', sotto })}
        <main class="p-4 space-y-3 pb-24 safe-pb bg-gray-50">
            ${ultimaVolta}
            ${giri.map(g => g.fatto ? fatto(g) : g === attivo ? inCorso(g) : dopo(g)).join('')}
            <button id="termina-superserie-btn" class="${attivo ? BTN_SECONDARIO : BTN_PRINCIPALE}">Termina superserie</button>
        </main>
    `;

    document.getElementById('back-btn').addEventListener('click', onIndietro);
    document.getElementById('termina-superserie-btn').addEventListener('click', onTermina);
    document.getElementById('salva-giro-btn')?.addEventListener('click', (e) => onSalvaGiro(indice(e.currentTarget.dataset.giro)));
    collegaStepper(container, (st, valore) => onCambia(st.dataset.id, indice(st.dataset.idx), st.dataset.campo, valore, indice(st.dataset.drop)));
    container.querySelectorAll('.aggiungi-drop').forEach(b => b.addEventListener('click', () => onAggiungiDrop(b.dataset.id, indice(b.dataset.idx))));
    container.querySelectorAll('.togli-drop').forEach(b => b.addEventListener('click', () => onTogliDrop(b.dataset.id, indice(b.dataset.idx), indice(b.dataset.drop))));
    container.querySelectorAll('.modifica-giro').forEach(b => b.addEventListener('click', () => onModificaGiro(indice(b.dataset.giro))));
}

// ─── PROGRESSI (grafici di un esercizio) ───────────────────────────────────
// progressi: da progressiEsercizio(storico, esercizio)
function spiegaPesoReale(ex) {
    const perLato = Number(ex.weightMultiplier) === 2;
    const bilanciere = numero(ex.barbellWeight) > 0 ? `il bilanciere (${decimale(ex.barbellWeight)} kg)` : '';
    if (!perLato && !bilanciere) return '';
    const parti = [perLato ? 'il peso per lato conta il doppio' : '', bilanciere ? `${perLato ? 'più ' : 'comprende '}${bilanciere}` : ''].filter(Boolean);
    return `Pesi reali: ${parti.join(', ')}.`;
}

export function renderProgressi(container, ex, progressi, { onIndietro }) {
    const riquadro = (etichetta, valore) => `
        <div class="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm flex flex-col justify-between gap-1">
            <p class="text-[11px] font-bold text-gray-400 leading-tight">${etichetta}</p>
            <p class="text-xl font-black text-gray-900">${valore}</p>
        </div>`;
    const kg = (v) => v ? `${decimale(v)} <span class="text-[12px] font-bold text-gray-400">kg</span>` : '–';
    const grafico = (titolo, spiegazione, id) => `
        <div class="bg-white p-5 rounded-[20px] border border-gray-100 shadow-sm">
            <h3 class="text-[15px] font-black text-gray-900">${titolo}</h3>
            <p class="text-[12px] font-medium text-gray-400 mb-4">${spiegazione}</p>
            <div class="relative h-48 w-full"><canvas id="${id}"></canvas></div>
        </div>`;
    const nota = spiegaPesoReale(ex);

    container.innerHTML = `
        ${intestazione(esc(ex.name), { idIndietro: 'back-stats-btn', sopra: 'Progressi', sotto: riassuntoEsercizio(ex) })}
        <main class="p-4 space-y-4 pb-24 safe-pb bg-gray-50">
            <div class="grid grid-cols-3 gap-2">
                ${riquadro('Massimale stimato', kg(progressi.massimale))}
                ${riquadro('Peso più alto', kg(progressi.pesoMax))}
                ${riquadro('Allenamenti', progressi.allenamenti)}
            </div>
            ${nota ? `<p class="text-[12px] font-semibold text-gray-500 px-1">${nota}</p>` : ''}
            ${grafico('Massimale stimato', 'Il peso che alzeresti una volta sola, stimato dalle tue serie (formula di Brzycki).', 'chart1RM')}
            ${grafico('Peso più alto', 'Tocca una colonna per vedere la serie migliore di quel giorno.', 'chartWeight')}
        </main>
    `;
    document.getElementById('back-stats-btn').addEventListener('click', onIndietro);
    if (typeof Chart === 'undefined') return;

    const etichette = progressi.punti.map(p => new Date(p.endTime).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }));
    // Linea: scala stretta per vedere la crescita; colonne: da zero, se no la più bassa sparisce
    const assi = (daZero) => ({
        y: { beginAtZero: daZero, border: { display: false }, grid: { color: '#f3f4f6' }, ticks: { callback: (v) => decimale(v) } },
        x: { border: { display: false }, grid: { display: false } }
    });
    const tooltip = (testo) => ({ backgroundColor: '#111827', padding: 10, displayColors: false, callbacks: { label: testo } });

    new Chart(document.getElementById('chart1RM'), {
        type: 'line',
        data: {
            labels: etichette,
            datasets: [{
                data: progressi.punti.map(p => p.massimale), borderColor: '#4F46E5', backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderWidth: 3, pointBackgroundColor: '#4F46E5', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4, fill: true, tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: assi(false), plugins: { legend: { display: false }, tooltip: tooltip((c) => `Massimale stimato: ${decimale(c.parsed.y)} kg`) } }
    });
    new Chart(document.getElementById('chartWeight'), {
        type: 'bar',
        data: { labels: etichette, datasets: [{ data: progressi.punti.map(p => p.pesoMax), backgroundColor: '#111827', borderRadius: 4, barPercentage: 0.5 }] },
        options: {
            responsive: true, maintainAspectRatio: false, scales: assi(true),
            plugins: { legend: { display: false }, tooltip: tooltip((c) => testoMigliore(progressi.punti[c.dataIndex].migliore, ex) || `${decimale(c.parsed.y)} kg`) }
        }
    });
}
