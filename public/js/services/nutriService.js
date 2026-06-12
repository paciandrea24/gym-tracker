// public/js/services/nutriService.js

export function getNutritionGoals() {
    return JSON.parse(localStorage.getItem('nutriGoals')) || { calorie: 2000, proteine: 150, carbo: 200, grassi: 60 };
}
export function saveNutritionGoals(goals) {
    localStorage.setItem('nutriGoals', JSON.stringify(goals));
}

// --- CHIAMATE AL DATABASE ---
export async function getTodayMeals() {
    const res = await fetch('/api/today-meals');
    return await res.json();
}

export async function getHistoryMeals() {
    const res = await fetch('/api/history');
    return await res.json();
}

export async function getFavorites() {
    const res = await fetch('/api/favorites');
    return await res.json();
}

export async function addFavorite(mealData) {
    const res = await fetch('/api/favorites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mealData)
    });
    return await res.json();
}

export async function removeFavorite(id) {
    const res = await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
    return await res.json();
}

export async function saveMeal(mealData) {
    const res = await fetch('/api/meals', {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mealData)
    });
    return await res.json();
}

export async function updateMeal(id, mealData) {
    const res = await fetch(`/api/meals/${id}`, {
        method: 'PUT', headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mealData)
    });
    return await res.json();
}

export async function deleteMeal(id) {
    const res = await fetch(`/api/meals/${id}`, { method: "DELETE" });
    return await res.json();
}

export async function analyzeVoice(text, mealId = null) {
    const res = await fetch(`/api/analyze-meal`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mealId })
    });
    return await res.json();
}

export async function recommendMeal(question, goals, consumate) {
    const res = await fetch('/api/recommend-meal', {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, goals, consumate })
    });
    return await res.json();
}