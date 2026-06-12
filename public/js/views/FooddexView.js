// public/js/views/FooddexView.js

import * as fooddexService from '../services/fooddexService.js';
import * as scanner from '../components/scanner.js';
import * as modal from '../components/modal.js';

export class FooddexView {
    constructor(container, onNavigateHome) {
        this.container = container;
        this.onNavigateHome = onNavigateHome;
        this.items = [];
    }

    async render() {
        this.container.innerHTML = `<div class="flex justify-center items-center min-h-screen"><p class="animate-pulse font-bold text-red-600">Accesso al FoodDex...</p></div>`;

        try {
            this.items = await fooddexService.getFoodDexItems();
            this.generateHTML();
            this.bindEvents();
        } catch (e) {
            await modal.showModal({ type: 'error', title: 'Errore', message: "Errore caricamento FoodDex." });
            this.onNavigateHome();
        }
    }

    generateHTML() {
        const count = this.items.length;
        let rank = "Allenatore Novellino";
        let nextGoal = 12;

        if (count >= 12) { rank = "Ricercatore di Macro"; nextGoal = 50; }
        if (count >= 50) { rank = "Capopalestra Nutrizionale"; nextGoal = 150; }
        if (count >= 150) { rank = "Maestro della Dieta"; nextGoal = 500; }

        const progress = Math.min(100, (count / nextGoal) * 100);

        const getTypeColor = (tipo) => {
            if (!tipo) return 'bg-gray-100 text-gray-600';
            if (tipo.includes('Lotta')) return 'bg-orange-100 text-orange-600';
            if (tipo.includes('Erba')) return 'bg-green-100 text-green-600';
            if (tipo.includes('Fuoco')) return 'bg-red-100 text-red-600';
            if (tipo.includes('Folletto')) return 'bg-pink-100 text-pink-600';
            if (tipo.includes('Terra')) return 'bg-amber-100 text-amber-700';
            return 'bg-gray-100 text-gray-600';
        };

        this.container.innerHTML = `
            <header class="bg-red-600 shadow-xl pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center text-white">
                <button id="back-fooddex-btn" class="mr-3 text-white/80 hover:text-white p-2 -ml-2 active:scale-90 transition-transform">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <h1 class="text-xl font-black truncate flex items-center gap-2">
                    <span class="text-2xl">📱</span> FoodDex
                </h1>
            </header>
            
            <main class="p-4 space-y-5 pb-32 bg-gray-50 min-h-screen">
                <div class="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                    <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner">📖</div>
                    <h2 class="text-2xl font-black text-gray-900">${count} Alimenti Scoperti</h2>
                    <p class="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">${rank}</p>
                    
                    <div class="w-full mt-5">
                        <div class="flex justify-between text-[10px] font-bold text-gray-400 mb-1.5 px-1">
                            <span>Progresso Livello</span>
                            <span>${count} / ${nextGoal}</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div class="bg-red-500 h-2.5 rounded-full transition-all duration-1000" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>

                <button id="scan-fooddex-btn" class="w-full bg-red-600 text-white font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgba(220,38,38,0.3)] active:scale-95 transition-transform flex justify-center items-center gap-2">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                    Cattura Nuovo Alimento
                </button>

                <div id="fooddex-scanner-container" class="hidden bg-gray-900 p-2 rounded-2xl shadow-xl border border-gray-800">
                    <p class="text-center text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Inquadra un codice a barre</p>
                    <video id="fooddex-reader-video" class="w-full rounded-xl overflow-hidden mb-3 bg-black min-h-[250px]" autoplay playsinline></video>
                    <button id="close-fooddex-scanner-btn" class="w-full bg-gray-700 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform">Annulla</button>
                </div>

                <div class="space-y-3 pt-2">
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Registri FoodDex</h3>
                    ${this.items.length === 0 ? `
                        <p class="text-center text-gray-500 font-bold mt-10">Il tuo FoodDex è vuoto. Inizia l'avventura!</p>
                    ` : this.items.map(item => `
                        <div class="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                            ${item.immagine ? `<img src="${item.immagine}" class="w-16 h-16 object-cover rounded-xl border border-gray-100 shadow-sm flex-shrink-0">` : `<div class="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0">🍲</div>`}
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-start mb-1">
                                    <h4 class="font-bold text-gray-900 truncate pr-2">${item.nome}</h4>
                                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${getTypeColor(item.tipoAlimento)}">${item.tipoAlimento || 'Normale 🟢'}</span>
                                </div>
                                <div class="mt-1 flex flex-wrap gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                    <span>Pro: ${item.proteine100}g</span>
                                    <span>Car: ${item.carbo100}g</span>
                                    <span>Fat: ${item.grassi100}g</span>
                                    <span class="text-indigo-400">📦 ${item.pesoConfezione > 0 ? item.pesoConfezione + 'g' : '?'}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </main>
        `;
    }

    bindEvents() {
        document.getElementById('back-fooddex-btn').addEventListener('click', this.onNavigateHome);

        document.getElementById('scan-fooddex-btn').addEventListener('click', () => {
            document.getElementById('scan-fooddex-btn').classList.add('hidden');
            document.getElementById('fooddex-scanner-container').classList.remove('hidden');

            scanner.startScanner(
                'fooddex-reader-video',
                (barcode) => this.fetchFoodDexProduct(barcode),
                async (errorMsg) => {
                    await modal.showModal({ type: 'error', title: 'Errore Scanner', message: errorMsg });
                    this.render();
                }
            );
        });

        document.getElementById('close-fooddex-scanner-btn').addEventListener('click', () => {
            scanner.stopScanner();
            this.render();
        });
    }

    async fetchFoodDexProduct(barcode) {
        this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse text-red-600">Analisi del selvatico in corso... 🔍</div>`;

        try {
            const data = await fooddexService.fetchOpenFoodFacts(barcode);

            if (data.status === 1) {
                const p = data.product;
                const name = p.product_name || "Alimento Misterioso";
                const img = p.image_front_url || "";
                const n = p.nutriments || {};

                let cal = n['energy-kcal_100g'];
                if (cal === undefined || cal === null) {
                    if (n['energy-kj_100g']) cal = n['energy-kj_100g'] / 4.184;
                    else if (n['energy_100g']) cal = n['energy_100g'] / 4.184;
                    else cal = 0;
                }
                if (cal > 900) cal = cal / 4.184;
                cal = parseFloat(Number(cal).toFixed(1));

                const pro = n['proteins_100g'] || 0;
                const carbo = n['carbohydrates_100g'] || 0;
                const fat = n['fat_100g'] || 0;

                let type = "Normale 🟢";
                if (pro >= 15 && pro > carbo && pro > fat) type = "Lotta 🥊";
                else if (cal < 50 || name.toLowerCase().includes("verdura") || name.toLowerCase().includes("insalata")) type = "Erba 🌿";
                else if (fat >= 20) type = "Fuoco 🔥";
                else if (carbo >= 50 && (n['sugars_100g'] || 0) >= 15) type = "Folletto 🧚";
                else if (carbo >= 50) type = "Terra 🪨";

                let pesoConfezione = 0;

                if (p.product_quantity) {
                    pesoConfezione = parseFloat(p.product_quantity);
                } else if (p.quantity) {
                    const match = p.quantity.match(/(\d+[\.,]?\d*)/);
                    if (match) pesoConfezione = parseFloat(match[1].replace(',', '.'));
                }

                if (pesoConfezione === 0 || isNaN(pesoConfezione)) {
                    const pesoConfezioneStr = await modal.showModal({
                        type: 'prompt',
                        title: 'Peso Sconosciuto',
                        message: `Ho trovato: ${name}\n\nIl database però non specifica il formato. Quanto pesa l'intera confezione in GRAMMI?`,
                        inputValue: "500"
                    });

                    if (pesoConfezioneStr === null || pesoConfezioneStr === false) return this.render();
                    pesoConfezione = parseFloat(pesoConfezioneStr) || 0;
                }

                const newItem = {
                    barcode: barcode, nome: name, immagine: img, calorie100: cal,
                    proteine100: pro, carbo100: carbo, grassi100: fat,
                    pesoConfezione: pesoConfezione, tipoAlimento: type
                };

                const saveRes = await fooddexService.saveFoodDexItem(newItem);

                if (saveRes.ok) {
                    const responseData = saveRes.data;

                    if (responseData.alreadyCaught) {
                        await modal.showModal({ type: 'alert', title: 'Già registrato', message: `Hai già catturato "${name}" nel tuo FoodDex!` });
                    } else {
                        const allItems = await fooddexService.getFoodDexItems();
                        const newCount = allItems.length;

                        let leveledUpTo = null;
                        let levelIcon = null;

                        if (newCount === 12) { leveledUpTo = "Ricercatore di Macro"; levelIcon = "🔬"; }
                        else if (newCount === 50) { leveledUpTo = "Capopalestra Nutrizionale"; levelIcon = "🏛️"; }
                        else if (newCount === 150) { leveledUpTo = "Maestro della Dieta"; levelIcon = "👑"; }
                        else if (newCount === 500) { leveledUpTo = "Leggenda Suprema"; levelIcon = "🌟"; }

                        if (leveledUpTo) {
                            await modal.showLevelUpSurprise(leveledUpTo, levelIcon, newCount);
                        } else {
                            if ("vibrate" in navigator) navigator.vibrate([100, 50, 100, 50, 200]);
                            const msgPeso = pesoConfezione > 0 ? `\n📦 Formato: ${pesoConfezione}g` : `\n📦 Formato: Sconosciuto`;
                            await modal.showModal({ type: 'success', title: '🎉 PRESO!', message: `Hai registrato:\n"${name}"\n\nAppartiene al Tipo: ${type}${msgPeso}` });
                        }
                    }
                    this.render();
                } else {
                    await modal.showModal({ type: 'error', title: 'Errore', message: "Errore nel salvataggio nel database." });
                    this.render();
                }

            } else {
                await modal.showModal({ type: 'error', title: 'Mancato!', message: "Il prodotto è fuggito (non trovato sul database mondiale)." });
                this.render();
            }
        } catch (e) {
            await modal.showModal({ type: 'error', title: 'Errore di Rete', message: "Errore di connessione al database degli alimenti." });
            this.render();
        }
    }
}