// public/js/views/MealPrepView.js
// Meal prep: un lotto cucinato una volta (es. ragù) e mangiato in più giorni.

import * as prepService from '../services/mealPrepService.js?v=23';
import * as nutriService from '../services/nutriService.js?v=23';
import * as pantryService from '../services/pantryService.js?v=23';
import * as pantrySync from '../services/pantrySync.js?v=23';
import * as scanner from '../components/scanner.js?v=23';
import * as voice from '../components/voice.js?v=23';
import * as modal from '../components/modal.js?v=23';
import * as ui from '../ui.js?v=23';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => String(Math.round((Number(n) || 0) * 10) / 10).replace('.', ',');
const dataBreve = (d) => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

function rigaMacro(v) {
    return `${Math.round(v.calorie)} kcal · P ${num(v.proteine)} · C ${num(v.carboidrati)} · G ${num(v.grassi)}`;
}

function valoriPerUnita(prep) {
    const righe = [];
    const porzione = prepService.anteprimaPorzione(prep, { prepPorzioni: 1 });
    const cento = prepService.anteprimaPorzione(prep, { prepGrammi: 100 });
    if (porzione) righe.push(`<p class="text-[12px] font-bold text-gray-600"><span class="text-gray-400">1 porzione</span> · ${rigaMacro(porzione)}</p>`);
    if (cento) righe.push(`<p class="text-[12px] font-bold text-gray-600"><span class="text-gray-400">100 g</span> · ${rigaMacro(cento)}</p>`);
    if (righe.length === 0) {
        righe.push(`<p class="text-[12px] font-bold text-orange-500">⚠️ Imposta il peso del cotto o il numero di porzioni</p>`);
    }
    return righe.join('');
}

function barraConsumo(prep) {
    const r = prep.riepilogo || { quotaUsata: 0, grammiUsati: null, porzioniUsate: null };
    const perc = Math.round(r.quotaUsata * 100);
    const dettagli = [];
    if (r.grammiUsati !== null) dettagli.push(`${r.grammiUsati} g su ${prep.pesoTotaleCotto} g`);
    if (r.porzioniUsate !== null) dettagli.push(`${num(r.porzioniUsate)} su ${num(prep.porzioniPreviste)} porzioni`);
    const colore = perc >= 100 ? 'bg-green-500' : 'bg-indigo-500';
    return `
        <div class="mt-3">
            <div class="flex justify-between text-[11px] font-bold mb-1">
                <span class="text-gray-500">${perc >= 100 ? '✅ Finita' : `Usato ${perc}%`}</span>
                <span class="text-gray-400">${dettagli.join(' · ')}</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div class="${colore} h-2 rounded-full" style="width:${Math.min(100, perc)}%"></div>
            </div>
        </div>`;
}

// Oggetto "pasto" per pantrySync: gli ingredienti del meal prep scalano la dispensa come un pasto
const comePasto = (prep, ingredienti) => ({ _id: null, pasto: 'Meal prep', alimenti: prep.nome, ingredienti });

export class MealPrepView {
    constructor(container, onBack) {
        this.container = container;
        this.onBack = onBack;
        this.prep = null;
    }

    loading(testo) {
        this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse text-gray-500">${testo}</div>`;
    }

