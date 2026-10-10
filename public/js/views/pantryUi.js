// public/js/views/pantryUi.js
// Schermate della dispensa (restyle 5/6): elenco per tipo con "Da comprare", prodotto, lista
// della spesa, fogli per aggiungere. Solo disegno ed eventi: dati e salvataggi li gestisce PantryView.

import { icona } from '../components/icons.js?v=31';
import { intero } from '../components/format.js?v=31';
import { gruppiDispensa, daComprare, statoProdotto, percentuale, parolaFinito } from '../services/pantryLogic.js?v=31';

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
