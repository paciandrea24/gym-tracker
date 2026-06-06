import * as storage from './storage.js?v=20';
import * as ui from './ui.js?v=20';
import { debounce } from './utils.js?v=20';

const appContainer = document.getElementById('app');

// ==========================================
// STATO APPLICATIVO GLOBALE
// ==========================================
let currentAppModule = 'home';
let currentRoutineId = null;
let currentTab = 'scheda';
let currentExercise = null;
let currentSessionData = [];
let isRecording = false;
let currentRecognition = null;
let finalTranscript = "";
let currentNutriTab = 'oggi';
let currentMealsData = [];
let currentFavorites = [];
let codeReader = null;
let activeScannerTargetMealId = null;
let currentLastSession = null;

// ==========================================
// INIZIALIZZAZIONE E NAVIGAZIONE
// ==========================================
function init() {
    setupNavigation();
    loadCurrentModule();
    fetchStreak();

    // Aggiungiamo il click listener al container della fiamma
    const streakContainer = document.getElementById('streak-container');
    if (streakContainer) {
        streakContainer.addEventListener('click', showStreakModal);
    }
}

function setupNavigation() {
    const navHome = document.getElementById('nav-home');
    const navGym = document.getElementById('nav-gym');
    const navNutri = document.getElementById('nav-nutri');

    if (navHome) navHome.addEventListener('click', () => switchModule('home'));
    if (navGym) navGym.addEventListener('click', () => switchModule('gym'));
    if (navNutri) {
        navNutri.addEventListener('click', () => switchModule('nutrition'));
        navNutri.addEventListener('dblclick', requestPushPermission);
    }
}

function switchModule(module) {
    currentAppModule = module;
    const navHome = document.getElementById('nav-home');
    const navGym = document.getElementById('nav-gym');
    const navNutri = document.getElementById('nav-nutri');

    if (navHome && navGym && navNutri) {
        navHome.className = `flex flex-col items-center w-[70px] transition-colors ${module === 'home' ? 'text-[#4F46E5]' : 'text-gray-400 hover:text-gray-600'}`;
        navGym.className = `flex flex-col items-center w-[70px] transition-colors ${module === 'gym' ? 'text-[#4F46E5]' : 'text-gray-400 hover:text-gray-600'}`;
        navNutri.className = `flex flex-col items-center w-[70px] transition-colors ${module === 'nutrition' ? 'text-[#4F46E5]' : 'text-gray-400 hover:text-gray-600'}`;
    }

    loadCurrentModule();
}

function loadCurrentModule() {
    if (currentAppModule === 'home') {
        showHomeDashboard();
    } else if (currentAppModule === 'gym') {
        const activeSession = storage.getActiveSession();
        if (activeSession) { currentRoutineId = activeSession.routineId; showActiveSession(); }
        else { showRoutinesList(); }
    } else if (currentAppModule === 'nutrition') {
        showNutritionDashboard();
    }
}

async function showHomeDashboard() {
    appContainer.innerHTML = `<div class="flex items-center justify-center min-h-screen"><p class="text-gray-500 font-bold animate-pulse">Caricamento Riepilogo...</p></div>`;
    try {
        const [statsRes, waterRes, mealsRes] = await Promise.all([
            fetch('/api/streak'), fetch('/api/water'), fetch('/api/today-meals')
        ]);

        const stats = await statsRes.json();
        const waterData = await waterRes.json();
        const mealsData = await mealsRes.json();
        const goals = storage.getNutritionGoals();

        let consumedCal = 0;
        mealsData.forEach(m => consumedCal += Number(m.calorie) || 0);

        ui.renderHomeDashboard(
            appContainer, stats, waterData.glasses, consumedCal, goals.calorie,
            () => showStreakModal(), // Click Fiamma
            () => switchModule('nutrition'), // Click Calorie (Ti porta a Nutrizione)
            (newAmount) => handleUpdateWater(newAmount), // Click acqua
            () => switchModule('gym'), // Inizia Allenamento
            () => { switchModule('nutrition'); handleManualMealClick(); } // Aggiungi Pasto
        );
    } catch (e) { appContainer.innerHTML = `<div class="p-10 text-center mt-20">Errore di connessione al server.</div>`; }
}

async function handleUpdateWater(newAmount) {
    try {
        await fetch('/api/water', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ glasses: newAmount })
        });
        showHomeDashboard(); // Ricarica la vista istantaneamente
    } catch (e) { console.error("Errore salvataggio acqua", e); }
}

// ==========================================
// MODULO 1: NUTRIZIONE
// ==========================================

