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

    // Assicuriamoci che i tasti esistano nel DOM prima di aggiungere i listener
    if (navGym) navGym.addEventListener('click', () => switchModule('gym'));
    if (navNutri) navNutri.addEventListener('click', () => switchModule('nutrition'));
}

function switchModule(module) {
    currentAppModule = module;
    const navGym = document.getElementById('nav-gym');
    const navNutri = document.getElementById('nav-nutri');

    // Aggiorna visivamente i bottoni della Bottom Navigation
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
// MODULO 1: NUTRIZIONE (Full-Stack Backend)
// ==========================================

async function showNutritionDashboard() {
    appContainer.innerHTML = `
        <div class="flex items-center justify-center min-h-screen">
            <p class="text-gray-500 font-bold animate-pulse">Caricamento dati dal server...</p>
        </div>
    `;

    try {
        // Seleziona l'API giusta in base al tab in cui ci troviamo
        const url = currentNutriTab === 'oggi'
            ? 'http://localhost:3000/api/today-meals'
            : 'http://localhost:3000/api/history';

        const response = await fetch(url);
        if (!response.ok) throw new Error("Errore del server");

        const mealsData = await response.json();
        const goals = storage.getNutritionGoals();

        ui.renderNutritionDashboard(
            appContainer,
            mealsData,
            goals,
            currentNutriTab,      // Passiamo il tab attuale
            (tab) => {            // Funzione per cambiare tab
                currentNutriTab = tab;
                showNutritionDashboard();
            },
            handleMicRecord,
            handleDeleteMeal,
            handleEditGoals
        );

    } catch (error) {
        console.error("Errore fetch pasti:", error);
        appContainer.innerHTML = `<div class="p-10 text-center mt-20">Errore di connessione.</div>`;
    }
}

async function handleMicRecord() {
    const micBtn = document.getElementById('mic-btn');
    const originalBtnHtml = `<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg> REGISTRA PASTO`;

    // 1. SE STIAMO GIA' REGISTRANDO: il click serve a FERMARE il microfono
    if (isRecording && currentRecognition) {
        currentRecognition.stop(); // Questo farà scattare l'evento 'onend' in automatico
        return;
    }

    // 2. SE NON STIAMO REGISTRANDO: Prepariamo l'ascolto
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Il riconoscimento vocale non è supportato in questo browser.");
        return;
    }

    currentRecognition = new SpeechRecognition();
    currentRecognition.lang = 'it-IT';

    // IL SEGRETO È QUI: Modalità continua attivata! Non si ferma mai alle pause.
    currentRecognition.continuous = true;
    currentRecognition.interimResults = false;

    finalTranscript = "";
    isRecording = true;

    // Cambiamo la grafica per far capire che deve ri-cliccare per fermare
    micBtn.innerHTML = "⏹️ Ascoltando... Clicca per terminare";
    micBtn.classList.add("animate-pulse", "bg-red-600");
    micBtn.classList.remove("bg-blue-600");

    currentRecognition.start();

    // 3. Accumuliamo il testo man mano che parli (anche con le pause)
    currentRecognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + " ";
            }
        }
    };

    // 4. QUANDO FERMI MANUALMENTE IL MICROFONO: Invia tutto all'IA
    currentRecognition.onend = async () => {
        isRecording = false;

        // Se hai cliccato senza dire niente, ripristina il bottone
        if (!finalTranscript.trim()) {
            micBtn.innerHTML = originalBtnHtml;
            micBtn.classList.remove("animate-pulse", "bg-red-600", "bg-orange-500");
            micBtn.classList.add("bg-blue-600");
            return;
        }

        console.log("Audio Trascritto Completo:", finalTranscript);

        // Feedback visivo: Invio al server
        micBtn.innerHTML = "⏳ Analisi e Salvataggio...";
        micBtn.classList.remove("animate-pulse", "bg-red-600");
        micBtn.classList.add("bg-orange-500");

        try {
            const url = `http://localhost:3000/api/analyze-meal`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: finalTranscript })
            });

            if (!response.ok) throw new Error("Errore di comunicazione col Server Node.js");

            const data = await response.json();

            if (data.success) {
                showNutritionDashboard(); // Ricarica la grafica
            } else {
                throw new Error(data.error);
            }

        } catch (error) {
            alert("Errore durante il salvataggio: " + error.message);
            micBtn.innerHTML = originalBtnHtml;
            micBtn.classList.remove("bg-orange-500");
            micBtn.classList.add("bg-blue-600");
        }
    };

    // Gestione di eventuali errori del microfono
    currentRecognition.onerror = (event) => {
        if (event.error !== 'aborted') { // Ignoriamo l'errore "aborted" che scatta quando lo fermiamo noi
            alert("Errore microfono: " + event.error);
        }
        isRecording = false;
        micBtn.innerHTML = originalBtnHtml;
        micBtn.classList.remove("animate-pulse", "bg-red-600", "bg-orange-500");
        micBtn.classList.add("bg-blue-600");
    };
}

async function handleDeleteMeal(mealId) {
    if (!window.confirm("Vuoi eliminare questo pasto?")) return;

    try {
        const url = `http://localhost:3000/api/meals/${mealId}`;
        const response = await fetch(url, { method: "DELETE" });

        if (response.ok) {
            showNutritionDashboard(); // Ricarica la pagina e aggiorna i grafici
        } else {
            alert("Errore durante l'eliminazione");
        }
    } catch (error) {
        alert("Impossibile connettersi al server per eliminare il pasto");
    }
}

function handleEditGoals() {
    const currentGoals = storage.getNutritionGoals();

    // Mostriamo dei semplici prompt in sequenza (in futuro si può fare una modale più bella)
    const cal = window.prompt("Obiettivo Calorie giornaliere:", currentGoals.calorie);
    if (!cal) return; // Se l'utente annulla, fermiamo tutto

    const pro = window.prompt("Obiettivo Proteine (g):", currentGoals.proteine);
    const cho = window.prompt("Obiettivo Carboidrati (g):", currentGoals.carbo);
    const fat = window.prompt("Obiettivo Grassi (g):", currentGoals.grassi);

    // Se ha inserito tutto, salviamo
    if (cal && pro && cho && fat) {
        storage.saveNutritionGoals({
            calorie: parseInt(cal, 10),
            proteine: parseInt(pro, 10),
            carbo: parseInt(cho, 10),
            grassi: parseInt(fat, 10)
        });
        showNutritionDashboard(); // Ricarica la grafica coi nuovi obiettivi
    }
}


// ==========================================
// MODULO 2: PALESTRA (Logica Esistente Intatta)
// ==========================================

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

// Avvia l'app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', init);