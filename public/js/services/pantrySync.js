// public/js/services/pantrySync.js
// Scala e ripristina la dispensa a partire dagli ingredienti di un pasto o di un meal prep.
// Le porzioni di meal prep (ingredienti con prepId) non toccano mai la dispensa:
// i loro ingredienti crudi sono già stati scalati quando è stata creata la preparazione.

import * as pantryService from './pantryService.js?v=38';
import * as modal from '../components/modal.js?v=38';

// Cache localStorage: nomeNormalizzato → pantryItemId (o null = "non scalare")
const PANTRY_CACHE_KEY = 'pantryMatchCache';

function _normalizzaChiave(nome) {
    return nome.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, ' ').trim();
}

function getCachedMatch(nome) {
    try {
        const cache = JSON.parse(localStorage.getItem(PANTRY_CACHE_KEY) || '{}');
        const key = _normalizzaChiave(nome);
        return key in cache ? cache[key] : undefined; // undefined = non in cache
    } catch { return undefined; }
}

function setCachedMatch(nome, pantryItemId) {
    try {
        const cache = JSON.parse(localStorage.getItem(PANTRY_CACHE_KEY) || '{}');
        cache[_normalizzaChiave(nome)] = pantryItemId; // null = "non scalare"
        localStorage.setItem(PANTRY_CACHE_KEY, JSON.stringify(cache));
    } catch {}
}

function grammiIngrediente(ing) {
    let grammi = ing.grammi || 0;
    if (!grammi) {
        const m = ing.nome.match(/(\d+[\.,]?\d*)\s*g\b/i);
        if (m) grammi = parseFloat(m[1].replace(',', '.'));
    }
    return grammi || 0;
}

// meal: { _id, pasto, alimenti, ingredienti[] } (per un meal prep: _id null, pasto 'Meal prep')
export async function scalaDispensa(meal) {
    if (!meal) return;
    try {
        let ingredientiGrezzi = [];
        if (meal.ingredienti && meal.ingredienti.length > 0) {
            ingredientiGrezzi = meal.ingredienti
                .filter(ing => !ing.prepId)
                .map(ing => ({ nome: ing.nome, grammi: grammiIngrediente(ing) }))
                .filter(i => i.nome && i.grammi > 0);
        } else {
            ingredientiGrezzi = [{ nome: meal.alimenti, grammi: meal.grammi || 0 }];
        }

        if (ingredientiGrezzi.length === 0) return;

        // 1. Chiedi al backend di classificare ogni ingrediente
        const resolved = await pantryService.resolveMatches(ingredientiGrezzi);
        if (!resolved || !Array.isArray(resolved)) return;

        const daScalare = [];

        for (const item of resolved) {
            const cached = getCachedMatch(item.nome);

            if (item.exact) {
                // Match univoco → scala in automatico
                daScalare.push({ nome: item.nome, grammi: item.grammi, pantryItemId: item.exact._id });
                setCachedMatch(item.nome, item.exact._id);

            } else if (item.candidates.length > 0) {
                let pantryItemId;

                if (cached !== undefined) {
                    // Usa scelta memorizzata (incluso null = "non scalare")
                    pantryItemId = cached;
                } else {
                    // Mostra modale di scelta
                    pantryItemId = await modal.showChoiceModal({
                        title: item.nome,
                        message: 'Da quale prodotto della dispensa lo tolgo?',
                        options: item.candidates,
                        allowNone: true,
                        nota: `La prossima volta che scrivi "${item.nome}" uso la stessa scelta.`
                    });
                    setCachedMatch(item.nome, pantryItemId);
                }

                if (pantryItemId) {
                    daScalare.push({ nome: item.nome, grammi: item.grammi, pantryItemId });
                }
            }
            // nessun match → salta silenziosamente
        }

        if (daScalare.length === 0) return;

        const result = await pantryService.consumeFromPantry(
            daScalare, meal._id, `${meal.pasto}: ${meal.alimenti}`
        );

        if (result.avvisi && result.avvisi.length > 0) {
            result.avvisi.forEach(av => showPantryToast(av));
        }
    } catch (e) {
        console.warn('Scalaggio dispensa fallito:', e);
    }
}

export async function ripristinaDispensa(meal, ingredienti, motivo) {
    if (!ingredienti || ingredienti.length === 0) return;
    try {
        const ingDaRipristinare = ingredienti
            .filter(ing => !ing.prepId)
            .map(ing => {
                // Usa pantryItemId dalla cache (impostato durante lo scalaggio)
                const pantryItemId = getCachedMatch(ing.nome) || undefined;
                return { nome: ing.nome, grammi: grammiIngrediente(ing), pantryItemId };
            })
            .filter(i => i.nome && i.grammi > 0);

        if (ingDaRipristinare.length === 0) return;
        await pantryService.restoreToPantry(ingDaRipristinare, meal._id, motivo);
    } catch (e) {
        console.warn('Ripristino dispensa fallito:', e);
    }
}

export function showPantryToast(avviso) {
    if (avviso.esaurito) showToast(`"${avviso.nome}" è finito in dispensa`, 'bg-red-500');
    else showToast(`"${avviso.nome}" sta finendo: restano ${avviso.grammiRimasti} g`, 'bg-orange-500');
}

// Avviso breve in alto. Uno alla volta: il nuovo toglie quello di prima.
// Restituisce chiudi() per toglierlo prima dei 4 secondi (es. "Cerco il codice…").
export function showToast(testo, colore = 'bg-gray-900') {
    document.querySelectorAll('.toast-app').forEach(t => t.remove());
    const toast = document.createElement('div');
    toast.className = `toast-app fixed top-4 left-1/2 -translate-x-1/2 z-[999999] ${colore} text-white font-bold text-sm px-4 py-3 rounded-2xl shadow-xl max-w-xs text-center opacity-0 transition-all duration-300`;
    toast.textContent = testo;

    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('opacity-0'));
    const chiudi = () => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    };
    setTimeout(chiudi, 4000);
    return chiudi;
}
