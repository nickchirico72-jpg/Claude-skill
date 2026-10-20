--- RITORNO DA CLAUDE CODE ---
Sprint: 1 (20-26/10/2026) · risposta al PASSAGGIO 3 "Allineamento del prototipo" del 20/10

**Cosa è cambiato**
- **Un solo database per app e SQL.** Il prototipo ora parte dalle stesse 300 opportunità del database di prova: i numeri che Nicolò calcola in SQL sono quelli che la giuria vede nell'app. Controllato su tutti i KPI e sul punteggio A/B/C di ogni opportunità.
- **Database interrogabile anche in MySQL.** Oltre al file SQLite, che si apre con DB Browser, c'è una copia per MySQL e MariaDB: `data/gate_mysql.sql`, provata su MariaDB, con date vere e chiavi esterne. Ci sono anche i CSV per Power BI ed Excel.
- **Nuovi campi per misurare il processo TO-BE:**
  - data della prima risposta e data di registrazione della richiesta;
  - consenso privacy e firma da link;
  - campagna, contenuto e pagina di arrivo.
- **Un solo elenco dei canali, uguale per app e database.** 10 canali attivi; Facebook, Instagram e Google Ads sono spenti, "da confermare con Gate". "Eventi e LinkedIn" è diviso in LinkedIn e contatto diretto.
- **Catalogo dei 17 KPI** con formula, livello della piramide di Anthony, tipo e processo APQC. Si trova nel database e in `docs/kpi.md`.
- **Import dei dati veri.** Lo script importa il foglio della fotografia di partenza e del test e dice quali righe scarta e perché. Due CSV di esempio inventati servono a provarlo.
- **Modulo "Richiedi un sopralluogo".** È breve, senza registrazione, con consenso e informativa, e registra canale, campagna e contenuto. Come deciso, resta anche il modulo "Richiedi un preventivo".
- **Preventivo indicativo alla creazione** (ore, prezzo annuo, margine), con avviso se il margine è sotto il 12% e con la classe A/B/C che usa quel margine.
- **Firma dell'offerta da link**, simulata.
- **Piano dei contenuti** nella finestra "Collega sito e social", con il link tracciato pronto per ogni contenuto.
- **Indicatori in tre viste: operativo, tattico, strategico.** Un'etichetta ben visibile dice "Dati fittizi" o "Dati reali". Il selettore passa alla fotografia di partenza o al test. La vista strategica ha la matrice canale × classe A/B/C con il margine atteso.
- **Partner via WhatsApp: restano attivi**, come deciso dal team. Si possono spegnere con un'opzione, senza cancellare nulla.

**User story chiuse:** US-A, US-C, US-D, US-E, US-F. US-B è fatta con i dati di esempio e va adattata dopo l'intervista con Alfredo.

**Criteri verificati**
- **A1: 83 opportunità aperte su 300.**
  - Il 96% ha avuto il primo contatto da agosto in poi.
  - Tasso di chiusura sulle trattative chiuse: 13,4%.
  - Opportunità aperte ferme oltre la soglia: 12%.
- **A2: le ipotesi H1-H5 si ritrovano nei dati.** Vedi il paragrafo "Ipotesi verificate" più sotto.
- **A3: H6 non inserita.** Il portale gare segue la media degli altri canali in tutti i settori.
- **A4: le 5 query di riferimento girano senza modifiche.**
- **B, C, D, E: fatti.**
- **F3: il flusso della demo dura 14 secondi nella prova automatica**, dalla richiesta dal modulo alla dashboard aggiornata.
- **Prove automatiche: 52 su 52 superate**, su computer (1440×900) e telefono (390×844), senza errori.

**Criteri verificati solo in parte**
- **A1: "i contatti di settembre e ottobre sono in maggioranza nelle prime fasi" è vero solo tra le trattative ancora aperte.**
  - Tra quelle aperte sono il 68%.
  - Contando anche le perse, sono il 43%: 40 di quei contatti sono già persi.
  - Se la richiesta vale su tutti i contatti, va abbassato il tasso di perdita nelle prime fasi.
- **E1: non ho trasformato il modulo esistente.** Come deciso, ci sono due moduli distinti.
- **E3: i partner non sono stati spostati nella roadmap.** Restano attivi per scelta del team.

