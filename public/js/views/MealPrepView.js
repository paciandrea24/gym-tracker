// public/js/views/MealPrepView.js
// Meal prep: un lotto cucinato una volta (es. ragù) e mangiato in più giorni.
// Si pesano gli ingredienti crudi e, ogni giorno, i grammi che si mangiano. Il cotto si considera
// pesante quanto il crudo (stima scelta dall'utente): niente pentola da pesare, niente porzioni.

import * as prepService from '../services/mealPrepService.js?v=36';
import * as nutriService from '../services/nutriService.js?v=36';
import * as pantryService from '../services/pantryService.js?v=36';
import * as pantrySync from '../services/pantrySync.js?v=36';
import * as scanner from '../components/scanner.js?v=36';
import * as voice from '../components/voice.js?v=36';
import * as modal from '../components/modal.js?v=36';
import * as ui from '../ui.js?v=36';
import { intero, macroColonne, macroTesto, perCento } from '../components/format.js?v=36';
import { apriFoglio } from '../components/sheet.js?v=36';
import { icona } from '../components/icons.js?v=36';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const leggiNumero = (v) => parseFloat(String(v).replace(',', '.')) || 0;
const maiuscola = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const giornoLungo = (d) => new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const giornoBreve = (d) => maiuscola(new Date(d).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }));

const BTN_PRINCIPALE = 'w-full bg-gray-900 text-white font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform';
const BTN_SECONDARIO = 'w-full bg-white border border-gray-200 text-gray-800 font-bold text-[15px] py-3.5 rounded-2xl active:scale-95 transition-transform';
const CARD = 'bg-white p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100';

const ICONA_INDIETRO = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>`;
const ICONA_AVANTI = `<svg class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
const ICONA_MATITA = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`;
const ICONA_MIC = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>`;

const pesoIngredienti = (p) => Math.round(p.ingredienti.reduce((s, ing) => s + (Number(ing.grammi) || 0), 0));

function valoriOgni100(p, { grande = false } = {}) {
    const v = perCento(p, p.pesoTotaleCotto);
    if (!v) return `<p class="text-[14px] font-semibold text-gray-500">Aggiungi gli ingredienti crudi con i loro pesi per vedere i valori.</p>`;
    return `
        <p class="text-[11px] font-semibold text-gray-400">Ogni 100 g</p>
        <p class="text-gray-900"><span class="${grande ? 'text-3xl' : 'text-2xl'} font-black">${intero(v.calorie)}</span> <span class="text-sm font-bold text-gray-400">kcal</span></p>
        <div class="mt-2">${macroColonne(v, { dimensione: grande ? 'text-[15px]' : 'text-[14px]' })}</div>`;
}

function rimasti(p) {
    const r = p.riepilogo || {};
    if (!(p.pesoTotaleCotto > 0) || r.grammiRimasti == null) return '';
    const perc = Math.min(100, Math.round(r.grammiRimasti / p.pesoTotaleCotto * 100));
    return `
        <div>
            <div class="flex justify-between text-[13px] font-bold mb-1.5">
                <span class="text-gray-900">${r.grammiRimasti > 0 ? `Rimasti circa ${r.grammiRimasti} g` : 'Finita'}</span>
                <span class="text-gray-400">su ${p.pesoTotaleCotto} g</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div class="bg-indigo-500 h-2 rounded-full" style="width:${perc}%"></div></div>
        </div>`;
}

function notaPeso(p) {
    const crudo = pesoIngredienti(p);
    return p.pesoTotaleCotto === crudo
        ? `Tutto il lotto: ${intero(p.calorie)} kcal. Stima: il cotto conta come gli ingredienti crudi (${crudo} g).`
        : `Tutto il lotto: ${intero(p.calorie)} kcal, su ${p.pesoTotaleCotto} g di cotto.`;
}

