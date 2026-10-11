// public/js/views/homeUi.js
// Schermate della Home (restyle 6/6): riassunto della giornata con riquadri che portano alle
// sezioni (niente pulsante nero) e pagina del Peso. Solo disegno ed eventi: i dati li carica HomeView.

import { icona } from '../components/icons.js?v=33';
import { chiaveGiorno, nomeGiorno } from '../components/format.js?v=33';
import { riquadroRiepilogo, totaliPasti } from '../ui.js?v=33';
import * as modal from '../components/modal.js?v=33';
import { unaPerGiorno, riassuntoPeso, righePesate, puntiLinea, segno, pesoScritto } from '../services/pesoLogic.js?v=33';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const minuscola = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const decimaleKg = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
const chevron = () => icona.avanti('w-4 h-4 text-gray-300 flex-shrink-0');
const RIQUADRO = 'w-full bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 text-left active:scale-[0.98] transition-transform';
const GOCCIA = '<path d="M12 2c-5.33 5.58-8 9.24-8 12.83A8.04 8.04 0 0012 22a8.04 8.04 0 008-7.17C20 11.24 17.33 7.58 12 2z"/>';
const TASTO_ACQUA = 'w-12 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform disabled:opacity-40 disabled:active:scale-100';
const BICCHIERI = 8;
const ML_BICCHIERE = 250;

// ─── HOME ──────────────────────────────────────────────────────────────────
// dati: { giorno, pasti, goals, bicchieri, pesate, allenamento: { inCorso, daFare, ultimo, scheda }, daComprare }
// giorno ('YYYY-MM-DD' dei dati) va in data-oggi: dopo la mezzanotte app.js ricarica la Home
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
        <main data-oggi="${dati.giorno}" class="p-4 space-y-3 pb-24 safe-pb bg-gray-50">
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
                <div class="flex items-center justify-between gap-3 mt-3">
                    <button type="button" id="water-minus-btn" class="${TASTO_ACQUA}" aria-label="Un bicchiere in meno" ${dati.bicchieri ? '' : 'disabled'}>${icona.meno()}</button>
                    <p class="text-[12px] font-semibold text-gray-400 text-center">250 ml a bicchiere</p>
                    <button type="button" id="water-plus-btn" class="${TASTO_ACQUA}" aria-label="Un bicchiere in più">${icona.piu()}</button>
                </div>
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
    // Goccia toccata: tanti bicchieri quanti fino a lei; l'ultima piena si toglie.
    // + e − uno alla volta; col + si può andare oltre i 2 l (le gocce restano tutte piene)
    container.querySelectorAll('.water-drop-btn').forEach(b => b.addEventListener('click', () => {
        const n = Number(b.dataset.index);
        onAcqua(n === dati.bicchieri ? n - 1 : n);
    }));
    document.getElementById('water-minus-btn').addEventListener('click', () => onAcqua(Math.max(0, dati.bicchieri - 1)));
    document.getElementById('water-plus-btn').addEventListener('click', () => onAcqua(dati.bicchieri + 1));
}

