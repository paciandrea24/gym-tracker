// public/js/app.js

import { HomeView } from './views/HomeView.js';
import { GymView } from './views/GymView.js';
import { NutritionView } from './views/NutritionView.js';
import { FooddexView } from './views/FooddexView.js';

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

    if (navHome) navHome.addEventListener('click', () => switchModule('home'));
    if (navGym) navGym.addEventListener('click', () => switchModule('gym'));
    if (navNutri) navNutri.addEventListener('click', () => switchModule('nutrition'));
}

function switchModule(module) {
    currentAppModule = module;
    const navHome = document.getElementById('nav-home');
    const navGym = document.getElementById('nav-gym');
    const navNutri = document.getElementById('nav-nutri');

    if (navHome && navGym && navNutri) {
        navHome.className = `flex flex-col items-center w-[70px] transition-colors ${module === 'home' ? 'text-[#4F46E5]' : 'text-gray-400 hover:text-gray-600'}`;
        navGym.className = `flex flex-col items-center w-[70px] transition-colors ${module === 'gym' ? 'text-[#4F46E5]' : 'text-gray-400 hover:text-gray-600'}`;
        navNutri.className = `flex flex-col items-center w-[70px] transition-colors ${module === 'nutrition' ? 'text-[#4F46E5]' : 'text-gray-400 hover:text-gray-600'}`;
    }

    loadCurrentModule();
}

function loadCurrentModule() {
    if (currentAppModule === 'home') {
        const homeView = new HomeView(
            appContainer,
            () => switchModule('gym'),
            (openAddMeal) => {
                // Aggiorna manualmente lo stato visivo della navbar
                currentAppModule = 'nutrition';
                document.getElementById('nav-nutri').className = `flex flex-col items-center w-[70px] transition-colors text-[#4F46E5]`;
                document.getElementById('nav-home').className = `flex flex-col items-center w-[70px] transition-colors text-gray-400 hover:text-gray-600`;

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
    }
}

document.addEventListener('DOMContentLoaded', init);