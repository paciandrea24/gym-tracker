// backend/matching.js
// Confronto tra nomi di alimenti (pasti, voce, AI) e prodotti in dispensa

const STOPWORDS_IT = new Set(['di', 'della', 'del', 'dello', 'dei', 'degli', 'delle', 'con', 'e', 'al', 'alla', 'allo', 'ai', 'agli', 'alle', 'la', 'il', 'lo', 'i', 'le', 'gli', 'un', 'una', 'uno', 'da', 'in', 'a', 'su', 'per', 'tra', 'fra']);

export function normalizzaNome(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\(.*?\)/g, ' ')
        .replace(/\d+\s*g\b/gi, ' ')
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function tokenizza(str) {
    return normalizzaNome(str)
        .split(' ')
        .filter(t => t.length >= 3 && !STOPWORDS_IT.has(t));
}

export function classificaMatch(nomeMangiato, nomePantry) {
    const tokEaten = tokenizza(nomeMangiato);
    const tokPantry = tokenizza(nomePantry);
    if (tokEaten.length === 0 || tokPantry.length === 0) return 'none';

    const setEaten = new Set(tokEaten);
    const setPantry = new Set(tokPantry);

    // Exact: stessi token (ordine irrilevante)
    if (setEaten.size === setPantry.size && [...setEaten].every(t => setPantry.has(t))) return 'exact';

    // Candidate: almeno un token in comune
    if (tokEaten.some(t => setPantry.has(t))) return 'candidate';

    return 'none';
}
