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

8. **Niente emoji**: le icone sono SVG a tratto (`components/icons.js`), colorate con il testo.

Helper condivisi lato client: `components/format.js` (numeri e macro), `components/sheet.js`
(foglio dal basso), `components/icons.js` (icone).

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

## Sezione 2 — Nutrizione Oggi

Approvata con l'anteprima https://claude.ai/artifact/QrvGkG3QGF5hQSGu8dcNUN (più la regola 8).

- **Oggi**: riquadro scuro "Mangiato oggi" con barra delle calorie e una per macro (nomi per
  esteso, numeri interi), "Mancano / Oltre di X kcal"; "Obiettivi" al posto dell'ingranaggio;
  Voce (nero) e Manuale / Scanner / Preferiti / Prep (bianchi con icona); pasti in elenco con il
  tipo come titolo, kcal e alimenti, senza cestini; "Idee per il resto della giornata" raccoglie
  "Come chiudi di solito" (pulsante bianco) e "Chiedi un'idea all'IA".
- **Dettaglio pasto**: titolo = tipo di pasto; quando, kcal e macro; ingredienti prima dei
  pulsanti, una riga ciascuno; il tocco apre un foglio (grammi, "Togli dal pasto"); anche le
  porzioni di meal prep si correggono lì, in grammi; "Elimina pasto" in fondo.
- **Preferiti**: elenco semplice; foglio con kcal, macro, ingredienti con i grammi,
  "+ Aggiungi a oggi" e "Togli dai preferiti".
- **Chiedi all'IA**: titolo "Idee per la cena"; ogni opzione: cos'è, kcal e macro, ingredienti,
  "Con questo arrivi a" (barre, rosse se si supera), "+ Aggiungi a oggi"; "Vedi variante" bianco.
- **Aggiungi a mano**: pasto con quattro pulsanti (preimpostato in base all'ora, nascosto se si
  aggiunge a un pasto esistente), alimento, grammi, valori ogni 100 g, anteprima della porzione.
- **Obiettivi**: una riga che spiega a cosa servono; "Salva".

## Sezione 3 — Storico nutrizione

Approvata con l'anteprima https://claude.ai/artifact/TJKQnsN36Jva3cP2BrfZ4h.

- **Elenco**: settimane dal lunedì ("5 – 11 ottobre"), ognuna con il riquadro scuro "Media al
  giorno" (calorie e macro sugli obiettivi; oggi non conta perché non è finito) e una riga per
  giorno: "Oggi", "Ieri", "Giovedì 8 ottobre", calorie / obiettivo (rosse se sopra), barra, macro
  per esteso. "Scarica i dati (CSV)" in fondo, bianco con icona.
- **Giorno**: titolo con il nome del giorno; lo stesso riquadro di Oggi con le calorie del giorno
  ("X kcal sotto l'obiettivo" / "Oltre di X kcal"); "Da dove vengono le calorie": barra con le
  percentuali di calorie da proteine (4 kcal/g), carboidrati (4) e grassi (9) al posto della
  ciambella in grammi; pasti dalla colazione alla cena. Toccando un pasto si apre il dettaglio e
  si può correggere; la freccia torna al giorno.
- Helper in `components/format.js`: `chiaveGiorno`, `lunediDi`, `nomeGiorno`, `nomeSettimana`,
  `ripartizioneCalorie`.

## Sezione 4 — Palestra

Approvata con l'anteprima https://claude.ai/artifact/MciqCprFkkJJuvwFY3QRv1. Oltre al restyle, tre
funzioni nuove decise in palestra, senza modificare la scheda (niente varianti di scheda).

### Superserie (per allenamento)

- Nell'allenamento in corso ogni card "Da fare" ha una maniglia: trascinando la card sopra un'altra
  (o sopra un blocco) gli esercizi diventano un blocco "Superserie". "Separa" lo scioglie. Vale solo
  per quell'allenamento: la scheda non cambia.
- Il blocco si esegue a **giri**: in un giro si fa una serie di ogni esercizio, "Salva giro" fa
  partire il recupero una volta sola (il più lungo fra gli esercizi). Giri = il massimo delle serie
  previste; l'ultimo giro contiene solo chi ne ha di più.
- Ogni esercizio tiene i suoi pesi e le sue serie: nella sessione e nello storico finisce come
  esercizio separato, con un campo `superserie` (gli id del blocco uniti da "+") per raggrupparli.
  Grafici e volume restano per esercizio: i calcoli non si mescolano.
