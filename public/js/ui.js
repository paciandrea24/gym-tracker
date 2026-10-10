import { formatDate, getWeekLabel } from './utils.js?v=27';
import { etichettaPorzione, pastoPerOra } from './services/mealPrepService.js?v=27';
import { cercaProdottoOFF } from './services/pantryService.js?v=27';
import { campoCodiceHtml, collegaCampoCodice } from './components/barcodeField.js?v=27';
import * as modal from './components/modal.js?v=27';
import { icona } from './components/icons.js?v=27';
import { intero, macroColonne, macroTesto, chiaveGiorno, lunediDi, nomeGiorno, nomeSettimana, ripartizioneCalorie } from './components/format.js?v=27';
import { apriFoglio } from './components/sheet.js?v=27';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BTN_PRINCIPALE = 'w-full bg-gray-900 text-white font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform';

// --- RENDER LISTA SCHEDE (HOME) ---
export function renderRoutinesList(container, routines, onOpenRoutine, onCreateRoutine, onEditRoutineName, onDeleteRoutine) {
    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-5 sticky top-0 z-10 flex justify-between items-center">
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
export function renderDashboard(container, routine, history, currentTab, onTabSwitch, onStartSession, onAddExerciseClick, onDeleteClick, onHistoryExClick, onBack) {
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
                            
                            <div data-ex-id="${ex.id}" data-ex-name="${ex.name}" class="scheda-ex-click flex-1 cursor-pointer active:opacity-60 transition-opacity pr-2">
        <h3 class="text-lg font-bold text-gray-800 hover:text-indigo-600 transition-colors">${ex.name}</h3>
        <p class="text-sm font-medium text-gray-500 mt-1 flex items-center flex-wrap gap-y-1">
            <span>${ex.type === 'cardio' ? 'Sessione Unica' : ex.targetSets + ' serie'}</span>
            <span class="mx-1.5 text-gray-300">•</span>
            <span>${ex.type === 'cardio' ? 'Cardio' : (ex.type === 'corpo-libero' ? 'Corpo Libero' : 'Base: ' + ex.baseKg + ' kg')}</span>
            ${ex.type !== 'cardio' ? `
            <span class="mx-1.5 text-gray-300">•</span>
            <span class="text-indigo-500 font-bold flex items-center gap-0.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ${ex.restSeconds || 90}s
            </span>` : ''}
        </p>
    </div>
                            
                            <div class="flex items-center space-x-2 pl-3 border-l border-gray-100 flex-shrink-0">
    <button data-edit-ex-id="${ex.id}" class="edit-ex-btn p-2 text-yellow-500 hover:text-yellow-700 bg-yellow-50 rounded-full active:scale-95 transition-transform">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
    </button>
    <button data-config-id="${ex.id}" class="config-ex-btn p-2 text-blue-500 hover:text-blue-700 bg-blue-50 rounded-full active:scale-95 transition-transform">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                </button>
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
        const weeklyGroups = {};

        reversedHistory.forEach(session => {
            const week = getWeekLabel(session.endTime);
            if (!weeklyGroups[week]) weeklyGroups[week] = { sessions: [], volumeKg: 0 };

            weeklyGroups[week].sessions.push(session);

            // Calcolo volume
            session.exercises.forEach(ex => {
                if (ex.type === 'sala-pesi') {
                    ex.sets.forEach(set => weeklyGroups[week].volumeKg += (parseFloat(set.kg) || 0) * (parseInt(set.reps) || 0));
                }
            });
        });

        contentHtml = `
            <div class="mb-4 flex justify-end">
                <button onclick="window.dispatchEvent(new CustomEvent('exportGymCSV'))" class="text-xs font-bold bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-transform">
                    📥 Esporta CSV
                </button>
            </div>
            ${Object.keys(weeklyGroups).length === 0 ? `
                <div class="text-center py-10"><p class="text-gray-500 font-medium">Nessuno storico per questa scheda.</p></div>
            ` : `
                <div class="space-y-6">
                    ${Object.keys(weeklyGroups).map(week => {
            const data = weeklyGroups[week];
            const avgVolume = data.sessions.length > 0 ? (data.volumeKg / data.sessions.length).toFixed(0) : 0;
            return `
                        <div class="bg-gray-100/50 p-4 rounded-3xl border border-gray-200 shadow-sm">
                            <h3 class="text-sm font-black text-gray-800 mb-1">${week}</h3>
                            <div class="flex gap-4 mb-4 text-[11px] font-bold text-gray-500 uppercase">
                                <span>Allenamenti: <span class="text-indigo-600">${data.sessions.length}</span></span>
                                <span>Media Volume: <span class="text-gray-800">${avgVolume} kg</span>/sess.</span>
                            </div>
                            <div class="space-y-3">
                                ${data.sessions.map(session => `
                                    <details class="bg-white rounded-2xl shadow-sm border border-gray-100 group">
                                        <summary class="p-4 font-bold text-gray-800 flex justify-between items-center cursor-pointer outline-none list-none [&::-webkit-details-marker]:hidden">
                                            <div class="flex items-center gap-3">
                                                <div class="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
                                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                                </div>
                                                <div>
                                                    <h3 class="text-sm text-gray-900">${new Date(session.endTime).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
                                                </div>
                                            </div>
                                            <div class="text-gray-400 transition-transform group-open:rotate-180">
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </summary>
                                        <div class="p-4 border-t border-gray-50 space-y-4 bg-gray-50/50 rounded-b-2xl">
                                            ${session.exercises.map(ex => `
                                                <div class="p-2 -mx-2 rounded-xl">
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
                        </div>
                        `;
        }).join('')}
                </div>
            `}
        `;
    }

    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10">
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

        // AGGANCIAMO IL CLICK DELLE STATISTICHE ALLA SCHEDA ATTIVA
        container.querySelectorAll('.scheda-ex-click').forEach(row => {
            row.addEventListener('click', () => onHistoryExClick(row.dataset.exId, row.dataset.exName));
        });

        // Configurazione bilanciere/moltiplicatore
        container.querySelectorAll('.config-ex-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('configExercise', { detail: btn.dataset.configId })); }));
        container.querySelectorAll('.edit-ex-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('editRoutineExercise', { detail: btn.dataset.editExId })); }));
    } else if (currentTab === 'scheda' && !hasExercises) {
        document.getElementById('add-ex-btn').addEventListener('click', onAddExerciseClick);
    }
}

export function renderActiveSession(container, session, routine, onExerciseClick, onEndSession) {
    const todoIds = session.todo || [];
    const completedExs = session.completed || [];

    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-5 sticky top-0 z-10 flex justify-between items-center">
            <div>
                <h1 class="text-xl font-bold text-gray-900 tracking-tight">In Allenamento</h1>
                <p class="text-xs text-gray-500 mt-1">${todoIds.length} esercizi rimanenti</p>
            </div>
            <div class="flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </div>
        </header>
        <main class="p-4 space-y-4 pb-32 safe-pb bg-gray-50">
            ${todoIds.length === 0 ? `
                <div class="text-center py-10">
                    <div class="text-6xl mb-4">🏆</div>
                    <h2 class="text-2xl font-black text-gray-900">Allenamento Finito!</h2>
                    <p class="text-gray-500 mt-2">Salva per registrare nello storico.</p>
                </div>
            ` : `
                <h2 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Da Fare</h2>
                ${todoIds.map(id => {
        const ex = routine.exercises.find(r => String(r.id) === String(id));
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
            `}
            
            ${completedExs.length > 0 ? `
                <div class="mt-8">
                    <h2 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">Completati (Tocca per modificare)</h2>
                    <div class="space-y-3">
                    ${completedExs.map(ex => `
                        <button data-id="${ex.exerciseId}" class="session-ex-btn w-full bg-green-50 p-4 rounded-2xl shadow-sm border border-green-200 flex justify-between items-center active:scale-95 transition-transform text-left opacity-90">
                            <div>
                                <h3 class="text-base font-bold text-green-900">${ex.name}</h3>
                                <p class="text-[11px] font-bold text-green-700 mt-0.5">✓ Serie salvate: ${ex.sets.length}</p>
                            </div>
                            <div class="bg-green-100 p-2 rounded-full text-green-700">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </div>
                        </button>
                    `).join('')}
                    </div>
                </div>
            ` : ''}
        </main>
        
        <div class="fixed left-0 right-0 p-4 bg-gray-50/90 backdrop-blur-md border-t border-gray-200 max-w-md mx-auto z-20" style="bottom: calc(55px + env(safe-area-inset-bottom));">
            <button id="end-session-btn" class="w-full ${todoIds.length === 0 ? 'bg-gray-900 text-white' : 'bg-white text-red-500 border border-red-200'} font-bold text-lg py-4 rounded-2xl shadow-sm active:scale-95 transition-transform">
                ${todoIds.length === 0 ? 'Salva nel Database' : 'Termina in anticipo'}
            </button>
        </div>
    `;

    container.querySelectorAll('.session-ex-btn').forEach(btn => btn.addEventListener('click', () => onExerciseClick(btn.dataset.id)));
    document.getElementById('end-session-btn').addEventListener('click', onEndSession);
}

export function renderRoutineBuilder(container, onSave, onCancel, existingEx = null) {
    const isEdit = !!existingEx;

    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="cancel-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 class="text-xl font-bold text-gray-900 truncate">${isEdit ? 'Modifica Esercizio' : 'Nuovo Esercizio'}</h1>
        </header>
        <main class="p-4 space-y-4 bg-gray-50 pb-24 safe-pb">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Nome Esercizio</label>
                    <input type="text" id="ex-name" placeholder="Es. Panca Piana" value="${isEdit ? existingEx.name : ''}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold focus:ring-2 focus:ring-gray-900 outline-none transition-all">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Tipo Esercizio</label>
                    <select id="ex-type" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold focus:ring-2 focus:ring-gray-900 outline-none transition-all">
                        <option value="sala-pesi" ${isEdit && existingEx.type === 'sala-pesi' ? 'selected' : ''}>Sala pesi (Kg + Reps)</option>
                        <option value="corpo-libero" ${isEdit && existingEx.type === 'corpo-libero' ? 'selected' : ''}>Corpo Libero (Solo Reps)</option>
                        <option value="cardio" ${isEdit && existingEx.type === 'cardio' ? 'selected' : ''}>Cardio (Minuti)</option>
                    </select>
                </div>
                <div class="flex space-x-4">
                    <div class="flex-1" id="box-sets" style="${isEdit && existingEx.type === 'cardio' ? 'display: none;' : ''}">
                        <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Serie</label>
                        <input type="number" id="ex-sets" value="${isEdit ? existingEx.targetSets : '3'}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold text-center focus:ring-2 focus:ring-gray-900 outline-none transition-all">
                    </div>
                    <div class="flex-1">
                        <label class="block text-xs font-semibold text-gray-400 uppercase mb-2" id="label-reps">${isEdit && existingEx.type === 'cardio' ? 'Minuti Target' : 'Reps Target'}</label>
                        <input type="number" id="ex-reps" value="${isEdit ? existingEx.targetReps : '10'}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold text-center focus:ring-2 focus:ring-gray-900 outline-none transition-all">
                    </div>
                    <div class="flex-1" id="box-kg" style="${isEdit && (existingEx.type === 'cardio' || existingEx.type === 'corpo-libero') ? 'display: none;' : ''}">
                        <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Kg Base</label>
                        <input type="number" id="ex-kg" placeholder="0" value="${isEdit ? existingEx.baseKg : ''}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold text-center focus:ring-2 focus:ring-gray-900 outline-none transition-all">
                    </div>
                </div>

                <div id="box-rest" class="mt-4 pt-4 border-t border-gray-100" style="${isEdit && existingEx.type === 'cardio' ? 'display: none;' : ''}">
                    <label class="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Recupero (Secondi)</label>
                    <input type="number" id="ex-rest" value="${isEdit ? (existingEx.restSeconds || 90) : '90'}" step="15" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold text-center focus:ring-2 focus:ring-gray-900 outline-none transition-all">
                </div>
                
                <div id="box-equipment" class="space-y-3 pt-4 border-t border-gray-100" style="${isEdit && existingEx.type === 'sala-pesi' ? 'block' : 'none'}">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Setup Statistiche e Grafici</p>
                    <div class="flex space-x-3">
                        <div class="flex-1">
                            <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Moltiplicatore</label>
                            <select id="ex-multiplier" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold outline-none">
                                <option value="1" ${isEdit && existingEx.weightMultiplier === 1 ? 'selected' : ''}>x1 (Manubri / Totale)</option>
                                <option value="2" ${isEdit && existingEx.weightMultiplier === 2 ? 'selected' : ''}>x2 (Loggo un solo lato)</option>
                            </select>
                        </div>
                        <div class="flex-1">
                            <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Bilanciere (Kg)</label>
                            <input type="number" id="ex-barbell" placeholder="0" value="${isEdit ? (existingEx.barbellWeight || 0) : '0'}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-center text-sm font-bold outline-none">
                        </div>
                    </div>
                </div>
            </div>
            <button id="save-ex-btn" class="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg active:scale-95 transition-transform mt-6">
                ${isEdit ? 'Salva Modifiche' : 'Salva Esercizio'}
            </button>
        </main>
    `;

    const typeSelect = document.getElementById('ex-type');
    const boxSets = document.getElementById('box-sets');
    const boxKg = document.getElementById('box-kg');
    const labelReps = document.getElementById('label-reps');
    const boxEquipment = document.getElementById('box-equipment');
    const boxRest = document.getElementById('box-rest');

    typeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        boxKg.style.display = val === 'cardio' || val === 'corpo-libero' ? 'none' : 'block';
        boxSets.style.display = val === 'cardio' ? 'none' : 'block';
        boxRest.style.display = val === 'cardio' ? 'none' : 'block';
        boxEquipment.style.display = val === 'sala-pesi' ? 'block' : 'none';
        labelReps.textContent = val === 'cardio' ? 'Minuti Target' : 'Reps Target';
    });

    document.getElementById('cancel-btn').addEventListener('click', onCancel);
    document.getElementById('save-ex-btn').addEventListener('click', () => {
        const name = document.getElementById('ex-name').value.trim();
        const type = document.getElementById('ex-type').value;
        const sets = type === 'cardio' ? 1 : parseInt(document.getElementById('ex-sets').value, 10);
        const reps = parseInt(document.getElementById('ex-reps').value, 10);
        const kg = parseFloat(document.getElementById('ex-kg').value) || 0;
        const rest = parseInt(document.getElementById('ex-rest').value, 10) || 90;
        const mult = parseFloat(document.getElementById('ex-multiplier').value) || 1;
        const barbell = parseFloat(document.getElementById('ex-barbell').value) || 0;

        if (name && sets && reps) {
            onSave({
                id: isEdit ? existingEx.id : 'ex-' + Date.now(),
                name, type, targetSets: sets, targetReps: reps, baseKg: kg,
                restSeconds: type === 'cardio' ? 0 : rest,
                weightMultiplier: type === 'sala-pesi' ? mult : 1,
                barbellWeight: type === 'sala-pesi' ? barbell : 0
            });
        } else alert("Compila i campi richiesti.");
    });
}

// --- HELPER INPUT CONTROLLI +/- ---
function generateAdjustableInput(idx, field, value, step, label, isCompleted = false) {
    return `
        <div class="flex-1">
            <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">${label}</label>
            <div class="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden transition-shadow ${isCompleted ? 'opacity-50 pointer-events-none' : 'focus-within:ring-2 focus-within:ring-gray-900'}">
                <button class="adjust-btn p-3 text-gray-500 hover:bg-gray-100 active:bg-gray-200" data-action="minus" data-idx="${idx}" data-field="${field}" data-step="${step}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4"></path></svg>
                </button>
                <input type="number" inputmode="decimal" data-idx="${idx}" data-field="${field}" value="${value}" placeholder="0" class="set-input w-full text-center text-xl font-bold bg-transparent outline-none appearance-none m-0 p-0" ${isCompleted ? 'disabled' : ''}>
                <button class="adjust-btn p-3 text-gray-500 hover:bg-gray-100 active:bg-gray-200" data-action="plus" data-idx="${idx}" data-field="${field}" data-step="${step}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
                </button>
            </div>
        </div>
    `;
}

// --- RENDER ESERCIZIO ATTIVO ---
export function renderActiveExercise(container, exercise, lastSession, currentSessionData, onInput, onComplete, onBack, onSaveSet, onEditSet) {
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
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="back-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 class="text-xl font-bold text-gray-900 truncate">${exercise.name}</h1>
        </header>
        <main class="p-4 pb-32 safe-pb bg-gray-50">
            ${lastSessionHtml}
            <div class="space-y-4">
                ${currentSessionData.map((set, idx) => {
        const isCompleted = set.completed;
        const setStatus = isCompleted ? 'Salvata ✓' : 'Pronto';
        let inputHtml = '';
        if (exercise.type === 'cardio') inputHtml = generateAdjustableInput(idx, 'reps', set.reps, 1, 'Minuti', isCompleted);
        else if (exercise.type === 'corpo-libero') inputHtml = generateAdjustableInput(idx, 'reps', set.reps, 1, 'Ripetizioni', isCompleted);
        else {
            inputHtml = `<div class="flex space-x-4">${generateAdjustableInput(idx, 'kg', set.kg, 1.25, 'Kg', isCompleted)}${generateAdjustableInput(idx, 'reps', set.reps, 1, 'Reps', isCompleted)}</div>`;
        }
        return `
                    <div class="bg-white p-5 rounded-2xl shadow-sm border ${isCompleted ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="font-bold text-gray-800">${exercise.type === 'cardio' ? 'Obiettivo' : 'Serie ' + (idx + 1)}</h4>
                            <span id="status-${idx}" class="text-xs ${isCompleted ? 'text-green-600' : 'text-gray-400'} font-bold transition-colors">${setStatus}</span>
                        </div>
                        ${inputHtml}
                        ${!isCompleted ? `
                            <button class="save-set-btn w-full mt-5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 rounded-xl active:scale-95 transition-transform" data-idx="${idx}">Salva Serie</button>
                        ` : `
                            <button class="edit-set-btn w-full mt-5 bg-white border border-gray-200 text-gray-500 font-bold py-2.5 rounded-xl active:scale-95 transition-transform" data-idx="${idx}">Modifica Serie</button>
                        `}
                    </div>`;
    }).join('')}
            </div>
        </main>
        
        <div class="fixed left-0 right-0 p-4 bg-gray-50/90 backdrop-blur-md border-t border-gray-200 max-w-md mx-auto z-20" style="bottom: calc(55px + env(safe-area-inset-bottom));">
            <button id="complete-btn" class="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg active:scale-95 transition-transform flex justify-center items-center gap-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                Termina Esercizio
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

    container.querySelectorAll('.save-set-btn').forEach(btn => btn.addEventListener('click', (e) => onSaveSet(parseInt(e.currentTarget.dataset.idx, 10))));
    container.querySelectorAll('.edit-set-btn').forEach(btn => btn.addEventListener('click', (e) => onEditSet(parseInt(e.currentTarget.dataset.idx, 10))));
}


export function updateFeedback(setId, status) {
    const statusEl = document.getElementById(`status-${setId}`);
    if (!statusEl) return;
    statusEl.textContent = status;
    if (status === 'Salvato ✓') statusEl.className = 'text-xs text-green-600 font-bold transition-colors';
    else if (status === 'Salvataggio...') statusEl.className = 'text-xs text-orange-500 font-bold transition-colors';
    else statusEl.className = 'text-xs text-gray-400 font-medium transition-colors';
}

// Pulsante principale per dettare (dashboard nutrizione e dettaglio pasto)
function pulsanteVoce(id) {
    return `<button id="${id}" class="${BTN_PRINCIPALE} flex justify-center items-center gap-2">${icona.mic()} Voce</button>`;
}

// Riga di 4 azioni secondarie per aggiungere cibo: bianche, con l'icona colorata
function azioniPastoHtml(ids) {
    const btn = (id, icon, label) => `
        <button id="${id}" class="bg-white border border-gray-200 text-gray-800 font-bold text-[12px] py-2.5 rounded-2xl shadow-sm active:scale-95 transition-transform flex flex-col justify-center items-center gap-1">
            ${icon}${label}
        </button>`;
    return btn(ids.manuale, icona.piu('w-5 h-5 text-gray-700'), 'Manuale')
        + btn(ids.scanner, icona.fotocamera('w-5 h-5 text-blue-600'), 'Scanner')
        + btn(ids.preferiti, icona.stella('w-5 h-5 text-yellow-500'), 'Preferiti')
        + btn(ids.prep, icona.pentola('w-5 h-5 text-orange-600'), 'Prep');
}

// Fotocamera per il codice a barre: si apre al posto della riga di azioni
function riquadroScanner() {
    return `
        <div id="scanner-container" class="hidden bg-gray-900 p-2 rounded-2xl shadow-xl border border-gray-800">
            <p class="text-center text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Inquadra il codice a barre</p>
            <video id="reader-video" class="w-full rounded-xl overflow-hidden mb-3 bg-black min-h-[250px]" autoplay playsinline></video>
            <button id="close-scanner-btn" class="w-full bg-white text-gray-900 font-bold py-3 rounded-xl active:scale-95 transition-transform">Annulla</button>
        </div>`;
}

// Totali di un elenco di pasti, con le chiavi degli obiettivi (carbo)
function totaliPasti(pasti) {
    const t = { calorie: 0, proteine: 0, carbo: 0, grassi: 0 };
    for (const m of pasti) {
        t.calorie += Number(m.calorie) || 0;
        t.proteine += Number(m.proteine) || 0;
        t.carbo += Number(m.carboidrati) || 0;
        t.grassi += Number(m.grassi) || 0;
    }
    return t;
}

const percento = (v, obiettivo) => Math.min(100, obiettivo > 0 ? v / obiettivo * 100 : 0);

// Riquadro scuro: calorie con la barra e una barra per macro rispetto agli obiettivi.
// testoSotto: testo della pastiglia verde quando non si è superato l'obiettivo (es. "Mancano 300 kcal")
function riquadroRiepilogo(t, goals, { titolo, testoSotto }) {
    const oltre = t.calorie > goals.calorie;
    const scarto = intero(Math.abs(goals.calorie - t.calorie));
    const barraMacro = (nome, coloreTesto, coloreBarra, v, obiettivo) => `
        <div class="min-w-0">
            <p class="text-[11px] font-bold ${coloreTesto}">${nome}</p>
            <p class="font-black text-[15px]">${intero(v)} <span class="text-[11px] font-normal text-gray-400">/ ${obiettivo} g</span></p>
            <div class="w-full bg-white/10 rounded-full h-1 mt-1 overflow-hidden"><div class="${coloreBarra} h-1 rounded-full" style="width:${percento(v, obiettivo)}%"></div></div>
        </div>`;
    return `
        <div class="bg-gray-900 text-white p-5 rounded-2xl shadow-xl">
            <div class="flex justify-between items-center gap-2">
                <p class="text-[13px] font-bold text-gray-400">${titolo}</p>
                <span class="text-[12px] font-bold px-2.5 py-1 rounded-lg ${oltre ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-400'}">${oltre ? `Oltre di ${scarto} kcal` : testoSotto(scarto)}</span>
            </div>
            <p class="mt-1"><span class="text-4xl font-black">${intero(t.calorie)}</span> <span class="text-lg font-normal text-gray-400">/ ${goals.calorie} kcal</span></p>
            <div class="w-full bg-white/10 rounded-full h-2 mt-3 overflow-hidden"><div class="${oltre ? 'bg-red-400' : 'bg-indigo-400'} h-2 rounded-full" style="width:${percento(t.calorie, goals.calorie)}%"></div></div>
            <div class="grid grid-cols-3 gap-3 mt-5">
                ${barraMacro('Proteine', 'text-blue-300', 'bg-blue-400', t.proteine, goals.proteine)}
                ${barraMacro('Carboidrati', 'text-green-300', 'bg-green-400', t.carbo, goals.carbo)}
                ${barraMacro('Grassi', 'text-yellow-300', 'bg-yellow-400', t.grassi, goals.grassi)}
            </div>
        </div>`;
}

// Elenco dei pasti di un giorno, dalla colazione in poi: tipo come titolo, kcal, alimenti
function elencoPasti(pasti) {
    const ordinati = [...pasti].sort((a, b) => new Date(a.data) - new Date(b.data));
    return `
        <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">
            ${ordinati.map(meal => `
                <button class="meal-row w-full flex items-center gap-2 py-3.5 text-left active:opacity-60" data-id="${meal._id}">
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-baseline gap-2">
                            <p class="text-[16px] font-black text-gray-900">${esc(meal.pasto)}</p>
                            <p class="text-[15px] font-black text-gray-900 whitespace-nowrap">${intero(meal.calorie)} <span class="text-[12px] font-bold text-gray-400">kcal</span></p>
                        </div>
                        <p class="text-[13px] font-medium text-gray-500 leading-snug">${esc(meal.alimenti)}</p>
                    </div>
                    ${icona.avanti('w-4 h-4 text-gray-300 flex-shrink-0')}
                </button>
            `).join('')}
        </div>`;
}

// "250 g · " per un ingrediente o una porzione di meal prep; vuoto se i grammi non si sanno
function quantitaIngrediente(ing) {
    if (ing.prepId) {
        if (ing.prepGrammi > 0) return `${intero(ing.prepGrammi)} g · `;
        if (ing.grammi > 0) return `${intero(ing.grammi)} g · `;
        return ing.prepPorzioni > 0 ? `${etichettaPorzione(ing)} · ` : '';
    }
    return ing.grammi > 0 ? `${intero(ing.grammi)} g · ` : '';
}

// --- RENDER NUTRIZIONE (LIVE SCANNER E CAROSELLO) ---
export function renderNutritionDashboard(container, { mealsData, goals, currentTab, onTabSwitch, onMicClick, onManualClick, onEditGoals, onMealClick, onScanClick, onCloseScanner, onAskAI, onDailyHistoryClick, onExportCSV }) {
    let contentHtml = '';

    if (currentTab === 'oggi') {
        const pasti = mealsData;

        contentHtml = `
            ${riquadroRiepilogo(totaliPasti(pasti), goals, { titolo: 'Mangiato oggi', testoSotto: (x) => `Mancano ${x} kcal` })}

            ${pulsanteVoce('mic-btn')}
            ${riquadroScanner()}
            <div id="action-buttons" class="grid grid-cols-4 gap-2">
                ${azioniPastoHtml({ manuale: 'manual-meal-btn', scanner: 'scan-btn', preferiti: 'favorites-page-btn', prep: 'prep-btn' })}
            </div>

            <div>
                <h2 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Pasti di oggi</h2>
                ${pasti.length === 0
                    ? `<div class="bg-white rounded-[20px] border border-gray-100 p-5 text-center text-gray-500 font-medium">Non hai ancora registrato nulla oggi.</div>`
                    : elencoPasti(pasti)}
            </div>

            <div>
                <h2 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">${pasti.length > 0 ? 'Idee per il resto della giornata' : 'Idee per oggi'}</h2>
                <div id="chiusura-giornata"></div>
                <button id="ask-ai-btn" class="w-full bg-white border border-gray-200 text-gray-800 font-bold text-[15px] py-3.5 rounded-2xl shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-2">
                    ${icona.scintille('w-5 h-5 text-indigo-500')} Chiedi un'idea all'IA
                </button>
            </div>
        `;
    } else {
        // Giorni (dal più recente) raggruppati per settimana, dal lunedì
        const oggi = chiaveGiorno(new Date());
        const giorni = new Map();
        for (const meal of mealsData) {
            const k = chiaveGiorno(meal.data);
            if (!giorni.has(k)) giorni.set(k, []);
            giorni.get(k).push(meal);
        }
        const settimane = new Map();
        for (const k of [...giorni.keys()].sort().reverse()) {
            const lunedi = lunediDi(k);
            if (!settimane.has(lunedi)) settimane.set(lunedi, []);
            settimane.get(lunedi).push(k);
        }

        const rigaGiorno = (k) => {
            const t = totaliPasti(giorni.get(k));
            const oltre = t.calorie > goals.calorie;
            return `
                <button class="daily-history-card w-full text-left py-3 active:opacity-60" data-date="${k}">
                    <div class="flex justify-between items-baseline gap-2">
                        <p class="text-[15px] font-black text-gray-900">${nomeGiorno(k)}</p>
                        <p class="text-[14px] font-black ${oltre ? 'text-red-500' : 'text-gray-900'} whitespace-nowrap">${intero(t.calorie)} <span class="text-[11px] font-bold text-gray-400">/ ${goals.calorie} kcal</span></p>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1.5 my-1.5 overflow-hidden"><div class="${oltre ? 'bg-red-500' : 'bg-indigo-500'} h-1.5 rounded-full" style="width:${percento(t.calorie, goals.calorie)}%"></div></div>
                    <p class="text-[12px] font-semibold text-gray-400">${macroTesto({ proteine: t.proteine, carboidrati: t.carbo, grassi: t.grassi }, { breve: true, interi: true })}</p>
                </button>`;
        };

        // Media dei giorni finiti (oggi non conta: abbasserebbe la media)
        const mediaSettimana = (chiavi) => {
            const finiti = chiavi.filter(k => k !== oggi);
            if (finiti.length === 0) return '';
            const somma = totaliPasti(finiti.flatMap(k => giorni.get(k)));
            const m = Object.fromEntries(Object.entries(somma).map(([k, v]) => [k, v / finiti.length]));
            const colonna = (nome, colore, v, obiettivo) => `<div><p class="text-[11px] font-bold ${colore}">${nome}</p><p class="font-black text-[14px]">${intero(v)} <span class="text-[11px] font-normal text-gray-400">/ ${obiettivo} g</span></p></div>`;
            return `
                <div class="bg-gray-900 text-white rounded-2xl p-4">
                    <div class="flex justify-between items-baseline gap-2">
                        <p class="text-[12px] font-bold text-gray-400">Media al giorno</p>
                        <p><span class="text-xl font-black">${intero(m.calorie)}</span> <span class="text-[12px] text-gray-400">/ ${goals.calorie} kcal</span></p>
                    </div>
                    <div class="grid grid-cols-3 gap-3 mt-2">
                        ${colonna('Proteine', 'text-blue-300', m.proteine, goals.proteine)}
                        ${colonna('Carboidrati', 'text-green-300', m.carbo, goals.carbo)}
                        ${colonna('Grassi', 'text-yellow-300', m.grassi, goals.grassi)}
                    </div>
                </div>`;
        };

        contentHtml = settimane.size === 0 ? `
            <div class="bg-white rounded-[20px] border border-gray-100 p-6 text-center text-gray-500 font-medium">Nessun pasto registrato nello storico.</div>
        ` : `
            ${[...settimane].map(([lunedi, chiavi]) => `
                <div class="space-y-2">
                    <h2 class="text-[15px] font-black text-gray-900 px-1">${nomeSettimana(lunedi)}</h2>
                    ${mediaSettimana(chiavi)}
                    <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">
                        ${chiavi.map(rigaGiorno).join('')}
                    </div>
                </div>
            `).join('')}
            <button id="export-csv-btn" class="w-full bg-white border border-gray-200 text-gray-800 font-bold text-[14px] py-3 rounded-2xl shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-2">
                ${icona.scarica('w-5 h-5 text-gray-600')} Scarica i dati (CSV)
            </button>
        `;
    }

    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10">
            <div class="flex justify-between items-center mb-4">
                <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Nutrizione</h1>
                <button id="edit-goals-btn" class="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 font-bold text-[13px] px-3 py-1.5 rounded-full active:scale-95 transition-transform">
                    ${icona.obiettivo('w-4 h-4 text-indigo-500')} Obiettivi
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
        document.getElementById('ask-ai-btn').addEventListener('click', onAskAI);
        document.getElementById('manual-meal-btn').addEventListener('click', onManualClick);
        document.getElementById('scan-btn').addEventListener('click', onScanClick);
        document.getElementById('close-scanner-btn').addEventListener('click', onCloseScanner);
        container.querySelectorAll('.meal-row').forEach(row => {
            row.addEventListener('click', () => onMealClick(row.dataset.id));
        });
    } else if (currentTab === 'storico') {
        container.querySelectorAll('.daily-history-card').forEach(card => {
            card.addEventListener('click', () => onDailyHistoryClick(card.dataset.date));
        });
        document.getElementById('export-csv-btn')?.addEventListener('click', onExportCSV);
    }
}

// --- RENDER DETTAGLIO PASTO (CON INGREDIENTI E PREFERITI) ---
// "Oggi alle 13:00", "Ieri alle 20:30", "Sabato 4 ottobre alle 08:00"
function quandoPasto(data) {
    const d = new Date(data);
    const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const ieri = new Date();
    ieri.setDate(ieri.getDate() - 1);
    if (d.toDateString() === new Date().toDateString()) return `Oggi alle ${ora}`;
    if (d.toDateString() === ieri.toDateString()) return `Ieri alle ${ora}`;
    const giorno = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    return `${giorno.charAt(0).toUpperCase()}${giorno.slice(1)} alle ${ora}`;
}

export function renderMealDetails(container, meal, { onBack, onToggleFavorite, onAddVoice, onAddScan, onCloseScanner, onAddManual, onAddPrep, onAddFavorite, onIngredientClick, onDeleteMeal }) {
    const righe = (meal.ingredienti || []).map((ing, idx) => {
        const dettaglio = ing.prepId && ing.prepDaCompletare
            ? `<span class="text-orange-600 inline-flex items-center gap-1">${icona.avviso('w-3.5 h-3.5')} Scrivi i grammi per calcolare i valori</span>`
            : `${ing.prepId ? 'Meal prep · ' : ''}${quantitaIngrediente(ing)}${intero(ing.calorie)} kcal`;
        return `
            <button data-idx="${idx}" class="riga-ing-pasto w-full flex justify-between items-center gap-2 py-3 text-left active:opacity-60">
                <div class="min-w-0">
                    <p class="text-[15px] font-bold text-gray-800 leading-tight break-words flex items-center gap-1.5">${ing.prepId ? icona.pentola('w-4 h-4 text-orange-600 flex-shrink-0') : ''}${esc(ing.nome)}</p>
                    <p class="text-[12px] font-semibold text-gray-400 mt-0.5">${dettaglio}</p>
                </div>
                ${icona.avanti('w-4 h-4 text-gray-300 flex-shrink-0')}
            </button>`;
    }).join('');

    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center justify-between">
            <div class="flex items-center min-w-0">
                <button id="back-meal-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2" aria-label="Indietro">${icona.indietro()}</button>
                <h1 class="text-xl font-bold text-gray-900 truncate">${esc(meal.pasto)}</h1>
            </div>
            <button id="toggle-fav-btn" data-is-fav="${meal.isFavorite ? 'true' : 'false'}" aria-label="${meal.isFavorite ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}" class="p-2 rounded-full ${meal.isFavorite ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 bg-gray-100'} active:scale-95 transition-all">
                ${meal.isFavorite ? icona.stellaPiena('w-6 h-6') : icona.stella('w-6 h-6')}
            </button>
        </header>

        <main class="p-4 space-y-5 pb-24 safe-pb bg-gray-50">
            <div class="bg-white p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                <p class="text-[12px] font-semibold text-gray-400">${quandoPasto(meal.data)}</p>
                <p class="text-gray-900"><span class="text-3xl font-black">${intero(meal.calorie)}</span> <span class="text-sm font-bold text-gray-400">kcal</span></p>
                <div class="mt-2">${macroColonne(meal)}</div>
            </div>

            <div>
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Ingredienti</h3>
                ${righe
                    ? `<div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">${righe}</div>`
                    : `<div class="bg-white rounded-[20px] border border-gray-100 p-5 text-center text-sm font-medium text-gray-500">Nessun ingrediente: aggiungine uno qui sotto.</div>`}
            </div>

            <div class="space-y-2">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Aggiungi al pasto</h3>
                ${pulsanteVoce('add-voice-meal-btn')}
                ${riquadroScanner()}
                <div id="action-buttons" class="grid grid-cols-4 gap-2">
                    ${azioniPastoHtml({ manuale: 'add-manual-meal-btn', scanner: 'add-scan-meal-btn', preferiti: 'add-fav-to-meal-btn', prep: 'add-prep-meal-btn' })}
                </div>
            </div>

            <button id="delete-meal-btn" class="w-full text-red-600 font-bold text-sm py-2">Elimina pasto</button>
        </main>
    `;

    const $ = (id) => document.getElementById(id);
    $('back-meal-btn').addEventListener('click', onBack);
    $('toggle-fav-btn').addEventListener('click', (e) => onToggleFavorite(meal._id, e.currentTarget.dataset.isFav !== 'true'));
    $('add-voice-meal-btn').addEventListener('click', onAddVoice);
    $('add-scan-meal-btn').addEventListener('click', onAddScan);
    $('add-manual-meal-btn').addEventListener('click', onAddManual);
    $('add-prep-meal-btn').addEventListener('click', onAddPrep);
    $('add-fav-to-meal-btn').addEventListener('click', onAddFavorite);
    $('close-scanner-btn').addEventListener('click', onCloseScanner);
    $('delete-meal-btn').addEventListener('click', onDeleteMeal);
    container.querySelectorAll('.riga-ing-pasto').forEach(btn =>
        btn.addEventListener('click', () => onIngredientClick(parseInt(btn.dataset.idx, 10))));
}

// --- RENDER FORM PASTO MANUALE ---
// Compila il form manuale con un prodotto di Open Food Facts (valori per 100 g)
export function riempiFormPasto(prodotto) {
    const al = document.getElementById('m-alimenti');
    if (!al || !prodotto) return;
    al.value = prodotto.nome;
    document.getElementById('m-cal-100').value = prodotto.calorie100;
    document.getElementById('m-pro-100').value = prodotto.proteine100;
    document.getElementById('m-carbo-100').value = prodotto.carbo100;
    document.getElementById('m-fat-100').value = prodotto.grassi100;
    document.getElementById('m-peso').focus();
    al.dispatchEvent(new Event('input', { bubbles: true })); // aggiorna l'anteprima dei valori
}

export function renderManualMealForm(container, onSave, onCancel) {
    const iniziale = pastoPerOra(new Date().getHours());
    const classiChip = (attivo) => `m-pasto-btn py-2.5 rounded-xl text-[12px] font-bold border transition-colors ${attivo ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-gray-200'}`;
    const valore100 = (id, etichetta, colore) => `
        <div class="min-w-0">
            <label for="${id}" class="block text-[11px] font-bold ${colore} mb-1">${etichetta}</label>
            <input type="number" inputmode="decimal" step="any" id="${id}" placeholder="0" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
        </div>`;

    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="cancel-meal-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2" aria-label="Indietro">${icona.indietro()}</button>
            <h1 class="text-xl font-bold text-gray-900 truncate">Aggiungi a mano</h1>
        </header>
        <main class="p-4 space-y-4 bg-gray-50 pb-24 safe-pb">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                ${campoCodiceHtml()}
                <div id="m-pasto-box">
                    <p class="text-xs font-semibold text-gray-400 uppercase mb-2">Pasto</p>
                    <div class="grid grid-cols-4 gap-1.5">
                        ${['Colazione', 'Pranzo', 'Cena', 'Spuntino'].map(t => `<button type="button" data-pasto="${t}" class="${classiChip(t === iniziale)}">${t}</button>`).join('')}
                    </div>
                    <input type="hidden" id="m-pasto" value="${iniziale}">
                </div>
                <div>
                    <label for="m-alimenti" class="block text-xs font-semibold text-gray-400 uppercase mb-2">Alimento</label>
                    <input type="text" id="m-alimenti" placeholder="es. Pollo e riso" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                </div>
                <div>
                    <label for="m-peso" class="block text-xs font-semibold text-gray-400 uppercase mb-2">Grammi mangiati</label>
                    <input type="number" inputmode="decimal" step="any" id="m-peso" placeholder="es. 150" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                </div>
                <div class="pt-2 border-t border-gray-100">
                    <p class="text-xs font-semibold text-gray-400 uppercase mb-2">Valori ogni 100 g</p>
                    <div class="grid grid-cols-2 gap-2">
                        ${valore100('m-cal-100', 'Calorie', 'text-gray-500')}
                        ${valore100('m-pro-100', 'Proteine', 'text-blue-500')}
                        ${valore100('m-carbo-100', 'Carboidrati', 'text-green-600')}
                        ${valore100('m-fat-100', 'Grassi', 'text-yellow-600')}
                    </div>
                </div>
                <div id="m-anteprima" class="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center"></div>
            </div>
            <button id="save-meal-btn" class="${BTN_PRINCIPALE}">Salva</button>
        </main>
    `;

    const $ = (id) => document.getElementById(id);
    const leggi = (id) => parseFloat(String($(id).value).replace(',', '.')) || 0;
    const valori = () => {
        const peso = leggi('m-peso');
        const f = peso / 100;
        return {
            peso, cal100: leggi('m-cal-100'),
            calorie: parseFloat((leggi('m-cal-100') * f).toFixed(1)),
            proteine: parseFloat((leggi('m-pro-100') * f).toFixed(1)),
            carboidrati: parseFloat((leggi('m-carbo-100') * f).toFixed(1)),
            grassi: parseFloat((leggi('m-fat-100') * f).toFixed(1))
        };
    };
    // Quanto vale la porzione, prima di salvare
    const anteprima = () => {
        const v = valori();
        $('m-anteprima').innerHTML = v.peso > 0 && v.cal100 > 0
            ? `<p class="text-[12px] font-bold text-gray-500">Con ${intero(v.peso)} g</p>
               <p class="text-gray-900"><span class="text-xl font-black">${intero(v.calorie)}</span> <span class="text-sm font-bold text-gray-400">kcal</span></p>
               <p class="text-[12px] font-bold text-gray-600">${macroTesto(v, { breve: true })}</p>`
            : `<p class="text-[13px] font-semibold text-gray-400 py-1">Scrivi grammi e calorie per vedere quanto vale</p>`;
    };
    container.querySelector('main').addEventListener('input', anteprima);
    anteprima();

    container.querySelectorAll('.m-pasto-btn').forEach(btn => btn.addEventListener('click', () => {
        $('m-pasto').value = btn.dataset.pasto;
        container.querySelectorAll('.m-pasto-btn').forEach(b => { b.className = classiChip(b === btn); });
    }));

    $('cancel-meal-btn').addEventListener('click', onCancel);

    collegaCampoCodice(container, async (codice) => {
        try {
            const prodotto = await cercaProdottoOFF(codice);
            if (!prodotto) return { errore: `Il codice ${codice} non è su Open Food Facts: inserisci i valori a mano.` };
            riempiFormPasto(prodotto);
            return { ok: `${prodotto.nome}: scrivi quanti grammi.` };
        } catch (e) {
            return { errore: 'Errore di connessione a Open Food Facts.' };
        }
    });

    $('save-meal-btn').addEventListener('click', () => {
        const pasto = $('m-pasto').value || iniziale;
        const alimenti = $('m-alimenti').value.trim();
        const v = valori();
        if (!alimenti || v.peso <= 0 || v.cal100 <= 0) {
            return modal.showModal({ type: 'error', title: 'Manca qualcosa', message: 'Scrivi alimento, grammi mangiati e calorie ogni 100 g.' });
        }
        onSave({ pasto, alimenti, calorie: v.calorie, proteine: v.proteine, carboidrati: v.carboidrati, grassi: v.grassi, grammi: v.peso });
    });
}

// --- RENDER GRAFICI E STATISTICHE AVANZATE ---
export function renderExerciseStats(container, exerciseName, labels, estimated1RMs, maxWeights, bestSets, summary, onBack) {
    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="back-stats-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2 active:scale-90 transition-transform">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 class="text-xl font-bold text-gray-900 truncate">Analisi Esercizio</h1>
        </header>
        <main class="p-4 space-y-6 pb-24 safe-pb bg-gray-50">
            <h2 class="text-2xl font-black text-gray-900 px-1 mb-2">${exerciseName}</h2>
            
            <div class="grid grid-cols-3 gap-3 mb-2">
                <div class="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <span class="text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Max 1RM</span>
                    <span class="text-xl font-black text-indigo-700">${summary.allTimeMax1RM ? summary.allTimeMax1RM + ' <span class="text-[10px] font-bold">kg</span>' : '-'}</span>
                </div>
                <div class="bg-gray-800 border border-gray-900 p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Peso Max</span>
                    <span class="text-xl font-black text-white">${summary.allTimeMaxWeight ? summary.allTimeMaxWeight + ' <span class="text-[10px] font-bold">kg</span>' : '-'}</span>
                </div>
                <div class="bg-white border border-gray-200 p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sessioni</span>
                    <span class="text-xl font-black text-gray-800">${summary.totalSessions}</span>
                </div>
            </div>
            
            <div class="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                <div class="flex justify-between items-center mb-1">
                    <h3 class="text-xs font-bold text-gray-900 uppercase tracking-widest">Forza Pura (1RM Stimato)</h3>
                    <span class="text-lg">📈</span>
                </div>
                <p class="text-[11px] text-gray-400 mb-4 leading-tight font-medium">Il vero indicatore di forza, calcolato con la formula di Brzycki.</p>
                <div class="relative h-48 w-full"><canvas id="chart1RM"></canvas></div>
            </div>
            
            <div class="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                <div class="flex justify-between items-center mb-1">
                    <h3 class="text-xs font-bold text-gray-900 uppercase tracking-widest">Miglior Serie Assoluta</h3>
                    <span class="text-lg">🏋️‍♂️</span>
                </div>
                <p class="text-[11px] text-gray-400 mb-4 leading-tight font-medium">Tocca una colonna per vedere la serie (Kg x Rep) che hai eseguito.</p>
                <div class="relative h-48 w-full"><canvas id="chartWeight"></canvas></div>
            </div>
        </main>
    `;

    document.getElementById('back-stats-btn').addEventListener('click', onBack);

    // Grafico 1: Progressione 1RM (Line Chart)
    new Chart(document.getElementById('chart1RM'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '1RM (Kg)',
                data: estimated1RMs,
                borderColor: '#4F46E5', // Indigo 600
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#4F46E5',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111827',
                    padding: 10,
                    callbacks: {
                        label: function (context) {
                            return ' Massimale Stimato: ' + context.parsed.y + ' kg';
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: false, border: { display: false }, grid: { color: '#f3f4f6' } },
                x: { border: { display: false }, grid: { display: false } }
            }
        }
    });

    // Grafico 2: Peso Max per sessione con Tooltip Personalizzato
    new Chart(document.getElementById('chartWeight'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Peso Max',
                data: maxWeights,
                backgroundColor: '#111827', // Gray 900
                borderRadius: 4,
                barPercentage: 0.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111827',
                    padding: 10,
                    callbacks: {
                        // Sostituisce il semplice numero con "80kg x 8"
                        label: function (context) {
                            const idx = context.dataIndex;
                            return ' Miglior Set: ' + bestSets[idx];
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: false, border: { display: false }, grid: { color: '#f3f4f6' } },
                x: { border: { display: false }, grid: { display: false } }
            }
        }
    });
}

