import * as storage from './storage.js?v=11';
import * as ui from './ui.js?v=11';
import { debounce } from './utils.js?v=11';

const appContainer = document.getElementById('app');

// ==========================================
// STATO APPLICATIVO GLOBALE
// ==========================================
let currentAppModule = 'gym';
let currentRoutineId = null;
let currentTab = 'scheda';
let currentExercise = null;
let currentSessionData = [];
let isRecording = false;
let currentRecognition = null;
let finalTranscript = "";
let currentNutriTab = 'oggi';
let currentMealsData = [];
let codeReader = null;

// ==========================================
// INIZIALIZZAZIONE E NAVIGAZIONE
// ==========================================
function init() {
    setupNavigation();
    loadCurrentModule();
}

function setupNavigation() {
    const navGym = document.getElementById('nav-gym');
    const navNutri = document.getElementById('nav-nutri');

    if (navGym) navGym.addEventListener('click', () => switchModule('gym'));
    if (navNutri) navNutri.addEventListener('click', () => switchModule('nutrition'));
}

function switchModule(module) {
    currentAppModule = module;
    const navGym = document.getElementById('nav-gym');
    const navNutri = document.getElementById('nav-nutri');

    if (navGym && navNutri) {
        navGym.classList.toggle('text-gray-900', module === 'gym');
        navGym.classList.toggle('text-gray-400', module !== 'gym');
        navNutri.classList.toggle('text-gray-900', module === 'nutrition');
        navNutri.classList.toggle('text-gray-400', module !== 'nutrition');
    }

    loadCurrentModule();
}

function loadCurrentModule() {
    if (currentAppModule === 'gym') {
        const activeSession = storage.getActiveSession();
        if (activeSession) {
            currentRoutineId = activeSession.routineId;
            showActiveSession();
        } else {
            showRoutinesList();
        }
    } else if (currentAppModule === 'nutrition') {
        showNutritionDashboard();
    }
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
        const response = await fetch(url);
        if (!response.ok) throw new Error("Errore del server");

        const mealsData = await response.json();
        currentMealsData = mealsData;
        const goals = storage.getNutritionGoals();

        ui.renderNutritionDashboard(
            appContainer, mealsData, goals, currentNutriTab,
            (tab) => { currentNutriTab = tab; showNutritionDashboard(); },
            handleMicRecord,
            handleManualMealClick,
            handleDeleteMeal,
            handleEditGoals,
            handleMealClick,
            handleScanClick,     // Funzione apertura scanner
            handleCloseScanner   // Funzione chiusura scanner
        );

    } catch (error) {
        appContainer.innerHTML = `<div class="p-10 text-center mt-20">Errore di connessione.</div>`;
    }
}

function handleMealClick(mealId) {
    try {
        const meal = currentMealsData.find(m => String(m._id) === String(mealId));
        if (!meal) {
            alert("Errore: Pasto non trovato nei dati in memoria.");
            return;
        }
        ui.renderMealDetails(appContainer, meal, showNutritionDashboard);
    } catch (error) {
        alert("Errore durante l'apertura del pasto: " + error.message);
    }
}

