// public/js/views/PantryView.js

import * as pantryService from '../services/pantryService.js';
import * as scanner from '../components/scanner.js';
import * as modal from '../components/modal.js';

const CATEGORIE = ['Proteina', 'Carboidrato', 'Latticino', 'Verdura', 'Frutta', 'Condimento/Grassi', 'Altro'];

const CATEGORIA_STYLE = {
    'Proteina': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', icon: '🥩' },
    'Carboidrato': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: '🌾' },
    'Latticino': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: '🥛' },
    'Verdura': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', icon: '🥦' },
    'Frutta': { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100', icon: '🍎' },
    'Condimento/Grassi': { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100', icon: '🫒' },
    'Altro': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', icon: '📦' },
};

export class PantryView {
    constructor(container) {
        this.container = container;
        this.items = [];
        this.filtroCategoria = 'Tutti';
        this.filtroStato = 'tutti'; // tutti | ok | bassa | esaurito
        this.isRecording = false;
        this.currentRecognition = null;
    }

    async render() {
        this.container.innerHTML = `
            <div class="flex justify-center items-center min-h-screen">
                <p class="animate-pulse font-bold text-green-600">Caricamento dispensa...</p>
            </div>`;
        try {
            this.items = await pantryService.getPantryItems();
            this.generateHTML();
            this.bindEvents();
        } catch (e) {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold text-red-500">Errore caricamento dispensa.</div>`;
        }
    }

    // ─── RENDER PRINCIPALE ──────────────────────────────────────────────────────
    generateHTML() {
        const totale = this.items.length;
        const scarseScorete = this.items.filter(i => i.scortaBassa).length;
        const esauriti = this.items.filter(i => i.esaurito).length;

        // Filtraggio
        let filtered = [...this.items];
        if (this.filtroCategoria !== 'Tutti') {
            filtered = filtered.filter(i => i.categoria === this.filtroCategoria);
        }
        if (this.filtroStato === 'ok') {
            filtered = filtered.filter(i => !i.scortaBassa && !i.esaurito);
        } else if (this.filtroStato === 'bassa') {
            filtered = filtered.filter(i => i.scortaBassa);
        } else if (this.filtroStato === 'esaurito') {
            filtered = filtered.filter(i => i.esaurito);
        }

        const itemsHtml = filtered.length === 0
            ? `<div class="text-center py-12 text-gray-400 font-medium">Nessun prodotto trovato.</div>`
            : filtered.map(item => this.renderItemCard(item)).join('');

        this.container.innerHTML = `
            <header class="bg-white shadow-sm pt-12 pb-3 px-4 sticky top-0 z-10">
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <h1 class="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            🏪 Dispensa
                        </h1>
                        <p class="text-xs text-gray-400 font-medium mt-0.5">${totale} prodotti
                            ${scarseScorete > 0 ? `• <span class="text-orange-500 font-bold">${scarseScorete} in esaurimento</span>` : ''}
                            ${esauriti > 0 ? `• <span class="text-red-500 font-bold">${esauriti} esauriti</span>` : ''}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <button id="voice-add-btn"
                            class="bg-gray-100 text-gray-700 p-2.5 rounded-xl active:scale-95 transition-transform"
                            title="Aggiungi a voce">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                            </svg>
                        </button>
                        <button id="scan-add-btn"
                            class="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-transform flex items-center gap-1.5 shadow-md">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                            </svg>
                            Scanner
                        </button>
                    </div>
                </div>

                <!-- Filtro stato -->
                <div class="flex gap-2 mb-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                    ${['tutti', 'ok', 'bassa', 'esaurito'].map(s => {
            const labels = { tutti: 'Tutti', ok: '✅ OK', bassa: '⚠️ In esaur.', esaurito: '🔴 Esauriti' };
            const active = this.filtroStato === s;
            return `<button data-stato="${s}"
                            class="stato-filter flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all
                            ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}">
                            ${labels[s]}
                        </button>`;
        }).join('')}
                </div>

                <!-- Filtro categoria -->
                <div class="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                    ${['Tutti', ...CATEGORIE].map(cat => {
            const active = this.filtroCategoria === cat;
            const style = CATEGORIA_STYLE[cat];
            return `<button data-cat="${cat}"
                            class="cat-filter flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all
                            ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}">
                            ${style ? style.icon + ' ' : ''}${cat}
                        </button>`;
        }).join('')}
                </div>
            </header>

            <!-- Scanner container -->
            <div id="scanner-container" class="hidden mx-4 mt-4 bg-gray-900 p-2 rounded-2xl shadow-xl border border-gray-800">
                <p class="text-center text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Inquadra il codice a barre</p>
                <video id="pantry-reader-video" class="w-full rounded-xl overflow-hidden mb-3 bg-black min-h-[220px]" autoplay playsinline></video>
                <div class="flex gap-2">
                    <input type="number" id="qty-input" value="1" min="1" max="99"
                        class="w-20 bg-gray-800 text-white text-center font-bold rounded-xl p-2 text-lg border border-gray-700 outline-none">
                    <label class="text-xs text-gray-400 font-medium self-center">confezioni</label>
                    <button id="close-scanner-btn" class="flex-1 bg-red-500 text-white font-bold py-2 rounded-xl active:scale-95 transition-transform">
                        Annulla
                    </button>
                </div>
            </div>

            <main class="p-4 space-y-3 pb-32 bg-gray-50 min-h-screen">
                ${itemsHtml}
            </main>
        `;
    }

    renderItemCard(item) {
        const style = CATEGORIA_STYLE[item.categoria] || CATEGORIA_STYLE['Altro'];
        const perc = item.grammiTotali > 0 ? (item.grammiRimasti / item.grammiTotali) * 100 : 0;
        const percRounded = Math.max(0, Math.min(100, perc));

        let barColor = 'bg-green-500';
        let borderClass = 'border-gray-100';
        let badge = '';

        if (item.esaurito) {
            barColor = 'bg-gray-300';
            borderClass = 'border-red-200';
            badge = `<span class="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">Esaurito</span>`;
        } else if (item.scortaBassa) {
            barColor = 'bg-orange-400';
            borderClass = 'border-orange-200';
            badge = `<span class="text-[9px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase animate-pulse">⚠️ Scorta bassa</span>`;
        }

        return `
            <div class="pantry-item-card bg-white rounded-2xl border ${borderClass} shadow-sm p-4 cursor-pointer active:scale-95 transition-transform"
                data-id="${item._id}">
                <div class="flex items-start gap-3">
                    ${item.immagine
                ? `<img src="${item.immagine}" class="w-14 h-14 object-cover rounded-xl border border-gray-100 flex-shrink-0">`
                : `<div class="w-14 h-14 ${style.bg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border ${style.border}">${style.icon}</div>`
            }
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="font-bold text-gray-900 leading-tight truncate pr-2">${item.nome}</h3>
                            ${badge}
                        </div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-[9px] font-bold ${style.bg} ${style.text} px-2 py-0.5 rounded-full">${style.icon} ${item.categoria}</span>
                            <span class="text-[10px] text-gray-400 font-medium">${item.grammiRimasti}g rimasti / ${item.grammiTotali}g</span>
                        </div>

                        <!-- Barra progresso -->
                        <div class="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden">
                            <div class="${barColor} h-1.5 rounded-full transition-all" style="width: ${percRounded}%"></div>
                        </div>

                        <!-- Macro per 100g -->
                        <div class="flex gap-3 text-[9px] font-bold text-gray-400 uppercase">
                            <span>P: ${item.proteine100}g</span>
                            <span>C: ${item.carbo100}g</span>
                            <span>G: ${item.grassi100}g</span>
                            <span class="text-gray-500">${item.calorie100} kcal/100g</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ─── DETTAGLIO ARTICOLO + CRONOLOGIA ────────────────────────────────────────
    async showItemDetail(itemId) {
        const item = this.items.find(i => String(i._id) === String(itemId));
        if (!item) return;

        this.container.innerHTML = `
            <div class="flex justify-center items-center min-h-screen">
                <p class="animate-pulse font-bold text-gray-500">Caricamento...</p>
            </div>`;

        const usage = await pantryService.getPantryItemUsage(itemId);
        const style = CATEGORIA_STYLE[item.categoria] || CATEGORIA_STYLE['Altro'];
        const perc = item.grammiTotali > 0 ? (item.grammiRimasti / item.grammiTotali) * 100 : 0;

        let barColor = perc > 20 ? 'bg-green-500' : (perc > 0 ? 'bg-orange-400' : 'bg-gray-300');

        const usageHtml = usage.length === 0
            ? `<p class="text-center text-gray-400 font-medium py-6">Nessun utilizzo registrato.</p>`
            : usage.map(u => `
                <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div>
                        <p class="text-sm font-bold text-gray-800">${u.nomePasto}</p>
                        <p class="text-[10px] text-gray-400 font-medium mt-0.5">
                            ${new Date(u.data).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                            • ${new Date(u.data).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <span class="font-black text-gray-900 text-sm">-${u.grammiScalati}g</span>
                </div>
            `).join('');

        this.container.innerHTML = `
            <header class="bg-white shadow-sm pt-12 pb-4 px-4 sticky top-0 z-10 flex items-center gap-3">
                <button id="back-detail-btn" class="text-gray-500 p-2 -ml-2 active:scale-90 transition-transform">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                </button>
                <h1 class="text-xl font-black text-gray-900 truncate">${item.nome}</h1>
            </header>

            <main class="p-4 space-y-5 pb-32 bg-gray-50">

                <!-- Card principale -->
                <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                    <div class="flex items-center gap-4 mb-5">
                        ${item.immagine
                ? `<img src="${item.immagine}" class="w-20 h-20 object-cover rounded-2xl border border-gray-100">`
                : `<div class="w-20 h-20 ${style.bg} rounded-2xl flex items-center justify-center text-4xl border ${style.border}">${style.icon}</div>`
            }
                        <div>
                            <span class="text-[10px] font-bold ${style.bg} ${style.text} px-2.5 py-1 rounded-full">${style.icon} ${item.categoria}</span>
                            <p class="text-2xl font-black text-gray-900 mt-1">${item.grammiRimasti}g</p>
                            <p class="text-xs text-gray-400 font-medium">rimasti su ${item.grammiTotali}g totali</p>
                        </div>
                    </div>

                    <!-- Barra progresso grande -->
                    <div class="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden">
                        <div class="${barColor} h-3 rounded-full" style="width: ${Math.max(0, Math.min(100, perc))}%"></div>
                    </div>

                    <!-- Macro per 100g -->
                    <div class="grid grid-cols-4 gap-2 mb-5">
                        <div class="bg-gray-50 p-2 rounded-xl text-center border border-gray-100">
                            <p class="text-[9px] font-bold text-gray-400 uppercase">Kcal</p>
                            <p class="font-black text-gray-900 text-sm">${item.calorie100}</p>
                        </div>
                        <div class="bg-blue-50 p-2 rounded-xl text-center border border-blue-100">
                            <p class="text-[9px] font-bold text-blue-400 uppercase">Pro</p>
                            <p class="font-black text-blue-700 text-sm">${item.proteine100}g</p>
                        </div>
                        <div class="bg-green-50 p-2 rounded-xl text-center border border-green-100">
                            <p class="text-[9px] font-bold text-green-500 uppercase">Car</p>
                            <p class="font-black text-green-700 text-sm">${item.carbo100}g</p>
                        </div>
                        <div class="bg-yellow-50 p-2 rounded-xl text-center border border-yellow-100">
                            <p class="text-[9px] font-bold text-yellow-600 uppercase">Fat</p>
                            <p class="font-black text-yellow-700 text-sm">${item.grassi100}g</p>
                        </div>
                    </div>

                    <!-- Azioni -->
                    <div class="flex gap-2">
                        <button id="restock-btn" data-id="${item._id}"
                            class="flex-1 bg-green-50 text-green-700 border border-green-200 font-bold text-sm py-3 rounded-xl active:scale-95 transition-transform">
                            ➕ Rifornisci
                        </button>
                        <button id="edit-grams-btn" data-id="${item._id}"
                            class="flex-1 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-sm py-3 rounded-xl active:scale-95 transition-transform">
                            ✏️ Modifica g
                        </button>
                        <button id="delete-item-btn" data-id="${item._id}"
                            class="bg-red-50 text-red-500 border border-red-100 font-bold text-sm px-4 py-3 rounded-xl active:scale-95 transition-transform">
                            🗑️
                        </button>
                    </div>
                </div>

                <!-- Cronologia utilizzi -->
                <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                        Cronologia Utilizzi
                    </h3>
                    <div class="space-y-2">
                        ${usageHtml}
                    </div>
                </div>
            </main>
        `;

        document.getElementById('back-detail-btn').addEventListener('click', () => this.render());

        document.getElementById('restock-btn').addEventListener('click', async () => {
            const qtyStr = await modal.showModal({
                type: 'prompt',
                title: '➕ Rifornimento',
                message: `Quante confezioni di "${item.nome}" hai acquistato?\n(Peso confezione: ${item.pesoConfezione}g)`,
                inputValue: '1'
            });
            if (!qtyStr || qtyStr === false) return;
            const qty = parseInt(qtyStr) || 1;
            const grammiDaAggiungere = qty * item.pesoConfezione;
            await pantryService.updatePantryItem(item._id, {
                quantitaConfezioni: item.quantitaConfezioni + qty,
                grammiTotali: item.grammiTotali + grammiDaAggiungere,
                grammiRimasti: item.grammiRimasti + grammiDaAggiungere
            });
            this.render();
        });

        document.getElementById('edit-grams-btn').addEventListener('click', async () => {
            const newGrams = await modal.showModal({
                type: 'prompt',
                title: '✏️ Modifica Grammi Rimasti',
                message: `Inserisci i grammi effettivamente rimasti in dispensa:`,
                inputValue: String(item.grammiRimasti)
            });
            if (!newGrams || newGrams === false) return;
            await pantryService.updatePantryItem(item._id, {
                grammiRimasti: Math.max(0, parseFloat(newGrams) || 0)
            });
            this.render();
        });

        document.getElementById('delete-item-btn').addEventListener('click', async () => {
            const ok = await modal.showModal({
                type: 'confirm',
                title: 'Rimuovi dalla dispensa',
                message: `Vuoi rimuovere "${item.nome}" dalla dispensa?`,
                confirmText: 'Sì, rimuovi',
                cancelText: 'Annulla'
            });
            if (!ok) return;
            await pantryService.deletePantryItem(item._id);
            this.render();
        });
    }

    // ─── EVENTI PRINCIPALI ──────────────────────────────────────────────────────
    bindEvents() {
        // Click su card articolo
        this.container.querySelectorAll('.pantry-item-card').forEach(card => {
            card.addEventListener('click', () => this.showItemDetail(card.dataset.id));
        });

        // Filtro stato
        this.container.querySelectorAll('.stato-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filtroStato = btn.dataset.stato;
                this.generateHTML();
                this.bindEvents();
            });
        });

        // Filtro categoria
        this.container.querySelectorAll('.cat-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filtroCategoria = btn.dataset.cat;
                this.generateHTML();
                this.bindEvents();
            });
        });

        // Scanner
        document.getElementById('scan-add-btn').addEventListener('click', () => {
            document.getElementById('scanner-container').classList.remove('hidden');
            document.getElementById('scan-add-btn').classList.add('hidden');
            scanner.startScanner(
                'pantry-reader-video',
                (barcode) => {
                    this.handleCloseScanner();
                    const qty = parseInt(document.getElementById('qty-input')?.value) || 1;
                    this.fetchAndAddProduct(barcode, qty);
                },
                async (err) => {
                    await modal.showModal({ type: 'error', title: 'Errore Scanner', message: err });
                    this.handleCloseScanner();
                }
            );
        });

        document.getElementById('close-scanner-btn').addEventListener('click', () => {
            this.handleCloseScanner();
        });

        // Voce
        document.getElementById('voice-add-btn').addEventListener('click', () => {
            this.handleVoiceAdd();
        });
    }

    handleCloseScanner() {
        scanner.stopScanner();
        document.getElementById('scanner-container')?.classList.add('hidden');
        document.getElementById('scan-add-btn')?.classList.remove('hidden');
    }

    // ─── AGGIUNGI DA SCANNER ─────────────────────────────────────────────────────
    async fetchAndAddProduct(barcode, quantitaConfezioni = 1) {
        this.container.innerHTML = `
            <div class="flex flex-col justify-center items-center min-h-screen gap-4">
                <p class="animate-pulse font-bold text-green-600 text-lg">Ricerca prodotto...</p>
                <p class="text-gray-400 text-sm">${barcode}</p>
            </div>`;

        try {
            const data = await pantryService.fetchOpenFoodFacts(barcode);

            if (data.status !== 1) {
                await modal.showModal({
                    type: 'error', title: 'Prodotto non trovato',
                    message: 'Non ho trovato questo prodotto nel database mondiale.\nPuoi aggiungerlo manualmente tramite il pulsante voce.'
                });
                return this.render();
            }

            const p = data.product;
            const n = p.nutriments || {};

            const nome = p.product_name || p.product_name_it || 'Prodotto sconosciuto';
            const immagine = p.image_front_small_url || p.image_front_url || '';

            let cal = n['energy-kcal_100g'];
            if (cal === undefined || cal === null) {
                if (n['energy-kj_100g']) cal = n['energy-kj_100g'] / 4.184;
                else if (n['energy_100g']) cal = n['energy_100g'] / 4.184;
                else cal = 0;
            }
            if (cal > 900) cal = cal / 4.184;
            cal = parseFloat(Number(cal).toFixed(1));

            const pro = parseFloat(n['proteins_100g'] || 0);
            const carbo = parseFloat(n['carbohydrates_100g'] || 0);
            const fat = parseFloat(n['fat_100g'] || 0);

            // Peso confezione
            let pesoConfezione = 0;
            if (p.product_quantity) {
                pesoConfezione = parseFloat(p.product_quantity);
            } else if (p.quantity) {
                const match = p.quantity.match(/(\d+[\.,]?\d*)/);
                if (match) pesoConfezione = parseFloat(match[1].replace(',', '.'));
            }

            if (!pesoConfezione || isNaN(pesoConfezione) || pesoConfezione <= 0) {
                const pesoStr = await modal.showModal({
                    type: 'prompt',
                    title: '📦 Peso Confezione',
                    message: `Ho trovato: "${nome}"\n\nQuanto pesa una singola confezione in grammi?`,
                    inputValue: '500'
                });
                if (pesoStr === false || pesoStr === null) return this.render();
                pesoConfezione = parseFloat(pesoStr) || 500;
            }

            const categoria = pantryService.determinaCategoria(nome, pro, carbo, fat, cal);

            // Conferma prima di aggiungere
            const ok = await modal.showModal({
                type: 'confirm',
                title: '✅ Aggiungi alla dispensa',
                message: `${nome}\n\n📦 ${quantitaConfezioni}x ${pesoConfezione}g = ${quantitaConfezioni * pesoConfezione}g totali\n🏷️ Categoria: ${categoria}\n⚡ ${cal} kcal/100g`,
                confirmText: 'Aggiungi',
                cancelText: 'Annulla'
            });

            if (!ok) return this.render();

            const result = await pantryService.addPantryItem({
                barcode, nome, immagine, calorie100: cal,
                proteine100: pro, carbo100: carbo, grassi100: fat,
                pesoConfezione, quantitaConfezioni, categoria
            });

            if (result.success) {
                const msg = result.wasExisting
                    ? `Aggiunto a stock esistente!\n\nOra hai ${result.item.grammiRimasti}g di "${nome}".`
                    : `"${nome}" aggiunto alla dispensa!\n\n${quantitaConfezioni * pesoConfezione}g disponibili.`;
                await modal.showModal({ type: 'success', title: '🎉 Aggiunto!', message: msg });
            }

            this.render();
        } catch (e) {
            await modal.showModal({ type: 'error', title: 'Errore', message: 'Errore di connessione.' });
            this.render();
        }
    }

    // ─── AGGIUNGI A VOCE ─────────────────────────────────────────────────────────
    async handleVoiceAdd() {
        // Mostra form manuale con opzione voce per il nome
        const result = await this.showManualAddForm();
        if (result) this.render();
    }

    showManualAddForm() {
        return new Promise((resolve) => {
            const modalId = 'manual-add-modal';
            let m = document.getElementById(modalId);
            if (m) m.remove();

            m = document.createElement('div');
            m.id = modalId;
            m.className = "fixed inset-0 z-[99999] flex items-end justify-center bg-gray-900/60 backdrop-blur-sm opacity-0 transition-opacity duration-300";

            m.innerHTML = `
                <div class="bg-white w-full max-w-md rounded-t-[2rem] p-6 shadow-2xl transform translate-y-full transition-transform duration-300 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
                    <div class="flex justify-between items-center mb-5">
                        <h2 class="text-xl font-black text-gray-900">➕ Aggiungi Manuale</h2>
                        <button id="close-manual-modal" class="text-gray-400 bg-gray-100 p-2 rounded-full active:scale-90 transition-transform">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Nome prodotto</label>
                            <div class="flex gap-2">
                                <input type="text" id="m-nome" placeholder="es. Mozzarella, Bresaola..."
                                    class="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-green-500">
                                <button id="voice-nome-btn" class="bg-gray-100 text-gray-600 p-3 rounded-xl active:scale-95 transition-transform" title="Dettare nome">
                                    🎙️
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Peso confezione (g)</label>
                                <input type="number" id="m-peso" placeholder="es. 125"
                                    class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-center outline-none focus:ring-2 focus:ring-green-500">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Confezioni</label>
                                <input type="number" id="m-qty" value="1" min="1"
                                    class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-center outline-none focus:ring-2 focus:ring-green-500">
                            </div>
                        </div>

                        <div>
                            <label class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Categoria</label>
                            <select id="m-categoria" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500">
                                ${CATEGORIE.map(c => `<option value="${c}">${CATEGORIA_STYLE[c]?.icon || ''} ${c}</option>`).join('')}
                            </select>
                        </div>

                        <div class="border-t border-gray-100 pt-4">
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Valori nutrizionali per 100g <span class="text-gray-300">(opzionale)</span></p>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="text-[10px] text-gray-400 font-bold block mb-1">Calorie</label>
                                    <input type="number" id="m-cal" placeholder="0"
                                        class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-center font-bold outline-none">
                                </div>
                                <div>
                                    <label class="text-[10px] text-gray-400 font-bold block mb-1">Proteine (g)</label>
                                    <input type="number" id="m-pro" placeholder="0"
                                        class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-center font-bold outline-none">
                                </div>
                                <div>
                                    <label class="text-[10px] text-gray-400 font-bold block mb-1">Carboidrati (g)</label>
                                    <input type="number" id="m-carbo" placeholder="0"
                                        class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-center font-bold outline-none">
                                </div>
                                <div>
                                    <label class="text-[10px] text-gray-400 font-bold block mb-1">Grassi (g)</label>
                                    <input type="number" id="m-fat" placeholder="0"
                                        class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-center font-bold outline-none">
                                </div>
                            </div>
                        </div>

                        <button id="save-manual-btn"
                            class="w-full bg-green-600 text-white font-black text-[15px] py-4 rounded-2xl shadow-md active:scale-95 transition-transform mt-2">
                            Aggiungi alla Dispensa
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(m);
            document.body.style.overflow = 'hidden';

            requestAnimationFrame(() => {
                m.classList.remove('opacity-0');
                m.querySelector('div').classList.remove('translate-y-full');
            });

            const closeModal = (val) => {
                m.classList.add('opacity-0');
                m.querySelector('div').classList.add('translate-y-full');
                setTimeout(() => {
                    m.remove();
                    document.body.style.overflow = '';
                    resolve(val);
                }, 300);
            };

            document.getElementById('close-manual-modal').addEventListener('click', () => closeModal(false));

            // Riconoscimento vocale per il nome
            document.getElementById('voice-nome-btn').addEventListener('click', () => {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) return alert('Riconoscimento vocale non supportato');

                const rec = new SpeechRecognition();
                rec.lang = 'it-IT';
                rec.continuous = false;
                rec.interimResults = false;

                const btn = document.getElementById('voice-nome-btn');
                btn.textContent = '⏳';

                rec.onresult = (e) => {
                    const text = e.results[0][0].transcript;
                    document.getElementById('m-nome').value = text;
                    btn.textContent = '✅';
                    setTimeout(() => { btn.textContent = '🎙️'; }, 1500);
                };
                rec.onerror = () => { btn.textContent = '🎙️'; };
                rec.start();
            });

            document.getElementById('save-manual-btn').addEventListener('click', async () => {
                const nome = document.getElementById('m-nome').value.trim();
                const peso = parseFloat(document.getElementById('m-peso').value) || 0;
                const qty = parseInt(document.getElementById('m-qty').value) || 1;
                const categoria = document.getElementById('m-categoria').value;
                const cal = parseFloat(document.getElementById('m-cal').value) || 0;
                const pro = parseFloat(document.getElementById('m-pro').value) || 0;
                const carbo = parseFloat(document.getElementById('m-carbo').value) || 0;
                const fat = parseFloat(document.getElementById('m-fat').value) || 0;

                if (!nome || peso <= 0) {
                    alert('Inserisci almeno il nome e il peso della confezione.');
                    return;
                }

                try {
                    await pantryService.addPantryItem({
                        barcode: '',
                        nome, immagine: '',
                        calorie100: cal, proteine100: pro, carbo100: carbo, grassi100: fat,
                        pesoConfezione: peso, quantitaConfezioni: qty, categoria
                    });
                    closeModal(true);
                } catch (e) {
                    alert('Errore nel salvataggio.');
                }
            });
        });
    }
}