// --- RENDER FORM MODIFICA OBIETTIVI ---
export function renderEditGoalsForm(container, currentGoals, onSave, onCancel) {
    const campo = (id, etichetta, colore, valore) => `
        <div class="flex-1 min-w-0">
            <label for="${id}" class="block text-[11px] font-bold ${colore} mb-1">${etichetta}</label>
            <input type="number" inputmode="numeric" id="${id}" value="${valore}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
        </div>`;

    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="cancel-goals-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2" aria-label="Indietro">${icona.indietro()}</button>
            <h1 class="text-xl font-bold text-gray-900 truncate">Obiettivi</h1>
        </header>
        <main class="p-4 space-y-4 bg-gray-50 pb-24 safe-pb">
            <p class="text-[14px] font-medium text-gray-500 px-1">Quanto vuoi mangiare ogni giorno. Servono per le barre della tab Oggi e per i consigli.</p>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div>
                    <label for="g-cal" class="block text-xs font-semibold text-gray-400 uppercase mb-2">Calorie al giorno</label>
                    <input type="number" inputmode="numeric" id="g-cal" value="${currentGoals.calorie}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                </div>
                <div class="pt-2 border-t border-gray-100">
                    <p class="text-xs font-semibold text-gray-400 uppercase mb-3">Grammi al giorno</p>
                    <div class="flex gap-2">
                        ${campo('g-pro', 'Proteine', 'text-blue-500', currentGoals.proteine)}
                        ${campo('g-carbo', 'Carboidrati', 'text-green-600', currentGoals.carbo)}
                        ${campo('g-fat', 'Grassi', 'text-yellow-600', currentGoals.grassi)}
                    </div>
                </div>
            </div>
            <button id="save-goals-btn" class="${BTN_PRINCIPALE}">Salva</button>
        </main>
    `;

    document.getElementById('cancel-goals-btn').addEventListener('click', onCancel);
    document.getElementById('save-goals-btn').addEventListener('click', () => {
        const cal = parseInt(document.getElementById('g-cal').value, 10);
        const pro = parseInt(document.getElementById('g-pro').value, 10);
        const carbo = parseInt(document.getElementById('g-carbo').value, 10);
        const fat = parseInt(document.getElementById('g-fat').value, 10);

        if (cal > 0 && pro >= 0 && carbo >= 0 && fat >= 0) {
            onSave({ calorie: cal, proteine: pro, carbo: carbo, grassi: fat });
        } else {
            modal.showModal({ type: 'error', title: 'Obiettivi', message: 'Scrivi valori validi: calorie sopra zero e grammi da zero in su.' });
        }
    });
}


// --- RENDER MODALE ANTEPRIMA PREFERITO ---
export function renderFavoritePreviewModal(favMeal, onConfirm, onUnfavorite) {
    const { box, chiudi, intestazione, collegaChiudi } = apriFoglio({ id: 'fav-preview-modal' });
    const ingredienti = favMeal.ingredienti || [];
    box.innerHTML = `
        ${intestazione(esc(favMeal.alimenti), esc(favMeal.pasto))}
        <p class="text-gray-900"><span class="text-2xl font-black">${intero(favMeal.calorie)}</span> <span class="text-sm font-bold text-gray-400">kcal</span></p>
        <div class="mt-2 mb-4">${macroColonne(favMeal, { dimensione: 'text-[14px]' })}</div>
        ${ingredienti.length ? `
            <div class="divide-y divide-gray-100 border-y border-gray-100 mb-5 text-[14px]">
                ${ingredienti.map(i => `
                    <div class="flex justify-between gap-3 py-2">
                        <span class="font-semibold text-gray-700 min-w-0">${esc(i.nome)}</span>
                        <span class="font-bold text-gray-500 whitespace-nowrap">${quantitaIngrediente(i)}${intero(i.calorie)} kcal</span>
                    </div>`).join('')}
            </div>` : ''}
        <button id="confirm-fav-btn" class="${BTN_PRINCIPALE}">+ Aggiungi a oggi</button>
        <button id="remove-fav-btn" class="w-full text-red-600 font-bold text-sm py-3 mt-1">Togli dai preferiti</button>
    `;
    collegaChiudi();

    box.querySelector('#confirm-fav-btn').addEventListener('click', () => {
        chiudi();
        onConfirm();
    });
    box.querySelector('#remove-fav-btn').addEventListener('click', async () => {
        const ok = await modal.showModal({ type: 'confirm', title: 'Preferiti', message: `Togliere "${favMeal.alimenti}" dai preferiti?`, confirmText: 'Togli', cancelText: 'Annulla' });
        if (!ok) return;
        chiudi();
        onUnfavorite();
    });
}

export function renderFavoritesPage(container, favorites, onBack, onFavoriteClick) {
    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="back-fav-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2" aria-label="Indietro">${icona.indietro()}</button>
            <h1 class="text-xl font-bold text-gray-900 truncate">Preferiti</h1>
        </header>
        <main class="p-4 bg-gray-50 pb-24 safe-pb min-h-screen">
            ${favorites.length === 0 ? `
                <div class="bg-white rounded-[20px] border border-gray-100 p-6 text-center">
                    <p class="font-bold text-gray-700">Nessun preferito</p>
                    <p class="text-[14px] font-medium text-gray-500 mt-1">Per salvarne uno apri un pasto e tocca la stella in alto.</p>
                </div>
            ` : `
                <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">
                    ${favorites.map(fav => `
                        <button data-fav-id="${fav._id}" class="fav-meal-btn w-full flex items-center gap-2 py-3.5 text-left active:opacity-60">
                            <div class="flex-1 min-w-0">
                                <p class="text-[15px] font-bold text-gray-800 leading-snug">${esc(fav.alimenti)}</p>
                                <p class="text-[12px] font-semibold text-gray-400">${esc(fav.pasto)} · ${intero(fav.calorie)} kcal</p>
                            </div>
                            ${icona.avanti('w-4 h-4 text-gray-300 flex-shrink-0')}
                        </button>
                    `).join('')}
                </div>
            `}
        </main>
    `;
    document.getElementById('back-fav-btn').addEventListener('click', onBack);
    container.querySelectorAll('.fav-meal-btn').forEach(btn => btn.addEventListener('click', () => onFavoriteClick(btn.dataset.favId)));
}

