/* // public/js/components/scanner.js

let codeReader = null;

export async function startScanner(videoElementId, onSuccess, onError) {
    if (!codeReader) {
        // Presuppone che la libreria ZXing sia caricata nell'HTML (index.html)
        codeReader = new ZXing.BrowserMultiFormatReader();
    }

    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();

        if (videoInputDevices && videoInputDevices.length > 0) {
            let selectedDeviceId = videoInputDevices[0].deviceId;

            // Cerca la fotocamera posteriore
            for (let i = 0; i < videoInputDevices.length; i++) {
                let label = videoInputDevices[i].label.toLowerCase();
                if (label.includes("back") || label.includes("posteriore") || label.includes("environment")) {
                    selectedDeviceId = videoInputDevices[i].deviceId;
                    if (!label.includes("ultrawide") && !label.includes("ultra wide")) {
                        break;
                    }
                }
            }

            // Avvia la scansione e proietta sul video HTML richiesto
            codeReader.decodeFromVideoDevice(selectedDeviceId, videoElementId, (result, err) => {
                if (result) {
                    const barcode = result.getText();
                    stopScanner(); // Ferma la fotocamera appena legge
                    onSuccess(barcode);
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error("Errore scanner:", err);
                }
            });
        } else {
            if (onError) onError("Nessuna fotocamera rilevata dal browser.");
            stopScanner();
        }
    } catch (err) {
        if (onError) onError("Consenti l'accesso alla fotocamera per usare questa funzione.");
        stopScanner();
    }
}

export function stopScanner() {
    if (codeReader) {
        codeReader.reset();
    }
} */

// public/js/components/scanner.js

let codeReader = null;

export async function startScanner(videoElementId, onSuccess, onError) {
    if (!codeReader) {
        // 1. OTTIMIZZAZIONE: Restringiamo ai soli codici a barre per prodotti
        // Questo alleggerisce drasticamente la CPU perché non cerca QR Code, DataMatrix, ecc.
        const hints = new Map();
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E,
            ZXing.BarcodeFormat.CODE_128 // A volte usato in etichette di supermercati
        ]);

        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

        codeReader = new ZXing.BrowserMultiFormatReader(hints);

        // 2. OTTIMIZZAZIONE: Analizza frame più spesso (default è 500ms, lo portiamo a 150ms)
        codeReader.timeBetweenDecodingAttempts = 150;
    }

    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();

        if (videoInputDevices && videoInputDevices.length > 0) {
            let selectedDeviceId = videoInputDevices[0].deviceId;

            // Cerca la fotocamera posteriore (evitando grandangoli o macro che mettono a fuoco male i codici)
            for (let i = 0; i < videoInputDevices.length; i++) {
                let label = videoInputDevices[i].label.toLowerCase();
                if (label.includes("back") || label.includes("posteriore") || label.includes("environment")) {
                    selectedDeviceId = videoInputDevices[i].deviceId;
                    if (!label.includes("ultrawide") && !label.includes("ultra wide") && !label.includes("macro")) {
                        break;
                    }
                }
            }

            // Variabili per il controllo Anti-Allucinazione
            let lastScannedCode = null;
            let scanConfirmationCount = 0;

            // Avvia la scansione
            codeReader.decodeFromVideoDevice(selectedDeviceId, videoElementId, (result, err) => {
                if (result) {
                    const barcode = result.getText().trim();

                    // 3. CONTROLLO ERRORI: I codici alimentari hanno tra 8 e 14 cifre numeriche
                    const isValidLength = barcode.length >= 8 && barcode.length <= 14;
                    const isNumeric = /^\d+$/.test(barcode);

                    if (isValidLength && isNumeric) {
                        // Richiediamo che legga lo stesso codice 2 volte consecutive
                        // per essere sicuri che non sia un riflesso o un errore di lettura (previene i falsi "Non trovato sul DB")
                        if (barcode === lastScannedCode) {
                            scanConfirmationCount++;
                        } else {
                            lastScannedCode = barcode;
                            scanConfirmationCount = 1;
                        }

                        if (scanConfirmationCount >= 2) {
                            stopScanner();
                            onSuccess(barcode);
                        }
                    }
                }

                // Ignoriamo le NotFoundException, che vengono lanciate di continuo finché non inquadri un codice
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.warn("Avviso scanner:", err);
                }
            });
        } else {
            if (onError) onError("Nessuna fotocamera rilevata dal browser.");
            stopScanner();
        }
    } catch (err) {
        if (onError) onError("Consenti l'accesso alla fotocamera per usare questa funzione.");
        stopScanner();
    }
}

export function stopScanner() {
    if (codeReader) {
        codeReader.reset();
    }
}