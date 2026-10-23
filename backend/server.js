import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import {
    ricalcolaPasto, totaliDaIngredienti, riepilogoConsumo, senzaCollegamentiPrep, risolviRiferimentiPrep, valoriPorzione,
    pesoCrudo, pesoCottoDa
} from './mealPrep.js';
import { tokenizza, classificaMatch } from './matching.js';
import { componiConsigli } from './nutrizionista.js';
import { valoriDaPer100 } from './voce.js';
import { suggerisciChiusure } from './giornateSimili.js';

dotenv.config();
console.log("Prime lettere della chiave API:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 8) : "CHIAVE NON TROVATA");

const app = express();
// Risposte compresse (gzip): circa 5 volte meno banda, Render gratuito ne include 5 GB al mese
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));
// Le risposte delle API non si tengono in cache (Safari su iPhone): acqua e pasti di oggi devono
// essere sempre quelli del giorno, anche se l'app è rimasta aperta da ieri
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
// Per cron-job.org: una chiamata ogni 10 minuti tiene sveglio il server (Render gratuito dorme dopo
// 15 minuti senza richieste). Non tocca il database.
app.get('/api/ping', (req, res) => res.json({ ok: true }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ Connesso a MongoDB");
        allineaPesiPreparazioni().catch(err => console.error("❌ Allineamento meal prep:", err.message));
    })
    .catch(err => console.error("❌ Errore MongoDB:", err));

// --- SCHEMI DATABASE ---
const IngredientSchema = new mongoose.Schema({
    nome: String, calorie: Number, proteine: Number, grassi: Number, carboidrati: Number, grammi: Number,
    // Solo per le porzioni di un meal prep: i valori li calcola il server da MealPrep
    prepId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealPrep' },
    prepGrammi: Number,
    prepPorzioni: Number,
    prepDaCompletare: Boolean,
    // Piatto intero: valori totali senza grammi (es. una stima, il panino del bar)
    piattoIntero: Boolean
});

const MealSchema = new mongoose.Schema({
    pasto: String, alimenti: String, calorie: Number, proteine: Number, grassi: Number, carboidrati: Number,
    ingredienti: [IngredientSchema], // Novità: Array degli ingredienti
    isFavorite: { type: Boolean, default: false },
    data: { type: Date, default: Date.now }
});
const Meal = mongoose.model('Meal', MealSchema);

// --- SCHEMA MEAL PREP (lotto cucinato che dura più giorni) ---
const MealPrepSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    ingredienti: [IngredientSchema],                  // crudi, scalati dalla dispensa all'inserimento
    calorie: { type: Number, default: 0 },            // totali dell'intero lotto
    proteine: { type: Number, default: 0 },
    carboidrati: { type: Number, default: 0 },
    grassi: { type: Number, default: 0 },
    pesoTotaleCotto: { type: Number, default: 0 },    // peso di riferimento: il crudo, o il cotto se pesato
    cottoPesato: { type: Boolean, default: false },   // true = pesoTotaleCotto viene dalla bilancia
    porzioniPreviste: { type: Number, default: 0 },   // 0 = non impostato
    attiva: { type: Boolean, default: true },
    dataCreazione: { type: Date, default: Date.now }
});
const MealPrep = mongoose.model('MealPrep', MealPrepSchema);

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