    // ─── LISTA ─────────────────────────────────────────────────────────────
    async renderList() {
        this.loading('Caricamento preparazioni...');
        let preps;
        try {
            preps = await prepService.listPreps('tutte');
            if (!Array.isArray(preps)) throw new Error();
        } catch (e) {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold text-red-500">Errore di connessione al server.</div>`;
            return;
        }
        const attive = preps.filter(p => p.attiva);
        const concluse = preps.filter(p => !p.attiva);

        this.container.innerHTML = `
            <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
                <button id="prep-back-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <h1 class="text-xl font-bold text-gray-900 truncate">Meal Prep</h1>
            </header>
            <main class="p-4 space-y-4 pb-24 safe-pb bg-gray-50 min-h-screen">
                <button id="new-prep-btn" class="w-full bg-gray-900 text-white font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform">
                    ➕ Nuova preparazione
                </button>

                ${attive.length === 0 ? `
                    <div class="text-center py-8 px-4">
                        <p class="text-4xl mb-3">🍲</p>
                        <p class="text-gray-500 font-medium text-sm leading-relaxed">Quando cucini qualcosa che dura più giorni (es. il ragù), registralo qui una volta sola: poi ogni giorno aggiungi solo la tua porzione.</p>
                    </div>
                ` : attive.map(p => `
                    <div class="bg-white p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                        <div class="flex justify-between items-start mb-2">
                            <div class="pr-2">
                                <h3 class="text-lg font-black text-gray-900 leading-tight">🍲 ${esc(p.nome)}</h3>
                                <p class="text-[11px] font-bold text-gray-400 mt-0.5">Cucinato il ${dataBreve(p.dataCreazione)} · lotto ${Math.round(p.calorie)} kcal</p>
                            </div>
                        </div>
                        <div class="space-y-0.5">${valoriPerUnita(p)}</div>
                        ${barraConsumo(p)}
                        <div class="flex gap-2 mt-4">
                            <button data-id="${p._id}" class="add-portion-btn flex-1 bg-indigo-600 text-white font-black text-sm py-3 rounded-2xl active:scale-95 transition-transform">+ Porzione</button>
                            <button data-id="${p._id}" class="open-prep-btn flex-1 bg-gray-100 text-gray-700 font-bold text-sm py-3 rounded-2xl active:scale-95 transition-transform">Dettagli</button>
                        </div>
                    </div>
                `).join('')}

                ${concluse.length > 0 ? `
                    <details class="bg-white rounded-2xl border border-gray-100 p-4">
                        <summary class="text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer">Concluse (${concluse.length})</summary>
                        <div class="mt-3 space-y-2">
                            ${concluse.map(p => `
                                <button data-id="${p._id}" class="open-prep-btn w-full text-left flex justify-between items-center bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 active:scale-95 transition-transform">
                                    <span class="font-bold text-gray-700 text-sm">${esc(p.nome)} <span class="text-[11px] text-gray-400">· ${dataBreve(p.dataCreazione)}</span></span>
                                    <span class="text-[11px] font-bold text-gray-400">${Math.round((p.riepilogo?.quotaUsata || 0) * 100)}%</span>
                                </button>
                            `).join('')}
                        </div>
                    </details>
                ` : ''}
            </main>
        `;

        document.getElementById('prep-back-btn').addEventListener('click', () => this.onBack());
        document.getElementById('new-prep-btn').addEventListener('click', () => this.handleNewPrep());
        this.container.querySelectorAll('.open-prep-btn').forEach(btn =>
            btn.addEventListener('click', () => this.renderDetail(btn.dataset.id)));
        this.container.querySelectorAll('.add-portion-btn').forEach(btn =>
            btn.addEventListener('click', () => openPortionSheet({ prepId: btn.dataset.id, onDone: () => this.renderList() })));
    }

    async handleNewPrep() {
        const nome = await modal.showModal({
            type: 'prompt', title: 'Nuova preparazione',
            message: 'Come la chiami? (es. Ragù)', inputValue: '', confirmText: 'Crea'
        });
        if (!nome || !String(nome).trim()) return;

        this.loading('Creazione...');
        const r = await prepService.createPrep(String(nome).trim());
        if (!r.success) {
            await modal.showModal({ type: 'error', title: 'Errore', message: r.error || 'Impossibile creare la preparazione.' });
            return this.renderList();
        }
        this.prep = r.prep;
        this.drawDetail();
    }

    // ─── DETTAGLIO ─────────────────────────────────────────────────────────
    async renderDetail(id) {
        this.loading('Caricamento...');
        const r = await prepService.getPrep(id);
        if (!r.success) {
            await modal.showModal({ type: 'error', title: 'Errore', message: r.error || 'Preparazione non trovata.' });
            return this.renderList();
        }
        this.prep = r.prep;
        this.drawDetail();
    }

