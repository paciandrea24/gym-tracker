// public/js/views/pantryUi.js
// Schermate della dispensa (restyle 5/6): elenco per tipo con "Da comprare", prodotto, lista
// della spesa, fogli per aggiungere. Solo disegno ed eventi: dati e salvataggi li gestisce PantryView.

import { icona } from '../components/icons.js?v=40';
import { intero, decimale } from '../components/format.js?v=40';
import { apriFoglio } from '../components/sheet.js?v=40';
import * as modal from '../components/modal.js?v=40';
import { campoCodiceHtml, collegaCampoCodice } from '../components/barcodeField.js?v=40';
import { searchFoodTable } from '../data/foodTable.js?v=40';
import { TIPI, gruppiDispensa, daComprare, statoProdotto, percentuale, parolaFinito, nomeTipo, rigaUtilizzo, rifornimento } from '../services/pantryLogic.js?v=40';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const numero = (v) => parseFloat(String(v ?? '').replace(',', '.')) || 0;
const grammi = (v) => `${intero(Math.max(0, numero(v)))} g`;

const BTN_PRINCIPALE = 'w-full bg-gray-900 text-white font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform';
const BTN_SECONDARIO = 'w-full bg-white border border-gray-200 text-gray-800 font-bold text-[15px] py-3.5 rounded-2xl shadow-sm active:scale-95 transition-transform';
const ETICHETTA = 'text-xs font-bold text-gray-400 uppercase tracking-widest';
const chevron = () => icona.avanti('w-4 h-4 text-gray-300 flex-shrink-0');

// Barra di quanto ne resta: azzurra, arancione se sta finendo, vuota se finito
function barra(item, altezza = 'h-1.5') {
    const stato = statoProdotto(item);
    const colore = stato === 'sta-finendo' ? 'bg-orange-400' : 'bg-indigo-500';
    return `<div class="w-full bg-gray-100 rounded-full ${altezza} overflow-hidden">${stato === 'finito' ? '' : `<div class="${colore} ${altezza} rounded-full" style="width:${percentuale(item)}%"></div>`}</div>`;
}

// "sta finendo" arancione o "finita/finito/…" rosso accanto al nome
function etichettaStato(item) {
    const stato = statoProdotto(item);
    if (stato === 'sta-finendo') return ' <span class="text-[11px] font-bold text-orange-600 ml-1">sta finendo</span>';
    if (stato === 'finito') return ` <span class="text-[11px] font-bold text-red-500 ml-1">${parolaFinito(item.nome)}</span>`;
    return '';
}