async function showNutritionDashboard() {
    appContainer.innerHTML = `
        <div class="flex items-center justify-center min-h-screen">
            <p class="text-gray-500 font-bold animate-pulse">Caricamento dati dal server...</p>
        </div>
    `;

    try {
        const url = currentNutriTab === 'oggi' ? '/api/today-meals' : '/api/history';
        const [response, favsResponse] = await Promise.all([fetch(url), fetch('/api/favorites')]);
        if (!response.ok) throw new Error("Errore del server");

        const mealsData = await response.json();
        currentMealsData = mealsData;
        currentFavorites = await favsResponse.json();
        const goals = storage.getNutritionGoals();

        // 1. Renderizziamo l'interfaccia principale (inserisce l'HTML nel container)
        ui.renderNutritionDashboard(
            appContainer, mealsData, goals, currentNutriTab, currentFavorites,
            (tab) => { currentNutriTab = tab; showNutritionDashboard(); },
            () => handleMicRecord(), // Chiamata senza ID per creare un nuovo pasto
            handleManualMealClick,
            handleDeleteMeal,
            handleEditGoals,
            handleMealClick,
            () => handleScanClick(), // Chiamata senza ID per creare un nuovo pasto
            handleCloseScanner,
            handlePreviewFavorite,
            handleAskAI
        );

        // 2. ORA che l'HTML è presente nella pagina, agganciamo il listener al nuovo bottone dei preferiti
        const favoritesPageBtn = document.getElementById('favorites-page-btn');
        if (favoritesPageBtn) {
            favoritesPageBtn.addEventListener('click', showFavoritesPage);
        }

    } catch (error) {
        appContainer.innerHTML = `<div class="p-10 text-center mt-20">Errore di connessione.</div>`;
    }
}

// Nuova funzione da aggiungere sotto a showNutritionDashboard
function showFavoritesPage() {
    ui.renderFavoritesPage(appContainer, currentFavorites, showNutritionDashboard, handlePreviewFavorite);
}

// Apre la modale e aspetta la conferma
// Apre la modale e gestisce Aggiunta o Rimozione dai Preferiti
function handlePreviewFavorite(favId) {
    const favMeal = currentFavorites.find(m => String(m._id) === String(favId));
    if (!favMeal) return;

    ui.renderFavoritePreviewModal(
        favMeal,
        // 1. Azione di CONFERMA (Aggiungi a oggi)
        () => handleAddFavorite(favId),

        // 2. Azione di RIMOZIONE (Togli dai preferiti)
        async () => {
            try {
                const res = await fetch(`/api/meals/${favId}/favorite`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isFavorite: false }) // Togliamo lo status di preferito!
                });
                if (res.ok) {
                    // Aggiorniamo la pagina Nutrizione per far ricaricare il carosello "Pasti Rapidi"
                    showNutritionDashboard();
                } else {
                    alert("Errore durante la rimozione dai preferiti.");
                }
            } catch (e) { alert("Errore di connessione."); }
        }
    );
}

// Aggiorna handleMealClick per supportare le nuove callback
function handleMealClick(mealId) {
    const meal = currentMealsData.find(m => String(m._id) === String(mealId));
    if (meal) {
        ui.renderMealDetails(
            appContainer,
            meal,
            showNutritionDashboard,
            handleToggleFavorite,
            () => handleMicRecord(mealId),
            () => handleScanClick(mealId),
            handleCloseScanner,
            (ingIdx) => handleRemoveIngredient(mealId, ingIdx),
            () => handleManualMealClick(mealId) // <-- Passiamo l'ID al form manuale per l'aggiunta rapida
        );
    }
}

