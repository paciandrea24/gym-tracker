// public/js/views/GymView.js

import * as gymService from '../services/gymService.js?v=33';
import * as modal from '../components/modal.js?v=33';
import * as userService from '../services/userService.js?v=33';
import * as gymUi from './gymUi.js?v=33';
import { elementiDaFare, nuovoDrop, pulisciSerie, serieIniziali, salvaGiro, modificaGiro, recuperoBlocco, progressiEsercizio, righeCsv } from '../services/gymLogic.js?v=33';
import { exportToCSV } from '../utils.js?v=33';

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
        const [routines, storico] = await Promise.all([gymService.getRoutines(), gymService.getAllHistory()]);
        const ultimi = {};
        for (const h of Array.isArray(storico) ? storico : []) {
            if (!ultimi[h.routineId] || h.endTime > ultimi[h.routineId]) ultimi[h.routineId] = h.endTime;
        }
        gymUi.renderSchede(this.container, routines, ultimi, {
            onApri: (id) => this.handleOpenRoutine(id),
            onNuova: () => this.handleCreateRoutine()
        });
    }

    async handleCreateRoutine() {
        const name = await modal.showModal({ type: 'prompt', title: 'Nuova scheda', message: 'Come la chiami?', inputValue: 'Nuova scheda' });
        if (name && name.trim() !== "") {
            await gymService.createRoutine(name.trim());
            this.showRoutinesList();
        }
    }

    async handleEditRoutineName(routineId, oldName) {
        const newName = await modal.showModal({ type: 'prompt', title: 'Rinomina', message: 'Nuovo nome della scheda:', inputValue: oldName });
        if (newName && newName.trim() !== "") {
            await gymService.editRoutineName(routineId, newName.trim());
            this.showDashboard();
        }
    }

    async handleDeleteRoutine(routineId) {
        const confirm = await modal.showModal({ type: 'confirm', title: 'Elimina scheda', message: 'Eliminare questa scheda e i suoi esercizi?', confirmText: 'Elimina', cancelText: 'Annulla', pericolo: true });
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
            await modal.showModal({ type: 'alert', title: 'Niente da scaricare', message: 'Questa scheda non ha ancora allenamenti salvati.' });
            return;
        }

        // Una riga per serie, con la colonna dei drop; il file prende il nome della scheda
        const nomeFile = `storico_palestra_${routine.name.replace(/\s+/g, '_').toLowerCase()}.csv`;
        exportToCSV(nomeFile, righeCsv(history, routine));
    }

    async showDashboard() {
        this.container.innerHTML = `<div class="flex justify-center items-center min-h-screen"><p class="animate-pulse">Caricamento...</p></div>`;
        const routine = await gymService.getRoutine(this.currentRoutineId);
        if (!routine) return this.showRoutinesList();

        const history = await gymService.getHistoryForRoutine(this.currentRoutineId);
        gymUi.renderScheda(this.container, routine, history, this.currentTab, {
            onTab: (tab) => { this.currentTab = tab; this.showDashboard(); },
            onInizia: () => this.handleStartSession(),
            onAggiungi: () => this.showModulo(null),
            onEsercizio: (id) => {
                const ex = routine.exercises.find(e => String(e.id) === String(id));
                if (!ex) return;
                gymUi.apriFoglioEsercizio(ex, {
                    onProgressi: () => this.handleShowExerciseStats(ex.id),
                    onModifica: () => this.showModulo(ex)
                });
            },
            onMenu: () => gymUi.apriMenuScheda(routine, {
                onRinomina: () => this.handleEditRoutineName(routine.id, routine.name),
                onElimina: () => this.handleDeleteRoutine(routine.id)
            }),
            onIndietro: () => this.showRoutinesList(),
            onScarica: () => this.handleExportCSV()
        });
    }

    // Modulo unico per creare o modificare un esercizio (anche peso per lato, bilanciere e recupero)
    showModulo(esercizio) {
        gymUi.renderModuloEsercizio(this.container, esercizio, {
            onSalva: async (dati) => {
                this.container.innerHTML = `<p class="text-center mt-20 animate-pulse">Salvataggio...</p>`;
                if (esercizio) await gymService.updateExerciseInRoutine(this.currentRoutineId, dati);
                else await gymService.addExerciseToRoutine(this.currentRoutineId, dati);
                this.showDashboard();
            },
            onAnnulla: () => this.showDashboard(),
            onElimina: async () => {
                await gymService.removeExerciseFromRoutine(this.currentRoutineId, esercizio.id);
                this.showDashboard();
            }
        });
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
        if (!session || !routine) return this.showRoutinesList();
        gymUi.renderAllenamento(this.container, session, routine, elementiDaFare(session), {
            onApri: (el) => el.tipo === 'superserie' ? this.handleOpenSuperserie(el.ids) : this.handleOpenExercise(el.id),
            onApriFatto: (id) => this.handleOpenExercise(id),
            onUnisci: (idTrascinato, idBersaglio) => { gymService.unisciSuperserie(idTrascinato, idBersaglio); this.showActiveSession(); },
            onSepara: (id) => { gymService.separaSuperserie(id); this.showActiveSession(); },
            onTermina: () => this.handleEndSession()
        });
    }

    // Superserie a giri: ogni esercizio tiene le sue serie; la bozza ha la chiave "superserie:idA+idB"
    async handleOpenSuperserie(ids) {
        const routine = await gymService.getRoutine(this.currentRoutineId);
        const esercizi = ids.map(id => routine.exercises.find(ex => String(ex.id) === String(id))).filter(Boolean);
        if (esercizi.length === 0) return;
        const chiave = 'superserie:' + esercizi.map(e => e.id).join('+');
        const bozza = gymService.getDraft(chiave) || {};
        const ultimeVolte = {};
        const setsPerId = {};
        for (const ex of esercizi) {
            ultimeVolte[ex.id] = await gymService.getLastSession(this.currentRoutineId, ex.id);
            setsPerId[ex.id] = serieIniziali(ex, ultimeVolte[ex.id], bozza[ex.id]);
        }
        this.superserie = { chiave, esercizi, setsPerId, ultimeVolte };
        this.renderSuperserieUI();
    }

    renderSuperserieUI() {
        const ss = this.superserie;
        const salva = () => gymService.saveDraft(ss.chiave, ss.setsPerId);
        const ridisegna = () => { salva(); this.renderSuperserieUI(); };
        gymUi.renderSuperserie(this.container, ss.esercizi, ss.setsPerId, ss.ultimeVolte, {
            onCambia: (id, idx, campo, valore, dropIdx) => {
                const set = ss.setsPerId[id][idx];
                (dropIdx === null ? set : set.drop[dropIdx])[campo] = valore;
                salva();
            },
            onAggiungiDrop: (id, idx) => {
                const set = ss.setsPerId[id][idx];
                set.drop = [...(set.drop || []), nuovoDrop(set)];
                ridisegna();
            },
            onTogliDrop: (id, idx, dropIdx) => { ss.setsPerId[id][idx].drop.splice(dropIdx, 1); ridisegna(); },
            onSalvaGiro: (giro) => {
                ss.setsPerId = salvaGiro(ss.setsPerId, giro);
                ridisegna();
                const recupero = recuperoBlocco(ss.esercizi);
                if (recupero) this.startRecoveryTimer(recupero);
            },
            onModificaGiro: (giro) => { ss.setsPerId = modificaGiro(ss.setsPerId, giro); ridisegna(); },
            onTermina: () => {
                const pulite = Object.fromEntries(ss.esercizi.map(e => [e.id, ss.setsPerId[e.id].map(pulisciSerie)]));
                gymService.completeSuperserieInSession(ss.esercizi.map(e => e.id), pulite, ss.esercizi);
                gymService.clearDraft();
                this.superserie = null;
                this.showActiveSession();
            },
            onIndietro: () => this.showActiveSession()
        });
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
        this.currentSessionData = completedEx
            ? JSON.parse(JSON.stringify(completedEx.sets))
            : serieIniziali(this.currentExercise, this.currentLastSession, draft);
        this.renderActiveExerciseUI();
    }

    renderActiveExerciseUI() {
        gymUi.renderEsercizio(this.container, this.currentExercise, this.currentLastSession, this.currentSessionData, {
            onCambia: (idx, campo, valore, dropIdx) => this.handleInput(idx, campo, valore, dropIdx),
            onAggiungiDrop: (idx) => {
                const set = this.currentSessionData[idx];
                set.drop = [...(set.drop || []), nuovoDrop(set)];
                this.salvaBozzaEsercizio();
                this.renderActiveExerciseUI();
            },
            onTogliDrop: (idx, dropIdx) => {
                this.currentSessionData[idx].drop.splice(dropIdx, 1);
                this.salvaBozzaEsercizio();
                this.renderActiveExerciseUI();
            },
            onSalvaSerie: (idx) => this.handleSaveSet(idx),
            onModificaSerie: (idx) => this.handleEditSet(idx),
            onTermina: () => this.handleCompleteExercise(),
            onIndietro: () => this.showActiveSession()
        });
    }

    salvaBozzaEsercizio() {
        gymService.saveDraft(this.currentExercise.id, this.currentSessionData);
    }

    // Scrive nel dato senza ridisegnare (il campo resta col focus); la bozza si salva subito
    handleInput(idx, campo, valore, dropIdx = null) {
        const set = this.currentSessionData[idx];
        const dove = dropIdx === null ? set : set.drop[dropIdx];
        dove[campo] = valore;
        this.salvaBozzaEsercizio();
    }

    handleSaveSet(idx) {
        this.currentSessionData[idx] = { ...pulisciSerie(this.currentSessionData[idx]), completed: true };
        this.salvaBozzaEsercizio();

        if (this.currentExercise && this.currentExercise.type !== 'cardio') {
            const restTime = this.currentExercise.restSeconds || 90; // Prende il tempo salvato o 90
            this.startRecoveryTimer(restTime);
        }
        this.renderActiveExerciseUI();
    }

    handleEditSet(idx) {
        this.currentSessionData[idx].completed = false;
        this.salvaBozzaEsercizio();
        this.renderActiveExerciseUI();
    }

    handleCompleteExercise() {
        gymService.completeExerciseInSession(this.currentExercise, this.currentSessionData.map(pulisciSerie));
        gymService.clearDraft();
        this.currentExercise = null;
        this.currentSessionData = [];
        this.showActiveSession();
    }

    async handleShowExerciseStats(exerciseId) {
        const routine = await gymService.getRoutine(this.currentRoutineId);
        const esercizio = routine?.exercises.find(ex => String(ex.id) === String(exerciseId));
        if (!esercizio) return;
        const progressi = progressiEsercizio(await gymService.getHistoryForRoutine(this.currentRoutineId), esercizio);
        if (progressi.allenamenti === 0) {
            await modal.showModal({ type: 'alert', title: 'Progressi', message: 'Ancora nessun allenamento salvato con questo esercizio.' });
            return;
        }
        gymUi.renderProgressi(this.container, esercizio, progressi, { onIndietro: () => this.showDashboard() });
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