// public/js/components/voice.js
// Registrazione vocale condivisa: tocca per parlare, tocca di nuovo per terminare.
//
// Correzioni per Safari su iPhone rispetto alla vecchia versione in NutritionView:
// - dopo stop() iOS a volte non emette "onend": la sessione restava "in ascolto" per sempre e i
//   tocchi successivi non facevano più nulla. Ora c'è un timer di sicurezza che chiude comunque.
// - iOS spesso non marca come "finale" l'ultima frase quando si ferma a mano: si perdeva il testo
//   e non succedeva niente. Ora si usano anche i risultati provvisori.
// - iOS può ripetere i risultati già dati (trascrizione cumulativa): ora non si duplicano.
// - mentre l'analisi è in corso i tocchi vengono ignorati, niente sessioni sovrapposte.

import * as modal from './modal.js?v=22';

const MAX_DURATA_MS = 60000;
const ATTESA_FINE_MS = 1500;

let sessione = null;

export function isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Unisce i risultati gestendo sia trascrizioni incrementali sia cumulative
export function unisciTrascrizioni(parti) {
    let testo = '';
    for (const parte of parti) {
        const t = (parte || '').trim();
        if (!t) continue;
        if (testo && t.toLowerCase().startsWith(testo.toLowerCase())) testo = t;
        else if (!testo.toLowerCase().endsWith(t.toLowerCase())) testo = testo ? `${testo} ${t}` : t;
    }
    return testo;
}

function messaggioErrore(codice) {
    switch (codice) {
        case 'not-allowed':
        case 'service-not-allowed':
            return "Microfono o riconoscimento vocale non autorizzati. Su iPhone: Impostazioni › Privacy › Microfono e Riconoscimento vocale.";
        case 'audio-capture':
            return "Il microfono è occupato da un'altra app. Riprova tra un attimo.";
        case 'network':
            return "Il riconoscimento vocale richiede la connessione a Internet.";
        case 'start-failed':
            return "Non riesco ad avviare il microfono. Riprova.";
        default:
            return `Errore microfono: ${codice}`;
    }
}

// button: il pulsante che avvia/ferma. onText(testo): async, riceve la trascrizione.
// Va chiamata direttamente dal click: su iOS start() deve partire dentro il gesto dell'utente.
export function toggleVoice(button, onText) {
    if (sessione) {
        if (sessione.fase === 'ascolto') ferma(sessione);
        return; // in analisi: ignora i tocchi
    }
    if (!isSupported()) {
        modal.showModal({ type: 'error', title: 'Non supportato', message: "Il riconoscimento vocale non è supportato in questo browser." });
        return;
    }
    avvia(button, onText);
}

function avvia(button, onText) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'it-IT';
    rec.continuous = true;
    rec.interimResults = true;

    const s = {
        rec, button, onText,
        originalHtml: button.innerHTML,
        originalClass: button.className,
        testo: '', errore: null, fase: 'ascolto', chiusa: false,
        timerFine: null, timerMax: null
    };
    sessione = s;

    rec.onresult = (event) => {
        const parti = [];
        for (let i = 0; i < event.results.length; i++) parti.push(event.results[i][0].transcript);
        s.testo = unisciTrascrizioni(parti);
    };
    rec.onerror = (event) => { s.errore = event.error; };
    rec.onend = () => concludi(s);

    button.innerHTML = "⏹️ Ascoltando... tocca per terminare";
    button.classList.add('animate-pulse', 'bg-red-600');

    try {
        rec.start();
    } catch (e) {
        s.errore = 'start-failed';
        concludi(s);
        return;
    }
    s.timerMax = setTimeout(() => ferma(s), MAX_DURATA_MS);
}

function ferma(s) {
    if (s.chiusa || s.timerFine) return;
    try { s.rec.stop(); } catch { }
    // Se iOS non emette "onend" entro poco, chiudiamo noi la sessione
    s.timerFine = setTimeout(() => {
        try { s.rec.abort(); } catch { }
        concludi(s);
    }, ATTESA_FINE_MS);
}

function ripristinaPulsante(s) {
    s.button.innerHTML = s.originalHtml;
    s.button.className = s.originalClass;
}

async function concludi(s) {
    if (s.chiusa) return;
    s.chiusa = true;
    clearTimeout(s.timerFine);
    clearTimeout(s.timerMax);
    s.rec.onresult = s.rec.onerror = s.rec.onend = null;

    const testo = s.testo.trim();
    if (!testo) {
        sessione = null;
        ripristinaPulsante(s);
        if (s.errore && s.errore !== 'no-speech' && s.errore !== 'aborted') {
            await modal.showModal({ type: 'error', title: 'Microfono', message: messaggioErrore(s.errore) });
        }
        return;
    }

    s.fase = 'analisi';
    s.button.innerHTML = "⏳ Analisi in corso...";
    s.button.className = s.originalClass;
    s.button.classList.add('bg-orange-500');

    try {
        await s.onText(testo);
    } catch (e) {
        await modal.showModal({ type: 'error', title: 'Errore', message: e.message || 'Errore durante l\'analisi.' });
    } finally {
        sessione = null;
        ripristinaPulsante(s);
    }
}
