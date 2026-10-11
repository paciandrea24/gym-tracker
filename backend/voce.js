// backend/voce.js
// Calcoli puri sul risultato della voce: nessun accesso al DB, così sono testabili con node --test.

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const PER100 = { calorie: 'kcal100', proteine: 'proteine100', carboidrati: 'carboidrati100', grassi: 'grassi100' };

// Gemini dà i grammi mangiati e i valori ogni 100 g: il conto lo fa il server, perché il modello
// sbaglia le moltiplicazioni (es. banana con la buccia: grammi senza buccia, calorie con la buccia).
// Senza valori ogni 100 g (totali detti dall'utente) o senza grammi restano i totali di Gemini.
export function valoriDaPer100(ingredienti) {
    return (ingredienti || []).map(ing => {
        const copia = { ...ing };
        for (const campo of Object.values(PER100)) delete copia[campo];
        const grammi = Number(ing.grammi) || 0;
        if (ing.prepId || !(grammi > 0) || !(Number(ing.kcal100) > 0)) return copia;
        for (const [totale, per100] of Object.entries(PER100)) copia[totale] = round1((Number(ing[per100]) || 0) * grammi / 100);
        return copia;
    });
}
