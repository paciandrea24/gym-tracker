// public/js/views/NutritionView.js

import * as nutriService from '../services/nutriService.js';
import * as userService from '../services/userService.js';
import * as scanner from '../components/scanner.js';
import * as modal from '../components/modal.js';
import * as ui from '../ui.js?v=20';
import { exportToCSV } from '../utils.js?v=20';
import * as pantryService from '../services/pantryService.js';

export class NutritionView {
    constructor(container) {
        this.container = container;
        this.currentTab = 'oggi';
        this.currentMealsData = [];
        this.currentFavorites = [];
        this.activeScannerTargetMealId = null;
        this.isRecording = false;
        this.currentRecognition = null;

        if (!window._nutriListenersAdded) {
            window.addEventListener('editIngredient', (e) => this.handleEditIngredient(e.detail));
            window.addEventListener('openFavSelector', (e) => this.handleOpenFavSelector(e.detail));
            window.addEventListener('exportNutritionCSV', () => this.handleExportCSV());
            window._nutriListenersAdded = true;
        }
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

            const favoritesPageBtn = document.getElementById('favorites-page-btn');
            if (favoritesPageBtn) favoritesPageBtn.addEventListener('click', () => this.showFavoritesPage());

            if (openAddMeal) this.handleManualMealClick();
        } catch (error) {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold text-red-500">Errore di connessione al database.</div>`;
        }
    }

    showFavoritesPage() {
        ui.renderFavoritesPage(this.container, this.currentFavorites, () => this.render(), (id) => this.handlePreviewFavorite(id));
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
                () => this.handleManualMealClick(mealId)
            );
        }
    }

    async handleRemoveIngredient(mealId, ingIdx) {
        const confirm = await modal.showModal({ type: 'confirm', title: 'Rimuovi', message: "Vuoi rimuovere questo alimento dal pasto?", confirmText: 'Sì', cancelText: 'No' });
        if (!confirm) return;

        const meal = this.currentMealsData.find(m => String(m._id) === String(mealId));
        if (!meal) return;

        const ingToRemove = meal.ingredienti[ingIdx];
        if (!ingToRemove) return;

        meal.calorie = Math.max(0, parseFloat((meal.calorie - ingToRemove.calorie).toFixed(1)));
        meal.proteine = Math.max(0, parseFloat((meal.proteine - ingToRemove.proteine).toFixed(1)));
        meal.carboidrati = Math.max(0, parseFloat((meal.carboidrati - ingToRemove.carboidrati).toFixed(1)));
        meal.grassi = Math.max(0, parseFloat((meal.grassi - ingToRemove.grassi).toFixed(1)));
        meal.ingredienti.splice(ingIdx, 1);
        meal.alimenti = meal.ingredienti.map(i => i.nome).join(', ') || "Pasto Vuoto";

        try {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Aggiornamento in corso...</div>`;
            const response = await nutriService.updateMeal(mealId, meal);
            const idx = this.currentMealsData.findIndex(m => String(m._id) === String(mealId));
            if (idx > -1) this.currentMealsData[idx] = response.meal;
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
            ingredienti: favMeal.ingredienti
        };

        try {
            await nutriService.saveMeal(newMealData);
            this.render();
            userService.triggerStreak();
        } catch (e) { await modal.showModal({ type: 'error', title: 'Errore', message: "Errore di connessione" }); }
    }

    handleManualMealClick(targetMealId = null) {
        if (typeof targetMealId !== 'string') targetMealId = null;

        ui.renderManualMealForm(this.container, async (mealData) => {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Salvataggio in corso...</div>`;

            mealData.ingredienti = [{
                nome: mealData.alimenti, calorie: mealData.calorie,
                proteine: mealData.proteine, carboidrati: mealData.carboidrati, grassi: mealData.grassi,
                grammi: mealData.grammi || 0  // <-- AGGIUNTO
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
                    const idx = this.currentMealsData.findIndex(m => String(m._id) === String(targetMealId));
                    if (idx > -1) this.currentMealsData[idx] = response.meal;
                    this.scalaDispensa(response.meal); // <-- AGGIUNTO
                    this.handleMealClick(targetMealId);
                } else {
                    const saved = await nutriService.saveMeal(mealData);
                    this.scalaDispensa(saved.meal); // <-- AGGIUNTO
                    this.render();
                    userService.triggerStreak();
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
            (errorMsg) => {
                alert(errorMsg);
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
            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            const data = await res.json();

            if (data.status === 1) {
                const p = data.product;
                const name = p.product_name || "Prodotto Sconosciuto";
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

                this.openPreFilledManualMeal(name, cal, pro, carbo, fat, this.activeScannerTargetMealId);
            } else {
                await modal.showModal({ type: 'error', title: 'Non Trovato', message: "Spiacente, prodotto non trovato nel database mondiale." });
                if (this.activeScannerTargetMealId) this.handleMealClick(this.activeScannerTargetMealId); else this.render();
            }
        } catch (e) {
            await modal.showModal({ type: 'error', title: 'Errore di Rete', message: "Errore di connessione a Open Food Facts." });
            if (this.activeScannerTargetMealId) this.handleMealClick(this.activeScannerTargetMealId); else this.render();
        }
    }

    openPreFilledManualMeal(name, cal, pro, carbo, fat, targetMealId = null) {
        this.handleManualMealClick(targetMealId);
        setTimeout(() => {
            const al = document.getElementById('m-alimenti');
            if (al) {
                al.value = name;
                document.getElementById('m-cal-100').value = cal;
                document.getElementById('m-pro-100').value = pro;
                document.getElementById('m-carbo-100').value = carbo;
                document.getElementById('m-fat-100').value = fat;
                document.getElementById('m-peso').focus();
            }
        }, 100);
    }

    async handleMicRecord(targetMealId = null) {
        const btnId = targetMealId ? 'add-voice-meal-btn' : 'mic-btn';
        const micBtn = document.getElementById(btnId);
        if (!micBtn) return;

        const originalBtnHtml = micBtn.innerHTML;

        if (this.isRecording && this.currentRecognition) {
            this.currentRecognition.stop();
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            await modal.showModal({ type: 'error', title: 'Non supportato', message: "Il riconoscimento vocale non è supportato in questo browser." });
            return;
        }

        this.currentRecognition = new SpeechRecognition();
        this.currentRecognition.lang = 'it-IT';
        this.currentRecognition.continuous = true;
        this.currentRecognition.interimResults = false;

        let finalTranscript = "";
        this.isRecording = true;

        micBtn.innerHTML = "⏹️ Ascoltando... Clicca per terminare";
        micBtn.classList.add("animate-pulse", "bg-red-600");

        this.currentRecognition.start();

        this.currentRecognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
            }
        };

        this.currentRecognition.onend = async () => {
            this.isRecording = false;

            if (!finalTranscript.trim()) {
                micBtn.innerHTML = originalBtnHtml;
                micBtn.classList.remove("animate-pulse", "bg-red-600", "bg-orange-500");
                return;
            }

            micBtn.innerHTML = "⏳ Analisi in corso...";
            micBtn.classList.remove("animate-pulse", "bg-red-600");
            micBtn.classList.add("bg-orange-500");

            try {
                const data = await nutriService.analyzeVoice(finalTranscript, targetMealId);
                if (data.success) {
                    if (targetMealId) {
                        const idx = this.currentMealsData.findIndex(m => String(m._id) === String(targetMealId));
                        if (idx > -1) this.currentMealsData[idx] = data.meal;
                        this.handleMealClick(targetMealId);
                    } else {
                        this.render();
                        userService.triggerStreak();
                    }
                    this.scalaDispensa(data.meal);
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                await modal.showModal({ type: 'error', title: 'Errore', message: error.message });
                micBtn.innerHTML = originalBtnHtml;
                micBtn.classList.remove("bg-orange-500");
            }
        };

        this.currentRecognition.onerror = (event) => {
            if (event.error !== 'aborted') alert("Errore microfono: " + event.error);
            this.isRecording = false;
            micBtn.innerHTML = originalBtnHtml;
            micBtn.classList.remove("animate-pulse", "bg-red-600", "bg-orange-500");
        };
    }

    async handleDeleteMeal(mealId) {
        const confirm = await modal.showModal({ type: 'confirm', title: 'Conferma Eliminazione', message: 'Vuoi eliminare questo pasto?', confirmText: 'Sì', cancelText: 'No' });
        if (!confirm) return;
        try {
            await nutriService.deleteMeal(mealId);
            this.render();
            userService.getStreak().then(stats => {
                const icon = document.getElementById('streak-icon');
                if (icon && !stats.activeToday) icon.classList.add('grayscale');
            });
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

        // NOVITÀ: Raccogliamo tutto ciò che hai mangiato oggi
        let giaMangiati = new Set();

        this.currentMealsData.forEach(meal => {
            if (new Date(meal.data).toDateString() === todayStr) {
                consumate.calorie += Number(meal.calorie) || 0;
                consumate.proteine += Number(meal.proteine) || 0;
                consumate.carbo += Number(meal.carboidrati) || 0;
                consumate.grassi += Number(meal.grassi) || 0;

                // Estrai gli alimenti per non farli riproporre all'AI
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
                // NOVITÀ: Passiamo l'array dei cibi già mangiati
                const data = await nutriService.recommendMeal(question, goals, consumate, giaMangiatiArray);
                if (data.success && data.recommendations) {
                    try {
                        localStorage.setItem('cachedAIRecommendations', JSON.stringify({
                            type: currentType, recommendations: data.recommendations, date: new Date().toDateString()
                        }));
                    } catch (e) { }
                    callbackResults(data.recommendations);
                } else {
                    await modal.showModal({ type: 'error', title: 'Errore', message: data.error || "Impossibile elaborare i consigli. Riprova." });
                    this.render();
                }
            } catch (error) {
                await modal.showModal({ type: 'error', title: 'Errore', message: "Errore di connessione al server." });
                this.render();
            }

        }, async (mealDataToSave) => {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Salvataggio pasto in corso...</div>`;
            try {
                await nutriService.saveMeal(mealDataToSave);
                localStorage.removeItem('cachedAIRecommendations');
                this.render();
                userService.triggerStreak();
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

        const modType = await modal.showModal({
            type: 'prompt', title: `Modifica: ${ing.nome}`,
            message: `Opzione 1: Inserisci un MOLTIPLICATORE per aggiornare tutto in proporzione (es. hai mangiato il doppio? Scrivi "2").\n\nOpzione 2: Scrivi "M" per inserire le calorie manualmente.`,
            inputValue: "1"
        });

        if (modType === null || modType === false) return;

        let newCal = ing.calorie; let newPro = ing.proteine; let newCar = ing.carboidrati; let newFat = ing.grassi;

        if (modType.toUpperCase() === 'M') {
            newCal = parseFloat(await modal.showModal({ type: 'prompt', title: 'Calorie', message: 'Nuove Calorie:', inputValue: ing.calorie })) || 0;
            newPro = parseFloat(await modal.showModal({ type: 'prompt', title: 'Proteine', message: 'Nuove Proteine (g):', inputValue: ing.proteine })) || 0;
            newCar = parseFloat(await modal.showModal({ type: 'prompt', title: 'Carboidrati', message: 'Nuovi Carboidrati (g):', inputValue: ing.carboidrati })) || 0;
            newFat = parseFloat(await modal.showModal({ type: 'prompt', title: 'Grassi', message: 'Nuovi Grassi (g):', inputValue: ing.grassi })) || 0;
        } else {
            const mult = parseFloat(modType);
            if (!isNaN(mult) && mult > 0) {
                newCal = parseFloat((ing.calorie * mult).toFixed(1));
                newPro = parseFloat((ing.proteine * mult).toFixed(1));
                newCar = parseFloat((ing.carboidrati * mult).toFixed(1));
                newFat = parseFloat((ing.grassi * mult).toFixed(1));
            } else {
                return modal.showModal({ type: 'error', title: 'Errore', message: "Valore non valido." });
            }
        }

        const diffCal = newCal - ing.calorie; const diffPro = newPro - ing.proteine; const diffCar = newCar - ing.carboidrati; const diffFat = newFat - ing.grassi;
        meal.calorie = Math.max(0, parseFloat((meal.calorie + diffCal).toFixed(1))); meal.proteine = Math.max(0, parseFloat((meal.proteine + diffPro).toFixed(1)));
        meal.carboidrati = Math.max(0, parseFloat((meal.carboidrati + diffCar).toFixed(1))); meal.grassi = Math.max(0, parseFloat((meal.grassi + diffFat).toFixed(1)));
        ing.calorie = newCal; ing.proteine = newPro; ing.carboidrati = newCar; ing.grassi = newFat;

        try {
            this.container.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Salvataggio modifiche...</div>`;
            const response = await nutriService.updateMeal(mealId, meal);
            const idx = this.currentMealsData.findIndex(m => String(m._id) === String(mealId));
            if (idx > -1) this.currentMealsData[idx] = response.meal;
            this.handleMealClick(mealId);
        } catch (e) {
            await modal.showModal({ type: 'error', title: 'Errore', message: "Errore di connessione" });
            this.handleMealClick(mealId);
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
                targetMeal.ingredienti.push(...favMeal.ingredienti);
            } else {
                targetMeal.ingredienti.push({
                    nome: favMeal.alimenti, calorie: favMeal.calorie,
                    proteine: favMeal.proteine, carboidrati: favMeal.carboidrati, grassi: favMeal.grassi
                });
            }

            try {
                const response = await nutriService.updateMeal(targetMealId, targetMeal);
                const idx = this.currentMealsData.findIndex(m => String(m._id) === String(targetMealId));
                if (idx > -1) this.currentMealsData[idx] = response.meal;
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

    async scalaDispensa(meal) {
        if (!meal) return;
        try {
            let ingredienti = [];
            if (meal.ingredienti && meal.ingredienti.length > 0) {
                ingredienti = meal.ingredienti.map(ing => {
                    // 1. Grammi espliciti salvati (manuale/scanner)
                    let grammi = ing.grammi || 0;

                    // 2. Estrai dal nome se l'AI ha scritto "Cracker (100g)"
                    if (!grammi) {
                        const match = ing.nome.match(/(\d+[\.,]?\d*)\s*g\b/i);
                        if (match) grammi = parseFloat(match[1].replace(',', '.'));
                    }

                    // 3. Fallback: non scalare (meglio 0 che un numero inventato)
                    return { nome: ing.nome, grammi: grammi || 0 };
                });
            } else {
                ingredienti = [{ nome: meal.alimenti, grammi: meal.grammi || 0 }];
            }

            ingredienti = ingredienti.filter(i => i.nome && i.grammi > 0);
            if (ingredienti.length === 0) return;

            const result = await pantryService.consumeFromPantry(
                ingredienti, meal._id, `${meal.pasto}: ${meal.alimenti}`
            );

            if (result.avvisi && result.avvisi.length > 0) {
                result.avvisi.forEach(av => this.showPantryToast(av));
            }
        } catch (e) {
            console.warn('Scalaggio dispensa fallito:', e);
        }
    }

    showPantryToast(avviso) {
        const toast = document.createElement('div');
        toast.className = "fixed top-4 left-1/2 -translate-x-1/2 z-[999999] bg-orange-500 text-white font-bold text-sm px-4 py-3 rounded-2xl shadow-xl max-w-xs text-center opacity-0 transition-all duration-300";

        if (avviso.esaurito) {
            toast.classList.replace('bg-orange-500', 'bg-red-500');
            toast.innerHTML = `🔴 "${avviso.nome}" è esaurito dalla dispensa!`;
        } else {
            toast.innerHTML = `⚠️ "${avviso.nome}" in esaurimento (${avviso.grammiRimasti}g rimasti)`;
        }

        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.remove('opacity-0'));
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}