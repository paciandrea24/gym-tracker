import { formatDate } from './utils.js?v=20';

// --- RENDER HOME DASHBOARD (RIEPILOGO) ---
export function renderHomeDashboard(container, stats, waterGlasses, consumedCal, goalCal, onFlameClick, onCalorieClick, onWaterUpdate, onStartWorkout, onAddManualMeal) {
    const dateOpts = { weekday: 'long', day: 'numeric', month: 'long' };
    let dateStr = new Date().toLocaleDateString('it-IT', dateOpts);
    dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const remainingCal = Math.max(0, goalCal - consumedCal);

    let dropsHtml = '';
    for (let i = 1; i <= 8; i++) {
        const isFull = i <= waterGlasses;
        dropsHtml += `<svg data-index="${i}" class="water-drop-btn w-7 h-7 cursor-pointer active:scale-90 transition-transform ${isFull ? 'text-[#60A5FA]' : 'text-gray-200'}" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c-5.33 5.58-8 9.24-8 12.83A8.04 8.04 0 0012 22a8.04 8.04 0 008-7.17C20 11.24 17.33 7.58 12 2z"/></svg>`;
    }

    container.innerHTML = `
        <header class="pt-12 pb-2 px-6 sticky top-0 z-10 bg-[#f9fafb]/90 backdrop-blur-md">
            <h1 class="text-[28px] font-black text-gray-900 tracking-tight">Ciao Andrea! 👋</h1>
            <p class="text-sm font-medium text-gray-400 mt-0.5">${dateStr}</p>
        </header>

        <main class="p-5 space-y-5 pb-24 bg-[#f9fafb]">
            <div class="grid grid-cols-2 gap-4">
                <div id="home-flame-card" class="bg-white p-4 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-center aspect-square cursor-pointer active:scale-95 transition-transform">
                    <span class="font-bold text-gray-800 text-xs mb-1 flex items-center gap-1">Fiamma <span class="text-sm">🔥</span></span>
                    <div class="text-[40px] mb-1 drop-shadow-md ${stats.activeToday ? '' : 'grayscale opacity-50'}">🔥</div>
                    <p class="text-[13px] font-bold text-gray-900 leading-tight">${stats.currentStreak} Giorni</p>
                    <p class="text-[10px] font-medium text-gray-400 mt-0.5">Record: ${stats.longestStreak} gg</p>
                </div>
                
                <div id="home-calorie-card" class="bg-white p-4 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-center aspect-square cursor-pointer active:scale-95 transition-transform">
                    <span class="font-bold text-gray-800 text-xs mb-1 flex items-center gap-1">Calorie <span class="text-yellow-400 text-sm">⚡</span></span>
                    <div class="w-12 h-12 rounded-full border-[3px] border-gray-100 border-t-gray-800 flex items-center justify-center mb-1">
                        <svg class="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <p class="text-[13px] font-bold text-gray-900 leading-tight">${Number(consumedCal).toFixed(0)} <span class="text-[10px] font-normal text-gray-500">/ ${goalCal}</span></p>
                    <p class="text-[10px] font-medium text-gray-400 mt-0.5">${Number(remainingCal).toFixed(0)} rimaste</p>
                </div>
            </div>

            <div class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div class="flex justify-between items-center mb-4">
                    <span class="font-bold text-gray-800 flex items-center gap-1.5 text-sm">
                        Idratazione <svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c-5.33 5.58-8 9.24-8 12.83A8.04 8.04 0 0012 22a8.04 8.04 0 008-7.17C20 11.24 17.33 7.58 12 2z"/></svg>
                    </span>
                    <span class="text-[11px] font-bold text-gray-500">${waterGlasses * 250} ml / 2000 ml</span>
                </div>
                
                <div class="flex justify-between items-center px-1 mb-4">
                    ${dropsHtml}
                </div>
                
                <div class="flex justify-between px-2">
                    <button id="water-minus-btn" class="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-1.5 rounded-lg font-bold text-sm transition-colors active:scale-90">-</button>
                    <button id="water-plus-btn" class="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-1.5 rounded-lg font-bold text-sm transition-colors active:scale-90">+</button>
                </div>
            </div>

            <div class="space-y-3 pt-2">
                <h3 class="text-[13px] font-bold text-gray-800 ml-1">Azioni Rapide</h3>
                
                <button id="home-start-workout-btn" class="w-full bg-black text-white font-bold text-[15px] py-4 rounded-[18px] shadow-[0_8px_20px_rgb(0,0,0,0.15)] flex justify-center items-center gap-2 transition-transform active:scale-95">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Inizia Allenamento
                </button>
                
                <button id="home-add-meal-btn" class="w-full bg-[#f3f4f6] text-gray-800 font-bold text-[15px] py-4 rounded-[18px] flex justify-center items-center gap-2 transition-transform active:scale-95">
                    <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.898 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                    Aggiungi Pasto
                </button>
            </div>
        </main>
    `;

    document.getElementById('home-flame-card').addEventListener('click', onFlameClick);
    document.getElementById('home-calorie-card').addEventListener('click', onCalorieClick);
    document.getElementById('home-start-workout-btn').addEventListener('click', onStartWorkout);
    document.getElementById('home-add-meal-btn').addEventListener('click', onAddManualMeal);

    container.querySelectorAll('.water-drop-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index, 10);
            let newTotal = index;
            if (index === waterGlasses) newTotal = index - 1;
            onWaterUpdate(newTotal);
        });
    });

    document.getElementById('water-minus-btn').addEventListener('click', () => { if (waterGlasses > 0) onWaterUpdate(waterGlasses - 1); });
    document.getElementById('water-plus-btn').addEventListener('click', () => { if (waterGlasses < 8) onWaterUpdate(waterGlasses + 1); });
}

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
                                <p class="text-sm font-medium text-gray-500 mt-1">
                                    ${ex.type === 'cardio' ? 'Sessione Unica' : ex.targetSets + ' serie'} <span class="mx-1">•</span> ${ex.type === 'cardio' ? 'Cardio' : (ex.type === 'corpo-libero' ? 'Corpo Libero' : 'Base: ' + ex.baseKg + ' kg')}
                                </p>
                            </div>
                            
                            <div class="flex items-center space-x-2 pl-3 border-l border-gray-100 flex-shrink-0">
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
                                        <p class="text-xs text-gray-500 font-medium">${new Date(session.endTime).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div class="text-gray-400 transition-transform group-open:rotate-180">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </summary>
                            <div class="p-4 border-t border-gray-50 space-y-4 bg-gray-50/50 rounded-b-2xl">
                                ${session.exercises.map(ex => `
                                    <div class="p-2 -mx-2 rounded-xl">
                                        <div class="flex justify-between items-center mb-2">
                                            <h4 class="text-sm font-bold text-gray-700">${ex.name}</h4>
                                        </div>
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
    } else if (currentTab === 'scheda' && !hasExercises) {
        document.getElementById('add-ex-btn').addEventListener('click', onAddExerciseClick);
    }
}

// --- RENDER VISTA SESSIONE ATTIVA ---
export function renderActiveSession(container, session, routine, onExerciseClick, onEndSession) {
    const todoIds = session.todo;
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
        
        <div class="fixed left-0 right-0 p-4 bg-gray-50/90 backdrop-blur-md border-t border-gray-200 max-w-md mx-auto z-20" style="bottom: calc(55px + env(safe-area-inset-bottom));">
            <button id="end-session-btn" class="w-full ${todoIds.length === 0 ? 'bg-gray-900 text-white' : 'bg-white text-red-500 border border-red-200'} font-bold text-lg py-4 rounded-2xl shadow-sm active:scale-95 transition-transform">
                ${todoIds.length === 0 ? 'Salva nel Database' : 'Termina in anticipo'}
            </button>
        </div>
    `;

    container.querySelectorAll('.session-ex-btn').forEach(btn => btn.addEventListener('click', () => onExerciseClick(btn.dataset.id)));
    document.getElementById('end-session-btn').addEventListener('click', onEndSession);
}

// --- RENDER FORM CREAZIONE ESERCIZIO ---
export function renderRoutineBuilder(container, onSave, onCancel) {
    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="cancel-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 class="text-xl font-bold text-gray-900 truncate">Nuovo Esercizio</h1>
        </header>
        <main class="p-4 space-y-4 bg-gray-50 pb-24 safe-pb">
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
                
                <div id="box-equipment" class="space-y-3 pt-4 border-t border-gray-100">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Setup Statistiche e Grafici</p>
                    <div class="flex space-x-3">
                        <div class="flex-1">
                            <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Moltiplicatore</label>
                            <select id="ex-multiplier" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold outline-none">
                                <option value="1">x1 (Manubri / Totale)</option>
                                <option value="2">x2 (Loggo un solo lato)</option>
                            </select>
                        </div>
                        <div class="flex-1">
                            <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Bilanciere (Kg)</label>
                            <input type="number" id="ex-barbell" placeholder="0" value="0" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-center text-sm font-bold outline-none">
                        </div>
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
    const boxEquipment = document.getElementById('box-equipment');

    typeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        boxKg.style.display = val === 'cardio' || val === 'corpo-libero' ? 'none' : 'block';
        boxSets.style.display = val === 'cardio' ? 'none' : 'block';
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

        const mult = parseFloat(document.getElementById('ex-multiplier').value) || 1;
        const barbell = parseFloat(document.getElementById('ex-barbell').value) || 0;

        if (name && sets && reps) {
            onSave({
                id: 'ex-' + Date.now(), name, type, targetSets: sets, targetReps: reps, baseKg: kg,
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

// --- RENDER NUTRIZIONE (LIVE SCANNER E CAROSELLO) ---
export function renderNutritionDashboard(container, mealsData, goals, currentTab, favorites, onTabSwitch, onMicClick, onManualClick, onDeleteMeal, onEditGoals, onMealClick, onScanClick, onCloseScanner, onAddFavoriteClick, onAskAI, onDailyHistoryClick) {
    let contentHtml = '';
    const checkIcon = `<svg class="w-4 h-4 text-green-400 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;

    if (currentTab === 'oggi') {
        let consumate = { calorie: 0, proteine: 0, carbo: 0, grassi: 0 };
        mealsData.forEach(meal => {
            consumate.calorie += Number(meal.calorie) || 0;
            consumate.proteine += Number(meal.proteine) || 0;
            consumate.carbo += Number(meal.carboidrati) || 0;
            consumate.grassi += Number(meal.grassi) || 0;
        });

        // Calcoliamo le calorie rimaste per il badge
        let calorieRimaste = Number(goals.calorie) - consumate.calorie;
        let rimasteText = calorieRimaste >= 0 ? `${Number(calorieRimaste).toFixed(0)} kcal rimaste` : `${Math.abs(Number(calorieRimaste)).toFixed(0)} kcal oltre`;
        let badgeColor = calorieRimaste >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';

        contentHtml = `
            <div class="bg-gray-900 text-white p-5 rounded-2xl shadow-xl mb-6">
                <div class="flex justify-between items-center mb-1">
                    <p class="text-sm text-gray-400 font-bold uppercase tracking-wider">Calorie Assunte</p>
                    <span class="text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${badgeColor}">${rimasteText}</span>
                </div>
                
                <h2 class="text-4xl font-black">${Number(consumate.calorie).toFixed(1)} <span class="text-lg font-normal text-gray-400">/ ${goals.calorie}</span></h2>
                
                <div class="flex justify-between mt-6 gap-2">
                    <div class="flex-1 bg-white/10 p-2 rounded-xl text-center">
                        <p class="text-[9px] text-gray-400 uppercase font-bold flex items-center justify-center">Proteine ${consumate.proteine >= goals.proteine ? checkIcon : ''}</p>
                        <p class="font-bold text-base sm:text-lg">${Number(consumate.proteine).toFixed(1)}<span class="text-[10px] font-normal text-gray-400">/${goals.proteine}g</span></p>
                    </div>
                    <div class="flex-1 bg-white/10 p-2 rounded-xl text-center">
                        <p class="text-[9px] text-gray-400 uppercase font-bold flex items-center justify-center">Carbo ${consumate.carbo >= goals.carbo ? checkIcon : ''}</p>
                        <p class="font-bold text-base sm:text-lg">${Number(consumate.carbo).toFixed(1)}<span class="text-[10px] font-normal text-gray-400">/${goals.carbo}g</span></p>
                    </div>
                    <div class="flex-1 bg-white/10 p-2 rounded-xl text-center">
                        <p class="text-[9px] text-gray-400 uppercase font-bold flex items-center justify-center">Grassi ${consumate.grassi >= goals.grassi ? checkIcon : ''}</p>
                        <p class="font-bold text-base sm:text-lg">${Number(consumate.grassi).toFixed(1)}<span class="text-[10px] font-normal text-gray-400">/${goals.grassi}g</span></p>
                    </div>
                </div>
            </div>

            <div class="flex gap-3 mb-3">
                <button id="mic-btn" class="flex-1 bg-gray-900 text-white font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform flex justify-center items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                    VOCE
                </button>
                <button id="ask-ai-btn" class="flex-1 bg-indigo-600 text-white font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgb(79,70,229,0.25)] active:scale-95 transition-transform flex justify-center items-center gap-2">
                    <span class="text-lg leading-none">✨</span>
                    CHIEDI ALL'IA
                </button>
            </div>
            
            <div id="scanner-container" class="hidden mb-6 bg-gray-900 p-2 rounded-2xl shadow-xl border border-gray-800">
                <p class="text-center text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Inquadra il codice a barre</p>
                <video id="reader-video" class="w-full rounded-xl overflow-hidden mb-3 bg-black min-h-[250px]" autoplay playsinline></video>
                <button id="close-scanner-btn" class="w-full bg-red-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform">Annulla Scansione</button>
            </div>

            <div id="action-buttons" class="flex space-x-2 mb-6">
                <button id="manual-meal-btn" class="flex-1 bg-white text-gray-900 border border-gray-200 font-bold text-sm py-3 rounded-2xl shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-1">
                    ➕ Manuale
                </button>
                <button id="scan-btn" class="flex-1 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-sm py-3 rounded-2xl shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg> Scanner
                </button>
                <button id="favorites-page-btn" class="flex-1 bg-yellow-50 text-yellow-700 border border-yellow-200 font-bold text-sm py-3 rounded-2xl shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-1">
                    ⭐ Preferiti
                </button>
            </div>

            <div class="flex justify-between items-end mb-3">
                <h2 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Pasti di oggi</h2>
            </div>
            
            <div class="space-y-3">
                ${mealsData.length === 0 ? `
                    <div class="text-center py-10">
                        <p class="text-gray-500 font-medium">Non hai ancora registrato nulla oggi.</p>
                    </div>
                ` : mealsData.map(meal => `
                    <div class="meal-row w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-95 transition-transform group" data-id="${meal._id}">
                        <div class="flex-1 pr-3 pointer-events-none">
                            <h3 class="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">${meal.alimenti}</h3>
                            <p class="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
                                <span class="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md uppercase tracking-wider">${meal.pasto}</span>
                                <span class="font-bold text-gray-900">${Number(meal.calorie).toFixed(1)} kcal</span>
                            </p>
                        </div>
                        <div class="flex items-center space-x-2 pl-3 border-l border-gray-100 flex-shrink-0">
                            <button data-delete-id="${meal._id}" class="delete-meal-btn p-2 text-red-500 hover:text-red-700 bg-red-50 rounded-full active:scale-110 transition-transform">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        const grouped = {};
        mealsData.forEach(meal => {
            const dateStr = new Date(meal.data).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
            if (!grouped[dateStr]) grouped[dateStr] = { meals: [], totals: { cal: 0, pro: 0, car: 0, grassi: 0 } };

            grouped[dateStr].meals.push(meal);
            grouped[dateStr].totals.cal += Number(meal.calorie) || 0;
            grouped[dateStr].totals.pro += Number(meal.proteine) || 0;
            grouped[dateStr].totals.car += Number(meal.carboidrati) || 0;
            grouped[dateStr].totals.grassi += Number(meal.grassi) || 0;
        });

        contentHtml = `
            ${Object.keys(grouped).length === 0 ? `
                <div class="text-center py-10"><p class="text-gray-500 font-medium">Nessun pasto registrato nello storico.</p></div>
            ` : `
                <div class="space-y-4">
                    ${Object.keys(grouped).map(dateStr => {
            const day = grouped[dateStr];
            const calPercent = Math.min(100, (day.totals.cal / goals.calorie) * 100);
            return `
                            <div class="daily-history-card bg-white p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 cursor-pointer active:scale-95 transition-transform" data-date="${dateStr}">
                                <div class="flex justify-between items-center mb-4">
                                    <div class="flex items-center gap-3">
                                        <div class="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        </div>
                                        <div>
                                            <h3 class="text-base font-bold text-gray-900 capitalize">${dateStr}</h3>
                                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Vedi Statistiche</p>
                                        </div>
                                    </div>
                                    <div class="text-gray-300">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                                    </div>
                                </div>
                                
                                <div class="flex justify-between items-end mb-2">
                                    <span class="text-2xl font-black text-gray-900">${Number(day.totals.cal).toFixed(0)} <span class="text-sm font-bold text-gray-400">/ ${goals.calorie} kcal</span></span>
                                </div>
                                <div class="w-full bg-gray-100 rounded-full h-2.5 mb-4 overflow-hidden">
                                    <div class="bg-indigo-500 h-2.5 rounded-full" style="width: ${calPercent}%"></div>
                                </div>
                                
                                <div class="grid grid-cols-3 gap-2">
                                    <div class="text-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                                        <p class="text-[9px] font-bold text-blue-500 uppercase">Pro</p>
                                        <p class="text-sm font-black text-gray-800">${Number(day.totals.pro).toFixed(0)}g</p>
                                    </div>
                                    <div class="text-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                                        <p class="text-[9px] font-bold text-green-500 uppercase">Car</p>
                                        <p class="text-sm font-black text-gray-800">${Number(day.totals.car).toFixed(0)}g</p>
                                    </div>
                                    <div class="text-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                                        <p class="text-[9px] font-bold text-yellow-500 uppercase">Fat</p>
                                        <p class="text-sm font-black text-gray-800">${Number(day.totals.grassi).toFixed(0)}g</p>
                                    </div>
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
        document.getElementById('ask-ai-btn').addEventListener('click', onAskAI);
        document.getElementById('manual-meal-btn').addEventListener('click', onManualClick);

        document.getElementById('scan-btn').addEventListener('click', onScanClick);
        document.getElementById('close-scanner-btn').addEventListener('click', onCloseScanner);

        container.querySelectorAll('.delete-meal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                onDeleteMeal(btn.dataset.deleteId);
            });
        });

        container.querySelectorAll('.meal-row').forEach(row => {
            row.addEventListener('click', () => onMealClick(row.dataset.id));
        });

        container.querySelectorAll('.fav-meal-btn').forEach(btn => {
            btn.addEventListener('click', () => onAddFavoriteClick(btn.dataset.favId));
        });
    } else if (currentTab === 'storico') {
        container.querySelectorAll('.daily-history-card').forEach(card => {
            card.addEventListener('click', () => onDailyHistoryClick(card.dataset.date));
        });
    }
}

// --- RENDER DETTAGLIO PASTO (CON INGREDIENTI E PREFERITI) ---
export function renderMealDetails(container, meal, onBack, onToggleFavorite, onAddVoice, onAddScan, onCloseScanner, onRemoveIngredient, onAddManual) {
    const dateObj = new Date(meal.data);
    const dateStr = dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    let ingredientsHtml = '';
    // Cerca la riga: let ingredientsHtml = ''; in renderMealDetails e SOSTITUISCI il blocco if successivo con questo:
    if (meal.ingredienti && meal.ingredienti.length > 0) {
        ingredientsHtml = `
            <div class="pt-6 border-t border-gray-100">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ingredienti</h3>
                <div class="space-y-3">
                    ${meal.ingredienti.map((ing, idx) => `
                        <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                            <div class="flex-1 truncate pr-2">
                                <h4 class="text-sm font-bold text-gray-800 truncate">${ing.nome}</h4>
                                <p class="text-[10px] font-bold text-gray-500 mt-1">${Number(ing.proteine).toFixed(1)}g P • ${Number(ing.carboidrati).toFixed(1)}g C • ${Number(ing.grassi).toFixed(1)}g G</p>
                            </div>
                            <div class="flex items-center flex-shrink-0">
                                <span class="font-bold text-gray-900 text-sm mr-3">${Number(ing.calorie).toFixed(1)} kcal</span>
                                
                                <button data-idx="${idx}" class="edit-ing-btn p-2 text-blue-500 hover:text-blue-700 bg-blue-50 rounded-full active:scale-110 transition-transform mr-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>

                                <button data-idx="${idx}" class="remove-ing-btn p-2 text-red-500 hover:text-red-700 bg-red-50 rounded-full active:scale-110 transition-transform">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }



    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center justify-between">
            <div class="flex items-center">
                <button id="back-meal-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <h1 class="text-xl font-bold text-gray-900 truncate">Dettagli Pasto</h1>
            </div>
            <button id="toggle-fav-btn" data-is-fav="${meal.isFavorite ? 'true' : 'false'}" class="p-2 rounded-full ${meal.isFavorite ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 bg-gray-100'} active:scale-95 transition-all">
                <svg class="w-6 h-6" fill="${meal.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.898 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
            </button>
        </header>
        <main class="p-4 space-y-6 pb-24 safe-pb bg-gray-50">
            
            <div class="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-xs font-bold bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase tracking-wider">${meal.pasto}</span>
                    <span class="text-xs text-gray-400 font-medium">${dateStr} - ${timeStr}</span>
                </div>
                <h2 class="text-2xl font-black text-gray-900 leading-tight">${meal.alimenti}</h2>
                
                <div id="action-buttons" class="grid grid-cols-2 gap-2 my-5">
                    <button id="add-voice-meal-btn" class="bg-gray-900 text-white font-bold text-xs py-3 rounded-xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform flex justify-center items-center gap-1">🎙️ Voce</button>
                    <button id="add-scan-meal-btn" class="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs py-3 rounded-xl shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-1">📸 Scan</button>
                    <button id="add-manual-meal-btn" class="bg-white text-gray-900 border border-gray-200 font-bold text-xs py-3 rounded-xl shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-1">➕ Manuale</button>
                    
                    <button id="add-fav-to-meal-btn" class="bg-yellow-50 text-yellow-700 border border-yellow-200 font-bold text-xs py-3 rounded-xl shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-1">⭐ Preferiti</button>
                </div>

                <div id="scanner-container" class="hidden mb-6 bg-gray-900 p-2 rounded-2xl shadow-xl border border-gray-800">
                    <p class="text-center text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Inquadra il codice a barre</p>
                    <video id="reader-video" class="w-full rounded-xl overflow-hidden mb-3 bg-black min-h-[250px]" autoplay playsinline></video>
                    <button id="close-scanner-btn" class="w-full bg-red-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform">Annulla Scansione</button>
                </div>
                
                <div class="space-y-6">
                    <div class="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Calorie Totali</span>
                        <span class="text-2xl font-black text-gray-900">${Number(meal.calorie).toFixed(1)} <span class="text-sm font-normal text-gray-500">kcal</span></span>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-2">
                        <div class="bg-blue-50 p-2 sm:p-3 rounded-2xl flex flex-col justify-center items-center border border-blue-100">
                            <p class="text-[9px] font-bold text-blue-400 uppercase mb-1 w-full text-center truncate">Proteine</p>
                            <p class="text-lg sm:text-xl font-black text-blue-700">${Number(meal.proteine).toFixed(1)}g</p>
                        </div>
                        <div class="bg-green-50 p-2 sm:p-3 rounded-2xl flex flex-col justify-center items-center border border-green-100">
                            <p class="text-[9px] font-bold text-green-500 uppercase mb-1 w-full text-center truncate">Carboidrati</p>
                            <p class="text-lg sm:text-xl font-black text-green-700">${Number(meal.carboidrati).toFixed(1)}g</p>
                        </div>
                        <div class="bg-yellow-50 p-2 sm:p-3 rounded-2xl flex flex-col justify-center items-center border border-yellow-100">
                            <p class="text-[9px] font-bold text-yellow-600 uppercase mb-1 w-full text-center truncate">Grassi</p>
                            <p class="text-lg sm:text-xl font-black text-yellow-700">${Number(meal.grassi).toFixed(1)}g</p>
                        </div>
                    </div>
                    
                    ${ingredientsHtml}
                </div>
            </div>
        </main>
    `;

    document.getElementById('back-meal-btn').addEventListener('click', onBack);
    document.getElementById('toggle-fav-btn').addEventListener('click', (e) => {
        const isFav = e.currentTarget.dataset.isFav === 'true';
        onToggleFavorite(meal._id, !isFav);
    });
    document.getElementById('add-voice-meal-btn').addEventListener('click', onAddVoice);
    document.getElementById('add-scan-meal-btn').addEventListener('click', onAddScan);
    document.getElementById('add-manual-meal-btn').addEventListener('click', onAddManual); // <-- Nuovo Listener
    document.getElementById('close-scanner-btn').addEventListener('click', onCloseScanner);

    container.querySelectorAll('.remove-ing-btn').forEach(btn => {
        btn.addEventListener('click', (e) => onRemoveIngredient(parseInt(e.currentTarget.dataset.idx, 10)));
    });

    // Aggiungi questi insieme agli altri listener in fondo a renderMealDetails:
    const favToMealBtn = document.getElementById('add-fav-to-meal-btn');
    if (favToMealBtn) {
        // Usa CustomEvent per passare la palla ad app.js
        favToMealBtn.addEventListener('click', () => window.dispatchEvent(new CustomEvent('openFavSelector', { detail: meal._id })));
    }

    container.querySelectorAll('.edit-ing-btn').forEach(btn => {
        btn.addEventListener('click', (e) => window.dispatchEvent(new CustomEvent('editIngredient', { detail: { mealId: meal._id, ingIdx: parseInt(e.currentTarget.dataset.idx, 10) } })));
    });
}

// --- RENDER FORM PASTO MANUALE ---
export function renderManualMealForm(container, onSave, onCancel) {
    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="cancel-meal-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 class="text-xl font-bold text-gray-900 truncate">Pasto Manuale</h1>
        </header>
        <main class="p-4 space-y-4 bg-gray-50 pb-24 safe-pb">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Pasto (es. Colazione)</label>
                    <input type="text" id="m-pasto" placeholder="Pranzo" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Alimento</label>
                    <input type="text" id="m-alimenti" placeholder="Es. Pollo e Riso" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-blue-500 uppercase mb-2">Peso consumato (in grammi)</label>
                    <input type="number" id="m-peso" placeholder="es. 150" class="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                </div>
                
                <div class="pt-2 border-t border-gray-100">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Valori Nutrizionali (su 100g)</p>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Calorie (per 100g)</label>
                            <input type="number" id="m-cal-100" placeholder="0" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                        </div>
                        <div class="flex space-x-2">
                            <div class="flex-1">
                                <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Proteine (g)</label>
                                <input type="number" id="m-pro-100" placeholder="0" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                            </div>
                            <div class="flex-1">
                                <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Carbo (g)</label>
                                <input type="number" id="m-carbo-100" placeholder="0" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                            </div>
                            <div class="flex-1">
                                <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Grassi (g)</label>
                                <input type="number" id="m-fat-100" placeholder="0" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <button id="save-meal-btn" class="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg active:scale-95 transition-transform mt-6">
                Calcola e Salva Pasto
            </button>
        </main>
    `;

    document.getElementById('cancel-meal-btn').addEventListener('click', onCancel);
    document.getElementById('save-meal-btn').addEventListener('click', () => {
        const pasto = document.getElementById('m-pasto').value.trim() || 'Spuntino';
        const alimenti = document.getElementById('m-alimenti').value.trim();
        const peso = parseFloat(document.getElementById('m-peso').value);

        const cal100 = parseFloat(document.getElementById('m-cal-100').value) || 0;
        const pro100 = parseFloat(document.getElementById('m-pro-100').value) || 0;
        const carbo100 = parseFloat(document.getElementById('m-carbo-100').value) || 0;
        const fat100 = parseFloat(document.getElementById('m-fat-100').value) || 0;

        if (!alimenti || isNaN(peso) || peso <= 0 || cal100 <= 0) {
            return alert("Compila correttamente Alimento, Peso e Calorie per 100g.");
        }

        const multiplier = peso / 100;
        const calorie = parseFloat((cal100 * multiplier).toFixed(1));
        const proteine = parseFloat((pro100 * multiplier).toFixed(1));
        const carboidrati = parseFloat((carbo100 * multiplier).toFixed(1));
        const grassi = parseFloat((fat100 * multiplier).toFixed(1));

        onSave({ pasto, alimenti, calorie, proteine, carboidrati, grassi });
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
    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="cancel-goals-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 class="text-xl font-bold text-gray-900 truncate">Obiettivi Nutrizionali</h1>
        </header>
        <main class="p-4 space-y-4 bg-gray-50 pb-24 safe-pb">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Calorie Giornaliere</label>
                    <input type="number" id="g-cal" value="${currentGoals.calorie}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                </div>
                <div class="pt-2 border-t border-gray-100">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Macronutrienti (in grammi)</p>
                    <div class="flex space-x-2">
                        <div class="flex-1">
                            <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Proteine</label>
                            <input type="number" id="g-pro" value="${currentGoals.proteine}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                        </div>
                        <div class="flex-1">
                            <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Carboidrati</label>
                            <input type="number" id="g-carbo" value="${currentGoals.carbo}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                        </div>
                        <div class="flex-1">
                            <label class="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Grassi</label>
                            <input type="number" id="g-fat" value="${currentGoals.grassi}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-center font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                        </div>
                    </div>
                </div>
            </div>
            <button id="save-goals-btn" class="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg active:scale-95 transition-transform mt-6">
                Salva Obiettivi
            </button>
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
            alert("Inserisci valori validi superiori a zero.");
        }
    });
}

// --- RENDER MODALE STATISTICHE FIAMMA ---
export function renderStreakModal(stats) {
    const modalId = 'streak-modal';
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm opacity-0 transition-opacity duration-300";

    const message = stats.activeToday
        ? "Sei on fire! 🔥 Non spezzare la catena!"
        : "Accendi la fiamma oggi! Registra un pasto o un allenamento.";

    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl transform scale-95 transition-transform duration-300 relative border border-gray-100">
            <button id="close-streak-btn" class="absolute top-4 right-4 z-50 text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full active:scale-90 transition-transform">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            <div class="text-center mb-8 mt-4">
                <div class="text-7xl mb-4 ${stats.activeToday ? 'animate-bounce drop-shadow-md' : 'grayscale opacity-50'}">🔥</div>
                <h2 class="text-2xl font-black text-gray-900 tracking-tight">La Tua Costanza</h2>
                <p class="text-sm font-medium text-gray-500 mt-2 px-4 leading-relaxed">${message}</p>
            </div>
            
            <div class="space-y-3">
                <div class="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <span class="font-bold text-orange-800">Fiamma Attuale</span>
                    <span class="text-2xl font-black text-orange-600">${stats.currentStreak} <span class="text-sm font-bold text-orange-400">gg</span></span>
                </div>
                <div class="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <span class="font-bold text-gray-700">Record Personale</span>
                    <span class="text-xl font-black text-gray-900">🏆 ${stats.longestStreak} <span class="text-sm font-bold text-gray-400">gg</span></span>
                </div>
                <div class="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <span class="font-bold text-gray-700">Giorni Totali</span>
                    <span class="text-xl font-black text-gray-900">📅 ${stats.totalDaysActive} <span class="text-sm font-bold text-gray-400">gg</span></span>
                </div>
            </div>
            
            <button id="awesome-btn" class="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg mt-8 active:scale-95 transition-transform">
                Continua Così!
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // 1. AGGIUNGI QUESTA RIGA PER BLOCCARE LO SCROLL:
    document.body.style.overflow = 'hidden';

    // Animazione di entrata
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    });

    const closeModal = () => {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95'); // (o translate-y-full a seconda della modale)
        setTimeout(() => {
            modal.remove();

            // 2. AGGIUNGI QUESTA RIGA PER RIPRISTINARLO:
            document.body.style.overflow = '';

        }, 300);
    };

    document.getElementById('close-streak-btn').addEventListener('click', closeModal);
    document.getElementById('awesome-btn').addEventListener('click', closeModal);
}

// --- RENDER MODALE ANTEPRIMA PREFERITO ---
export function renderFavoritePreviewModal(favMeal, onConfirm, onUnfavorite) {
    const modalId = 'fav-preview-modal';
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm opacity-0 transition-opacity duration-300";

    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl transform scale-95 transition-transform duration-300 relative border border-gray-100">
            
            <button id="remove-fav-btn" class="absolute top-4 left-4 z-50 text-yellow-500 hover:text-yellow-600 bg-yellow-50 p-2 rounded-full active:scale-90 transition-transform">
                <svg class="w-5 h-5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.898 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
            </button>

            <button id="close-fav-preview" class="absolute top-4 right-4 z-50 text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full active:scale-90 transition-transform">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            <div class="mt-2 mb-6 text-center">
                <span class="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded uppercase tracking-wider">${favMeal.pasto}</span>
                <h2 class="text-2xl font-black text-gray-900 mt-3 leading-tight">${favMeal.alimenti}</h2>
            </div>
            
            <div class="space-y-4 mb-8">
                <div class="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span class="text-xs font-bold text-gray-500 uppercase">Calorie</span>
                    <span class="text-xl font-black text-gray-900">${Number(favMeal.calorie).toFixed(1)} kcal</span>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <div class="bg-blue-50 p-2 rounded-xl flex flex-col items-center border border-blue-100">
                        <p class="text-[10px] font-bold text-blue-500 uppercase">Pro</p>
                        <p class="text-sm font-black text-blue-700">${Number(favMeal.proteine).toFixed(1)}g</p>
                    </div>
                    <div class="bg-green-50 p-2 rounded-xl flex flex-col items-center border border-green-100">
                        <p class="text-[10px] font-bold text-green-500 uppercase">Car</p>
                        <p class="text-sm font-black text-green-700">${Number(favMeal.carboidrati).toFixed(1)}g</p>
                    </div>
                    <div class="bg-yellow-50 p-2 rounded-xl flex flex-col items-center border border-yellow-100">
                        <p class="text-[10px] font-bold text-yellow-600 uppercase">Fat</p>
                        <p class="text-sm font-black text-yellow-700">${Number(favMeal.grassi).toFixed(1)}g</p>
                    </div>
                </div>
            </div>

            <button id="confirm-fav-btn" class="w-full bg-blue-600 text-white font-black text-[15px] py-4 rounded-[18px] shadow-lg active:scale-95 transition-transform flex justify-center items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                Aggiungi a Oggi
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // 1. AGGIUNGI QUESTA RIGA PER BLOCCARE LO SCROLL:
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    });

    const closeModal = () => {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95'); // (o translate-y-full a seconda della modale)
        setTimeout(() => {
            modal.remove();

            // 2. AGGIUNGI QUESTA RIGA PER RIPRISTINARLO:
            document.body.style.overflow = '';

        }, 300);
    };

    document.getElementById('close-fav-preview').addEventListener('click', closeModal);

    document.getElementById('confirm-fav-btn').addEventListener('click', () => {
        closeModal();
        onConfirm();
    });

    // Evento per la rimozione del preferito
    document.getElementById('remove-fav-btn').addEventListener('click', () => {
        if (window.confirm("Vuoi davvero rimuovere questo pasto dai Preferiti?")) {
            closeModal();
            onUnfavorite();
        }
    });
}

