// public/js/components/barcodeField.js
// Riga "Codice a barre + Cerca" dei form manuali (pasto, ingrediente meal prep, dispensa).
// Lo scanner resta solo fotocamera: il codice scritto a mano si inserisce qui.

import { normalizzaBarcode } from './scanner.js?v=25';

export function campoCodiceHtml() {
    return `
        <div class="barcode-field bg-blue-50/60 border border-blue-100 rounded-xl p-3">
            <label class="block text-xs font-semibold text-blue-500 uppercase mb-2">Codice a barre <span class="normal-case font-medium text-blue-300">(facoltativo)</span></label>
            <div class="flex gap-2">
                <input type="text" inputmode="numeric" autocomplete="off" enterkeyhint="search" placeholder="Scrivi le cifre"
                    class="barcode-input flex-1 min-w-0 bg-white border border-blue-200 rounded-xl px-3 py-2.5 font-bold tracking-widest text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                <button type="button" class="barcode-cerca bg-blue-600 text-white font-bold px-4 rounded-xl active:scale-95 transition-transform disabled:opacity-50">Cerca</button>
            </div>
            <p class="barcode-msg hidden text-xs font-bold mt-2"></p>
        </div>`;
}

// root: elemento che contiene la riga. onCodice(codice): async; può restituire
// { errore: '...' } o { ok: '...' } da mostrare sotto il campo.
export function collegaCampoCodice(root, onCodice) {
    const box = root?.querySelector('.barcode-field');
    if (!box) return;
    const input = box.querySelector('.barcode-input');
    const bottone = box.querySelector('.barcode-cerca');
    const msg = box.querySelector('.barcode-msg');

    const mostra = (testo, errore) => {
        msg.textContent = testo;
        msg.classList.toggle('hidden', !testo);
        msg.classList.toggle('text-red-500', !!errore);
        msg.classList.toggle('text-green-600', !errore);
    };

    const cerca = async () => {
        const codice = normalizzaBarcode(input.value);
        if (!codice) return mostra('Il codice deve avere da 8 a 14 cifre.', true);
        input.blur();
        bottone.disabled = true;
        bottone.textContent = '...';
        mostra('', false);
        try {
            const esito = await onCodice(codice);
            if (esito?.errore) mostra(esito.errore, true);
            else if (esito?.ok) mostra(esito.ok, false);
        } finally {
            bottone.disabled = false;
            bottone.textContent = 'Cerca';
        }
    };

    bottone.addEventListener('click', cerca);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); cerca(); }
    });
}
