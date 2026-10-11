# Peso e calorie — design

Approvato l'11 ottobre 2026 con l'anteprima https://claude.ai/artifact/8D9GCGLvQLYHE4pHD3BiAz.

## Perché

L'utente vuole mettere massa: obiettivo 2400 kcal, si pesa ogni mattina e segna tutto quello che
mangia (pesato da crudo; fuori casa stime). Lo studio sui suoi dati ha mostrato che a giugno-luglio
2400 kcal erano il mantenimento, non un surplus: il peso restava fermo. La pagina del Peso deve
dirgli, dai suoi dati, quante calorie lo mantengono e quante mangiarne per salire.

Scelte dell'utente: ritmo **+0,25 kg a settimana**; obiettivo aggiornato **con un pulsante**
("Usa come obiettivo"), mai da solo; **si contano tutti i giorni** con almeno un pasto (anche
quelli segnati a metà: l'utente cercherà di non farne). La Home non cambia.

## Calcolo (puro, `public/js/services/massaLogic.js`, test in `test/massaLogic.test.js`)

Ingressi: i totali per giorno dei pasti `[{ giorno: 'YYYY-MM-DD', calorie }]` (dal server), le
pesate (`unaPerGiorno`: l'ultima del giorno) e `oggi`.

- **Periodo**: 28 giorni che finiscono **ieri** (oggi non è finito). Giorni con pasti: quelli con
  almeno un pasto (tutti contati). Giorni con pesata: quelli con una pesata.
- **Pronto** se nel periodo ci sono almeno **14 giorni con pasti e 14 con pesata**.
- **Calorie**: media dei giorni con pasti.
- **Peso**: tendenza = pendenza della retta dei minimi quadrati delle pesate (kg al giorno); il
  peso del singolo giorno oscilla troppo.
- **Mantenimento** = calorie medie − pendenza × 7700 (1 kg ≈ 7700 kcal).
- **Per la massa** = mantenimento + 0,25 × 7700 / 7 (circa +275 kcal). Mostrati arrotondati a 10.
- **Ripiego**: se il periodo che finisce ieri non è pronto, si prova con periodi che finiscono
  nei giorni precedenti **con pasti**, dal più recente; il primo pronto è "la stima di <mese della
  fine del periodo>". Così, dopo una pausa (estate), non si prende un periodo che finisce nel
  vuoto. Con il ripiego si dice anche quanti giorni mancano perché il periodo attuale sia pronto:
  il massimo tra i giorni con pasti e quelli con pesata che mancano a 14.
- Nessun periodo pronto: si dice quanti giorni mancano.
- **Dopo una pausa** (aggiunto l'11 ottobre): la prima settimana dopo almeno 14 giorni senza
  pesate non conta, né i pasti né le pesate. Il peso che risale subito è acqua e glicogeno: ai
  primi di ottobre +1,2 kg in 6 giorni, che con 14 giorni di dati la stima leggeva come circa 500
  kcal al giorno in più (mantenimento ~1600–1900 invece che ~2100–2400). Finché quella settimana è
  nelle ultime 4, il riquadro lo dice. "Dal" è il primo giorno con dati, non l'inizio del periodo.

**Settimana per settimana** (dal lunedì): per ogni settimana con pasti o pesate, la media delle
calorie dei giorni con pasti (oggi escluso), il peso medio delle pesate (oggi compreso), la
differenza dal peso medio della settimana subito prima (solo se ha pesate) e "in corso" per la
settimana di oggi. Dalla più recente.

## Server

`GET /api/giorni`: totali dei pasti per giorno italiano (`$dateToString` con fuso Europe/Rome):
`[{ giorno, calorie, proteine, carboidrati, grassi, pasti }]`, dal più vecchio. Piccolo: serve per
non scaricare tutti i pasti.

## Pagina del Peso (`homeUi.renderPeso`)

Come nell'anteprima; il resto della pagina non cambia.

- Sotto "Peso di oggi", il riquadro **"Per mettere massa"**: a destra del titolo "ultime 4
  settimane" o "stima di luglio"; due colonne "Mantenimento · circa 2340 kcal" e "+0,25 kg a
  settimana · circa 2610 kcal"; la riga "Dal 19 giugno al 16 luglio: 2240 kcal al giorno, peso
  −0,1 kg a settimana" ("peso stabile" sotto il mezzo decimo); il pulsante bianco **"Usa 2610 kcal
  come obiettivo"** con sotto "Il tuo obiettivo adesso è 2400 kcal." — se l'obiettivo è già quello,
  al posto del pulsante "È il tuo obiettivo di calorie."; con il ripiego, "Fra circa 9 giorni di
  pasti e pesate la stima si aggiorna con i dati di ottobre." Senza stima: "Servono 14 giorni di
  pasti e di pesate per stimare il tuo mantenimento: ne mancano circa N."
- "Usa come obiettivo" cambia solo le calorie degli obiettivi (Proteine, Carboidrati, Grassi
  restano), ridisegna la pagina e mostra "Obiettivo: 2610 kcal".
- Sotto il grafico, **"Settimana per settimana"**: una riga per settimana ("5 – 11 ottobre",
  sotto "In corso · 2042 kcal al giorno" o "Nessun pasto segnato"; a destra il peso medio con la
  differenza). Le prime 4, le altre con "Mostra tutte (N)".
- Se `/api/giorni` non risponde, la pagina si mostra senza le due sezioni nuove.

`HomeView.showPeso` carica i giorni una volta (poi li riusa quando si salva il peso) e passa
l'obiettivo di calorie e `onUsaObiettivo`.

## Test

- Unit: periodo pronto/non pronto, media e tendenza (retta), mantenimento e massa, ripiego al
  periodo che finisce in un giorno con pasti, giorni mancanti, settimane (media, in corso, oggi
  escluso dalle calorie, differenza solo con la settimana subito prima).
- E2E (Mongo in memoria, Edge a viewport iPhone): `/api/giorni` per giorno italiano; pagina con
  stima attuale e con ripiego, pulsante che cambia l'obiettivo e sparisce, settimane con
  "Mostra tutte", pagina senza le sezioni se `/api/giorni` fallisce.
