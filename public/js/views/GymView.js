// public/js/views/GymView.js

import * as gymService from '../services/gymService.js';
import * as modal from '../components/modal.js';
import * as userService from '../services/userService.js';
import * as ui from '../ui.js?v=20';
import { debounce, exportToCSV } from '../utils.js?v=20';

export class GymView {
    constructor(container) {
        this.container = container;
        this.currentRoutineId = null;
        this.currentTab = 'scheda';
        this.currentExercise = null;
        this.currentSessionData = [];
        this.currentLastSession = null;
        this.recoveryInterval = null;
        this.recoveryRemaining = 0;

        // Gestisce il ritardo nel salvataggio in bozza durante la digitazione
        this.finalizeSetData = debounce((idx) => {
            gymService.saveDraft(this.currentExercise.id, this.currentSessionData);
            ui.updateFeedback(idx, 'Salvato ✓');
        }, 500);

        // Listener globale per la tara dei bilancieri (lo agganciamo una volta sola)
        if (!window._gymConfigListenerAdded) {
            window.addEventListener('configExercise', async (e) => this.handleConfigExercise(e.detail));
            window.addEventListener('editRoutineExercise', async (e) => this.handleEditRoutineExercise(e.detail));
            window.addEventListener('exportGymCSV', () => this.handleExportCSV());
            window._gymConfigListenerAdded = true;
        }
    }

    async render() {
        const activeSession = gymService.getActiveSession();
        if (activeSession) {
            this.currentRoutineId = activeSession.routineId;
            this.showActiveSession();
        } else {
            this.showRoutinesList();
        }
    }

    async showRoutinesList() {
        this.container.innerHTML = `<div class="flex justify-center items-center min-h-screen"><p class="animate-pulse">Caricamento...</p></div>`;
        const routines = await gymService.getRoutines();
        ui.renderRoutinesList(
            this.container, routines,
            (id) => this.handleOpenRoutine(id),
            () => this.handleCreateRoutine(),
            (id, name) => this.handleEditRoutineName(id, name),
            (id) => this.handleDeleteRoutine(id)
        );
    }

    async handleCreateRoutine() {
        const name = await modal.showModal({ type: 'prompt', title: 'Crea Scheda', message: 'Come vuoi chiamare la nuova scheda?', inputValue: 'Nuova Scheda' });
        if (name && name.trim() !== "") {
            await gymService.createRoutine(name.trim());
            this.showRoutinesList();
        }
    }

    async handleEditRoutineExercise(exerciseId) {
        const routine = await gymService.getRoutine(this.currentRoutineId);
        const exToEdit = routine.exercises.find(e => String(e.id) === String(exerciseId));
        if (!exToEdit) return;

        ui.renderRoutineBuilder(this.container, async (updatedExercise) => {
            this.container.innerHTML = `<p class="text-center mt-20 animate-pulse">Salvataggio in corso...</p>`;
            await gymService.updateExerciseInRoutine(this.currentRoutineId, updatedExercise);
            this.showDashboard();
        }, () => this.showDashboard(), exToEdit);
    }

    async handleEditRoutineName(routineId, oldName) {
        const newName = await modal.showModal({ type: 'prompt', title: 'Modifica Nome', message: 'Inserisci il nuovo nome:', inputValue: oldName });
        if (newName && newName.trim() !== "") {
            await gymService.editRoutineName(routineId, newName.trim());
            this.showRoutinesList();
        }
    }

    async handleDeleteRoutine(routineId) {
        const confirm = await modal.showModal({ type: 'confirm', title: 'Attenzione!', message: 'Vuoi davvero eliminare questa scheda e tutti i suoi esercizi?', confirmText: 'Sì', cancelText: 'No' });
        if (confirm) {
            await gymService.deleteRoutine(routineId);
            this.showRoutinesList();
        }
    }

    handleOpenRoutine(routineId) {
        this.currentRoutineId = routineId;
        this.currentTab = 'scheda';
        this.showDashboard();
    }

