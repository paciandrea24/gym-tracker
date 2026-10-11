// public/js/components/format.js
// Numeri e macro scritti allo stesso modo in tutta l'app (regole del restyle):
// kcal e grammi interi, un decimale con la virgola solo dove serve, macro sempre con il nome.

export const intero = (n) => String(Math.round(Number(n) || 0));

export function decimale(n) {
    const r = Math.round((Number(n) || 0) * 10) / 10;
    return String(r).replace('.', ',');
}

const MACRO = [
    { chiave: 'proteine', nome: 'Proteine', breve: 'Proteine', colore: 'text-blue-500' },
    { chiave: 'carboidrati', nome: 'Carboidrati', breve: 'Carbo', colore: 'text-green-600' },
    { chiave: 'grassi', nome: 'Grassi', breve: 'Grassi', colore: 'text-yellow-600' }
];

// "Proteine 22,3 g · Carboidrati 7,2 g · Grassi 23,9 g" (breve: "Carbo" dove manca spazio; interi: senza decimali)
export function macroTesto(v, { breve = false, interi = false } = {}) {
    return MACRO.map(m => `${breve ? m.breve : m.nome} ${interi ? intero(v[m.chiave]) : decimale(v[m.chiave])} g`).join(' · ');
}

// Tre colonnine: nome colorato sopra, grammi sotto
export function macroColonne(v, { dimensione = 'text-[15px]' } = {}) {
    return `
        <div class="grid grid-cols-3 gap-2">
            ${MACRO.map(m => `
                <div class="min-w-0">
                    <p class="text-[11px] font-bold ${m.colore}">${m.nome}</p>
                    <p class="${dimensione} font-black text-gray-900">${decimale(v[m.chiave])} g</p>
                </div>`).join('')}
        </div>`;
}

// Valori ogni 100 g di un totale che pesa `peso` grammi (null se il peso non c'è)
export function perCento(totale, peso) {
    if (!(peso > 0)) return null;
    const r = (k) => Math.round((Number(totale[k]) || 0) / peso * 1000) / 10;
    return { calorie: r('calorie'), proteine: r('proteine'), carboidrati: r('carboidrati'), grassi: r('grassi') };
}

// Percentuale delle calorie che arriva da ogni macro (4 kcal/g proteine e carboidrati, 9 kcal/g grassi).
// Interi che sommano sempre a 100 (il resto va alle parti decimali più grandi); null se non c'è niente.
export function ripartizioneCalorie(v) {
    const kcal = { proteine: (Number(v.proteine) || 0) * 4, carboidrati: (Number(v.carboidrati) || 0) * 4, grassi: (Number(v.grassi) || 0) * 9 };
    const totale = kcal.proteine + kcal.carboidrati + kcal.grassi;
    if (!(totale > 0)) return null;
    const chiavi = Object.keys(kcal);
    const esatte = chiavi.map(k => kcal[k] / totale * 100);
    const r = Object.fromEntries(chiavi.map((k, i) => [k, Math.floor(esatte[i])]));
    let mancano = 100 - Object.values(r).reduce((a, b) => a + b, 0);
    const perResto = chiavi.map((k, i) => [k, esatte[i] - Math.floor(esatte[i])]).sort((a, b) => b[1] - a[1]);
    for (const [k] of perResto) { if (mancano-- <= 0) break; r[k]++; }
    return r;
}

// --- Giorni e settimane (ora locale del telefono) ---

const due = (n) => String(n).padStart(2, '0');
const daChiave = (chiave) => { const [a, m, g] = chiave.split('-').map(Number); return new Date(a, m - 1, g, 12); };

// 'YYYY-MM-DD' del giorno in cui cade la data
export function chiaveGiorno(data) {
    const d = new Date(data);
    return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

// Millisecondi alla prossima mezzanotte (anche nei giorni di 23 o 25 ore del cambio dell'ora)
export function msAllaMezzanotte(ora = new Date()) {
    const mezzanotte = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate() + 1);
    return mezzanotte - ora;
}

// Lunedì della settimana del giorno
export function lunediDi(chiave) {
    const d = daChiave(chiave);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return chiaveGiorno(d);
}

// "Oggi", "Ieri", "Giovedì 8 ottobre" (con l'anno solo se non è quello in corso)
export function nomeGiorno(chiave, oggi = new Date()) {
    const ieri = new Date(oggi);
    ieri.setDate(ieri.getDate() - 1);
    if (chiave === chiaveGiorno(oggi)) return 'Oggi';
    if (chiave === chiaveGiorno(ieri)) return 'Ieri';
    const d = daChiave(chiave);
    const testo = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() !== oggi.getFullYear() ? { year: 'numeric' } : {}) });
    return testo.charAt(0).toUpperCase() + testo.slice(1);
}

// "5 – 11 ottobre", "28 settembre – 4 ottobre", con gli anni solo se servono
export function nomeSettimana(lunedi, oggi = new Date()) {
    const inizio = daChiave(lunedi);
    const fine = new Date(inizio);
    fine.setDate(fine.getDate() + 6);
    const mese = (d) => d.toLocaleDateString('it-IT', { month: 'long' });
    const anno = (d) => d.getFullYear() !== oggi.getFullYear() || inizio.getFullYear() !== fine.getFullYear() ? ` ${d.getFullYear()}` : '';
    if (inizio.getMonth() === fine.getMonth() && inizio.getFullYear() === fine.getFullYear()) {
        return `${inizio.getDate()} – ${fine.getDate()} ${mese(fine)}${anno(fine)}`;
    }
    const annoInizio = inizio.getFullYear() !== fine.getFullYear() ? ` ${inizio.getFullYear()}` : '';
    return `${inizio.getDate()} ${mese(inizio)}${annoInizio} – ${fine.getDate()} ${mese(fine)}${anno(fine)}`;
}