    drawDetail() {
        const p = this.prep;
        const ingredientiHtml = p.ingredienti.length === 0
            ? `<p class="text-center text-sm font-medium text-gray-500 py-4">Aggiungi gli ingredienti crudi che hai usato (es. passata 700 g, macinato 500 g, olio...).</p>`
            : p.ingredienti.map((ing, idx) => `
                <div class="flex justify-between items-center py-3 ${idx > 0 ? 'border-t border-gray-100' : ''}">
                    <div class="pr-2 flex-1 min-w-0">
                        <p class="text-[15px] font-bold text-gray-800 leading-tight break-words">${esc(ing.nome)}</p>
                        <p class="text-[11px] font-bold text-gray-400 mt-0.5">${ing.grammi ? `${num(ing.grammi)} g · ` : ''}${rigaMacro(ing)}</p>
                    </div>
                    <div class="flex items-center space-x-1 flex-shrink-0">
                        <button data-idx="${idx}" class="edit-prep-ing-btn p-2 text-gray-400 bg-gray-50 rounded-full active:scale-95">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button data-idx="${idx}" class="remove-prep-ing-btn p-2 text-gray-400 bg-gray-50 rounded-full active:scale-95">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            `).join('');

        const porzioniHtml = p.porzioni.length === 0
            ? `<p class="text-center text-sm font-medium text-gray-500 py-2">Nessuna porzione registrata.</p>`
            : p.porzioni.map(por => `
                <div class="flex justify-between items-center py-2 text-sm">
                    <span class="font-bold text-gray-700">${dataBreve(por.data)} · ${esc(por.pasto)}</span>
                    <span class="font-bold text-gray-500">${prepService.etichettaPorzione(por)} · ${por.prepDaCompletare ? '⚠️ da completare' : `${Math.round(por.calorie)} kcal`}</span>
                </div>
            `).join('');

        this.container.innerHTML = `
            <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center justify-between">
                <div class="flex items-center min-w-0">
                    <button id="prep-detail-back" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <h1 class="text-xl font-bold text-gray-900 truncate">🍲 ${esc(p.nome)}</h1>
                </div>
                <button id="rename-prep-btn" class="p-2 text-gray-500 bg-gray-100 rounded-full active:scale-95">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
            </header>

            <main class="p-4 space-y-5 pb-24 safe-pb bg-gray-50">
                ${!p.attiva ? `<div class="bg-gray-200 text-gray-600 text-xs font-bold text-center rounded-xl py-2">Preparazione conclusa</div>` : ''}

                <div class="bg-white p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Totale lotto</p>
                    <span class="text-3xl font-black text-gray-900">${Math.round(p.calorie)} <span class="text-sm font-bold text-gray-400">kcal</span></span>
                    <div class="grid grid-cols-3 gap-2 mt-3">
                        <div class="text-center bg-gray-50 p-2 rounded-xl border border-gray-100"><p class="text-[9px] font-bold text-blue-500 uppercase">Pro</p><p class="text-sm font-black text-gray-800">${num(p.proteine)}g</p></div>
                        <div class="text-center bg-gray-50 p-2 rounded-xl border border-gray-100"><p class="text-[9px] font-bold text-green-500 uppercase">Car</p><p class="text-sm font-black text-gray-800">${num(p.carboidrati)}g</p></div>
                        <div class="text-center bg-gray-50 p-2 rounded-xl border border-gray-100"><p class="text-[9px] font-bold text-yellow-500 uppercase">Fat</p><p class="text-sm font-black text-gray-800">${num(p.grassi)}g</p></div>
                    </div>
                    ${barraConsumo(p)}
                </div>

                <div class="bg-white p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 space-y-3">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Come la dividi</p>
                    <div class="flex gap-2">
                        <div class="flex-1">
                            <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Peso cotto (g)</label>
                            <input type="number" inputmode="decimal" id="prep-peso" value="${p.pesoTotaleCotto || ''}" placeholder="es. 1200" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-gray-900">
                        </div>
                        <div class="flex-1">
                            <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Porzioni</label>
                            <input type="number" inputmode="decimal" id="prep-porzioni" value="${p.porzioniPreviste || ''}" placeholder="es. 4" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-gray-900">
                        </div>
                    </div>
                    <p class="text-[11px] font-medium text-gray-400 leading-snug">Pesa il cotto senza pentola. Le porzioni sono una stima: se cambiano, correggile qui e i giorni già registrati si ricalcolano.</p>
                    <div class="space-y-0.5">${valoriPerUnita(p)}</div>
                    <button id="save-prep-settings" class="w-full bg-gray-900 text-white font-bold py-3 rounded-2xl active:scale-95 transition-transform">Salva e ricalcola</button>
                </div>

                ${p.attiva ? `
                <button id="detail-add-portion" class="w-full bg-indigo-600 text-white font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgb(79,70,229,0.25)] active:scale-95 transition-transform">
                    + Aggiungi una porzione a oggi
                </button>` : ''}

                <div class="space-y-3">
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Ingredienti (crudi)</h3>
                    <button id="prep-voice-btn" class="w-full bg-gray-900 text-white font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform flex justify-center items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                        VOCE
                    </button>
                    <div id="prep-action-buttons" class="flex space-x-2">
                        <button id="prep-manual-btn" class="flex-1 bg-white text-gray-900 border border-gray-200 font-bold text-sm py-3 rounded-2xl shadow-sm active:scale-95 transition-transform">➕ Manuale</button>
                        <button id="prep-scan-btn" class="flex-1 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-sm py-3 rounded-2xl shadow-sm active:scale-95 transition-transform">📷 Scanner</button>
                        <button id="prep-fav-btn" class="flex-1 bg-yellow-50 text-yellow-700 border border-yellow-200 font-bold text-sm py-3 rounded-2xl shadow-sm active:scale-95 transition-transform">⭐ Preferiti</button>
                    </div>
                    <div id="prep-scanner-container" class="hidden bg-gray-900 p-2 rounded-2xl shadow-xl border border-gray-800">
                        <p class="text-center text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Inquadra il codice a barre</p>
                        <video id="prep-reader-video" class="w-full rounded-xl overflow-hidden mb-3 bg-black min-h-[220px]" autoplay playsinline></video>
                        <button id="prep-close-scanner" class="w-full bg-red-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform">Annulla Scansione</button>
                    </div>
                    <div class="bg-white px-5 py-2 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                        ${ingredientiHtml}
                    </div>
                </div>

                <div class="space-y-2">
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Porzioni registrate</h3>
                    <div class="bg-white px-5 py-2 rounded-[24px] border border-gray-100 divide-y divide-gray-100">${porzioniHtml}</div>
                </div>

                <div class="flex gap-2 pt-2">
                    <button id="toggle-prep-active" class="flex-1 bg-white border border-gray-200 text-gray-700 font-bold text-sm py-3 rounded-2xl active:scale-95 transition-transform">
                        ${p.attiva ? '✅ Concludi' : '↩️ Riattiva'}
                    </button>
                    ${p.porzioni.length === 0 ? `
                    <button id="delete-prep-btn" class="flex-1 bg-red-50 border border-red-100 text-red-600 font-bold text-sm py-3 rounded-2xl active:scale-95 transition-transform">🗑️ Elimina</button>` : ''}
                </div>
            </main>
        `;
        this.bindDetail();
    }

