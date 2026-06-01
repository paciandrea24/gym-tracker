import * as storage from './storage.js';
import * as ui from './ui.js';
import { debounce } from './utils.js';

const appContainer = document.getElementById('app');

// Stato Applicativo
let currentRoutineId = null;
let currentTab = 'scheda';
let currentExercise = null;
let currentSessionData = [];

function init() {
    const activeSession = storage.getActiveSession();
    if (activeSession) {
        currentRoutineId = activeSession.routineId;
        showActiveSession();
    } else {
        showRoutinesList();
    }
}

// --- VISTA 1: LISTA DELLE SCHEDE ---
function showRoutinesList() {
    const routines = storage.getRoutines();
    ui.renderRoutinesList(
        appContainer,
        routines,
        handleOpenRoutine,
        handleCreateRoutine,
        handleEditRoutineName,
        handleDeleteRoutine
    );
}

function handleCreateRoutine() {
    const name = window.prompt("Scegli un nome per la tua nuova scheda:", "Nuova Scheda");
    if (name && name.trim() !== "") {
        storage.createRoutine(name.trim());
        showRoutinesList();
    }
}

function handleEditRoutineName(routineId, oldName) {
    const newName = window.prompt("Modifica il nome della scheda:", oldName);
    if (newName && newName.trim() !== "") {
        storage.editRoutineName(routineId, newName.trim());
        showRoutinesList();
    }
}

function handleDeleteRoutine(routineId) {
    if (window.confirm("Sei sicuro di voler eliminare interamente questa scheda e i suoi esercizi? (Lo storico rimarrà accessibile)")) {
        storage.deleteRoutine(routineId);
        showRoutinesList();
    }
}

// --- VISTA 2: DASHBOARD DELLA SINGOLA SCHEDA ---
function handleOpenRoutine(routineId) {
    currentRoutineId = routineId;
    currentTab = 'scheda';
    showDashboard();
}

function showDashboard() {
    const routine = storage.getRoutine(currentRoutineId);
    if (!routine) return showRoutinesList(); // Fallback se cancellata

    const history = storage.getHistoryForRoutine(currentRoutineId);
    ui.renderDashboard(
        appContainer,
        routine,
        history,
        currentTab,
        handleTabSwitch,
        handleStartSession,
        showRoutineBuilder,
        handleDeleteExercise,
        showRoutinesList // Bottone "Back"
    );
}

function handleTabSwitch(tab) {
    currentTab = tab;
    showDashboard();
}

function handleDeleteExercise(exerciseId) {
    if (window.confirm("Sei sicuro di voler eliminare questo esercizio?")) {
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

// --- VISTA 3: SESSIONE ATTIVA (L'ALLENAMENTO) ---
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
        if (!window.confirm("Vuoi davvero terminare l'allenamento? Gli esercizi rimanenti non saranno salvati nello storico.")) return;
    }

    storage.endActiveSession();
    currentTab = 'storico';
    showDashboard();
}

// --- VISTA 4: ESECUZIONE SINGOLO ESERCIZIO ---
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
        appContainer,
        currentExercise,
        lastSession,
        currentSessionData,
        handleInput,
        handleCompleteExercise,
        showActiveSession
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

// Avvia l'app
document.addEventListener('DOMContentLoaded', init);