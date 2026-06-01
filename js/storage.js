// --- MIGRAZIONE DATI E FIX SCHERMATA BIANCA ---
function runMigration() {
    try {
        // 1. Migrazione della vecchia singola scheda nel nuovo formato multi-scheda
        const legacyRoutine = localStorage.getItem('gymRoutine');
        const defaultRoutineId = 'routine-' + Date.now();

        if (legacyRoutine) {
            const routines = [{
                id: defaultRoutineId,
                name: 'La mia Scheda',
                exercises: JSON.parse(legacyRoutine)
            }];
            localStorage.setItem('gymRoutines', JSON.stringify(routines));
            localStorage.removeItem('gymRoutine'); // Pulizia vecchio formato
        }

        // 2. Controllo e aggiornamento dello Storico
        let history = JSON.parse(localStorage.getItem('gymHistory')) || [];
        if (history.length > 0 && !history[0].exercises) {
            // Se trova un formato troppo vecchio (dai nostri primi test), lo resetta per evitare crash futuri
            history = [];
            localStorage.setItem('gymHistory', JSON.stringify([]));
        } else if (legacyRoutine && history.length > 0) {
            // Collega il vecchio storico valido alla nuova scheda appena creata
            const migratedHistory = history.map(h => ({ ...h, routineId: h.routineId || defaultRoutineId }));
            localStorage.setItem('gymHistory', JSON.stringify(migratedHistory));
        }

        // 3. FIX SCHERMATA BIANCA: Chiude eventuali sessioni "appese" incompatibili
        const activeSession = localStorage.getItem('activeWorkoutSession');
        if (activeSession) {
            const parsedSession = JSON.parse(activeSession);
            // Se l'allenamento aperto non ha l'ID della scheda (versione vecchia), lo elimina
            if (!parsedSession.routineId) {
                localStorage.removeItem('activeWorkoutSession');
                localStorage.removeItem('workoutDraft');
            }
        }
    } catch (error) {
        console.error("Errore durante la migrazione dei dati:", error);
        // Fallback di sicurezza: distrugge sessioni bloccate in caso di errore critico
        localStorage.removeItem('activeWorkoutSession');
    }
}
runMigration();

// --- GESTIONE SCHEDE MULTIPLE (ROUTINES) ---
export function getRoutines() {
    return JSON.parse(localStorage.getItem('gymRoutines')) || [];
}

export function createRoutine(name) {
    const routines = getRoutines();
    routines.push({ id: 'routine-' + Date.now(), name, exercises: [] });
    localStorage.setItem('gymRoutines', JSON.stringify(routines));
}

export function editRoutineName(routineId, newName) {
    const routines = getRoutines();
    const routine = routines.find(r => r.id === routineId);
    if (routine) {
        routine.name = newName;
        localStorage.setItem('gymRoutines', JSON.stringify(routines));
    }
}

export function deleteRoutine(routineId) {
    let routines = getRoutines();
    routines = routines.filter(r => r.id !== routineId);
    localStorage.setItem('gymRoutines', JSON.stringify(routines));
}

export function getRoutine(routineId) {
    const routines = getRoutines();
    return routines.find(r => r.id === routineId) || null;
}

// --- GESTIONE ESERCIZI NELLA SINGOLA SCHEDA ---
export function addExerciseToRoutine(routineId, exercise) {
    const routines = getRoutines();
    const routine = routines.find(r => r.id === routineId);
    if (routine) {
        routine.exercises.push(exercise);
        localStorage.setItem('gymRoutines', JSON.stringify(routines));
    }
}

export function removeExerciseFromRoutine(routineId, exerciseId) {
    const routines = getRoutines();
    const routine = routines.find(r => r.id === routineId);
    if (routine) {
        routine.exercises = routine.exercises.filter(ex => ex.id !== exerciseId);
        localStorage.setItem('gymRoutines', JSON.stringify(routines));
    }
}

// --- GESTIONE SESSIONE ATTIVA (L'ALLENAMENTO IN CORSO) ---
export function getActiveSession() {
    return JSON.parse(localStorage.getItem('activeWorkoutSession')) || null;
}

export function startSession(routineId, exerciseIds) {
    const session = {
        id: Date.now(),
        routineId: routineId,
        todo: exerciseIds,
        completed: []
    };
    localStorage.setItem('activeWorkoutSession', JSON.stringify(session));
    return session;
}

export function completeExerciseInSession(exercise, sessionData) {
    const session = getActiveSession();
    if (!session) return;

    session.todo = session.todo.filter(id => id !== exercise.id);
    session.completed.push({
        exerciseId: exercise.id,
        name: exercise.name,
        type: exercise.type,
        sets: sessionData
    });

    localStorage.setItem('activeWorkoutSession', JSON.stringify(session));
}

export function endActiveSession() {
    const session = getActiveSession();
    if (session && session.completed.length > 0) {
        const history = JSON.parse(localStorage.getItem('gymHistory')) || [];
        history.push({
            sessionId: session.id,
            routineId: session.routineId,
            endTime: Date.now(),
            exercises: session.completed
        });
        localStorage.setItem('gymHistory', JSON.stringify(history));
    }
    localStorage.removeItem('activeWorkoutSession');
    clearDraft();
}

// --- GESTIONE STORICO (HISTORY) ---
export function getHistoryForRoutine(routineId) {
    const history = JSON.parse(localStorage.getItem('gymHistory')) || [];
    return history.filter(h => h.routineId === routineId);
}

export function getLastSession(routineId, exerciseId) {
    const history = getHistoryForRoutine(routineId);
    for (let i = history.length - 1; i >= 0; i--) {
        const exerciseRecord = history[i].exercises.find(e => e.exerciseId === exerciseId);
        if (exerciseRecord) return exerciseRecord;
    }
    return null;
}

// --- GESTIONE BOZZA (DRAFT) ---
export function saveDraft(exerciseId, sessionData) {
    localStorage.setItem('workoutDraft', JSON.stringify({ exerciseId, data: sessionData }));
}

export function getDraft(exerciseId) {
    const draft = localStorage.getItem('workoutDraft');
    if (draft) {
        const parsedDraft = JSON.parse(draft);
        if (parsedDraft.exerciseId === exerciseId) return parsedDraft.data;
    }
    return null;
}

export function clearDraft() {
    localStorage.removeItem('workoutDraft');
}