    async handleExportCSV() {
        if (!this.currentRoutineId) return;

        // Recuperiamo la scheda attuale e il suo storico
        const routine = await gymService.getRoutine(this.currentRoutineId);
        const history = await gymService.getHistoryForRoutine(this.currentRoutineId);

        if (!history || history.length === 0) {
            alert("Nessun dato da esportare per questa scheda.");
            return;
        }

        const rows = [];

        // Estraiamo i dati per formattare righe pulite per Excel/CSV
        history.forEach(session => {
            const dataStr = new Date(session.endTime).toLocaleDateString('it-IT');

            session.exercises.forEach(ex => {
                ex.sets.forEach((set, idx) => {
                    rows.push({
                        Data: dataStr,
                        Scheda: routine.name,
                        Esercizio: ex.name,
                        Tipo: ex.type === 'cardio' ? 'Cardio' : (ex.type === 'corpo-libero' ? 'Corpo Libero' : 'Pesi'),
                        Serie: idx + 1,
                        Kg: set.kg || 0,
                        Reps_o_Minuti: set.reps || 0
                    });
                });
            });
        });

        // Nome file dinamico basato sul nome della scheda
        const nomeFile = `storico_palestra_${routine.name.replace(/\s+/g, '_').toLowerCase()}.csv`;

        exportToCSV(nomeFile, rows);
    }

    async showDashboard() {
        this.container.innerHTML = `<div class="flex justify-center items-center min-h-screen"><p class="animate-pulse">Caricamento...</p></div>`;
        const routine = await gymService.getRoutine(this.currentRoutineId);
        if (!routine) return this.showRoutinesList();

        const history = await gymService.getHistoryForRoutine(this.currentRoutineId);
        ui.renderDashboard(
            this.container, routine, history, this.currentTab,
            (tab) => { this.currentTab = tab; this.showDashboard(); },
            () => this.handleStartSession(),
            () => this.showRoutineBuilder(),
            (id) => this.handleDeleteExercise(id),
            (id, name) => this.handleShowExerciseStats(id, name),
            () => this.showRoutinesList()
        );
    }

    async handleDeleteExercise(exerciseId) {
        const confirm = await modal.showModal({ type: 'confirm', title: 'Elimina Esercizio', message: 'Vuoi eliminare questo esercizio dalla scheda?', confirmText: 'Sì', cancelText: 'No' });
        if (confirm) {
            await gymService.removeExerciseFromRoutine(this.currentRoutineId, exerciseId);
            this.showDashboard();
        }
    }

    showRoutineBuilder() {
        ui.renderRoutineBuilder(this.container, async (newExercise) => {
            this.container.innerHTML = `<p class="text-center mt-20 animate-pulse">Salvataggio...</p>`;
            await gymService.addExerciseToRoutine(this.currentRoutineId, newExercise);
            this.showDashboard();
        }, () => this.showDashboard());
    }

    async handleStartSession() {
        const routine = await gymService.getRoutine(this.currentRoutineId);
        const exerciseIds = routine.exercises.map(ex => ex.id);
        gymService.startSession(this.currentRoutineId, exerciseIds);
        this.showActiveSession();
    }

    async showActiveSession() {
        const session = gymService.getActiveSession();
        const routine = await gymService.getRoutine(this.currentRoutineId);
        ui.renderActiveSession(this.container, session, routine, (id) => this.handleOpenExercise(id), () => this.handleEndSession());
    }

    async handleEndSession() {
        const session = gymService.getActiveSession();
        if (session && session.todo.length > 0) {
            const confirm = await modal.showModal({ type: 'confirm', title: 'Sessione Incompleta', message: 'Hai ancora esercizi in programma. Vuoi terminare in anticipo?', confirmText: 'Sì', cancelText: 'No' });
            if (!confirm) return;
        }
        this.container.innerHTML = `<p class="text-center mt-20 animate-pulse font-bold text-gray-500">Salvataggio nel Database...</p>`;
        await gymService.endActiveSession();

        this.currentTab = 'storico';
        this.showDashboard();
    }

    async handleOpenExercise(exerciseId) {
        const routine = await gymService.getRoutine(this.currentRoutineId);
        this.currentExercise = routine.exercises.find(ex => String(ex.id) === String(exerciseId));

        if (!this.currentExercise) return;

        const session = gymService.getActiveSession();
        const draft = gymService.getDraft(exerciseId);
        this.currentLastSession = await gymService.getLastSession(this.currentRoutineId, exerciseId);

        const completedEx = session.completed.find(e => String(e.exerciseId) === String(exerciseId));

        this.currentSessionData = [];

        if (completedEx) {
            this.currentSessionData = JSON.parse(JSON.stringify(completedEx.sets));
        } else {
            for (let i = 0; i < this.currentExercise.targetSets; i++) {
                if (draft && draft[i]) {
                    this.currentSessionData.push({ ...draft[i], completed: draft[i].completed || false });
                } else if (this.currentLastSession && this.currentLastSession.sets[i]) {
                    this.currentSessionData.push({ ...this.currentLastSession.sets[i], completed: false });
                } else {
                    this.currentSessionData.push({
                        kg: this.currentExercise.baseKg !== 0 ? this.currentExercise.baseKg : '',
                        reps: this.currentExercise.targetReps,
                        completed: false
                    });
                }
            }
        }
        this.renderActiveExerciseUI();
    }

