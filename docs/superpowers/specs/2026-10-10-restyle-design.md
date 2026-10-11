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
9. **Come un'app nativa**: il tocco lungo non seleziona il testo e non apre il menu di iPhone, in
   tutta l'app (`css/style.css`); nei campi dove si scrive la selezione resta.

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
- **Peso del cotto (11 ottobre)**: lo studio sui dati ha mostrato che la stima sbaglia molto (il
  ragù dell'utente: 1026 g crudi, cotto molto meno, porzioni contate circa il 30% in meno; riso e
  pasta al contrario). "Pesa il cotto" nel dettaglio: l'utente pesa quello che resta, senza
  contenitore, e il cotto è quello più i grammi già segnati (`pesoCottoDa`); `cottoPesato` = true
  e il peso resta anche se cambiano gli ingredienti. Concludendo un lotto mai pesato con porzioni
  segnate, "L'hai finita tutta?": sì → il cotto è la somma di quello mangiato. In entrambi i casi le
  porzioni già registrate si ricalcolano.
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
  giorno" (calorie e macro sugli obiettivi; conta anche oggi, così cambia appena si aggiunge un
  pasto, e nella settimana in corso la riga "6 giorni, oggi compreso" lo dice) e una riga per
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

- Nell'allenamento in corso ogni card "Da fare" si trascina: tenendola premuta (0,4 s, ovunque) o
  subito dalla maniglia. Rilasciata sopra un'altra card (o sopra un blocco) gli esercizi diventano
  un blocco "Superserie". "Separa" lo scioglie. Vale solo per quell'allenamento: la scheda non
  cambia. Le card non selezionano il testo e non aprono il menu del tocco lungo di iPhone; uno
  scorrimento veloce resta uno scorrimento della pagina.
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

## Sezione 5 — Dispensa

Approvata con l'anteprima https://claude.ai/artifact/Utmkd6E4aUgULUgYxaG3Vn. A cosa serve (detto
dall'utente): sapere cosa c'è in casa, sapere cosa comprare alla prossima spesa, e far proporre
alla nutrizionista piatti fattibili con quello che c'è. La cronologia dei consumi è secondaria.
I pasti e i meal prep continuano a scalare la dispensa da soli; la nutrizionista la legge come oggi.

### Regole dei dati

- Stato di un prodotto: "finito" a 0 g, "sta finendo" sotto il 20% (`sogliaBassa`) dei grammi di
  riferimento, altrimenti a posto (i flag `esaurito` / `scortaBassa` del server).
- **La spesa si somma**: comprare N confezioni da G grammi porta i grammi rimasti a
  `rimasti + N × G` (prima la lista della spesa azzerava e ripartiva da `N × G`). I grammi di
  riferimento ("di X") diventano quelli appena raggiunti, così dopo la spesa la barra è piena.
  Vale per la lista "Da comprare", per "Aggiungi confezioni" e per un prodotto già in dispensa
  aggiunto di nuovo (scanner, codice o a mano con lo stesso nome).
- "Correggi i grammi": i rimasti diventano quelli scritti; il riferimento sale se li supera.
- Categorie salvate come oggi (`Proteina`, `Carboidrato`, …); a schermo al plurale: Proteine,
  Carboidrati, Latticini, Verdura, Frutta, Condimenti e grassi, Altro.

### Schermate

