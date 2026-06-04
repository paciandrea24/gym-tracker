import * as storage from './storage.js?v=7';
import * as ui from './ui.js?v=7';
import { debounce } from './utils.js?v=7';

const appContainer = document.getElementById('app');

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
let html5QrCode = null;

function init() { setupNavigation(); loadCurrentModule(); }

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
        if (activeSession) { currentRoutineId = activeSession.routineId; showActiveSession(); }
        else { showRoutinesList(); }
    } else if (currentAppModule === 'nutrition') {
        showNutritionDashboard();
    }
}

// --- NUTRIZIONE ---
async function showNutritionDashboard() {
    appContainer.innerHTML = `<div class="flex items-center justify-center min-h-screen"><p class="text-gray-500 font-bold animate-pulse">Caricamento...</p></div>`;
    try {
        const url = currentNutriTab === 'oggi' ? '/api/today-meals' : '/api/history';
        const response = await fetch(url);
        if (!response.ok) throw new Error("Errore server");
        const mealsData = await response.json();
        currentMealsData = mealsData;
        const goals = storage.getNutritionGoals();
        ui.renderNutritionDashboard(appContainer, mealsData, goals, currentNutriTab, (tab) => { currentNutriTab = tab; showNutritionDashboard(); }, handleMicRecord, handleManualMealClick, handleDeleteMeal, handleEditGoals, handleMealClick, handleScanClick, handleCloseScanner);
    } catch (error) { appContainer.innerHTML = `<div class="p-10 text-center mt-20">Errore di connessione.</div>`; }
}

function handleMealClick(mealId) {
    try {
        const meal = currentMealsData.find(m => String(m._id) === String(mealId));
        if (meal) ui.renderMealDetails(appContainer, meal, showNutritionDashboard);
    } catch (e) { alert("Errore: " + e.message); }
}

function handleManualMealClick() {
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
}

// --- LOGICA DELLO SCANNER OTTIMIZZATA PER SMARTPHONE ---
function handleScanClick() {
    document.getElementById('action-buttons').classList.add('hidden');
    document.getElementById('scanner-container').classList.remove('hidden');

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    // Creiamo un rettangolo orizzontale dinamico basato sullo schermo
    const boxWidth = Math.min(window.innerWidth - 60, 300);

    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: boxWidth, height: 120 } // Rettangolo perfetto per codici EAN
        },
        async (decodedText) => {
            await handleCloseScanner();
            fetchProductFromBarcode(decodedText);
        },
        (errorMessage) => {
            // Ignoriamo gli errori temporanei mentre cerca di mettere a fuoco
        }
    ).catch(err => {
        alert("Errore nell'avvio della fotocamera: controlla i permessi.");
        handleCloseScanner();
    });
}

async function handleCloseScanner() {
    if (html5QrCode) {
        try { await html5QrCode.stop(); } catch (e) { /* Scanner già fermo */ }
    }
    const container = document.getElementById('scanner-container');
    const actionBtns = document.getElementById('action-buttons');
    if (container) container.classList.add('hidden');
    if (actionBtns) actionBtns.classList.remove('hidden');
}

async function fetchProductFromBarcode(barcode) {
    appContainer.innerHTML = `<div class="p-10 text-center mt-20 font-bold animate-pulse text-blue-600">Ricerca nel database mondiale...</div>`;
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await res.json();

        if (data.status === 1) {
            const p = data.product;
            const name = p.product_name || "Prodotto Sconosciuto";
            const n = p.nutriments || {};

            // Estrapoliamo i valori su 100g
            const cal = n['energy-kcal_100g'] || 0;
            const pro = n['proteins_100g'] || 0;
            const carbo = n['carbohydrates_100g'] || 0;
            const fat = n['fat_100g'] || 0;

            openPreFilledManualMeal(name, cal, pro, carbo, fat);
        } else {
            alert("Spiacente, prodotto non trovato nel database.");
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
    if (isRecording && currentRecognition) { currentRecognition.stop(); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Riconoscimento vocale non supportato.");

    currentRecognition = new SpeechRecognition();
    currentRecognition.lang = 'it-IT'; currentRecognition.continuous = true;
    finalTranscript = ""; isRecording = true;
    micBtn.innerHTML = "⏹️ Ascoltando... Clicca per terminare"; micBtn.classList.add("animate-pulse", "bg-red-600");
    currentRecognition.start();
    currentRecognition.onresult = (event) => { for (let i = event.resultIndex; i < event.results.length; ++i) if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " "; };
    currentRecognition.onend = async () => {
        isRecording = false;
        if (!finalTranscript.trim()) { micBtn.innerHTML = originalBtnHtml; micBtn.classList.remove("animate-pulse", "bg-red-600"); return; }
        micBtn.innerHTML = "⏳ Analisi in corso..."; micBtn.classList.replace("bg-red-600", "bg-orange-500");
        try {
            const response = await fetch(`/api/analyze-meal`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: finalTranscript }) });
            const data = await response.json();
            if (data.success) showNutritionDashboard(); else throw new Error(data.error);
        } catch (error) { alert("Errore: " + error.message); micBtn.innerHTML = originalBtnHtml; micBtn.classList.remove("bg-orange-500"); }
    };
}

async function handleDeleteMeal(mealId) {
    if (!window.confirm("Eliminare pasto?")) return;
    try { await fetch(`/api/meals/${mealId}`, { method: "DELETE" }); showNutritionDashboard(); } catch (e) { alert("Errore"); }
}

function handleEditGoals() {
    ui.renderEditGoalsForm(appContainer, storage.getNutritionGoals(), (newGoals) => { storage.saveNutritionGoals(newGoals); showNutritionDashboard(); }, showNutritionDashboard);
}

