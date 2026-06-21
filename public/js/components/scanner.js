// public/js/components/scanner.js

let codeReader = null;
let lastScannedCode = null;
let scanCount = 0;

export async function startScanner(videoElementId, onSuccess, onError) {
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

            codeReader.decodeFromVideoDevice(selectedDeviceId, videoElementId, (result, err) => {
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
    lastScannedCode = null;
    scanCount = 0;
}