**KPI calcolati (dati fittizi; query e esercizi in `docs/esercizi-k12-k17.md`)**
- K1 contatti qualificati 77%; K2 sopralluoghi 62%; K3 conversione delle offerte 35%; K7 win rate 13,4%.
- K4 costo di acquisizione 746 € per contratto, da 50 € (passaparola) a 4.926 € (intermediario).
- K5 margine atteso 113.908 €; K6 pipeline ponderata 571.657 €; K8 durata del ciclo 42 giorni.
- K9 trattative ferme 10 su 83; K11 portafoglio 49% in classe A.
- K12 prima risposta 2,1 giorni; K13 dalla richiesta all'offerta 26,3 giorni.
- K14 non calcolabile sui dati storici: la data di registrazione nasce con il TO-BE.
- K15 richieste digitali 34,7%; K16 firme da link 0 su 29 (cresce con la demo).
- K17 solo sui dati reali. Sui dati di esempio inventati, il test vale 4,3 su 5.

**Ipotesi verificate**
- **H1 confermata:** il passaparola converte di più (24,2%).
- **H2 confermata:** negli uffici LinkedIn converte meglio del porta a porta, 25,0% contro 3,7%.
- **H3 confermata:** la classe A chiude nel 16,8% dei casi, la classe C mai (0 su 11).
- **H4 confermata:** l'intermediario ha il margine medio più basso, 15,5%.
- **H5 confermata:** i contatti crescono di mese in mese, da 2 a marzo a 72 a settembre.
- **H6 test cieco:** da verificare con la query di Nicolò. Il risultato atteso è "non confermata": nella GDO ci sono troppo poche opportunità dal portale gare per dire qualcosa.

**Limiti**
- **Dati fittizi.** Gli andamenti H1-H5 sono inseriti apposta e il campione è piccolo: 300 opportunità, 29 contratti.
- **Valori di prova.** Rese, tariffe, costi, soglie e capacità delle squadre vanno sostituiti dopo l'intervista. Le capacità sono state alzate per stare in proporzione ai volumi del database.
- **Date dell'app.** Nell'app le date sono spostate in modo che il 19/10 coincida con oggi; in SQL restano fisse al 19/10.
- **Campi vuoti.** Nel database ora sono "NULL", non testo vuoto, come in MySQL. Le query cercano un campo vuoto con `IS NULL`.

**Dati che mancano per i prossimi KPI**
- La fotografia di partenza vera, cioè le ultime 10-15 richieste, e il foglio del test, con le colonne del foglio condiviso.
- I costi reali dei canali.
- I tempi di risposta di oggi, al posto dell'ipotesi di 0-6 giorni.
- Le rese in mq all'ora, le tariffe e il costo orario.
- La conferma dei canali da confermare: Facebook, Instagram, Google Ads.

**Screenshot pronti per il deck (in `docs/screenshot/`)**
- Indicatori:
  - `indicatori-desktop.png` (vista operativa);
  - `indicatori-tattico-desktop.png`;
  - `indicatori-strategico-desktop.png` (con la matrice canale × classe);
  - le stesse viste da telefono.
- `sopralluogo-desktop.png` e `sopralluogo-mobile.png`: il modulo.
- `sito-e-social-desktop.png`: link tracciati e piano dei contenuti.
- `preventivo-desktop.png`: preventivo, avviso sul margine e classe.
- `pipeline-desktop.png`, `firma-da-link-desktop.png`, `allocazione-desktop.png`.

**Dubbi aperti**
1. **Contenuto delle slide 27 e 30.** Nel README le ho collegate al database, come ipotesi da confermare. Va confermata anche la mia ipotesi sulle slide 26, 34-35, 40, 42, 43 e 44.
2. **K13.** Il catalogo dice "operativo", ma il punto F1 lo mette nella vista tattica: ho seguito F1.
3. **K7 (win rate).** Non era in nessuna vista del punto F1: l'ho messo nella tattica.
4. **Soglie di K1-K4.** Sono ipotesi del prototipo, segnate così nel catalogo. Le soglie vere vanno decise nel progetto di analisi.
5. **Nome del settore pilota.** Nel database è "uffici e commercio", mentre nel brief è "uffici e studi professionali": va scelto un nome unico.
6. **Pubblicazione con dati veri.** Il prototipo pubblicato su GitHub Pages contiene i dati di prova. Con dati personali veri va usato solo in locale.
--- FINE RITORNO ---
