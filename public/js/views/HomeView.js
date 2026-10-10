// public/js/views/HomeView.js
// Home: carica i dati della giornata e collega i riquadri alle sezioni. Il disegno è in homeUi.js.

import * as userService from '../services/userService.js?v=32';
import * as nutriService from '../services/nutriService.js?v=32';
import * as gymService from '../services/gymService.js?v=32';
import * as pantryService from '../services/pantryService.js?v=32';
import { daComprare } from '../services/pantryLogic.js?v=32';
import * as homeUi from './homeUi.js?v=32';

export class HomeView {
    // navigazione: { onNutrizione, onPalestra, onSpesa } (le passa app.js)
    constructor(container, navigazione) {
        this.container = container;
        this.navigazione = navigazione;
        this.dati = null;
    }

    async render() {
        this.container.innerHTML = `<div class="flex items-center justify-center min-h-screen"><p class="text-gray-500 font-bold animate-pulse">Caricamento...</p></div>`;
        try {
            const [acqua, pasti, pesate] = await Promise.all([userService.getWater(), nutriService.getTodayMeals(), userService.getWeightLogs()]);
            // Palestra e dispensa sono in più: se non rispondono la Home si mostra lo stesso
            const [schede, storico, dispensa] = await Promise.all([
                gymService.getRoutines().catch(() => []),
                gymService.getAllHistory().catch(() => []),
                pantryService.getPantryItems().catch(() => [])
            ]);
            this.dati = {
                pasti: Array.isArray(pasti) ? pasti : [],
                goals: nutriService.getNutritionGoals(),
                bicchieri: Number(acqua?.glasses) || 0,
                pesate: Array.isArray(pesate) ? pesate : [],
                allenamento: this.statoAllenamento(Array.isArray(schede) ? schede : [], Array.isArray(storico) ? storico : []),
                daComprare: daComprare(Array.isArray(dispensa) ? dispensa : [])
            };
        } catch (e) {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold text-red-500">Non riesco a caricare la Home. Controlla la connessione.</div>`;
            return;
        }
        this.disegna();
    }

    // Allenamento a metà (sessione in corso) o ultimo allenamento salvato, con il nome della scheda
    statoAllenamento(schede, storico) {
        const nomeScheda = (id) => schede.find(r => r.id === id)?.name || '';
        const sessione = gymService.getActiveSession();
        if (sessione) return { inCorso: true, daFare: (sessione.todo || []).length, ultimo: null, scheda: nomeScheda(sessione.routineId) };
        const ultimo = storico.reduce((m, h) => (!m || h.endTime > m.endTime) ? h : m, null);
        return { inCorso: false, daFare: 0, ultimo: ultimo?.endTime || null, scheda: ultimo ? nomeScheda(ultimo.routineId) : '' };
    }

    disegna() {
        homeUi.renderHome(this.container, this.dati, {
            onNutrizione: () => this.navigazione.onNutrizione(),
            onPalestra: () => this.navigazione.onPalestra(),
            onSpesa: () => this.navigazione.onSpesa(),
            onPeso: () => this.showWeightPage(this.dati.pesate),
            onAcqua: (bicchieri) => this.updateWater(bicchieri)
        });
    }

    async updateWater(bicchieri) {
        try {
            await userService.updateWater(bicchieri);
            this.dati.bicchieri = bicchieri;
            this.disegna();
        } catch (e) { console.error("Errore salvataggio acqua", e); }
    }

