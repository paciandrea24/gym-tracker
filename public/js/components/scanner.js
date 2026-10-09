// public/js/components/scanner.js

let codeReader = null;
let lastScannedCode = null;
let scanCount = 0;

// Codice digitato a mano: tiene solo le cifre, accetta da 8 a 14 cifre (EAN-8 … GTIN-14)
export function normalizzaBarcode(testo) {
    const pulito = String(testo || '').replace(/[\s-]/g, '');
    return /^\d{8,14}$/.test(pulito) ? pulito : null;
}

// Aggiunge sotto il video (una volta sola) il campo per scrivere il codice a mano.
// Così funziona in ogni schermata che usa lo scanner, anche quando la fotocamera fa i capricci.
function preparaInserimentoManuale(videoElementId, onSuccess) {
    const video = document.getElementById(videoElementId);
    if (!video || !video.parentElement) return null;

    let row = video.parentElement.querySelector('.manual-barcode-row');
    if (!row) {
        row = document.createElement('div');
        row.className = 'manual-barcode-row mb-3';
        row.innerHTML = `
            <p class="manual-barcode-msg hidden text-center text-xs font-bold text-orange-300 mb-2"></p>
            <form class="flex gap-2">
                <input type="text" inputmode="numeric" autocomplete="off" placeholder="Oppure scrivi il codice"
                    class="flex-1 min-w-0 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 font-bold tracking-widest rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500">
                <button type="submit" class="bg-blue-600 text-white font-bold px-4 rounded-xl active:scale-95 transition-transform">Cerca</button>
            </form>`;
        // Sopra al video: sempre visibile, anche quando il riquadro finisce sotto la barra in basso
        video.insertAdjacentElement('beforebegin', row);
    }

    const input = row.querySelector('input');
    const msg = row.querySelector('.manual-barcode-msg');
    input.value = '';
    msg.classList.add('hidden');

    row.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const codice = normalizzaBarcode(input.value);
        if (!codice) {
            msg.textContent = 'Il codice deve avere da 8 a 14 cifre.';
            msg.classList.remove('hidden');
            return;
        }
        input.blur();
        stopScanner();
        onSuccess(codice);
    };
    return msg;
}

export async function startScanner(videoElementId, onSuccess, onError) {
    const manualMsg = preparaInserimentoManuale(videoElementId, onSuccess);

    // Senza fotocamera si resta nel riquadro per scrivere il codice, invece di chiuderlo
    const erroreFotocamera = (testo) => {
        stopScanner();
        if (manualMsg) {
            manualMsg.textContent = `${testo} Scrivi il codice qui sotto.`;
            manualMsg.classList.remove('hidden');
        } else if (onError) {
            onError(testo);
        }
    };

    if (typeof ZXing === 'undefined') {
        erroreFotocamera("Lettore codici non caricato.");
        return;
    }

    if (!codeReader) {
        const hints = new Map();

        // Manteniamo solo i veri codici alimentari (EAN e UPC)
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E
        ]);

        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        codeReader = new ZXing.BrowserMultiFormatReader(hints);

        // Lo scanner scatta un fotogramma ogni 100ms
        codeReader.timeBetweenDecodingAttempts = 100;
    }

    lastScannedCode = null;
    scanCount = 0;

    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();

        if (videoInputDevices && videoInputDevices.length > 0) {
            let selectedDeviceId = videoInputDevices[0].deviceId;

            for (let i = 0; i < videoInputDevices.length; i++) {
                let label = videoInputDevices[i].label.toLowerCase();
                if (label.includes("back") || label.includes("posteriore") || label.includes("environment")) {
                    selectedDeviceId = videoInputDevices[i].deviceId;
                    if (!label.includes("ultrawide") && !label.includes("ultra wide") && !label.includes("macro")) {
                        break;
                    }
                }
            }

            // await: se l'accesso alla fotocamera viene negato l'errore arriva al catch qui sotto
            // (prima restava una promise rifiutata non gestita: riquadro nero e nessun messaggio)
            await codeReader.decodeFromVideoDevice(selectedDeviceId, videoElementId, (result, err) => {
                if (result) {
                    const barcode = result.getText().trim();

                    // Solo numeri tra 8 e 13 cifre
                    if (/^\d{8,13}$/.test(barcode)) {

                        // DEBOUNCE: Chiediamo 2 letture identiche consecutive.
                        // Ci metterà circa 0.1s e filtrerà il 100% degli errori di lettura "a metà"
                        if (barcode === lastScannedCode) {
                            scanCount++;
                            if (scanCount >= 2) {
                                stopScanner();
                                onSuccess(barcode);
                            }
                        } else {
                            // Se cambia, azzera il contatore (era un'allucinazione o un codice a metà)
                            lastScannedCode = barcode;
                            scanCount = 1;
                        }
                    }
                }
            });
        } else {
            erroreFotocamera("Nessuna fotocamera rilevata.");
        }
    } catch (err) {
        erroreFotocamera("Fotocamera non disponibile: consenti l'accesso alla fotocamera.");
    }
}

export function stopScanner() {
    if (codeReader) {
        codeReader.reset();
    }
    lastScannedCode = null;
    scanCount = 0;
}