    bindDetail() {
        const $ = (id) => document.getElementById(id);
        $('prep-detail-back').addEventListener('click', () => { scanner.stopScanner(); this.renderList(); });
        $('rename-prep-btn').addEventListener('click', () => this.handleRename());
        $('save-prep-settings').addEventListener('click', () => this.handleSaveSettings());
        $('detail-add-portion')?.addEventListener('click', () =>
            openPortionSheet({ prepId: this.prep._id, onDone: () => this.renderDetail(this.prep._id) }));
        $('prep-voice-btn').addEventListener('click', (e) => this.handleVoice(e.currentTarget));
        $('prep-manual-btn').addEventListener('click', () => this.openManualForm());
        $('prep-scan-btn').addEventListener('click', () => this.handleScan());
        $('prep-close-scanner').addEventListener('click', () => this.closeScanner());
        $('prep-fav-btn').addEventListener('click', () => this.handleFavorites());
        $('toggle-prep-active').addEventListener('click', () => this.handleToggleActive());
        $('delete-prep-btn')?.addEventListener('click', () => this.handleDelete());

        this.container.querySelectorAll('.edit-prep-ing-btn').forEach(btn =>
            btn.addEventListener('click', () => this.handleEditIngredient(parseInt(btn.dataset.idx, 10))));
        this.container.querySelectorAll('.remove-prep-ing-btn').forEach(btn =>
            btn.addEventListener('click', () => this.handleRemoveIngredient(parseInt(btn.dataset.idx, 10))));
    }

    // Salva una modifica sul server e ridisegna con i dati aggiornati (porzioni ricalcolate incluse)
    async salva(dati, messaggio = 'Salvataggio...') {
        this.loading(messaggio);
        const r = await prepService.updatePrep(this.prep._id, dati);
        if (!r.success) {
            await modal.showModal({ type: 'error', title: 'Errore', message: r.error || 'Salvataggio non riuscito.' });
            return this.renderDetail(this.prep._id);
        }
        this.prep = r.prep;
        this.drawDetail();
        if (r.pastiAggiornati > 0) {
            pantrySync.showToast(`🔄 Ricalcolati ${r.pastiAggiornati} ${r.pastiAggiornati === 1 ? 'pasto' : 'pasti'}`, 'bg-indigo-600');
        }
        return r;
    }

    async handleRename() {
        const nome = await modal.showModal({ type: 'prompt', title: 'Rinomina', message: 'Nuovo nome della preparazione', inputValue: this.prep.nome });
        if (!nome || !String(nome).trim()) return;
        await this.salva({ nome: String(nome).trim() });
    }

