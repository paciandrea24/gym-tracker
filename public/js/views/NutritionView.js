// public/js/views/NutritionView.js

import * as nutriService from '../services/nutriService.js?v=22';
import * as scanner from '../components/scanner.js?v=22';
import * as modal from '../components/modal.js?v=22';
import * as voice from '../components/voice.js?v=22';
import * as ui from '../ui.js?v=22';
import { exportToCSV } from '../utils.js?v=22';
import * as pantryService from '../services/pantryService.js?v=22';
import * as pantrySync from '../services/pantrySync.js?v=22';
import { MealPrepView, openPortionSheet } from './MealPrepView.js?v=22';

// Ogni cambio di sezione crea una nuova NutritionView: gli eventi globali vanno sempre
// all'istanza corrente (prima restavano legati alla prima, con dati vecchi).
let vistaAttiva = null;
window.addEventListener('editIngredient', (e) => vistaAttiva?.handleEditIngredient(e.detail));
window.addEventListener('openFavSelector', (e) => vistaAttiva?.handleOpenFavSelector(e.detail));
window.addEventListener('exportNutritionCSV', () => vistaAttiva?.handleExportCSV());

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
        this.container.innerHTML = `<div class="flex items-center justify-center min-h-screen"><p class="text-gray-500 font-bold animate-pulse">Caricamento dati dal server...</p></div>`;
        try {
            const [mealsData, favsData] = await Promise.all([
                this.currentTab === 'oggi' ? nutriService.getTodayMeals() : nutriService.getHistoryMeals(),
                nutriService.getFavorites()
            ]);

            this.currentMealsData = mealsData;
            this.currentFavorites = favsData;
            const goals = nutriService.getNutritionGoals();

            ui.renderNutritionDashboard(
                this.container, this.currentMealsData, goals, this.currentTab, this.currentFavorites,
                (tab) => { this.currentTab = tab; this.render(); },
                () => this.handleMicRecord(),
                () => this.handleManualMealClick(),
                (id) => this.handleDeleteMeal(id),
                () => this.handleEditGoals(),
                (id) => this.handleMealClick(id),
                (id) => this.handleScanClick(id),
                () => this.handleCloseScanner(),
                (id) => this.handlePreviewFavorite(id),
                () => this.handleAskAI(),
                (dateStr) => this.handleDailyHistoryClick(dateStr)
            );

            document.getElementById('favorites-page-btn')?.addEventListener('click', () => this.showFavoritesPage());
            document.getElementById('prep-btn')?.addEventListener('click', () => this.showMealPrep());

            if (openAddMeal) this.handleManualMealClick();
        } catch (error) {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold text-red-500">Errore di connessione al database.</div>`;
        }
    }

    showFavoritesPage() {
        ui.renderFavoritesPage(this.container, this.currentFavorites, () => this.render(), (id) => this.handlePreviewFavorite(id));
    }

    showMealPrep() {
        new MealPrepView(this.container, () => this.render()).renderList();
    }

    handleDailyHistoryClick(dateStr) {
        const goals = nutriService.getNutritionGoals();
        const dayMeals = this.currentMealsData.filter(m => {
            const mealDateStr = new Date(m.data).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
            return mealDateStr === dateStr;
        });

        const totals = { cal: 0, pro: 0, carbo: 0, grassi: 0 };
        dayMeals.forEach(m => {
            totals.cal += Number(m.calorie) || 0;
            totals.pro += Number(m.proteine) || 0;
            totals.carbo += Number(m.carboidrati) || 0;
            totals.grassi += Number(m.grassi) || 0;
        });

        ui.renderDailyNutritionStats(this.container, dateStr, dayMeals, totals, goals, () => this.render());
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

    handleMealClick(mealId) {
        const meal = this.currentMealsData.find(m => String(m._id) === String(mealId));
        if (meal) {
            ui.renderMealDetails(
                this.container, meal,
                () => this.render(),
                (id, status) => this.handleToggleFavorite(id, status),
                () => this.handleMicRecord(mealId),
                () => this.handleScanClick(mealId),
                () => this.handleCloseScanner(),
                (ingIdx) => this.handleRemoveIngredient(mealId, ingIdx),
                () => this.handleManualMealClick(mealId),
                () => this.handleAddPrepPortion(mealId)
            );
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
        const confirm = await modal.showModal({ type: 'confirm', title: 'Rimuovi', message: "Vuoi rimuovere questo alimento dal pasto?", confirmText: 'Sì', cancelText: 'No' });
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
                const mPastoInput = document.getElementById('m-pasto');
                if (mPastoInput) {
                    mPastoInput.value = existingMeal.pasto;
                    mPastoInput.disabled = true;
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
        const al = document.getElementById('m-alimenti');
        if (al) {
            al.value = prodotto.nome;
            document.getElementById('m-cal-100').value = prodotto.calorie100;
            document.getElementById('m-pro-100').value = prodotto.proteine100;
            document.getElementById('m-carbo-100').value = prodotto.carbo100;
            document.getElementById('m-fat-100').value = prodotto.grassi100;
            document.getElementById('m-peso').focus();
        }
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

    async handleEditIngredient({ mealId, ingIdx }) {
        const meal = this.currentMealsData.find(m => String(m._id) === String(mealId));
        if (!meal) return;
        const ing = meal.ingredienti[ingIdx];
        if (!ing) return;

        if (ing.prepId) return this.handleEditPrepPortion(meal, ing);

        const vecchiGrammi = ing.grammi || 100; // Valore base di sicurezza

        const res = await modal.showModal({
            type: 'prompt',
            title: `Modifica: ${ing.nome}`,
            message: `Quanti grammi hai consumato?`,
            inputValue: String(vecchiGrammi)
        });

        if (res === null || res === false) return;

        const nuoviGrammi = parseFloat(String(res).replace(',', '.'));
        if (isNaN(nuoviGrammi) || nuoviGrammi <= 0) {
            return modal.showModal({ type: 'error', title: 'Errore', message: "Valore non valido." });
        }

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

    // Porzione di meal prep: si cambia la quantità, i valori li ricalcola il server dalla preparazione
    async handleEditPrepPortion(meal, ing) {
        const inGrammi = ing.prepGrammi > 0;
        const res = await modal.showModal({
            type: 'prompt',
            title: `Modifica: ${ing.nome}`,
            message: inGrammi ? 'Quanti grammi hai preso?' : 'Quante porzioni? (es. 1 o 0,5)',
            inputValue: String(inGrammi ? ing.prepGrammi : ing.prepPorzioni).replace('.', ',')
        });
        if (res === null || res === false) return;

        const valore = parseFloat(String(res).replace(',', '.'));
        if (isNaN(valore) || valore <= 0) {
            return modal.showModal({ type: 'error', title: 'Errore', message: "Valore non valido." });
        }
        if (inGrammi) ing.prepGrammi = valore; else ing.prepPorzioni = valore;

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
