// public/js/views/PantryView.js
// Dispensa: dati, chiamate al server e flussi. Il disegno è in pantryUi.js, i calcoli in pantryLogic.js.

import * as pantryService from '../services/pantryService.js?v=37';
import * as scanner from '../components/scanner.js?v=37';
import * as modal from '../components/modal.js?v=37';
import { intero } from '../components/format.js?v=37';
import * as pantryUi from './pantryUi.js?v=37';
import { rifornimento, correzioneGrammi, trovaEsistente, pesoConfezioneOFF } from '../services/pantryLogic.js?v=37';
import { showToast } from '../services/pantrySync.js?v=37';

const ERRORE_RETE = { type: 'error', title: 'Non salvato', message: 'Controlla la connessione e riprova.' };

export class PantryView {
    constructor(container) {
        this.container = container;
        this.vista = container.dataset.vista;
        this.items = [];
    }

    // Vero se nel frattempo è stata aperta un'altra sezione (vedi numeroVista in app.js): una risposta
    // arrivata tardi dal server non deve disegnare sopra la sezione nuova. I salvataggi si fanno lo stesso.
    get superata() {
        return this.container.dataset.vista !== this.vista;
    }

    async render() {
        if (this.superata) return;
        this.container.innerHTML = `
            <div class="flex justify-center items-center min-h-screen">
                <p class="animate-pulse font-bold text-gray-500">Caricamento...</p>
            </div>`;
        try {
            this.items = await pantryService.getPantryItems();
        } catch (e) {
            if (this.superata) return;
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold text-red-500">Non riesco a caricare la dispensa. Controlla la connessione.</div>`;
            return;
        }
        if (this.superata) return;
        pantryUi.renderDispensa(this.container, this.items, {
            onApri: (id) => this.showProdotto(id),
            onDaComprare: () => this.showShoppingList(),
            onScansiona: () => this.apriScanner(),
            onAMano: () => this.apriAMano(),
            onChiudiScanner: () => this.chiudiScanner()
        });
    }

    apriScanner() {
        pantryUi.mostraScanner(true);
        scanner.startScanner(
            'pantry-reader-video',
            (barcode) => { this.chiudiScanner(); this.handleCodice(barcode); },
            async (err) => {
                await modal.showModal({ type: 'error', title: 'Fotocamera', message: err });
                this.chiudiScanner();
            }
        );
    }

    chiudiScanner() {
        scanner.stopScanner();
        pantryUi.mostraScanner(false);
    }

    // ─── PRODOTTO ───────────────────────────────────────────────────────────────
    async showProdotto(itemId) {
        const item = this.items.find(i => String(i._id) === String(itemId));
        if (!item) return this.render();
        const utilizzi = await pantryService.getPantryItemUsage(itemId).catch(() => []);
        if (this.superata) return;
        pantryUi.renderProdotto(this.container, item, Array.isArray(utilizzi) ? utilizzi : [], {
            onIndietro: () => this.render(),
            onAggiungiConfezioni: () => pantryUi.apriFoglioConfezioni(item, (n, g) =>
                this.salvaProdotto(item, rifornimento(item, n, g))),
            onCorreggi: () => pantryUi.apriFoglioCorreggi(item, (grammi) =>
                this.salvaProdotto(item, correzioneGrammi(item, grammi))),
            onTogli: async () => {
                const ok = await modal.showModal({ type: 'confirm', title: 'Togli dalla dispensa', message: `${item.nome} sparisce dall'elenco e la nutrizionista non lo considera più.`, confirmText: 'Togli', cancelText: 'Annulla', pericolo: true });
                if (!ok) return;
                await pantryService.deletePantryItem(item._id);
                this.render();
            }
        });
    }

    // Salva le modifiche di un prodotto e ridisegna la sua pagina con i dati aggiornati
    async salvaProdotto(item, modifiche) {
        try {
            await pantryService.updatePantryItem(item._id, modifiche);
            this.items = await pantryService.getPantryItems();
        } catch (e) {
            await modal.showModal(ERRORE_RETE);
        }
        this.showProdotto(item._id);
    }

    // ─── DA COMPRARE ────────────────────────────────────────────────────────────
    showShoppingList() {
        if (this.superata) return;
        pantryUi.renderDaComprare(this.container, this.items, {
            onIndietro: () => this.render(),
            onMetti: async (scelte) => {
                try {
                    // La spesa si somma a quello che resta (vedi rifornimento)
                    await Promise.all(scelte.map(({ id, confezioni, grammiLuna }) => {
                        const item = this.items.find(i => String(i._id) === String(id));
                        return pantryService.updatePantryItem(id, rifornimento(item, confezioni, grammiLuna));
                    }));
                    showToast(scelte.length === 1 ? '1 prodotto messo in dispensa' : `${scelte.length} prodotti messi in dispensa`);
                } catch (e) {
                    await modal.showModal(ERRORE_RETE);
                }
                this.render();
            }
        });
    }

