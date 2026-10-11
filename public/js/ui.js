import { formatDate, getWeekLabel } from './utils.js?v=40';
import { etichettaPorzione, pastoPerOra } from './services/mealPrepService.js?v=40';
import { cercaProdottoOFF } from './services/pantryService.js?v=40';
import { campoCodiceHtml, collegaCampoCodice } from './components/barcodeField.js?v=40';
import * as modal from './components/modal.js?v=40';
import { icona } from './components/icons.js?v=40';
import { intero, macroColonne, macroTesto, chiaveGiorno, lunediDi, nomeGiorno, nomeSettimana, ripartizioneCalorie } from './components/format.js?v=40';
import { apriFoglio } from './components/sheet.js?v=40';
import { ordinaPerUso, leggiUsi } from './services/preferitiLogic.js?v=40';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BTN_PRINCIPALE = 'w-full bg-gray-900 text-white font-black text-[15px] py-4 rounded-2xl shadow-[0_8px_20px_rgb(0,0,0,0.15)] active:scale-95 transition-transform';

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
export function totaliPasti(pasti) {
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
export function riquadroRiepilogo(t, goals, { titolo, testoSotto }) {
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

// "250 g · " per un ingrediente o una porzione di meal prep, "Piatto intero · " per un totale senza
// grammi; vuoto se i grammi non si sanno
function quantitaIngrediente(ing) {
    if (ing.prepId) {
        if (ing.prepGrammi > 0) return `${intero(ing.prepGrammi)} g · `;
        if (ing.grammi > 0) return `${intero(ing.grammi)} g · `;
        return ing.prepPorzioni > 0 ? `${etichettaPorzione(ing)} · ` : '';
    }
    if (ing.piattoIntero) return 'Piatto intero · ';
    return ing.grammi > 0 ? `${intero(ing.grammi)} g · ` : '';
}

// --- RENDER NUTRIZIONE (LIVE SCANNER E CAROSELLO) ---
// giorno ('YYYY-MM-DD' dei dati) va in data-oggi: dopo la mezzanotte app.js ricarica la schermata
export function renderNutritionDashboard(container, { giorno, mealsData, goals, currentTab, onTabSwitch, onMicClick, onManualClick, onEditGoals, onMealClick, onScanClick, onCloseScanner, onAskAI, onDailyHistoryClick, onExportCSV }) {
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

        // Media dei giorni con pasti, oggi compreso: si aggiorna appena si aggiunge qualcosa
        // (scelto dall'utente; di giorno è più bassa perché oggi non è finito, e la riga lo dice)
        const mediaSettimana = (chiavi) => {
            const somma = totaliPasti(chiavi.flatMap(k => giorni.get(k)));
            const m = Object.fromEntries(Object.entries(somma).map(([k, v]) => [k, v / chiavi.length]));
            const colonna = (nome, colore, v, obiettivo) => `<div><p class="text-[11px] font-bold ${colore}">${nome}</p><p class="font-black text-[14px]">${intero(v)} <span class="text-[11px] font-normal text-gray-400">/ ${obiettivo} g</span></p></div>`;
            return `
                <div class="bg-gray-900 text-white rounded-2xl p-4">
                    <div class="flex justify-between items-baseline gap-2">
                        <p class="text-[12px] font-bold text-gray-400">Media al giorno</p>
                        <p><span class="text-xl font-black">${intero(m.calorie)}</span> <span class="text-[12px] text-gray-400">/ ${goals.calorie} kcal</span></p>
                    </div>
                    ${chiavi.includes(oggi) ? `<p class="text-[12px] font-semibold text-gray-400">${chiavi.length} ${chiavi.length === 1 ? 'giorno' : 'giorni'}, oggi compreso</p>` : ''}
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
        
        <main data-oggi="${giorno}" class="p-4 space-y-4 pb-24 safe-pb bg-gray-50">
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
    document.querySelector('.m-modo-btn[data-modo="per100"]')?.click(); // un prodotto ha i valori ogni 100 g
    document.getElementById('m-peso').focus();
    al.dispatchEvent(new Event('input', { bubbles: true })); // aggiorna l'anteprima dei valori
}

// piattoIntero: si può scegliere "Piatto intero" (calorie e macro di quello che si è mangiato, senza
// grammi), per i piatti di cui si sa solo il totale: una stima, il panino del bar, il ristorante.
// Nel meal prep no: gli ingredienti crudi servono coi grammi.
export function renderManualMealForm(container, onSave, onCancel, { piattoIntero = true } = {}) {
    const iniziale = pastoPerOra(new Date().getHours());
    let modo = 'per100';
    const classiModo = (attivo) => `m-modo-btn flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${attivo ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`;
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
                ${piattoIntero ? `
                    <div class="flex bg-gray-100 p-1 rounded-xl">
                        <button type="button" data-modo="per100" class="${classiModo(true)}">Ogni 100 g</button>
                        <button type="button" data-modo="intero" class="${classiModo(false)}">Piatto intero</button>
                    </div>` : ''}
                <div id="m-peso-box">
                    <label for="m-peso" class="block text-xs font-semibold text-gray-400 uppercase mb-2">Grammi mangiati</label>
                    <input type="number" inputmode="decimal" step="any" id="m-peso" placeholder="es. 150" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                </div>
                <div class="pt-2 border-t border-gray-100">
                    <p id="m-valori-titolo" class="text-xs font-semibold text-gray-400 uppercase mb-2">Valori ogni 100 g</p>
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
        if (modo === 'intero') {
            return { peso: 0, cal100: 0, calorie: leggi('m-cal-100'), proteine: leggi('m-pro-100'), carboidrati: leggi('m-carbo-100'), grassi: leggi('m-fat-100') };
        }
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
        if (modo === 'intero') {
            $('m-anteprima').innerHTML = v.calorie > 0
                ? `<p class="text-[12px] font-bold text-gray-500">Piatto intero</p>
                   <p class="text-gray-900"><span class="text-xl font-black">${intero(v.calorie)}</span> <span class="text-sm font-bold text-gray-400">kcal</span></p>
                   <p class="text-[12px] font-bold text-gray-600">${macroTesto(v, { breve: true })}</p>`
                : `<p class="text-[13px] font-semibold text-gray-400 py-1">Scrivi le calorie e i macro di quello che hai mangiato</p>`;
            return;
        }
        $('m-anteprima').innerHTML = v.peso > 0 && v.cal100 > 0
            ? `<p class="text-[12px] font-bold text-gray-500">Con ${intero(v.peso)} g</p>
               <p class="text-gray-900"><span class="text-xl font-black">${intero(v.calorie)}</span> <span class="text-sm font-bold text-gray-400">kcal</span></p>
               <p class="text-[12px] font-bold text-gray-600">${macroTesto(v, { breve: true })}</p>`
            : `<p class="text-[13px] font-semibold text-gray-400 py-1">Scrivi grammi e calorie per vedere quanto vale</p>`;
    };
    container.querySelector('main').addEventListener('input', anteprima);
    anteprima();
    container.querySelectorAll('.m-modo-btn').forEach(btn => btn.addEventListener('click', () => {
        modo = btn.dataset.modo;
        container.querySelectorAll('.m-modo-btn').forEach(b => { b.className = classiModo(b === btn); });
        $('m-peso-box').classList.toggle('hidden', modo === 'intero');
        $('m-valori-titolo').textContent = modo === 'intero' ? 'Valori del piatto' : 'Valori ogni 100 g';
        anteprima();
    }));

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
        if (modo === 'intero' && (!alimenti || v.calorie <= 0)) {
            return modal.showModal({ type: 'error', title: 'Manca qualcosa', message: 'Scrivi il nome del piatto e le sue calorie.' });
        }
        if (modo !== 'intero' && (!alimenti || v.peso <= 0 || v.cal100 <= 0)) {
            return modal.showModal({ type: 'error', title: 'Manca qualcosa', message: 'Scrivi alimento, grammi mangiati e calorie ogni 100 g.' });
        }
        onSave({ pasto, alimenti, calorie: v.calorie, proteine: v.proteine, carboidrati: v.carboidrati, grassi: v.grassi, grammi: v.peso });
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
        const ok = await modal.showModal({ type: 'confirm', title: 'Preferiti', message: `Togliere "${favMeal.alimenti}" dai preferiti?`, confirmText: 'Togli', cancelText: 'Annulla', pericolo: true });
        if (!ok) return;
        chiudi();
        onUnfavorite();
    });
}

// I più usati in cima (contatore nascosto in preferitiLogic.js)
export function renderFavoritesPage(container, favorites, onBack, onFavoriteClick) {
    favorites = ordinaPerUso(favorites, leggiUsi());
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

