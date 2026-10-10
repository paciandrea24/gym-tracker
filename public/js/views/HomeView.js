// public/js/views/HomeView.js
// Home: carica i dati della giornata e collega i riquadri alle sezioni. Il disegno è in homeUi.js.

import * as userService from '../services/userService.js?v=32';
import * as nutriService from '../services/nutriService.js?v=32';
import * as gymService from '../services/gymService.js?v=32';
import * as pantryService from '../services/pantryService.js?v=32';
import { daComprare } from '../services/pantryLogic.js?v=32';
import * as homeUi from './homeUi.js?v=32';
import * as modal from '../components/modal.js?v=32';

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
            onPeso: () => this.showPeso(),
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

    // ─── PESO ───────────────────────────────────────────────────────────────────
    showPeso() {
        homeUi.renderPeso(this.container, this.dati.pesate, {
            onIndietro: () => this.render(),
            onSalva: async (kg) => {
                try {
                    // Il server tiene una pesata al giorno: salvare di nuovo aggiorna quella di oggi
                    await userService.addWeightLog(kg);
                    this.dati.pesate = await userService.getWeightLogs();
                } catch (e) {
                    await modal.showModal({ type: 'error', title: 'Non salvato', message: 'Controlla la connessione e riprova.' });
                }
                this.showPeso();
            }
        });
    }
}