// POST — risolve i match dispensa senza scalare (usato dal frontend per disambiguare)
// Body: { ingredienti: [{nome, grammi}] }
app.post('/api/pantry/resolve-matches', async (req, res) => {
    try {
        const { ingredienti } = req.body;
        const tuttiItems = await PantryItem.find({ attivo: true }).select('_id nome grammiRimasti');
        const risultati = [];

        for (const ing of ingredienti) {
            if (!ing.nome) continue;
            const exact = [];
            const candidates = [];

            for (const item of tuttiItems) {
                const tipo = classificaMatch(ing.nome, item.nome);
                if (tipo === 'exact') exact.push({ _id: item._id, nome: item.nome, grammiRimasti: item.grammiRimasti });
                else if (tipo === 'candidate') candidates.push({ _id: item._id, nome: item.nome, grammiRimasti: item.grammiRimasti });
            }

            risultati.push({
                nome: ing.nome,
                grammi: ing.grammi,
                exact: exact.length === 1 ? exact[0] : null,  // esatto solo se univoco
                candidates: exact.length > 1 ? exact : candidates  // se più "esatti", trattali come candidati
            });
        }

        res.json(risultati);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST — scala grammi dalla dispensa usando pantryItemId esplicito (nessun fuzzy match)
// Body: { ingredienti: [{ nome, grammi, pantryItemId }], mealId, nomePasto }
app.post('/api/pantry/consume', async (req, res) => {
    try {
        const { ingredienti, mealId, nomePasto } = req.body;
        const risultati = [];

        for (const ing of ingredienti) {
            if (!ing.nome || !ing.grammi || ing.grammi <= 0 || !ing.pantryItemId) continue;

            const pantryItem = await PantryItem.findOne({ _id: ing.pantryItemId, attivo: true });
            if (!pantryItem) continue;

            const grammiDaScalare = Math.min(ing.grammi, pantryItem.grammiRimasti);
            pantryItem.grammiRimasti = Math.max(0, pantryItem.grammiRimasti - grammiDaScalare);
            await pantryItem.save();

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

        const avvisi = risultati.filter(r => r.scortaBassa || r.esaurito);
        res.json({ success: true, risultati, avvisi });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST — ripristina grammi in dispensa
// Usa pantryItemId se presente, altrimenti fallback fuzzy (compatibilità dati vecchi)
app.post('/api/pantry/restore', async (req, res) => {
    try {
        const { ingredienti, mealId, nomePasto } = req.body;
        const risultati = [];

        for (const ing of ingredienti) {
            if (!ing.nome || !ing.grammi || ing.grammi <= 0) continue;

            let pantryItem = null;

            if (ing.pantryItemId) {
                pantryItem = await PantryItem.findOne({ _id: ing.pantryItemId, attivo: true });
            }

            // Fallback fuzzy per pasti salvati prima dello Step 2
            if (!pantryItem) {
                const termini = tokenizza(ing.nome).filter(t => t.length >= 4);
                for (const termine of termini) {
                    pantryItem = await PantryItem.findOne({
                        nome: { $regex: new RegExp(termine, 'i') },
                        attivo: true
                    });
                    if (pantryItem) break;
                }
            }

            if (pantryItem) {
                const grammiDaRipristinare = ing.grammi;
                pantryItem.grammiRimasti = Math.min(pantryItem.grammiTotali, pantryItem.grammiRimasti + grammiDaRipristinare);
                await pantryItem.save();

                await new PantryUsage({
                    pantryItemId: pantryItem._id,
                    nomeItem: pantryItem.nome,
                    grammiScalati: -grammiDaRipristinare,
                    mealId: mealId || null,
                    nomePasto: nomePasto || 'Ripristino'
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
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

// Chiama Gemini in modalità JSON. Su errori temporanei (troppe richieste, servizio sovraccarico)
// riprova con attesa crescente invece di fallire subito: succedeva con due vocali ravvicinati.
async function generaJSON(prompt, tentativi = 3) {
    const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: "application/json" }
    });
    for (let i = 1; ; i++) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            const status = error.status || 0;
            const temporaneo = status === 429 || status === 500 || status === 503;
            console.error(`❌ Gemini tentativo ${i}/${tentativi} (status ${status}):`, error.message);
            if (!temporaneo || i >= tentativi) {
                const err = new Error(status === 429
                    ? "Troppe richieste all'AI in poco tempo: riprova tra qualche secondo."
                    : status === 503
                        ? "Il servizio AI è momentaneamente sovraccarico: riprova tra poco."
                        : "L'AI non è riuscita a elaborare la richiesta.");
                err.dettaglio = error.message;
                throw err;
            }
            await new Promise(r => setTimeout(r, 1500 * i));
        }
    }
}

function estraiJSON(testo, apertura, chiusura) {
    const start = testo.indexOf(apertura);
    const end = testo.lastIndexOf(chiusura);
    if (start === -1 || end === -1) throw new Error("L'AI non ha formattato correttamente i dati.");
    return JSON.parse(testo.substring(start, end + 1));
}

// Trasforma un testo dettato in { pasto, alimenti, ingredienti[] }.
// prepsAttive: preparazioni che l'AI deve riconoscere invece di stimarne i valori.
async function analizzaTesto(text, prepsAttive = [], grammiSoliti = {}) {
    const refMap = {};
    const righePrep = prepsAttive.map((p, i) => {
        const ref = `P${i + 1}`;
        refMap[ref] = String(p._id);
        return `- ${ref}: "${p.nome}"`;
    }).join('\n');

    const regolaPrep = prepsAttive.length === 0 ? '' : `
        9. L'utente ha queste PREPARAZIONI già cucinate (meal prep), di cui mangia una parte:
${righePrep}
           Se nomina chiaramente uno di questi piatti, NON stimarne i valori: inserisci l'ingrediente con
           "prepRef" (es. "P1") e "prepGrammi" SOLO se ha detto esplicitamente i grammi; altrimenti
           ometti "prepGrammi" (l'app userà la sua porzione solita).
           Per questi ingredienti metti calorie, proteine, grassi e carboidrati a 0: li calcola l'app.`;

    const dizionarioPersonale = `
        - Pan Bauletto: 277 kcal, 7.5g pro, 50g carbo, 4g grassi
        - Latte parzialmente scremato: 46 kcal, 3.4g pro, 4.8g carbo, 1.5g grassi
        - Pasta Barilla: 359 kcal, 14g pro, 70g carbo, 2g grassi
        - Yogurt Greco Fage 0%: 54 kcal, 10.3g pro, 3g carbo, 0g grassi
        - Petto di pollo crudo: 100 kcal, 23.3g pro, 0g carbo, 0.8g grassi
        `;

    const prompt = `Sei un assistente nutrizionale per un'app. L'utente detterà un pasto. Testo: "${text}"

        REGOLE:
        1. Se l'utente detta valori espliciti, usali.
        2. Altrimenti usa il dizionario per i calcoli su 100g: ${dizionarioPersonale}
        3. Altrimenti stima tu.
        4. Nel campo "nome" di ogni ingrediente scrivi SOLO il nome dell'alimento, senza quantità o grammi.
        5. Metti sempre i grammi consumati nel campo "grammi" (numero intero, es. 150). Se non specificati, stimali.
        6. PESI DA CRUDO: l'utente pesa tutto crudo. Per carne, pesce, pasta, riso, cereali, legumi secchi e patate
           usa SEMPRE i valori del crudo (es. pollo crudo circa 100-110 kcal, non 165 del cotto; riso crudo circa 350,
           non 130 del cotto), a meno che l'utente dica esplicitamente "cotto" o "cotta". Legumi in scatola o già
           lessati: i valori di quelli.
        7. FRUTTA CON BUCCIA: i grammi detti sono della parte mangiata. Se l'utente dice "con la buccia", "intera"
           o "col torsolo", togli lo scarto e nel campo "grammi" metti solo la parte mangiata: banana circa il 35%
           in meno, arancia e mandarino circa 25%, kiwi 15%, mela e pera 10%, melone e anguria 45%.
           Un frutto senza grammi: la parte mangiata di un frutto medio (es. banana media sbucciata circa 120 g).
        8. VALORI OGNI 100 G: per ogni ingrediente scrivi anche "kcal100", "proteine100", "carboidrati100" e
           "grassi100" (della parte mangiata, cruda salvo regola 6): i totali li ricalcola l'app sui grammi.
           Se l'utente detta i valori totali di un alimento (es. "un panino da 450 calorie"), metti null nei
           quattro campi ogni 100 g e scrivi i totali.${regolaPrep}

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
              "nome": "Solo nome ingrediente (es. Pollo)",
              "grammi": 0,
              "kcal100": 0,
              "proteine100": 0,
              "carboidrati100": 0,
              "grassi100": 0,
              "calorie": 0,
              "proteine": 0,
              "grassi": 0,
              "carboidrati": 0
            }
          ]
        }`;

    const data = estraiJSON(await generaJSON(prompt), '{', '}');
    let ingredienti = valoriDaPer100(risolviRiferimentiPrep(Array.isArray(data.ingredienti) ? data.ingredienti : [], refMap, grammiSoliti));

    if (ingredienti.length === 0) {
        ingredienti = [{
            nome: data.alimenti, calorie: data.calorie, proteine: data.proteine,
            carboidrati: data.carboidrati, grassi: data.grassi
        }];
    }

    // Le porzioni di meal prep ricevono i valori reali; i totali diventano la somma degli ingredienti
    const preps = new Map(prepsAttive.map(p => [String(p._id), p]));
    ricalcolaPasto({ ingredienti }, preps);

    return { pasto: data.pasto || 'Pasto', alimenti: data.alimenti || 'Pasto', ingredienti };
}

// Carica le preparazioni citate dagli ingredienti dei pasti, indicizzate per id stringa
async function caricaPrepsCitate(meals) {
    const ids = new Set();
    for (const m of meals) for (const ing of m.ingredienti || []) if (ing.prepId) ids.add(String(ing.prepId));
    if (ids.size === 0) return new Map();
    const preps = await MealPrep.find({ _id: { $in: [...ids] } }).lean();
    return new Map(preps.map(p => [String(p._id), p]));
}

// Riallinea le porzioni di meal prep di un pasto (oggetto semplice, prima di salvarlo)
async function normalizzaPorzioni(meal) {
    ricalcolaPasto(meal, await caricaPrepsCitate([meal]));
    return meal;
}

app.post('/api/analyze-meal', async (req, res) => {
    try {
        const { text, mealId } = req.body;
        console.log("🗣️ Testo ricevuto dall'app:", text);

        const prepsAttive = await MealPrep.find({ attiva: true }).select('nome calorie proteine carboidrati grassi pesoTotaleCotto porzioniPreviste').lean();
        const gruppi = await porzioniPerPrep(prepsAttive.map(p => p._id));
        const grammiSoliti = Object.fromEntries(prepsAttive.map(p => [String(p._id), riepilogoConsumo(p, gruppi.get(String(p._id))).ultimiGrammi]));
        const mealData = await analizzaTesto(text, prepsAttive, grammiSoliti);
        const totaliNuovi = totaliDaIngredienti(mealData.ingredienti);

        // SE C'È UN MEAL ID -> AGGIUNGO AL PASTO ESISTENTE
        if (mealId) {
            const existingMeal = await Meal.findById(mealId);
            if (!existingMeal) throw new Error("Pasto non trovato");

            for (const k of ['calorie', 'proteine', 'carboidrati', 'grassi']) {
                existingMeal[k] = parseFloat(((existingMeal[k] || 0) + totaliNuovi[k]).toFixed(1));
            }
            existingMeal.ingredienti.push(...mealData.ingredienti);
            existingMeal.alimenti += ", " + mealData.alimenti;

            await existingMeal.save();
            return res.json({ success: true, meal: existingMeal });
        }

        const newMeal = new Meal({ ...mealData, ...totaliNuovi });
        await newMeal.save();
        res.json({ success: true, meal: newMeal });
    } catch (error) {
        console.error("❌ ERRORE ANALISI VOCALE:", error.dettaglio || error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/meals', async (req, res) => {
    try {
        const newMeal = new Meal(await normalizzaPorzioni(req.body));
        await newMeal.save();
        res.json({ success: true, meal: newMeal });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// NUOVA ROTTA: Aggiorna un pasto esistente (usata per Scanner e inserimenti manuali in pasto esistente)
app.put('/api/meals/:id', async (req, res) => {
    try {
        const meal = await Meal.findByIdAndUpdate(req.params.id, await normalizzaPorzioni(req.body), { returnDocument: 'after' });
        res.json({ success: true, meal });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// ============================================================
// API MEAL PREP
// ============================================================

// Porzioni registrate nei pasti, raggruppate per preparazione
async function porzioniPerPrep(prepIds) {
    const meals = await Meal.find({ 'ingredienti.prepId': { $in: prepIds } }).sort({ data: -1 }).lean();
    const gruppi = new Map(prepIds.map(id => [String(id), []]));
    for (const meal of meals) {
        for (const ing of meal.ingredienti) {
            if (!ing.prepId || !gruppi.has(String(ing.prepId))) continue;
            gruppi.get(String(ing.prepId)).push({
                mealId: meal._id, data: meal.data, pasto: meal.pasto,
                prepGrammi: ing.prepGrammi || 0, prepPorzioni: ing.prepPorzioni || 0,
                grammi: ing.grammi || 0, prepDaCompletare: !!ing.prepDaCompletare,
                calorie: ing.calorie, proteine: ing.proteine, carboidrati: ing.carboidrati, grassi: ing.grassi
            });
        }
    }
    return gruppi;
}

async function prepConRiepilogo(prep, porzioni) {
    const p = prep.toObject ? prep.toObject() : prep;
    return { ...p, porzioni, riepilogo: riepilogoConsumo(p, porzioni) };
}

// Ricalcola tutti i pasti che contengono porzioni di questa preparazione
async function ricalcolaPastiCollegati(prep) {
    const preps = new Map([[String(prep._id), prep.toObject ? prep.toObject() : prep]]);
    const meals = await Meal.find({ 'ingredienti.prepId': prep._id });
    let aggiornati = 0;
    for (const meal of meals) {
        if (ricalcolaPasto(meal, preps)) {
            await meal.save();
            aggiornati++;
        }
    }
    return aggiornati;
}

function aggiornaTotaliLotto(prep) {
    Object.assign(prep, totaliDaIngredienti(prep.ingredienti));
}

// Il peso del lotto è quello degli ingredienti crudi (il cotto si considera pesante uguale).
// Le preparazioni ancora senza peso lo ricevono all'avvio e le loro porzioni "da completare" si riempiono;
// quelle con un peso del cotto inserito a mano in passato lo tengono finché non se ne cambiano gli ingredienti.
async function allineaPesiPreparazioni() {
    const senzaPeso = await MealPrep.find({ $or: [{ pesoTotaleCotto: { $in: [0, null] } }, { pesoTotaleCotto: { $exists: false } }] });
    let allineate = 0;
    for (const prep of senzaPeso) {
        const peso = pesoCrudo(prep.ingredienti);
        if (peso <= 0) continue;
        prep.pesoTotaleCotto = peso;
        await prep.save();
        await ricalcolaPastiCollegati(prep);
        allineate++;
    }
    if (allineate) console.log(`🍲 Meal prep: peso crudo impostato su ${allineate} preparazioni`);
}

app.get('/api/preps', async (req, res) => {
    try {
        const filtro = req.query.stato === 'tutte' ? {} : { attiva: true };
        const preps = await MealPrep.find(filtro).sort({ attiva: -1, dataCreazione: -1 }).lean();
        const gruppi = await porzioniPerPrep(preps.map(p => p._id));
        res.json(await Promise.all(preps.map(p => prepConRiepilogo(p, gruppi.get(String(p._id))))));
    } catch (e) {
        res.status(500).json([]);
    }
});

app.get('/api/preps/:id', async (req, res) => {
    try {
        const prep = await MealPrep.findById(req.params.id).lean();
        if (!prep) return res.status(404).json({ success: false, error: 'Preparazione non trovata' });
        const gruppi = await porzioniPerPrep([prep._id]);
        res.json({ success: true, prep: await prepConRiepilogo(prep, gruppi.get(String(prep._id))) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/preps', async (req, res) => {
    try {
        const nome = (req.body.nome || '').trim();
        if (!nome) return res.status(400).json({ success: false, error: 'Dai un nome alla preparazione.' });
        const prep = new MealPrep({ nome });
        await prep.save();
        res.json({ success: true, prep: await prepConRiepilogo(prep, []) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Modifica nome, ingredienti o stato: ricalcola i pasti collegati.
// Il peso del lotto: quando cambiano gli ingredienti diventa il loro peso crudo, finché l'utente non
// pesa il cotto. rimasti (g sulla bilancia) → cotto = rimasti + già segnato; finita → cotto = già segnato.
app.put('/api/preps/:id', async (req, res) => {
    try {
        const prep = await MealPrep.findById(req.params.id);
        if (!prep) return res.status(404).json({ success: false, error: 'Preparazione non trovata' });

        const { nome, ingredienti, attiva, rimasti, finita } = req.body;
        if (typeof nome === 'string' && nome.trim()) prep.nome = nome.trim();
        if (Array.isArray(ingredienti)) {
            prep.ingredienti = senzaCollegamentiPrep(ingredienti);
            if (!prep.cottoPesato) prep.pesoTotaleCotto = pesoCrudo(prep.ingredienti);
        }
        const sullaBilancia = finita === true ? 0 : (typeof rimasti === 'number' && rimasti >= 0 ? rimasti : null);
        if (sullaBilancia !== null) {
            const porzioni = (await porzioniPerPrep([prep._id])).get(String(prep._id));
            const cotto = pesoCottoDa(prep, porzioni, sullaBilancia);
            if (cotto > 0) {
                prep.pesoTotaleCotto = cotto;
                prep.cottoPesato = true;
            }
        }
        if (typeof attiva === 'boolean') prep.attiva = attiva;
        aggiornaTotaliLotto(prep);
        await prep.save();

        const pastiAggiornati = await ricalcolaPastiCollegati(prep);
        const gruppi = await porzioniPerPrep([prep._id]);
        res.json({ success: true, pastiAggiornati, prep: await prepConRiepilogo(prep, gruppi.get(String(prep._id))) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Eliminabile solo se nessuna porzione è stata registrata (altrimenti si conclude)
app.delete('/api/preps/:id', async (req, res) => {
    try {
        const usata = await Meal.exists({ 'ingredienti.prepId': req.params.id });
        if (usata) {
            return res.status(409).json({ success: false, error: 'Hai già registrato porzioni di questa preparazione: puoi solo concluderla.' });
        }
        await MealPrep.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Aggiunge ingredienti dettati a voce alla preparazione
app.post('/api/preps/:id/analyze', async (req, res) => {
    try {
        const prep = await MealPrep.findById(req.params.id);
        if (!prep) return res.status(404).json({ success: false, error: 'Preparazione non trovata' });

        const { ingredienti } = await analizzaTesto(req.body.text);
        prep.ingredienti.push(...ingredienti);
        aggiornaTotaliLotto(prep);
        await prep.save();

        await ricalcolaPastiCollegati(prep);
        const gruppi = await porzioniPerPrep([prep._id]);
        res.json({ success: true, nuoviIngredienti: ingredienti, prep: await prepConRiepilogo(prep, gruppi.get(String(prep._id))) });
    } catch (e) {
        console.error("❌ ERRORE ANALISI VOCALE PREP:", e.dettaglio || e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Registra una porzione: in un pasto esistente (mealId) o in un nuovo pasto (pasto)
app.post('/api/preps/:id/portion', async (req, res) => {
    try {
        const prep = await MealPrep.findById(req.params.id).lean();
        if (!prep) return res.status(404).json({ success: false, error: 'Preparazione non trovata' });

        const { mealId, pasto } = req.body;
        const prepGrammi = Math.max(0, Number(req.body.prepGrammi) || 0);
        if (!prepGrammi) return res.status(400).json({ success: false, error: 'Indica quanti grammi hai mangiato.' });

        const ing = { nome: prep.nome, prepId: prep._id, prepGrammi, prepPorzioni: 0 };
        const preps = new Map([[String(prep._id), prep]]);
        let meal;

        if (mealId) {
            meal = await Meal.findById(mealId);
            if (!meal) return res.status(404).json({ success: false, error: 'Pasto non trovato' });
            meal.ingredienti.push(ing);
            meal.alimenti = meal.alimenti ? `${meal.alimenti}, ${prep.nome}` : prep.nome;
        } else {
            meal = new Meal({
                pasto: pasto || 'Pasto', alimenti: prep.nome,
                calorie: 0, proteine: 0, carboidrati: 0, grassi: 0, ingredienti: [ing]
            });
        }
        ricalcolaPasto(meal, preps);
        await meal.save();
        res.json({ success: true, meal });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/today-meals', async (req, res) => {
    try {
        const todayMidnight = getItalyMidnight(); // <--- Usa la mezzanotte italiana
        const meals = await Meal.find({ data: { $gte: todayMidnight } });
        res.json(meals);
    } catch (error) { res.status(500).json({ success: false }); }
});

// --- API: COME CHIUDI DI SOLITO ---
// L'ultimo giorno (negli ultimi 60) arrivato allo stesso punto con macro simili e i pasti con cui
// è finito, pronti da copiare: tra quelli che portano oggi all'obiettivo di calorie (o, se nessuno
// ci arriva, quello che ci va più vicino). Body: { obiettivi: { calorie, proteine, carboidrati, grassi } }
app.post('/api/day-suggestions', async (req, res) => {
    try {
        const mezzanotte = getItalyMidnight();
        const pastiOggi = await Meal.find({ data: { $gte: mezzanotte } }).lean();
        if (pastiOggi.length === 0) return res.json({ success: true, suggerimenti: [] });

        const inizio = new Date(mezzanotte.getTime() - 60 * 24 * 60 * 60 * 1000);
        const storico = await Meal.find({ data: { $gte: inizio, $lt: mezzanotte } }).lean();

        const perGiorno = new Map();
        for (const m of storico) {
            const giorno = new Date(m.data).toLocaleDateString('fr-CA', { timeZone: 'Europe/Rome' });
            if (!perGiorno.has(giorno)) perGiorno.set(giorno, []);
            perGiorno.get(giorno).push(m);
        }
        const giorni = [...perGiorno].map(([giorno, pasti]) => ({ giorno, pasti }));

        const o = req.body?.obiettivi || {};
        const obiettivi = {
            calorie: Number(o.calorie) || 2000, proteine: Number(o.proteine) || 150,
            carboidrati: Number(o.carboidrati) || 200, grassi: Number(o.grassi) || 60
        };
        const suggerimenti = suggerisciChiusure(pastiOggi, giorni, { obiettivi });

        // Porzioni di preparazioni ormai finite: diventano ingredienti normali, non tolgono porzioni al lotto
        const attive = new Set((await MealPrep.find({ attiva: true }).select('_id').lean()).map(p => String(p._id)));
        for (const s of suggerimenti) {
            s.pasti = s.pasti.map(m => ({
                pasto: m.pasto, alimenti: m.alimenti,
                calorie: m.calorie, proteine: m.proteine, carboidrati: m.carboidrati, grassi: m.grassi,
                ingredienti: (m.ingredienti || []).map(({ _id, ...ing }) =>
                    ing.prepId && !attive.has(String(ing.prepId)) ? senzaCollegamentiPrep([ing])[0] : ing)
            }));
        }

        res.json({ success: true, suggerimenti });
    } catch (error) {
        console.error("❌ ERRORE CONSIGLI GIORNATA:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API: NUTRIZIONISTA AI BASATO SULLA DISPENSA (E SUI MEAL PREP) ---
// L'AI sceglie ingredienti e grammi; i valori li calcola componiConsigli dai dati veri.
app.post('/api/recommend-meal', async (req, res) => {
    try {
        const { question, goals = {}, consumate = {}, giaMangiati } = req.body;

        const dispensa = await PantryItem.find({ attivo: true, grammiRimasti: { $gt: 0 } })
            .select('nome grammiRimasti calorie100 proteine100 carbo100 grassi100 categoria').lean();

        // Meal prep attivi con un peso (somma dei grammi crudi) e non ancora finiti
        const prepsAttive = await MealPrep.find({ attiva: true }).lean();
        const gruppi = await porzioniPerPrep(prepsAttive.map(p => p._id));
        const prepsDisponibili = prepsAttive
            .map(p => ({ ...p, riepilogo: riepilogoConsumo(p, gruppi.get(String(p._id))) }))
            .filter(p => p.pesoTotaleCotto > 0 && p.calorie > 0 && p.riepilogo.quotaUsata < 0.97);

        if (dispensa.length === 0 && prepsDisponibili.length === 0) {
            return res.status(400).json({ success: false, error: 'Dispensa vuota: aggiungi prodotti (o un meal prep) per ricevere consigli.' });
        }

        const rimanenti = {
            calorie: Math.max(0, (goals.calorie || 0) - (consumate.calorie || 0)),
            proteine: Math.max(0, (goals.proteine || 0) - (consumate.proteine || 0)),
            carbo: Math.max(0, (goals.carbo || 0) - (consumate.carbo || 0)),
            grassi: Math.max(0, (goals.grassi || 0) - (consumate.grassi || 0))
        };

        const giaMangiatiStr = (giaMangiati && giaMangiati.length > 0) ? giaMangiati.join(', ') : 'niente';

        const dispensaStr = dispensa.length === 0 ? '(vuota)' : dispensa.map(p =>
            `- "${p.nome}" (${p.grammiRimasti}g disponibili): ${p.calorie100} kcal, ${p.proteine100}g P, ${p.carbo100}g C, ${p.grassi100}g G per 100g`
        ).join('\n');

        const prepsPerRef = {};
        const prepStr = prepsDisponibili.map((p, i) => {
            const ref = `P${i + 1}`;
            prepsPerRef[ref] = p;
            const v = valoriPorzione({ prepGrammi: 100 }, p);
            const solita = p.riepilogo.ultimiGrammi ? `, porzione solita ${p.riepilogo.ultimiGrammi}g` : '';
            return `- ${ref}: "${p.nome}" — 100g = ${v.calorie} kcal, ${v.proteine}g P, ${v.carboidrati}g C, ${v.grassi}g G (restano circa ${p.riepilogo.grammiRimasti}g${solita})`;
        }).join('\n');

        const prompt = `Sei il mio nutrizionista personale AI. L'app è usata solo da me.

OBIETTIVI RIMANENTI per oggi: ${rimanenti.calorie.toFixed(0)} kcal, ${rimanenti.proteine.toFixed(0)}g Proteine, ${rimanenti.carbo.toFixed(0)}g Carbo, ${rimanenti.grassi.toFixed(0)}g Grassi.

PRODOTTI IN DISPENSA (grammi disponibili e valori per 100g):
${dispensaStr}
${prepsDisponibili.length > 0 ? `
PIATTI GIÀ CUCINATI (meal prep, pronti da mangiare):
${prepStr}
` : ''}
La mia richiesta: "${question}"

REGOLE FONDAMENTALI — rispettale tutte:
1. Usa SOLO i prodotti della DISPENSA e i PIATTI GIÀ CUCINATI elencati. Non inventare ingredienti (niente sale, olio o altro se non è in elenco).
2. Per un prodotto della dispensa scrivi "nome" ESATTAMENTE come in elenco e i "grammi". Per un piatto già cucinato scrivi "prepRef" (es. "P1") e i "prepGrammi" da mangiare.
3. NON scrivere calorie o macro: li calcola l'app con precisione. Usa i valori per 100g solo per scegliere le quantità giuste.
4. Non superare i grammi disponibili. I grammi dei prodotti sono sempre da crudi, come in dispensa (pasta, riso e carne si pesano crudi); quelli dei piatti già cucinati sono del cotto.
5. STRATEGIA MACRO: avvicinati il più possibile alle quote di PROTEINE e CARBOIDRATI rimanenti. I GRASSI sono una soglia massima da non superare, non un obiettivo: meno grassi = meglio.
6. Genera 3 opzioni ben distinte, ognuna con 1 variante (cambia 1-2 ingredienti restando negli elenchi).
7. Se ci sono piatti già cucinati, usali in almeno un'opzione: vanno consumati prima che scadano.
8. SPUNTINI: se la richiesta è per uno "Spuntino", proponi solo combinazioni veloci senza cottura.
9. Oggi ho già mangiato: ${giaMangiatiStr}. Cerca di variare, ma puoi riproporre un alimento se serve davvero per i macro.

Restituisci SOLO un array JSON con questa esatta struttura:
[
  {
    "nomePasto": "Nome breve del pasto",
    "messaggio": "Breve nota su perché questo pasto è ottimale per i miei obiettivi.",
    "ingredienti": [
      { "nome": "Nome esatto dalla dispensa", "grammi": 0 },
      { "prepRef": "P1", "prepGrammi": 250 }
    ],
    "variante": {
      "nomePasto": "Nome variante",
      "messaggio": "Perché scegliere questa variante.",
      "ingredienti": [ { "nome": "Nome esatto dalla dispensa", "grammi": 0 } ]
    }
  }
]`;

        const opzioniAI = estraiJSON(await generaJSON(prompt), '[', ']');
        const recommendations = componiConsigli(opzioniAI, dispensa, prepsPerRef);
        if (recommendations.length === 0) {
            throw new Error("L'AI non ha proposto pasti con i prodotti disponibili. Riprova.");
        }

        res.json({ success: true, recommendations });
    } catch (error) {
        console.error("Errore AI Recommender:", error.dettaglio || error.message);
        res.status(500).json({ success: false, error: error.message || "Impossibile generare consigli in questo momento." });
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
        // Il preferito è una foto dei valori: le porzioni di meal prep perdono il collegamento
        const newFav = new FavoriteMeal({ ...req.body, ingredienti: senzaCollegamentiPrep(req.body.ingredienti) });
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

// --- API: TOTALI PER GIORNO (Peso e calorie) ---
// Calorie e macro di ogni giorno italiano con almeno un pasto, dal più vecchio
app.get('/api/giorni', async (req, res) => {
    try {
        const righe = await Meal.aggregate([
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$data', timezone: 'Europe/Rome' } },
                calorie: { $sum: '$calorie' }, proteine: { $sum: '$proteine' },
                carboidrati: { $sum: '$carboidrati' }, grassi: { $sum: '$grassi' }, pasti: { $sum: 1 }
            } },
            { $sort: { _id: 1 } }
        ]);
        res.json(righe.map(({ _id, ...totali }) => ({ giorno: _id, ...totali })));
    } catch (e) { res.status(500).json([]); }
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

// Una pesata al giorno (giorno italiano): se oggi c'è già, si aggiorna con l'ultima
app.post('/api/weight', async (req, res) => {
    try {
        const diOggi = await Weight.findOne({ userId: 'admin', date: { $gte: getItalyMidnight() } }).sort({ date: -1 });
        if (diOggi) {
            diOggi.weight = req.body.weight;
            diOggi.date = new Date();
            await diOggi.save();
            return res.json({ success: true, log: diOggi, aggiornata: true });
        }
        const newLog = new Weight({ weight: req.body.weight });
        await newLog.save();
        res.json({ success: true, log: newLog });
    } catch (e) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server avviato su porta ${PORT}`));