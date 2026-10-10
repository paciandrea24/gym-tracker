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

// "Proteine 22,3 g · Carboidrati 7,2 g · Grassi 23,9 g" (breve: "Carbo" dove manca spazio)
export function macroTesto(v, { breve = false } = {}) {
    return MACRO.map(m => `${breve ? m.breve : m.nome} ${decimale(v[m.chiave])} g`).join(' · ');
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