    async handleSaveSettings() {
        const peso = parseFloat(String(document.getElementById('prep-peso').value).replace(',', '.')) || 0;
        const porzioni = parseFloat(String(document.getElementById('prep-porzioni').value).replace(',', '.')) || 0;
        if (peso < 0 || porzioni < 0) {
            return modal.showModal({ type: 'error', title: 'Errore', message: 'Valori non validi.' });
        }
        await this.salva({ pesoTotaleCotto: peso, porzioniPreviste: porzioni }, 'Ricalcolo...');
    }

    async aggiungiIngredienti(nuovi) {
        const r = await this.salva({ ingredienti: [...this.prep.ingredienti, ...nuovi] });
        if (r && r.success) pantrySync.scalaDispensa(comePasto(this.prep, nuovi));
    }

    handleVoice(button) {
        const prepId = this.prep._id;
        voice.toggleVoice(button, async (testo) => {
            const r = await prepService.analyzePrepVoice(prepId, testo);
            if (!r.success) throw new Error(r.error || 'Analisi non riuscita.');
            this.prep = r.prep;
            this.drawDetail();
            pantrySync.scalaDispensa(comePasto(this.prep, r.nuoviIngredienti));
        });
    }

    openManualForm(prefill = null) {
        ui.renderManualMealForm(this.container, (dati) => {
            this.aggiungiIngredienti([{
                nome: dati.alimenti, grammi: dati.grammi,
                calorie: dati.calorie, proteine: dati.proteine, carboidrati: dati.carboidrati, grassi: dati.grassi
            }]);
        }, () => this.drawDetail());

        // Il form dei pasti, adattato: niente "tipo di pasto" per un ingrediente
        document.getElementById('m-pasto')?.closest('div')?.classList.add('hidden');
        const titolo = this.container.querySelector('header h1');
        if (titolo) titolo.textContent = `Ingrediente · ${this.prep.nome}`;
        const salva = document.getElementById('save-meal-btn');
        if (salva) salva.textContent = 'Aggiungi alla preparazione';

        if (prefill) ui.riempiFormPasto(prefill);
    }

    handleScan() {
        document.getElementById('prep-action-buttons').classList.add('hidden');
        document.getElementById('prep-scanner-container').classList.remove('hidden');
        scanner.startScanner('prep-reader-video', async (barcode) => {
            this.closeScanner();
            this.loading('Codice rilevato! Ricerca nel database...');
            try {
                const prodotto = await pantryService.cercaProdottoOFF(barcode);
                if (!prodotto) {
                    await modal.showModal({ type: 'error', title: 'Non trovato', message: `Nessun prodotto con codice ${barcode} nel database mondiale.` });
                    return this.drawDetail();
                }
                this.openManualForm(prodotto);
            } catch (e) {
                await modal.showModal({ type: 'error', title: 'Errore di rete', message: 'Errore di connessione a Open Food Facts.' });
                this.drawDetail();
            }
        }, async (errore) => {
            await modal.showModal({ type: 'error', title: 'Scanner', message: errore });
            this.closeScanner();
        });
    }

    closeScanner() {
        scanner.stopScanner();
        document.getElementById('prep-scanner-container')?.classList.add('hidden');
        document.getElementById('prep-action-buttons')?.classList.remove('hidden');
    }

    async handleFavorites() {
        this.loading('Caricamento preferiti...');
        const preferiti = await nutriService.getFavorites();
        ui.renderFavoritesPage(this.container, preferiti, () => this.drawDetail(), async (favId) => {
            const fav = preferiti.find(f => String(f._id) === String(favId));
            if (!fav) return;
            const ok = await modal.showModal({ type: 'confirm', title: 'Aggiungi', message: `Aggiungere "${fav.alimenti}" agli ingredienti di ${this.prep.nome}?`, confirmText: 'Sì', cancelText: 'No' });
            if (!ok) return;
            const ingredienti = fav.ingredienti && fav.ingredienti.length > 0
                ? fav.ingredienti.map(({ _id, ...ing }) => ing)
                : [{ nome: fav.alimenti, calorie: fav.calorie, proteine: fav.proteine, carboidrati: fav.carboidrati, grassi: fav.grassi }];
            this.aggiungiIngredienti(ingredienti);
        });
    }