// NUOVA FUNZIONE: Elimina un ingrediente specifico ricalcolando i macronutrienti
async function handleRemoveIngredient(mealId, ingIdx) {
    if (!window.confirm("Vuoi rimuovere questo alimento dal pasto?")) return;

    const meal = currentMealsData.find(m => String(m._id) === String(mealId));
    if (!meal) return;

    const ingToRemove = meal.ingredienti[ingIdx];
    if (!ingToRemove) return;

    // Sottrae i macronutrienti stando attento a non scendere sotto zero
    meal.calorie = Math.max(0, parseFloat((meal.calorie - ingToRemove.calorie).toFixed(1)));
    meal.proteine = Math.max(0, parseFloat((meal.proteine - ingToRemove.proteine).toFixed(1)));
    meal.carboidrati = Math.max(0, parseFloat((meal.carboidrati - ingToRemove.carboidrati).toFixed(1)));
    meal.grassi = Math.max(0, parseFloat((meal.grassi - ingToRemove.grassi).toFixed(1)));

    // Rimuove l'ingrediente dall'array
    meal.ingredienti.splice(ingIdx, 1);

    // Rigenera il "Titolo" del pasto unendo tutti gli ingredienti rimasti.
    meal.alimenti = meal.ingredienti.map(i => i.nome).join(', ') || "Pasto Vuoto";

    try {
        appContainer.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Aggiornamento in corso...</div>`;
        const response = await fetch(`/api/meals/${mealId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(meal)
        });

        if (response.ok) {
            const data = await response.json();
            const idx = currentMealsData.findIndex(m => String(m._id) === String(mealId));
            if (idx > -1) currentMealsData[idx] = data.meal;
            // Ricarica la vista e mostra il pasto aggiornato!
            handleMealClick(mealId);
        } else {
            alert("Errore durante la rimozione dell'ingrediente");
            handleMealClick(mealId);
        }
    } catch (e) {
        alert("Errore di connessione");
        handleMealClick(mealId);
    }
}

async function handleToggleFavorite(mealId, newStatus) {
    try {
        const res = await fetch(`/api/meals/${mealId}/favorite`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isFavorite: newStatus })
        });
        if (res.ok) {
            const data = await res.json();
            // Aggiorna in memoria e ricarica la vista dettaglio
            const mealIndex = currentMealsData.findIndex(m => String(m._id) === String(mealId));
            if (mealIndex > -1) currentMealsData[mealIndex] = data.meal;
            handleMealClick(mealId);
        }
    } catch (e) { alert("Errore salvataggio preferito."); }
}

async function handleAddFavorite(favId) {
    const favMeal = currentFavorites.find(m => String(m._id) === String(favId));
    if (!favMeal) return;

    appContainer.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Aggiunta pasto rapido...</div>`;

    // Crea un nuovo pasto copiando i dati del preferito
    const newMealData = {
        pasto: favMeal.pasto, alimenti: favMeal.alimenti, calorie: favMeal.calorie,
        proteine: favMeal.proteine, carboidrati: favMeal.carboidrati, grassi: favMeal.grassi,
        ingredienti: favMeal.ingredienti
    };

    try {
        const response = await fetch('/api/meals', {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newMealData)
        });
        if (response.ok) {
            showNutritionDashboard();
            triggerStreak();
        } else alert("Errore nel salvataggio");
    } catch (e) { alert("Errore di connessione"); }
}

async function handleManualMealClick(targetMealId = null) {
    ui.renderManualMealForm(appContainer, async (mealData) => {
        appContainer.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Salvataggio in corso...</div>`;

        // Creiamo l'array strutturato con il singolo ingrediente
        mealData.ingredienti = [{
            nome: mealData.alimenti,
            calorie: mealData.calorie,
            proteine: mealData.proteine,
            carboidrati: mealData.carboidrati,
            grassi: mealData.grassi
        }];

        try {
            // CASO A: Stiamo aggiungendo cose ad un pasto esistente
            if (targetMealId) {
                const existingMeal = currentMealsData.find(m => String(m._id) === String(targetMealId));
                if (!existingMeal) return;

                const updatedMeal = { ...existingMeal };
                // Somma algebrica dei valori e formattazione decimale
                updatedMeal.calorie = parseFloat((updatedMeal.calorie + mealData.calorie).toFixed(1));
                updatedMeal.proteine = parseFloat((updatedMeal.proteine + mealData.proteine).toFixed(1));
                updatedMeal.carboidrati = parseFloat((updatedMeal.carboidrati + mealData.carboidrati).toFixed(1));
                updatedMeal.grassi = parseFloat((updatedMeal.grassi + mealData.grassi).toFixed(1));
                updatedMeal.alimenti += ", " + mealData.alimenti;
                updatedMeal.ingredienti.push(mealData.ingredienti[0]);

                const response = await fetch(`/api/meals/${targetMealId}`, {
                    method: 'PUT',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedMeal)
                });

                if (response.ok) {
                    const data = await response.json();
                    const idx = currentMealsData.findIndex(m => String(m._id) === String(targetMealId));
                    if (idx > -1) currentMealsData[idx] = data.meal;

                    // Ritorna direttamente alla vista dei dettagli del pasto aggiornato
                    handleMealClick(targetMealId);
                } else {
                    alert("Errore durante l'aggiunta al pasto");
                    handleMealClick(targetMealId);
                }
            }
            // CASO B: Comportamento standard (Crea un intero nuovo pasto nella dashboard)
            else {
                const response = await fetch('/api/meals', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(mealData)
                });
                if (response.ok) {
                    showNutritionDashboard();
                    triggerStreak();
                } else {
                    alert("Errore nel salvataggio");
                }
            }
        } catch (e) {
            alert("Errore di connessione");
            if (targetMealId) handleMealClick(targetMealId);
            else showNutritionDashboard();
        }
    }, () => {
        // Se l'utente clicca Annulla/Indietro nel form manuale
        if (targetMealId) handleMealClick(targetMealId);
        else showNutritionDashboard();
    });

    // Se stiamo modificando un pasto esistente, compiliamo automaticamente la categoria (es. Pranzo) nel form
    if (targetMealId) {
        const existingMeal = currentMealsData.find(m => String(m._id) === String(targetMealId));
        if (existingMeal) {
            const mPastoInput = document.getElementById('m-pasto');
            if (mPastoInput) {
                mPastoInput.value = existingMeal.pasto;
                mPastoInput.disabled = true; // Impedisce di cambiare la categoria durante un'espansione
            }
        }
    }
}