    // ─── AGGIUNGERE ─────────────────────────────────────────────────────────────
    // Codice letto dallo scanner o scritto nel foglio "A mano" (con le confezioni scelte lì)
    async handleCodice(codice, confezioni = 1) {
        const chiudiAvviso = showToast('Cerco il codice…');
        let data;
        try {
            data = await pantryService.fetchOpenFoodFacts(codice);
        } catch (e) {
            chiudiAvviso();
            return modal.showModal({ type: 'error', title: 'Codice non cercato', message: 'Non riesco a cercare il codice. Controlla la connessione.' });
        }
        chiudiAvviso();
        if (this.superata) return;
        if (data?.status !== 1) {
            const ok = await modal.showModal({ type: 'confirm', title: 'Codice non trovato', message: `Il codice ${codice} non è su Open Food Facts. Scrivi tu i dati: lo aggiungo alla dispensa e anche lì.`, confirmText: 'Scrivo i dati', cancelText: 'Annulla' });
            if (ok) this.apriAMano({ codiceOFF: codice, confezioni });
            return;
        }

        const p = data.product;
        const valori = { ...pantryService.valoriDaOFF(p), nome: p.product_name || p.product_name_it || 'Prodotto sconosciuto' };
        const categoria = pantryService.determinaCategoria(valori.nome, valori.proteine100, valori.carbo100, valori.grassi100, valori.calorie100);
        const esistente = trovaEsistente(this.items, { barcode: codice, nome: valori.nome });
        pantryUi.apriFoglioTrovato({ codice, valori, grammiLuna: pesoConfezioneOFF(p), categoria, esistente, confezioni }, async (scelta) => {
            try {
                await this.aggiungi({
                    esistente, confezioni: scelta.confezioni, grammiLuna: scelta.grammiLuna,
                    nuovo: { barcode: codice, immagine: p.image_front_small_url || p.image_front_url || '', ...valori, categoria: scelta.categoria }
                });
            } catch (e) {
                await modal.showModal(ERRORE_RETE);
            }
        });
    }

    apriAMano({ codiceOFF = '', confezioni = 1 } = {}) {
        pantryUi.apriFoglioAMano({ codiceOFF, confezioni }, {
            onCodice: (codice, n) => this.handleCodice(codice, n),
            onSalva: async (dati) => {
                const { marca, foto, pesoConfezione, quantitaConfezioni, ...prodotto } = dati;
                try {
                    await this.aggiungi({
                        esistente: trovaEsistente(this.items, { barcode: codiceOFF, nome: dati.nome }),
                        confezioni: quantitaConfezioni, grammiLuna: pesoConfezione,
                        nuovo: { barcode: codiceOFF, immagine: '', ...prodotto }
                    });
                } catch (e) {
                    await modal.showModal(ERRORE_RETE);
                    throw e;
                }
                // Codice sconosciuto: lo aggiunge anche a Open Food Facts (se non riesce, la dispensa resta)
                if (codiceOFF) {
                    pantryService.addToOpenFoodFacts({ barcode: codiceOFF, nome: dati.nome, marca, foto, calorie100: dati.calorie100, proteine100: dati.proteine100, carbo100: dati.carbo100, grassi100: dati.grassi100 })
                        .catch(err => console.warn("L'invio a Open Food Facts è fallito", err));
                }
            }
        });
    }

    // Un prodotto già in dispensa si somma (stessa regola della spesa), uno nuovo si crea
    async aggiungi({ esistente, nuovo, confezioni, grammiLuna }) {
        let totale;
        if (esistente) {
            const modifiche = rifornimento(esistente, confezioni, grammiLuna);
            await pantryService.updatePantryItem(esistente._id, modifiche);
            totale = modifiche.grammiRimasti;
        } else {
            const esito = await pantryService.addPantryItem({ ...nuovo, pesoConfezione: grammiLuna, quantitaConfezioni: confezioni });
            if (!esito?.success) throw new Error(esito?.error || 'salvataggio non riuscito');
            totale = esito.item.grammiRimasti;
        }
        showToast(`${esistente ? esistente.nome : nuovo.nome}: ${intero(totale)} g in dispensa`);
        this.render();
    }
}