function quantitaPorzione(por) {
    if (por.prepGrammi > 0) return `${intero(por.prepGrammi)} g`;
    if (por.grammi > 0) return `${intero(por.grammi)} g`;
    return prepService.etichettaPorzione(por);
}

// Voce (principale) e Manuale / Scanner / Preferiti, più lo scanner che si apre al posto dei pulsanti
function metodiAggiunta() {
    const tasto = (id, simbolo, testo) => `
        <button id="${id}" class="bg-white border border-gray-200 text-gray-800 font-bold text-[13px] py-3 rounded-2xl flex flex-col items-center gap-1 active:scale-95 transition-transform">
            ${simbolo}${testo}
        </button>`;
    return `
        <div id="prep-action-buttons" class="space-y-2">
            <button id="prep-voice-btn" class="${BTN_PRINCIPALE} flex justify-center items-center gap-2">${ICONA_MIC} Voce</button>
            <div class="grid grid-cols-3 gap-2">
                ${tasto('prep-manual-btn', icona.piu('w-5 h-5 text-gray-700'), 'Manuale')}${tasto('prep-scan-btn', icona.fotocamera('w-5 h-5 text-blue-600'), 'Scanner')}${tasto('prep-fav-btn', icona.stella('w-5 h-5 text-yellow-500'), 'Preferiti')}
            </div>
        </div>
        <div id="prep-scanner-container" class="hidden bg-gray-900 p-2 rounded-2xl shadow-xl border border-gray-800">
            <p class="text-center text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Inquadra il codice a barre</p>
            <video id="prep-reader-video" class="w-full rounded-xl overflow-hidden mb-3 bg-black min-h-[220px]" autoplay playsinline></video>
            <button id="prep-close-scanner" class="w-full bg-white text-gray-900 font-bold py-3 rounded-xl active:scale-95 transition-transform">Annulla</button>
        </div>`;
}

// Oggetto "pasto" per pantrySync: gli ingredienti del meal prep scalano la dispensa come un pasto
const comePasto = (prep, ingredienti) => ({ _id: null, pasto: 'Meal prep', alimenti: prep.nome, ingredienti });

export class MealPrepView {
    constructor(container, onBack) {
        this.container = container;
        this.vista = container.dataset.vista;
        this.onBack = onBack;
        this.prep = null;
    }

    // Vero se nel frattempo è stata aperta un'altra sezione (vedi numeroVista in app.js): una risposta
    // arrivata tardi dal server non deve disegnare sopra la sezione nuova. I salvataggi si fanno lo stesso.
    get superata() {
        return this.container.dataset.vista !== this.vista;
    }

    loading(testo) {
        if (this.superata) return;
        this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse text-gray-500">${testo}</div>`;
    }

    intestazione(titolo, { idIndietro, conMatita = false } = {}) {
        return `
            <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center justify-between">
                <div class="flex items-center min-w-0">
                    <button id="${idIndietro}" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2" aria-label="Indietro">${ICONA_INDIETRO}</button>
                    <h1 class="text-xl font-bold text-gray-900 truncate">${titolo}</h1>
                </div>
                ${conMatita ? `<button id="rename-prep-btn" class="p-2 text-gray-500 bg-gray-100 rounded-full active:scale-95" aria-label="Rinomina">${ICONA_MATITA}</button>` : ''}
            </header>`;
    }

