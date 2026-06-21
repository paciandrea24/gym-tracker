// public/js/views/HomeView.js

import * as userService from '../services/userService.js';
import * as nutriService from '../services/nutriService.js';
import * as ui from '../ui.js';

export class HomeView {
    constructor(container, onNavigateToGym, onNavigateToNutri) {
        this.container = container;
        this.onNavigateToGym = onNavigateToGym;
        this.onNavigateToNutri = onNavigateToNutri;
    }

    async render() {
        this.container.innerHTML = `<div class="flex items-center justify-center min-h-screen"><p class="text-gray-500 font-bold animate-pulse">Caricamento Riepilogo...</p></div>`;
        try {
            const [waterData, mealsData, weightLogs] = await Promise.all([
                userService.getWater(),
                nutriService.getTodayMeals(),
                userService.getWeightLogs()
            ]);

            const goals = nutriService.getNutritionGoals();
            let consumedCal = 0;
            mealsData.forEach(m => consumedCal += Number(m.calorie) || 0);

            this.generateHTML(waterData.glasses, consumedCal, goals.calorie, weightLogs);
            this.bindEvents(waterData.glasses, weightLogs);
        } catch (e) {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold text-red-500">Errore di connessione al server.</div>`;
        }
    }

    generateHTML(waterGlasses, consumedCal, goalCal, weightLogs) {
        const dateOpts = { weekday: 'long', day: 'numeric', month: 'long' };
        let dateStr = new Date().toLocaleDateString('it-IT', dateOpts);
        dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

        const remainingCal = Math.max(0, goalCal - consumedCal);

        const lastWeight = weightLogs && weightLogs.length > 0 ? weightLogs[0].weight : '--';
        const lastWeightDate = weightLogs && weightLogs.length > 0
            ? new Date(weightLogs[0].date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
            : 'Tocca per inserire';

        let dropsHtml = '';
        for (let i = 1; i <= 8; i++) {
            const isFull = i <= waterGlasses;
            dropsHtml += `<svg data-index="${i}" class="water-drop-btn w-7 h-7 cursor-pointer active:scale-90 transition-transform ${isFull ? 'text-[#60A5FA]' : 'text-gray-200'}" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c-5.33 5.58-8 9.24-8 12.83A8.04 8.04 0 0012 22a8.04 8.04 0 008-7.17C20 11.24 17.33 7.58 12 2z"/></svg>`;
        }

        this.container.innerHTML = `
            <header class="pt-12 pb-2 px-6 sticky top-0 z-10 bg-[#f9fafb]/90 backdrop-blur-md">
                <h1 class="text-[28px] font-black text-gray-900 tracking-tight">Ciao Andrea! 👋</h1>
                <p class="text-sm font-medium text-gray-400 mt-0.5">${dateStr}</p>
            </header>

            <main class="p-5 space-y-4 pb-24 bg-[#f9fafb]">
                <div class="grid grid-cols-2 gap-4">
                    <div id="home-weight-card" class="bg-white p-4 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-center aspect-square cursor-pointer active:scale-95 transition-transform">
                        <span class="font-bold text-gray-800 text-xs mb-1 flex items-center gap-1">Peso <span class="text-sm">⚖️</span></span>
                        <div class="text-[36px] mb-1 font-black text-gray-900 leading-tight tracking-tight">${lastWeight}</div>
                        <p class="text-[13px] font-bold text-gray-400 mt-0.5">kg</p>
                        <p class="text-[10px] font-medium text-gray-400 mt-2">${lastWeightDate}</p>
                    </div>
                    
                    <div id="home-calorie-card" class="bg-white p-4 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-center aspect-square cursor-pointer active:scale-95 transition-transform">
                        <span class="font-bold text-gray-800 text-xs mb-1 flex items-center gap-1">Calorie <span class="text-yellow-400 text-sm">⚡</span></span>
                        <div class="w-12 h-12 rounded-full border-[3px] border-gray-100 border-t-gray-800 flex items-center justify-center mb-1">
                            <svg class="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <p class="text-[13px] font-bold text-gray-900 leading-tight">${Number(consumedCal).toFixed(0)} <span class="text-[10px] font-normal text-gray-500">/ ${goalCal}</span></p>
                        <p class="text-[10px] font-medium text-gray-400 mt-0.5">${Number(remainingCal).toFixed(0)} rimaste</p>
                    </div>
                </div>

                <div class="bg-white p-5 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div class="flex justify-between items-center mb-4">
                        <span class="font-bold text-gray-800 flex items-center gap-1.5 text-sm">
                            Idratazione <svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c-5.33 5.58-8 9.24-8 12.83A8.04 8.04 0 0012 22a8.04 8.04 0 008-7.17C20 11.24 17.33 7.58 12 2z"/></svg>
                        </span>
                        <span class="text-[11px] font-bold text-gray-500">${waterGlasses * 250} ml / 2000 ml</span>
                    </div>
                    <div class="flex justify-between items-center px-1 mb-4">
                        ${dropsHtml}
                    </div>
                    <div class="flex justify-between px-2">
                        <button id="water-minus-btn" class="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-1.5 rounded-lg font-bold text-sm transition-colors active:scale-90">-</button>
                        <button id="water-plus-btn" class="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-1.5 rounded-lg font-bold text-sm transition-colors active:scale-90">+</button>
                    </div>
                </div>

                <div class="space-y-3 pt-2">
                    <h3 class="text-[13px] font-bold text-gray-800 ml-1">Azioni Rapide</h3>
                    
                    <button id="home-start-workout-btn" class="w-full bg-black text-white font-bold text-[15px] py-4 rounded-[18px] shadow-[0_8px_20px_rgb(0,0,0,0.15)] flex justify-center items-center gap-2 transition-transform active:scale-95">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Inizia Allenamento
                    </button>
                    
                    <button id="home-add-meal-btn" class="w-full bg-[#f3f4f6] text-gray-800 font-bold text-[15px] py-4 rounded-[18px] flex justify-center items-center gap-2 transition-transform active:scale-95">
                        <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.898 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        Aggiungi Pasto
                    </button>
                </div>
            </main>
        `;
    }

    bindEvents(waterGlasses, weightLogs) {
        document.getElementById('home-calorie-card').addEventListener('click', () => this.onNavigateToNutri(false));
        document.getElementById('home-start-workout-btn').addEventListener('click', this.onNavigateToGym);
        document.getElementById('home-add-meal-btn').addEventListener('click', () => this.onNavigateToNutri(true));

        document.getElementById('home-weight-card').addEventListener('click', () => {
            this.showWeightPage(weightLogs);
        });

        this.container.querySelectorAll('.water-drop-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = parseInt(e.currentTarget.dataset.index, 10);
                let newTotal = index;
                if (index === waterGlasses) newTotal = index - 1;
                await this.updateWater(newTotal);
            });
        });

        document.getElementById('water-minus-btn').addEventListener('click', async () => { if (waterGlasses > 0) await this.updateWater(waterGlasses - 1); });
        document.getElementById('water-plus-btn').addEventListener('click', async () => { if (waterGlasses < 8) await this.updateWater(waterGlasses + 1); });
    }

    async updateWater(newAmount) {
        try {
            await userService.updateWater(newAmount);
            this.render();
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