- **Dispensa**: titolo e numero di prodotti; in cima la riga "Da comprare · N" con i nomi (o "Non
  manca niente"), che apre la lista; "Scansiona" nero (fotocamera come nella Nutrizione) e "A mano"
  bianco; prodotti divisi per tipo, in ordine alfabetico, i finiti in fondo al gruppo in grigio.
  Riga: nome, eventuale "sta finendo" (arancione) o "finito/finita" (rosso), "650 g di 1000",
  barra (azzurra, arancione se sta finendo). Niente filtri, niente riquadro con i numeri.
- **Prodotto**: titolo col nome, sotto il tipo, foto piccola se c'è; grammi grandi "di X g",
  barra, "Confezioni da 500 g"; valori per 100 g con i nomi per esteso; "Aggiungi confezioni"
  nero (foglio con le confezioni a + e −), "Correggi i grammi" bianco (foglio con i grammi);
  "Ultimi utilizzi" (al massimo 5: "Pranzo · Riso, Pollo", "Oggi, 13:10", "−80 g");
  "Togli dalla dispensa" in rosso in fondo, con conferma.
- **Da comprare**: i prodotti finiti o che stanno finendo, in ordine alfabetico; riga con cerchio
  da spuntare, nome, "Restano 60 g · 1 confezione da 360 g" (o "Finito · …"). Da spuntati,
  "Modifica" apre confezioni (+ e −) e grammi di una confezione con "In dispensa diventano
  780 g". "Metti in dispensa (N)" nero. Vuota: "Non manca niente".
- **Prodotto trovato** (dopo scanner o codice scritto): foglio con codice, nome, valori per 100 g,
  confezioni (+ e −), grammi di una confezione (vuoti se Open Food Facts non li sa: vanno
  scritti), tipo a pulsanti già scelto; se il prodotto c'è già "Ne hai 340 g, diventano 790 g";
  pulsante "Aggiungi 450 g". Codice sconosciuto: conferma "Scrivo i dati" e modulo a mano con
  marca e foto per Open Food Facts, come oggi.
- **A mano**: foglio "Aggiungi alla dispensa" con codice (facoltativo), nome con microfono e
  suggerimenti CREA ("253 kcal · Proteine 18 g"), confezioni (+ e −), grammi di una confezione,
  tipo a pulsanti, valori per 100 g (Calorie, Proteine, Carboidrati, Grassi), "Salva in dispensa".
- Dopo un'aggiunta un avviso breve in alto ("Skyr bianco: 450 g in dispensa") invece della
  finestra "Fatto!". Un avviso alla volta; "Cerco il codice…" sparisce appena la ricerca finisce.
- Le confezioni scelte nel foglio "A mano" passano al foglio del prodotto trovato quando si cerca
  un codice. Il peso da Open Food Facts capisce g, kg, l, ml e i multipack ("6 x 125 g").
- **Quale prodotto** (registrando un pasto): titolo con il nome dell'ingrediente, "Da quale
  prodotto della dispensa lo tolgo?", righe nome + grammi, "Non toglierlo dalla dispensa"
  bianco, nota "La prossima volta che scrivi … uso la stessa scelta".
- **Finestre di avviso e conferma (tutta l'app)**: niente emoji; icona SVG in un cerchio
  (domanda, matita, avviso, spunta, informazione), "Annulla" bianco con bordo, conferma nera,
  rossa quando elimina o toglie qualcosa (`pericolo: true`).

Codice: le schermate escono da `PantryView.js` e vanno in `views/pantryUi.js`; i calcoli puri
(tipi, gruppi, da comprare, rifornimento, correzione, riga utilizzo, prodotto già presente) in
`services/pantryLogic.js` con i test.

## Piatto intero (11 ottobre)

Nel modulo "Aggiungi a mano" due schede, "Ogni 100 g" (grammi e valori ogni 100 g, come prima) e
"Piatto intero": calorie e macro di quello che si è mangiato, senza grammi. Serve per i totali di
cui non si sa il peso (una stima di Gemini, il panino del bar, il ristorante): prima l'utente
scriveva 100 g finti e il totale nei valori ogni 100 g ("Polpettone 1000 kcal ogni 100 g").
L'ingrediente si salva con `grammi: 0` e `piattoIntero: true`; il dettaglio mostra "Piatto intero ·"
e il foglio dell'ingrediente non chiede i grammi. Nel modulo degli ingredienti del meal prep la
scelta non c'è (gli ingredienti crudi servono coi grammi). Un prodotto trovato col codice a barre
riporta la scheda su "Ogni 100 g".

## Sezione 6 — Home

Approvata con l'anteprima https://claude.ai/artifact/SJHMXzGUD7PMFFKreZRDhL e le risposte
dell'utente: niente pulsante nero in Home (ci si muove toccando i riquadri), la riga "Da comprare"
resta come scorciatoia per la lista della spesa, una sola pesata al giorno (l'ultima), icone nuove
della barra in basso.

### Home

- Titolo "Ciao Andrea" senza emoji e la data ("Sabato 10 ottobre").
- **Mangiato oggi**: lo stesso riquadro scuro della Nutrizione (calorie, "Mancano X kcal" o "Oltre
  di X kcal", barre Proteine, Carboidrati, Grassi). Il tocco apre la Nutrizione.
- **Allenamento**: riga bianca; con un allenamento a metà "Allenamento in corso · N da fare" e
  "Riprendi", altrimenti "Ultima volta mercoledì 7 ottobre · Scheda A" (o "Non ti sei ancora
  allenato") e "Inizia". Il tocco apre la Palestra.
- **Acqua**: "750 ml di 2 l" e 8 gocce da 250 ml; si tocca la goccia (l'ultima piena la toglie).
  Sotto le gocce i pulsanti − e + grigi (un bicchiere alla volta, "250 ml a bicchiere" in mezzo),
  rimessi l'11 ottobre su richiesta dell'utente: col + si va anche oltre i 2 l (le gocce restano
  tutte piene), il − è spento a 0. Si disegna subito e si salva in fila, così i tocchi veloci non
  si perdono.
- **Mezzanotte**: Home e Nutrizione (Oggi e Storico) segnano il giorno dei dati (`data-oggi`); a
  mezzanotte, o quando l'app torna davanti dopo la mezzanotte, `app.js` le ricarica: acqua,
  calorie, pasti e data in alto ripartono dal giorno nuovo. Non si ridisegna con un foglio o una
  finestra aperti, con la voce o la fotocamera attive, né nelle schermate interne (tornando
  indietro si ricaricano comunque). Un tocco sull'acqua con i dati di ieri non si salva: la Home si
  ricarica. Le API rispondono con `Cache-Control: no-store`. Se la Home o la Nutrizione non si
  caricano, riprovano da sole quando l'app torna davanti.
- **Peso**: ultimo peso con la virgola, "−1,6 kg dal 5 settembre · pesato oggi", linea
  dell'andamento delle ultime pesate. Senza pesate: "Tocca per pesarti". Il tocco apre il Peso.
- **Da comprare**: la riga della Dispensa ("Da comprare · 3" e i nomi, o "Non manca niente"); il
  tocco apre direttamente la lista della spesa.
- **Barra in basso**: Palestra con un manubrio, Nutrizione con forchetta e coltello.

### Peso

- Titolo "Peso". "Peso di oggi" con il campo (virgola accettata) e "kg", "Salva" nero; se c'è già
  una pesata di oggi, una riga dice che salvando si aggiorna. Peso non valido: finestra dell'app
  "Scrivi il peso, per esempio 74,8."
- Riquadri "Più alto", "Più basso", "Dal 5 settembre" (variazione dalla prima pesata), con la
  virgola.
- Grafico "Andamento" senza emoji, date "5 set", numeri con la virgola.
- "Tutte le pesate": un riquadro con una riga per giorno ("Oggi", "Mercoledì 7 ottobre"), peso e
  differenza dalla pesata prima; le prime 4, le altre con "Mostra tutte (N)".
- **Una pesata al giorno**: il server aggiorna la pesata di oggi (giorno italiano) invece di
  aggiungerne un'altra; le doppie già salvate si mostrano una per giorno (l'ultima).
- **Peso e calorie (11 ottobre)**: riquadro "Per mettere massa" sotto "Peso di oggi" e "Settimana
  per settimana" sotto il grafico; design in `2026-10-11-peso-calorie-design.md`.

Codice: le schermate escono da `HomeView.js` e vanno in `views/homeUi.js`; i calcoli del peso
(una per giorno, riassunto, righe con la differenza, punti della linea) in `services/pesoLogic.js`
con i test. `ui.js` esporta `riquadroRiepilogo` e `totaliPasti` per riusarli.

## Test

- Unit test (node:test) su peso crudo, riepilogo (rimasti, ultima volta), voce senza grammi,
  helper di formato.
- Prova end-to-end in locale (Mongo in memoria, Edge a viewport iPhone) dei flussi: nuova
  preparazione, ingredienti, aggiunta a oggi, modifica e rimozione ingrediente, voce.
- Palestra: unit test su `gymLogic.js` (passo, drop, peso reale, volume, superserie e giri, serie
  iniziali, progressi, righe del CSV) e prova end-to-end del flusso completo: modulo, trascinamento
  e "Separa", esercizio da 7,5 a 4 kg con il "−" e drop, superserie a giri con drop, storico,
  progressi. Nel grafico "Peso più alto" le colonne partono da zero.
