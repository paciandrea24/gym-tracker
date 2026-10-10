// public/js/components/scanner.js

let codeReader = null;
let lastScannedCode = null;
let scanCount = 0;

// Codice digitato a mano: tiene solo le cifre, accetta da 8 a 14 cifre (EAN-8 … GTIN-14)
export function normalizzaBarcode(testo) {
    const pulito = String(testo || '').replace(/[\s-]/g, '');
    return /^\d{8,14}$/.test(pulito) ? pulito : null;
}

export async function startScanner(videoElementId, onSuccess, onError) {
    // Il codice si può sempre scrivere a mano nel form "Manuale"
    const erroreFotocamera = (testo) => {
        stopScanner();
        if (onError) onError(`${testo} Il codice puoi anche scriverlo nel form Manuale.`);
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