    // ─── ELENCO ────────────────────────────────────────────────────────────
    async renderList() {
        this.loading('Caricamento preparazioni...');
        let preps;
        try {
            preps = await prepService.listPreps('tutte');
            if (!Array.isArray(preps)) throw new Error();
        } catch (e) {
            if (!this.superata) this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold text-red-500">Errore di connessione al server.</div>`;
            return;
        }
        if (this.superata) return;
        const attive = preps.filter(p => p.attiva);
        const concluse = preps.filter(p => !p.attiva);

        const card = (p) => `
            <div data-id="${p._id}" class="apri-prep ${CARD} cursor-pointer">
                <div class="flex justify-between items-start gap-2">
                    <div class="min-w-0">
                        <h3 class="text-lg font-black text-gray-900 leading-tight">${esc(p.nome)}</h3>
                        <p class="text-[12px] font-semibold text-gray-400 mt-0.5">Cucinato ${giornoLungo(p.dataCreazione)}</p>
                    </div>
                    <span class="mt-1">${ICONA_AVANTI}</span>
                </div>
                <div class="mt-4 bg-gray-50 border border-gray-100 rounded-2xl p-3">${valoriOgni100(p)}</div>
                ${p.pesoTotaleCotto > 0 ? `<div class="mt-4">${rimasti(p)}</div>` : ''}
                ${p.pesoTotaleCotto > 0
                    ? `<button data-id="${p._id}" class="add-portion-btn mt-5 ${BTN_PRINCIPALE} !py-3.5 !shadow-none">+ Aggiungi a oggi</button>`
                    : `<button data-id="${p._id}" class="open-prep-btn mt-5 ${BTN_SECONDARIO}">Aggiungi gli ingredienti</button>`}
            </div>`;

        this.container.innerHTML = `
            ${this.intestazione('Meal prep', { idIndietro: 'prep-back-btn' })}
            <main class="p-4 space-y-4 pb-24 safe-pb bg-gray-50 min-h-screen">
                ${attive.length === 0 ? `
                    <div class="text-center py-6 px-4">
                        <div class="flex justify-center mb-3">${icona.pentola('w-10 h-10 text-gray-300')}</div>
                        <p class="text-gray-600 font-medium text-[15px] leading-relaxed">Quando cucini qualcosa che dura più giorni (es. il ragù), registralo qui una volta sola con i suoi ingredienti crudi. Poi ogni giorno scrivi solo quanti grammi ne mangi.</p>
                    </div>
                    <button id="new-prep-btn" class="${BTN_PRINCIPALE}">+ Nuova preparazione</button>
                ` : `
                    ${attive.map(card).join('')}
                    <button id="new-prep-btn" class="${BTN_SECONDARIO}">+ Nuova preparazione</button>
                `}

                ${concluse.length > 0 ? `
                    <details class="bg-white rounded-2xl border border-gray-100 px-4 py-3">
                        <summary class="text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer">Concluse (${concluse.length})</summary>
                        <div class="mt-2 divide-y divide-gray-100">
                            ${concluse.map(p => `
                                <button data-id="${p._id}" class="open-prep-btn w-full text-left flex justify-between items-center py-3 active:opacity-60">
                                    <span class="font-bold text-gray-700 text-[15px]">${esc(p.nome)}</span>
                                    <span class="flex items-center gap-2 text-[12px] font-semibold text-gray-400">${giornoBreve(p.dataCreazione)} ${ICONA_AVANTI}</span>
                                </button>
                            `).join('')}
                        </div>
                    </details>
                ` : ''}
            </main>
        `;

        document.getElementById('prep-back-btn').addEventListener('click', () => this.onBack());
        document.getElementById('new-prep-btn').addEventListener('click', () => this.handleNewPrep());
        this.container.querySelectorAll('.apri-prep').forEach(el =>
            el.addEventListener('click', (e) => {
                if (e.target.closest('button')) return; // i pulsanti della card hanno la loro azione
                this.renderDetail(el.dataset.id);
            }));
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
        if (this.superata) return;
        const p = this.prep;
        const vuota = p.ingredienti.length === 0;
        this.container.innerHTML = `
            ${this.intestazione(esc(p.nome), { idIndietro: 'prep-detail-back', conMatita: true })}
            <main class="p-4 space-y-5 pb-24 safe-pb bg-gray-50 min-h-screen">
                ${!p.attiva ? `<div class="bg-gray-200 text-gray-600 text-xs font-bold text-center rounded-xl py-2">Preparazione conclusa</div>` : ''}
                ${vuota ? this.htmlPassi() : this.htmlDettaglio()}
            </main>
        `;
        this.bindDetail();
    }