// --- LOGICA DELLO SCANNER LIVE CON ZXING ---
async function handleScanClick(targetMealId = null) {
    // Salviamo l'ID del pasto (o null) nella variabile globale dell'app per farla recuperare poi ai form di salvataggio
    activeScannerTargetMealId = typeof targetMealId === 'string' ? targetMealId : null;

    document.getElementById('action-buttons')?.classList.add('hidden');
    document.getElementById('scanner-container').classList.remove('hidden');

    if (!codeReader) {
        codeReader = new ZXing.BrowserMultiFormatReader();
    }

    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();

        if (videoInputDevices && videoInputDevices.length > 0) {
            let selectedDeviceId = videoInputDevices[0].deviceId;

            for (let i = 0; i < videoInputDevices.length; i++) {
                let label = videoInputDevices[i].label.toLowerCase();
                if (label.includes("back") || label.includes("posteriore") || label.includes("environment")) {
                    selectedDeviceId = videoInputDevices[i].deviceId;
                    if (!label.includes("ultrawide") && !label.includes("ultra wide")) {
                        break;
                    }
                }
            }

            codeReader.decodeFromVideoDevice(selectedDeviceId, 'reader-video', (result, err) => {
                if (result) {
                    const barcode = result.getText();
                    handleCloseScanner();
                    fetchProductFromBarcode(barcode);
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error("Errore scanner:", err);
                }
            });
        } else {
            alert("Nessuna fotocamera rilevata dal browser.");
            handleCloseScanner();
        }
    } catch (err) {
        alert("Consenti l'accesso alla fotocamera per usare questa funzione.");
        handleCloseScanner();
    }
}

async function handleCloseScanner() {
    // Ferma la fotocamera e pulisce lo stream video
    if (codeReader) {
        codeReader.reset();
    }

    const container = document.getElementById('scanner-container');
    const actionBtns = document.getElementById('action-buttons');
    if (container) container.classList.add('hidden');
    if (actionBtns) actionBtns.classList.remove('hidden');
}

async function fetchProductFromBarcode(barcode) {
    appContainer.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse text-blue-600">Codice rilevato! Ricerca nel database...</div>`;
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await res.json();

        if (data.status === 1) {
            const p = data.product;
            const name = p.product_name || "Prodotto Sconosciuto";
            const n = p.nutriments || {};

            // --- INIZIO NUOVA LOGICA CALORIE (Forzata a Kcal) ---
            let cal = n['energy-kcal_100g'];

            // 1. Se manca il campo kcal, peschiamo quello kJ o generico e lo convertiamo
            if (cal === undefined || cal === null) {
                if (n['energy-kj_100g']) {
                    cal = n['energy-kj_100g'] / 4.184; // 1 kcal = 4.184 kJ
                } else if (n['energy_100g']) {
                    // Il campo generico di OFF è quasi sempre in kJ
                    cal = n['energy_100g'] / 4.184;
                } else {
                    cal = 0;
                }
            }

            // 2. Correzione errori DB umano: 
            // Se le calorie superano 900 su 100g è impossibile. Sono chiaramente kJ!
            if (cal > 900) {
                cal = cal / 4.184;
            }

            // Arrotondiamo a un decimale per non avere numeri lunghissimi
            cal = parseFloat(Number(cal).toFixed(1));
            // --- FINE NUOVA LOGICA CALORIE ---

            const pro = n['proteins_100g'] || 0;
            const carbo = n['carbohydrates_100g'] || 0;
            const fat = n['fat_100g'] || 0;

            openPreFilledManualMeal(name, cal, pro, carbo, fat, activeScannerTargetMealId);
        } else {
            alert("Spiacente, prodotto non trovato nel database mondiale.");
            showNutritionDashboard();
        }
    } catch (e) {
        alert("Errore di connessione a Open Food Facts.");
        showNutritionDashboard();
    }
}

