// public/js/components/voice.js
// Registrazione vocale condivisa: tocca per parlare, tocca di nuovo per terminare.
//
// Dal 23 ottobre 2026 non si usa più la dettatura di Safari (SpeechRecognition): su iPhone
// funzionava solo la prima volta, poi "Non ho sentito nulla" (difetto noto di WebKit), e i ritocchi
// non erano bastati. Ora si registra l'audio col microfono (MediaRecorder) e lo si manda al server,
// dove Gemini lo ascolta, lo trascrive e calcola il pasto in una sola richiesta.
// - dopo ogni registrazione il microfono viene spento: la volta dopo riparte pulito (e su iPhone
//   sparisce il pallino arancione);
// - mentre il microfono si accende o l'analisi è in corso i tocchi vengono ignorati, niente
//   sessioni sovrapposte;
// - un tocco e subito stop non manda niente: il pulsante dice che non ha sentito.

import * as modal from './modal.js?v=42';
import { icona } from './icons.js?v=42';

const MAX_DURATA_MS = 60000;
const MIN_DURATA_MS = 600;
const ATTESA_FINE_MS = 3000;  // se il registratore non avvisa che ha finito, chiudiamo noi
const MESSAGGIO_MS = 2500;
// Il primo che il telefono sa registrare: iPhone audio/mp4, Chrome ed Edge webm
const FORMATI = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];

let sessione = null;
// Aspetto originale di ogni pulsante, così un messaggio temporaneo non diventa il nuovo "originale"
const originali = new WeakMap();

// Vero mentre si registra o si analizza: la schermata sotto non va ridisegnata
export function inUso() {
    return !!sessione;
}

export function isSupported() {
    return !!(window.navigator?.mediaDevices?.getUserMedia && window.MediaRecorder);
}

export function scegliFormato(supporta) {
    return FORMATI.find(f => supporta(f)) || '';
}

function messaggioErrore(nome) {
    switch (nome) {
        case 'NotAllowedError':
        case 'SecurityError':
            return "Microfono non autorizzato: tocca «Consenti» quando l'app lo chiede. Se non lo chiede più, chiudi e riapri l'app (su iPhone: Impostazioni › App › Safari › Microfono).";
        case 'NotFoundError':
            return "Non trovo nessun microfono.";
        case 'NotReadableError':
        case 'AbortError':
            return "Il microfono è occupato da un'altra app (per esempio una chiamata). Riprova tra un attimo.";
        default:
            return "Non riesco ad avviare il microfono. Riprova.";
    }
}

// button: il pulsante che avvia/ferma. onAudio({ data, mimeType }): async, riceve la registrazione
// (data in base64). Va chiamata direttamente dal click: su iPhone il microfono parte dal gesto.
export function toggleVoice(button, onAudio) {
    if (sessione) {
        if (sessione.fase === 'ascolto') ferma(sessione);
        return; // microfono in accensione o analisi in corso: ignora i tocchi
    }
    if (!isSupported()) {
        modal.showModal({ type: 'error', title: 'Non supportato', message: "La registrazione audio non è supportata in questo browser." });
        return;
    }
    avvia(button, onAudio);
}

async function avvia(button, onAudio) {
    if (!originali.has(button)) originali.set(button, { html: button.innerHTML, classe: button.className, timer: null });
    const orig = originali.get(button);
    clearTimeout(orig.timer);

    const s = {
        button, onAudio,
        originalHtml: orig.html,
        originalClass: orig.classe,
        fase: 'avvio', chiusa: false,
        stream: null, rec: null, parti: [], inizio: 0, durata: 0,
        timerFine: null, timerMax: null
    };
    sessione = s;
    button.innerHTML = `${icona.attesa()} Un attimo…`;
    button.className = orig.classe;

    try {
        s.stream = await window.navigator.mediaDevices.getUserMedia({ audio: true });
        const formato = scegliFormato(f => !!window.MediaRecorder.isTypeSupported?.(f));
        s.rec = formato ? new window.MediaRecorder(s.stream, { mimeType: formato }) : new window.MediaRecorder(s.stream);
        s.rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) s.parti.push(e.data); };
        s.rec.onstop = () => concludi(s);
        s.rec.start();
    } catch (e) {
        spegniMicrofono(s);
        sessione = null;
        ripristinaPulsante(s);
        await modal.showModal({ type: 'error', title: 'Microfono', message: messaggioErrore(e?.name) });
        return;
    }

    s.fase = 'ascolto';
    s.inizio = Date.now();
    button.innerHTML = `${icona.stop()} Ascoltando… tocca per terminare`;
    button.classList.add('animate-pulse', 'bg-red-600');
    s.timerMax = setTimeout(() => ferma(s), MAX_DURATA_MS);
}

function ferma(s) {
    if (s.chiusa || s.fase !== 'ascolto') return;
    s.fase = 'chiusura';
    s.durata = Date.now() - s.inizio;
    clearTimeout(s.timerMax);
    s.button.innerHTML = `${icona.attesa()} Un attimo…`;
    s.button.className = s.originalClass;
    try { s.rec.stop(); } catch { }
    s.timerFine = setTimeout(() => concludi(s), ATTESA_FINE_MS);
}

function spegniMicrofono(s) {
    for (const traccia of s.stream?.getTracks() || []) {
        try { traccia.stop(); } catch { }
    }
}

function ripristinaPulsante(s) {
    s.button.innerHTML = s.originalHtml;
    s.button.className = s.originalClass;
}

// Messaggio breve sul pulsante; un nuovo tocco lo sostituisce subito
function mostraMessaggio(s, testo) {
    s.button.innerHTML = testo;
    s.button.className = s.originalClass;
    const orig = originali.get(s.button);
    orig.timer = setTimeout(() => ripristinaPulsante(s), MESSAGGIO_MS);
}

async function inBase64(blob) {
    const byte = new Uint8Array(await blob.arrayBuffer());
    let binario = '';
    for (let i = 0; i < byte.length; i += 0x8000) binario += String.fromCharCode(...byte.subarray(i, i + 0x8000));
    return btoa(binario);
}

async function concludi(s) {
    if (s.chiusa) return;
    s.chiusa = true;
    clearTimeout(s.timerFine);
    clearTimeout(s.timerMax);
    spegniMicrofono(s);
    if (s.rec) s.rec.ondataavailable = s.rec.onstop = null;

    const mimeType = (s.rec?.mimeType || s.parti[0]?.type || 'audio/mp4').split(';')[0];
    const audio = new Blob(s.parti, { type: mimeType });
    if (s.durata < MIN_DURATA_MS || audio.size === 0) {
        sessione = null;
        mostraMessaggio(s, "Non ho sentito nulla, riprova");
        return;
    }

    s.fase = 'analisi';
    s.button.innerHTML = `${icona.attesa()} Analisi in corso…`;
    s.button.className = s.originalClass;
    s.button.classList.add('bg-orange-500');

    try {
        await s.onAudio({ data: await inBase64(audio), mimeType });
    } catch (e) {
        await modal.showModal({ type: 'error', title: 'Errore', message: e.message || 'Errore durante l\'analisi.' });
    } finally {
        sessione = null;
        ripristinaPulsante(s);
    }
}
