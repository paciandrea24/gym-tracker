// public/js/views/GymView.js

import * as gymService from '../services/gymService.js';
import * as modal from '../components/modal.js';
import * as userService from '../services/userService.js';
import * as ui from '../ui.js?v=20';
import { debounce } from '../utils.js?v=20';

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

        try {
            // Aggiorna l'icona della fiamma in background
            const data = await userService.triggerStreak();
            const icon = document.getElementById('streak-icon');
            const countEl = document.getElementById('streak-count');
            const container = document.getElementById('streak-container');

            if (icon && countEl) {
                countEl.textContent = data.currentStreak;
                if (data.activeToday) {
                    icon.classList.remove('text-gray-400', 'grayscale');
                    countEl.classList.remove('text-gray-400');
                    countEl.classList.add('text-orange-500');
                    container.classList.remove('bg-gray-50', 'border-gray-100');
                    container.classList.add('border-orange-200', 'bg-orange-50');
                }
            }
        } catch (e) { }

        this.currentTab = 'storico';
        this.showDashboard();
    }

    async handleOpenExercise(exerciseId) {
        const routine = await gymService.getRoutine(this.currentRoutineId);
        this.currentExercise = routine.exercises.find(ex => String(ex.id) === String(exerciseId));

        if (!this.currentExercise) return;

        const draft = gymService.getDraft(exerciseId);
        this.currentLastSession = await gymService.getLastSession(this.currentRoutineId, exerciseId);

        this.currentSessionData = [];
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
            this.startRecoveryTimer(90);
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

        const mult = await modal.showModal({ type: 'prompt', title: `Configura ${ex.name}`, message: `Inserisci il moltiplicatore:\n(1 = Manubri / Peso Totale)\n(2 = Se logghi solo 1 lato)`, inputValue: ex.weightMultiplier || 1 });
        if (mult === null || mult === false) return;

        const bar = await modal.showModal({ type: 'prompt', title: `Tara Attrezzo`, message: `Peso del bilanciere o tara (es. 20):`, inputValue: ex.barbellWeight || 0 });
        if (bar === null || bar === false) return;

        ex.weightMultiplier = parseFloat(mult) || 1;
        ex.barbellWeight = parseFloat(bar) || 0;

        await gymService.saveRoutine(routine);
        await modal.showModal({ type: 'success', title: 'Salvato!', message: `Da ora in poi i grafici calcoleranno:\n(Kg x ${ex.weightMultiplier}) + ${ex.barbellWeight}kg.` });
    }

    startRecoveryTimer(seconds) {
        if (this.recoveryInterval) clearInterval(this.recoveryInterval);
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
                <button id="close-timer-btn" class="z-10 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold py-5 px-14 rounded-[24px] text-xl transition-all border border-white/10 shadow-lg">
                    Salta Recupero
                </button>
            `;
            document.body.appendChild(timerEl);
            document.body.style.overflow = 'hidden';

            document.getElementById('close-timer-btn').addEventListener('click', () => this.stopRecoveryTimer());
        }

        this.updateTimerDisplay();
        requestAnimationFrame(() => timerEl.classList.remove('opacity-0'));

        this.recoveryInterval = setInterval(() => {
            this.recoveryRemaining--;
            this.updateTimerDisplay();
            if (this.recoveryRemaining <= 0) this.stopRecoveryTimer();
        }, 1000);
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