# Meal prep — design

Data: 2026-10-09 · Stato: approvato ("si fai tutto")

## Obiettivo

Registrare una volta sola un lotto cucinato (es. ragù: passata + macinato + olio) che dura più giorni,
e poi aggiungere ogni giorno la propria porzione in pochi tap, con macro corretti anche se si cambia
idea sul numero di giorni o si pesa il cotto più tardi.

Due modi di misurare una porzione, anche mescolabili sulla stessa preparazione:

- **porzioni uguali**: `quota = prepPorzioni / porzioniPreviste` (N modificabile in ogni momento)
- **a peso**: `quota = prepGrammi / pesoTotaleCotto` (peso del cotto, pentola esclusa)

## Decisioni prese con l'utente

- Approccio A: collezione `MealPrep` separata, porzioni come ingredienti collegati dentro i pasti.
- Porzioni registrabili sia con un pulsante dedicato sia a voce ("pasta 80g con 250g di ragù"
  riconosce la preparazione attiva).
- Gli ingredienti della preparazione si inseriscono con gli stessi metodi dei pasti
  (voce, manuale, scanner, preferiti) e scalano la dispensa come oggi.

## Dati

`MealPrep`: `nome`, `ingredienti[]` (IngredientSchema), `calorie/proteine/carboidrati/grassi`
(totali del lotto = somma ingredienti, calcolati dal server), `pesoTotaleCotto` (0 = ignoto),
`porzioniPreviste` (0 = ignoto), `attiva`, `dataCreazione`.

`IngredientSchema` guadagna `prepId`, `prepGrammi`, `prepPorzioni` (opzionali). Un ingrediente
senza `prepId` si comporta esattamente come prima.

## Regole

- I macro di una porzione li calcola **sempre il server**: totali lotto × quota. Mai l'AI.
- Quota non calcolabile (manca peso totale o N) → porzione a 0 con avviso; si riempie da sola
  quando il dato viene inserito.
- Ricalcolo: ogni salvataggio di un pasto e ogni modifica di una preparazione riallineano gli
  ingredienti collegati applicando la **differenza** al totale del pasto (il resto del pasto non
  viene toccato). Vale anche per i giorni passati e per le preparazioni concluse.
- Le porzioni non toccano mai la dispensa (né scalo, né ripristino, né match per nome).
- Preferiti: salvando un pasto con una porzione, il collegamento viene rimosso (resta una foto dei
  valori di quel giorno).
- Concludi: sparisce da attive / voce / selettore; resta modificabile e riattivabile.
- Elimina: solo se nessuna porzione registrata; restituisce gli ingredienti alla dispensa.

## Schermate (iPhone)

- **Nutrizione → riga azioni**: Manuale · Scanner · Preferiti · **Prep** (griglia 4 colonne).
- **Lista Meal Prep**: "Nuova preparazione", card attive (kcal totali, valori per porzione e per
  100 g di cotto, barra di consumo, "+ Porzione"), sezione "Concluse" richiudibile.
- **Dettaglio preparazione**: totali, impostazioni (peso cotto, porzioni previste → "Salva e
  ricalcola"), aggiunta ingredienti (Voce / Manuale / Scanner / Preferiti), lista ingredienti con
  modifica grammi e rimozione, elenco porzioni registrate, Concludi/Riattiva, Elimina.
- **Foglio "Aggiungi porzione"**: scelta preparazione (se non già scelta), Grammi | Porzioni,
  quantità, tipo pasto (default per orario; nascosto se si aggiunge a un pasto esistente),
  anteprima macro. Se manca il dato necessario lo chiede lì (peso cotto o N).
- **Dettaglio pasto**: pulsante "Prep" per aggiungere una porzione al pasto; gli ingredienti-
  porzione mostrano il badge 🍲 e la quantità; la matita modifica grammi/porzioni.

## Voce

`/api/analyze-meal` riceve nel prompt le preparazioni attive con riferimenti brevi (P1, P2…).
L'AI restituisce `prepRef` + `prepGrammi` o `prepPorzioni` (default 1 porzione). Il server
traduce `prepRef` → `prepId`, scarta riferimenti sconosciuti e calcola i valori. I totali del pasto
diventano la somma degli ingredienti (più coerente del totale stimato dall'AI).
`POST /api/preps/:id/analyze` usa lo stesso parser per aggiungere ingredienti a una preparazione.

## API

`GET /api/preps?stato=attive|tutte` · `POST /api/preps` · `GET /api/preps/:id` (con porzioni) ·
`PUT /api/preps/:id` (ricalcola i pasti collegati) · `DELETE /api/preps/:id` (409 se usata) ·
`POST /api/preps/:id/analyze` · `POST /api/preps/:id/portion` (nuovo pasto o `mealId` esistente).

## Struttura codice

- `backend/mealPrep.js`: funzioni pure (quota, valori porzione, ricalcolo con delta, riepilogo
  consumo, pulizia preferiti, normalizzazione output voce) + `backend/mealPrep.test.js` (node:test).
- Rotte in `server.js` come le altre.
- Frontend: `services/mealPrepService.js`, `views/MealPrepView.js`; logica dispensa estratta da
  NutritionView in `services/pantrySync.js` (riusata da pasti e preparazioni); registrazione vocale
  estratta in `components/voice.js` (riusata ovunque); parsing Open Food Facts condiviso.

## Test

- Unit test node:test sulle funzioni pure (quota, ricalcolo N 3→4, dati mancanti, delta, voce).
- Smoke test API in locale con MongoDB in memoria (mai il DB di produzione).
- Verifica UI in locale con browser headless a viewport iPhone.
