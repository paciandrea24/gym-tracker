let codeReader = null;

export async function startScanner(videoElementId, onSuccess, onError) {
    if (!codeReader) {
        const hints = new Map();
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E,
            ZXing.BarcodeFormat.CODE_128
        ]);

        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        codeReader = new ZXing.BrowserMultiFormatReader(hints);

        // Abbassato a 100ms per una reattività estrema
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
                    const isValidLength = barcode.length >= 8 && barcode.length <= 14;
                    const isNumeric = /^\d+$/.test(barcode);

                    if (isValidLength && isNumeric) {
                        // SCATTO IMMEDIATO: Appena becca un codice valido, ferma tutto e lo cerca
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