import { formatDate } from './utils.js';

// --- RENDER LISTA SCHEDE (HOME) ---
export function renderRoutinesList(container, routines, onOpenRoutine, onCreateRoutine, onEditRoutineName, onDeleteRoutine) {
    container.innerHTML = `
        <header class="bg-white shadow-sm p-5 sticky top-0 z-10 flex justify-between items-center">
            <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Le Mie Schede</h1>
            <button id="create-routine-btn" class="bg-gray-900 text-white p-2 rounded-full shadow-md active:scale-95 transition-transform">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            </button>
        </header>
        <main class="p-4 space-y-4 pb-24 safe-pb bg-gray-50">
            ${routines.length === 0 ? `
                <div class="text-center py-10">
                    <p class="text-gray-500 font-medium">Nessuna scheda presente.</p>
                    <p class="text-sm text-gray-400 mt-2">Usa il tasto + in alto per creare la tua prima scheda.</p>
                </div>
            ` : routines.map(routine => `
                <div class="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    
                    <div data-id="${routine.id}" class="routine-card flex-1 cursor-pointer active:opacity-60 transition-opacity">
                        <h3 class="text-lg font-bold text-gray-800">${routine.name}</h3>
                        <p class="text-sm font-medium text-gray-500 mt-1">${routine.exercises.length} esercizi configurati</p>
                    </div>
                    
                    <div class="flex items-center space-x-2 pl-3 border-l border-gray-100 flex-shrink-0">
                        <button data-edit-id="${routine.id}" data-name="${routine.name}" class="edit-btn p-2 text-gray-600 hover:text-gray-900 bg-gray-100 rounded-full active:scale-95 transition-transform">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button data-delete-id="${routine.id}" class="delete-routine-btn p-2 text-red-500 hover:text-red-700 bg-red-50 rounded-full active:scale-95 transition-transform">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>

                </div>
            `).join('')}
        </main>
    `;

    document.getElementById('create-routine-btn').addEventListener('click', onCreateRoutine);
    container.querySelectorAll('.routine-card').forEach(card => card.addEventListener('click', () => onOpenRoutine(card.dataset.id)));
    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onEditRoutineName(btn.dataset.editId, btn.dataset.name);
        });
    });
    container.querySelectorAll('.delete-routine-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onDeleteRoutine(btn.dataset.deleteId);
        });
    });
}

