import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Riconoscitore finto che imita Safari su iPhone: comportamento configurabile per test
class FintoRiconoscitore {
    static istanze = [];
    static comportamento = {};
    constructor() { FintoRiconoscitore.istanze.push(this); }
    start() { }
    stop() {
        const { testoDopoStopMs, testo } = FintoRiconoscitore.comportamento;
        if (testoDopoStopMs != null) {
            setTimeout(() => {
                this.onresult?.(evento([testo]));
                this.onend?.();
            }, testoDopoStopMs);
        }
    }
    abort() { setTimeout(() => { this.onerror?.({ error: 'aborted' }); this.onend?.(); }, 10); }
    parla(testo) { this.onresult?.(evento([testo])); }
}

function evento(trascrizioni) {
    return { results: trascrizioni.map(t => [{ transcript: t }]) };
}

function pulsante() {
    return { innerHTML: 'VOCE', className: 'base', classList: { add() { } } };
}

async function svuotaCoda() {
    for (let i = 0; i < 5; i++) await Promise.resolve();
}

let voice;
beforeEach(async () => {
    globalThis.window = { SpeechRecognition: FintoRiconoscitore };
    FintoRiconoscitore.istanze = [];
    FintoRiconoscitore.comportamento = {};
    mock.timers.enable({ apis: ['setTimeout'] });
    voice ??= await import('../public/js/components/voice.js');
});

afterEach(async () => {
    mock.timers.tick(120000);
    await svuotaCoda();
    mock.timers.reset();
});

test('il testo che iOS consegna solo dopo lo stop non va perso', async () => {
    FintoRiconoscitore.comportamento = { testoDopoStopMs: 2500, testo: 'e un caffè' };
    const ricevuti = [];
    const btn = pulsante();

    voice.toggleVoice(btn, async (t) => { ricevuti.push(t); });
    voice.toggleVoice(btn, async () => { }); // secondo tocco: termina
    mock.timers.tick(3000);
    await svuotaCoda();

    assert.deepEqual(ricevuti, ['e un caffè']);
});

test('con il testo già arrivato non si aspetta il tempo lungo', async () => {
    const ricevuti = [];
    const btn = pulsante();

    voice.toggleVoice(btn, async (t) => { ricevuti.push(t); });
    FintoRiconoscitore.istanze[0].parla('pasta 80 grammi');
    voice.toggleVoice(btn, async () => { });
    mock.timers.tick(1600);
    await svuotaCoda();

    assert.deepEqual(ricevuti, ['pasta 80 grammi']);
});

test('due vocali di fila: il secondo viene preso', async () => {
    const ricevuti = [];
    const onText = async (t) => { ricevuti.push(t); };

    const primo = pulsante();
    voice.toggleVoice(primo, onText);
    FintoRiconoscitore.istanze[0].parla('colazione latte e cereali');
    voice.toggleVoice(primo, onText);
    mock.timers.tick(1600);
    await svuotaCoda();

    FintoRiconoscitore.comportamento = { testoDopoStopMs: 2000, testo: 'e un caffè' };
    const secondo = pulsante();
    voice.toggleVoice(secondo, onText);
    voice.toggleVoice(secondo, onText);
    mock.timers.tick(2500);
    await svuotaCoda();

    assert.deepEqual(ricevuti, ['colazione latte e cereali', 'e un caffè']);
});

test('se non arriva niente il pulsante lo dice invece di tornare muto', async () => {
    const btn = pulsante();
    let chiamato = false;

    voice.toggleVoice(btn, async () => { chiamato = true; });
    voice.toggleVoice(btn, async () => { });
    mock.timers.tick(10000);
    await svuotaCoda();

    assert.equal(chiamato, false);
    assert.match(btn.innerHTML, /sentito/i);
});

test('dopo il messaggio un nuovo tocco riparte e poi ripristina il testo originale', async () => {
    const btn = pulsante();
    voice.toggleVoice(btn, async () => { });
    voice.toggleVoice(btn, async () => { });
    mock.timers.tick(10000);
    await svuotaCoda();

    const ricevuti = [];
    voice.toggleVoice(btn, async (t) => { ricevuti.push(t); });
    FintoRiconoscitore.istanze.at(-1).parla('mela');
    voice.toggleVoice(btn, async () => { });
    mock.timers.tick(1600);
    await svuotaCoda();

    assert.deepEqual(ricevuti, ['mela']);
    assert.equal(btn.innerHTML, 'VOCE');
});