// --- PALESTRA ---
async function showRoutinesList() {
    appContainer.innerHTML = `<div class="flex justify-center items-center min-h-screen"><p class="animate-pulse">Caricamento...</p></div>`;
    const routines = await storage.getRoutines();
    ui.renderRoutinesList(appContainer, routines, handleOpenRoutine, handleCreateRoutine, handleEditRoutineName, handleDeleteRoutine);
}

async function handleCreateRoutine() {
    const name = window.prompt("Nome scheda:", "Nuova Scheda");
    if (name && name.trim() !== "") { await storage.createRoutine(name.trim()); showRoutinesList(); }
}

async function handleEditRoutineName(routineId, oldName) {
    const newName = window.prompt("Modifica nome:", oldName);
    if (newName && newName.trim() !== "") { await storage.editRoutineName(routineId, newName.trim()); showRoutinesList(); }
}

async function handleDeleteRoutine(routineId) {
    if (window.confirm("Eliminare scheda?")) { await storage.deleteRoutine(routineId); showRoutinesList(); }
}

function handleOpenRoutine(routineId) { currentRoutineId = routineId; currentTab = 'scheda'; showDashboard(); }

async function showDashboard() {
    appContainer.innerHTML = `<div class="flex justify-center items-center min-h-screen"><p class="animate-pulse">Caricamento...</p></div>`;
    const routine = await storage.getRoutine(currentRoutineId);
    if (!routine) return showRoutinesList();
    const history = await storage.getHistoryForRoutine(currentRoutineId);
    ui.renderDashboard(appContainer, routine, history, currentTab, handleTabSwitch, handleStartSession, showRoutineBuilder, handleDeleteExercise, handleShowExerciseStats, showRoutinesList);
}

function handleTabSwitch(tab) { currentTab = tab; showDashboard(); }

async function handleDeleteExercise(exerciseId) {
    if (window.confirm("Eliminare esercizio?")) { await storage.removeExerciseFromRoutine(currentRoutineId, exerciseId); showDashboard(); }
}

function showRoutineBuilder() {
    ui.renderRoutineBuilder(appContainer, async (newExercise) => {
        appContainer.innerHTML = `<p class="text-center mt-20 animate-pulse">Salvataggio...</p>`;
        await storage.addExerciseToRoutine(currentRoutineId, newExercise); showDashboard();
    }, showDashboard);
}

async function handleStartSession() {
    const routine = await storage.getRoutine(currentRoutineId);
    storage.startSession(currentRoutineId, routine.exercises.map(ex => ex.id));
    showActiveSession();
}

async function showActiveSession() {
    const session = storage.getActiveSession();
    const routine = await storage.getRoutine(currentRoutineId);
    ui.renderActiveSession(appContainer, session, routine, handleOpenExercise, handleEndSession);
}

async function handleEndSession() {
    const session = storage.getActiveSession();
    if (session && session.todo.length > 0 && !window.confirm("Terminare in anticipo?")) return;
    appContainer.innerHTML = `<p class="text-center mt-20 animate-pulse">Salvataggio nel Database...</p>`;
    await storage.endActiveSession();
    currentTab = 'storico'; showDashboard();
}

async function handleOpenExercise(exerciseId) {
    const routine = await storage.getRoutine(currentRoutineId);
    currentExercise = routine.exercises.find(ex => ex.id === exerciseId);
    const draft = storage.getDraft(exerciseId);
    const lastSession = await storage.getLastSession(currentRoutineId, exerciseId);

    currentSessionData = Array.from({ length: currentExercise.targetSets }, (_, i) =>
        draft?.[i] ? { ...draft[i] } : lastSession?.sets[i] ? { ...lastSession.sets[i] } : { kg: currentExercise.baseKg || '', reps: currentExercise.targetReps }
    );

    ui.renderActiveExercise(appContainer, currentExercise, lastSession, currentSessionData, handleInput, handleCompleteExercise, showActiveSession);
}

const finalizeSetData = debounce((idx) => { storage.saveDraft(currentExercise.id, currentSessionData); ui.updateFeedback(idx, 'Salvato ✓'); }, 500);

function handleInput(idx, field, value) { currentSessionData[idx][field] = value; ui.updateFeedback(idx, 'Salvataggio...'); finalizeSetData(idx); }

function handleCompleteExercise() { storage.completeExerciseInSession(currentExercise, currentSessionData); storage.clearDraft(); currentExercise = null; currentSessionData = []; showActiveSession(); }

async function handleShowExerciseStats(exerciseId, exerciseName) {
    const history = await storage.getHistoryForRoutine(currentRoutineId);
    const sessionsWithEx = history.filter(session => session.exercises.some(e => e.exerciseId === exerciseId)).sort((a, b) => a.endTime - b.endTime);
    if (sessionsWithEx.length === 0) return alert("Dati insufficienti.");

    const labels = [], maxWeights = [], totalVolumes = [];
    sessionsWithEx.forEach(session => {
        labels.push(new Date(session.endTime).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }));
        const exData = session.exercises.find(e => e.exerciseId === exerciseId);
        let maxKg = 0, vol = 0;
        exData.sets.forEach(set => {
            const kg = parseFloat(set.kg) || 0, reps = parseInt(set.reps) || 0;
            if (kg > maxKg) maxKg = kg; vol += (kg > 0 ? kg * reps : reps);
        });
        maxWeights.push(maxKg); totalVolumes.push(vol);
    });
    ui.renderExerciseStats(appContainer, exerciseName, labels, maxWeights, totalVolumes, showDashboard);
}

document.addEventListener('DOMContentLoaded', init);