- Dati: nella sessione attiva (localStorage) `superserie: [[idA, idB, …]]`; la bozza del blocco si
  salva con la chiave `superserie:idA+idB`.

### Drop set

- In una serie "+ Drop" aggiunge una riga (peso, ripetizioni) con il peso proposto a circa l'80%
  arrotondato al passo; se ne possono aggiungere più, la x toglie la riga. "Salva serie" (o "Salva
  giro") salva tutto e avvia il recupero.
- Dati: `set.drop = [{ kg, reps }]`. Il massimale stimato (1RM) usa solo la serie principale; il
  volume conta anche i drop. Testo: "65 × 8 → 50 × 5".

### Pulsanti + e − del peso

- Passo automatico: sotto 10 kg 0,5; da 10 a 30 kg 1; sopra 30 kg 2,5. "+" porta al gradino
  successivo della griglia del passo (7,3 → 7,5; 30 → 32,5); "−" a quello precedente usando il passo
  della fascia sotto (10 → 9,5; 30 → 29; 32,5 → 30). Ripetizioni e minuti: passo 1. Il numero si
  tocca e si scrive (virgola accettata).

### Peso per lato e bilanciere

- Nel modulo dell'esercizio "Peso segnato: Totale / Per lato" (`weightMultiplier` 1 o 2) e
  "Bilanciere o attrezzo da aggiungere" (`barbellWeight`). Peso reale = kg × moltiplicatore +
  bilanciere (solo se kg > 0). Usato da grafici, massimale e volume (prima il volume ignorava
  entrambi). Le etichette dicono "kg per lato".

### Schermate

- **Schede**: una riga per scheda (esercizi, ultimo allenamento); "+ Nuova scheda" bianco; rinomina
  ed elimina nel menu "···" della scheda.
- **Scheda**: "Inizia allenamento" nero; una riga per esercizio (serie × ripetizioni, peso con "per
  lato" / "+ bilanciere", recupero); il tocco apre un foglio con "Vedi i progressi" e "Modifica";
  "+ Aggiungi" azzurro.
- **Modulo esercizio** (nuovo e modifica): nome, tipo a pulsanti (Pesi / Corpo libero / Cardio),
  serie, ripetizioni (o minuti), peso iniziale, peso segnato, bilanciere, recupero a pulsanti;
  "Salva"; "Elimina esercizio" in rosso. Sostituisce le tre domande dell'ingranaggio.
- **Allenamento in corso**: "Da fare" con maniglie e blocchi superserie, suggerimento sul
  trascinamento, "Fatti" con riassunto e "Modifica"; "Termina allenamento" bianco, "Salva
  allenamento" nero quando è tutto fatto. Niente emoji.
- **Esercizio**: "Ultima volta" su una riga; serie salvate ridotte a una riga con "Modifica"; serie
  da fare con + e −, "+ Drop", "Salva serie" (nero sulla prima da fare); "Termina esercizio" bianco
  finché restano serie, poi nero.
- **Superserie**: "Ultima volta" per esercizio, giri fatti in una riga, giro attivo con ogni
  esercizio e "Salva giro", "Termina superserie".
- **Storico della scheda**: settimane "5 – 11 ottobre" con allenamenti e volume medio; un
  allenamento aperto mostra una riga per esercizio con le serie, drop in arancione, superserie
  raggruppate; "Scarica i dati (CSV)" in fondo.
- **Progressi (grafici)**: stessi grafici, senza emoji, con "per lato" e il peso reale spiegato.

Codice: le schermate della palestra escono da `ui.js` e vanno in `views/gymUi.js`; i calcoli puri
(passo, drop, peso reale, volume, testo delle serie, operazioni sulle superserie) in
`services/gymLogic.js` con i test.

## Test

- Unit test (node:test) su peso crudo, riepilogo (rimasti, ultima volta), voce senza grammi,
  helper di formato.
- Prova end-to-end in locale (Mongo in memoria, Edge a viewport iPhone) dei flussi: nuova
  preparazione, ingredienti, aggiunta a oggi, modifica e rimozione ingrediente, voce.
- Palestra: unit test su `gymLogic.js` (passo, drop, peso reale, volume, superserie e giri, serie
  iniziali, progressi, righe del CSV) e prova end-to-end del flusso completo: modulo, trascinamento
  e "Separa", esercizio da 7,5 a 4 kg con il "−" e drop, superserie a giri con drop, storico,
  progressi. Nel grafico "Peso più alto" le colonne partono da zero.
