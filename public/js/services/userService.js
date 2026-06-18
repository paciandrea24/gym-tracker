// public/js/services/userService.js

export async function getStreak() {
    const res = await fetch('/api/streak');
    return await res.json();
}

export async function triggerStreak() {
    const res = await fetch('/api/streak/trigger', { method: 'POST' });
    return await res.json();
}

export async function getWater() {
    const res = await fetch('/api/water');
    return await res.json();
}

export async function updateWater(glasses) {
    const res = await fetch('/api/water', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glasses })
    });
    return await res.json();
}

export async function subscribePush(subscription) {
    await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
    });
}

export async function getWeightLogs() {
    try {
        const res = await fetch('/api/weight');
        return await res.json();
    } catch (e) { return []; }
}

export async function addWeightLog(weight) {
    const res = await fetch('/api/weight', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight })
    });
    return await res.json();
}