// public/js/views/homeUi.js
// Schermate della Home (restyle 6/6): riassunto della giornata con riquadri che portano alle
// sezioni (niente pulsante nero) e pagina del Peso. Solo disegno ed eventi: i dati li carica HomeView.

import { icona } from '../components/icons.js?v=32';
import { chiaveGiorno, nomeGiorno } from '../components/format.js?v=32';
import { riquadroRiepilogo, totaliPasti } from '../ui.js?v=32';
import { unaPerGiorno, riassuntoPeso, puntiLinea, segno } from '../services/pesoLogic.js?v=32';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const minuscola = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const decimaleKg = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
const chevron = () => icona.avanti('w-4 h-4 text-gray-300 flex-shrink-0');
const RIQUADRO = 'w-full bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 text-left active:scale-[0.98] transition-transform';
const GOCCIA = '<path d="M12 2c-5.33 5.58-8 9.24-8 12.83A8.04 8.04 0 0012 22a8.04 8.04 0 008-7.17C20 11.24 17.33 7.58 12 2z"/>';
const BICCHIERI = 8;
const ML_BICCHIERE = 250;

// ─── HOME ──────────────────────────────────────────────────────────────────
// dati: { pasti, goals, bicchieri, pesate, allenamento: { inCorso, daFare, ultimo, scheda }, daComprare }
export function renderHome(container, dati, { onNutrizione, onPalestra, onPeso, onAcqua, onSpesa }) {
    const oggi = nomeGiorno(chiaveGiorno(new Date()));
    const data = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

    const a = dati.allenamento;
    const allenamento = a.inCorso
        ? { titolo: `Allenamento in corso · ${a.daFare} da fare`, sotto: esc(a.scheda || ''), azione: 'Riprendi' }
        : { titolo: 'Allenamento', sotto: a.ultimo ? `Ultima volta ${minuscola(nomeGiorno(chiaveGiorno(a.ultimo)))}${a.scheda ? ` · ${esc(a.scheda)}` : ''}` : 'Non ti sei ancora allenato', azione: 'Inizia' };

    const ml = dati.bicchieri * ML_BICCHIERE;
    const gocce = Array.from({ length: BICCHIERI }, (_, i) => `
        <button type="button" class="water-drop-btn p-0.5 active:scale-90 transition-transform ${i < dati.bicchieri ? 'text-blue-400' : 'text-gray-200'}" data-index="${i + 1}" aria-label="${i + 1} ${i ? 'bicchieri' : 'bicchiere'}">
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">${GOCCIA}</svg>
        </button>`).join('');

    const peso = riassuntoPeso(dati.pesate);
    const ultimePesate = unaPerGiorno(dati.pesate).slice(0, 12).reverse().map(l => Number(l.weight) || 0);
    const righePeso = !peso ? ['Tocca per pesarti']
        : [peso.variazione !== null ? `${segno(peso.variazione)} kg dal ${peso.dal}` : '', `Pesato ${peso.quando}`].filter(Boolean);

    const comprare = dati.daComprare;

    container.innerHTML = `
        <header class="pt-12 pb-2 px-6">
            <h1 class="text-[28px] font-black text-gray-900 tracking-tight">Ciao Andrea</h1>
            <p class="text-sm font-medium text-gray-400 mt-0.5">${data.charAt(0).toUpperCase() + data.slice(1)}</p>
        </header>
        <main class="p-4 space-y-3 pb-24 safe-pb bg-gray-50">
            <button id="home-calorie-card" class="w-full text-left active:scale-[0.98] transition-transform" aria-label="Apri la Nutrizione di ${minuscola(oggi)}">
                ${riquadroRiepilogo(totaliPasti(dati.pasti), dati.goals, { titolo: 'Mangiato oggi', testoSotto: (x) => `Mancano ${x} kcal` })}
            </button>

            <button id="home-workout-card" class="${RIQUADRO} flex items-center gap-3">
                <span class="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center flex-shrink-0">${icona.play('w-5 h-5')}</span>
                <span class="flex-1 min-w-0">
                    <span class="block text-[15px] font-black text-gray-900">${allenamento.titolo}</span>
                    ${allenamento.sotto ? `<span class="block text-[12px] font-semibold text-gray-400">${allenamento.sotto}</span>` : ''}
                </span>
                <span class="text-[13px] font-bold text-indigo-600">${allenamento.azione}</span>
            </button>

            <div id="home-water-card" class="bg-white rounded-[20px] border border-gray-100 shadow-sm p-4">
                <div class="flex justify-between items-baseline">
                    <p class="text-[15px] font-black text-gray-900">Acqua</p>
                    <p class="text-[13px] font-bold text-gray-400"><b class="text-gray-900">${ml} ml</b> di 2 l</p>
                </div>
                <div class="flex justify-between mt-3">${gocce}</div>
                <p class="text-[12px] font-semibold text-gray-400 mt-2">Tocca una goccia per segnare i bicchieri (250 ml l'uno)</p>
            </div>

            <button id="home-weight-card" class="${RIQUADRO} flex items-center gap-3">
                <span class="flex-1 min-w-0">
                    <span class="block text-[15px] font-black text-gray-900">Peso</span>
                    ${peso ? `<span class="block"><span class="text-2xl font-black text-gray-900">${decimaleKg(peso.ultimo)}</span> <span class="text-[13px] font-bold text-gray-400">kg</span></span>` : ''}
                    ${righePeso.map(r => `<span class="block text-[12px] font-semibold text-gray-400">${r}</span>`).join(" ")}
                </span>
                ${ultimePesate.length ? `<svg class="w-20 h-10 flex-shrink-0" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${puntiLinea(ultimePesate)}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>` : ''}
                ${chevron()}
            </button>

            <button id="home-spesa-card" class="${RIQUADRO} flex items-center gap-3">
                ${comprare.length ? `
                    <span class="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">${icona.carrello()}</span>
                    <span class="flex-1 min-w-0">
                        <span class="block text-[15px] font-black text-gray-900">Da comprare · ${comprare.length}</span>
                        <span class="block text-[12px] font-semibold text-gray-400 truncate">${comprare.map(i => esc(i.nome)).join(', ')}</span>
                    </span>` : `
                    <span class="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">${icona.spunta('w-5 h-5')}</span>
                    <span class="flex-1 min-w-0">
                        <span class="block text-[15px] font-black text-gray-900">Non manca niente</span>
                        <span class="block text-[12px] font-semibold text-gray-400">La lista della spesa è vuota</span>
                    </span>`}
                ${chevron()}
            </button>
        </main>
    `;

    document.getElementById('home-calorie-card').addEventListener('click', onNutrizione);
    document.getElementById('home-workout-card').addEventListener('click', onPalestra);
    document.getElementById('home-weight-card').addEventListener('click', onPeso);
    document.getElementById('home-spesa-card').addEventListener('click', onSpesa);
    // Goccia toccata: tanti bicchieri quanti fino a lei; l'ultima piena si toglie
    container.querySelectorAll('.water-drop-btn').forEach(b => b.addEventListener('click', () => {
        const n = Number(b.dataset.index);
        onAcqua(n === dati.bicchieri ? n - 1 : n);
    }));
}
