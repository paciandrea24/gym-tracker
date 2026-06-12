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