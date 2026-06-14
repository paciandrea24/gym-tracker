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
        this.filtroStato = 'tutti'; // tutti | allerta (bassa + esaurito)
    }

    async render() {
        this.container.innerHTML = `
            <div class="flex justify-center items-center min-h-screen">
                <p class="animate-pulse font-bold text-gray-500">Caricamento dispensa...</p>
            </div>`;
        try {
            this.items = await pantryService.getPantryItems();
            this.generateHTML();
            this.bindEvents();
        } catch (e) {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold text-red-500">Errore caricamento dispensa.</div>`;
        }
    }

    // ─── RENDER PRINCIPALE (DASHBOARD) ─────────────────────────────────
    generateHTML() {
        const totale = this.items.length;
        const scarseScorete = this.items.filter(i => i.scortaBassa).length;
        const esauriti = this.items.filter(i => i.esaurito).length;
        const inAllerta = scarseScorete + esauriti;

        // Filtraggio
        let filtered = [...this.items];
        if (this.filtroCategoria !== 'Tutti') {
            filtered = filtered.filter(i => i.categoria === this.filtroCategoria);
        }
        if (this.filtroStato === 'allerta') {
            filtered = filtered.filter(i => i.scortaBassa || i.esaurito);
        }

        const itemsHtml = filtered.length === 0
            ? `<div class="text-center py-12 text-gray-400 font-medium">Nessun prodotto corrisponde ai filtri.</div>`
            : filtered.map(item => this.renderItemCard(item)).join('');

        this.container.innerHTML = `
            <header class="bg-white shadow-sm pt-14 pb-4 px-5 sticky top-0 z-10 flex justify-between items-center">
                <h1 class="text-2xl font-black text-gray-900 tracking-tight">La Mia Dispensa</h1>
            </header>

            <main class="p-4 space-y-5 pb-32 safe-pb bg-gray-50 min-h-screen">
                
                <div class="bg-gray-900 text-white p-5 rounded-[24px] shadow-xl flex justify-between items-center">
                    <div>
                        <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Prodotti Totali</p>
                        <h2 class="text-4xl font-black">${totale}</h2>
                    </div>
                    <div class="text-right flex flex-col gap-2">
                        <div class="bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
                            <p class="text-[10px] font-bold text-orange-400 uppercase tracking-widest">⚠️ ${scarseScorete} In esaurimento</p>
                        </div>
                        <div class="bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
                            <p class="text-[10px] font-bold text-red-400 uppercase tracking-widest">🔴 ${esauriti} Esauriti</p>
                        </div>
                    </div>
                </div>

                <div id="action-buttons" class="grid grid-cols-3 gap-2">
                    <button id="shopping-list-btn" class="bg-yellow-50 text-yellow-700 border border-yellow-200 font-black text-[13px] py-3 rounded-[20px] shadow-sm active:scale-95 transition-transform flex flex-col justify-center items-center gap-1">
                        <span class="text-2xl mb-1">🛒</span> Spesa
                    </button>
                    <button id="scan-add-btn" class="bg-blue-50 text-blue-700 border border-blue-200 font-black text-[13px] py-3 rounded-[20px] shadow-sm active:scale-95 transition-transform flex flex-col justify-center items-center gap-1">
                        <span class="text-2xl mb-1">📸</span> Scanner
                    </button>
                    <button id="voice-add-btn" class="bg-white text-gray-900 border border-gray-200 font-black text-[13px] py-3 rounded-[20px] shadow-sm active:scale-95 transition-transform flex flex-col justify-center items-center gap-1">
                        <span class="text-2xl mb-1">🎙️</span> Manuale
                    </button>
                </div>

                <div id="scanner-container" class="hidden bg-gray-900 p-2 rounded-[24px] shadow-xl border border-gray-800">
                    <p class="text-center text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider mt-2">Inquadra il codice a barre</p>
                    <video id="pantry-reader-video" class="w-full rounded-[18px] overflow-hidden mb-3 bg-black min-h-[220px]" autoplay playsinline></video>
                    <div class="flex gap-2">
                        <div class="bg-gray-800 rounded-xl px-3 py-2 flex items-center border border-gray-700">
                            <label class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mr-2">Q.TÀ</label>
                            <input type="number" id="qty-input" value="1" min="1" max="99" class="w-10 bg-transparent text-white text-center font-black text-lg outline-none">
                        </div>
                        <button id="close-scanner-btn" class="flex-1 bg-red-500 text-white font-bold py-2 rounded-xl active:scale-95 transition-transform">
                            Annulla
                        </button>
                    </div>
                </div>

                <div class="pt-2">
                    <div class="flex bg-gray-100 p-1 rounded-xl mb-4">
                        <button data-stato="tutti" class="stato-filter flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${this.filtroStato === 'tutti' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}">
                            Tutti i Prodotti
                        </button>
                        <button data-stato="allerta" class="stato-filter flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-1 ${this.filtroStato === 'allerta' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}">
                            ${inAllerta > 0 ? `<span class="flex h-2 w-2 relative"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>` : ''}
                            Da Rifornire
                        </button>
                    </div>

                    <div class="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                        ${['Tutti', ...CATEGORIE].map(cat => {
            const active = this.filtroCategoria === cat;
            const style = CATEGORIA_STYLE[cat];
            return `<button data-cat="${cat}" class="cat-filter flex-shrink-0 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${active ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}">
                                ${style ? style.icon + ' ' : ''}${cat}
                            </button>`;
        }).join('')}
                    </div>
                </div>

                <div class="space-y-3">
                    ${itemsHtml}
                </div>
            </main>
        `;
    }

    // ─── CARD SINGOLO PRODOTTO ──────────────────────────────────────────────────
    renderItemCard(item) {
        const style = CATEGORIA_STYLE[item.categoria] || CATEGORIA_STYLE['Altro'];
        const perc = item.grammiTotali > 0 ? (item.grammiRimasti / item.grammiTotali) * 100 : 0;
        const percRounded = Math.max(0, Math.min(100, perc));

        let barColor = 'bg-green-500';
        let borderClass = 'border-gray-100';
        let statusBadge = '';

        if (item.esaurito) {
            barColor = 'bg-gray-300';
            borderClass = 'border-red-200';
            statusBadge = `<span class="text-[9px] font-black bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-md uppercase tracking-wider">Esaurito</span>`;
        } else if (item.scortaBassa) {
            barColor = 'bg-orange-400';
            borderClass = 'border-orange-200';
            statusBadge = `<span class="text-[9px] font-black bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">Scorta bassa</span>`;
        }

        return `
            <div class="pantry-item-card bg-white rounded-[20px] border ${borderClass} shadow-[0_4px_15px_rgb(0,0,0,0.02)] p-4 cursor-pointer active:scale-95 transition-transform flex gap-4 items-center" data-id="${item._id}">
                
                ${item.immagine
                ? `<img src="${item.immagine}" class="w-16 h-16 object-cover rounded-[16px] border border-gray-100 shadow-sm flex-shrink-0">`
                : `<div class="w-16 h-16 ${style.bg} rounded-[16px] flex items-center justify-center text-3xl flex-shrink-0 border ${style.border}">${style.icon}</div>`
            }
                
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start mb-0.5">
                        <h3 class="font-bold text-gray-900 text-[16px] leading-tight truncate pr-2">${item.nome}</h3>
                    </div>
                    
                    <div class="flex justify-between items-end mb-2">
                        <p class="text-sm font-black text-gray-800">${item.grammiRimasti}g <span class="text-[10px] font-medium text-gray-400">/ ${item.grammiTotali}g</span></p>
                        ${statusBadge}
                    </div>

                    <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div class="${barColor} h-2 rounded-full transition-all" style="width: ${percRounded}%"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // ─── DETTAGLIO ARTICOLO ─────────────────────────────────────────────────────
    async showItemDetail(itemId) {
        const item = this.items.find(i => String(i._id) === String(itemId));
        if (!item) return;

        this.container.innerHTML = `
            <div class="flex justify-center items-center min-h-screen">
                <p class="animate-pulse font-bold text-gray-500">Caricamento dettagli...</p>
            </div>`;

        const usage = await pantryService.getPantryItemUsage(itemId);
        const style = CATEGORIA_STYLE[item.categoria] || CATEGORIA_STYLE['Altro'];
        const perc = item.grammiTotali > 0 ? (item.grammiRimasti / item.grammiTotali) * 100 : 0;
        let barColor = perc > 20 ? 'bg-green-500' : (perc > 0 ? 'bg-orange-400' : 'bg-red-500');

        const usageHtml = usage.length === 0
            ? `<div class="text-center py-6 text-gray-400 font-medium">Nessun utilizzo registrato.</div>`
            : usage.map(u => `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between mb-3">
                    <div class="flex-1 pr-3">
                        <h4 class="text-sm font-bold text-gray-800">${u.nomePasto}</h4>
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            ${new Date(u.data).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} • 
                            ${new Date(u.data).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <div class="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                        <span class="font-black text-gray-900 text-sm">-${u.grammiScalati}g</span>
                    </div>
                </div>
            `).join('');

        this.container.innerHTML = `
            <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center justify-between">
                <div class="flex items-center">
                    <button id="back-detail-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2 active:scale-90 transition-transform">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <h1 class="text-xl font-bold text-gray-900 truncate">Prodotto</h1>
                </div>
                <button id="delete-item-btn" data-id="${item._id}" class="p-2 rounded-full text-red-500 bg-red-50 active:scale-95 transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </header>

            <main class="p-4 space-y-6 pb-32 safe-pb bg-gray-50">
                
                <div class="bg-white p-6 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                    <div class="flex flex-col items-center mb-6">
                        ${item.immagine
                ? `<img src="${item.immagine}" class="w-24 h-24 object-cover rounded-[20px] border border-gray-100 shadow-sm mb-4">`
                : `<div class="w-24 h-24 ${style.bg} rounded-[20px] flex items-center justify-center text-5xl border ${style.border} mb-4 shadow-inner">${style.icon}</div>`
            }
                        <span class="text-[10px] font-bold ${style.bg} ${style.text} px-3 py-1 rounded-full uppercase tracking-widest mb-2 border ${style.border}">${item.categoria}</span>
                        <h2 class="text-2xl font-black text-gray-900 text-center leading-tight">${item.nome}</h2>
                    </div>

                    <div class="bg-gray-50 p-5 rounded-[20px] border border-gray-100 mb-6">
                        <div class="flex justify-between items-end mb-2">
                            <div>
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Disponibilità</p>
                                <p class="text-4xl font-black text-gray-900 leading-none mt-1">${item.grammiRimasti}<span class="text-lg font-bold text-gray-400">g</span></p>
                            </div>
                            <div class="text-right">
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acquistato</p>
                                <p class="text-lg font-black text-gray-600 mt-1">${item.grammiTotali} g</p>
                            </div>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
                            <div class="${barColor} h-2 rounded-full transition-all" style="width: ${Math.max(0, Math.min(100, perc))}%"></div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3 mb-6">
                        <button id="restock-btn" data-id="${item._id}" class="bg-gray-900 text-white font-bold text-[14px] py-4 rounded-xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform flex justify-center items-center gap-2">
                            ➕ Rifornisci
                        </button>
                        <button id="edit-grams-btn" data-id="${item._id}" class="bg-white text-gray-900 border border-gray-200 font-bold text-[14px] py-4 rounded-xl shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-2">
                            ✏️ Modifica
                        </button>
                    </div>

                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 pt-4 border-t border-gray-100">Valori Nutrizionali (su 100g)</p>
                    <div class="grid grid-cols-4 gap-2">
                        <div class="bg-gray-50 p-2 sm:p-3 rounded-[16px] flex flex-col justify-center items-center border border-gray-100">
                            <p class="text-[9px] font-bold text-gray-400 uppercase mb-1 w-full text-center">Kcal</p>
                            <p class="text-sm sm:text-base font-black text-gray-900">${item.calorie100}</p>
                        </div>
                        <div class="bg-blue-50 p-2 sm:p-3 rounded-[16px] flex flex-col justify-center items-center border border-blue-100">
                            <p class="text-[9px] font-bold text-blue-400 uppercase mb-1 w-full text-center">Pro</p>
                            <p class="text-sm sm:text-base font-black text-blue-700">${item.proteine100}g</p>
                        </div>
                        <div class="bg-green-50 p-2 sm:p-3 rounded-[16px] flex flex-col justify-center items-center border border-green-100">
                            <p class="text-[9px] font-bold text-green-500 uppercase mb-1 w-full text-center">Car</p>
                            <p class="text-sm sm:text-base font-black text-green-700">${item.carbo100}g</p>
                        </div>
                        <div class="bg-yellow-50 p-2 sm:p-3 rounded-[16px] flex flex-col justify-center items-center border border-yellow-100">
                            <p class="text-[9px] font-bold text-yellow-600 uppercase mb-1 w-full text-center">Fat</p>
                            <p class="text-sm sm:text-base font-black text-yellow-700">${item.grassi100}g</p>
                        </div>
                    </div>
                </div>

                <div class="pt-2">
                    <h3 class="text-xs font-bold text-gray-800 uppercase tracking-widest mb-3 px-1">Cronologia Utilizzi</h3>
                    ${usageHtml}
                </div>
            </main>
        `;

        document.getElementById('back-detail-btn').addEventListener('click', () => this.render());

        document.getElementById('restock-btn').addEventListener('click', async () => {
            const qtyStr = await modal.showModal({
                type: 'prompt',
                title: 'Rifornimento',
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
                title: 'Modifica Grammi',
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
                confirmText: 'Sì',
                cancelText: 'Annulla'
            });
            if (!ok) return;
            await pantryService.deletePantryItem(item._id);
            this.render();
        });
    }

    // ─── EVENTI PRINCIPALI ──────────────────────────────────────────────────────
    bindEvents() {
        this.container.querySelectorAll('.pantry-item-card').forEach(card => {
            card.addEventListener('click', () => this.showItemDetail(card.dataset.id));
        });

        this.container.querySelectorAll('.stato-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filtroStato = btn.dataset.stato;
                this.generateHTML();
                this.bindEvents();
            });
        });

        this.container.querySelectorAll('.cat-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filtroCategoria = btn.dataset.cat;
                this.generateHTML();
                this.bindEvents();
            });
        });

        // Tasto Lista della Spesa
        const shoppingBtn = document.getElementById('shopping-list-btn');
        if (shoppingBtn) {
            shoppingBtn.addEventListener('click', () => this.showShoppingListModal());
        }

        // Tasto Scanner
        const scanBtn = document.getElementById('scan-add-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                document.getElementById('scanner-container').classList.remove('hidden');
                document.getElementById('action-buttons').classList.add('hidden');
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
        }

        const closeScannerBtn = document.getElementById('close-scanner-btn');
        if (closeScannerBtn) {
            closeScannerBtn.addEventListener('click', () => {
                this.handleCloseScanner();
            });
        }

        const voiceBtn = document.getElementById('voice-add-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.handleVoiceAdd();
            });
        }
    }

    handleCloseScanner() {
        scanner.stopScanner();
        const scannerContainer = document.getElementById('scanner-container');
        const actionBtns = document.getElementById('action-buttons');
        if (scannerContainer) scannerContainer.classList.add('hidden');
        if (actionBtns) actionBtns.classList.remove('hidden');
    }

    // ─── NUOVO: MODALE LISTA DELLA SPESA AUTOMATICA ─────────────────────────────
    showShoppingListModal() {
        const toBuy = this.items.filter(i => i.scortaBassa || i.esaurito);

        const modalId = 'shopping-list-modal';
        let m = document.getElementById(modalId);
        if (m) m.remove();

        m = document.createElement('div');
        m.id = modalId;
        m.className = "fixed inset-0 z-[99999] flex items-end justify-center bg-gray-900/60 backdrop-blur-sm opacity-0 transition-opacity duration-300";

        const itemsHtml = toBuy.length === 0
            ? `<div class="text-center py-10">
                 <div class="text-6xl mb-4">🛒</div>
                 <p class="text-gray-900 font-black text-xl mb-1">Niente da comprare!</p>
                 <p class="text-gray-500 font-medium">La tua dispensa è al top. 🚀</p>
               </div>`
            : toBuy.map((item) => `
                <div class="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-3">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <input type="checkbox" id="buy-${item._id}" value="${item._id}" class="shopping-cb w-6 h-6 text-yellow-500 bg-white border-gray-300 rounded focus:ring-yellow-500 active:scale-90 transition-transform" checked>
                        <div class="flex-1 min-w-0">
                            <label for="buy-${item._id}" class="font-bold text-gray-900 text-[15px] truncate block leading-tight cursor-pointer">${item.nome}</label>
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">${item.pesoConfezione}g per singola conf.</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0 ml-2">
                        <label class="text-[10px] font-bold text-gray-400 uppercase">Q.tà</label>
                        <input type="number" id="qty-${item._id}" value="1" min="1" max="99" class="w-12 bg-white border border-gray-200 rounded-xl p-2 text-center font-black text-gray-900 outline-none focus:ring-2 focus:ring-yellow-400 transition-all">
                    </div>
                </div>
            `).join('');

        m.innerHTML = `
            <div class="bg-white w-full max-w-md rounded-t-[2rem] p-6 shadow-2xl transform translate-y-full transition-transform duration-300 max-h-[90vh] flex flex-col">
                <div class="flex justify-between items-center mb-6 flex-shrink-0">
                    <h2 class="text-xl font-black text-gray-900 flex items-center gap-2"><span class="text-2xl">🛒</span> Lista Spesa</h2>
                    <button id="close-shopping-modal" class="text-gray-400 bg-gray-100 p-2 rounded-full active:scale-90 transition-transform">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                <div class="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden pb-2">
                    ${toBuy.length > 0 ? `<p class="text-xs font-bold text-gray-500 mb-5 leading-relaxed bg-yellow-50 text-yellow-700 p-3 rounded-xl border border-yellow-100">L'app ha rilevato che i seguenti prodotti scarseggiano. Spunta quelli che hai comprato per aggiungerli alla dispensa.</p>` : ''}
                    ${itemsHtml}
                </div>

                ${toBuy.length > 0 ? `
                    <div class="pt-4 mt-2 border-t border-gray-100 flex-shrink-0">
                        <button id="confirm-shopping-btn" class="w-full bg-yellow-400 text-yellow-900 font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgba(250,204,21,0.3)] active:scale-95 transition-all flex justify-center items-center gap-2">
                            ✅ Rifornisci i selezionati
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(m);
        document.body.style.overflow = 'hidden';

        requestAnimationFrame(() => {
            m.classList.remove('opacity-0');
            m.querySelector('div').classList.remove('translate-y-full');
        });

        const closeModal = () => {
            m.classList.add('opacity-0');
            m.querySelector('div').classList.add('translate-y-full');
            setTimeout(() => {
                m.remove();
                document.body.style.overflow = '';
            }, 300);
        };

        document.getElementById('close-shopping-modal').addEventListener('click', closeModal);

        const confirmBtn = document.getElementById('confirm-shopping-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const checkboxes = m.querySelectorAll('.shopping-cb:checked');
                if (checkboxes.length === 0) {
                    await modal.showModal({ type: 'alert', title: 'Attenzione', message: 'Seleziona almeno un prodotto spuntando la casella.' });
                    return;
                }

                // Disabilita pulsante e mostra loading
                confirmBtn.innerHTML = '⏳ Aggiornamento in corso...';
                confirmBtn.classList.replace('bg-yellow-400', 'bg-gray-200');
                confirmBtn.classList.replace('text-yellow-900', 'text-gray-500');
                confirmBtn.classList.remove('shadow-[0_8px_20px_rgba(250,204,21,0.3)]');
                confirmBtn.disabled = true;

                // Prepara tutte le richieste PUT
                const updatePromises = Array.from(checkboxes).map(async (cb) => {
                    const itemId = cb.value;
                    const item = this.items.find(i => String(i._id) === String(itemId));
                    const qtyInput = document.getElementById(`qty-${itemId}`);
                    const qty = parseInt(qtyInput.value) || 1;

                    if (item) {
                        const grammiDaAggiungere = qty * item.pesoConfezione;
                        return pantryService.updatePantryItem(itemId, {
                            quantitaConfezioni: item.quantitaConfezioni + qty,
                            grammiTotali: item.grammiTotali + grammiDaAggiungere,
                            grammiRimasti: item.grammiRimasti + grammiDaAggiungere
                        });
                    }
                });

                try {
                    await Promise.all(updatePromises);
                    closeModal();
                    await modal.showModal({ type: 'success', title: 'Dispensa Aggiornata', message: 'I prodotti selezionati sono stati riforniti con successo! 🎉' });
                    this.render();
                } catch (e) {
                    await modal.showModal({ type: 'error', title: 'Errore', message: 'Si è verificato un errore durante il rifornimento.' });
                    closeModal();
                    this.render();
                }
            });
        }
    }


    // ─── AGGIUNGI DA SCANNER ─────────────────────────────────────────────────────
    async fetchAndAddProduct(barcode, quantitaConfezioni = 1) {
        this.container.innerHTML = `
            <div class="flex flex-col justify-center items-center min-h-screen gap-4">
                <p class="animate-pulse font-bold text-blue-600 text-lg">Ricerca nel database...</p>
                <p class="text-gray-400 text-sm font-medium tracking-widest">${barcode}</p>
            </div>`;

        try {
            const data = await pantryService.fetchOpenFoodFacts(barcode);

            if (data.status !== 1) {
                await modal.showModal({
                    type: 'error', title: 'Non trovato',
                    message: 'Prodotto non trovato nel database mondiale. Aggiungilo manualmente.'
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
                    title: 'Peso Confezione',
                    message: `Ho trovato:\n"${nome}"\n\nQuanto pesa una singola confezione in grammi?`,
                    inputValue: '500'
                });
                if (pesoStr === false || pesoStr === null) return this.render();
                pesoConfezione = parseFloat(pesoStr) || 500;
            }

            const categoria = pantryService.determinaCategoria(nome, pro, carbo, fat, cal);

            const ok = await modal.showModal({
                type: 'confirm',
                title: 'Aggiungi Prodotto',
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
                await modal.showModal({ type: 'success', title: 'Fatto!', message: msg });
            }

            this.render();
        } catch (e) {
            await modal.showModal({ type: 'error', title: 'Errore', message: 'Errore di connessione.' });
            this.render();
        }
    }

    // ─── AGGIUNGI MANUALE / VOCE ─────────────────────────────────────────────────
    async handleVoiceAdd() {
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
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-black text-gray-900">Aggiungi Manuale</h2>
                        <button id="close-manual-modal" class="text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full active:scale-90 transition-transform">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <div class="space-y-4 pb-6">
                        <div>
                            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nome prodotto</label>
                            <div class="flex gap-2">
                                <input type="text" id="m-nome" placeholder="es. Mozzarella, Bresaola..."
                                    class="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                                <button id="voice-nome-btn" class="bg-gray-900 text-white p-4 rounded-xl active:scale-95 transition-transform shadow-md flex items-center justify-center min-w-[56px]" title="Dettare nome">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Peso conf. (g)</label>
                                <input type="number" id="m-peso" placeholder="es. 125"
                                    class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-center outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Q.tà Confezioni</label>
                                <input type="number" id="m-qty" value="1" min="1"
                                    class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-center outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                            </div>
                        </div>

                        <div>
                            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Categoria</label>
                            <select id="m-categoria" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                                ${CATEGORIE.map(c => `<option value="${c}">${CATEGORIA_STYLE[c]?.icon || ''} ${c}</option>`).join('')}
                            </select>
                        </div>

                        <div class="border-t border-gray-100 pt-4 mt-2">
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Valori Nutrizionali (per 100g) <span class="normal-case font-medium text-gray-300">(opzionali)</span></p>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="text-[9px] text-gray-400 font-bold uppercase block mb-1">Calorie</label>
                                    <input type="number" id="m-cal" placeholder="0"
                                        class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                                </div>
                                <div>
                                    <label class="text-[9px] text-gray-400 font-bold uppercase block mb-1">Proteine (g)</label>
                                    <input type="number" id="m-pro" placeholder="0"
                                        class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                                </div>
                                <div>
                                    <label class="text-[9px] text-gray-400 font-bold uppercase block mb-1">Carboidrati (g)</label>
                                    <input type="number" id="m-carbo" placeholder="0"
                                        class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                                </div>
                                <div>
                                    <label class="text-[9px] text-gray-400 font-bold uppercase block mb-1">Grassi (g)</label>
                                    <input type="number" id="m-fat" placeholder="0"
                                        class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                                </div>
                            </div>
                        </div>

                        <button id="save-manual-btn"
                            class="w-full bg-gray-900 text-white font-black text-lg py-4 rounded-2xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform mt-4">
                            Salva in Dispensa
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

            const voiceBtn = document.getElementById('voice-nome-btn');
            const originalVoiceHtml = voiceBtn.innerHTML;

            voiceBtn.addEventListener('click', () => {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    modal.showModal({ type: 'error', title: 'Errore', message: 'Riconoscimento vocale non supportato' });
                    return;
                }

                const rec = new SpeechRecognition();
                rec.lang = 'it-IT';
                rec.continuous = false;
                rec.interimResults = false;

                voiceBtn.innerHTML = '⏳';
                voiceBtn.classList.replace('bg-gray-900', 'bg-red-500');
                voiceBtn.classList.add('animate-pulse');

                rec.onresult = (e) => {
                    const text = e.results[0][0].transcript;
                    document.getElementById('m-nome').value = text;
                    voiceBtn.innerHTML = '✅';
                    voiceBtn.classList.remove('animate-pulse');
                    voiceBtn.classList.replace('bg-red-500', 'bg-green-500');
                    setTimeout(() => {
                        voiceBtn.innerHTML = originalVoiceHtml;
                        voiceBtn.classList.replace('bg-green-500', 'bg-gray-900');
                    }, 1500);
                };
                rec.onerror = () => {
                    voiceBtn.innerHTML = originalVoiceHtml;
                    voiceBtn.classList.replace('bg-red-500', 'bg-gray-900');
                    voiceBtn.classList.remove('animate-pulse');
                };
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
                    await modal.showModal({ type: 'error', title: 'Campi mancanti', message: 'Inserisci almeno il nome e il peso della confezione.' });
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
                    await modal.showModal({ type: 'error', title: 'Errore', message: 'Errore nel salvataggio.' });
                }
            });
        });
    }
}