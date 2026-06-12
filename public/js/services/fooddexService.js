// public/js/services/fooddexService.js

export async function getFoodDexItems() {
    const res = await fetch('/api/fooddex');
    return await res.json();
}

export async function saveFoodDexItem(item) {
    const res = await fetch('/api/fooddex', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
    return { ok: res.ok, data: await res.json() };
}

export async function fetchOpenFoodFacts(barcode) {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    return await res.json();
}