    async handleEditIngredient(idx) {
        const ing = this.prep.ingredienti[idx];
        if (!ing) return;
        const vecchiGrammi = ing.grammi || 100;
        const res = await modal.showModal({ type: 'prompt', title: `Modifica: ${ing.nome}`, message: 'Quanti grammi hai usato?', inputValue: String(vecchiGrammi) });
        if (res === null || res === false) return;

        const nuoviGrammi = parseFloat(String(res).replace(',', '.'));
        if (isNaN(nuoviGrammi) || nuoviGrammi <= 0) {
            return modal.showModal({ type: 'error', title: 'Errore', message: 'Valore non valido.' });
        }

        const mult = nuoviGrammi / vecchiGrammi;
        const aggiornato = {
            ...ing, grammi: nuoviGrammi,
            calorie: parseFloat((ing.calorie * mult).toFixed(1)),
            proteine: parseFloat((ing.proteine * mult).toFixed(1)),
            carboidrati: parseFloat((ing.carboidrati * mult).toFixed(1)),
            grassi: parseFloat((ing.grassi * mult).toFixed(1))
        };
        const diff = nuoviGrammi - vecchiGrammi;
        const ingredienti = this.prep.ingredienti.map((x, i) => i === idx ? aggiornato : x);

        const prep = this.prep;
        const r = await this.salva({ ingredienti });
        if (!r || !r.success) return;
        if (diff > 0) pantrySync.scalaDispensa(comePasto(prep, [{ nome: ing.nome, grammi: diff }]));
        else if (diff < 0) pantrySync.ripristinaDispensa(comePasto(prep, []), [{ nome: ing.nome, grammi: -diff }], 'Meal prep: riduzione grammi');
    }

    async handleRemoveIngredient(idx) {
        const ing = this.prep.ingredienti[idx];
        if (!ing) return;
        const ok = await modal.showModal({ type: 'confirm', title: 'Rimuovi', message: `Rimuovere "${ing.nome}" dalla preparazione?`, confirmText: 'Sì', cancelText: 'No' });
        if (!ok) return;

        const prep = this.prep;
        const r = await this.salva({ ingredienti: this.prep.ingredienti.filter((_, i) => i !== idx) });
        if (r && r.success) pantrySync.ripristinaDispensa(comePasto(prep, []), [ing], 'Meal prep: ingrediente rimosso');
    }

    async handleToggleActive() {
        const conclusa = this.prep.attiva;
        const r = await this.salva({ attiva: !this.prep.attiva });
        if (r && r.success && conclusa) {
            pantrySync.showToast(`✅ ${this.prep.nome} conclusa`, 'bg-green-600');
            this.renderList();
        }
    }

    async handleDelete() {
        const ok = await modal.showModal({
            type: 'confirm', title: 'Elimina preparazione',
            message: `Eliminare "${this.prep.nome}"? Gli ingredienti tornano in dispensa.`,
            confirmText: 'Elimina', cancelText: 'Annulla'
        });
        if (!ok) return;

        const prep = this.prep;
        this.loading('Eliminazione...');
        const r = await prepService.deletePrep(prep._id);
        if (!r.success) {
            await modal.showModal({ type: 'error', title: 'Non eliminabile', message: r.error || 'Eliminazione non riuscita.' });
            return this.renderDetail(prep._id);
        }
        await pantrySync.ripristinaDispensa(comePasto(prep, []), prep.ingredienti, 'Meal prep eliminato');
        this.renderList();
    }
}

