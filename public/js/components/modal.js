// public/js/components/modal.js
// Finestre dell'app al posto di alert/confirm/prompt del sistema, e la scelta del prodotto da
// scalare dalla dispensa. Niente emoji: icone SVG in un cerchio; conferma nera, rossa se elimina.

import { icona } from './icons.js?v=40';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BTN_ANNULLA = 'flex-1 bg-white border border-gray-200 text-gray-800 font-bold py-3.5 rounded-2xl active:scale-95 transition-transform';

// --- SCELTA DEL PRODOTTO DA SCALARE (registrando un pasto) ---
// options: [{ _id, nome, grammiRimasti }]; risolve con l'_id scelto o null ("non toglierlo")
export function showChoiceModal({ title, message, options, allowNone = true, nota = '' }) {
    return new Promise((resolve) => {
        const modalId = 'choice-dialog-modal';
        document.getElementById(modalId)?.remove();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = "fixed inset-0 z-[99999] flex items-end justify-center bg-gray-900/60 backdrop-blur-sm opacity-0 transition-opacity duration-300";
        modal.innerHTML = `
            <div class="bg-white w-full max-w-md rounded-t-[2rem] p-6 shadow-2xl flex flex-col gap-3 max-h-[75vh] overflow-y-auto [&::-webkit-scrollbar]:hidden" style="padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));">
                <div class="text-center">
                    <h2 class="text-lg font-black text-gray-900">${esc(title)}</h2>
                    <p class="text-[14px] font-medium text-gray-500 mt-0.5">${esc(message)}</p>
                </div>
                <div class="bg-white px-4 rounded-[20px] border border-gray-100 divide-y divide-gray-100">
                    ${options.map(opt => `
                        <button data-id="${esc(opt._id)}" class="choice-opt w-full flex justify-between items-center gap-2 py-3.5 text-left active:opacity-60">
                            <span class="flex-1 min-w-0 font-bold text-gray-800 leading-tight">${esc(opt.nome)}</span>
                            <span class="text-[13px] font-bold text-gray-400 flex-shrink-0">${Math.round(Number(opt.grammiRimasti) || 0)} g</span>
                        </button>`).join('')}
                </div>
                ${allowNone ? `<button id="choice-none" class="w-full bg-white border border-gray-200 text-gray-800 font-bold text-[15px] py-3.5 rounded-2xl active:scale-95 transition-transform">Non toglierlo dalla dispensa</button>` : ''}
                ${nota ? `<p class="text-center text-[12px] font-semibold text-gray-400">${esc(nota)}</p>` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.remove('opacity-0'));

        const closeAndResolve = (val) => {
            modal.classList.add('opacity-0');
            setTimeout(() => { modal.remove(); resolve(val); }, 250);
        };
        modal.querySelectorAll('.choice-opt').forEach(btn => btn.addEventListener('click', () => closeAndResolve(btn.dataset.id)));
        if (allowNone) document.getElementById('choice-none').addEventListener('click', () => closeAndResolve(null));
    });
}

// --- AVVISI E CONFERME ---
// type: alert | confirm | prompt | error | success. pericolo: la conferma elimina o toglie (rossa).
// confirm risolve true/false, prompt il testo scritto (false se annullato), gli altri true.
const ICONE = {
    alert: () => ['bg-gray-100 text-gray-600', icona.info('w-6 h-6')],
    confirm: () => ['bg-gray-100 text-gray-600', icona.domanda('w-6 h-6')],
    prompt: () => ['bg-gray-100 text-gray-600', icona.matita('w-6 h-6')],
    error: () => ['bg-red-50 text-red-500', icona.avviso('w-6 h-6')],
    success: () => ['bg-green-50 text-green-600', icona.spunta('w-6 h-6')],
    pericolo: () => ['bg-red-50 text-red-500', icona.avviso('w-6 h-6')]
};

export function showModal({ type = 'alert', title = '', message = '', confirmText = 'OK', cancelText = 'Annulla', inputValue = '', pericolo = false }) {
    return new Promise((resolve) => {
        const modalId = 'custom-dialog-modal';
        document.getElementById(modalId)?.remove();

        const isPrompt = type === 'prompt';
        const isConfirm = type === 'confirm' || isPrompt;
        const [coloreIcona, svg] = (ICONE[pericolo ? 'pericolo' : type] || ICONE.alert)();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = "fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm opacity-0 transition-opacity duration-300";
        modal.innerHTML = `
            <div class="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl transform scale-95 transition-transform duration-300 flex flex-col border border-gray-100">
                <div class="text-center mb-5">
                    <span class="w-12 h-12 rounded-full ${coloreIcona} inline-flex items-center justify-center mb-3">${svg}</span>
                    ${title ? `<h2 class="text-lg font-black text-gray-900 mb-1 leading-tight">${title}</h2>` : ''}
                    <p class="text-[14px] font-medium text-gray-500 leading-snug whitespace-pre-wrap">${message}</p>
                </div>

                ${isPrompt ? `<input type="text" id="custom-modal-input" value="${esc(inputValue)}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-center text-lg font-black text-gray-800 mb-5 focus:ring-2 focus:ring-gray-900 outline-none">` : ''}

                <div class="flex gap-2">
                    ${isConfirm ? `<button id="custom-modal-cancel" class="${BTN_ANNULLA}">${cancelText}</button>` : ''}
                    <button id="custom-modal-confirm" class="flex-1 ${pericolo ? 'bg-red-600' : 'bg-gray-900'} text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform shadow-md">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('div').classList.remove('scale-95');
            if (isPrompt) {
                const inp = document.getElementById('custom-modal-input');
                inp.focus();
                inp.setSelectionRange(0, inp.value.length); // Seleziona il testo di default
            }
        });

        const closeAndResolve = (val) => {
            modal.classList.add('opacity-0');
            modal.querySelector('div').classList.add('scale-95');
            setTimeout(() => {
                modal.remove();
                resolve(val);
            }, 300);
        };

        document.getElementById('custom-modal-confirm').addEventListener('click', () => {
            if (isPrompt) closeAndResolve(document.getElementById('custom-modal-input').value);
            else closeAndResolve(true);
        });
        if (isConfirm) document.getElementById('custom-modal-cancel').addEventListener('click', () => closeAndResolve(false));
    });
}