    // Preparazione appena creata: i due passi, con i pulsanti centrati sotto il primo
    htmlPassi() {
        const passo = (n, attivo, titolo, testo) => `
            <div class="${CARD}">
                <div class="flex gap-3">
                    <span class="w-7 h-7 rounded-full ${attivo ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'} text-sm font-black flex items-center justify-center flex-shrink-0">${n}</span>
                    <div class="flex-1 min-w-0">
                        <p class="font-black text-gray-900">${titolo}</p>
                        <p class="text-[13px] font-medium text-gray-500 mt-0.5">${testo}</p>
                    </div>
                </div>
            </div>`;
        return `
            <div class="space-y-3">
                ${passo(1, true, 'Ingredienti crudi', 'Aggiungili con i loro pesi, come per un pasto: si scalano dalla dispensa.')}
                ${metodiAggiunta()}
                ${passo(2, false, 'Ogni giorno, i grammi che mangi', 'Pesa il piatto e scrivi i grammi, da qui o a voce ("pasta 80 g con 250 g di ragù"). I valori si calcolano dagli ingredienti crudi.')}
            </div>
            <button id="delete-prep-btn" class="w-full text-red-600 font-bold text-sm py-2">Elimina preparazione</button>`;
    }

    htmlDettaglio() {
        const p = this.prep;
        const ingredienti = p.ingredienti.map((ing, idx) => `
            <button data-idx="${idx}" class="riga-ing w-full flex justify-between items-center py-3 text-left active:opacity-60">
                <div class="min-w-0 pr-2">
                    <p class="text-[15px] font-bold text-gray-800 leading-tight break-words">${esc(ing.nome)}</p>
                    <p class="text-[12px] font-semibold text-gray-400 mt-0.5">${ing.grammi ? `${intero(ing.grammi)} g · ` : ''}${intero(ing.calorie)} kcal</p>
                </div>
                ${ICONA_AVANTI}
            </button>`).join('');

        const mangiato = p.porzioni.length === 0
            ? `<p class="text-center text-sm font-medium text-gray-500 py-4">Ancora niente: la prima volta che la mangi usa "Aggiungi a oggi".</p>`
            : p.porzioni.map(por => `
                <div class="flex justify-between items-center gap-2 py-3 text-[14px]">
                    <span class="font-bold text-gray-700">${giornoBreve(por.data)} · ${esc(por.pasto)}</span>
                    <span class="font-bold text-gray-500 whitespace-nowrap">${por.prepDaCompletare ? 'da completare' : `${quantitaPorzione(por)} · ${intero(por.calorie)} kcal`}</span>
                </div>`).join('');

        return `
            <div class="${CARD}">
                ${valoriOgni100(p, { grande: true })}
                <div class="border-t border-gray-100 mt-4 pt-3 space-y-3">
                    ${rimasti(p)}
                    <p class="text-[12px] font-semibold text-gray-400 leading-snug">${notaPeso(p)}</p>
                </div>
            </div>

            ${p.attiva ? `<button id="detail-add-portion" class="${BTN_PRINCIPALE}">+ Aggiungi a oggi</button>` : ''}

            <div>
                <div class="flex justify-between items-end px-1 mb-2">
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Ingredienti crudi</h3>
                    <button id="toggle-metodi" class="text-[13px] font-bold text-indigo-600">+ Aggiungi</button>
                </div>
                <div id="pannello-metodi" class="hidden space-y-2 mb-3">${metodiAggiunta()}</div>
                <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">${ingredienti}</div>
            </div>

            <div>
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Mangiato finora</h3>
                <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">${mangiato}</div>
            </div>

            <div class="space-y-1 pt-1">
                <button id="toggle-prep-active" class="${BTN_SECONDARIO} !text-sm !py-3">${p.attiva ? 'Concludi preparazione' : 'Riattiva preparazione'}</button>
                ${p.porzioni.length === 0 ? `<button id="delete-prep-btn" class="w-full text-red-600 font-bold text-sm py-2">Elimina preparazione</button>` : ''}
            </div>`;
    }

