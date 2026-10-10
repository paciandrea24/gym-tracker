// public/js/components/dayClosure.js
// Card "Come chiudi di solito": l'ultimo giorno arrivato allo stesso punto con macro simili a oggi
// e i pasti con cui è finito. Si spuntano i pasti da registrare oggi; il totale previsto
// si aggiorna con la selezione.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const intero = (n) => Math.round(Number(n) || 0).toLocaleString('it-IT');

// 'YYYY-MM-DD' → "ieri" / "venerdì 3 ottobre"
export function etichettaGiorno(giorno, oggi = new Date()) {
    const d = new Date(`${giorno}T12:00:00`);
    const ieri = new Date(oggi);
    ieri.setDate(ieri.getDate() - 1);
    if (d.toDateString() === ieri.toDateString()) return 'ieri';
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Totali della giornata se oltre a quanto già mangiato si aggiungono i pasti scelti
export function proiezione(consumate, pasti) {
    const t = { calorie: consumate.calorie, proteine: consumate.proteine, carbo: consumate.carbo, grassi: consumate.grassi };
    for (const p of pasti) {
        t.calorie += Number(p.calorie) || 0;
        t.proteine += Number(p.proteine) || 0;
        t.carbo += Number(p.carboidrati) || 0;
        t.grassi += Number(p.grassi) || 0;
    }
    return t;
}

function rigaPasto(p, i) {
    return `
        <label class="pasto-sugg flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-colors" data-i="${i}">
            <input type="checkbox" checked class="w-5 h-5 flex-shrink-0 accent-emerald-600">
            <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500">${esc(p.pasto)}</p>
                <p class="font-bold text-gray-800 leading-tight">${esc(p.alimenti)}</p>
            </div>
            <span class="text-sm font-black text-gray-900 whitespace-nowrap">${intero(p.calorie)} kcal</span>
        </label>`;
}

function cardSuggerimento(s, idx) {
    const uguali = s.giorniUguali.length;
    const q = s.aQuelPunto;
    return `
        <div class="sugg-card bg-white rounded-2xl shadow-sm border border-gray-100 p-4" data-idx="${idx}">
            <p class="text-[15px] font-black text-gray-900">Come ${esc(etichettaGiorno(s.giorno))}</p>
            <p class="text-[11px] font-bold text-gray-400 mt-0.5">A quel punto: ${intero(q.calorie)} kcal · P ${intero(q.proteine)} · C ${intero(q.carboidrati)} · G ${intero(q.grassi)}</p>
            ${uguali > 0 ? `<p class="text-[11px] font-bold text-emerald-600 mt-0.5">Finito così anche ${uguali === 1 ? 'un altro giorno' : `altri ${uguali} giorni`}</p>` : ''}
            <div class="mb-3"></div>
            <div class="space-y-2">${s.pasti.map(rigaPasto).join('')}</div>
            <p class="sugg-proiezione text-[11px] font-bold text-gray-500 mt-3 leading-relaxed"></p>
            <button class="sugg-add w-full mt-3 bg-gray-900 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"></button>
        </div>`;
}

// el: contenitore nella dashboard. onAggiungi(pasti): registra oggi i pasti scelti.
export function renderChiusuraGiornata(el, suggerimenti, { consumate, goals, onAggiungi }) {
    if (!el) return;
    if (!suggerimenti || suggerimenti.length === 0) { el.innerHTML = ''; return; }

    el.innerHTML = `
        <div class="mt-8">
            <h2 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Come chiudi di solito</h2>
            <p class="text-[12px] font-medium text-gray-500 mt-1 mb-3">L'ultima giornata con macro simili a oggi a questo punto, e come l'hai finita.</p>
            <div class="space-y-3">${suggerimenti.map(cardSuggerimento).join('')}</div>
        </div>`;

    el.querySelectorAll('.sugg-card').forEach(card => {
        const s = suggerimenti[Number(card.dataset.idx)];
        const righe = [...card.querySelectorAll('.pasto-sugg')];
        const bottone = card.querySelector('.sugg-add');
        const scelti = () => righe.filter(r => r.querySelector('input').checked).map(r => s.pasti[Number(r.dataset.i)]);

        const aggiorna = () => {
            for (const r of righe) {
                const on = r.querySelector('input').checked;
                r.classList.toggle('bg-emerald-50', on);
                r.classList.toggle('border-emerald-200', on);
                r.classList.toggle('bg-gray-50', !on);
                r.classList.toggle('border-gray-100', !on);
            }
            const lista = scelti();
            const t = proiezione(consumate, lista);
            const oltre = t.calorie > Number(goals.calorie);
            card.querySelector('.sugg-proiezione').innerHTML = `
                Chiuderesti a <span class="${oltre ? 'text-red-500' : 'text-gray-900'} font-black">${intero(t.calorie)}</span> / ${intero(goals.calorie)} kcal<br>
                P ${intero(t.proteine)}/${goals.proteine}g · C ${intero(t.carbo)}/${goals.carbo}g · G ${intero(t.grassi)}/${goals.grassi}g`;
            bottone.disabled = lista.length === 0;
            bottone.textContent = lista.length === s.pasti.length && lista.length > 1
                ? `Aggiungi tutti (${lista.length})`
                : `Aggiungi (${lista.length})`;
        };

        righe.forEach(r => r.querySelector('input').addEventListener('change', aggiorna));
        bottone.addEventListener('click', () => {
            const lista = scelti();
            if (lista.length > 0) onAggiungi(lista);
        });
        aggiorna();
    });
}
