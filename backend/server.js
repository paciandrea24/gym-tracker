import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connesso a MongoDB"))
    .catch(err => console.error("❌ Errore MongoDB:", err));

// --- SCHEMI DATABASE ---
const IngredientSchema = new mongoose.Schema({
    nome: String, calorie: Number, proteine: Number, grassi: Number, carboidrati: Number
});

const MealSchema = new mongoose.Schema({
    pasto: String, alimenti: String, calorie: Number, proteine: Number, grassi: Number, carboidrati: Number,
    ingredienti: [IngredientSchema], // Novità: Array degli ingredienti
    isFavorite: { type: Boolean, default: false },
    data: { type: Date, default: Date.now }
});
const Meal = mongoose.model('Meal', MealSchema);

// Nuovi schemi per la Palestra
const RoutineSchema = new mongoose.Schema({
    id: String, name: String, exercises: Array
});
const Routine = mongoose.model('Routine', RoutineSchema);

const HistorySchema = new mongoose.Schema({
    sessionId: Number, routineId: String, endTime: Number, exercises: Array
});
const History = mongoose.model('History', HistorySchema);

// --- MODELLO DATABASE FOODDEX ---
const FoodDexSchema = new mongoose.Schema({
    barcode: { type: String, required: true, unique: true },
    nome: String,
    immagine: String,
    calorie100: Number,
    proteine100: Number,
    carbo100: Number,
    grassi100: Number,
    pesoConfezione: Number,
    tipoAlimento: String, // Es. "Lotta 🥊"
    dataScoperta: { type: Date, default: Date.now }
});
const FoodDex = mongoose.model('FoodDex', FoodDexSchema);

