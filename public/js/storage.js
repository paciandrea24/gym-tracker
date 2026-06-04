import { formatDate } from './utils.js?v=8';

// --- GESTIONE SCHEDE MULTIPLE (MONGODB) ---
export async function getRoutines() {
    try { const res = await fetch('/api/gym/routines'); return await res.json(); } catch (e) { return []; }
}

export async function saveRoutine(routine) {
    await fetch('/api/gym/routines', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(routine)
    });
}

export async function createRoutine(name) {
    const routine = { id: 'routine-' + Date.now(), name, exercises: [] };
    await saveRoutine(routine);
}

export async function editRoutineName(routineId, newName) {
    const routines = await getRoutines();
    const routine = routines.find(r => r.id === routineId);
    if (routine) { routine.name = newName; await saveRoutine(routine); }
}

export async function deleteRoutine(routineId) {
    await fetch(`/api/gym/routines/${routineId}`, { method: 'DELETE' });
}

export async function getRoutine(routineId) {
    const routines = await getRoutines();
    return routines.find(r => r.id === routineId) || null;
}

export async function addExerciseToRoutine(routineId, exercise) {
    const routine = await getRoutine(routineId);
    if (routine) { routine.exercises.push(exercise); await saveRoutine(routine); }
}

export async function removeExerciseFromRoutine(routineId, exerciseId) {
    const routine = await getRoutine(routineId);
    if (routine) {
        routine.exercises = routine.exercises.filter(ex => ex.id !== exerciseId);
        await saveRoutine(routine);
    }
}

// --- SESSIONE ATTIVA & BOZZE (Rimangono in Locale per non perderle se si ricarica la pagina) ---
export function getActiveSession() { return JSON.parse(localStorage.getItem('activeWorkoutSession')) || null; }

export function startSession(routineId, exerciseIds) {
    const session = { id: Date.now(), routineId, todo: exerciseIds, completed: [] };
    localStorage.setItem('activeWorkoutSession', JSON.stringify(session));
    return session;
}

export function completeExerciseInSession(exercise, sessionData) {
    const session = getActiveSession();
    if (!session) return;
    session.todo = session.todo.filter(id => id !== exercise.id);
    session.completed.push({ exerciseId: exercise.id, name: exercise.name, type: exercise.type, sets: sessionData });
    localStorage.setItem('activeWorkoutSession', JSON.stringify(session));
}

export async function endActiveSession() {
    const session = getActiveSession();
    if (session && session.completed.length > 0) {
        const historyRecord = { sessionId: session.id, routineId: session.routineId, endTime: Date.now(), exercises: session.completed };
        await fetch('/api/gym/history', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(historyRecord)
        });
    }
    localStorage.removeItem('activeWorkoutSession');
    clearDraft();
}

export async function getHistoryForRoutine(routineId) {
    try { const res = await fetch('/api/gym/history'); const history = await res.json(); return history.filter(h => h.routineId === routineId); }
    catch (e) { return []; }
}

export async function getLastSession(routineId, exerciseId) {
    const history = await getHistoryForRoutine(routineId);
    for (let i = history.length - 1; i >= 0; i--) {
        const exerciseRecord = history[i].exercises.find(e => e.exerciseId === exerciseId);
        if (exerciseRecord) return exerciseRecord;
    }
    return null;
}

export function saveDraft(exerciseId, sessionData) { localStorage.setItem('workoutDraft', JSON.stringify({ exerciseId, data: sessionData })); }
export function getDraft(exerciseId) {
    const draft = localStorage.getItem('workoutDraft');
    if (draft) { const parsedDraft = JSON.parse(draft); if (parsedDraft.exerciseId === exerciseId) return parsedDraft.data; }
    return null;
}
export function clearDraft() { localStorage.removeItem('workoutDraft'); }

export function getNutritionGoals() {
    return JSON.parse(localStorage.getItem('nutriGoals')) || { calorie: 2000, proteine: 150, carbo: 200, grassi: 60 };
}
export function saveNutritionGoals(goals) { localStorage.setItem('nutriGoals', JSON.stringify(goals)); }