    async showWeightPage(weightLogs) {
        const logs = weightLogs || [];

        const weights = logs.map(l => l.weight);
        const maxWeight = weights.length > 0 ? Math.max(...weights) : '--';
        const minWeight = weights.length > 0 ? Math.min(...weights) : '--';

        let variazioneTotale = '--';
        if (weights.length > 1) {
            const diff = weights[0] - weights[weights.length - 1];
            variazioneTotale = (diff > 0 ? '+' : '') + diff.toFixed(1) + ' kg';
        }

        const historyHtml = logs.length === 0
            ? `<p class="text-center text-sm font-medium text-gray-500 py-4">Nessun peso registrato finora.</p>`
            : logs.map(log => `
                <div class="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl border border-gray-100 shadow-sm">
                    <span class="text-xs font-bold text-gray-500">
                        ${new Date(log.date).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </span>
                    <span class="font-black text-gray-900 text-base">${log.weight} <span class="text-xs font-bold text-gray-400">kg</span></span>
                </div>
            `).join('');

        this.container.innerHTML = `
            <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center justify-between">
                <div class="flex items-center">
                    <button id="back-weight-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2 active:scale-90 transition-transform">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <h1 class="text-xl font-bold text-gray-900 truncate">Registro Peso</h1>
                </div>
            </header>

            <main class="p-4 space-y-5 pb-24 safe-pb bg-gray-50 min-h-screen">
                <div class="bg-white p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
    <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Registra Peso di Oggi</label>
    <div class="flex w-full gap-2">
        <input type="number" id="new-weight-input" step="0.1" inputmode="decimal" placeholder="es. 75.4" value="${logs.length > 0 ? logs[0].weight : ''}" class="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-black text-center text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
        
        <button id="save-weight-btn" class="flex-shrink-0 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm px-6 rounded-xl active:scale-95 transition-transform shadow-md">
            Salva
        </button>
    </div>
</div>

                <div class="grid grid-cols-3 gap-2">
                    <div class="text-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                        <p class="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Max Storico</p>
                        <p class="text-base font-black text-gray-800">${maxWeight}${maxWeight !== '--' ? '<span class="text-[10px] font-medium text-gray-400">kg</span>' : ''}</p>
                    </div>
                    <div class="text-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                        <p class="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Min Storico</p>
                        <p class="text-base font-black text-gray-800">${minWeight}${minWeight !== '--' ? '<span class="text-[10px] font-medium text-gray-400">kg</span>' : ''}</p>
                    </div>
                    <div class="text-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                        <p class="text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Variazione</p>
                        <p class="text-base font-black text-indigo-600">${variazioneTotale}</p>
                    </div>
                </div>

                <div class="bg-white p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                    <div class="flex justify-between items-center mb-1">
                        <h3 class="text-xs font-bold text-gray-900 uppercase tracking-widest">Andamento nel tempo</h3>
                        <span class="text-lg">📉</span>
                    </div>
                    <p class="text-[11px] text-gray-400 mb-4 font-medium">Visualizzazione cronologica delle tue pesate.</p>
                    <div class="relative h-48 w-full">
                        <canvas id="weightLineChart"></canvas>
                    </div>
                </div>

                <div class="bg-white p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 space-y-2.5">
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Tutte le pesate</h3>
                    ${historyHtml}
                </div>
            </main>
        `;

        document.getElementById('back-weight-btn').addEventListener('click', () => this.render());

        document.getElementById('save-weight-btn').addEventListener('click', async () => {
            const inputVal = document.getElementById('new-weight-input').value.replace(',', '.');
            const weightNum = parseFloat(inputVal);

            if (!isNaN(weightNum) && weightNum > 0) {
                document.getElementById('save-weight-btn').disabled = true;
                document.getElementById('save-weight-btn').innerText = '...';

                await userService.addWeightLog(weightNum);

                const updatedLogs = await userService.getWeightLogs();
                this.showWeightPage(updatedLogs);
            } else {
                alert("Inserisci un peso valido numerico.");
            }
        });

        if (logs.length > 0) {
            const chronologicalLogs = [...logs].reverse();
            const labels = chronologicalLogs.map(l => new Date(l.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }));
            const dataPoints = chronologicalLogs.map(l => l.weight);

            const ctx = document.getElementById('weightLineChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataPoints,
                        borderColor: '#4F46E5',
                        backgroundColor: 'rgba(79, 70, 229, 0.06)',
                        borderWidth: 3,
                        pointBackgroundColor: '#4F46E5',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        fill: true,
                        tension: 0.35
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: '#111827', padding: 10 }
                    },
                    scales: {
                        y: { beginAtZero: false, border: { display: false }, grid: { color: '#f3f4f6' } },
                        x: { border: { display: false }, grid: { display: false } }
                    }
                }
            });
        }
    }
}