// --- CHIEDI ALL'IA: scelta del pasto, attesa, opzioni con "Con questo arrivi a" ---
// Articolo per "Idee per ..." in base al tipo di pasto
const TIPO_CON_ARTICOLO = { Colazione: 'la colazione', Pranzo: 'il pranzo', Cena: 'la cena', Spuntino: 'lo spuntino' };

export function renderAIModal(onAsk, onSaveMeal, cachedData = null, goals = null, consumate = null) {
    const modalId = 'ai-modal';
    document.getElementById(modalId)?.remove();
    const tipoTesto = (tipo) => TIPO_CON_ARTICOLO[tipo] || String(tipo || '').toLowerCase();

    const foglio = document.createElement('div');
    foglio.id = modalId;
    foglio.className = "fixed inset-0 z-[100] flex items-end justify-center bg-gray-900/60 backdrop-blur-sm opacity-0 transition-opacity duration-300";
    foglio.innerHTML = `
        <div class="bg-white w-full max-w-md rounded-t-[2rem] p-6 shadow-2xl transform translate-y-full transition-transform duration-300 flex flex-col h-[90vh]">
            <div class="flex justify-between items-center mb-5 flex-shrink-0">
                <h2 class="text-xl font-black text-gray-900 flex items-center gap-2">${icona.scintille('w-6 h-6 text-indigo-500')}<span id="ai-titolo">Chiedi all'IA</span></h2>
                <button id="close-ai-modal" class="text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full active:scale-90 transition-transform" aria-label="Chiudi">${icona.chiudi()}</button>
            </div>

            <div id="ai-content-area" class="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-10">
                <div id="ai-selection-view">
                    ${cachedData ? `
                    <div id="ai-cache-banner" class="mb-6 bg-gray-50 p-5 rounded-3xl border border-gray-200 text-center">
                        <p class="text-[16px] font-black text-gray-900 mb-1">Hai già delle idee per ${tipoTesto(cachedData.type)}</p>
                        <p class="text-[13px] font-medium text-gray-500 mb-4">Le hai chieste oggi: puoi riaprirle senza aspettare.</p>
                        <button id="restore-ai-btn" class="${BTN_PRINCIPALE}">Riapri le idee</button>
                        <button id="clear-ai-cache-btn" class="text-[13px] font-bold text-indigo-600 p-2 mt-2">Fai una nuova richiesta</button>
                    </div>
                    ` : ''}

                    <div id="ai-new-request-form" class="${cachedData ? 'hidden' : ''}">
                        <label for="ai-extra-input" class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ingrediente da usare (facoltativo)</label>
                        <input type="text" id="ai-extra-input" placeholder="es. le uova" class="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-[15px] font-bold focus:ring-2 focus:ring-gray-900 outline-none transition-all mb-5">
                        <p class="text-[15px] font-bold text-gray-700 mb-3">Per quale pasto ti serve un'idea?</p>
                        <div class="grid grid-cols-2 gap-3">
                            ${['Colazione', 'Pranzo', 'Cena', 'Spuntino'].map(t => `<button class="ai-meal-type-btn bg-white border border-gray-200 rounded-2xl py-4 font-black text-gray-800 shadow-sm active:scale-95 transition-all" data-type="${t}">${t}</button>`).join('')}
                        </div>
                    </div>
                </div>

                <div id="ai-loading-view" class="hidden flex-col items-center justify-center py-16">
                    ${icona.attesa('w-10 h-10 text-indigo-500 animate-spin mb-5')}
                    <p class="text-gray-500 font-bold text-center leading-relaxed">Cerco idee che rientrino<br>nei tuoi obiettivi…</p>
                </div>

                <div id="ai-results-view" class="hidden flex-col">
                    <div id="ai-list" class="flex flex-col space-y-5"></div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(foglio);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
        foglio.classList.remove('opacity-0');
        foglio.querySelector('div').classList.remove('translate-y-full');
    });

    const closeModal = () => {
        foglio.classList.add('opacity-0');
        foglio.querySelector('div').classList.add('translate-y-full');
        setTimeout(() => {
            foglio.remove();
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        }, 300);
    };
    document.getElementById('close-ai-modal').addEventListener('click', closeModal);

    const mostraRisultati = (recommendations, tipo) => {
        document.getElementById('ai-titolo').textContent = `Idee per ${tipoTesto(tipo)}`;
        document.getElementById('ai-selection-view').classList.add('hidden');
        document.getElementById('ai-loading-view').classList.add('hidden');
        document.getElementById('ai-loading-view').classList.remove('flex');
        document.getElementById('ai-results-view').classList.remove('hidden');
        renderCards(recommendations, tipo);
    };

    if (cachedData && document.getElementById('restore-ai-btn')) {
        document.getElementById('restore-ai-btn').addEventListener('click', () => mostraRisultati(cachedData.recommendations, cachedData.type));
        document.getElementById('clear-ai-cache-btn').addEventListener('click', () => {
            localStorage.removeItem('cachedAIRecommendations');
            document.getElementById('ai-cache-banner').classList.add('hidden');
            document.getElementById('ai-new-request-form').classList.remove('hidden');
        });
    }

    let selectedType = null;
    foglio.querySelectorAll('.ai-meal-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedType = e.currentTarget.dataset.type;
            const extra = document.getElementById('ai-extra-input').value.trim();
            const question = `Pasto: ${selectedType}. ${extra ? 'Voglio usare per forza: ' + extra : ''}`;

            document.getElementById('ai-titolo').textContent = `Idee per ${tipoTesto(selectedType)}`;
            document.getElementById('ai-selection-view').classList.add('hidden');
            const attesa = document.getElementById('ai-loading-view');
            attesa.classList.remove('hidden');
            attesa.classList.add('flex');

            onAsk(question, (recommendations) => mostraRisultati(recommendations, selectedType));
        });
    });

    // Barra "Con questo arrivi a": rossa se si supera l'obiettivo
    const barra = (nome, coloreTesto, coloreBarra, valore, obiettivo, unita) => {
        const oltre = valore > obiettivo;
        return `
            <div>
                <div class="flex justify-between text-[12px] font-bold"><span class="${coloreTesto}">${nome}</span><span class="${oltre ? 'text-red-500' : 'text-gray-900'}">${intero(valore)} / ${obiettivo} ${unita}</span></div>
                <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden"><div class="${oltre ? 'bg-red-500' : coloreBarra} h-1.5 rounded-full" style="width:${Math.min(100, obiettivo > 0 ? valore / obiettivo * 100 : 0)}%"></div></div>
            </div>`;
    };

    function renderCards(recommendations, tipoPasto) {
        const listContainer = document.getElementById('ai-list');
        listContainer.innerHTML = '';
        const currentViews = recommendations.map(() => 'main');

        recommendations.forEach((rec, idx) => {
            const card = document.createElement('div');
            card.className = "w-full bg-white border border-gray-200 rounded-3xl shadow-sm p-5 flex flex-col";

            const renderCardContent = (viewState) => {
                const data = viewState === 'main' ? rec : rec.variante;
                const valori = { proteine: data.totaleProteine, carboidrati: data.totaleCarbo, grassi: data.totaleGrassi };
                const arrivo = goals && consumate ? `
                    <div class="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2 mb-4">
                        <p class="text-[12px] font-bold text-gray-500">Con questo arrivi a</p>
                        ${barra('Calorie', 'text-gray-700', 'bg-indigo-500', consumate.calorie + data.totaleCalorie, goals.calorie, 'kcal')}
                        ${barra('Proteine', 'text-blue-500', 'bg-blue-500', consumate.proteine + data.totaleProteine, goals.proteine, 'g')}
                        ${barra('Carboidrati', 'text-green-600', 'bg-green-500', consumate.carbo + data.totaleCarbo, goals.carbo, 'g')}
                        ${barra('Grassi', 'text-yellow-600', 'bg-yellow-500', consumate.grassi + data.totaleGrassi, goals.grassi, 'g')}
                    </div>` : '';

                return `
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[11px] font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">${viewState === 'main' ? `Opzione ${idx + 1}` : `Variante dell'opzione ${idx + 1}`}</span>
                        ${rec.variante ? `<button class="toggle-variant-btn text-[12px] font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-xl active:scale-95 transition-transform">${viewState === 'main' ? 'Vedi variante' : "Torna all'opzione"}</button>` : ''}
                    </div>
                    <h3 class="text-lg font-black text-gray-900 leading-tight">${esc(data.nomePasto)}</h3>
                    <p class="text-[13px] font-medium text-gray-500 mb-3 leading-snug">${esc(data.messaggio)}</p>
                    <p class="text-gray-900"><span class="text-2xl font-black">${intero(data.totaleCalorie)}</span> <span class="text-sm font-bold text-gray-400">kcal</span></p>
                    <div class="mt-1 mb-3">${macroColonne(valori, { dimensione: 'text-[14px]' })}</div>
                    <div class="divide-y divide-gray-100 border-y border-gray-100 mb-3 text-[13px]">
                        ${data.ingredienti.map(ing => `
                            <div class="flex justify-between items-center gap-3 py-2">
                                <span class="font-semibold text-gray-700 leading-tight flex items-center gap-1.5 min-w-0">${ing.prepId ? icona.pentola('w-4 h-4 text-orange-600 flex-shrink-0') : ''}${esc(ing.nome)}</span>
                                <span class="font-bold text-gray-500 whitespace-nowrap">${quantitaIngrediente(ing)}${intero(ing.calorie)} kcal</span>
                            </div>`).join('')}
                    </div>
                    ${arrivo}
                    <button class="save-ai-meal-btn ${BTN_PRINCIPALE} !py-3.5">+ Aggiungi a oggi</button>
                `;
            };

            card.innerHTML = renderCardContent(currentViews[idx]);
            card.addEventListener('click', (e) => {
                if (e.target.closest('.toggle-variant-btn')) {
                    currentViews[idx] = currentViews[idx] === 'main' ? 'variant' : 'main';
                    card.innerHTML = renderCardContent(currentViews[idx]);
                } else if (e.target.closest('.save-ai-meal-btn')) {
                    const dataToSave = currentViews[idx] === 'main' ? rec : rec.variante;
                    onSaveMeal({
                        pasto: tipoPasto, alimenti: dataToSave.nomePasto, calorie: dataToSave.totaleCalorie,
                        proteine: dataToSave.totaleProteine, carboidrati: dataToSave.totaleCarbo,
                        grassi: dataToSave.totaleGrassi, ingredienti: dataToSave.ingredienti
                    });
                    closeModal();
                }
            });
            listContainer.appendChild(card);
        });
    }
}

// --- RENDER STATISTICHE GIORNALIERE (STORICO) ---
// giorno: 'YYYY-MM-DD'. onMealClick(id): apre il dettaglio del pasto, per correggerlo
export function renderDailyNutritionStats(container, { giorno, meals, goals, onBack, onMealClick }) {
    const t = totaliPasti(meals);
    const r = ripartizioneCalorie({ proteine: t.proteine, carboidrati: t.carbo, grassi: t.grassi });
    const quota = (nome, colore, valore) => `<div><p class="text-[11px] font-bold ${colore}">${nome}</p><p class="text-[15px] font-black text-gray-900">${valore}%</p></div>`;

    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="back-daily-stats-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2 active:scale-90 transition-transform" aria-label="Indietro">${icona.indietro()}</button>
            <h1 class="text-xl font-bold text-gray-900 truncate">${nomeGiorno(giorno)}</h1>
        </header>
        <main class="p-4 space-y-5 pb-24 safe-pb bg-gray-50">
            ${riquadroRiepilogo(t, goals, { titolo: 'Mangiato', testoSotto: (x) => `${x} kcal sotto l'obiettivo` })}

            ${r ? `
            <div class="bg-white p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                <p class="text-[15px] font-black text-gray-900 mb-3">Da dove vengono le calorie</p>
                <div class="flex w-full h-3 rounded-full overflow-hidden bg-gray-100">
                    <div class="bg-blue-500" style="width:${r.proteine}%"></div>
                    <div class="bg-green-500" style="width:${r.carboidrati}%"></div>
                    <div class="bg-yellow-500" style="width:${r.grassi}%"></div>
                </div>
                <div class="grid grid-cols-3 gap-2 mt-3">
                    ${quota('Proteine', 'text-blue-500', r.proteine)}
                    ${quota('Carboidrati', 'text-green-600', r.carboidrati)}
                    ${quota('Grassi', 'text-yellow-600', r.grassi)}
                </div>
            </div>` : ''}

            <div>
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Pasti</h3>
                ${elencoPasti(meals)}
            </div>
        </main>
    `;

    document.getElementById('back-daily-stats-btn').addEventListener('click', onBack);
    container.querySelectorAll('.meal-row').forEach(row => row.addEventListener('click', () => onMealClick(row.dataset.id)));
}