function handleManualMealClick() {
    ui.renderManualMealForm(appContainer, async (mealData) => {
        appContainer.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Salvataggio in corso...</div>`;

        // Creiamo l'array con un singolo ingrediente
        mealData.ingredienti = [{
            nome: mealData.alimenti,
            calorie: mealData.calorie,
            proteine: mealData.proteine,
            carboidrati: mealData.carboidrati,
            grassi: mealData.grassi
        }];

        try {
            const response = await fetch('/api/meals', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mealData)
            });
            if (response.ok) showNutritionDashboard();
            else alert("Errore nel salvataggio");
        } catch (e) {
            alert("Errore di connessione");
        }
    }, showNutritionDashboard);
}

// --- LOGICA DELLO SCANNER LIVE CON ZXING ---
async function handleScanClick() {
    document.getElementById('action-buttons').classList.add('hidden');
    document.getElementById('scanner-container').classList.remove('hidden');

    // Inizializza ZXing se non esiste
    if (!codeReader) {
        codeReader = new ZXing.BrowserMultiFormatReader();
    }

    try {
        // 1. Legge tutte le fotocamere del dispositivo
        const videoInputDevices = await codeReader.listVideoInputDevices();

        if (videoInputDevices && videoInputDevices.length > 0) {
            let selectedDeviceId = videoInputDevices[0].deviceId;

            // 2. Cerchiamo la fotocamera posteriore evitando l'ultrawide
            for (let i = 0; i < videoInputDevices.length; i++) {
                let label = videoInputDevices[i].label.toLowerCase();
                if (label.includes("back") || label.includes("posteriore") || label.includes("environment")) {
                    selectedDeviceId = videoInputDevices[i].deviceId;
                    if (!label.includes("ultrawide") && !label.includes("ultra wide")) {
                        break;
                    }
                }
            }

            // 3. Avviamo la scansione agganciandola al tag <video>
            codeReader.decodeFromVideoDevice(selectedDeviceId, 'reader-video', (result, err) => {
                if (result) {
                    // Codice a barre trovato!
                    const barcode = result.getText();
                    handleCloseScanner();
                    fetchProductFromBarcode(barcode);
                }

                // Ignoriamo gli errori NotFound (avvengono ogni millisecondo in cui non c'è un codice nell'inquadratura)
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

            const cal = n['energy-kcal_100g'] || 0;
            const pro = n['proteins_100g'] || 0;
            const carbo = n['carbohydrates_100g'] || 0;
            const fat = n['fat_100g'] || 0;

            openPreFilledManualMeal(name, cal, pro, carbo, fat);
        } else {
            alert("Spiacente, prodotto non trovato nel database mondiale.");
            showNutritionDashboard();
        }
    } catch (e) {
        alert("Errore di connessione a Open Food Facts.");
        showNutritionDashboard();
    }
}

function openPreFilledManualMeal(name, cal, pro, carbo, fat) {
    ui.renderManualMealForm(appContainer, async (mealData) => {
        appContainer.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse">Salvataggio in corso...</div>`;
        mealData.ingredienti = [{
            nome: mealData.alimenti, calorie: mealData.calorie, proteine: mealData.proteine, carboidrati: mealData.carboidrati, grassi: mealData.grassi
        }];
        try {
            const response = await fetch('/api/meals', { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mealData) });
            if (response.ok) showNutritionDashboard(); else alert("Errore nel salvataggio");
        } catch (e) { alert("Errore di connessione"); }
    }, showNutritionDashboard);

    document.getElementById('m-alimenti').value = name;
    document.getElementById('m-cal-100').value = cal;
    document.getElementById('m-pro-100').value = pro;
    document.getElementById('m-carbo-100').value = carbo;
    document.getElementById('m-fat-100').value = fat;

    setTimeout(() => document.getElementById('m-peso').focus(), 300);
}


async function handleMicRecord() {
    const micBtn = document.getElementById('mic-btn');
    const originalBtnHtml = `<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg> REGISTRA VOCE`;

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
                body: JSON.stringify({ text: finalTranscript })
            });

            if (!response.ok) throw new Error("Errore col Server");

            const data = await response.json();

            if (data.success) {
                showNutritionDashboard();
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
        if (response.ok) showNutritionDashboard();
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
    currentTab = 'storico';
    showDashboard();
}

async function handleOpenExercise(exerciseId) {
    const routine = await storage.getRoutine(currentRoutineId);
    currentExercise = routine.exercises.find(ex => ex.id === exerciseId);

    const draft = storage.getDraft(exerciseId);
    const lastSession = await storage.getLastSession(currentRoutineId, exerciseId);

    currentSessionData = [];
    for (let i = 0; i < currentExercise.targetSets; i++) {
        if (draft && draft[i]) {
            currentSessionData.push({ ...draft[i] });
        } else if (lastSession && lastSession.sets[i]) {
            currentSessionData.push({ ...lastSession.sets[i] });
        } else {
            currentSessionData.push({
                kg: currentExercise.baseKg !== 0 ? currentExercise.baseKg : '',
                reps: currentExercise.targetReps
            });
        }
    }

    ui.renderActiveExercise(
        appContainer, currentExercise, lastSession, currentSessionData,
        handleInput, handleCompleteExercise, showActiveSession
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

document.addEventListener('DOMContentLoaded', init);