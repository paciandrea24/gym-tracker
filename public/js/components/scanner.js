// public/js/components/scanner.js

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
}