    bindDetail() {
        const $ = (id) => document.getElementById(id);
        $('prep-detail-back').addEventListener('click', () => { scanner.stopScanner(); this.renderList(); });
        $('rename-prep-btn').addEventListener('click', () => this.handleRename());
        $('detail-add-portion')?.addEventListener('click', () =>
            openPortionSheet({ prepId: this.prep._id, onDone: () => this.renderDetail(this.prep._id) }));
        $('toggle-metodi')?.addEventListener('click', (e) => {
            const pannello = $('pannello-metodi');
            const apri = pannello.classList.contains('hidden');
            if (!apri) this.closeScanner();
            pannello.classList.toggle('hidden', !apri);
            e.currentTarget.textContent = apri ? 'Chiudi' : '+ Aggiungi';
        });
        $('prep-voice-btn').addEventListener('click', (e) => this.handleVoice(e.currentTarget));
        $('prep-manual-btn').addEventListener('click', () => this.openManualForm());
        $('prep-scan-btn').addEventListener('click', () => this.handleScan());
        $('prep-close-scanner').addEventListener('click', () => this.closeScanner());
        $('prep-fav-btn').addEventListener('click', () => this.handleFavorites());
        $('toggle-prep-active')?.addEventListener('click', () => this.handleToggleActive());
        $('delete-prep-btn')?.addEventListener('click', () => this.handleDelete());

        this.container.querySelectorAll('.riga-ing').forEach(btn =>
            btn.addEventListener('click', () => this.apriIngrediente(parseInt(btn.dataset.idx, 10))));
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
            pantrySync.showToast(`Ricalcolati ${r.pastiAggiornati} ${r.pastiAggiornati === 1 ? 'pasto' : 'pasti'}`, 'bg-gray-900');
        }
        return r;
    }

    async handleRename() {
        const nome = await modal.showModal({ type: 'prompt', title: 'Rinomina', message: 'Nuovo nome della preparazione', inputValue: this.prep.nome });
        if (!nome || !String(nome).trim()) return;
        await this.salva({ nome: String(nome).trim() });
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
        if (this.superata) return;
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

    // Tocco su un ingrediente: foglio per cambiare i grammi o toglierlo
    apriIngrediente(idx) {
        const ing = this.prep.ingredienti[idx];
        if (!ing) return;
        const { box, chiudi, intestazione, collegaChiudi } = apriFoglio({ id: 'prep-ing-sheet' });
        box.innerHTML = `
            ${intestazione(esc(ing.nome), `${intero(ing.calorie)} kcal · ${macroTesto(ing, { breve: true })}`)}
            <label for="ing-grammi" class="block text-xs font-semibold text-gray-400 uppercase mb-2">Grammi crudi</label>
            <input id="ing-grammi" type="number" inputmode="decimal" step="any" value="${ing.grammi || ''}" placeholder="es. 500"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-2xl font-black text-center outline-none focus:ring-2 focus:ring-gray-900 mb-4">
            <button id="ing-salva" class="${BTN_PRINCIPALE}">Salva</button>
            <button id="ing-togli" class="w-full text-red-600 font-bold text-sm py-3 mt-2">Togli dalla preparazione</button>`;
        collegaChiudi();

        box.querySelector('#ing-salva').addEventListener('click', () => {
            const grammi = leggiNumero(box.querySelector('#ing-grammi').value);
            if (grammi <= 0) return modal.showModal({ type: 'error', title: 'Grammi', message: 'Scrivi quanti grammi crudi hai usato.' });
            chiudi();
            if (grammi !== Number(ing.grammi)) this.cambiaGrammiIngrediente(idx, grammi);
        });
        box.querySelector('#ing-togli').addEventListener('click', () => {
            chiudi();
            this.togliIngrediente(idx);
        });
    }

    async cambiaGrammiIngrediente(idx, nuoviGrammi) {
        const ing = this.prep.ingredienti[idx];
        const vecchiGrammi = ing.grammi || 100;
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

    async togliIngrediente(idx) {
        const ing = this.prep.ingredienti[idx];
        if (!ing) return;
        const ok = await modal.showModal({ type: 'confirm', title: 'Togli', message: `Togliere "${ing.nome}" dalla preparazione? Torna in dispensa.`, confirmText: 'Togli', cancelText: 'Annulla', pericolo: true });
        if (!ok) return;

        const prep = this.prep;
        const r = await this.salva({ ingredienti: this.prep.ingredienti.filter((_, i) => i !== idx) });
        if (r && r.success) pantrySync.ripristinaDispensa(comePasto(prep, []), [ing], 'Meal prep: ingrediente rimosso');
    }

    async handleToggleActive() {
        const conclusa = this.prep.attiva;
        const r = await this.salva({ attiva: !this.prep.attiva });
        if (r && r.success && conclusa) {
            pantrySync.showToast(`${this.prep.nome} conclusa`, 'bg-gray-900');
            this.renderList();
        }
    }

    async handleDelete() {
        const ok = await modal.showModal({
            type: 'confirm', title: 'Elimina preparazione',
            message: `Eliminare "${this.prep.nome}"? Gli ingredienti tornano in dispensa.`,
            confirmText: 'Elimina', cancelText: 'Annulla', pericolo: true
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

// ─── FOGLIO "AGGIUNGI A OGGI" ──────────────────────────────────────────────
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

    const stato = { prep: preps.length === 1 ? preps[0] : null, pasto: prepService.pastoPerOra(new Date().getHours()) };
    const { box, chiudi, intestazione, collegaChiudi } = apriFoglio({ id: 'prep-portion-sheet' });
    const testoRimasti = (p) => p.riepilogo?.grammiRimasti != null ? `Rimasti circa ${p.riepilogo.grammiRimasti} g` : '';

    function disegnaScelta() {
        box.innerHTML = `
            ${intestazione('Quale preparazione?')}
            <div class="space-y-2">
                ${preps.map(p => `
                    <button data-id="${p._id}" class="pick-prep w-full text-left bg-white border border-gray-200 rounded-2xl px-4 py-3.5 flex justify-between items-center active:bg-gray-50 transition-colors">
                        <span class="min-w-0">
                            <span class="block font-black text-gray-900">${esc(p.nome)}</span>
                            <span class="block text-[12px] font-semibold text-gray-400">${[testoRimasti(p), `cucinato ${giornoBreve(p.dataCreazione).toLowerCase()}`].filter(Boolean).join(' · ')}</span>
                        </span>
                        ${ICONA_AVANTI}
                    </button>`).join('')}
            </div>`;
        collegaChiudi();
        box.querySelectorAll('.pick-prep').forEach(btn => btn.addEventListener('click', () => {
            stato.prep = preps.find(p => String(p._id) === btn.dataset.id);
            disegna();
        }));
    }

    function disegna() {
        const p = stato.prep;
        if (!(p.pesoTotaleCotto > 0)) {
            box.innerHTML = `
                ${intestazione(esc(p.nome))}
                <p class="text-[15px] font-medium text-gray-600 mb-5">Prima aggiungi gli ingredienti crudi con i loro pesi: servono per calcolare i valori.</p>
                <button class="chiudi-foglio ${BTN_SECONDARIO}">Ok</button>`;
            collegaChiudi();
            return;
        }

        const r = p.riepilogo || {};
        const iniziali = r.ultimiGrammi || '';
        const chip = (t) => `<button data-pasto="${t}" class="pasto-btn py-2.5 rounded-xl text-[12px] font-bold border transition-colors ${stato.pasto === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-gray-200'}">${t}</button>`;

        box.innerHTML = `
            ${intestazione(esc(p.nome), testoRimasti(p))}
            <label for="portion-qty" class="block text-xs font-semibold text-gray-400 uppercase mb-2">Quanti grammi?</label>
            <input id="portion-qty" type="number" inputmode="decimal" step="any" value="${iniziali}" placeholder="es. 250"
                class="w-full bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-3xl font-black text-center outline-none focus:ring-2 focus:ring-indigo-500">
            <p class="text-[12px] font-semibold text-gray-400 text-center mt-1.5 mb-4">${iniziali ? "Come l'ultima volta" : 'Pesa il piatto e scrivi i grammi'}</p>
            ${mealId ? '' : `<div class="grid grid-cols-4 gap-1.5 mb-4">${['Colazione', 'Pranzo', 'Cena', 'Spuntino'].map(chip).join('')}</div>`}
            <div id="portion-preview" class="bg-gray-50 border border-gray-100 rounded-2xl p-3 mb-4 text-center"></div>
            <button id="portion-save" class="${BTN_PRINCIPALE}">${mealId ? 'Aggiungi al pasto' : 'Aggiungi a oggi'}</button>`;
        collegaChiudi();

        box.querySelectorAll('.pasto-btn').forEach(btn => btn.addEventListener('click', () => {
            stato.pasto = btn.dataset.pasto;
            box.querySelectorAll('.pasto-btn').forEach(b => {
                const attivo = b.dataset.pasto === stato.pasto;
                b.className = `pasto-btn py-2.5 rounded-xl text-[12px] font-bold border transition-colors ${attivo ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-gray-200'}`;
            });
        }));

        const qtyInput = box.querySelector('#portion-qty');
        const anteprima = () => {
            const qty = leggiNumero(qtyInput.value);
            const v = qty > 0 ? prepService.anteprimaPorzione(p, { prepGrammi: qty }) : null;
            const el = box.querySelector('#portion-preview');
            if (!v) {
                el.innerHTML = `<p class="text-sm font-bold text-gray-500 py-2">Scrivi i grammi per vedere i valori</p>`;
                return;
            }
            const restano = r.grammiRimasti != null ? Math.max(0, Math.round(r.grammiRimasti - qty)) : null;
            el.innerHTML = `
                <p class="text-gray-900"><span class="text-xl font-black">${intero(v.calorie)}</span> <span class="text-sm font-bold text-gray-400">kcal</span></p>
                <div class="mt-2 text-left">${macroColonne(v, { dimensione: 'text-[14px]' })}</div>
                ${restano !== null ? `<p class="text-[12px] font-semibold text-gray-400 mt-2">Dopo ne restano circa ${restano} g</p>` : ''}`;
        };
        qtyInput.addEventListener('input', anteprima);
        anteprima();
        if (!iniziali) setTimeout(() => qtyInput.focus(), 350);

        box.querySelector('#portion-save').addEventListener('click', async () => {
            const qty = leggiNumero(qtyInput.value);
            if (qty <= 0) return modal.showModal({ type: 'error', title: 'Grammi', message: 'Scrivi quanti grammi hai mangiato.' });

            const btn = box.querySelector('#portion-save');
            btn.disabled = true;
            btn.textContent = 'Salvataggio...';
            try {
                const res = await prepService.addPortion(p._id, { ...(mealId ? { mealId } : { pasto: stato.pasto }), prepGrammi: qty });
                if (!res.success) throw new Error(res.error || 'Salvataggio non riuscito.');
                chiudi();
                pantrySync.showToast(`${p.nome}: ${intero(qty)} g aggiunti`, 'bg-gray-900');
                onDone(res.meal);
            } catch (e) {
                btn.disabled = false;
                btn.textContent = mealId ? 'Aggiungi al pasto' : 'Aggiungi a oggi';
                modal.showModal({ type: 'error', title: 'Errore', message: e.message || 'Errore di connessione.' });
            }
        });
    }

    if (stato.prep) disegna(); else disegnaScelta();
}
