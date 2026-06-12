import { HomeView } from './views/HomeView.js';
import { GymView } from './views/GymView.js';
import { NutritionView } from './views/NutritionView.js';
import { FooddexView } from './views/FooddexView.js';
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
            },
            () => switchModule('fooddex')
        );
        homeView.render();
    } else if (currentAppModule === 'gym') {
        const gymView = new GymView(appContainer);
        gymView.render();
    } else if (currentAppModule === 'nutrition') {
        const nutritionView = new NutritionView(appContainer);
        nutritionView.render();
    } else if (currentAppModule === 'fooddex') {
        const fooddexView = new FooddexView(appContainer, () => switchModule('home'));
        fooddexView.render();
    } else if (currentAppModule === 'pantry') {
        const pantryView = new PantryView(appContainer);
        pantryView.render();
    }
}

document.addEventListener('DOMContentLoaded', init);