    renderActiveExerciseUI() {
        ui.renderActiveExercise(
            this.container, this.currentExercise, this.currentLastSession, this.currentSessionData,
            (idx, field, value) => this.handleInput(idx, field, value),
            () => this.handleCompleteExercise(),
            () => this.showActiveSession(),
            (idx) => this.handleSaveSet(idx),
            (idx) => this.handleEditSet(idx)
        );
    }

    handleInput(idx, field, value) {
        this.currentSessionData[idx][field] = value;
        ui.updateFeedback(idx, 'Salvataggio...');
        this.finalizeSetData(idx);
    }

    handleSaveSet(idx) {
        this.currentSessionData[idx].completed = true;
        gymService.saveDraft(this.currentExercise.id, this.currentSessionData);

        if (this.currentExercise && this.currentExercise.type !== 'cardio') {
            const restTime = this.currentExercise.restSeconds || 90; // Prende il tempo salvato o 90
            this.startRecoveryTimer(restTime);
        }
        this.renderActiveExerciseUI();
    }

    handleEditSet(idx) {
        this.currentSessionData[idx].completed = false;
        gymService.saveDraft(this.currentExercise.id, this.currentSessionData);
        this.renderActiveExerciseUI();
    }

    handleCompleteExercise() {
        gymService.completeExerciseInSession(this.currentExercise, this.currentSessionData);
        gymService.clearDraft();
        this.currentExercise = null;
        this.currentSessionData = [];
        this.showActiveSession();
    }

    async handleShowExerciseStats(exerciseId, exerciseName) {
        const routine = await gymService.getRoutine(this.currentRoutineId);
        const exerciseDef = routine.exercises.find(ex => String(ex.id) === String(exerciseId)) || {};
        const mult = exerciseDef.weightMultiplier || 1;
        const barWeight = exerciseDef.barbellWeight || 0;

        const history = await gymService.getHistoryForRoutine(this.currentRoutineId);
        const sessionsWithEx = history
            .filter(session => session.exercises.some(e => e.exerciseId === exerciseId))
            .sort((a, b) => a.endTime - b.endTime);

        if (sessionsWithEx.length === 0) {
            await modal.showModal({ type: 'alert', title: 'Grafici', message: 'Dati insufficienti per il grafico.' });
            return;
        }

        const labels = [];
        const maxWeights = [];
        const estimated1RMs = [];
        const bestSets = [];

        sessionsWithEx.forEach(session => {
            const dateStr = new Date(session.endTime).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
            const exData = session.exercises.find(e => e.exerciseId === exerciseId);

            labels.push(dateStr);

            let maxKg = 0;
            let sessionMax1RM = 0;
            let bestSetText = "";

            exData.sets.forEach(set => {
                const rawKg = parseFloat(set.kg) || 0;
                const reps = parseInt(set.reps) || 0;

                let realKg = 0;
                if (rawKg > 0) realKg = (rawKg * mult) + barWeight;

                let e1RM = 0;
                if (realKg > 0 && reps > 0) {
                    e1RM = reps === 1 ? realKg : realKg * (36 / (37 - reps));
                }

                if (e1RM > sessionMax1RM) {
                    sessionMax1RM = e1RM;
                    bestSetText = `Log: ${rawKg}kg ➡️ Reale: ${realKg}kg x ${reps}`;
                }

                if (realKg > maxKg) maxKg = realKg;
            });

            maxWeights.push(parseFloat(maxKg.toFixed(1)));
            estimated1RMs.push(parseFloat(sessionMax1RM.toFixed(1)));
            bestSets.push(bestSetText);
        });

        const allTimeMax1RM = estimated1RMs.length > 0 ? Math.max(...estimated1RMs) : 0;
        const allTimeMaxWeight = maxWeights.length > 0 ? Math.max(...maxWeights) : 0;
        const totalSessions = labels.length;

        ui.renderExerciseStats(
            this.container, exerciseName, labels, estimated1RMs, maxWeights, bestSets,
            { allTimeMax1RM, allTimeMaxWeight, totalSessions },
            () => this.showDashboard()
        );
    }

