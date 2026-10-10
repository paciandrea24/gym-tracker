// public/js/views/NutritionView.js

import * as nutriService from '../services/nutriService.js?v=30';
import * as scanner from '../components/scanner.js?v=30';
import * as modal from '../components/modal.js?v=30';
import * as voice from '../components/voice.js?v=30';
import * as ui from '../ui.js?v=30';
import { exportToCSV } from '../utils.js?v=30';
import * as pantryService from '../services/pantryService.js?v=30';
import * as pantrySync from '../services/pantrySync.js?v=30';
import { MealPrepView, openPortionSheet } from './MealPrepView.js?v=30';
import { renderChiusuraGiornata } from '../components/dayClosure.js?v=30';
import { apriFoglio } from '../components/sheet.js?v=30';
import { intero, macroTesto, chiaveGiorno } from '../components/format.js?v=30';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Ogni cambio di sezione crea una nuova NutritionView: gli eventi globali vanno sempre
// all'istanza corrente (prima restavano legati alla prima, con dati vecchi).
let vistaAttiva = null;

export class NutritionView {
    constructor(container) {
        this.container = container;
        this.currentTab = 'oggi';
        this.currentMealsData = [];
        this.currentFavorites = [];
        this.activeScannerTargetMealId = null;
        vistaAttiva = this;
    }

    async render(openAddMeal = false) {
        this.indietroPasto = null;
        this.container.innerHTML = `<div class="flex items-center justify-center min-h-screen"><p class="text-gray-500 font-bold animate-pulse">Caricamento dati dal server...</p></div>`;
        try {
            const [mealsData, favsData] = await Promise.all([
                this.currentTab === 'oggi' ? nutriService.getTodayMeals() : nutriService.getHistoryMeals(),
                nutriService.getFavorites()
            ]);

            this.currentMealsData = mealsData;
            this.currentFavorites = favsData;
            const goals = nutriService.getNutritionGoals();

            ui.renderNutritionDashboard(this.container, {
                mealsData: this.currentMealsData, goals, currentTab: this.currentTab,
                onTabSwitch: (tab) => { this.currentTab = tab; this.render(); },
                onMicClick: () => this.handleMicRecord(),
                onManualClick: () => this.handleManualMealClick(),
                onEditGoals: () => this.handleEditGoals(),
                onMealClick: (id) => this.handleMealClick(id),
                onScanClick: () => this.handleScanClick(),
                onCloseScanner: () => this.handleCloseScanner(),
                onAskAI: () => this.handleAskAI(),
                onDailyHistoryClick: (giorno) => this.handleDailyHistoryClick(giorno),
                onExportCSV: () => this.handleExportCSV()
            });

            document.getElementById('favorites-page-btn')?.addEventListener('click', () => this.showFavoritesPage());
            document.getElementById('prep-btn')?.addEventListener('click', () => this.showMealPrep());

            if (this.currentTab === 'oggi' && mealsData.length > 0) this.caricaChiusure(goals);
            if (openAddMeal) this.handleManualMealClick();
        } catch (error) {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold text-red-500">Errore di connessione al database.</div>`;
        }
    }

    // Card "Come chiudi di solito": arriva dopo la dashboard per non rallentarla
    async caricaChiusure(goals) {
        let suggerimenti = [];
        try {
            const r = await nutriService.getDaySuggestions(goals);
            if (r.success) suggerimenti = r.suggerimenti;
        } catch (e) { return; } // è un aiuto in più: se fallisce non si mostra
        const el = document.getElementById('chiusura-giornata');
        if (!el || vistaAttiva !== this || this.currentTab !== 'oggi') return;

        const consumate = { calorie: 0, proteine: 0, carbo: 0, grassi: 0 };
        for (const m of this.currentMealsData) {
            consumate.calorie += Number(m.calorie) || 0;
            consumate.proteine += Number(m.proteine) || 0;
            consumate.carbo += Number(m.carboidrati) || 0;
            consumate.grassi += Number(m.grassi) || 0;
        }
        renderChiusuraGiornata(el, suggerimenti, { consumate, goals, onAggiungi: (pasti) => this.handleAggiungiChiusura(pasti) });
    }