// --- RENDER DASHBOARD (SINGOLA SCHEDA E STORICO) ---
export function renderDashboard(container, routine, history, currentTab, onTabSwitch, onStartSession, onAddExerciseClick, onDeleteClick, onBack) {
    const exercises = routine.exercises;
    const hasExercises = exercises.length > 0;
    let contentHtml = '';

    if (currentTab === 'scheda') {
        contentHtml = `
            ${hasExercises ? `
                <div class="mb-6">
                    <button id="start-session-btn" class="w-full bg-gray-900 text-white font-black text-xl py-5 rounded-2xl shadow-xl active:scale-95 transition-transform flex justify-center items-center gap-2">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        INIZIA ALLENAMENTO
                    </button>
                </div>
                <div class="flex justify-between items-end mb-3">
                    <h2 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Esercizi in Programma</h2>
                    <button id="add-ex-btn" class="text-gray-900 text-sm font-bold flex items-center gap-1 active:opacity-50">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        Aggiungi
                    </button>
                </div>
                <div class="space-y-3">
                    ${exercises.map(ex => `
                        <div class="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div class="flex-1">
                                <h3 class="text-lg font-bold text-gray-800">${ex.name}</h3>
                                <p class="text-sm font-medium text-gray-500 mt-1">
                                    ${ex.type === 'cardio' ? 'Sessione Unica' : ex.targetSets + ' serie'} <span class="mx-1">•</span> ${ex.type === 'cardio' ? 'Cardio' : (ex.type === 'corpo-libero' ? 'Corpo Libero' : 'Base: ' + ex.baseKg + ' kg')}
                                </p>
                            </div>
                            <div class="flex items-center space-x-2 pl-3 border-l border-gray-100 flex-shrink-0">
                                <button data-delete-id="${ex.id}" class="delete-btn p-2 text-red-500 hover:text-red-700 bg-red-50 rounded-full active:scale-95 transition-transform">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="text-center py-10">
                    <p class="text-gray-500 font-medium">Questa scheda è vuota.</p>
                    <button id="add-ex-btn" class="mt-4 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform">Aggiungi Esercizio</button>
                </div>
            `}
        `;
    } else {
        const reversedHistory = [...history].reverse();
        contentHtml = `
            ${reversedHistory.length === 0 ? `
                <div class="text-center py-10"><p class="text-gray-500 font-medium">Nessuno storico per questa scheda.</p></div>
            ` : `
                <div class="space-y-4">
                    ${reversedHistory.map(session => `
                        <details class="bg-white rounded-2xl shadow-sm border border-gray-100 group">
                            <summary class="p-4 font-bold text-gray-800 flex justify-between items-center cursor-pointer outline-none list-none [&::-webkit-details-marker]:hidden">
                                <div class="flex items-center gap-3">
                                    <div class="bg-gray-100 text-gray-900 p-2 rounded-lg">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    </div>
                                    <div>
                                        <h3 class="text-base text-gray-900">Allenamento</h3>
                                        <p class="text-xs text-gray-500 font-medium">${formatDate(session.endTime)}</p>
                                    </div>
                                </div>
                                <div class="text-gray-400 transition-transform group-open:rotate-180">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </summary>
                            <div class="p-4 border-t border-gray-50 space-y-4 bg-gray-50/50 rounded-b-2xl">
                                ${session.exercises.map(ex => `
                                    <div>
                                        <h4 class="text-sm font-bold text-gray-700 mb-2">${ex.name}</h4>
                                        <div class="space-y-1">
                                            ${ex.sets.map((s, i) => `
                                                <div class="flex justify-between text-sm text-gray-600 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                                                    <span>Serie ${i + 1}</span>
                                                    <span class="font-bold text-gray-900">
                                                        ${ex.type === 'cardio' ? s.reps + ' min' : (ex.type === 'corpo-libero' ? s.reps + ' rep' : (s.kg || 0) + ' kg x ' + s.reps + ' rep')}
                                                    </span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </details>
                    `).join('')}
                </div>
            `}
        `;
    }

    container.innerHTML = `
        <header class="bg-white shadow-sm p-4 sticky top-0 z-10">
            <div class="flex items-center mb-4">
                <button id="back-list-btn" class="mr-2 text-gray-500 hover:text-gray-900 p-2 -ml-2">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <h1 class="text-2xl font-bold text-gray-900 tracking-tight truncate">${routine.name}</h1>
            </div>
            <div class="flex bg-gray-100 p-1 rounded-xl">
                <button id="tab-scheda" class="flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${currentTab === 'scheda' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}">Scheda</button>
                <button id="tab-storico" class="flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${currentTab === 'storico' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}">Storico</button>
            </div>
        </header>
        <main class="p-4 space-y-5 pb-24 safe-pb bg-gray-50">
            ${contentHtml}
        </main>
    `;

    document.getElementById('back-list-btn').addEventListener('click', onBack);
    document.getElementById('tab-scheda').addEventListener('click', () => onTabSwitch('scheda'));
    document.getElementById('tab-storico').addEventListener('click', () => onTabSwitch('storico'));

    if (currentTab === 'scheda' && hasExercises) {
        document.getElementById('start-session-btn').addEventListener('click', onStartSession);
        document.getElementById('add-ex-btn').addEventListener('click', onAddExerciseClick);
        container.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => onDeleteClick(btn.dataset.deleteId)));
    } else if (currentTab === 'scheda' && !hasExercises) {
        document.getElementById('add-ex-btn').addEventListener('click', onAddExerciseClick);
    }
}

// --- RENDER VISTA SESSIONE ATTIVA ---
export function renderActiveSession(container, session, routine, onExerciseClick, onEndSession) {
    const todoIds = session.todo;
    container.innerHTML = `
        <header class="bg-white shadow-sm p-5 sticky top-0 z-10 flex justify-between items-center">
            <div>
                <h1 class="text-xl font-bold text-gray-900 tracking-tight">In Allenamento</h1>
                <p class="text-xs text-gray-500 mt-1">${todoIds.length} esercizi rimanenti</p>
            </div>
            <div class="flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </div>
        </header>
        <main class="p-4 space-y-4 pb-28 safe-pb bg-gray-50">
            ${todoIds.length === 0 ? `
                <div class="text-center py-10">
                    <div class="text-6xl mb-4">🏆</div>
                    <h2 class="text-2xl font-black text-gray-900">Allenamento Finito!</h2>
                    <p class="text-gray-500 mt-2">Salva per registrare nello storico.</p>
                </div>
            ` : todoIds.map(id => {
        const ex = routine.exercises.find(r => r.id === id);
        if (!ex) return '';
        return `
                    <button data-id="${ex.id}" class="session-ex-btn w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center active:scale-95 transition-transform text-left">
                        <div>
                            <h3 class="text-lg font-bold text-gray-800">${ex.name}</h3>
                            <p class="text-sm font-medium text-gray-500 mt-1">Tocca per eseguire</p>
                        </div>
                        <div class="bg-gray-100 p-3 rounded-full text-gray-900">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </div>
                    </button>
                `;
    }).join('')}
        </main>
        
        <div class="fixed bottom-0 left-0 right-0 p-4 bg-gray-50/90 backdrop-blur-md border-t border-gray-200 max-w-md mx-auto safe-pb z-20">
            <button id="end-session-btn" class="w-full ${todoIds.length === 0 ? 'bg-gray-900 text-white' : 'bg-white text-red-500 border border-red-200'} font-bold text-lg py-4 rounded-2xl shadow-sm active:scale-95 transition-transform">
                ${todoIds.length === 0 ? 'Salva e Torna alla Scheda' : 'Termina in anticipo'}
            </button>
        </div>
    `;

    container.querySelectorAll('.session-ex-btn').forEach(btn => btn.addEventListener('click', () => onExerciseClick(btn.dataset.id)));
    document.getElementById('end-session-btn').addEventListener('click', onEndSession);
}

// --- RENDER FORM CREAZIONE ESERCIZIO ---
export function renderRoutineBuilder(container, onSave, onCancel) {
    container.innerHTML = `
        <header class="bg-white shadow-sm p-4 sticky top-0 z-10 flex items-center">
            <button id="cancel-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 class="text-xl font-bold text-gray-900 truncate">Nuovo Esercizio</h1>
        </header>
        <main class="p-4 space-y-4 bg-gray-50">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Nome Esercizio</label>
                    <input type="text" id="ex-name" placeholder="Es. Panca Piana" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold focus:ring-2 focus:ring-gray-900 outline-none transition-all">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Tipo Esercizio</label>
                    <select id="ex-type" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold focus:ring-2 focus:ring-gray-900 outline-none transition-all">
                        <option value="sala-pesi">Sala pesi (Kg + Reps)</option>
                        <option value="corpo-libero">Corpo Libero (Solo Reps)</option>
                        <option value="cardio">Cardio (Minuti)</option>
                    </select>
                </div>
                <div class="flex space-x-4">
                    <div class="flex-1" id="box-sets">
                        <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Serie</label>
                        <input type="number" id="ex-sets" value="3" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold text-center focus:ring-2 focus:ring-gray-900 outline-none transition-all">
                    </div>
                    <div class="flex-1">
                        <label class="block text-xs font-semibold text-gray-400 uppercase mb-2" id="label-reps">Reps Target</label>
                        <input type="number" id="ex-reps" value="10" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold text-center focus:ring-2 focus:ring-gray-900 outline-none transition-all">
                    </div>
                    <div class="flex-1" id="box-kg">
                        <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Kg Base</label>
                        <input type="number" id="ex-kg" placeholder="0" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold text-center focus:ring-2 focus:ring-gray-900 outline-none transition-all">
                    </div>
                </div>
            </div>
            <button id="save-ex-btn" class="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg active:scale-95 transition-transform mt-6">
                Salva Esercizio
            </button>
        </main>
    `;

    const typeSelect = document.getElementById('ex-type');
    const boxSets = document.getElementById('box-sets');
    const boxKg = document.getElementById('box-kg');
    const labelReps = document.getElementById('label-reps');

    typeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'cardio') {
            boxKg.style.display = 'none';
            boxSets.style.display = 'none';
            labelReps.textContent = 'Minuti Target';
        } else if (e.target.value === 'corpo-libero') {
            boxKg.style.display = 'none';
            boxSets.style.display = 'block';
            labelReps.textContent = 'Reps Target';
        } else {
            boxKg.style.display = 'block';
            boxSets.style.display = 'block';
            labelReps.textContent = 'Reps Target';
        }
    });

    document.getElementById('cancel-btn').addEventListener('click', onCancel);
    document.getElementById('save-ex-btn').addEventListener('click', () => {
        const name = document.getElementById('ex-name').value.trim();
        const type = document.getElementById('ex-type').value;
        const sets = type === 'cardio' ? 1 : parseInt(document.getElementById('ex-sets').value, 10);
        const reps = parseInt(document.getElementById('ex-reps').value, 10);
        const kg = parseFloat(document.getElementById('ex-kg').value) || 0;

        if (name && sets && reps) onSave({ id: 'ex-' + Date.now(), name, type, targetSets: sets, targetReps: reps, baseKg: kg });
        else alert("Compila i campi richiesti.");
    });
}

// --- HELPER INPUT CONTROLLI +/- ---
function generateAdjustableInput(idx, field, value, step, label) {
    return `
        <div class="flex-1">
            <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">${label}</label>
            <div class="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 transition-shadow">
                <button class="adjust-btn p-3 text-gray-500 hover:bg-gray-100 active:bg-gray-200" data-action="minus" data-idx="${idx}" data-field="${field}" data-step="${step}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4"></path></svg>
                </button>
                <input type="number" inputmode="decimal" data-idx="${idx}" data-field="${field}" value="${value}" placeholder="0" class="set-input w-full text-center text-xl font-bold bg-transparent outline-none appearance-none m-0 p-0">
                <button class="adjust-btn p-3 text-gray-500 hover:bg-gray-100 active:bg-gray-200" data-action="plus" data-idx="${idx}" data-field="${field}" data-step="${step}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
                </button>
            </div>
        </div>
    `;
}

// --- RENDER ESERCIZIO ATTIVO ---
export function renderActiveExercise(container, exercise, lastSession, currentSessionData, onInput, onComplete, onBack) {
    let lastSessionHtml = '';

    if (lastSession) {
        lastSessionHtml = `
            <div class="bg-gray-100/60 p-4 rounded-2xl mb-6 border border-gray-200">
                <p class="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-3">Tuo Ultimo Record</p>
                <div class="space-y-2">
                    ${lastSession.sets.map((set, idx) => {
            if (exercise.type === 'cardio') return `<div class="flex justify-between items-center text-sm text-gray-700 bg-white p-2 rounded-lg shadow-sm border border-gray-50"><span>Durata</span><span class="font-semibold">${set.reps} min</span></div>`;
            if (exercise.type === 'corpo-libero') return `<div class="flex justify-between items-center text-sm text-gray-700 bg-white p-2 rounded-lg shadow-sm border border-gray-50"><span>Serie ${idx + 1}</span><span class="font-semibold">${set.reps} rep</span></div>`;
            return `<div class="flex justify-between items-center text-sm text-gray-700 bg-white p-2 rounded-lg shadow-sm border border-gray-50"><span>Serie ${idx + 1}</span><span class="font-semibold">${set.kg || 0} kg <span class="text-gray-400 mx-1 text-xs">x</span> ${set.reps} rep</span></div>`;
        }).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <header class="bg-white shadow-sm p-4 sticky top-0 z-10 flex items-center">
            <button id="back-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 class="text-xl font-bold text-gray-900 truncate">${exercise.name}</h1>
        </header>
        <main class="p-4 pb-28 safe-pb bg-gray-50">
            ${lastSessionHtml}
            <div class="space-y-4">
                ${currentSessionData.map((set, idx) => {
        let inputHtml = '';
        if (exercise.type === 'cardio') {
            inputHtml = generateAdjustableInput(idx, 'reps', set.reps, 1, 'Minuti');
        } else if (exercise.type === 'corpo-libero') {
            inputHtml = generateAdjustableInput(idx, 'reps', set.reps, 1, 'Ripetizioni');
        } else {
            inputHtml = `
                            <div class="flex space-x-4">
                                ${generateAdjustableInput(idx, 'kg', set.kg, 1.25, 'Kg')}
                                ${generateAdjustableInput(idx, 'reps', set.reps, 1, 'Reps')}
                            </div>
                        `;
        }
        return `
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="font-bold text-gray-800">${exercise.type === 'cardio' ? 'Obiettivo' : 'Serie ' + (idx + 1)}</h4>
                            <span id="status-${idx}" class="text-xs text-gray-400 font-medium transition-colors">Pronto</span>
                        </div>
                        ${inputHtml}
                    </div>
                    `;
    }).join('')}
            </div>
        </main>
        
        <div class="fixed bottom-0 left-0 right-0 p-4 bg-gray-50/90 backdrop-blur-md border-t border-gray-200 max-w-md mx-auto safe-pb z-20">
            <button id="complete-btn" class="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg active:scale-95 transition-transform flex justify-center items-center gap-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                Segna come Fatto
            </button>
        </div>
    `;

    document.getElementById('back-btn').addEventListener('click', onBack);
    document.getElementById('complete-btn').addEventListener('click', onComplete);

    container.querySelectorAll('.set-input').forEach(input => {
        input.addEventListener('input', (e) => {
            onInput(parseInt(e.target.dataset.idx, 10), e.target.dataset.field, e.target.value);
        });
    });

    container.querySelectorAll('.adjust-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.idx, 10);
            const field = btn.dataset.field;
            const step = parseFloat(btn.dataset.step);
            const action = btn.dataset.action;

            const inputElement = container.querySelector(`input[data-idx="${idx}"][data-field="${field}"]`);
            let currentValue = parseFloat(inputElement.value) || 0;

            if (action === 'plus') currentValue += step;
            else if (action === 'minus') currentValue = Math.max(0, currentValue - step);

            currentValue = parseFloat(currentValue.toFixed(2));
            inputElement.value = currentValue;
            onInput(idx, field, currentValue);
        });
    });
}

export function updateFeedback(setId, status) {
    const statusEl = document.getElementById(`status-${setId}`);
    if (!statusEl) return;
    statusEl.textContent = status;
    if (status === 'Salvato ✓') statusEl.className = 'text-xs text-green-600 font-bold transition-colors';
    else if (status === 'Salvataggio...') statusEl.className = 'text-xs text-orange-500 font-bold transition-colors';
    else statusEl.className = 'text-xs text-gray-400 font-medium transition-colors';
}


// Aggiungi questo in ui.js

export function renderNutritionDashboard(container, mealsData, goals, currentTab, onTabSwitch, onMicClick, onDeleteMeal, onEditGoals) {
    let contentHtml = '';

    if (currentTab === 'oggi') {
        // --- VISTA OGGI ---
        let consumate = { calorie: 0, proteine: 0, carbo: 0, grassi: 0 };
        mealsData.forEach(meal => {
            consumate.calorie += meal.calorie;
            consumate.proteine += meal.proteine;
            consumate.carbo += meal.carboidrati;
            consumate.grassi += meal.grassi;
        });

        // FIX BUG: Arrotonda i totali di oggi a 1 cifra decimale
        consumate.calorie = parseFloat(consumate.calorie.toFixed(1));
        consumate.proteine = parseFloat(consumate.proteine.toFixed(1));
        consumate.carbo = parseFloat(consumate.carbo.toFixed(1));
        consumate.grassi = parseFloat(consumate.grassi.toFixed(1));

        // Calcolo e arrotondamento delle calorie rimaste
        let calorieRimaste = parseFloat((goals.calorie - consumate.calorie).toFixed(1));

        contentHtml = `
            <div class="bg-gray-900 text-white p-5 rounded-2xl shadow-xl mb-6">
                <p class="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">Calorie Rimaste</p>
                <h2 class="text-4xl font-black">${calorieRimaste} <span class="text-lg font-normal text-gray-400">/ ${goals.calorie}</span></h2>
                
                <div class="flex justify-between mt-6 gap-2">
                    <div class="flex-1 bg-white/10 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-gray-400 uppercase font-bold">Pro</p>
                        <p class="font-bold text-lg">${consumate.proteine}<span class="text-xs font-normal text-gray-400">/${goals.proteine}g</span></p>
                    </div>
                    <div class="flex-1 bg-white/10 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-gray-400 uppercase font-bold">Carbo</p>
                        <p class="font-bold text-lg">${consumate.carbo}<span class="text-xs font-normal text-gray-400">/${goals.carbo}g</span></p>
                    </div>
                    <div class="flex-1 bg-white/10 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-gray-400 uppercase font-bold">Grassi</p>
                        <p class="font-bold text-lg">${consumate.grassi}<span class="text-xs font-normal text-gray-400">/${goals.grassi}g</span></p>
                    </div>
                </div>
            </div>

            <button id="mic-btn" class="w-full bg-gray-900 text-white font-black text-xl py-5 rounded-2xl shadow-xl active:scale-95 transition-transform flex justify-center items-center gap-2 mb-6">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                REGISTRA PASTO
            </button>

            <div class="flex justify-between items-end mb-3">
                <h2 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Pasti di oggi</h2>
            </div>
            
            <div class="space-y-3">
                ${mealsData.length === 0 ? `
                    <div class="text-center py-10">
                        <p class="text-gray-500 font-medium">Non hai ancora registrato nulla oggi.</p>
                    </div>
                ` : mealsData.map(meal => `
                    <div class="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div class="flex-1 pr-3">
                            <h3 class="text-lg font-bold text-gray-800">${meal.alimenti}</h3>
                            <p class="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
                                <span class="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md uppercase tracking-wider">${meal.pasto}</span>
                                <span class="font-bold text-gray-900">${parseFloat(meal.calorie.toFixed(1))} kcal</span>
                            </p>
                        </div>
                        <div class="flex items-center space-x-2 pl-3 border-l border-gray-100 flex-shrink-0">
                            <button data-delete-id="${meal._id}" class="delete-meal-btn p-2 text-red-500 hover:text-red-700 bg-red-50 rounded-full active:scale-95 transition-transform">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        // --- VISTA STORICO ---
        const grouped = {};
        mealsData.forEach(meal => {
            const dateStr = new Date(meal.data).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
            if (!grouped[dateStr]) grouped[dateStr] = { meals: [], totals: { cal: 0, pro: 0, car: 0, grassi: 0 } };

            grouped[dateStr].meals.push(meal);
            grouped[dateStr].totals.cal += meal.calorie;
            grouped[dateStr].totals.pro += meal.proteine;
            grouped[dateStr].totals.car += meal.carboidrati;
            grouped[dateStr].totals.grassi += meal.grassi;
        });

        // FIX BUG: Arrotonda i totali di ogni giorno nello storico
        Object.values(grouped).forEach(day => {
            day.totals.cal = parseFloat(day.totals.cal.toFixed(1));
            day.totals.pro = parseFloat(day.totals.pro.toFixed(1));
            day.totals.car = parseFloat(day.totals.car.toFixed(1));
            day.totals.grassi = parseFloat(day.totals.grassi.toFixed(1));
        });

        contentHtml = `
            ${Object.keys(grouped).length === 0 ? `
                <div class="text-center py-10"><p class="text-gray-500 font-medium">Nessun pasto registrato nello storico.</p></div>
            ` : `
                <div class="space-y-4">
                    ${Object.keys(grouped).map(dateStr => {
            const day = grouped[dateStr];
            return `
                            <details class="bg-white rounded-2xl shadow-sm border border-gray-100 group">
                                <summary class="p-4 font-bold text-gray-800 flex justify-between items-center cursor-pointer outline-none list-none [&::-webkit-details-marker]:hidden">
                                    <div class="flex items-center gap-3">
                                        <div class="bg-gray-100 text-gray-900 p-2 rounded-lg">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        </div>
                                        <div>
                                            <h3 class="text-base text-gray-900 capitalize">${dateStr}</h3>
                                            <p class="text-xs text-gray-500 font-medium mt-1">
                                                ${day.totals.cal} kcal • ${day.totals.pro}g P • ${day.totals.car}g C • ${day.totals.grassi}g G
                                            </p>
                                        </div>
                                    </div>
                                    <div class="text-gray-400 transition-transform group-open:rotate-180">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </summary>
                                <div class="p-4 border-t border-gray-50 space-y-4 bg-gray-50/50 rounded-b-2xl">
                                    ${day.meals.map(meal => `
                                        <div>
                                            <h4 class="text-sm font-bold text-gray-700 mb-2">${meal.alimenti}</h4>
                                            <div class="space-y-1">
                                                <div class="flex justify-between items-center text-sm text-gray-600 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                                                    <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">${meal.pasto}</span>
                                                    <span class="font-bold text-gray-900">${parseFloat(meal.calorie.toFixed(1))} kcal</span>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </details>
                        `;
        }).join('')}
                </div>
            `}
        `;
    }

    container.innerHTML = `
        <header class="bg-white shadow-sm p-4 sticky top-0 z-10">
            <div class="flex justify-between items-center mb-4">
                <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Nutrizione</h1>
                <button id="edit-goals-btn" class="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 rounded-full active:scale-95 transition-transform">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </button>
            </div>
            
            <div class="flex bg-gray-100 p-1 rounded-xl">
                <button id="tab-oggi" class="flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${currentTab === 'oggi' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}">Oggi</button>
                <button id="tab-storico" class="flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${currentTab === 'storico' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}">Storico</button>
            </div>
        </header>
        
        <main class="p-4 space-y-4 pb-24 safe-pb bg-gray-50">
            ${contentHtml}
        </main>
    `;

    document.getElementById('edit-goals-btn').addEventListener('click', onEditGoals);
    document.getElementById('tab-oggi').addEventListener('click', () => onTabSwitch('oggi'));
    document.getElementById('tab-storico').addEventListener('click', () => onTabSwitch('storico'));

    if (currentTab === 'oggi') {
        document.getElementById('mic-btn').addEventListener('click', onMicClick);
        container.querySelectorAll('.delete-meal-btn').forEach(btn => {
            btn.addEventListener('click', () => onDeleteMeal(btn.dataset.deleteId));
        });
    }
}