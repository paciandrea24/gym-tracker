// public/js/services/pantryService.js

export async function getPantryItems() {
    const res = await fetch('/api/pantry');
    return await res.json();
}

export async function getPantryItemUsage(id) {
    const res = await fetch(`/api/pantry/${id}/usage`);
    return await res.json();
}

export async function addPantryItem(item) {
    const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
    return await res.json();
}

export async function updatePantryItem(id, data) {
    const res = await fetch(`/api/pantry/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await res.json();
}

export async function deletePantryItem(id) {
    const res = await fetch(`/api/pantry/${id}`, { method: 'DELETE' });
    return await res.json();
}

// Scala grammi dalla dispensa dopo aver salvato un pasto
// ingredienti: [{ nome: string, grammi: number }]
export async function consumeFromPantry(ingredienti, mealId, nomePasto) {
    const res = await fetch('/api/pantry/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredienti, mealId, nomePasto })
    });
    return await res.json();
}

export async function getPantryForAI() {
    const res = await fetch('/api/pantry/for-ai');
    return await res.json();
}

export async function fetchOpenFoodFacts(barcode) {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    return await res.json();
}

// Determina la categoria automaticamente dai dati nutrizionali
export function determinaCategoria(nome, pro100, carbo100, grassi100, cal100) {
    const nomeLower = nome.toLowerCase();

    if (nomeLower.includes('pasta') || nomeLower.includes('riso') || nomeLower.includes('pane') ||
        nomeLower.includes('farro') || nomeLower.includes('avena') || nomeLower.includes('cereali') ||
        nomeLower.includes('crackers') || nomeLower.includes('gallette') || carbo100 >= 50) {
        return 'Carboidrato';
    }
    if (nomeLower.includes('pollo') || nomeLower.includes('manzo') || nomeLower.includes('tacchino') ||
        nomeLower.includes('salmone') || nomeLower.includes('tonno') || nomeLower.includes('uova') ||
        nomeLower.includes('bresaola') || nomeLower.includes('prosciutto') ||
        (pro100 >= 15 && pro100 > carbo100)) {
        return 'Proteina';
    }
    if (nomeLower.includes('latte') || nomeLower.includes('yogurt') || nomeLower.includes('ricotta') ||
        nomeLower.includes('mozzarella') || nomeLower.includes('formaggio') || nomeLower.includes('skyr')) {
        return 'Latticino';
    }
    if (nomeLower.includes('mela') || nomeLower.includes('banana') || nomeLower.includes('arancia') ||
        nomeLower.includes('pera') || nomeLower.includes('fragol') || nomeLower.includes('frutt')) {
        return 'Frutta';
    }
    if (nomeLower.includes('insalata') || nomeLower.includes('spinaci') || nomeLower.includes('broccol') ||
        nomeLower.includes('carota') || nomeLower.includes('zucchina') || nomeLower.includes('verdur') ||
        cal100 < 40) {
        return 'Verdura';
    }
    if (nomeLower.includes('olio') || nomeLower.includes('burro') || nomeLower.includes('noci') ||
        nomeLower.includes('mandorle') || grassi100 >= 20) {
        return 'Condimento/Grassi';
    }
    return 'Altro';
}