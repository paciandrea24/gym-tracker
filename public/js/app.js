import { HomeView } from './views/HomeView.js?v=40';
import { GymView } from './views/GymView.js?v=40';
import { NutritionView } from './views/NutritionView.js?v=40';
import { PantryView } from './views/PantryView.js?v=40';
import { chiaveGiorno, msAllaMezzanotte } from './components/format.js?v=40';
import * as voice from './components/voice.js?v=40';

const appContainer = document.getElementById('app');
let currentAppModule = 'home';
// Numero dell'ultima sezione aperta: una schermata che finisce di caricare dopo un cambio di
// sezione lo confronta e non disegna sopra quella nuova
let numeroVista = 0;
// La sezione aperta (per ricaricarla quando cambia il giorno)
let vistaCorrente = null;

function init() {
    setupNavigation();
    loadCurrentModule();
    aspettaMezzanotte();
}

// ─── NUOVO GIORNO ──────────────────────────────────────────────────────────
// Le schermate con i dati di oggi (Home, Nutrizione) hanno data-oggi col giorno dei dati. A
// mezzanotte, o quando l'app torna davanti dopo la mezzanotte (su iPhone resta aperta in
// sottofondo), si ricaricano: acqua, calorie e pasti ripartono da quelli del giorno nuovo.
// Non si ridisegna mentre si sta facendo qualcosa (foglio o finestra aperti, voce, fotocamera);
// le schermate interne non hanno data-oggi e tornando indietro si ricaricano comunque.
function qualcosaAperto() {
    const sopra = [...document.body.children].some(el => el.classList.contains('fixed') && el.classList.contains('inset-0'));
    const fotocamera = document.getElementById('scanner-container');
    return sopra || voice.inUso() || (!!fotocamera && !fotocamera.classList.contains('hidden'));
}

function controllaGiorno() {
    if (document.visibilityState === 'hidden') return;
    const schermata = appContainer.querySelector('[data-oggi]');
    if (!schermata || schermata.dataset.oggi === chiaveGiorno(new Date()) || qualcosaAperto()) return;
    vistaCorrente?.render();
}

// Qualche secondo dopo la mezzanotte, così anche il server è già nel giorno nuovo
function aspettaMezzanotte() {
    setTimeout(() => { controllaGiorno(); aspettaMezzanotte(); }, msAllaMezzanotte() + 3000);
}

document.addEventListener('visibilitychange', controllaGiorno);
window.addEventListener('pageshow', controllaGiorno);
window.addEventListener('focus', controllaGiorno);

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

// opzioni.spesa: apre la Dispensa direttamente sulla lista della spesa (dalla Home)
function switchModule(module, opzioni = {}) {
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

    loadCurrentModule(opzioni);
}

async function loadCurrentModule(opzioni = {}) {
    appContainer.dataset.vista = String(++numeroVista);
    if (currentAppModule === 'home') {
        const homeView = new HomeView(appContainer, {
            onNutrizione: () => switchModule('nutrition'),
            onPalestra: () => switchModule('gym'),
            onSpesa: () => switchModule('pantry', { spesa: true })
        });
        vistaCorrente = homeView;
        homeView.render();
    } else if (currentAppModule === 'gym') {
        const gymView = new GymView(appContainer);
        vistaCorrente = gymView;
        gymView.render();
    } else if (currentAppModule === 'nutrition') {
        const nutritionView = new NutritionView(appContainer);
        vistaCorrente = nutritionView;
        nutritionView.render();
    } else if (currentAppModule === 'pantry') {
        const pantryView = new PantryView(appContainer);
        vistaCorrente = pantryView;
        await pantryView.render();
        if (opzioni.spesa) pantryView.showShoppingList();
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
// --- REGISTRAZIONE SERVICE WORKER BASE (DA LASCIARE AL CARICAMENTO) ---
if ('serviceWorker' in navigator && 'PushManager' in window) {
    window.addEventListener('load', async () => {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registrato con successo.');
        } catch (error) {
            console.warn('Errore SW:', error.message);
        }
    });
}

// --- EASTER EGG: 5 TAP SULLA NAV BAR PER ATTIVARE LE NOTIFICHE ---
let navTapCount = 0;
let navTapTimeout;

document.addEventListener('DOMContentLoaded', () => {
    const navBar = document.querySelector('nav');
    if (navBar) {
        navBar.addEventListener('click', async () => {
            navTapCount++;
            clearTimeout(navTapTimeout);

            if (navTapCount >= 5) {
                navTapCount = 0;
                await requestPushPermissions();
            } else {
                // Se non fai il tap successivo entro 1 secondo, il contatore si azzera
                navTapTimeout = setTimeout(() => { navTapCount = 0; }, 1000);
            }
        });
    }
});

async function requestPushPermissions() {
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
        alert("Il tuo browser non supporta le notifiche push.");
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            alert("✅ Le notifiche sono già attive!");
            return;
        }

        // Ora siamo dentro un evento "click", quindi iOS farà comparire il popup!
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            const response = await fetch('/api/vapid-public-key');
            const vapidData = await response.json();

            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey)
            });

            await fetch('/api/subscribe', {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: { 'Content-Type': 'application/json' }
            });

            alert("🚀 Notifiche attivate con successo! Ora riceverai gli avvisi dal cronjob.");
        } else {
            alert("❌ Permesso negato. Devi attivare le notifiche per questa PWA dalle Impostazioni del tuo iPhone.");
        }
    } catch (error) {
        alert("Errore durante l'attivazione: " + error.message);
    }
}