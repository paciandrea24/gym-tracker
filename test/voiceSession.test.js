import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Registratore e microfono finti, come su iPhone: audio/mp4, il registratore consegna l'audio dopo lo stop
class FintoRegistratore {
    static istanze = [];
    static formati = ['audio/mp4', 'audio/webm'];
    static isTypeSupported(f) { return FintoRegistratore.formati.includes(f); }
    constructor(stream, opzioni = {}) {
        this.stream = stream;
        this.mimeType = opzioni.mimeType || 'audio/webm';
        FintoRegistratore.istanze.push(this);
    }
    start() { this.avviato = true; }
    stop() {
        const n = FintoRegistratore.istanze.indexOf(this) + 1;
        setTimeout(() => {
            this.ondataavailable?.({ data: new Blob([`audio-${n}`], { type: this.mimeType }) });
            this.onstop?.();
        }, 50);
    }
}

let microfoni;
function getUserMedia() {
    const traccia = { spenta: false, stop() { this.spenta = true; } };
    microfoni.push(traccia);
    return Promise.resolve({ getTracks: () => [traccia] });
}

function pulsante() {
    return { innerHTML: 'VOCE', className: 'base', classList: { add() { } } };
}

async function svuotaCoda() {
    for (let i = 0; i < 20; i++) await Promise.resolve();
}

// Tocca, parla per `ms` e tocca di nuovo
async function registra(voice, btn, onAudio, ms = 2000) {
    voice.toggleVoice(btn, onAudio);
    await svuotaCoda();
    mock.timers.tick(ms);
    voice.toggleVoice(btn, onAudio);
    mock.timers.tick(100);
    await svuotaCoda();
}

const testo = (audio) => Buffer.from(audio.data, 'base64').toString();

let voice;
beforeEach(async () => {
    microfoni = [];
    FintoRegistratore.istanze = [];
    globalThis.window = { MediaRecorder: FintoRegistratore, navigator: { mediaDevices: { getUserMedia } } };
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    voice ??= await import('../public/js/components/voice.js');
});

afterEach(async () => {
    mock.timers.tick(120000);
    await svuotaCoda();
    mock.timers.reset();
});

test('registra, spegne il microfono e passa l\'audio in base64 col suo formato', async () => {
    const ricevuti = [];
    await registra(voice, pulsante(), async (a) => { ricevuti.push(a); });

    assert.equal(ricevuti.length, 1);
    assert.equal(testo(ricevuti[0]), 'audio-1');
    assert.equal(ricevuti[0].mimeType, 'audio/mp4');
    assert.equal(microfoni[0].spenta, true);
});

test('due vocali di fila: arrivano entrambi, ognuno con il suo microfono spento dopo', async () => {
    const ricevuti = [];
    const onAudio = async (a) => { ricevuti.push(testo(a)); };

    await registra(voice, pulsante(), onAudio);
    await registra(voice, pulsante(), onAudio);

    assert.deepEqual(ricevuti, ['audio-1', 'audio-2']);
    assert.deepEqual(microfoni.map(m => m.spenta), [true, true]);
});

test('un tocco e subito stop non manda niente e il pulsante lo dice', async () => {
    const btn = pulsante();
    let chiamato = false;
    await registra(voice, btn, async () => { chiamato = true; }, 200);

    assert.equal(chiamato, false);
    assert.match(btn.innerHTML, /sentito/i);
    assert.equal(microfoni[0].spenta, true);
});

test('dopo il messaggio il pulsante torna com\'era e un nuovo tocco registra', async () => {
    const btn = pulsante();
    await registra(voice, btn, async () => { }, 200);
    mock.timers.tick(3000);
    assert.equal(btn.innerHTML, 'VOCE');

    const ricevuti = [];
    await registra(voice, btn, async (a) => { ricevuti.push(testo(a)); });
    assert.deepEqual(ricevuti, ['audio-2']);
    assert.equal(btn.innerHTML, 'VOCE');
});

test('mentre il microfono si accende o l\'analisi è in corso i tocchi sono ignorati', async () => {
    const btn = pulsante();
    let finisci;
    const ricevuti = [];
    const onAudio = (a) => { ricevuti.push(testo(a)); return new Promise(ok => { finisci = ok; }); };

    voice.toggleVoice(btn, onAudio);
    voice.toggleVoice(btn, onAudio); // microfono ancora in accensione
    await svuotaCoda();
    assert.equal(microfoni.length, 1);

    mock.timers.tick(2000);
    voice.toggleVoice(btn, onAudio);
    mock.timers.tick(100);
    await svuotaCoda();
    assert.equal(voice.inUso(), true);

    voice.toggleVoice(btn, onAudio); // analisi in corso
    await svuotaCoda();
    assert.equal(microfoni.length, 1);

    finisci();
    await svuotaCoda();
    assert.equal(voice.inUso(), false);
    assert.equal(btn.innerHTML, 'VOCE');
    assert.deepEqual(ricevuti, ['audio-1']);
});

test('dopo un minuto la registrazione si ferma da sola', async () => {
    const ricevuti = [];
    voice.toggleVoice(pulsante(), async (a) => { ricevuti.push(testo(a)); });
    await svuotaCoda();
    mock.timers.tick(60000);
    mock.timers.tick(100);
    await svuotaCoda();

    assert.deepEqual(ricevuti, ['audio-1']);
});

test('formato: quello di iPhone se c\'è, altrimenti webm', () => {
    assert.equal(voice.scegliFormato(f => f === 'audio/mp4' || f === 'audio/webm'), 'audio/mp4');
    assert.equal(voice.scegliFormato(f => f.startsWith('audio/webm')), 'audio/webm;codecs=opus');
    assert.equal(voice.scegliFormato(() => false), '');
});
