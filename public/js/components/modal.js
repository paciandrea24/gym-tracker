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

// --- FUNZIONE TOP SECRET (NON SBIRCIARE!) ---
export function showLevelUpSurprise(rankName, icon, count) {
    return new Promise((resolve) => {
        const modalId = 'level-up-surprise-modal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = "fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-md opacity-0 transition-opacity duration-500 overflow-hidden";

        let fxHtml = '';
        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-400', 'bg-pink-500', 'bg-white'];
        for (let i = 0; i < 60; i++) {
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            const duration = 2.5 + Math.random() * 2;
            const color = colors[Math.floor(Math.random() * colors.length)];
            fxHtml += `<div class="absolute top-[-10%] w-3 h-3 ${color} rounded-sm opacity-90" style="left: ${left}%; animation: fallFX ${duration}s linear ${delay}s infinite;"></div>`;
        }

        modal.innerHTML = `
            <style>
                @keyframes fallFX { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
                @keyframes epicGlow { 0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(239,68,68,0.4)); } 50% { transform: scale(1.03); filter: drop-shadow(0 0 40px rgba(239,68,68,0.9)); } }
            </style>
            ${fxHtml}
            <div class="bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-red-500/50 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl transform scale-50 transition-transform duration-500 flex flex-col items-center text-center relative z-10" style="animation: epicGlow 2s infinite ease-in-out">
                <div class="text-[80px] mb-2 animate-bounce drop-shadow-2xl">${icon}</div>
                <h2 class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-yellow-400 mb-1 tracking-tighter uppercase italic">Level UP!</h2>
                <p class="text-lg font-bold text-gray-300 mb-6">Traguardo: ${count} alimenti!</p>
                
                <div class="bg-black/40 w-full p-5 rounded-2xl border border-white/10 mb-8 backdrop-blur-sm">
                    <p class="text-[10px] text-red-400 uppercase tracking-widest mb-1.5 font-bold">Nuovo Titolo Sbloccato</p>
                    <p class="text-2xl font-black text-white leading-tight">${rankName}</p>
                </div>

                <button id="close-surprise-btn" class="w-full bg-red-600 hover:bg-red-500 text-white font-black text-lg py-4 rounded-2xl active:scale-95 transition-transform shadow-[0_0_25px_rgba(220,38,38,0.6)]">
                    RISCATTA
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200, 100, 500]);

        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('div').classList.remove('scale-50');
        });

        document.getElementById('close-surprise-btn').addEventListener('click', () => {
            modal.classList.add('opacity-0');
            modal.querySelector('div').classList.add('scale-50');
            setTimeout(() => { modal.remove(); resolve(); }, 400);
        });
    });
}