// --- API FOODDEX ---
app.get('/api/fooddex', async (req, res) => {
    try {
        const items = await FoodDex.find().sort({ dataScoperta: -1 });
        res.json(items);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/fooddex', async (req, res) => {
    try {
        const item = req.body;
        // Controlla se il codice a barre esiste già nel DB
        const existing = await FoodDex.findOne({ barcode: item.barcode });

        if (existing) {
            // Già catturato! Restituisce true e impedisce il doppione
            res.json({ success: true, alreadyCaught: true, item: existing });
        } else {
            // Nuovo alimento! Lo salva
            const newItem = new FoodDex(item);
            await newItem.save();
            res.json({ success: true, alreadyCaught: false, item: newItem });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- MODELLO DATABASE PER LA FIAMMA (STREAK) ---
const StreakSchema = new mongoose.Schema({
    userId: { type: String, default: 'admin' },
    currentStreak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: '' },
    longestStreak: { type: Number, default: 0 }, // NUOVO: Record Personale
    totalDaysActive: { type: Number, default: 0 } // NUOVO: Giorni totali di utilizzo
});
const Streak = mongoose.model('Streak', StreakSchema);

function getItalyDateStr(offsetDays = 0) {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
    d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Calcola la mezzanotte odierna in Italia convertendola nel corretto momento UTC per MongoDB
function getItalyMidnight() {
    const todayStr = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Rome" }); // Ritorna sempre "YYYY-MM-DD" italiano
    const midnightUTC = new Date(`${todayStr}T00:00:00Z`);
    const now = new Date();
    const romaDateObj = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
    const offsetInMs = romaDateObj.getTime() - now.getTime();
    return new Date(midnightUTC.getTime() - offsetInMs);
}

// --- API: OTTIENI LO STATO DELLA FIAMMA ---
app.get('/api/streak', async (req, res) => {
    try {
        const todayStr = getItalyDateStr(0);
        const yesterdayStr = getItalyDateStr(-1);

        let streak = await Streak.findOne({ userId: 'admin' });
        if (!streak) {
            return res.json({ currentStreak: 0, activeToday: false, longestStreak: 0, totalDaysActive: 0 });
        }

        let activeToday = (streak.lastActiveDate === todayStr);
        let current = streak.currentStreak;

        // Se l'ultima azione non è di oggi e nemmeno di ieri, la catena si è spezzata
        if (!activeToday && streak.lastActiveDate !== yesterdayStr && streak.lastActiveDate !== '') {
            current = 0;
        }

        res.json({
            currentStreak: current,
            activeToday,
            longestStreak: streak.longestStreak,
            totalDaysActive: streak.totalDaysActive
        });
    } catch (e) {
        res.status(500).json({ error: "Errore streak" });
    }
});

// --- API: INFIAMMA (TRIGGER) E AGGIORNA STATISTICHE ---
app.post('/api/streak/trigger', async (req, res) => {
    try {
        const todayStr = getItalyDateStr(0);
        const yesterdayStr = getItalyDateStr(-1);

        let streak = await Streak.findOne({ userId: 'admin' });

        if (!streak) {
            streak = new Streak({
                userId: 'admin', currentStreak: 1, lastActiveDate: todayStr,
                longestStreak: 1, totalDaysActive: 1
            });
            await streak.save();
            return res.json({ currentStreak: 1, activeToday: true, longestStreak: 1, totalDaysActive: 1 });
        }

        if (streak.lastActiveDate === todayStr) {
            return res.json({ currentStreak: streak.currentStreak, activeToday: true, longestStreak: streak.longestStreak, totalDaysActive: streak.totalDaysActive });
        }

        if (streak.lastActiveDate === yesterdayStr) {
            streak.currentStreak += 1;
        } else {
            streak.currentStreak = 1;
        }

        // AGGIORNAMENTO RECORD E GIORNI TOTALI
        streak.totalDaysActive += 1;
        if (streak.currentStreak > streak.longestStreak) {
            streak.longestStreak = streak.currentStreak;
        }

        streak.lastActiveDate = todayStr;
        await streak.save();

        res.json({ currentStreak: streak.currentStreak, activeToday: true, longestStreak: streak.longestStreak, totalDaysActive: streak.totalDaysActive });
    } catch (e) {
        res.status(500).json({ error: "Errore salvataggio streak" });
    }
});

// --- CONFIGURAZIONE NOTIFICHE PUSH ---
if (process.env.PUBLIC_VAPID_KEY && process.env.PRIVATE_VAPID_KEY) {
    webpush.setVapidDetails(
        'mailto:tuamail@example.com', // Metti la tua vera mail qui
        process.env.PUBLIC_VAPID_KEY,
        process.env.PRIVATE_VAPID_KEY
    );
}

const SubscriptionSchema = new mongoose.Schema({
    endpoint: String,
    keys: mongoose.Schema.Types.Mixed,
});
const Subscription = mongoose.model('Subscription', SubscriptionSchema);


// --- API NUTRIZIONE ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/analyze-meal', async (req, res) => {
    try {
        // Aggiungiamo mealId per capire se è un'aggiunta
        const { text, mealId } = req.body;
        console.log("🗣️ Testo ricevuto dall'app:", text);

        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite",
            generationConfig: { responseMimeType: "application/json" }
        });

        const dizionarioPersonale = `
        - Pan Bauletto: 277 kcal, 7.5g pro, 50g carbo, 4g grassi
        - Latte parzialmente scremato: 46 kcal, 3.4g pro, 4.8g carbo, 1.5g grassi
        - Pasta Barilla: 359 kcal, 14g pro, 70g carbo, 2g grassi
        - Yogurt Greco Fage 0%: 54 kcal, 10.3g pro, 3g carbo, 0g grassi
        `;

        const prompt = `Sei un assistente nutrizionale per un'app. L'utente detterà un pasto. Testo: "${text}"
        
        REGOLE:
        1. Se l'utente detta valori espliciti, usali.
        2. Altrimenti usa il dizionario per i calcoli su 100g: ${dizionarioPersonale}
        3. Altrimenti stima tu.
        
        Restituisci SOLO un JSON con questa esatta struttura:
        {
          "pasto": "Colazione/Pranzo/Cena/Spuntino",
          "alimenti": "Nome generale (es. Pollo e Riso)",
          "calorie": 0,
          "proteine": 0,
          "grassi": 0,
          "carboidrati": 0,
          "ingredienti": [
            {
              "nome": "Singolo ingrediente con quantità",
              "calorie": 0,
              "proteine": 0,
              "grassi": 0,
              "carboidrati": 0
            }
          ]
        }`;

        const result = await model.generateContent(prompt);
        let jsonText = result.response.text();
        jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();

        const mealData = JSON.parse(jsonText);

        // SE C'È UN MEAL ID -> AGGIORNO IL PASTO ESISTENTE
        if (mealId) {
            const existingMeal = await Meal.findById(mealId);
            if (!existingMeal) throw new Error("Pasto non trovato");

            existingMeal.calorie = parseFloat((existingMeal.calorie + mealData.calorie).toFixed(1));
            existingMeal.proteine = parseFloat((existingMeal.proteine + mealData.proteine).toFixed(1));
            existingMeal.carboidrati = parseFloat((existingMeal.carboidrati + mealData.carboidrati).toFixed(1));
            existingMeal.grassi = parseFloat((existingMeal.grassi + mealData.grassi).toFixed(1));

            if (mealData.ingredienti && mealData.ingredienti.length > 0) {
                existingMeal.ingredienti.push(...mealData.ingredienti);
            } else {
                existingMeal.ingredienti.push({
                    nome: mealData.alimenti,
                    calorie: mealData.calorie, proteine: mealData.proteine,
                    carboidrati: mealData.carboidrati, grassi: mealData.grassi
                });
            }
            existingMeal.alimenti += ", " + mealData.alimenti;

            await existingMeal.save();
            return res.json({ success: true, meal: existingMeal });
        }
        // ALTRIMENTI -> CREO UN NUOVO PASTO (Comportamento Originale)
        else {
            const newMeal = new Meal(mealData);
            await newMeal.save();
            res.json({ success: true, meal: newMeal });
        }
    } catch (error) {
        console.error("❌ ERRORE API GEMINI:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/meals', async (req, res) => {
    try {
        const newMeal = new Meal(req.body);
        await newMeal.save();
        res.json({ success: true, meal: newMeal });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// NUOVA ROTTA: Aggiorna un pasto esistente (usata per Scanner e inserimenti manuali in pasto esistente)
app.put('/api/meals/:id', async (req, res) => {
    try {
        const meal = await Meal.findByIdAndUpdate(req.params.id, req.body, { new: true, returnDocument: 'after' });
        res.json({ success: true, meal });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/today-meals', async (req, res) => {
    try {
        const todayMidnight = getItalyMidnight(); // <--- Usa la mezzanotte italiana
        const meals = await Meal.find({ data: { $gte: todayMidnight } });
        res.json(meals);
    } catch (error) { res.status(500).json({ success: false }); }
});

// --- API: CONSIGLIERE NUTRIZIONALE BASATO SUI GUSTI (OPZIONE B) ---
app.post('/api/recommend-meal', async (req, res) => {
    try {
        const { question, goals, consumate } = req.body;

        // 1. Recupera gli ultimi 50 pasti per estrapolare la lista dei cibi abituali (i tuoi gusti)
        const recentMeals = await Meal.find().sort({ data: -1 }).limit(50);
        const ingredientiAbituali = [...new Set(recentMeals.map(m => m.alimenti))].join(', ');

        // 2. Calcolo dei macro rimanenti (aiutiamo l'IA facendole noi la matematica base)
        const rimanenti = {
            calorie: Math.max(0, goals.calorie - consumate.calorie),
            proteine: Math.max(0, goals.proteine - consumate.proteine),
            carbo: Math.max(0, goals.carbo - consumate.carbo),
            grassi: Math.max(0, goals.grassi - consumate.grassi)
        };

        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `Sei il mio nutrizionista personale AI. L'app è usata solo da me.
        I miei OBIETTIVI RIMANENTI per la giornata di oggi sono circa: ${rimanenti.calorie.toFixed(0)} kcal, ${rimanenti.proteine.toFixed(0)}g Proteine, ${rimanenti.carbo.toFixed(0)}g Carbo, ${rimanenti.grassi.toFixed(0)}g Grassi.
        
        I miei GUSTI (cibi che mangio abitualmente): ${ingredientiAbituali || 'Usa cibi comuni, sani e semplici'}.
        
        La mia richiesta: "${question}"
        
        REGOLE FONDAMENTALI:
        1. Genera esattamente 3 opzioni di pasto principali, ben distinte tra loro.
        2. I pasti devono rispettare il più possibile i macro RIMANENTI senza sforare troppo in eccesso.
        3. ATTENZIONE AGLI SPUNTINI: Se la richiesta è per uno "Spuntino", DEVI proporre ESCLUSIVAMENTE cibi veloci, snack, frutta, yogurt, gallette, proteine in polvere, affettati, frutta secca o barrette. ASSOLUTAMENTE NESSUN PIATTO CUCINATO (niente pasta, niente pollo ai ferri, niente pesce).
        4. CREATIVITÀ: Usa i miei gusti abituali come base, ma hai la totale libertà di inserire 1 o 2 ingredienti nuovi o sfiziosi per variare la dieta, purché abbiano senso con il pasto.
        5. Genera 1 "variante" per ogni opzione (es: cambia una fonte proteica o di carbo).
        
        Restituisci SOLO un array JSON con questa esatta struttura:
        [
          {
            "nomePasto": "Nome del pasto 1",
            "totaleCalorie": 0,
            "totaleProteine": 0,
            "totaleCarbo": 0,
            "totaleGrassi": 0,
            "messaggio": "Breve frase motivazionale o consiglio su questo pasto.",
            "ingredienti": [
              { "nome": "Ingrediente 1 (quantità in g)", "calorie": 0, "proteine": 0, "carboidrati": 0, "grassi": 0 }
            ],
            "variante": {
              "nomePasto": "Variante del pasto 1",
              "totaleCalorie": 0,
              "totaleProteine": 0,
              "totaleCarbo": 0,
              "totaleGrassi": 0,
              "messaggio": "Motivo per scegliere questa variante.",
              "ingredienti": [
                { "nome": "Ingrediente alternativo (quantità)", "calorie": 0, "proteine": 0, "carboidrati": 0, "grassi": 0 }
              ]
            }
          }
        ]`;

        const result = await model.generateContent(prompt);
        let jsonText = result.response.text();

        // Pulizia preventiva (nel caso Gemini aggiunga formattazione markdown per errore)
        jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();

        const recommendations = JSON.parse(jsonText);

        res.json({ success: true, recommendations });
    } catch (error) {
        console.error("Errore AI Recommender:", error);
        res.status(500).json({ success: false, error: "Impossibile generare consigli in questo momento." });
    }
});

// --- NUOVO SCHEMA PREFERITI INDIPENDENTI ---
const FavoriteMealSchema = new mongoose.Schema({
    pasto: String, alimenti: String, calorie: Number, proteine: Number, grassi: Number, carboidrati: Number,
    ingredienti: [IngredientSchema]
});
const FavoriteMeal = mongoose.model('FavoriteMeal', FavoriteMealSchema);

// --- API PREFERITI (CAROSELLO) ---
// Aggiunge una copia slegata del pasto ai preferiti
app.post('/api/favorites', async (req, res) => {
    try {
        const newFav = new FavoriteMeal(req.body);
        await newFav.save();
        res.json({ success: true, favorite: newFav });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/favorites', async (req, res) => {
    try {
        // Peschiamo dalla nuova collezione indipendente
        const favs = await FavoriteMeal.find().sort({ _id: -1 });

        const uniqueFavs = [];
        const seen = new Set();
        for (let f of favs) {
            const nomeLower = f.alimenti.toLowerCase();
            if (!seen.has(nomeLower)) {
                seen.add(nomeLower);
                uniqueFavs.push(f);
            }
        }
        res.json(uniqueFavs);
    } catch (error) {
        res.status(500).json([]);
    }
}); // <-- CORRETTO: Prima mancava il ');' qui!

// Rimozione di un preferito dalla libreria
app.delete('/api/favorites/:id', async (req, res) => {
    try {
        await FavoriteMeal.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/meals/:id', async (req, res) => {
    try {
        await Meal.findByIdAndDelete(req.params.id);

        // --- GESTIONE RIMOZIONE FIAMMA (EDGE CASE) ---
        const todayMidnight = getItalyMidnight(); // <--- Sostituisci il vecchio startOfDay con questo

        // Controlla se sono rimasti altri pasti loggati oggi
        const pastiRimanentiOggi = await Meal.countDocuments({ data: { $gte: todayMidnight } });
        // Controlla se c'è almeno un allenamento oggi (endTime è un timestamp numerico)
        const workoutOggi = await History.countDocuments({ endTime: { $gte: todayMidnight.getTime() } });

        // Se non ci sono più pasti e non ci sono allenamenti oggi...
        if (pastiRimanentiOggi === 0 && workoutOggi === 0) {
            const todayStr = getItalyDateStr(0);
            let streak = await Streak.findOne({ userId: 'admin' });

            // Se la fiamma era stata attivata oggi, facciamo "Rollback" (Marcia indietro)
            if (streak && streak.lastActiveDate === todayStr) {
                streak.currentStreak = Math.max(0, streak.currentStreak - 1);
                streak.totalDaysActive = Math.max(0, streak.totalDaysActive - 1); // <-- AGGIUNGI QUESTA RIGA
                streak.lastActiveDate = getItalyDateStr(-1);
                await streak.save();
            }
        }
        // ---------------------------------------------

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const meals = await Meal.find().sort({ data: -1 });
        res.json(meals);
    } catch (error) { res.status(500).json({ success: false }); }
});

// --- API PALESTRA (Novità Cloud) ---
app.get('/api/gym/routines', async (req, res) => {
    // QUI ERA L'ERRORE: Ora legge di nuovo correttamente tutte le schede con .find()
    try { const routines = await Routine.find(); res.json(routines); } catch (e) { res.status(500).json([]); }
});

app.post('/api/gym/routines', async (req, res) => {
    try {
        const r = req.body;
        // QUI VA LA CORREZIONE DI MONGOOSE (returnDocument: 'after' al posto di new: true)
        await Routine.findOneAndUpdate({ id: r.id }, r, { upsert: true, returnDocument: 'after' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/gym/routines/:id', async (req, res) => {
    try { await Routine.findOneAndDelete({ id: req.params.id }); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/gym/history', async (req, res) => {
    try { const history = await History.find(); res.json(history); } catch (e) { res.status(500).json([]); }
});

app.post('/api/gym/history', async (req, res) => {
    try {
        const newHistory = new History(req.body);
        await newHistory.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});


// --- API ISCRIZIONE NOTIFICHE ---
app.post('/api/subscribe', async (req, res) => {
    try {
        const sub = req.body;
        await Subscription.findOneAndUpdate({ endpoint: sub.endpoint }, sub, { upsert: true });
        res.status(201).json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// --- ROTTA SEGRETA PER CRON-JOB (Notifiche Intelligenti) ---
app.get('/api/trigger-notifications', async (req, res) => {
    if (req.query.secret !== process.env.CRON_SECRET) {
        return res.status(403).json({ error: "Accesso negato" });
    }

    const tipoNotifica = req.query.type;
    let payloadStr = "";
    let shouldSend = true;

    if (tipoNotifica === 'acqua') {
        payloadStr = JSON.stringify({
            title: "Idratazione! 💧",
            body: "È l'ora di un bel bicchierino d'acqua! Mantieniti idratato."
        });
    } else if (tipoNotifica === 'cena') {
        // Controllo intelligente: hai già cenato oggi?
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Cerca nel DB un pasto di oggi la cui stringa 'pasto' contenga "cena" (ignorando maiuscole/minuscole)
        const cenaLoggata = await Meal.findOne({
            data: { $gte: startOfDay },
            pasto: { $regex: /cena/i }
        });

        if (cenaLoggata) {
            shouldSend = false; // Hai già inserito la cena, non ti disturbo!
        } else {
            payloadStr = JSON.stringify({
                title: "Diario Alimentare 🍽️",
                body: "Non hai ancora salvato la cena! Ricordati di inserirla prima di andare a letto."
            });
        }
    }

    if (!shouldSend) {
        return res.json({ success: true, message: "Notifica annullata: obiettivo già raggiunto." });
    }

    try {
        const subs = await Subscription.find();
        subs.forEach(sub => {
            webpush.sendNotification(sub, payloadStr).catch(err => console.error("Errore push:", err));
        });
        res.json({ success: true, message: `Notifiche '${tipoNotifica}' inviate!` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- SCHEMA E API ACQUA ---
const WaterSchema = new mongoose.Schema({
    userId: { type: String, default: 'admin' },
    date: { type: String, required: true }, // Formato YYYY-MM-DD
    glasses: { type: Number, default: 0 }
});
const Water = mongoose.model('Water', WaterSchema);

app.get('/api/water', async (req, res) => {
    try {
        const todayStr = getItalyDateStr(0);
        let record = await Water.findOne({ userId: 'admin', date: todayStr });
        res.json({ glasses: record ? record.glasses : 0 });
    } catch (e) { res.status(500).json({ glasses: 0 }); }
});

app.post('/api/water', async (req, res) => {
    try {
        const { glasses } = req.body;
        const todayStr = getItalyDateStr(0);
        await Water.findOneAndUpdate(
            { userId: 'admin', date: todayStr },
            { glasses: glasses },
            { upsert: true, returnDocument: 'after' }
        );
        res.json({ success: true, glasses });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) return res.sendFile(path.join(__dirname, '../public/index.html'));
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server avviato su porta ${PORT}`));