// ─── PESO ──────────────────────────────────────────────────────────────────
// Una riga per giorno (l'ultima pesata del giorno). onSalva(kg) con il numero già controllato.
export function renderPeso(container, pesate, { onIndietro, onSalva }) {
    const giorni = unaPerGiorno(pesate);
    const riassunto = riassuntoPeso(pesate);
    const righe = righePesate(pesate);
    const valori = giorni.map(l => Number(l.weight) || 0);
    const riquadro = (etichetta, valore) => `
        <div class="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
            <p class="text-[11px] font-bold text-gray-400">${etichetta}</p> <p class="text-lg font-black text-gray-900">${valore} <span class="text-[11px] font-bold text-gray-400">kg</span></p>
        </div>`;
    const MOSTRATE = 4;

    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="back-weight-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2" aria-label="Indietro">${icona.indietro()}</button>
            <h1 class="text-xl font-bold text-gray-900">Peso</h1>
        </header>
        <main class="p-4 space-y-4 pb-24 safe-pb bg-gray-50">
            <div class="bg-white rounded-[20px] border border-gray-100 shadow-sm p-4">
                <label for="new-weight-input" class="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Peso di oggi</label>
                <div class="flex gap-2">
                    <div class="flex-1 min-w-0 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 focus-within:ring-2 focus-within:ring-gray-900">
                        <input id="new-weight-input" type="text" inputmode="decimal" placeholder="74,8" value="${riassunto ? decimaleKg(riassunto.ultimo) : ''}" class="flex-1 min-w-0 bg-transparent py-3 text-center text-2xl font-black text-gray-900 outline-none">
                        <span class="text-[13px] font-bold text-gray-400">kg</span>
                    </div>
                    <button id="save-weight-btn" class="bg-gray-900 text-white font-black text-[15px] px-6 rounded-xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform">Salva</button>
                </div>
                ${riassunto?.pesatoOggi ? '<p class="text-[12px] font-semibold text-gray-400 mt-2">Ti sei già pesato oggi: salvando aggiorni il valore di oggi.</p>' : ''}
            </div>
            ${giorni.length ? `
                <div class="grid grid-cols-3 gap-2">
                    ${riquadro('Più alto', decimaleKg(Math.max(...valori)))}
                    ${riquadro('Più basso', decimaleKg(Math.min(...valori)))}
                    ${riassunto.variazione !== null ? riquadro(`Dal ${riassunto.dal}`, segno(riassunto.variazione)) : ''}
                </div>
                ${giorni.length > 1 ? `
                    <div class="bg-white p-5 rounded-[20px] border border-gray-100 shadow-sm">
                        <h3 class="text-[15px] font-black text-gray-900">Andamento</h3>
                        <p class="text-[12px] font-medium text-gray-400 mb-4">Le tue pesate, dalla prima all'ultima.</p>
                        <div class="relative h-48 w-full"><canvas id="weightLineChart"></canvas></div>
                    </div>` : ''}
                <div>
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Tutte le pesate</h3>
                    <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">
                        ${righe.map((r, i) => `
                            <div class="riga-pesata py-3 flex justify-between items-baseline gap-2 ${i >= MOSTRATE ? 'hidden' : ''}">
                                <p class="font-bold text-gray-800">${r.giorno}</p> <p class="whitespace-nowrap"><b class="font-black text-gray-900">${r.kg} kg</b> <span class="text-[12px] font-bold text-gray-400 ml-1">${r.differenza}</span></p>
                            </div>`).join('')}
                        ${righe.length > MOSTRATE ? `<button id="mostra-tutte" class="w-full py-3 text-center text-[13px] font-bold text-indigo-600">Mostra tutte (${righe.length})</button>` : ''}
                    </div>
                </div>` : `<p class="text-[14px] font-semibold text-gray-400 text-center py-6">Non ti sei ancora pesato.</p>`}
        </main>
    `;

    document.getElementById('back-weight-btn').addEventListener('click', onIndietro);
    document.getElementById('mostra-tutte')?.addEventListener('click', (e) => {
        container.querySelectorAll('.riga-pesata.hidden').forEach(r => r.classList.remove('hidden'));
        e.currentTarget.remove();
    });
    document.getElementById('save-weight-btn').addEventListener('click', async (e) => {
        const kg = pesoScritto(document.getElementById('new-weight-input').value);
        if (kg === null) return modal.showModal({ type: 'error', title: 'Peso non valido', message: 'Scrivi il peso, per esempio 74,8.' });
        e.currentTarget.disabled = true;
        onSalva(kg);
    });

    // Andamento: dal più vecchio al più recente, date "5 set", numeri con la virgola
    if (giorni.length > 1 && typeof Chart !== 'undefined') {
        const cronologico = [...giorni].reverse();
        new Chart(document.getElementById('weightLineChart'), {
            type: 'line',
            data: {
                labels: cronologico.map(l => new Date(l.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })),
                datasets: [{
                    data: cronologico.map(l => Number(l.weight) || 0), borderColor: '#4F46E5', backgroundColor: 'rgba(79, 70, 229, 0.06)',
                    borderWidth: 3, pointBackgroundColor: '#4F46E5', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4, fill: true, tension: 0.35
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111827', padding: 10, displayColors: false, callbacks: { label: (c) => `${decimaleKg(c.parsed.y)} kg` } } },
                scales: {
                    y: { beginAtZero: false, border: { display: false }, grid: { color: '#f3f4f6' }, ticks: { callback: (v) => decimaleKg(v) } },
                    x: { border: { display: false }, grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } }
                }
            }
        });
    }
}
