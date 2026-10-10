// public/js/views/gymUi.js
// Schermate della palestra (restyle 4/6): schede, scheda con storico, modulo esercizio,
// allenamento in corso con superserie, esercizio con drop set, superserie a giri, progressi.
// Solo disegno ed eventi: i dati e i salvataggi li gestisce GymView.

import { icona } from '../components/icons.js?v=27';
import { apriFoglio } from '../components/sheet.js?v=27';
import * as modal from '../components/modal.js?v=27';
import { decimale, intero, chiaveGiorno, lunediDi, nomeGiorno, nomeSettimana } from '../components/format.js?v=27';
import { testoSerie, volumeSerie } from '../services/gymLogic.js?v=27';

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
        const ok = await modal.showModal({ type: 'confirm', title: 'Elimina esercizio', message: `Eliminare "${ex.name}" dalla scheda? Lo storico resta.`, confirmText: 'Elimina', cancelText: 'Annulla' });
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
