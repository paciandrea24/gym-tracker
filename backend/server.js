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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connesso a MongoDB"))
    .catch(err => console.error("❌ Errore MongoDB:", err));

// --- SCHEMI DATABASE ---
const IngredientSchema = new mongoose.Schema({
    nome: String, calorie: Number, proteine: Number, grassi: Number, carboidrati: Number, grammi: Number
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

// --- SCHEMA DISPENSA ---
const PantryItemSchema = new mongoose.Schema({
    // Dati prodotto
    barcode: { type: String, default: '' },         // vuoto per prodotti aggiunti a voce
    nome: { type: String, required: true },
    immagine: { type: String, default: '' },

    // Valori nutrizionali per 100g
    calorie100: { type: Number, default: 0 },
    proteine100: { type: Number, default: 0 },
    carbo100: { type: Number, default: 0 },
    grassi100: { type: Number, default: 0 },

    // Quantità in dispensa
    pesoConfezione: { type: Number, default: 0 },   // grammi per singola confezione
    quantitaConfezioni: { type: Number, default: 1 },// numero confezioni acquistate
    grammiTotali: { type: Number, default: 0 },      // pesoConfezione * quantitaConfezioni
    grammiRimasti: { type: Number, default: 0 },     // scalato ad ogni pasto

    // Soglia avviso: sotto il 20% del totale originale
    sogliaBassa: { type: Number, default: 20 },      // percentuale

    // Categoria (per l'AI)
    categoria: { type: String, default: 'Altro' },  // Proteina, Carboidrato, Verdura, Frutta, Latticino, Condimento, Altro

    dataAcquisto: { type: Date, default: Date.now },
    attivo: { type: Boolean, default: true }         // false = finito/rimosso
});
const PantryItem = mongoose.model('PantryItem', PantryItemSchema);

// --- SCHEMA CRONOLOGIA SCARICHI DISPENSA ---
const PantryUsageSchema = new mongoose.Schema({
    pantryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PantryItem' },
    nomeItem: String,
    grammiScalati: Number,
    mealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal', default: null },
    nomePasto: String,
    data: { type: Date, default: Date.now }
});
const PantryUsage = mongoose.model('PantryUsage', PantryUsageSchema);


// ============================================================
// API DISPENSA
// ============================================================

// GET — tutti gli articoli in dispensa (attivi)
app.get('/api/pantry', async (req, res) => {
    try {
        const items = await PantryItem.find({ attivo: true }).sort({ dataAcquisto: -1 });

        // Aggiungi flag "scorte basse" a ogni item
        const itemsConFlag = items.map(item => {
            const percentualeRimasta = item.grammiTotali > 0
                ? (item.grammiRimasti / item.grammiTotali) * 100
                : 0;
            return {
                ...item.toObject(),
                scortaBassa: percentualeRimasta <= item.sogliaBassa && item.grammiRimasti > 0,
                esaurito: item.grammiRimasti <= 0
            };
        });

        res.json(itemsConFlag);
    } catch (e) {
        res.status(500).json([]);
    }
});

// GET — cronologia scarichi di un articolo specifico
app.get('/api/pantry/:id/usage', async (req, res) => {
    try {
        const usage = await PantryUsage.find({ pantryItemId: req.params.id })
            .sort({ data: -1 })
            .limit(50);
        res.json(usage);
    } catch (e) {
        res.status(500).json([]);
    }
});

// POST — aggiungi articolo (da scanner o voce)
app.post('/api/pantry', async (req, res) => {
    try {
        const { barcode, nome, immagine, calorie100, proteine100, carbo100, grassi100,
            pesoConfezione, quantitaConfezioni, categoria } = req.body;

        const qty = parseInt(quantitaConfezioni) || 1;
        const peso = parseFloat(pesoConfezione) || 0;
        const grammiTotali = peso * qty;

        // Se esiste già un articolo con lo stesso barcode (o stesso nome se senza barcode)
        // aumenta solo la quantità invece di creare un duplicato
        let query = barcode
            ? { barcode, attivo: true }
            : { nome: { $regex: new RegExp(`^${nome}$`, 'i') }, attivo: true };

        const existing = await PantryItem.findOne(query);

        if (existing) {
            existing.quantitaConfezioni += qty;
            existing.grammiTotali += grammiTotali;
            existing.grammiRimasti += grammiTotali;
            await existing.save();
            return res.json({ success: true, item: existing, wasExisting: true });
        }

        const newItem = new PantryItem({
            barcode: barcode || '',
            nome, immagine: immagine || '',
            calorie100: parseFloat(calorie100) || 0,
            proteine100: parseFloat(proteine100) || 0,
            carbo100: parseFloat(carbo100) || 0,
            grassi100: parseFloat(grassi100) || 0,
            pesoConfezione: peso,
            quantitaConfezioni: qty,
            grammiTotali,
            grammiRimasti: grammiTotali,
            categoria: categoria || 'Altro'
        });

        await newItem.save();
        res.json({ success: true, item: newItem, wasExisting: false });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// PUT — aggiorna quantità manualmente (es. rifornimento)
app.put('/api/pantry/:id', async (req, res) => {
    try {
        const item = await PantryItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, item });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// DELETE — rimuove dalla dispensa
app.delete('/api/pantry/:id', async (req, res) => {
    try {
        await PantryItem.findByIdAndUpdate(req.params.id, { attivo: false });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// POST — scala grammi dalla dispensa (chiamato quando si salva un pasto)
// Body: { ingredienti: [{ nome, grammi }], mealId, nomePasto }
app.post('/api/pantry/consume', async (req, res) => {
    try {
        const { ingredienti, mealId, nomePasto } = req.body;
        const risultati = [];

        for (const ing of ingredienti) {
            if (!ing.nome || !ing.grammi || ing.grammi <= 0) continue;

            // Genera termini di ricerca: tutte le parole con 4+ caratteri
            const termini = ing.nome
                .replace(/\(.*?\)/g, '')           // rimuove "(100g)" ecc.
                .replace(/\d+\s*g\b/gi, '')        // rimuove "100g" standalone
                .trim()
                .split(/\s+/)
                .filter(t => t.length >= 4);

            let pantryItem = null;
            for (const termine of termini) {
                pantryItem = await PantryItem.findOne({
                    nome: { $regex: new RegExp(termine, 'i') },
                    attivo: true,
                    grammiRimasti: { $gt: 0 }
                });
                if (pantryItem) break;
            }

            if (pantryItem) {
                const grammiDaScalare = Math.min(ing.grammi, pantryItem.grammiRimasti);
                pantryItem.grammiRimasti = Math.max(0, pantryItem.grammiRimasti - grammiDaScalare);
                await pantryItem.save();

                // Salva nella cronologia
                await new PantryUsage({
                    pantryItemId: pantryItem._id,
                    nomeItem: pantryItem.nome,
                    grammiScalati: grammiDaScalare,
                    mealId: mealId || null,
                    nomePasto: nomePasto || 'Pasto non specificato'
                }).save();

                const percentuale = pantryItem.grammiTotali > 0
                    ? (pantryItem.grammiRimasti / pantryItem.grammiTotali) * 100
                    : 0;

                risultati.push({
                    nome: pantryItem.nome,
                    grammiScalati: grammiDaScalare,
                    grammiRimasti: pantryItem.grammiRimasti,
                    scortaBassa: percentuale <= pantryItem.sogliaBassa && pantryItem.grammiRimasti > 0,
                    esaurito: pantryItem.grammiRimasti <= 0
                });
            }
        }

        // Restituisce lista di prodotti con scorte basse per mostrare avvisi nel frontend
        const avvisi = risultati.filter(r => r.scortaBassa || r.esaurito);
        res.json({ success: true, risultati, avvisi });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST — ripristina grammi in dispensa (chiamato quando si elimina o riduce un ingrediente/pasto)
app.post('/api/pantry/restore', async (req, res) => {
    try {
        const { ingredienti, mealId, nomePasto } = req.body;
        const risultati = [];

        for (const ing of ingredienti) {
            if (!ing.nome || !ing.grammi || ing.grammi <= 0) continue;

            const termini = ing.nome
                .replace(/\(.*?\)/g, '')
                .replace(/\d+\s*g\b/gi, '')
                .trim()
                .split(/\s+/)
                .filter(t => t.length >= 4);

            let pantryItem = null;
            for (const termine of termini) {
                pantryItem = await PantryItem.findOne({
                    nome: { $regex: new RegExp(termine, 'i') },
                    attivo: true // Troviamo il prodotto anche se era andato a 0 grammi
                });
                if (pantryItem) break;
            }

            if (pantryItem) {
                const grammiDaRipristinare = ing.grammi;
                // Ripristiniamo i grammi (senza superare il totale originariamente acquistato)
                pantryItem.grammiRimasti = Math.min(pantryItem.grammiTotali, pantryItem.grammiRimasti + grammiDaRipristinare);
                await pantryItem.save();

                // Registriamo il ripristino con valore negativo nella cronologia
                await new PantryUsage({
                    pantryItemId: pantryItem._id,
                    nomeItem: pantryItem.nome,
                    grammiScalati: -grammiDaRipristinare,
                    mealId: mealId || null,
                    nomePasto: (nomePasto || 'Ripristino')
                }).save();

                risultati.push({
                    nome: pantryItem.nome,
                    grammiRipristinati: grammiDaRipristinare,
                    grammiRimasti: pantryItem.grammiRimasti
                });
            }
        }
        res.json({ success: true, risultati });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET — lista articoli per l'AI (solo nome, grammi rimasti, macro)
app.get('/api/pantry/for-ai', async (req, res) => {
    try {
        const items = await PantryItem.find({ attivo: true, grammiRimasti: { $gt: 0 } })
            .select('nome grammiRimasti calorie100 proteine100 carbo100 grassi100 categoria');
        res.json(items);
    } catch (e) {
        res.status(500).json([]);
    }
});

// Aggiungi questo in backend/server.js (zona API DISPENSA)

// Sostituisci questo blocco in backend/server.js

app.post('/api/pantry/add-to-off', async (req, res) => {
    try {
        const { barcode, nome, marca, foto, calorie100, proteine100, carbo100, grassi100 } = req.body;

        const user = process.env.OFF_USER;
        const pass = process.env.OFF_PASS;

        if (!user || !pass) {
            return res.status(500).json({ success: false, error: "Credenziali OFF non configurate nel server" });
        }

        // --- 1. INVIO DATI TESTUALI E MACRO ---
        const params = new URLSearchParams();
        params.append('code', barcode);
        params.append('user_id', user);
        params.append('password', pass);
        params.append('product_name', nome);
        if (marca) params.append('brands', marca);

        params.append('nutriment_energy-kcal', calorie100);
        params.append('nutriment_energy-kcal_unit', 'kcal');
        params.append('nutriment_proteins', proteine100);
        params.append('nutriment_proteins_unit', 'g');
        params.append('nutriment_carbohydrates', carbo100);
        params.append('nutriment_carbohydrates_unit', 'g');
        params.append('nutriment_fat', grassi100);
        params.append('nutriment_fat_unit', 'g');

        const offResponse = await fetch('https://world.openfoodfacts.org/cgi/product_jqm2.pl', {
            method: 'POST',
            body: params
        });
        const data = await offResponse.json();

        // --- 2. INVIO FOTO ---
        if (foto && (data.status === 1 || data.status_code === 1)) {
            const base64Data = foto.split(',')[1];
            const mimeMatch = foto.match(/data:(.*?);/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

            const buffer = Buffer.from(base64Data, 'base64');
            const blob = new Blob([buffer], { type: mimeType });

            const formData = new FormData();
            formData.append('code', barcode);
            formData.append('imagefield', 'front');
            formData.append('user_id', user);
            formData.append('password', pass);

            // 👇 ECCO LA CORREZIONE: OFF esige questo nome esatto! 👇
            formData.append('imgupload_front', blob, 'front.jpg');

            await fetch('https://world.openfoodfacts.org/cgi/product_image_upload.pl', {
                method: 'POST',
                body: formData
            });
        }

        if (data.status === 1 || data.status_code === 1) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: data.status_verbose });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});




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
            model: "gemini-2.5-flash-lite",
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
        const { question, goals, consumate, giaMangiati } = req.body;

        // 1. Recupera gli ultimi 50 pasti per estrapolare la lista dei cibi abituali (i tuoi gusti)
        const recentMeals = await Meal.find().sort({ data: -1 }).limit(50);
        const ingredientiAbituali = [...new Set(recentMeals.map(m => m.alimenti))].join(', ');

        // 2. Calcolo dei macro rimanenti
        const rimanenti = {
            calorie: Math.max(0, goals.calorie - consumate.calorie),
            proteine: Math.max(0, goals.proteine - consumate.proteine),
            carbo: Math.max(0, goals.carbo - consumate.carbo),
            grassi: Math.max(0, goals.grassi - consumate.grassi)
        };

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: { responseMimeType: "application/json" }
        });

        const cibiEvitare = (giaMangiati && giaMangiati.length > 0) ? giaMangiati.join(', ') : 'Nessuno';

        const prompt = `Sei il mio nutrizionista personale AI. L'app è usata solo da me.
        I miei OBIETTIVI RIMANENTI per la giornata di oggi sono circa: ${rimanenti.calorie.toFixed(0)} kcal, ${rimanenti.proteine.toFixed(0)}g Proteine, ${rimanenti.carbo.toFixed(0)}g Carbo, ${rimanenti.grassi.toFixed(0)}g Grassi.
        
        I miei GUSTI (cibi che mangio abitualmente): ${ingredientiAbituali || 'Usa cibi comuni, sani e semplici'}.
        
        La mia richiesta: "${question}"
        
        REGOLE FONDAMENTALI:
        1. Genera esattamente 3 opzioni di pasto principali, ben distinte tra loro.
        2. I pasti devono rispettare il più possibile i macro RIMANENTI senza sforare troppo in eccesso.
        3. ATTENZIONE AGLI SPUNTINI: Se la richiesta è per uno "Spuntino", DEVI proporre ESCLUSIVAMENTE cibi veloci, snack, frutta, yogurt, gallette, proteine in polvere, affettati, frutta secca o barrette. ASSOLUTAMENTE NESSUN PIATTO CUCINATO.
        4. INGREDIENTI: Devi comporre i pasti usando QUASI ESCLUSIVAMENTE i cibi elencati nei miei GUSTI. Usa la fantasia per combinarli, ma NON propormi ricette con ingredienti elaborati che non ho mai mangiato, a meno che non manchi un macro specifico per raggiungere l'obiettivo (in quel caso aggiungi 1 solo ingrediente base extra).
        5. Genera 1 "variante" per ogni opzione (es: cambia una fonte proteica o di carbo pescando sempre dai miei gusti).
        6. ATTENZIONE: Oggi ho GIA' MANGIATO questi alimenti: ${cibiEvitare}. È ASSOLUTAMENTE VIETATO suggerirli di nuovo nelle opzioni di oggi o nelle varianti. Scegli fonti alimentari diverse!
        
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

        // FIX ESTREMO PER PREVENIRE IL CRASH JSON:
        // Estraiamo in modo chirurgico solo la porzione che inizia con '[' e finisce con ']' 
        // ignorando tutto il testo discorsivo che l'IA potrebbe aver aggiunto prima o dopo.
        const startIndex = jsonText.indexOf('[');
        const endIndex = jsonText.lastIndexOf(']');

        if (startIndex !== -1 && endIndex !== -1) {
            jsonText = jsonText.substring(startIndex, endIndex + 1);
        } else {
            throw new Error("L'IA non ha formattato correttamente i dati.");
        }

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

// --- API CHIAVE VAPID PUBBLICA ---
app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: process.env.PUBLIC_VAPID_KEY });
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

// --- SCHEMA E API PESO CORPOREO ---
const WeightSchema = new mongoose.Schema({
    userId: { type: String, default: 'admin' },
    weight: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});
const Weight = mongoose.model('Weight', WeightSchema);

app.get('/api/weight', async (req, res) => {
    try {
        const logs = await Weight.find({ userId: 'admin' }).sort({ date: -1 });
        res.json(logs);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/weight', async (req, res) => {
    try {
        const newLog = new Weight({ weight: req.body.weight });
        await newLog.save();
        res.json({ success: true, log: newLog });
    } catch (e) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server avviato su porta ${PORT}`));