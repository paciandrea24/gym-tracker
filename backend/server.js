import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- NUOVA LOGICA: SERVIRE IL FRONTEND ---
// In ES Modules (type: module) dobbiamo ricreare __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diciamo a Express di usare la cartella superiore (dove sta il tuo index.html) come cartella pubblica
app.use(express.static(path.join(__dirname, '../public')));

// 1. Connessione a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connesso a MongoDB"))
    .catch(err => console.error("❌ Errore MongoDB:", err));

// 2. Modello del Database per i Pasti
const MealSchema = new mongoose.Schema({
    pasto: String,
    alimenti: String,
    calorie: Number,
    proteine: Number,
    grassi: Number,
    carboidrati: Number,
    data: { type: Date, default: Date.now }
});
const Meal = mongoose.model('Meal', MealSchema);

// 3. Configurazione Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 4. L'API che la tua PWA chiamerà (Versione Robusta e con Log)
app.post('/api/analyze-meal', async (req, res) => {
    try {
        const { text } = req.body;
        console.log("🗣️ Testo ricevuto dall'app:", text);

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const dizionarioPersonale = `
        - Pan Bauletto: 277 kcal, 7.5g proteine, 50g carboidrati, 4g grassi
        - Latte parzialmente scremato: 46 kcal, 3.4g proteine, 4.8g carboidrati, 1.5g grassi
        - Pasta Barilla: 359 kcal, 14g proteine, 70g carboidrati, 2g grassi
        - Yogurt Greco Fage 0%: 54 kcal, 10.3g proteine, 3g carboidrati, 0g grassi
        `;

        const prompt = `Sei un assistente nutrizionale per un'app italiana. L'utente detterà un pasto. 
        Testo: "${text}"
        
        ORDINE DI PRIORITÀ TASSATIVO PER I CALCOLI:
        1. VALORI ESPLICITI DETTATI: Questa è la REGOLA ASSOLUTA e ha la precedenza su tutto.
           - Se l'utente detta le CALORIE, usa ESATTAMENTE il numero di calorie.
           - Se l'utente detta i MACRONUTRIENTI, usa ESATTAMENTE i numeri dettati.
           - SOLO SE l'utente detta i macronutrienti ma si dimentica le calorie, calcolale: (Pro * 4) + (Carbo * 4) + (Grassi * 9).
        2. DIZIONARIO PERSONALE: Solo se l'utente NON detta i valori, cerca l'alimento in questa lista (i valori sono su 100g): 
        ${dizionarioPersonale}
        ATTENZIONE ALLA MATEMATICA: Se l'utente dice il peso (es. 150g), dividi quel peso per 100 e moltiplicalo per i valori della tabella.
        3. CONOSCENZA GENERALE: Se l'alimento non è nel dizionario, stima usando i database standard.
        
        Restituisci SOLO un JSON puro con: { "pasto": "Stringa (es. Colazione, Pranzo)", "alimenti": "Stringa", "calorie": Numero, "proteine": Numero, "grassi": Numero, "carboidrati": Numero }. Non scrivere altro.`;

        const result = await model.generateContent(prompt);
        let jsonText = result.response.text();
        console.log("🤖 Risposta grezza di Gemini:", jsonText);

        // FONDAMENTALE: Pulizia di eventuali simboli strani che fanno crashare JSON.parse
        jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();

        const mealData = JSON.parse(jsonText);

        const newMeal = new Meal(mealData);
        await newMeal.save();
        console.log("✅ Pasto salvato nel Database:", newMeal);

        res.json({ success: true, meal: newMeal });

    } catch (error) {
        console.error("❌ ERRORE DEL SERVER (API):", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API per salvataggio manuale (Senza Gemini)
app.post('/api/meals', async (req, res) => {
    try {
        const newMeal = new Meal(req.body);
        await newMeal.save();
        res.json({ success: true, meal: newMeal });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. API per recuperare i pasti di oggi
app.get('/api/today-meals', async (req, res) => {
    try {
        // Cerca i pasti registrati da mezzanotte a ora
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const meals = await Meal.find({ data: { $gte: today } });
        res.json(meals);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API per eliminare un pasto
app.delete('/api/meals/:id', async (req, res) => {
    try {
        await Meal.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API per recuperare lo STORICO completo
app.get('/api/history', async (req, res) => {
    try {
        // Cerca tutti i pasti e li ordina per data decrescente (-1)
        const meals = await Meal.find().sort({ data: -1 });
        res.json(meals);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.use((req, res, next) => {
    // Se la richiesta NON inizia per /api, serviamo l'index.html
    if (!req.path.startsWith('/api')) {
        return res.sendFile(path.join(__dirname, '../public/index.html'));
    }
    // Altrimenti prosegui normalmente verso le API
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});