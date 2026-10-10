# Restyle dell'app — design

Data: 2026-10-10 · Stato: regole approvate; sezione 1 (meal prep) approvata con l'anteprima
https://claude.ai/artifact/9LEnWDvMtn6Z3UFpGnWij9

## Obiettivo

Rendere l'app più facile da capire senza togliere informazioni e senza cambiare lo stile grafico
(colori di base, caratteri, forme arrotondate). Si riorganizza l'ordine delle informazioni e si
uniformano pulsanti, numeri ed etichette.

Si procede **una sezione alla volta**: anteprima prima/dopo → ok dell'utente → implementazione →
push (l'utente prova sul telefono). Ordine: 1. Meal prep · 2. Nutrizione Oggi + dettaglio pasto ·
3. Storico nutrizione · 4. Palestra · 5. Dispensa · 6. Home.

## Regole per tutta l'app

1. **Un solo pulsante principale per schermata**: quello che si usa più spesso lì.
2. **Macro sempre con il nome**: "Proteine", "Carboidrati", "Grassi", in quest'ordine e con questi
   colori (blu, verde, giallo). "Carbo" solo dove manca spazio. Mai la sola iniziale (P/C/G) né
   PRO/CAR/FAT: l'utente non le capisce.
3. **Numeri puliti, virgola italiana**: kcal e grammi interi ("323 kcal", "250 g"); un decimale
   con la virgola solo dove serve ("67,5 kg", "22,3 g"); mai ".0".
4. **Riassunto in vista, dettagli al tocco**: una riga per elemento negli elenchi.
5. **Eliminare si fa dentro il dettaglio**: niente cestini su ogni riga.
6. **Maiuscolo solo per le piccole etichette di sezione**: pulsanti e titoli in minuscolo normale.
7. **Un solo stile di pulsanti**:
   - principale: nero (`bg-gray-900`, testo bianco);
   - secondari: bianchi con bordo grigio, eventuale icona colorata (niente più riquadri azzurri,
     gialli, arancioni, né il viola di "Chiedi all'IA");
   - azzurro (`indigo`) solo per link testuali, barre di avanzamento, selezioni e barra in basso;
   - rosso solo per eliminare (e solo dentro dettagli o conferme).

Helper condivisi lato client: `components/format.js` (numeri e macro) e `components/sheet.js`
(foglio dal basso).

## Sezione 1 — Meal prep

### Modello: il cotto pesa quanto il crudo

L'utente pesa gli ingredienti crudi e, ogni giorno, i grammi che mangia. Non pesa mai la pentola e
non divide in porzioni. Scelta esplicita dell'utente ("solo stima"): il peso di riferimento del lotto
è la **somma dei grammi crudi** degli ingredienti.

- `pesoTotaleCotto` resta nel DB come "peso di riferimento" e lo calcola il server:
  quando cambiano gli ingredienti diventa la somma dei grammi crudi. Non si accetta più dal client.
- All'avvio il server allinea le preparazioni senza peso (0) alla somma dei grammi crudi e ricalcola
  i pasti collegati (le porzioni "da completare" si riempiono).
- Le preparazioni vecchie con un peso del cotto inserito a mano lo tengono finché non se ne
  modificano gli ingredienti: le porzioni già registrate non cambiano valore.
- `porzioniPreviste` e `prepPorzioni` restano solo per leggere i dati vecchi: non si creano più
  porzioni "a porzioni". Una porzione nuova richiede sempre i grammi.
- Riepilogo: grammi mangiati, **grammi rimasti** (stima) e **grammi dell'ultima volta**.
- Voce: se l'utente non dice i grammi della preparazione si usano quelli dell'ultima porzione;
  se non ce n'è nessuna la porzione resta "da completare" e si corregge dal dettaglio del pasto.

### Schermate

- **Elenco**: card con nome, data, valori **ogni 100 g** (kcal + Proteine/Carboidrati/Grassi),
  "Rimasti circa X g su Y g" con barra, pulsante principale "+ Aggiungi a oggi". La card si tocca
  per il dettaglio. "+ Nuova preparazione" è secondario, sotto. Concluse in fondo, chiuse.
- **Preparazione appena creata** (senza ingredienti): due passi (1. ingredienti crudi con i pesi,
  2. ogni giorno i grammi che mangi). Sotto la card del passo 1, centrati a tutta larghezza:
  "Voce" (principale) e Manuale / Scanner / Preferiti (secondari).
- **Dettaglio**: card con valori ogni 100 g, rimasti, totale del lotto in piccolo con la nota sulla
  stima; "+ Aggiungi a oggi"; "Ingredienti crudi" con link "+ Aggiungi" che apre i metodi; una riga
  per ingrediente (grammi · kcal), il tocco apre un foglio per cambiare i grammi o toglierlo;
  "Mangiato finora" (data · pasto · grammi · kcal); "Concludi preparazione"; "Elimina" (rosso,
  testo) solo se non ne è stato mangiato niente.
- **Foglio "Aggiungi"**: "Quanti grammi?" già compilato con i grammi dell'ultima volta, scelta del
  pasto, anteprima (kcal + macro) e "Dopo ne restano circa X g".
- **Dettaglio pasto**: la matita su una porzione chiede solo i grammi.

## Test

- Unit test (node:test) su peso crudo, riepilogo (rimasti, ultima volta), voce senza grammi,
  helper di formato.
- Prova end-to-end in locale (Mongo in memoria, Edge a viewport iPhone) dei flussi: nuova
  preparazione, ingredienti, aggiunta a oggi, modifica e rimozione ingrediente, voce.
