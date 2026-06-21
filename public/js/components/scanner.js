// public/js/components/scanner.js

let codeReader = null;

// Funzione matematica per verificare i codici EAN/UPC in una frazione di millisecondo
function isValidBarcode(barcode) {
    if (!/^\d{8,14}$/.test(barcode)) return false;
    let sum = 0;
    const digits = barcode.split('').map(Number);
    const checkDigit = digits.pop(); // Prende l'ultimo numero (il checksum)

    // Moltiplica alternativamente per 3 e per 1 partendo da destra
    digits.reverse().forEach((digit, index) => {
        sum += digit * (index % 2 === 0 ? 3 : 1);
    });

    const calculatedCheck = (10 - (sum % 10)) % 10;
    return calculatedCheck === checkDigit;
}

export async function startScanner(videoElementId, onSuccess, onError) {
    if (!codeReader) {
        const hints = new Map();
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E
        ]);

        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        codeReader = new ZXing.BrowserMultiFormatReader(hints);
        codeReader.timeBetweenDecodingAttempts = 100;
    }

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

                    // CONTROLLO CHECKSUM: Se il codice letto a causa del mosso è matematicamente impossibile, lo ignora!
                    if (isValidBarcode(barcode)) {
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