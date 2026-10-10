// public/js/services/pantryLogic.js
// Calcoli puri della dispensa (niente DOM né rete): tipi, gruppi, da comprare, rifornimento,
// correzione dei grammi, riga di un utilizzo e prodotto già presente. Testati con node:test.

import { chiaveGiorno, nomeGiorno } from '../components/format.js?v=31';

const numero = (v) => parseFloat(String(v ?? '').replace(',', '.')) || 0;

// Categorie come sono salvate (chiave) e come si leggono a schermo (nome), in quest'ordine
export const TIPI = [
    { chiave: 'Proteina', nome: 'Proteine' }, { chiave: 'Carboidrato', nome: 'Carboidrati' },
    { chiave: 'Latticino', nome: 'Latticini' }, { chiave: 'Verdura', nome: 'Verdura' },
    { chiave: 'Frutta', nome: 'Frutta' }, { chiave: 'Condimento/Grassi', nome: 'Condimenti e grassi' },
    { chiave: 'Altro', nome: 'Altro' }
];
const tipoDi = (categoria) => TIPI.find(t => t.chiave === categoria) || TIPI[TIPI.length - 1];
export const nomeTipo = (categoria) => tipoDi(categoria).nome;

// Quanto ne resta rispetto al riferimento, tra 0 e 100 (senza riferimento: pieno se ce n'è)
export function percentuale(item) {
    const totali = numero(item.grammiTotali);
    if (!(totali > 0)) return numero(item.grammiRimasti) > 0 ? 100 : 0;
    return Math.max(0, Math.min(100, numero(item.grammiRimasti) / totali * 100));
}

// 'finito' a zero (o meno), 'sta-finendo' sotto la soglia (20% di default), altrimenti 'ok'
export function statoProdotto(item) {
    if (numero(item.grammiRimasti) <= 0) return 'finito';
    return numero(item.grammiTotali) > 0 && percentuale(item) <= (Number(item.sogliaBassa) || 20) ? 'sta-finendo' : 'ok';
}

// "finito" concordato con la prima parola del nome: Bresaola finita, Uova/Mele finite, Fagioli
// finiti, Latte/Pane/Salmone finito. Le parole in -e sono quasi sempre plurali femminili (mele,
// olive), tranne i maschili singolari della dispensa elencati qui e quelli in -one.
const MASCHILI_IN_E = ['latte', 'pane', 'sale', 'pepe', 'miele', 'caffe', 'caffè', 'dolcificante'];
export function parolaFinito(nome) {
    const parola = String(nome || '').trim().split(/\s+/)[0].toLowerCase();
    if (parola === 'uova') return 'finite';
    if (parola.endsWith('a')) return 'finita';
    if (parola.endsWith('i')) return 'finiti';
    if (parola.endsWith('e') && !parola.endsWith('one') && !MASCHILI_IN_E.includes(parola)) return 'finite';
    return 'finito';
}

const perNome = (a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' });
const finitiInFondo = (a, b) => (statoProdotto(a) === 'finito') - (statoProdotto(b) === 'finito') || perNome(a, b);

// Gruppi per tipo nell'ordine di TIPI (solo quelli con prodotti); dentro, alfabetico e i finiti in fondo
export function gruppiDispensa(items) {
    return TIPI.map(t => ({ ...t, prodotti: items.filter(i => tipoDi(i.categoria) === t).sort(finitiInFondo) }))
        .filter(g => g.prodotti.length > 0);
}

export const daComprare = (items) => items.filter(i => statoProdotto(i) !== 'ok').sort(perNome);

// Spesa: N confezioni da G grammi si sommano a quello che resta (mai sotto zero); il totale
// diventa il nuovo riferimento, così dopo la spesa la barra è piena
export function rifornimento(item, confezioni, grammiLuna) {
    const n = Math.max(1, Math.round(numero(confezioni)) || 1);
    const g = numero(grammiLuna);
    const rimasti = Math.max(0, numero(item.grammiRimasti)) + n * g;
    return { pesoConfezione: g, quantitaConfezioni: n, grammiRimasti: rimasti, grammiTotali: rimasti };
}

// "Correggi i grammi": i rimasti sono quelli scritti; il riferimento sale se li supera
export function correzioneGrammi(item, grammi) {
    const g = Math.max(0, numero(grammi));
    return { grammiRimasti: g, grammiTotali: Math.max(numero(item.grammiTotali), g) };
}

// { titolo: "Pranzo · Riso, Pollo", quando: "Oggi, 13:10" | "Mercoledì 7 ottobre", grammi: "−80 g" }
export function rigaUtilizzo(u, oggi = new Date()) {
    const d = new Date(u.data);
    const giorno = nomeGiorno(chiaveGiorno(d), oggi);
    const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const g = Math.round(numero(u.grammiScalati));
    return {
        titolo: String(u.nomePasto || '').replace(': ', ' · '),
        quando: giorno === 'Oggi' || giorno === 'Ieri' ? `${giorno}, ${ora}` : giorno,
        grammi: `${g >= 0 ? '−' : '+'}${Math.abs(g)} g`
    };
}

// Lo stesso prodotto già in dispensa: stesso codice a barre, o stesso nome (maiuscole e spazi a parte)
const normale = (s) => String(s || '').trim().toLowerCase();
export function trovaEsistente(items, { barcode, nome }) {
    return (barcode && items.find(i => i.barcode === barcode)) || items.find(i => normale(i.nome) === normale(nome)) || null;
}
