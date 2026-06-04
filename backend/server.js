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

// --- MODELLO DATABASE PER LA FIAMMA (STREAK) ---
const StreakSchema = new mongoose.Schema({
    userId: { type: String, default: 'admin' }, // Essendo l'app tua, usiamo un utente fisso
    currentStreak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: '' } // Salveremo la data nel formato YYYY-MM-DD
});
const Streak = mongoose.model('Streak', StreakSchema);

// Funzione di supporto per avere sempre la data italiana (evita bug di fuso orario sul server)
function getItalyDateStr(offsetDays = 0) {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
    d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// --- API: OTTIENI LO STATO DELLA FIAMMA ---
app.get('/api/streak', async (req, res) => {
    try {
        const todayStr = getItalyDateStr(0);
        const yesterdayStr = getItalyDateStr(-1);

        let streak = await Streak.findOne({ userId: 'admin' });
        if (!streak) {
            return res.json({ currentStreak: 0, activeToday: false });
        }

        let activeToday = (streak.lastActiveDate === todayStr);
        let current = streak.currentStreak;

        // Se l'ultima azione non è di oggi e nemmeno di ieri, la catena si è spezzata
        if (!activeToday && streak.lastActiveDate !== yesterdayStr && streak.lastActiveDate !== '') {
            current = 0;
        }

        res.json({ currentStreak: current, activeToday });
    } catch (e) {
        res.status(500).json({ error: "Errore streak" });
    }
});

// --- API: INFIAMMA (TRIGGER QUANDO SALVI PASTO/ALLENAMENTO) ---
app.post('/api/streak/trigger', async (req, res) => {
    try {
        const todayStr = getItalyDateStr(0);
        const yesterdayStr = getItalyDateStr(-1);

        let streak = await Streak.findOne({ userId: 'admin' });

        // Se non esiste, lo crea al giorno 1
        if (!streak) {
            streak = new Streak({ userId: 'admin', currentStreak: 1, lastActiveDate: todayStr });
            await streak.save();
            return res.json({ currentStreak: 1, activeToday: true });
        }

        // Se è già attivo oggi, non fa nulla (evita che la fiamma salga di 2 in un giorno)
        if (streak.lastActiveDate === todayStr) {
            return res.json({ currentStreak: streak.currentStreak, activeToday: true });
        }

        // Se l'ultima volta è stata ieri, aumenta di 1! Altrimenti, riparte da 1.
        if (streak.lastActiveDate === yesterdayStr) {
            streak.currentStreak += 1;
        } else {
            streak.currentStreak = 1;
        }

        streak.lastActiveDate = todayStr;
        await streak.save();

        res.json({ currentStreak: streak.currentStreak, activeToday: true });
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
        const { text } = req.body;
        console.log("🗣️ Testo ricevuto dall'app:", text);

        const model = genAI.getGenerativeModel({
            model: "gemini-3.5-flash",
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
        const newMeal = new Meal(mealData);
        await newMeal.save();

        res.json({ success: true, meal: newMeal });
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

app.get('/api/today-meals', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const meals = await Meal.find({ data: { $gte: today } });
        res.json(meals);
    } catch (error) { res.status(500).json({ success: false }); }
});

app.delete('/api/meals/:id', async (req, res) => {
    try {
        await Meal.findByIdAndDelete(req.params.id);

        // --- GESTIONE RIMOZIONE FIAMMA (EDGE CASE) ---
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Controlla se sono rimasti altri pasti loggati oggi
        const pastiRimanentiOggi = await Meal.countDocuments({ data: { $gte: startOfDay } });
        // Controlla se c'è almeno un allenamento oggi (endTime è un timestamp numerico)
        const workoutOggi = await History.countDocuments({ endTime: { $gte: startOfDay.getTime() } });

        // Se non ci sono più pasti e non ci sono allenamenti oggi...
        if (pastiRimanentiOggi === 0 && workoutOggi === 0) {
            const todayStr = getItalyDateStr(0);
            let streak = await Streak.findOne({ userId: 'admin' });

            // Se la fiamma era stata attivata oggi, facciamo "Rollback" (Marcia indietro)
            if (streak && streak.lastActiveDate === todayStr) {
                streak.currentStreak = Math.max(0, streak.currentStreak - 1); // Abbassa di 1 (senza andare sotto zero)
                streak.lastActiveDate = getItalyDateStr(-1); // Riportiamo l'ultimo giorno attivo a ieri
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
    try { const routines = await Routine.find(); res.json(routines); } catch (e) { res.status(500).json([]); }
});

app.post('/api/gym/routines', async (req, res) => {
    try {
        const r = req.body;
        await Routine.findOneAndUpdate({ id: r.id }, r, { upsert: true, new: true });
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
            body: "È ora di bere un bel bicchiere d'acqua! Mantieniti idratato."
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
                body: "Non hai ancora loggato la cena! Ricordati di inserirla prima di andare a letto."
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

app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) return res.sendFile(path.join(__dirname, '../public/index.html'));
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server avviato su porta ${PORT}`));