// ─── DISPENSA ──────────────────────────────────────────────────────────────
export function renderDispensa(container, items, { onApri, onDaComprare, onScansiona, onAMano, onChiudiScanner }) {
    const comprare = daComprare(items);
    const rigaDaComprare = comprare.length ? `
        <span class="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">${icona.carrello()}</span>
        <span class="flex-1 min-w-0">
            <span class="block text-[15px] font-black text-gray-900">Da comprare · ${comprare.length}</span>
            <span class="block text-[12px] font-semibold text-gray-400 truncate">${comprare.map(i => esc(i.nome)).join(', ')}</span>
        </span>` : `
        <span class="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">${icona.spunta('w-5 h-5')}</span>
        <span class="flex-1 min-w-0">
            <span class="block text-[15px] font-black text-gray-900">Non manca niente</span>
            <span class="block text-[12px] font-semibold text-gray-400">Quando un prodotto sta per finire lo trovi qui</span>
        </span>`;

    const rigaProdotto = (item) => {
        const finito = statoProdotto(item) === 'finito';
        return `
            <button class="riga-prodotto w-full text-left py-3 active:opacity-60" data-id="${esc(item._id)}">
                <span class="flex justify-between items-baseline gap-2">
                    <span class="text-[15px] font-bold ${finito ? 'text-gray-400' : 'text-gray-800'} min-w-0">${esc(item.nome)}${etichettaStato(item)}</span>
                    <span class="whitespace-nowrap"><b class="font-black ${finito ? 'text-gray-400' : 'text-gray-900'}">${grammi(item.grammiRimasti)}</b> <span class="text-[11px] font-bold ${finito ? 'text-gray-300' : 'text-gray-400'}">di ${intero(numero(item.grammiTotali))}</span></span>
                </span>
                <span class="block mt-1.5">${barra(item)}</span>
            </button>`;
    };

    const gruppi = gruppiDispensa(items);
    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-5 sticky top-0 z-10">
            <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Dispensa</h1>
            <p class="text-[12px] font-semibold text-gray-400">${items.length} ${items.length === 1 ? 'prodotto' : 'prodotti'}</p>
        </header>
        <main class="p-4 space-y-4 pb-24 safe-pb bg-gray-50">
            <button id="da-comprare-btn" class="w-full bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
                ${rigaDaComprare}
                ${chevron()}
            </button>
            <div id="action-buttons" class="grid grid-cols-2 gap-2">
                <button id="scan-add-btn" class="bg-gray-900 text-white font-black text-[15px] py-3.5 rounded-2xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform flex justify-center items-center gap-2">${icona.fotocamera()} Scansiona</button>
                <button id="voice-add-btn" class="bg-white border border-gray-200 text-gray-800 font-bold text-[15px] py-3.5 rounded-2xl shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-2">${icona.matita('w-5 h-5 text-gray-600')} A mano</button>
            </div>
            <div id="scanner-container" class="hidden bg-gray-900 p-2 rounded-2xl shadow-xl border border-gray-800">
                <p class="text-center text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Inquadra il codice a barre</p>
                <video id="pantry-reader-video" class="w-full rounded-xl overflow-hidden mb-3 bg-black min-h-[250px]" autoplay playsinline></video>
                <button id="close-scanner-btn" class="w-full bg-white text-gray-900 font-bold py-3 rounded-xl active:scale-95 transition-transform">Annulla</button>
            </div>
            ${gruppi.length ? gruppi.map(g => `
                <div class="gruppo-tipo" data-tipo="${esc(g.chiave)}">
                    <h3 class="${ETICHETTA} px-1 mb-2">${g.nome}</h3>
                    <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">${g.prodotti.map(rigaProdotto).join('')}</div>
                </div>`).join('') : `
                <div class="bg-white rounded-[20px] border border-gray-100 p-6 text-center">
                    <p class="font-bold text-gray-700">La dispensa è vuota</p>
                    <p class="text-[14px] font-medium text-gray-500 mt-1">Scansiona un prodotto o aggiungilo a mano.</p>
                </div>`}
        </main>
    `;

    container.querySelectorAll('.riga-prodotto').forEach(b => b.addEventListener('click', () => onApri(b.dataset.id)));
    document.getElementById('da-comprare-btn').addEventListener('click', onDaComprare);
    document.getElementById('scan-add-btn').addEventListener('click', onScansiona);
    document.getElementById('voice-add-btn').addEventListener('click', onAMano);
    document.getElementById('close-scanner-btn').addEventListener('click', onChiudiScanner);
}

// Mostra o nasconde il riquadro della fotocamera al posto dei due pulsanti
export function mostraScanner(visibile) {
    document.getElementById('scanner-container')?.classList.toggle('hidden', !visibile);
    document.getElementById('action-buttons')?.classList.toggle('hidden', visibile);
}

// ─── PEZZI COMUNI ──────────────────────────────────────────────────────────
// Numero di confezioni con + e − (minimo 1); il valore si può anche scrivere
function contatore(id, valore = 1, etichetta = 'Confezioni') {
    const tasto = 'h-full px-3 text-gray-500 font-black text-lg leading-none active:bg-gray-200';
    return `
        <div class="contatore min-w-0">
            ${etichetta ? `<p class="text-[11px] font-semibold text-gray-400 uppercase mb-1">${etichetta}</p>` : ''}
            <div class="h-11 flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-gray-900">
                <button type="button" class="contatore-meno ${tasto}" aria-label="Una in meno">−</button>
                <input id="${id}" type="text" inputmode="numeric" value="${valore}" class="contatore-valore w-full min-w-0 text-center text-lg font-black bg-transparent outline-none p-0">
                <button type="button" class="contatore-piu ${tasto}" aria-label="Una in più">+</button>
            </div>
        </div>`;
}

// Collega i contatori dentro root; onCambia(input, numero) a ogni + / − o a ogni cifra scritta
function collegaContatori(root, onCambia) {
    root.querySelectorAll('.contatore').forEach(c => {
        const input = c.querySelector('input');
        const vai = (delta) => {
            input.value = Math.max(1, (Math.round(numero(input.value)) || 1) + delta);
            onCambia(input, Number(input.value));
        };
        c.querySelector('.contatore-meno').addEventListener('click', () => vai(-1));
        c.querySelector('.contatore-piu').addEventListener('click', () => vai(1));
        input.addEventListener('input', () => onCambia(input, Math.max(1, Math.round(numero(input.value)) || 1)));
    });
}

// Campo per i grammi (virgola accettata)
const campoGrammi = (id, valore, etichetta) => `
    <div class="min-w-0">
        <label for="${id}" class="block text-[11px] font-semibold text-gray-400 uppercase mb-1">${etichetta}</label>
        <input id="${id}" type="text" inputmode="decimal" value="${valore === '' || valore == null ? '' : String(valore).replace('.', ',')}" placeholder="0" class="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg font-black outline-none focus:ring-2 focus:ring-gray-900">
    </div>`;

// "Per 100 g": Calorie e macro per esteso, con i colori dell'app
function valoriPer100(item) {
    const colonna = (nome, colore, v, unita) => `<div><p class="text-[11px] font-bold ${colore}">${nome}</p> <p class="font-black text-gray-900">${decimale(v)}${unita}</p></div>`;
    return `
        <div class="grid grid-cols-4 gap-2 text-center">
            ${colonna('Calorie', 'text-gray-400', item.calorie100, '')}
            ${colonna('Proteine', 'text-blue-500', item.proteine100, ' g')}
            ${colonna('Carboidrati', 'text-green-600', item.carbo100, ' g')}
            ${colonna('Grassi', 'text-yellow-600', item.grassi100, ' g')}
        </div>`;
}

// ─── PRODOTTO ──────────────────────────────────────────────────────────────
export function renderProdotto(container, item, utilizzi, { onIndietro, onAggiungiConfezioni, onCorreggi, onTogli }) {
    const righe = utilizzi.slice(0, 5).map(u => rigaUtilizzo(u));
    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center justify-between gap-2">
            <div class="flex items-center min-w-0">
                <button id="back-detail-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2" aria-label="Indietro">${icona.indietro()}</button>
                <div class="min-w-0">
                    <h1 class="text-xl font-bold text-gray-900 leading-tight">${esc(item.nome)}</h1>
                    <p class="text-[12px] font-semibold text-gray-400">${nomeTipo(item.categoria)}</p>
                </div>
            </div>
            ${item.immagine ? `<img src="${esc(item.immagine)}" alt="" class="w-10 h-10 rounded-xl object-cover border border-gray-100 flex-shrink-0">` : ''}
        </header>
        <main class="p-4 space-y-4 pb-24 safe-pb bg-gray-50">
            <div class="bg-white rounded-[20px] border border-gray-100 shadow-sm p-5">
                <p><span class="text-4xl font-black text-gray-900">${grammi(item.grammiRimasti)}</span> <span class="text-[14px] font-bold text-gray-400">di ${grammi(item.grammiTotali)}</span>${etichettaStato(item)}</p>
                <div class="my-3">${barra(item, 'h-2')}</div>
                ${numero(item.pesoConfezione) > 0 ? `<p class="text-[12px] font-semibold text-gray-400">Confezioni da ${grammi(item.pesoConfezione)}</p>` : ''}
                <div class="border-t border-gray-100 mt-4 pt-4">
                    <p class="text-[12px] font-bold text-gray-400 mb-2">Per 100 g</p>
                    ${valoriPer100(item)}
                </div>
            </div>
            <button id="aggiungi-confezioni-btn" class="${BTN_PRINCIPALE}">Aggiungi confezioni</button>
            <button id="correggi-grammi-btn" class="${BTN_SECONDARIO}">Correggi i grammi</button>
            <div>
                <h3 class="${ETICHETTA} px-1 mb-2">Ultimi utilizzi</h3>
                ${righe.length ? `
                    <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100 text-[13px]">
                        ${righe.map(r => `
                            <div class="riga-utilizzo py-2.5 flex justify-between items-center gap-2">
                                <div class="min-w-0"><p class="font-bold text-gray-800 truncate">${esc(r.titolo)}</p><p class="text-[12px] font-semibold text-gray-400">${r.quando}</p></div>
                                <p class="font-black text-gray-900 whitespace-nowrap">${r.grammi}</p>
                            </div>`).join('')}
                    </div>` : `<p class="text-[13px] font-semibold text-gray-400 px-1">Non l'hai ancora usato in un pasto.</p>`}
            </div>
            <button id="togli-btn" class="w-full text-red-600 font-bold text-sm py-2">Togli dalla dispensa</button>
        </main>
    `;
    document.getElementById('back-detail-btn').addEventListener('click', onIndietro);
    document.getElementById('aggiungi-confezioni-btn').addEventListener('click', onAggiungiConfezioni);
    document.getElementById('correggi-grammi-btn').addEventListener('click', onCorreggi);
    document.getElementById('togli-btn').addEventListener('click', onTogli);
}

// Foglio "Aggiungi confezioni": quante e (se non si sa) quanto pesa una; onConferma(confezioni, grammiLuna)
export function apriFoglioConfezioni(item, onConferma) {
    const { box, chiudi, intestazione, collegaChiudi } = apriFoglio({ id: 'foglio-confezioni' });
    const peso = numero(item.pesoConfezione);
    box.innerHTML = `
        ${intestazione('Aggiungi confezioni', peso > 0 ? `Da ${grammi(peso)} l'una` : esc(item.nome))}
        <div class="grid ${peso > 0 ? 'grid-cols-1' : 'grid-cols-2'} gap-2">
            ${contatore('conf-qty', 1)}
            ${peso > 0 ? '' : campoGrammi('conf-grammi', '', "Grammi l'una")}
        </div>
        <p class="diventano text-[13px] font-semibold text-gray-500 mt-3"></p>
        <button id="conferma-foglio-btn" class="${BTN_PRINCIPALE} mt-4"></button>`;
    collegaChiudi();
    const leggi = () => [Math.max(1, Math.round(numero(box.querySelector('#conf-qty').value)) || 1), peso > 0 ? peso : numero(box.querySelector('#conf-grammi').value)];
    const aggiorna = () => {
        const [n, g] = leggi();
        box.querySelector('.diventano').innerHTML = `In dispensa diventano <b class="text-gray-900">${grammi(rifornimento(item, n, g).grammiRimasti)}</b>`;
        box.querySelector('#conferma-foglio-btn').textContent = `Aggiungi ${grammi(n * g)}`;
    };
    collegaContatori(box, aggiorna);
    box.querySelector('#conf-grammi')?.addEventListener('input', aggiorna);
    aggiorna();
    box.querySelector('#conferma-foglio-btn').addEventListener('click', () => {
        const [n, g] = leggi();
        if (!(g > 0)) return box.querySelector('#conf-grammi')?.focus();
        chiudi();
        onConferma(n, g);
    });
}

// ─── DA COMPRARE ───────────────────────────────────────────────────────────
// Lista della spesa: si spunta quello che si è preso; "Modifica" cambia confezioni e grammi
// l'una. onMetti(scelte: [{ id, confezioni, grammiLuna }]) con solo i prodotti spuntati.
export function renderDaComprare(container, items, { onIndietro, onMetti }) {
    const lista = daComprare(items);
    const scelte = Object.fromEntries(lista.map(i => [i._id, { spuntato: false, aperto: false, confezioni: 1, grammiLuna: numero(i.pesoConfezione) }]));
    const confezioni = (n, g) => `${n} ${n === 1 ? 'confezione' : 'confezioni'} da ${grammi(g)}`;
    const diventano = (item) => `In dispensa diventano <b class="text-gray-900">${grammi(rifornimento(item, scelte[item._id].confezioni, scelte[item._id].grammiLuna).grammiRimasti)}</b>`;

    const riga = (item) => {
        const s = scelte[item._id];
        const stato = statoProdotto(item) === 'finito'
            ? parolaFinito(item.nome).replace(/^f/, 'F')
            : `Restano ${grammi(item.grammiRimasti)}`;
        return `
            <div class="riga-spesa py-3" data-id="${esc(item._id)}">
                <div class="flex items-center gap-3">
                    <button type="button" class="spunta-spesa flex-1 min-w-0 flex items-center gap-3 text-left" role="checkbox" aria-checked="${s.spuntato}">
                        <span class="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${s.spuntato ? 'bg-gray-900 text-white' : 'border-2 border-gray-300'}">${s.spuntato ? icona.spunta() : ''}</span>
                        <span class="min-w-0">
                            <span class="block font-bold text-gray-800">${esc(item.nome)}</span>
                            <span class="block text-[12px] font-semibold text-gray-400">${stato} · <span class="dettaglio-spesa">${confezioni(s.confezioni, s.grammiLuna)}</span></span>
                        </span>
                    </button>
                    ${s.spuntato && !s.aperto ? `<button type="button" class="modifica-spesa text-[13px] font-bold text-indigo-600 py-1">Modifica</button>` : ''}
                </div>
                ${s.spuntato && s.aperto ? `
                    <div class="grid grid-cols-2 gap-2 mt-3 ml-9">
                        ${contatore(`spesa-qty-${esc(item._id)}`, s.confezioni)}
                        ${campoGrammi(`spesa-grammi-${esc(item._id)}`, s.grammiLuna || '', "Grammi l'una")}
                    </div>
                    <p class="diventano text-[12px] font-semibold text-gray-500 mt-2 ml-9">${diventano(item)}</p>` : ''}
            </div>`;
    };

    const disegna = () => {
        const n = lista.filter(i => scelte[i._id].spuntato).length;
        container.innerHTML = `
            <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
                <button id="back-shopping-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2" aria-label="Indietro">${icona.indietro()}</button>
                <div class="min-w-0">
                    <h1 class="text-xl font-bold text-gray-900 leading-tight">Da comprare</h1>
                    <p class="text-[12px] font-semibold text-gray-400">${lista.length} ${lista.length === 1 ? 'prodotto' : 'prodotti'}</p>
                </div>
            </header>
            <main class="p-4 space-y-4 pb-24 safe-pb bg-gray-50">
                ${lista.length ? `
                    <p class="text-[13px] font-semibold text-gray-500 px-1">Spunta quello che hai preso. Quando hai finito, lo metti in dispensa tutto insieme.</p>
                    <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">${lista.map(riga).join('')}</div>
                    <button id="metti-in-dispensa-btn" class="${BTN_PRINCIPALE} disabled:opacity-40 disabled:active:scale-100" ${n ? '' : 'disabled'}>Metti in dispensa${n ? ` (${n})` : ''}</button>
                ` : `
                    <div class="bg-white rounded-[20px] border border-gray-100 p-6 text-center">
                        <p class="font-bold text-gray-700">Non manca niente</p>
                        <p class="text-[14px] font-medium text-gray-500 mt-1">Quando un prodotto sta per finire lo trovi qui.</p>
                    </div>`}
            </main>
        `;
        document.getElementById('back-shopping-btn').addEventListener('click', onIndietro);
        container.querySelectorAll('.riga-spesa').forEach(r => {
            const item = lista.find(i => String(i._id) === r.dataset.id);
            const s = scelte[item._id];
            r.querySelector('.spunta-spesa').addEventListener('click', () => { s.spuntato = !s.spuntato; if (!s.spuntato) s.aperto = false; disegna(); });
            r.querySelector('.modifica-spesa')?.addEventListener('click', () => { s.aperto = true; disegna(); });
            // Confezioni e grammi cambiano il dato e la riga "diventano" senza ridisegnare (resta il focus)
            const aggiorna = () => {
                r.querySelector('.diventano').innerHTML = diventano(item);
                r.querySelector('.dettaglio-spesa').textContent = confezioni(s.confezioni, s.grammiLuna);
            };
            collegaContatori(r, (_, valore) => { s.confezioni = valore; aggiorna(); });
            r.querySelector('[id^="spesa-grammi-"]')?.addEventListener('input', (e) => { s.grammiLuna = numero(e.target.value); aggiorna(); });
        });
        document.getElementById('metti-in-dispensa-btn')?.addEventListener('click', (e) => {
            // Un prodotto senza peso della confezione (dati vecchi): si chiedono i grammi, mai 0 g
            const senzaPeso = lista.find(i => scelte[i._id].spuntato && !(scelte[i._id].grammiLuna > 0));
            if (senzaPeso) {
                scelte[senzaPeso._id].aperto = true;
                disegna();
                return modal.showModal({ type: 'error', title: 'Manca il peso', message: `Scrivi i grammi di una confezione di ${esc(senzaPeso.nome)}.` });
            }
            e.currentTarget.disabled = true;
            onMetti(lista.filter(i => scelte[i._id].spuntato).map(i => ({ id: i._id, confezioni: scelte[i._id].confezioni, grammiLuna: scelte[i._id].grammiLuna })));
        });
    };
    disegna();
}

// Foglio "Correggi i grammi": quanti ne restano davvero; onConferma(grammi)
export function apriFoglioCorreggi(item, onConferma) {
    const { box, chiudi, intestazione, collegaChiudi } = apriFoglio({ id: 'foglio-correggi' });
    box.innerHTML = `
        ${intestazione('Correggi i grammi', `Quanti grammi di ${esc(item.nome)} ne restano?`)}
        ${campoGrammi('correggi-input', intero(Math.max(0, numero(item.grammiRimasti))), 'Grammi rimasti')}
        <button id="conferma-foglio-btn" class="${BTN_PRINCIPALE} mt-4">Salva</button>`;
    collegaChiudi();
    box.querySelector('#conferma-foglio-btn').addEventListener('click', () => {
        const valore = box.querySelector('#correggi-input').value;
        chiudi();
        onConferma(valore);
    });
}

// ─── AGGIUNGERE ────────────────────────────────────────────────────────────
// Pulsanti per scegliere il tipo: uno solo, nero quello scelto
const chipTipi = (scelto) => `
    <div>
        <p class="text-[11px] font-semibold text-gray-400 uppercase mb-1.5">Tipo</p>
        <div class="flex flex-wrap gap-1.5">
            ${TIPI.map(t => `<button type="button" data-tipo="${esc(t.chiave)}" class="chip-tipo px-3 py-1.5 rounded-xl border text-[13px] font-bold transition-colors ${t.chiave === scelto ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-gray-200'}">${t.nome}</button>`).join('')}
        </div>
    </div>`;

function collegaChip(root, onScelta) {
    const chips = root.querySelectorAll('.chip-tipo');
    chips.forEach(b => b.addEventListener('click', () => {
        chips.forEach(c => {
            const attivo = c === b;
            ['bg-gray-900', 'text-white', 'border-gray-900'].forEach(k => c.classList.toggle(k, attivo));
            ['bg-gray-50', 'text-gray-600', 'border-gray-200'].forEach(k => c.classList.toggle(k, !attivo));
        });
        onScelta(b.dataset.tipo);
    }));
}

const valoriInRiga = (v) => `Per 100 g: ${decimale(v.calorie100)} kcal · Proteine ${decimale(v.proteine100)} g · Carboidrati ${decimale(v.carbo100)} g · Grassi ${decimale(v.grassi100)} g`;
const pulsanteChiudi = () => `<button class="chiudi-foglio flex-shrink-0 text-gray-400 bg-gray-100 p-2 rounded-full active:scale-90 transition-transform" aria-label="Chiudi">${icona.chiudi()}</button>`;

// Foglio dopo lo scanner (o il codice scritto): confezioni, grammi l'una e tipo in una volta sola.
// esistente: lo stesso prodotto già in dispensa (si somma). onConferma({ confezioni, grammiLuna, categoria })
export function apriFoglioTrovato({ codice, valori, grammiLuna, categoria, esistente = null, confezioni = 1 }, onConferma) {
    const { box, chiudi, collegaChiudi } = apriFoglio({ id: 'foglio-trovato' });
    let tipo = categoria;
    box.innerHTML = `
        <div class="flex justify-between items-start gap-3 mb-2">
            <div class="min-w-0">
                <p class="text-[12px] font-semibold text-gray-400">Trovato con il codice ${esc(codice)}</p>
                <h2 class="text-xl font-black text-gray-900 leading-tight">${esc(valori.nome)}</h2>
            </div>
            ${pulsanteChiudi()}
        </div>
        <p class="text-[13px] font-semibold text-gray-500 mb-4">${valoriInRiga(valori)}</p>
        <div class="grid grid-cols-2 gap-2">${contatore('trovato-qty', confezioni)}${campoGrammi('trovato-grammi', grammiLuna > 0 ? grammiLuna : '', "Grammi l'una")}</div>
        ${esistente ? '<p class="gia-presente text-[13px] font-semibold text-gray-500 mt-3"></p>' : ''}
        <div class="mt-4">${chipTipi(tipo)}</div>
        <button id="trovato-conferma-btn" class="${BTN_PRINCIPALE} mt-5"></button>`;
    collegaChiudi();
    const leggi = () => [Math.max(1, Math.round(numero(box.querySelector('#trovato-qty').value)) || 1), numero(box.querySelector('#trovato-grammi').value)];
    const aggiorna = () => {
        const [n, g] = leggi();
        box.querySelector('#trovato-conferma-btn').textContent = g > 0 ? `Aggiungi ${grammi(n * g)}` : 'Aggiungi';
        const gia = box.querySelector('.gia-presente');
        if (gia) gia.innerHTML = `Ne hai ${grammi(esistente.grammiRimasti)}, diventano <b class="text-gray-900">${grammi(rifornimento(esistente, n, g).grammiRimasti)}</b>`;
    };
    collegaContatori(box, aggiorna);
    box.querySelector('#trovato-grammi').addEventListener('input', aggiorna);
    collegaChip(box, (t) => { tipo = t; });
    aggiorna();
    box.querySelector('#trovato-conferma-btn').addEventListener('click', () => {
        const [n, g] = leggi();
        if (!(g > 0)) return modal.showModal({ type: 'error', title: 'Manca il peso', message: 'Scrivi i grammi di una confezione.' });
        chiudi();
        onConferma({ confezioni: n, grammiLuna: g, categoria: tipo });
    });
}

// Foto della confezione per Open Food Facts: lato massimo 800 px, JPEG al 70%
function comprimiFoto(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const scala = Math.min(1, 800 / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = img.width * scala;
                canvas.height = img.height * scala;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => resolve(null);
            img.src = event.target.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

// Foglio "Aggiungi alla dispensa" a mano. codiceOFF: codice che non è su Open Food Facts (chiede
// anche marca e foto per aggiungerlo lì). onCodice(codice, confezioni): codice scritto nel campo.
// onSalva(dati) async; se fallisce il foglio resta aperto con "Riprova".
export function apriFoglioAMano({ codiceOFF = '', confezioni = 1 } = {}, { onCodice, onSalva }) {
    const { box, chiudi, intestazione, collegaChiudi } = apriFoglio({ id: 'foglio-a-mano' });
    let tipo = 'Altro';
    const valore = (id, etichetta, colore) => `
        <div class="min-w-0">
            <label for="${id}" class="block text-[10px] font-bold ${colore} mb-1 truncate">${etichetta}</label>
            <input id="${id}" type="text" inputmode="decimal" placeholder="0" class="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900">
        </div>`;
    const testo = (id, etichetta, segnaposto) => `
        <div>
            <label for="${id}" class="block text-[11px] font-semibold text-gray-400 uppercase mb-1">${etichetta}</label>
            <input id="${id}" type="text" placeholder="${segnaposto}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-gray-900">
        </div>`;
    box.innerHTML = `
        ${intestazione('Aggiungi alla dispensa')}
        <div class="space-y-4">
            ${codiceOFF ? `<p class="text-[13px] font-semibold text-gray-500">Questo codice non è ancora su Open Food Facts: con questi dati lo aggiungi anche lì. <span class="text-gray-400">Codice ${esc(codiceOFF)}</span></p>` : campoCodiceHtml()}
            <div>
                <label for="m-nome" class="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Nome</label>
                <div class="flex gap-2">
                    <input id="m-nome" type="text" autocomplete="off" placeholder="es. Mozzarella" class="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-gray-900">
                    <button type="button" id="voice-nome-btn" class="bg-white border border-gray-200 text-gray-700 px-3.5 rounded-xl active:scale-95 transition-transform" aria-label="Detta il nome">${icona.mic()}</button>
                </div>
                <div id="food-autocomplete" class="hidden mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"></div>
                <p id="crea-badge" class="hidden text-[12px] font-semibold text-green-700 mt-1">Valori dalla tabella CREA</p>
            </div>
            <div class="grid grid-cols-2 gap-2">${contatore('m-qty', confezioni)}${campoGrammi('m-peso', '', "Grammi l'una")}</div>
            ${chipTipi(tipo)}
            ${codiceOFF ? `
                ${testo('m-marca', 'Marca (facoltativa)', 'es. Granarolo')}
                <div>
                    <label for="m-foto" class="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Foto della confezione (facoltativa)</label>
                    <input id="m-foto" type="file" accept="image/*" capture="environment" class="w-full text-sm font-bold text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-gray-200 file:bg-white file:text-gray-800 file:font-bold">
                </div>` : ''}
            <div>
                <p class="text-[12px] font-bold text-gray-400 mb-1.5">Per 100 g</p>
                <div class="grid grid-cols-4 gap-1.5">
                    ${valore('m-cal', 'Calorie', 'text-gray-400')}${valore('m-pro', 'Proteine', 'text-blue-500')}${valore('m-carbo', 'Carboidrati', 'text-green-600')}${valore('m-fat', 'Grassi', 'text-yellow-600')}
                </div>
            </div>
            <button id="save-manual-btn" class="${BTN_PRINCIPALE}">Salva in dispensa</button>
        </div>`;
    collegaChiudi();
    const $ = (id) => box.querySelector(`#${id}`);
    const confezioniScritte = () => Math.max(1, Math.round(numero($('m-qty').value)) || 1);
    collegaContatori(box, () => { });
    collegaChip(box, (t) => { tipo = t; });
    // Codice scritto: stesso percorso dello scanner, con le confezioni già scelte qui
    collegaCampoCodice(box, async (codice) => { const n = confezioniScritte(); chiudi(); onCodice(codice, n); });

    // Nome dettato
    const nome = $('m-nome');
    const mic = $('voice-nome-btn');
    mic.addEventListener('click', () => {
        const Riconoscimento = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Riconoscimento) return modal.showModal({ type: 'error', title: 'Voce', message: 'Il riconoscimento vocale non è disponibile su questo telefono.' });
        const rec = new Riconoscimento();
        rec.lang = 'it-IT';
        rec.continuous = false;
        rec.interimResults = false;
        const inAscolto = (attivo) => ['border-red-400', 'text-red-500', 'animate-pulse'].forEach(k => mic.classList.toggle(k, attivo));
        inAscolto(true);
        rec.onresult = (e) => {
            nome.value = e.results[0][0].transcript;
            nome.dispatchEvent(new Event('input'));
            inAscolto(false);
            mic.innerHTML = icona.spunta('w-5 h-5 text-green-600');
            setTimeout(() => { mic.innerHTML = icona.mic(); }, 1500);
        };
        rec.onerror = () => inAscolto(false);
        rec.onend = () => inAscolto(false);
        rec.start();
    });

    // Suggerimenti dalla tabella CREA: compilano valori e tipo
    const lista = $('food-autocomplete');
    const crea = $('crea-badge');
    let suggerimenti = [];
    const compila = (v) => {
        nome.value = v.nome;
        [['m-cal', v.calorie100], ['m-pro', v.proteine100], ['m-carbo', v.carbo100], ['m-fat', v.grassi100]].forEach(([id, x]) => { $(id).value = String(x).replace('.', ','); });
        box.querySelector(`.chip-tipo[data-tipo="${v.categoria}"]`)?.click();
        lista.classList.add('hidden');
        lista.innerHTML = '';
        crea.classList.remove('hidden');
    };
    nome.addEventListener('input', () => {
        crea.classList.add('hidden');
        suggerimenti = searchFoodTable(nome.value);
        lista.classList.toggle('hidden', suggerimenti.length === 0);
        lista.innerHTML = suggerimenti.map((v, i) => `
            <button type="button" data-idx="${i}" class="crea-suggestion w-full text-left px-4 py-3 text-[13px] border-b border-gray-100 last:border-b-0 flex justify-between items-center gap-2 active:bg-gray-50">
                <span class="font-semibold text-gray-800">${esc(v.nome)}</span>
                <span class="text-[11px] font-bold text-gray-400 flex-shrink-0">${intero(v.calorie100)} kcal · Proteine ${decimale(v.proteine100)} g</span>
            </button>`).join('');
    });
    lista.addEventListener('click', (e) => {
        const b = e.target.closest('.crea-suggestion');
        if (b) compila(suggerimenti[Number(b.dataset.idx)]);
    });
    box.addEventListener('click', (e) => { if (!nome.contains(e.target) && !lista.contains(e.target)) lista.classList.add('hidden'); });

    const salva = $('save-manual-btn');
    salva.addEventListener('click', async () => {
        const dati = {
            nome: nome.value.trim(), pesoConfezione: numero($('m-peso').value), quantitaConfezioni: confezioniScritte(), categoria: tipo,
            calorie100: numero($('m-cal').value), proteine100: numero($('m-pro').value), carbo100: numero($('m-carbo').value), grassi100: numero($('m-fat').value),
            marca: $('m-marca')?.value.trim() || '', foto: null
        };
        if (!dati.nome || !(dati.pesoConfezione > 0) || !(dati.calorie100 > 0)) {
            return modal.showModal({ type: 'error', title: 'Manca qualcosa', message: 'Scrivi nome, grammi di una confezione e calorie.' });
        }
        salva.disabled = true;
        salva.textContent = 'Salvataggio…';
        const file = $('m-foto')?.files?.[0];
        if (file) dati.foto = await comprimiFoto(file);
        try {
            await onSalva(dati);
            chiudi();
        } catch (e) {
            salva.disabled = false;
            salva.textContent = 'Riprova';
        }
    });
}
