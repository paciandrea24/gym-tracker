import { HomeView } from './views/HomeView.js';
import { GymView } from './views/GymView.js';
import { NutritionView } from './views/NutritionView.js';
import { PantryView } from './views/PantryView.js';

const appContainer = document.getElementById('app');
let currentAppModule = 'home';

function init() {
    setupNavigation();
    loadCurrentModule();
}

function setupNavigation() {
    const navHome = document.getElementById('nav-home');
    const navGym = document.getElementById('nav-gym');
    const navNutri = document.getElementById('nav-nutri');
    const navPantry = document.getElementById('nav-pantry');

    if (navHome) navHome.addEventListener('click', () => switchModule('home'));
    if (navGym) navGym.addEventListener('click', () => switchModule('gym'));
    if (navNutri) navNutri.addEventListener('click', () => switchModule('nutrition'));
    if (navPantry) navPantry.addEventListener('click', () => switchModule('pantry'));
}

function switchModule(module) {
    currentAppModule = module;

    const navHome = document.getElementById('nav-home');
    const navGym = document.getElementById('nav-gym');
    const navNutri = document.getElementById('nav-nutri');
    const navPantry = document.getElementById('nav-pantry');

    const active = 'text-[#4F46E5]';
    const inactive = 'text-gray-400 hover:text-gray-600';
    const base = 'flex flex-col items-center justify-center w-[65px] h-full transition-colors';

    if (navHome) navHome.className = `${base} ${module === 'home' ? active : inactive}`;
    if (navGym) navGym.className = `${base} ${module === 'gym' ? active : inactive}`;
    if (navNutri) navNutri.className = `${base} ${module === 'nutrition' ? active : inactive}`;
    if (navPantry) navPantry.className = `${base} ${module === 'pantry' ? active : inactive}`;

    loadCurrentModule();
}

function loadCurrentModule() {
    if (currentAppModule === 'home') {
        const homeView = new HomeView(
            appContainer,
            () => switchModule('gym'),
            (openAddMeal) => {
                currentAppModule = 'nutrition';
                document.getElementById('nav-nutri').className = `flex flex-col items-center justify-center w-[65px] h-full transition-colors text-[#4F46E5]`;
                document.getElementById('nav-home').className = `flex flex-col items-center justify-center w-[65px] h-full transition-colors text-gray-400 hover:text-gray-600`;
                const nutritionView = new NutritionView(appContainer);
                nutritionView.render(openAddMeal);
            }
        );
        homeView.render();
    } else if (currentAppModule === 'gym') {
        const gymView = new GymView(appContainer);
        gymView.render();
    } else if (currentAppModule === 'nutrition') {
        const nutritionView = new NutritionView(appContainer);
        nutritionView.render();
    } else if (currentAppModule === 'pantry') {
        const pantryView = new PantryView(appContainer);
        pantryView.render();
    }
}

document.addEventListener('DOMContentLoaded', init);

// --- FUNZIONE DI SUPPORTO PER LA CHIAVE VAPID ---
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// --- REGISTRAZIONE SERVICE WORKER E NOTIFICHE PUSH ---
if ('serviceWorker' in navigator && 'PushManager' in window) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                const response = await fetch('/api/vapid-public-key');
                const vapidData = await response.json();

                if (vapidData.publicKey) {
                    // CHIEDIAMO ESPLICITAMENTE IL PERMESSO PRIMA DI REGISTRARE
                    const permission = await Notification.requestPermission();

                    if (permission === 'granted') {
                        subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey)
                        });

                        await fetch('/api/subscribe', {
                            method: 'POST',
                            body: JSON.stringify(subscription),
                            headers: { 'Content-Type': 'application/json' }
                        });
                        console.log('Sottoscrizione push attivata e salvata con successo! 🚀');
                    } else {
                        console.warn("L'utente (o il browser) ha bloccato le notifiche push.");
                    }
                }
            }
        } catch (error) {
            // Un semplice avviso giallo invece di un errore rosso fatale
            console.warn('Le notifiche push non sono state attivate (probabile blocco di sicurezza del browser):', error.message);
        }
    });
}