function openPreFilledManualMeal(name, cal, pro, carbo, fat, targetMealId = null) {
    ui.renderManualMealForm(appContainer, async (mealData) => {
        appContainer.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Salvataggio in corso...</div>`;
        mealData.ingredienti = [{ nome: mealData.alimenti, calorie: mealData.calorie, proteine: mealData.proteine, carboidrati: mealData.carboidrati, grassi: mealData.grassi }];

        try {
            if (targetMealId) {
                const existingMeal = currentMealsData.find(m => String(m._id) === String(targetMealId));
                const updatedMeal = { ...existingMeal };
                updatedMeal.calorie = parseFloat((updatedMeal.calorie + mealData.calorie).toFixed(1));
                updatedMeal.proteine = parseFloat((updatedMeal.proteine + mealData.proteine).toFixed(1));
                updatedMeal.carboidrati = parseFloat((updatedMeal.carboidrati + mealData.carboidrati).toFixed(1));
                updatedMeal.grassi = parseFloat((updatedMeal.grassi + mealData.grassi).toFixed(1));
                updatedMeal.alimenti += ", " + mealData.alimenti;
                updatedMeal.ingredienti.push(mealData.ingredienti[0]);

                const response = await fetch(`/api/meals/${targetMealId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedMeal) });
                if (response.ok) {
                    const data = await response.json();
                    const idx = currentMealsData.findIndex(m => String(m._id) === String(targetMealId));
                    if (idx > -1) currentMealsData[idx] = data.meal;
                    handleMealClick(targetMealId);
                }
            } else {
                const response = await fetch('/api/meals', { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mealData) });
                if (response.ok) { showNutritionDashboard(); triggerStreak(); }
            }
        } catch (e) { alert("Errore di connessione"); }
    }, () => {
        if (targetMealId) handleMealClick(targetMealId);
        else showNutritionDashboard();
    });

    document.getElementById('m-alimenti').value = name;
    document.getElementById('m-cal-100').value = cal;
    document.getElementById('m-pro-100').value = pro;
    document.getElementById('m-carbo-100').value = carbo;
    document.getElementById('m-fat-100').value = fat;

    setTimeout(() => document.getElementById('m-peso').focus(), 300);
}