export function renderFavoritesPage(container, favorites, onBack, onAddFavoriteClick) {
    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="back-fav-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 class="text-xl font-bold text-gray-900 truncate">I Miei Preferiti</h1>
        </header>
        <main class="p-4 space-y-4 bg-gray-50 pb-24 safe-pb min-h-screen">
            ${favorites.length === 0 ? `
                <div class="text-center py-10 text-gray-500 font-medium">Nessun pasto preferito salvato.</div>
            ` : favorites.map(fav => `
                <button data-fav-id="${fav._id}" class="fav-meal-btn w-full bg-white border border-yellow-200 shadow-sm p-4 rounded-2xl text-left active:scale-95 transition-transform flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-gray-800 text-lg">${fav.alimenti}</h4>
                        <p class="text-[10px] bg-gray-100 text-gray-600 inline-block px-2 py-0.5 rounded mt-1">${fav.pasto}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-black text-gray-900">${Number(fav.calorie).toFixed(1)} kcal</p>
                    </div>
                </button>
            `).join('')}
        </main>
    `;
    document.getElementById('back-fav-btn').addEventListener('click', onBack);
    container.querySelectorAll('.fav-meal-btn').forEach(btn => btn.addEventListener('click', () => onAddFavoriteClick(btn.dataset.favId)));
}

// --- RENDER MODALE NUTRIZIONISTA AI (CARTE VERTICALI + IMPATTO MACRO) ---
export function renderAIModal(onAsk, onSaveMeal, cachedData = null, goals = null, consumate = null) {
    const modalId = 'ai-modal';
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = "fixed inset-0 z-[100] flex items-end justify-center bg-gray-900/60 backdrop-blur-sm opacity-0 transition-opacity duration-300";

    modal.innerHTML = `
        <div class="bg-white w-full max-w-md rounded-t-[2rem] p-6 shadow-2xl transform translate-y-full transition-transform duration-300 flex flex-col h-[90vh]">
            <div class="flex justify-between items-center mb-6 flex-shrink-0">
                <h2 class="text-xl font-black text-gray-900 flex items-center gap-2">
                    <span class="text-indigo-600 text-2xl">✨</span> Nutrizionista AI
                </h2>
                <button id="close-ai-modal" class="text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full active:scale-90 transition-transform">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <div id="ai-content-area" class="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-10">
                
                <div id="ai-selection-view">
                    ${cachedData ? `
                    <div id="ai-cache-banner" class="mb-6 bg-indigo-50 p-5 rounded-3xl border border-indigo-100 flex flex-col items-center text-center shadow-inner">
                        <span class="text-3xl mb-2">✨</span>
                        <h3 class="text-lg font-black text-indigo-900 mb-1">Generazione in sospeso</h3>
                        <p class="text-xs font-medium text-indigo-700 mb-4">Hai già richiesto opzioni per: <b class="uppercase">${cachedData.type}</b>.</p>
                        
                        <button id="restore-ai-btn" class="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl text-[15px] transition-all active:scale-95 shadow-md mb-3 flex justify-center items-center gap-2">
                            Riprendi da dove eri
                        </button>
                        <button id="clear-ai-cache-btn" class="text-xs font-bold text-indigo-400 hover:text-indigo-600 p-2 active:scale-95 transition-transform">
                            Scarta e fai una nuova richiesta
                        </button>
                    </div>
                    ` : ''}

                    <div id="ai-new-request-form" class="${cachedData ? 'hidden' : ''}">
                        <p class="text-[15px] font-bold text-gray-700 mb-4">Per quale pasto ti serve un consiglio?</p>
                        <div class="grid grid-cols-2 gap-3 mb-5">
                            <button class="ai-meal-type-btn bg-gray-50 border border-gray-200 rounded-2xl py-4 font-black text-gray-700 active:scale-95 transition-all" data-type="Colazione">Colazione</button>
                            <button class="ai-meal-type-btn bg-gray-50 border border-gray-200 rounded-2xl py-4 font-black text-gray-700 active:scale-95 transition-all" data-type="Pranzo">Pranzo</button>
                            <button class="ai-meal-type-btn bg-gray-50 border border-gray-200 rounded-2xl py-4 font-black text-gray-700 active:scale-95 transition-all" data-type="Cena">Cena</button>
                            <button class="ai-meal-type-btn bg-gray-50 border border-gray-200 rounded-2xl py-4 font-black text-gray-700 active:scale-95 transition-all" data-type="Spuntino">Spuntino</button>
                        </div>
                        
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ingrediente base (opzionale)</label>
                        <input type="text" id="ai-extra-input" placeholder="Es. Voglio usare le uova..." class="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-[15px] font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all mb-4">
                    </div>
                </div>

                <div id="ai-loading-view" class="hidden flex-col items-center justify-center py-10 h-full">
                    <div class="text-5xl mb-6 animate-bounce">🤔</div>
                    <p class="text-gray-500 font-bold animate-pulse text-center leading-relaxed">Sto incastrando i tuoi macro<br>e spulciando il tuo storico...</p>
                </div>

                <div id="ai-results-view" class="hidden flex-col">
                    <p class="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-4">Opzioni Trovate</p>
                    <div id="ai-list" class="flex flex-col space-y-5">
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // FIX SCROLL iOS: applichiamo overflow hidden sia ad html che a body
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('translate-y-full');
    });

    const closeModal = () => {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('translate-y-full');
        setTimeout(() => {
            modal.remove();
            // RIPRISTINO SCROLL
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        }, 300);
    };

    document.getElementById('close-ai-modal').addEventListener('click', closeModal);

    if (cachedData && document.getElementById('restore-ai-btn')) {
        document.getElementById('restore-ai-btn').addEventListener('click', () => {
            document.getElementById('ai-selection-view').classList.add('hidden');
            document.getElementById('ai-results-view').classList.remove('hidden');
            renderCards(cachedData.recommendations, cachedData.type);
        });
        document.getElementById('clear-ai-cache-btn').addEventListener('click', () => {
            localStorage.removeItem('cachedAIRecommendations');
            document.getElementById('ai-cache-banner').classList.add('hidden');
            document.getElementById('ai-new-request-form').classList.remove('hidden');
        });
    }

    let selectedType = null;
    modal.querySelectorAll('.ai-meal-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedType = e.currentTarget.dataset.type;
            const extra = document.getElementById('ai-extra-input').value.trim();
            const question = `Pasto: ${selectedType}. ${extra ? 'Voglio usare per forza: ' + extra : ''}`;

            document.getElementById('ai-selection-view').classList.add('hidden');
            document.getElementById('ai-loading-view').classList.remove('hidden', 'flex-col');
            document.getElementById('ai-loading-view').classList.add('flex', 'flex-col');

            onAsk(question, (recommendations) => {
                document.getElementById('ai-loading-view').classList.add('hidden');
                document.getElementById('ai-results-view').classList.remove('hidden');
                renderCards(recommendations, selectedType);
            });
        });
    });

    function renderCards(recommendations, tipoPasto) {
        const listContainer = document.getElementById('ai-list');
        listContainer.innerHTML = '';

        let currentViews = recommendations.map(() => 'main');

        recommendations.forEach((rec, idx) => {
            const card = document.createElement('div');
            // CAMBIATO: Larghezza piena (w-full), altezza dinamica, stile classico
            card.className = "w-full bg-white border border-gray-200 rounded-3xl shadow-sm p-5 flex flex-col relative";

            const renderCardContent = (viewState) => {
                const data = viewState === 'main' ? rec : rec.variante;
                const bgColor = viewState === 'main' ? 'bg-indigo-50 text-indigo-700' : 'bg-orange-50 text-orange-700';
                const toggleText = viewState === 'main' ? '🔄 Variante' : '🔙 Originale';

                // Calcolo Impatto
                let impactHtml = '';
                if (goals && consumate) {
                    const newCal = consumate.calorie + data.totaleCalorie;
                    const perc = Math.min(100, (newCal / goals.calorie) * 100);
                    const colorClass = newCal > goals.calorie ? 'bg-red-500' : 'bg-indigo-500';
                    const textClass = newCal > goals.calorie ? 'text-red-500' : 'text-indigo-600';

                    impactHtml = `
                        <div class="mt-2 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div class="flex justify-between items-center mb-1.5">
                                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Impatto Giornaliero</span>
                                <span class="text-xs font-black ${textClass}">${newCal.toFixed(0)} / ${goals.calorie} kcal</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div class="${colorClass} h-1.5 rounded-full transition-all" style="width: ${perc}%"></div>
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-[10px] font-black ${bgColor} px-2.5 py-1.5 rounded-lg uppercase tracking-wider">${viewState === 'main' ? 'Opzione ' + (idx + 1) : 'Variante ' + (idx + 1)}</span>
                        <button class="toggle-variant-btn text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl active:scale-95 transition-transform">${toggleText}</button>
                    </div>
                    
                    <h3 class="text-xl font-black text-gray-900 leading-tight mb-1">${data.nomePasto}</h3>
                    <p class="text-xs font-medium text-gray-500 mb-3 leading-snug">${data.messaggio}</p>

                    ${impactHtml}

                    <div class="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100 mb-4">
                        <div class="text-center"><p class="text-[9px] font-bold text-gray-400 uppercase">Kcal</p><p class="font-black text-gray-900 text-sm">${data.totaleCalorie}</p></div>
                        <div class="text-center"><p class="text-[9px] font-bold text-blue-400 uppercase">Pro</p><p class="font-black text-blue-700 text-sm">${data.totaleProteine}g</p></div>
                        <div class="text-center"><p class="text-[9px] font-bold text-green-500 uppercase">Car</p><p class="font-black text-green-700 text-sm">${data.totaleCarbo}g</p></div>
                        <div class="text-center"><p class="text-[9px] font-bold text-yellow-600 uppercase">Fat</p><p class="font-black text-yellow-700 text-sm">${data.totaleGrassi}g</p></div>
                    </div>

                    <div class="mb-5">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-1">Ingredienti</p>
                        <ul class="space-y-2">
                            ${data.ingredienti.map(ing => `
                                <li class="flex justify-between items-center text-[13px]">
                                    <span class="font-medium text-gray-700 pr-2">${ing.nome}</span>
                                    <span class="font-bold text-gray-900 flex-shrink-0">${ing.calorie} <span class="text-[10px] font-normal text-gray-400">kcal</span></span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <button class="save-ai-meal-btn w-full bg-gray-900 text-white font-black text-[15px] py-4 rounded-2xl shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mt-auto">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        Salva nel Diario
                    </button>
                `;
            };

            card.innerHTML = renderCardContent(currentViews[idx]);

            card.addEventListener('click', (e) => {
                if (e.target.closest('.toggle-variant-btn')) {
                    currentViews[idx] = currentViews[idx] === 'main' ? 'variant' : 'main';
                    card.innerHTML = renderCardContent(currentViews[idx]);
                } else if (e.target.closest('.save-ai-meal-btn')) {
                    const dataToSave = currentViews[idx] === 'main' ? rec : rec.variante;
                    const finalMeal = {
                        pasto: tipoPasto, alimenti: dataToSave.nomePasto, calorie: dataToSave.totaleCalorie,
                        proteine: dataToSave.totaleProteine, carboidrati: dataToSave.totaleCarbo,
                        grassi: dataToSave.totaleGrassi, ingredienti: dataToSave.ingredienti
                    };
                    onSaveMeal(finalMeal);
                    closeModal();
                }
            });

            listContainer.appendChild(card);
        });
    }
}

// --- RENDER STATISTICHE GIORNALIERE (STORICO) ---
export function renderDailyNutritionStats(container, dateStr, meals, totals, goals, onBack) {
    const pPro = Math.min(100, (totals.pro / goals.proteine) * 100);
    const pCar = Math.min(100, (totals.carbo / goals.carbo) * 100);
    const pFat = Math.min(100, (totals.grassi / goals.grassi) * 100);

    container.innerHTML = `
        <header class="bg-white shadow-sm pt-14 pb-4 px-4 sticky top-0 z-10 flex items-center">
            <button id="back-daily-stats-btn" class="mr-3 text-gray-500 hover:text-gray-900 p-2 -ml-2 active:scale-90 transition-transform">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 class="text-xl font-bold text-gray-900 truncate capitalize">${dateStr}</h1>
        </header>
        <main class="p-4 space-y-5 pb-24 safe-pb bg-gray-50">
            
            <div class="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Ripartizione Macronutrienti</h3>
                <div class="relative h-48 w-full flex justify-center">
                    <canvas id="macroDonutChart"></canvas>
                </div>
            </div>

            <div class="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 space-y-4">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Completamento Obiettivi</h3>
                
                <div>
                    <div class="flex justify-between text-xs font-bold mb-1"><span class="text-blue-500">Proteine</span><span class="text-gray-600">${totals.pro.toFixed(0)} / ${goals.proteine}g</span></div>
                    <div class="w-full bg-gray-100 rounded-full h-2"><div class="bg-blue-500 h-2 rounded-full" style="width: ${pPro}%"></div></div>
                </div>
                <div>
                    <div class="flex justify-between text-xs font-bold mb-1"><span class="text-green-500">Carboidrati</span><span class="text-gray-600">${totals.carbo.toFixed(0)} / ${goals.carbo}g</span></div>
                    <div class="w-full bg-gray-100 rounded-full h-2"><div class="bg-green-500 h-2 rounded-full" style="width: ${pCar}%"></div></div>
                </div>
                <div>
                    <div class="flex justify-between text-xs font-bold mb-1"><span class="text-yellow-500">Grassi</span><span class="text-gray-600">${totals.grassi.toFixed(0)} / ${goals.grassi}g</span></div>
                    <div class="w-full bg-gray-100 rounded-full h-2"><div class="bg-yellow-500 h-2 rounded-full" style="width: ${pFat}%"></div></div>
                </div>
            </div>

            <div class="pt-2">
                <h3 class="text-xs font-bold text-gray-800 uppercase tracking-widest mb-3 px-1">Diario Pasti</h3>
                <div class="space-y-3">
                    ${meals.map(meal => `
                        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <h4 class="text-[15px] font-bold text-gray-800">${meal.alimenti}</h4>
                            <div class="flex justify-between items-center mt-2">
                                <span class="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md uppercase tracking-wider">${meal.pasto}</span>
                                <span class="font-black text-gray-900">${Number(meal.calorie).toFixed(0)} kcal</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
        </main>
    `;

    document.getElementById('back-daily-stats-btn').addEventListener('click', onBack);

    // Crea il grafico a ciambella usando Chart.js
    const ctx = document.getElementById('macroDonutChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Proteine (g)', 'Carboidrati (g)', 'Grassi (g)'],
            datasets: [{
                data: [totals.pro, totals.carbo, totals.grassi],
                backgroundColor: ['#3b82f6', '#22c55e', '#eab308'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { size: 10, weight: 'bold' } } },
                tooltip: { backgroundColor: '#111827', padding: 10 }
            }
        }
    });
}