    async handleConfigExercise(exerciseId) {
        const routine = await gymService.getRoutine(this.currentRoutineId);
        const ex = routine.exercises.find(e => String(e.id) === String(exerciseId));
        if (!ex) return;

        // 1. Chiediamo prima i secondi di recupero
        const rest = await modal.showModal({ type: 'prompt', title: `Configura ${ex.name}`, message: `Inserisci i SECONDI di recupero tra le serie (es. 90 o 120):`, inputValue: String(ex.restSeconds || 90) });
        if (rest === null || rest === false) return;

        // 2. Chiediamo il moltiplicatore
        const mult = await modal.showModal({ type: 'prompt', title: `Configura ${ex.name}`, message: `Inserisci il moltiplicatore:\n(1 = Manubri / Peso Totale)\n(2 = Se logghi solo 1 lato)`, inputValue: String(ex.weightMultiplier || 1) });
        if (mult === null || mult === false) return;

        // 3. Chiediamo il peso del bilanciere
        const bar = await modal.showModal({ type: 'prompt', title: `Tara Attrezzo`, message: `Peso del bilanciere o tara in kg (es. 20):`, inputValue: String(ex.barbellWeight || 0) });
        if (bar === null || bar === false) return;

        // Salvataggio Parametri
        ex.restSeconds = parseInt(rest, 10) || 90;
        ex.weightMultiplier = parseFloat(mult) || 1;
        ex.barbellWeight = parseFloat(bar) || 0;

        await gymService.saveRoutine(routine);
        await modal.showModal({ type: 'success', title: 'Salvato!', message: `Configurazione salvata con successo!\n\n⏱️ Recupero: ${ex.restSeconds}s\n⚖️ Calcolo Grafici: (Kg x ${ex.weightMultiplier}) + ${ex.barbellWeight}kg` });

        // Aggiorniamo la vista
        this.showDashboard();
    }

    startRecoveryTimer(seconds) {
        if (this.recoveryInterval) clearInterval(this.recoveryInterval);

        // FIX BACKGROUND TIMER: Memorizziamo l'orario effettivo in cui DEVE finire il timer
        this.recoveryEndTime = Date.now() + (seconds * 1000);
        this.recoveryRemaining = seconds;

        let timerEl = document.getElementById('recovery-fullscreen-modal');
        if (!timerEl) {
            timerEl = document.createElement('div');
            timerEl.id = 'recovery-fullscreen-modal';
            timerEl.className = "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900/98 backdrop-blur-2xl text-white transition-opacity duration-300 opacity-0";

            timerEl.innerHTML = `
                <div class="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>
                <h2 class="text-sm font-bold text-blue-400 mb-4 uppercase tracking-widest z-10 flex items-center gap-2">
                    <svg class="w-5 h-5 animate-[spin_3s_linear_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Recupero
                </h2>
                <div class="relative z-10 flex items-center justify-center mb-16">
                    <span id="recovery-time-display" class="text-[110px] sm:text-[130px] font-black font-mono tracking-tighter tabular-nums leading-none drop-shadow-2xl"></span>
                </div>
                <button id="close-timer-btn" class="z-10 bg-white text-blue-900 active:scale-95 font-black py-5 px-14 rounded-[24px] text-xl transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] border-none">
                    Salta Recupero
                </button>
            `;
            document.body.appendChild(timerEl);
            document.body.style.overflow = 'hidden';

            document.getElementById('close-timer-btn').addEventListener('click', () => this.stopRecoveryTimer());
        }

        this.updateTimerDisplay();
        requestAnimationFrame(() => timerEl.classList.remove('opacity-0'));

        // Controllo aggiornato ogni mezzo secondo per una super precisione
        this.recoveryInterval = setInterval(() => {
            // Calcolo la differenza esatta tra l'orario di fine e il momento attuale (anche se il telefono era bloccato!)
            this.recoveryRemaining = Math.max(0, Math.ceil((this.recoveryEndTime - Date.now()) / 1000));
            this.updateTimerDisplay();

            if (this.recoveryRemaining <= 0) this.stopRecoveryTimer();
        }, 500);
    }

    updateTimerDisplay() {
        const display = document.getElementById('recovery-time-display');
        if (!display) return;
        const m = Math.floor(this.recoveryRemaining / 60).toString().padStart(2, '0');
        const s = (this.recoveryRemaining % 60).toString().padStart(2, '0');
        display.textContent = `${m}:${s}`;
    }

    stopRecoveryTimer() {
        if (this.recoveryInterval) clearInterval(this.recoveryInterval);
        const timerEl = document.getElementById('recovery-fullscreen-modal');
        if (timerEl) {
            timerEl.classList.add('opacity-0');
            setTimeout(() => {
                timerEl.remove();
                document.body.style.overflow = '';
            }, 300);
        }
    }
}