async function handleMicRecord(targetMealId = null) {
    // Se c'è un targetMealId usiamo il bottone interno alla card dei dettagli, altrimenti quello principale
    const btnId = targetMealId ? 'add-voice-meal-btn' : 'mic-btn';
    const micBtn = document.getElementById(btnId);
    if (!micBtn) return;

    const originalBtnHtml = micBtn.innerHTML;

    if (isRecording && currentRecognition) {
        currentRecognition.stop();
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Il riconoscimento vocale non è supportato.");
        return;
    }

    currentRecognition = new SpeechRecognition();
    currentRecognition.lang = 'it-IT';
    currentRecognition.continuous = true;
    currentRecognition.interimResults = false;

    finalTranscript = "";
    isRecording = true;

    micBtn.innerHTML = "⏹️ Ascoltando... Clicca per terminare";
    micBtn.classList.add("animate-pulse", "bg-red-600");

    currentRecognition.start();

    currentRecognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
        }
    };

    currentRecognition.onend = async () => {
        isRecording = false;

        if (!finalTranscript.trim()) {
            micBtn.innerHTML = originalBtnHtml;
            micBtn.classList.remove("animate-pulse", "bg-red-600", "bg-orange-500");
            return;
        }

        micBtn.innerHTML = "⏳ Analisi in corso...";
        micBtn.classList.remove("animate-pulse", "bg-red-600");
        micBtn.classList.add("bg-orange-500");

        try {
            const response = await fetch(`/api/analyze-meal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Inviamo anche il mealId (sarà null se stiamo creando un nuovo pasto)
                body: JSON.stringify({ text: finalTranscript, mealId: targetMealId })
            });

            if (!response.ok) throw new Error("Errore col Server");

            const data = await response.json();

            if (data.success) {
                if (targetMealId) {
                    // Aggiorniamo il pasto modificato all'interno del nostro stato locale
                    const idx = currentMealsData.findIndex(m => String(m._id) === String(targetMealId));
                    if (idx > -1) currentMealsData[idx] = data.meal;

                    // Ricarichiamo la schermata dei dettagli del pasto in cui ci troviamo, mostrando i nuovi cibi inseriti
                    handleMealClick(targetMealId);
                } else {
                    // Comportamento standard: aggiorna la dashboard nutrizione principale
                    showNutritionDashboard();
                    triggerStreak();
                }
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            alert("Errore: " + error.message);
            micBtn.innerHTML = originalBtnHtml;
            micBtn.classList.remove("bg-orange-500");
        }
    };

    currentRecognition.onerror = (event) => {
        if (event.error !== 'aborted') alert("Errore microfono: " + event.error);
        isRecording = false;
        micBtn.innerHTML = originalBtnHtml;
        micBtn.classList.remove("animate-pulse", "bg-red-600", "bg-orange-500");
    };
}

async function handleDeleteMeal(mealId) {
    if (!window.confirm("Vuoi eliminare questo pasto?")) return;
    try {
        const response = await fetch(`/api/meals/${mealId}`, { method: "DELETE" });
        if (response.ok) {
            showNutritionDashboard();
            fetchStreak();
        }
        else alert("Errore durante l'eliminazione");
    } catch (error) {
        alert("Impossibile connettersi al server");
    }
}

function handleEditGoals() {
    const currentGoals = storage.getNutritionGoals();
    ui.renderEditGoalsForm(
        appContainer,
        currentGoals,
        (newGoals) => {
            storage.saveNutritionGoals(newGoals);
            showNutritionDashboard();
        },
        showNutritionDashboard
    );
}

// ==========================================
// MODULO 2: PALESTRA
// ==========================================

async function showRoutinesList() {
    appContainer.innerHTML = `<div class="flex justify-center items-center min-h-screen"><p class="animate-pulse">Caricamento...</p></div>`;
    const routines = await storage.getRoutines();
    ui.renderRoutinesList(appContainer, routines, handleOpenRoutine, handleCreateRoutine, handleEditRoutineName, handleDeleteRoutine);
}

async function handleCreateRoutine() {
    const name = window.prompt("Nome scheda:", "Nuova Scheda");
    if (name && name.trim() !== "") {
        await storage.createRoutine(name.trim());
        showRoutinesList();
    }
}

async function handleEditRoutineName(routineId, oldName) {
    const newName = window.prompt("Modifica nome:", oldName);
    if (newName && newName.trim() !== "") {
        await storage.editRoutineName(routineId, newName.trim());
        showRoutinesList();
    }
}

async function handleDeleteRoutine(routineId) {
    if (window.confirm("Eliminare scheda?")) {
        await storage.deleteRoutine(routineId);
        showRoutinesList();
    }
}

function handleOpenRoutine(routineId) {
    currentRoutineId = routineId;
    currentTab = 'scheda';
    showDashboard();
}

async function showDashboard() {
    appContainer.innerHTML = `<div class="flex justify-center items-center min-h-screen"><p class="animate-pulse">Caricamento...</p></div>`;
    const routine = await storage.getRoutine(currentRoutineId);
    if (!routine) return showRoutinesList();

    const history = await storage.getHistoryForRoutine(currentRoutineId);
    ui.renderDashboard(
        appContainer, routine, history, currentTab,
        handleTabSwitch, handleStartSession, showRoutineBuilder,
        handleDeleteExercise, handleShowExerciseStats, showRoutinesList
    );
}

function handleTabSwitch(tab) {
    currentTab = tab;
    showDashboard();
}

async function handleDeleteExercise(exerciseId) {
    if (window.confirm("Eliminare esercizio?")) {
        await storage.removeExerciseFromRoutine(currentRoutineId, exerciseId);
        showDashboard();
    }
}

function showRoutineBuilder() {
    ui.renderRoutineBuilder(appContainer, async (newExercise) => {
        appContainer.innerHTML = `<p class="text-center mt-20 animate-pulse">Salvataggio...</p>`;
        await storage.addExerciseToRoutine(currentRoutineId, newExercise);
        showDashboard();
    }, showDashboard);
}

async function handleStartSession() {
    const routine = await storage.getRoutine(currentRoutineId);
    const exerciseIds = routine.exercises.map(ex => ex.id);
    storage.startSession(currentRoutineId, exerciseIds);
    showActiveSession();
}

async function showActiveSession() {
    const session = storage.getActiveSession();
    const routine = await storage.getRoutine(currentRoutineId);
    ui.renderActiveSession(appContainer, session, routine, handleOpenExercise, handleEndSession);
}

async function handleEndSession() {
    const session = storage.getActiveSession();
    if (session && session.todo.length > 0) {
        if (!window.confirm("Terminare in anticipo?")) return;
    }
    appContainer.innerHTML = `<p class="text-center mt-20 animate-pulse">Salvataggio nel Database...</p>`;
    await storage.endActiveSession();
    triggerStreak();
    currentTab = 'storico';
    showDashboard();
}

async function handleOpenExercise(exerciseId) {
    const routine = await storage.getRoutine(currentRoutineId);

    // Assicuriamoci che gli ID vengano sempre confrontati come stringhe per evitare i "null"
    currentExercise = routine.exercises.find(ex => String(ex.id) === String(exerciseId));

    if (!currentExercise) {
        console.error("Esercizio non trovato nella scheda:", exerciseId);
        return;
    }

    const draft = storage.getDraft(exerciseId);
    currentLastSession = await storage.getLastSession(currentRoutineId, exerciseId);

    currentSessionData = [];
    for (let i = 0; i < currentExercise.targetSets; i++) {
        if (draft && draft[i]) {
            currentSessionData.push({ ...draft[i], completed: draft[i].completed || false });
        } else if (currentLastSession && currentLastSession.sets[i]) {
            currentSessionData.push({ ...currentLastSession.sets[i], completed: false });
        } else {
            currentSessionData.push({
                kg: currentExercise.baseKg !== 0 ? currentExercise.baseKg : '',
                reps: currentExercise.targetReps,
                completed: false
            });
        }
    }

    ui.renderActiveExercise(
        appContainer, currentExercise, currentLastSession, currentSessionData,
        handleInput, handleCompleteExercise, showActiveSession, handleSaveSet, handleEditSet
    );
}

const finalizeSetData = debounce((idx) => {
    storage.saveDraft(currentExercise.id, currentSessionData);
    ui.updateFeedback(idx, 'Salvato ✓');
}, 500);

function handleInput(idx, field, value) {
    currentSessionData[idx][field] = value;
    ui.updateFeedback(idx, 'Salvataggio...');
    finalizeSetData(idx);
}

function handleCompleteExercise() {
    storage.completeExerciseInSession(currentExercise, currentSessionData);
    storage.clearDraft();
    currentExercise = null;
    currentSessionData = [];
    showActiveSession();
}

async function handleShowExerciseStats(exerciseId, exerciseName) {
    const history = await storage.getHistoryForRoutine(currentRoutineId);
    const sessionsWithEx = history
        .filter(session => session.exercises.some(e => e.exerciseId === exerciseId))
        .sort((a, b) => a.endTime - b.endTime);

    if (sessionsWithEx.length === 0) return alert("Dati insufficienti per il grafico.");

    const labels = [];
    const maxWeights = [];
    const totalVolumes = [];

    sessionsWithEx.forEach(session => {
        const dateStr = new Date(session.endTime).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        const exData = session.exercises.find(e => e.exerciseId === exerciseId);

        labels.push(dateStr);

        let maxKg = 0;
        let vol = 0;
        exData.sets.forEach(set => {
            const kg = parseFloat(set.kg) || 0;
            const reps = parseInt(set.reps) || 0;
            if (kg > maxKg) maxKg = kg;
            vol += (kg > 0 ? kg * reps : reps);
        });

        maxWeights.push(maxKg);
        totalVolumes.push(vol);
    });

    ui.renderExerciseStats(appContainer, exerciseName, labels, maxWeights, totalVolumes, showDashboard);
}

// --- FUNZIONE NOTIFICHE PUSH ---
const PUBLIC_VAPID_KEY = 'BOW7kotgWAt7opZbdoduiywiQsbpwr905CRZHyp92cdAugcmljILgToagh9V8OzZn6xoDwx1BKzmHMqS0zTxSqg'; // Metti la stessa chiave pubblica generata!

async function requestPushPermission() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert("Notifiche non supportate. Usa l'app dalla Schermata Home di iOS.");
        return;
    }
    try {
        const register = await navigator.serviceWorker.register('/sw.js');
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') return alert("Permesso negato per le notifiche.");

        const subscription = await register.pushManager.subscribe({
            userVisibleOnly: true, applicationServerKey: PUBLIC_VAPID_KEY
        });

        await fetch('/api/subscribe', {
            method: 'POST', body: JSON.stringify(subscription),
            headers: { 'Content-Type': 'application/json' }
        });
        alert("✅ Iscrizione notifiche completata!");
    } catch (err) {
        alert("Errore nell'attivazione delle notifiche.");
    }
}

// ==========================================
// SISTEMA FIAMMA (STREAK)
// ==========================================
export async function fetchStreak() {
    try {
        const res = await fetch('/api/streak');
        const data = await res.json();
        updateStreakUI(data.currentStreak, data.activeToday, false);
    } catch (e) { console.error("Impossibile caricare la streak", e); }
}

export async function triggerStreak() {
    try {
        const container = document.getElementById('streak-icon');
        const wasActive = container && !container.classList.contains('grayscale');

        const res = await fetch('/api/streak/trigger', { method: 'POST' });
        const data = await res.json();

        updateStreakUI(data.currentStreak, data.activeToday, !wasActive);
    } catch (e) { console.error("Errore aggiornamento streak", e); }
}

function updateStreakUI(count, activeToday, playAnimation = false) {
    const icon = document.getElementById('streak-icon');
    const countEl = document.getElementById('streak-count');
    const container = document.getElementById('streak-container');

    if (!icon || !countEl) return;

    countEl.textContent = count;

    if (activeToday) {
        icon.classList.remove('text-gray-400', 'grayscale');
        countEl.classList.remove('text-gray-400');
        countEl.classList.add('text-orange-500');
        container.classList.remove('bg-gray-50', 'border-gray-100');
        container.classList.add('border-orange-200', 'bg-orange-50');

        if (playAnimation) {
            icon.classList.add('animate-bounce', 'scale-125');
            setTimeout(() => icon.classList.remove('animate-bounce', 'scale-125'), 1500);
        }
    } else {
        icon.classList.add('text-gray-400', 'grayscale');
        countEl.classList.remove('text-orange-500');
        countEl.classList.add('text-gray-400');
        container.classList.remove('border-orange-200', 'bg-orange-50');
        container.classList.add('bg-gray-50', 'border-gray-100');
    }
}

export async function showStreakModal() {
    try {
        const res = await fetch('/api/streak');
        const stats = await res.json();
        ui.renderStreakModal(stats);
    } catch (e) {
        console.error("Impossibile caricare le statistiche", e);
    }
}

function handleSaveSet(idx) {
    currentSessionData[idx].completed = true;
    storage.saveDraft(currentExercise.id, currentSessionData);

    // --> FUTURO HOOK DEL TIMER DI RECUPERO: console.log("Start timer");

    ui.renderActiveExercise(
        appContainer, currentExercise, currentLastSession, currentSessionData,
        handleInput, handleCompleteExercise, showActiveSession, handleSaveSet, handleEditSet
    );
}

function handleEditSet(idx) {
    currentSessionData[idx].completed = false;
    storage.saveDraft(currentExercise.id, currentSessionData);

    ui.renderActiveExercise(
        appContainer, currentExercise, currentLastSession, currentSessionData,
        handleInput, handleCompleteExercise, showActiveSession, handleSaveSet, handleEditSet
    );
}

// --- GESTIONE NUTRIZIONISTA AI ---
function handleAskAI() {
    ui.renderAIModal(async (question, callbackResults) => {

        // Calcoliamo i macro consumati OGGI per passarli a Gemini
        const goals = storage.getNutritionGoals();
        let consumate = { calorie: 0, proteine: 0, carbo: 0, grassi: 0 };
        const todayStr = new Date().toDateString();

        currentMealsData.forEach(meal => {
            if (new Date(meal.data).toDateString() === todayStr) {
                consumate.calorie += Number(meal.calorie) || 0;
                consumate.proteine += Number(meal.proteine) || 0;
                consumate.carbo += Number(meal.carboidrati) || 0;
                consumate.grassi += Number(meal.grassi) || 0;
            }
        });

        try {
            const response = await fetch('/api/recommend-meal', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, goals, consumate })
            });

            const data = await response.json();
            if (data.success && data.recommendations) {
                // Passa l'array dei 3 pasti alla UI
                callbackResults(data.recommendations);
            } else {
                alert(data.error || "Impossibile elaborare i consigli. Riprova.");
                showNutritionDashboard(); // Chiude e resetta
            }
        } catch (error) {
            alert("Errore di connessione al server.");
            showNutritionDashboard();
        }

    }, async (mealDataToSave) => {
        // Callback attivata quando l'utente preme "Salva nel Diario" su una card
        appContainer.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Salvataggio pasto in corso...</div>`;
        try {
            const response = await fetch('/api/meals', {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mealDataToSave)
            });
            if (response.ok) {
                showNutritionDashboard();
                triggerStreak();
            } else {
                alert("Errore nel salvataggio del pasto.");
                showNutritionDashboard();
            }
        } catch (e) {
            alert("Errore di connessione");
            showNutritionDashboard();
        }
    });
}

document.addEventListener('DOMContentLoaded', init);