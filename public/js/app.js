import * as storage from './storage.js';
import * as ui from './ui.js';
import { debounce } from './utils.js';

const appContainer = document.getElementById('app');

// ==========================================
// STATO APPLICATIVO GLOBALE
// ==========================================
let currentAppModule = 'gym'; // Può essere 'gym' o 'nutrition'
let currentRoutineId = null;
let currentTab = 'scheda';
let currentExercise = null;
let currentSessionData = [];
let isRecording = false;
let currentRecognition = null;
let finalTranscript = "";
let currentNutriTab = 'oggi';

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
// MODULO 1: NUTRIZIONE (Intelligenza + Manuale)
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
        const goals = storage.getNutritionGoals();

        ui.renderNutritionDashboard(
            appContainer, mealsData, goals, currentNutriTab,
            (tab) => { currentNutriTab = tab; showNutritionDashboard(); },
            handleMicRecord,
            handleManualMealClick,
            handleDeleteMeal,
            handleEditGoals
        );

    } catch (error) {
        appContainer.innerHTML = `<div class="p-10 text-center mt-20">Errore di connessione.</div>`;
    }
}

function handleManualMealClick() {
    ui.renderManualMealForm(appContainer, async (mealData) => {
        appContainer.innerHTML = `<div class="p-10 text-center mt-20 font-bold">Salvataggio in corso...</div>`;
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
    const cal = window.prompt("Calorie giornaliere:", currentGoals.calorie);
    if (!cal) return;

    const pro = window.prompt("Proteine (g):", currentGoals.proteine);
    const cho = window.prompt("Carboidrati (g):", currentGoals.carbo);
    const fat = window.prompt("Grassi (g):", currentGoals.grassi);

    if (cal && pro && cho && fat) {
        storage.saveNutritionGoals({
            calorie: parseInt(cal, 10),
            proteine: parseInt(pro, 10),
            carbo: parseInt(cho, 10),
            grassi: parseInt(fat, 10)
        });
        showNutritionDashboard();
    }
}

// ==========================================
// MODULO 2: PALESTRA (Grafici e Logica)
// ==========================================

function showRoutinesList() {
    const routines = storage.getRoutines();
    ui.renderRoutinesList(appContainer, routines, handleOpenRoutine, handleCreateRoutine, handleEditRoutineName, handleDeleteRoutine);
}

function handleCreateRoutine() {
    const name = window.prompt("Nome scheda:", "Nuova Scheda");
    if (name && name.trim() !== "") {
        storage.createRoutine(name.trim());
        showRoutinesList();
    }
}

function handleEditRoutineName(routineId, oldName) {
    const newName = window.prompt("Modifica nome:", oldName);
    if (newName && newName.trim() !== "") {
        storage.editRoutineName(routineId, newName.trim());
        showRoutinesList();
    }
}

function handleDeleteRoutine(routineId) {
    if (window.confirm("Eliminare scheda?")) {
        storage.deleteRoutine(routineId);
        showRoutinesList();
    }
}

function handleOpenRoutine(routineId) {
    currentRoutineId = routineId;
    currentTab = 'scheda';
    showDashboard();
}

function showDashboard() {
    const routine = storage.getRoutine(currentRoutineId);
    if (!routine) return showRoutinesList();

    const history = storage.getHistoryForRoutine(currentRoutineId);
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

function handleDeleteExercise(exerciseId) {
    if (window.confirm("Eliminare esercizio?")) {
        storage.removeExerciseFromRoutine(currentRoutineId, exerciseId);
        showDashboard();
    }
}

function showRoutineBuilder() {
    ui.renderRoutineBuilder(appContainer, (newExercise) => {
        storage.addExerciseToRoutine(currentRoutineId, newExercise);
        showDashboard();
    }, showDashboard);
}

function handleStartSession() {
    const routine = storage.getRoutine(currentRoutineId);
    const exerciseIds = routine.exercises.map(ex => ex.id);
    storage.startSession(currentRoutineId, exerciseIds);
    showActiveSession();
}

function showActiveSession() {
    const session = storage.getActiveSession();
    const routine = storage.getRoutine(currentRoutineId);
    ui.renderActiveSession(appContainer, session, routine, handleOpenExercise, handleEndSession);
}

function handleEndSession() {
    const session = storage.getActiveSession();
    if (session && session.todo.length > 0) {
        if (!window.confirm("Terminare in anticipo?")) return;
    }
    storage.endActiveSession();
    currentTab = 'storico';
    showDashboard();
}

function handleOpenExercise(exerciseId) {
    const routine = storage.getRoutine(currentRoutineId);
    currentExercise = routine.exercises.find(ex => ex.id === exerciseId);

    const draft = storage.getDraft(exerciseId);
    const lastSession = storage.getLastSession(currentRoutineId, exerciseId);

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

function handleShowExerciseStats(exerciseId, exerciseName) {
    const history = storage.getHistoryForRoutine(currentRoutineId);

    // Trova le sessioni che contengono l'esercizio
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