// --- SISTEMA DI MODALI CUSTOM (Sostituisce gli Alert/Prompt di sistema) ---
export function showModal({ type = 'alert', title = '', message = '', confirmText = 'OK', cancelText = 'Annulla', inputValue = '' }) {
    return new Promise((resolve) => {
        const modalId = 'custom-dialog-modal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = "fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm opacity-0 transition-opacity duration-300";

        // Colori e Icone dinamiche
        let icon = '🔔';
        let colorClass = 'bg-blue-600';
        let focusClass = 'focus:ring-blue-500';

        if (type === 'confirm') { icon = '❓'; colorClass = 'bg-indigo-600'; focusClass = 'focus:ring-indigo-500'; }
        if (type === 'prompt') { icon = '✍️'; colorClass = 'bg-blue-600'; focusClass = 'focus:ring-blue-500'; }
        if (type === 'error') { icon = '❌'; colorClass = 'bg-red-500'; focusClass = 'focus:ring-red-500'; }
        if (type === 'success') { icon = '🎉'; colorClass = 'bg-green-500'; focusClass = 'focus:ring-green-500'; }

        const isPrompt = type === 'prompt';
        const isConfirm = type === 'confirm' || type === 'prompt';

        modal.innerHTML = `
            <div class="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl transform scale-95 transition-transform duration-300 flex flex-col border border-gray-100">
                <div class="text-center mb-6 mt-2">
                    <div class="text-5xl mb-4 drop-shadow-sm">${icon}</div>
                    ${title ? `<h2 class="text-xl font-black text-gray-900 mb-2 leading-tight">${title}</h2>` : ''}
                    <p class="text-[15px] font-medium text-gray-500 leading-snug whitespace-pre-wrap">${message}</p>
                </div>

                ${isPrompt ? `<input type="text" id="custom-modal-input" value="${inputValue}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-lg font-black text-gray-800 mb-6 ${focusClass} outline-none transition-shadow shadow-inner">` : ''}

                <div class="flex gap-3 mt-auto">
                    ${isConfirm ? `<button id="custom-modal-cancel" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl active:scale-95 transition-transform">${cancelText}</button>` : ''}
                    <button id="custom-modal-confirm" class="flex-1 ${colorClass} text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform shadow-md">${confirmText}</button>
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

        if (isConfirm) {
            document.getElementById('custom-modal-cancel').addEventListener('click', () => closeAndResolve(false));
        }
    });
}