    // Registra oggi i pasti scelti da un giorno simile, nell'ordine in cui erano stati mangiati
    async handleAggiungiChiusura(pasti) {
        this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Aggiunta pasti...</div>`;
        const salvati = [];
        try {
            for (const p of pasti) {
                const saved = await nutriService.saveMeal({
                    pasto: p.pasto, alimenti: p.alimenti,
                    calorie: p.calorie, proteine: p.proteine, carboidrati: p.carboidrati, grassi: p.grassi,
                    ingredienti: JSON.parse(JSON.stringify(p.ingredienti || []))
                });
                if (!saved.success) throw new Error(saved.error);
                salvati.push(saved.meal);
            }
        } catch (e) {
            await modal.showModal({ type: 'error', title: 'Errore', message: salvati.length ? `Registrati ${salvati.length} su ${pasti.length}: errore di connessione.` : "Errore di connessione" });
        }
        await this.render();
        // Uno alla volta: la dispensa può chiedere quale prodotto scalare
        for (const meal of salvati) await pantrySync.scalaDispensa(meal);
    }

    showFavoritesPage() {
        ui.renderFavoritesPage(this.container, this.currentFavorites, () => this.render(), (id) => this.handlePreviewFavorite(id));
    }

    showMealPrep() {
        new MealPrepView(this.container, () => this.render()).renderList();
    }

    // giorno: 'YYYY-MM-DD'. Dai pasti di un giorno passato si apre il dettaglio e poi si torna qui
    handleDailyHistoryClick(giorno) {
        ui.renderDailyNutritionStats(this.container, {
            giorno,
            meals: this.currentMealsData.filter(m => chiaveGiorno(m.data) === giorno),
            goals: nutriService.getNutritionGoals(),
            onBack: () => this.render(),
            onMealClick: (id) => this.handleMealClick(id, () => this.handleDailyHistoryClick(giorno))
        });
    }

    handlePreviewFavorite(favId) {
        const favMeal = this.currentFavorites.find(m => String(m._id) === String(favId));
        if (!favMeal) return;

        ui.renderFavoritePreviewModal(
            favMeal,
            () => this.handleAddFavorite(favId),
            async () => {
                try {
                    await nutriService.removeFavorite(favId);
                    for (let m of this.currentMealsData) {
                        if (m.alimenti.toLowerCase() === favMeal.alimenti.toLowerCase() && m.isFavorite) {
                            m.isFavorite = false;
                            await nutriService.updateMeal(m._id, m);
                        }
                    }
                    this.render();
                } catch (e) { await modal.showModal({ type: 'error', title: 'Errore', message: "Errore di connessione." }); }
            }
        );
    }

    // indietro: dove torna la freccia (es. il giorno dello storico); resta valido mentre si modifica il pasto
    handleMealClick(mealId, indietro) {
        if (indietro) this.indietroPasto = indietro;
        const meal = this.currentMealsData.find(m => String(m._id) === String(mealId));
        if (meal) {
            ui.renderMealDetails(this.container, meal, {
                onBack: () => (this.indietroPasto || (() => this.render()))(),
                onToggleFavorite: (id, status) => this.handleToggleFavorite(id, status),
                onAddVoice: () => this.handleMicRecord(mealId),
                onAddScan: () => this.handleScanClick(mealId),
                onCloseScanner: () => this.handleCloseScanner(),
                onAddManual: () => this.handleManualMealClick(mealId),
                onAddPrep: () => this.handleAddPrepPortion(mealId),
                onAddFavorite: () => this.handleOpenFavSelector(mealId),
                onIngredientClick: (idx) => this.apriIngrediente(mealId, idx),
                onDeleteMeal: () => this.handleDeleteMeal(mealId)
            });
        }
    }

    handleAddPrepPortion(mealId) {
        openPortionSheet({
            mealId,
            onDone: (meal) => {
                this.sostituisciPasto(meal);
                this.handleMealClick(mealId);
            }
        });
    }

    sostituisciPasto(meal) {
        const idx = this.currentMealsData.findIndex(m => String(m._id) === String(meal._id));
        if (idx > -1) this.currentMealsData[idx] = meal;
    }

    async handleRemoveIngredient(mealId, ingIdx) {
        const confirm = await modal.showModal({ type: 'confirm', title: 'Togli', message: "Togliere questo alimento dal pasto?", confirmText: 'Togli', cancelText: 'Annulla' });
        if (!confirm) return;

        const meal = this.currentMealsData.find(m => String(m._id) === String(mealId));
        if (!meal) return;

        const ingToRemove = meal.ingredienti[ingIdx];
        if (!ingToRemove) return;

        // --- RIPRISTINO DISPENSA (le porzioni di meal prep vengono ignorate) ---
        await pantrySync.ripristinaDispensa(meal, [ingToRemove], "Ingrediente rimosso");

        meal.calorie = Math.max(0, parseFloat((meal.calorie - ingToRemove.calorie).toFixed(1)));
        meal.proteine = Math.max(0, parseFloat((meal.proteine - ingToRemove.proteine).toFixed(1)));
        meal.carboidrati = Math.max(0, parseFloat((meal.carboidrati - ingToRemove.carboidrati).toFixed(1)));
        meal.grassi = Math.max(0, parseFloat((meal.grassi - ingToRemove.grassi).toFixed(1)));
        meal.ingredienti.splice(ingIdx, 1);
        meal.alimenti = meal.ingredienti.map(i => i.nome).join(', ') || "Pasto Vuoto";

        try {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Aggiornamento in corso...</div>`;
            const response = await nutriService.updateMeal(mealId, meal);
            this.sostituisciPasto(response.meal);
            this.handleMealClick(mealId);
        } catch (e) {
            await modal.showModal({ type: 'error', title: 'Errore', message: "Errore di connessione" });
            this.handleMealClick(mealId);
        }
    }

    async handleToggleFavorite(mealId, newStatus) {
        const meal = this.currentMealsData.find(m => String(m._id) === String(mealId));
        if (!meal) return;

        try {
            if (newStatus) {
                const exists = this.currentFavorites.some(f => f.alimenti.toLowerCase() === meal.alimenti.toLowerCase());
                if (!exists) {
                    const clone = { ...meal };
                    delete clone._id;
                    const res = await nutriService.addFavorite(clone);
                    if (res.favorite) this.currentFavorites.push(res.favorite);
                }
                await modal.showModal({ type: 'success', title: 'Fatto', message: "Aggiunto ai preferiti!" });
            } else {
                const favToDelete = this.currentFavorites.find(f => f.alimenti.toLowerCase() === meal.alimenti.toLowerCase());
                if (favToDelete) {
                    await nutriService.removeFavorite(favToDelete._id);
                    this.currentFavorites = this.currentFavorites.filter(f => f._id !== favToDelete._id);
                }
            }

            meal.isFavorite = newStatus;
            await nutriService.updateMeal(mealId, meal);
            this.handleMealClick(mealId);
        } catch (e) { await modal.showModal({ type: 'error', title: 'Errore', message: "Errore salvataggio preferito." }); }
    }

    async handleAddFavorite(favId) {
        const favMeal = this.currentFavorites.find(m => String(m._id) === String(favId));
        if (!favMeal) return;

        this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Aggiunta pasto rapido...</div>`;

        const newMealData = {
            pasto: favMeal.pasto, alimenti: favMeal.alimenti, calorie: favMeal.calorie,
            proteine: favMeal.proteine, carboidrati: favMeal.carboidrati, grassi: favMeal.grassi,
            // DEEP COPY: Crea una copia indipendente degli ingredienti
            ingredienti: JSON.parse(JSON.stringify(favMeal.ingredienti))
        };

        try {
            const saved = await nutriService.saveMeal(newMealData);
            this.render();
            pantrySync.scalaDispensa(saved.meal);
        } catch (e) { await modal.showModal({ type: 'error', title: 'Errore', message: "Errore di connessione" }); }
    }

    handleManualMealClick(targetMealId = null) {
        if (typeof targetMealId !== 'string') targetMealId = null;

        ui.renderManualMealForm(this.container, async (mealData) => {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Salvataggio in corso...</div>`;

            mealData.ingredienti = [{
                nome: mealData.alimenti, calorie: mealData.calorie,
                proteine: mealData.proteine, carboidrati: mealData.carboidrati, grassi: mealData.grassi,
                grammi: mealData.grammi || 0
            }];

            try {
                if (targetMealId) {
                    const existingMeal = this.currentMealsData.find(m => String(m._id) === String(targetMealId));
                    if (!existingMeal) return;

                    const updatedMeal = { ...existingMeal };
                    updatedMeal.calorie = parseFloat((updatedMeal.calorie + mealData.calorie).toFixed(1));
                    updatedMeal.proteine = parseFloat((updatedMeal.proteine + mealData.proteine).toFixed(1));
                    updatedMeal.carboidrati = parseFloat((updatedMeal.carboidrati + mealData.carboidrati).toFixed(1));
                    updatedMeal.grassi = parseFloat((updatedMeal.grassi + mealData.grassi).toFixed(1));
                    updatedMeal.alimenti += ", " + mealData.alimenti;
                    updatedMeal.ingredienti.push(mealData.ingredienti[0]);

                    const response = await nutriService.updateMeal(targetMealId, updatedMeal);
                    this.sostituisciPasto(response.meal);

                    // FIX DOPPIO SCALO: Passiamo alla dispensa SOLO l'ingrediente appena aggiunto
                    pantrySync.scalaDispensa({ ...response.meal, ingredienti: [mealData.ingredienti[0]] });

                    this.handleMealClick(targetMealId);
                } else {
                    const saved = await nutriService.saveMeal(mealData);
                    pantrySync.scalaDispensa(saved.meal);
                    this.render();
                }
            } catch (e) {
                await modal.showModal({ type: 'error', title: 'Errore', message: "Errore di connessione" });
                if (targetMealId) this.handleMealClick(targetMealId); else this.render();
            }
        }, () => {
            if (targetMealId) this.handleMealClick(targetMealId); else this.render();
        });

        if (targetMealId) {
            const existingMeal = this.currentMealsData.find(m => String(m._id) === String(targetMealId));
            if (existingMeal) {
                // Si aggiunge a un pasto esistente: il tipo di pasto è già deciso
                const mPastoInput = document.getElementById('m-pasto');
                if (mPastoInput) {
                    mPastoInput.value = existingMeal.pasto;
                    document.getElementById('m-pasto-box')?.classList.add('hidden');
                }
            }
        }
    }

    handleScanClick(targetMealId = null) {
        this.activeScannerTargetMealId = typeof targetMealId === 'string' ? targetMealId : null;
        document.getElementById('action-buttons')?.classList.add('hidden');
        document.getElementById('scanner-container').classList.remove('hidden');

        scanner.startScanner(
            'reader-video',
            (barcode) => {
                this.handleCloseScanner();
                this.fetchProductFromBarcode(barcode);
            },
            async (errorMsg) => {
                await modal.showModal({ type: 'error', title: 'Scanner', message: errorMsg });
                this.handleCloseScanner();
            }
        );
    }

    handleCloseScanner() {
        scanner.stopScanner();
        const container = document.getElementById('scanner-container');
        const actionBtns = document.getElementById('action-buttons');
        if (container) container.classList.add('hidden');
        if (actionBtns) actionBtns.classList.remove('hidden');
    }

    async fetchProductFromBarcode(barcode) {
        this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse text-blue-600">Codice rilevato! Ricerca nel database...</div>`;
        try {
            const prodotto = await pantryService.cercaProdottoOFF(barcode);
            if (prodotto) {
                this.openPreFilledManualMeal(prodotto, this.activeScannerTargetMealId);
            } else {
                await modal.showModal({ type: 'error', title: 'Non Trovato', message: `Spiacente, il codice ${barcode} non è nel database mondiale.` });
                if (this.activeScannerTargetMealId) this.handleMealClick(this.activeScannerTargetMealId); else this.render();
            }
        } catch (e) {
            await modal.showModal({ type: 'error', title: 'Errore di Rete', message: "Errore di connessione a Open Food Facts." });
            if (this.activeScannerTargetMealId) this.handleMealClick(this.activeScannerTargetMealId); else this.render();
        }
    }

    openPreFilledManualMeal(prodotto, targetMealId = null) {
        this.handleManualMealClick(targetMealId);
        ui.riempiFormPasto(prodotto);
    }

    handleMicRecord(targetMealId = null) {
        const micBtn = document.getElementById(targetMealId ? 'add-voice-meal-btn' : 'mic-btn');
        if (!micBtn) return;

        voice.toggleVoice(micBtn, async (testo) => {
            const data = await nutriService.analyzeVoice(testo, targetMealId);
            if (!data.success) throw new Error(data.error || "Analisi non riuscita.");

            if (targetMealId) {
                // FIX DOPPIO SCALO: scaliamo solo gli ingredienti nuovi trovati dalla voce
                const oldMeal = this.currentMealsData.find(m => String(m._id) === String(targetMealId));
                const oldIngCount = oldMeal && oldMeal.ingredienti ? oldMeal.ingredienti.length : 0;

                this.sostituisciPasto(data.meal);
                this.handleMealClick(targetMealId);
                pantrySync.scalaDispensa({ ...data.meal, ingredienti: data.meal.ingredienti.slice(oldIngCount) });
            } else {
                this.render();
                pantrySync.scalaDispensa(data.meal);
            }
        });
    }

    async handleDeleteMeal(mealId) {
        const confirm = await modal.showModal({ type: 'confirm', title: 'Conferma Eliminazione', message: 'Vuoi eliminare questo pasto?', confirmText: 'Sì', cancelText: 'No' });
        if (!confirm) return;
        try {
            // --- RIPRISTINO DISPENSA PASTO INTERO (le porzioni di meal prep vengono ignorate) ---
            const meal = this.currentMealsData.find(m => String(m._id) === String(mealId));
            if (meal) {
                const ingredientiDaRipristinare = meal.ingredienti && meal.ingredienti.length > 0
                    ? meal.ingredienti
                    : [{ nome: meal.alimenti, grammi: meal.grammi || 0 }];
                await pantrySync.ripristinaDispensa(meal, ingredientiDaRipristinare, "Pasto eliminato");
            }

            await nutriService.deleteMeal(mealId);
            this.render();
        } catch (error) {
            await modal.showModal({ type: 'error', title: 'Errore', message: "Impossibile connettersi al server" });
        }
    }

    handleEditGoals() {
        const currentGoals = nutriService.getNutritionGoals();
        ui.renderEditGoalsForm(
            this.container, currentGoals,
            (newGoals) => {
                nutriService.saveNutritionGoals(newGoals);
                this.render();
            },
            () => this.render()
        );
    }

    handleAskAI() {
        let cached = null;
        try {
            const rawCache = localStorage.getItem('cachedAIRecommendations');
            if (rawCache) {
                const parsed = JSON.parse(rawCache);
                if (parsed.date === new Date().toDateString()) cached = parsed;
                else localStorage.removeItem('cachedAIRecommendations');
            }
        } catch (e) { }

        const goals = nutriService.getNutritionGoals();
        let consumate = { calorie: 0, proteine: 0, carbo: 0, grassi: 0 };
        const todayStr = new Date().toDateString();

        // Cosa hai già mangiato oggi: l'AI lo usa per variare, non come divieto assoluto
        let giaMangiati = new Set();

        this.currentMealsData.forEach(meal => {
            if (new Date(meal.data).toDateString() === todayStr) {
                consumate.calorie += Number(meal.calorie) || 0;
                consumate.proteine += Number(meal.proteine) || 0;
                consumate.carbo += Number(meal.carboidrati) || 0;
                consumate.grassi += Number(meal.grassi) || 0;

                if (meal.ingredienti && meal.ingredienti.length > 0) {
                    meal.ingredienti.forEach(ing => {
                        // Pulisce il nome (es: "Pollo (150g)" diventa "pollo")
                        const cleanName = ing.nome.replace(/\(.*?\)/g, '').trim().toLowerCase();
                        giaMangiati.add(cleanName);
                    });
                } else {
                    giaMangiati.add(meal.alimenti.toLowerCase());
                }
            }
        });

        const giaMangiatiArray = Array.from(giaMangiati);

        ui.renderAIModal(async (question, callbackResults) => {
            const match = question.match(/Pasto:\s*(\w+)/);
            const currentType = match ? match[1] : 'Pasto';

            try {
                const data = await nutriService.recommendMeal(question, goals, consumate, giaMangiatiArray);
                if (data.success && data.recommendations) {
                    try {
                        localStorage.setItem('cachedAIRecommendations', JSON.stringify({
                            type: currentType, recommendations: data.recommendations, date: new Date().toDateString()
                        }));
                    } catch (e) { }
                    callbackResults(data.recommendations);
                } else {
                    document.getElementById('ai-modal')?.remove();
                    document.documentElement.style.overflow = '';
                    document.body.style.overflow = '';
                    await modal.showModal({ type: 'error', title: 'Nutrizionista AI', message: data.error || "Impossibile elaborare i consigli. Riprova." });
                    this.render();
                }
            } catch (error) {
                document.getElementById('ai-modal')?.remove();
                document.documentElement.style.overflow = '';
                document.body.style.overflow = '';
                await modal.showModal({ type: 'error', title: 'Errore', message: error.message || "Errore di connessione al server." });
                this.render();
            }

        }, async (mealDataToSave) => {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Salvataggio pasto in corso...</div>`;
            try {
                const saved = await nutriService.saveMeal(mealDataToSave);
                if (!saved.success) throw new Error(saved.error);
                localStorage.removeItem('cachedAIRecommendations');
                this.render();
                pantrySync.scalaDispensa(saved.meal);
            } catch (e) {
                await modal.showModal({ type: 'error', title: 'Errore', message: "Errore di connessione" });
                this.render();
            }
        }, cached, goals, consumate);
    }

    // Tocco su un ingrediente del pasto: foglio per cambiare i grammi o toglierlo
    apriIngrediente(mealId, ingIdx) {
        const meal = this.currentMealsData.find(m => String(m._id) === String(mealId));
        const ing = meal?.ingredienti?.[ingIdx];
        if (!ing) return;

        const grammi = ing.prepId ? (ing.prepGrammi > 0 ? ing.prepGrammi : ing.grammi) : ing.grammi;
        const sottotitolo = ing.prepId && ing.prepDaCompletare
            ? 'Meal prep: scrivi i grammi per calcolare i valori'
            : `${ing.prepId ? 'Meal prep · ' : ''}${intero(ing.calorie)} kcal · ${macroTesto(ing, { breve: true })}`;
        const { box, chiudi, intestazione, collegaChiudi } = apriFoglio({ id: 'pasto-ing-sheet' });
        box.innerHTML = `
            ${intestazione(esc(ing.nome), sottotitolo)}
            <label for="ing-pasto-grammi" class="block text-xs font-semibold text-gray-400 uppercase mb-2">Grammi</label>
            <input id="ing-pasto-grammi" type="number" inputmode="decimal" step="any" value="${grammi > 0 ? Math.round(grammi) : ''}" placeholder="es. 150"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-2xl font-black text-center outline-none focus:ring-2 focus:ring-gray-900 mb-4">
            <button id="ing-pasto-salva" class="w-full bg-gray-900 text-white font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform">Salva</button>
            <button id="ing-pasto-togli" class="w-full text-red-600 font-bold text-sm py-3 mt-2">Togli dal pasto</button>`;
        collegaChiudi();

        box.querySelector('#ing-pasto-salva').addEventListener('click', () => {
            const nuovi = parseFloat(String(box.querySelector('#ing-pasto-grammi').value).replace(',', '.'));
            if (!(nuovi > 0)) return modal.showModal({ type: 'error', title: 'Grammi', message: 'Scrivi quanti grammi hai mangiato.' });
            chiudi();
            if (ing.prepId) this.handleEditPrepPortion(meal, ing, nuovi);
            else if (nuovi !== Number(ing.grammi)) this.cambiaGrammiIngrediente(mealId, ingIdx, nuovi);
        });
        box.querySelector('#ing-pasto-togli').addEventListener('click', () => {
            chiudi();
            this.handleRemoveIngredient(mealId, ingIdx);
        });
    }

    async cambiaGrammiIngrediente(mealId, ingIdx, nuoviGrammi) {
        const meal = this.currentMealsData.find(m => String(m._id) === String(mealId));
        const ing = meal?.ingredienti?.[ingIdx];
        if (!ing) return;
        const vecchiGrammi = ing.grammi || 100; // Valore base di sicurezza

        // Calcoliamo la proporzione e aggiorniamo tutti i macros
        const mult = nuoviGrammi / vecchiGrammi;

        const newCal = parseFloat((ing.calorie * mult).toFixed(1));
        const newPro = parseFloat((ing.proteine * mult).toFixed(1));
        const newCar = parseFloat((ing.carboidrati * mult).toFixed(1));
        const newFat = parseFloat((ing.grassi * mult).toFixed(1));

        const diffCal = newCal - ing.calorie;
        const diffPro = newPro - ing.proteine;
        const diffCar = newCar - ing.carboidrati;
        const diffFat = newFat - ing.grassi;

        // --- AGGIUSTAMENTO DISPENSA ---
        // (prima l'aumento passava dal server senza pantryItemId e veniva scartato in silenzio)
        const diffGrammi = nuoviGrammi - vecchiGrammi;
        if (diffGrammi > 0) {
            await pantrySync.scalaDispensa({ ...meal, ingredienti: [{ nome: ing.nome, grammi: diffGrammi }] });
        } else if (diffGrammi < 0) {
            await pantrySync.ripristinaDispensa(meal, [{ nome: ing.nome, grammi: Math.abs(diffGrammi) }], "Riduzione grammi");
        }

        meal.calorie = Math.max(0, parseFloat((meal.calorie + diffCal).toFixed(1)));
        meal.proteine = Math.max(0, parseFloat((meal.proteine + diffPro).toFixed(1)));
        meal.carboidrati = Math.max(0, parseFloat((meal.carboidrati + diffCar).toFixed(1)));
        meal.grassi = Math.max(0, parseFloat((meal.grassi + diffFat).toFixed(1)));

        ing.grammi = nuoviGrammi;
        ing.calorie = newCal;
        ing.proteine = newPro;
        ing.carboidrati = newCar;
        ing.grassi = newFat;

        try {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Ricalcolo valori...</div>`;
            const response = await nutriService.updateMeal(mealId, meal);
            this.sostituisciPasto(response.meal);
            this.handleMealClick(mealId);
        } catch (e) {
            await modal.showModal({ type: 'error', title: 'Errore', message: "Errore di connessione" });
            this.handleMealClick(mealId);
        }
    }

    // Porzione di meal prep: si cambiano i grammi, i valori li ricalcola il server dalla preparazione.
    // Una porzione vecchia registrata "a porzioni" diventa in grammi.
    async handleEditPrepPortion(meal, ing, grammi) {
        ing.prepGrammi = grammi;
        ing.prepPorzioni = 0;

        try {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Ricalcolo valori...</div>`;
            const response = await nutriService.updateMeal(meal._id, meal);
            this.sostituisciPasto(response.meal);
            this.handleMealClick(meal._id);
        } catch (e) {
            await modal.showModal({ type: 'error', title: 'Errore', message: "Errore di connessione" });
            this.handleMealClick(meal._id);
        }
    }

    handleOpenFavSelector(targetMealId) {
        ui.renderFavoritesPage(this.container, this.currentFavorites, () => {
            this.handleMealClick(targetMealId);
        }, async (favId) => {
            const favMeal = this.currentFavorites.find(m => String(m._id) === String(favId));
            const targetMeal = this.currentMealsData.find(m => String(m._id) === String(targetMealId));
            if (!favMeal || !targetMeal) return;

            const confirm = await modal.showModal({ type: 'confirm', title: 'Aggiungi Preferito', message: `Vuoi aggiungere "${favMeal.alimenti}" a questo pasto?`, confirmText: 'Sì', cancelText: 'No' });
            if (!confirm) return;

            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Aggiunta in corso...</div>`;

            targetMeal.calorie = parseFloat((targetMeal.calorie + favMeal.calorie).toFixed(1));
            targetMeal.proteine = parseFloat((targetMeal.proteine + favMeal.proteine).toFixed(1));
            targetMeal.carboidrati = parseFloat((targetMeal.carboidrati + favMeal.carboidrati).toFixed(1));
            targetMeal.grassi = parseFloat((targetMeal.grassi + favMeal.grassi).toFixed(1));
            targetMeal.alimenti += ", " + favMeal.alimenti;

            if (favMeal.ingredienti && favMeal.ingredienti.length > 0) {
                // DEEP COPY: Inserisce cloni indipendenti degli ingredienti
                targetMeal.ingredienti.push(...JSON.parse(JSON.stringify(favMeal.ingredienti)));
            } else {
                targetMeal.ingredienti.push({
                    nome: favMeal.alimenti, calorie: favMeal.calorie,
                    proteine: favMeal.proteine, carboidrati: favMeal.carboidrati, grassi: favMeal.grassi
                });
            }

            try {
                const response = await nutriService.updateMeal(targetMealId, targetMeal);
                this.sostituisciPasto(response.meal);

                // FIX MANCATO SCALO: Scaliamo i nuovi ingredienti estratti dal preferito
                const addedIngredients = favMeal.ingredienti && favMeal.ingredienti.length > 0
                    ? favMeal.ingredienti
                    : [{ nome: favMeal.alimenti, calorie: favMeal.calorie, proteine: favMeal.proteine, carboidrati: favMeal.carboidrati, grassi: favMeal.grassi }];

                pantrySync.scalaDispensa({ ...response.meal, ingredienti: addedIngredients });

                this.handleMealClick(targetMealId);
            } catch (err) {
                await modal.showModal({ type: 'error', title: 'Errore', message: "Errore di connessione" });
                this.handleMealClick(targetMealId);
            }
        });
    }

    handleExportCSV() {
        const rows = this.currentMealsData.map(m => ({
            Data: new Date(m.data).toLocaleDateString('it-IT'),
            Ora: new Date(m.data).toLocaleTimeString('it-IT'),
            Pasto: m.pasto, Alimento: m.alimenti, Kcal: m.calorie,
            Proteine: m.proteine, Carboidrati: m.carboidrati, Grassi: m.grassi
        }));
        exportToCSV('storico_nutrizione.csv', rows);
    }
}