// ─── FOGLIO "AGGIUNGI PORZIONE" ────────────────────────────────────────────
// prepId: preparazione già scelta (altrimenti si sceglie tra le attive)
// mealId: aggiunge la porzione a un pasto esistente (altrimenti crea un nuovo pasto)
// onDone(meal): chiamata dopo il salvataggio
export async function openPortionSheet({ prepId = null, mealId = null, onDone = () => { } }) {
    let preps;
    try {
        if (prepId) {
            const r = await prepService.getPrep(prepId);
            preps = r.success ? [r.prep] : [];
        } else {
            preps = await prepService.listPreps('attive');
        }
    } catch (e) {
        return modal.showModal({ type: 'error', title: 'Errore', message: 'Errore di connessione al server.' });
    }
    if (!Array.isArray(preps) || preps.length === 0) {
        return modal.showModal({ type: 'alert', title: 'Nessun meal prep', message: 'Non hai preparazioni attive. Creane una da Nutrizione › Prep.' });
    }

    const stato = {
        prep: preps.length === 1 ? preps[0] : null,
        modo: null, pasto: prepService.pastoPerOra(new Date().getHours())
    };

    const sheet = document.createElement('div');
    sheet.id = 'prep-portion-sheet';
    sheet.className = 'fixed inset-0 z-[99990] flex items-end justify-center bg-gray-900/60 backdrop-blur-sm opacity-0 transition-opacity duration-300';
    sheet.innerHTML = `<div class="bg-white w-full max-w-md rounded-t-[2rem] p-6 shadow-2xl transform translate-y-full transition-transform duration-300 max-h-[88vh] overflow-y-auto [&::-webkit-scrollbar]:hidden" style="padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));"></div>`;
    document.getElementById('prep-portion-sheet')?.remove();
    document.body.appendChild(sheet);
    document.body.style.overflow = 'hidden';
    const box = sheet.firstElementChild;

    const chiudi = () => {
        sheet.classList.add('opacity-0');
        box.classList.add('translate-y-full');
        setTimeout(() => { sheet.remove(); document.body.style.overflow = ''; }, 300);
    };

    const modoIniziale = (p) => {
        try {
            const salvato = localStorage.getItem(`prepUnita_${p._id}`);
            if (salvato === 'grammi' || salvato === 'porzioni') return salvato;
        } catch { }
        return p.pesoTotaleCotto > 0 && !(p.porzioniPreviste > 0) ? 'grammi' : 'porzioni';
    };

    const intestazione = (titolo) => `
        <div class="flex justify-between items-center mb-5">
            <h2 class="text-xl font-black text-gray-900">${titolo}</h2>
            <button class="close-sheet text-gray-400 bg-gray-100 p-2 rounded-full active:scale-90 transition-transform">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>`;

    function disegnaScelta() {
        box.innerHTML = `
            ${intestazione('Quale preparazione?')}
            <div class="space-y-2">
                ${preps.map(p => `
                    <button data-id="${p._id}" class="pick-prep w-full text-left bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 active:bg-indigo-50 transition-colors">
                        <p class="font-black text-gray-800">🍲 ${esc(p.nome)}</p>
                        <p class="text-[11px] font-bold text-gray-400">Usato ${Math.round((p.riepilogo?.quotaUsata || 0) * 100)}% · cucinato il ${dataBreve(p.dataCreazione)}</p>
                    </button>`).join('')}
            </div>`;
        box.querySelector('.close-sheet').addEventListener('click', chiudi);
        box.querySelectorAll('.pick-prep').forEach(btn => btn.addEventListener('click', () => {
            stato.prep = preps.find(p => String(p._id) === btn.dataset.id);
            stato.modo = null;
            disegna();
        }));
    }

    function disegna() {
        const p = stato.prep;
        if (!stato.modo) stato.modo = modoIniziale(p);
        const grammi = stato.modo === 'grammi';
        const serveDato = grammi ? !(p.pesoTotaleCotto > 0) : !(p.porzioniPreviste > 0);
        const r = p.riepilogo || { quotaUsata: 0, grammiUsati: null };
        const rimasto = Math.max(0, 100 - Math.round(r.quotaUsata * 100));
        const rimastoGrammi = r.grammiUsati !== null ? ` (~${Math.max(0, p.pesoTotaleCotto - r.grammiUsati)} g)` : '';
        const tab = (modo, label) => `<button data-modo="${modo}" class="modo-btn flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${stato.modo === modo ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}">${label}</button>`;

        box.innerHTML = `
            ${intestazione(`Porzione di ${esc(p.nome)}`)}
            <p class="text-[12px] font-bold text-gray-400 -mt-3 mb-4">Rimasto circa ${rimasto}%${rimastoGrammi}</p>

            <div class="flex bg-gray-100 p-1 rounded-xl mb-4">${tab('porzioni', 'Porzioni')}${tab('grammi', 'Grammi')}</div>

            <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">${grammi ? 'Quanti grammi hai preso?' : 'Quante porzioni?'}</label>
            <input id="portion-qty" type="number" inputmode="decimal" step="any" value="${grammi ? '' : '1'}" placeholder="${grammi ? 'es. 250' : '1'}"
                class="w-full bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-2xl font-black text-center outline-none focus:ring-2 focus:ring-indigo-500 mb-4">

            ${serveDato ? `
                <label class="block text-xs font-semibold text-orange-500 uppercase mb-2">${grammi ? 'Peso totale del cotto (g)' : 'In quante porzioni la dividi?'}</label>
                <input id="portion-extra" type="number" inputmode="decimal" step="any" placeholder="${grammi ? 'es. 1200' : 'es. 4'}"
                    class="w-full bg-orange-50 border border-orange-200 rounded-xl p-3 text-lg font-bold text-center outline-none focus:ring-2 focus:ring-orange-400 mb-1">
                <p class="text-[11px] font-medium text-gray-400 mb-4">${grammi ? 'Serve una volta sola: pesa il cotto senza pentola.' : 'È una stima: potrai correggerla e i giorni registrati si ricalcolano.'}</p>
            ` : ''}

            ${mealId ? '' : `
                <div class="grid grid-cols-4 gap-1.5 mb-4">
                    ${['Colazione', 'Pranzo', 'Cena', 'Spuntino'].map(t => `
                        <button data-pasto="${t}" class="pasto-btn py-2.5 rounded-xl text-[12px] font-bold border transition-colors ${stato.pasto === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-gray-200'}">${t}</button>
                    `).join('')}
                </div>`}

            <div id="portion-preview" class="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-center text-sm font-bold text-gray-700 mb-4"></div>

            <button id="portion-save" class="w-full bg-indigo-600 text-white font-black text-[15px] py-4 rounded-2xl shadow-md active:scale-95 transition-transform">
                ${mealId ? 'Aggiungi al pasto' : 'Aggiungi a oggi'}
            </button>`;

        box.querySelector('.close-sheet').addEventListener('click', chiudi);
        box.querySelectorAll('.modo-btn').forEach(btn => btn.addEventListener('click', () => {
            stato.modo = btn.dataset.modo;
            try { localStorage.setItem(`prepUnita_${p._id}`, stato.modo); } catch { }
            disegna();
        }));
        box.querySelectorAll('.pasto-btn').forEach(btn => btn.addEventListener('click', () => {
            stato.pasto = btn.dataset.pasto;
            box.querySelectorAll('.pasto-btn').forEach(b => {
                const attivo = b.dataset.pasto === stato.pasto;
                b.className = `pasto-btn py-2.5 rounded-xl text-[12px] font-bold border transition-colors ${attivo ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-gray-200'}`;
            });
        }));

        const qtyInput = box.querySelector('#portion-qty');
        const extraInput = box.querySelector('#portion-extra');
        const leggi = (el) => el ? parseFloat(String(el.value).replace(',', '.')) || 0 : 0;

        const aggiornaAnteprima = () => {
            const qty = leggi(qtyInput);
            const extra = leggi(extraInput);
            const prepConExtra = { ...p };
            if (extraInput && extra > 0) prepConExtra[grammi ? 'pesoTotaleCotto' : 'porzioniPreviste'] = extra;
            const v = prepService.anteprimaPorzione(prepConExtra, grammi ? { prepGrammi: qty } : { prepPorzioni: qty });
            box.querySelector('#portion-preview').textContent = v ? `≈ ${rigaMacro(v)}` : 'Inserisci i dati per vedere i valori';
        };
        qtyInput.addEventListener('input', aggiornaAnteprima);
        extraInput?.addEventListener('input', aggiornaAnteprima);
        aggiornaAnteprima();
        if (grammi) setTimeout(() => qtyInput.focus(), 350);

        box.querySelector('#portion-save').addEventListener('click', async () => {
            const qty = leggi(qtyInput);
            const extra = leggi(extraInput);
            if (qty <= 0) return modal.showModal({ type: 'error', title: 'Quantità', message: grammi ? 'Inserisci i grammi.' : 'Inserisci il numero di porzioni.' });
            if (extraInput && extra <= 0) return modal.showModal({ type: 'error', title: 'Manca un dato', message: grammi ? 'Inserisci il peso totale del cotto.' : 'Inserisci in quante porzioni la dividi.' });

            const btn = box.querySelector('#portion-save');
            btn.disabled = true;
            btn.textContent = 'Salvataggio...';
            try {
                if (extraInput) {
                    const up = await prepService.updatePrep(p._id, grammi ? { pesoTotaleCotto: extra } : { porzioniPreviste: extra });
                    if (!up.success) throw new Error(up.error || 'Salvataggio non riuscito.');
                }
                const r = await prepService.addPortion(p._id, {
                    ...(mealId ? { mealId } : { pasto: stato.pasto }),
                    ...(grammi ? { prepGrammi: qty } : { prepPorzioni: qty })
                });
                if (!r.success) throw new Error(r.error || 'Salvataggio non riuscito.');
                chiudi();
                pantrySync.showToast(`🍲 ${p.nome}: ${prepService.etichettaPorzione(grammi ? { prepGrammi: qty } : { prepPorzioni: qty })} aggiunta`, 'bg-indigo-600');
                onDone(r.meal);
            } catch (e) {
                btn.disabled = false;
                btn.textContent = mealId ? 'Aggiungi al pasto' : 'Aggiungi a oggi';
                modal.showModal({ type: 'error', title: 'Errore', message: e.message || 'Errore di connessione.' });
            }
        });
    }

    if (stato.prep) disegna(); else disegnaScelta();
    requestAnimationFrame(() => {
        sheet.classList.remove('opacity-0');
        box.classList.remove('translate-y-full');
    });
}
