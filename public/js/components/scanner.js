// public/js/components/scanner.js

let codeReader = null;

export async function startScanner(videoElementId, onSuccess, onError) {
    if (!codeReader) {
        const hints = new Map();

        // LA MAGIA È QUI: Abbiamo rimosso ZXing.BarcodeFormat.CODE_128.
        // In questo modo lo scanner ignorerà le scritte (ingredienti, ecc.) 
        // e cercherà SOLO i veri codici a barre dei prodotti alimentari.
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E
        ]);

        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        codeReader = new ZXing.BrowserMultiFormatReader(hints);

        // Lo impostiamo al minimo (100ms) per una lettura letteralmente istantanea
        codeReader.timeBetweenDecodingAttempts = 100;
    }

    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();

        if (videoInputDevices && videoInputDevices.length > 0) {
            let selectedDeviceId = videoInputDevices[0].deviceId;

            // Cerca la fotocamera posteriore ottimale
            for (let i = 0; i < videoInputDevices.length; i++) {
                let label = videoInputDevices[i].label.toLowerCase();
                if (label.includes("back") || label.includes("posteriore") || label.includes("environment")) {
                    selectedDeviceId = videoInputDevices[i].deviceId;
                    if (!label.includes("ultrawide") && !label.includes("ultra wide") && !label.includes("macro")) {
                        break;
                    }
                }
            }

            codeReader.decodeFromVideoDevice(selectedDeviceId, videoElementId, (result, err) => {
                if (result) {
                    const barcode = result.getText().trim();

                    // Unico, semplice controllo di sicurezza: 
                    // i codici alimentari hanno tra le 8 e le 13 cifre e sono SOLO numeri.
                    if (/^\d{8,13}$/.test(barcode)) {
                        stopScanner();
                        onSuccess(barcode);
                    }
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