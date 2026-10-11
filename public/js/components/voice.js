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
// - con frasi brevi (tipico del secondo vocale di fila) iOS spesso manda il testo solo DOPO lo stop:
//   prima si chiudeva dopo 1,5 s scartando tutto in silenzio. Ora senza testo si aspetta di più e,
//   se non arriva niente, il pulsante lo dice.

import * as modal from './modal.js?v=34';
import { icona } from './icons.js?v=34';

const MAX_DURATA_MS = 60000;
const ATTESA_FINE_MS = 1500;      // testo già arrivato: quanto aspettare "onend" prima di chiudere noi
const ATTESA_RISULTATO_MS = 6000; // nessun testo ancora: quanto aspettare il risultato dopo lo stop
const MESSAGGIO_MS = 2500;

let sessione = null;
// Aspetto originale di ogni pulsante, così un messaggio temporaneo non diventa il nuovo "originale"
const originali = new WeakMap();

// Vero mentre si registra o si analizza il testo: la schermata sotto non va ridisegnata
export function inUso() {
    return !!sessione;
}

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

    if (!originali.has(button)) originali.set(button, { html: button.innerHTML, classe: button.className, timer: null });
    const orig = originali.get(button);
    clearTimeout(orig.timer);

    const s = {
        rec, button, onText,
        originalHtml: orig.html,
        originalClass: orig.classe,
        testo: '', errore: null, fase: 'ascolto', chiusa: false,
        timerFine: null, timerMax: null
    };
    sessione = s;

    rec.onresult = (event) => {
        const parti = [];
        for (let i = 0; i < event.results.length; i++) parti.push(event.results[i][0].transcript);
        s.testo = unisciTrascrizioni(parti);
        // Testo arrivato dopo lo stop: se "onend" tarda chiudiamo a breve, senza aspettare il tempo lungo
        if (s.fase === 'chiusura' && s.testo.trim()) attendiFine(s, ATTESA_FINE_MS);
    };
    rec.onerror = (event) => { s.errore = event.error; };
    rec.onend = () => concludi(s);

    button.innerHTML = `${icona.stop()} Ascoltando… tocca per terminare`;
    button.className = orig.classe;
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
    if (s.chiusa || s.fase !== 'ascolto') return;
    s.fase = 'chiusura';
    clearTimeout(s.timerMax);
    s.button.innerHTML = `${icona.attesa()} Un attimo…`;
    s.button.className = s.originalClass;
    s.button.classList.add('bg-red-600');
    try { s.rec.stop(); } catch { }
    // Se iOS non emette "onend" chiudiamo noi: presto se il testo c'è già, altrimenti
    // si aspetta di più perché il risultato può arrivare solo dopo lo stop
    attendiFine(s, s.testo.trim() ? ATTESA_FINE_MS : ATTESA_RISULTATO_MS);
}

function attendiFine(s, ms) {
    clearTimeout(s.timerFine);
    s.timerFine = setTimeout(() => {
        try { s.rec.abort(); } catch { }
        concludi(s);
    }, ms);
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

async function concludi(s) {
    if (s.chiusa) return;
    s.chiusa = true;
    clearTimeout(s.timerFine);
    clearTimeout(s.timerMax);
    s.rec.onresult = s.rec.onerror = s.rec.onend = null;

    const testo = s.testo.trim();
    if (!testo) {
        sessione = null;
        if (s.errore && s.errore !== 'no-speech' && s.errore !== 'aborted') {
            ripristinaPulsante(s);
            await modal.showModal({ type: 'error', title: 'Microfono', message: messaggioErrore(s.errore) });
        } else {
            mostraMessaggio(s, "Non ho sentito nulla, riprova");
        }
        return;
    }

    s.fase = 'analisi';
    s.button.innerHTML = `${icona.attesa()} Analisi in corso…`;
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
