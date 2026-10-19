# Prototipo CRM per Gate S.R.L. – istruzioni generali

Prototipo web per l'Open Challenge by Enterprise 2026 (Digital Transformation, LM-77, Università LUM) con Gate S.R.L., servizi integrati alle strutture a Bari. Settore e territorio pilota: uffici e studi professionali a Bari. Lavora e scrivi in italiano.

## Vincoli
- Nessun backend: solo file statici, pubblicabili gratis su GitHub Pages; deve funzionare anche con un doppio clic su index.html. I dati restano nel browser (localStorage), con backup in JSON ed export CSV.
- HTML, CSS e JavaScript puro, script classici (niente moduli ES, framework, librerie o build).
- Interfaccia in italiano sobrio, con il lessico di Gate (commessa, squadra, caposquadra, sede di lavoro, referente, margine). Facile per chi non è tecnico: ogni schermata dice in una riga cosa fare, azioni con un clic, niente menu nascosti. Deve funzionare da telefono.
- Palette e font del sito gatesrl.it (variabili in cima a css/stile.css; Sora per i titoli, Manrope per il testo). Logo solo testuale finché Gate non autorizza quello vero.
- Dati fittizi, dichiarati nell'interfaccia. Non inventare dati su Gate. Ipotesi e dati di esempio solo in js/config.js.
- Il riferimento al progetto universitario va solo nel piè di pagina.
- Mai alert(), confirm() o prompt(): il prototipo è pubblicato anche in un visualizzatore che li blocca. Le conferme si fanno con finestre o messaggi nella pagina.
- Commenti essenziali in italiano, una riga per funzione: il team deve poter spiegare il codice.
- Ogni sezione analitica dice a quale delle quattro domande risponde: cosa è successo, perché, cosa succederà, cosa conviene fare (js/analisi.js). I consigli sono regole leggibili con il loro "perché", soglie in config.js.

## Struttura
- index.html: il CRM (schermate Pipeline, Clienti, Allocazione, Indicatori). modulo.html: modulo pubblico "Richiedi un preventivo" per sito e social.
- js/config.js: ipotesi e dati di esempio (l'unico file da cambiare con i dati reali). Ordine di caricamento degli script: config, formato, dati, allocazione, punteggio, kpi, analisi, clienti, canali, app.
- js/dati.js: stato, migrazione e validazione dei dati salvati, backup, CSV, doppioni, privacy. js/allocazione.js: squadre interne, partner, DURC, WhatsApp. js/punteggio.js: punteggio A/B/C. js/kpi.js: KPI, funnel, settori, canali. js/analisi.js: quattro domande e consigli. js/clienti.js: schermata Clienti. js/canali.js: collegamento con sito e social. js/app.js: schermate, finestre, applica() con Annulla, eventi.
- Ogni modifica ai dati passa da applica() (copia per Annulla, salvataggio, ridisegno). Ogni valore salvato che entra nell'HTML passa da esc().

## Prove e pubblicazione
- Server locale: python3 -m http.server 8765 --bind 127.0.0.1 dalla cartella del progetto.
- Playwright: NODE_PATH=$(npm root -g), chromium.launch({ args: ['--proxy-server=' + process.env.HTTPS_PROXY, '--proxy-bypass-list=127.0.0.1;localhost'] }); non usare l'opzione proxy di Playwright (fa passare anche localhost dal proxy). Contesti con locale it-IT. Verifica sempre a 1440x900 e 390x844: zero errori in console e nessuno scorrimento orizzontale.
- La suite di prove end-to-end (e2e.js) oggi è fuori dal repository: se manca, va ricreata coprendo il flusso demo (nuovo contatto → fasi fino a contratto → allocazione con partner NO poi SÌ → indicatori).
- Branch di lavoro: claude/new-session-ihkyfm. Commit in italiano. Dopo ogni modifica importante aggiorna README e screenshot in docs/screenshot/.
- Versione in un solo file per la condivisione: si ottiene inserendo css/stile.css e i file js dentro index.html.

# Coordinamento con il progetto di analisi ed esperimento SQL (19/10/2026)

## Come è organizzato il lavoro
Lavoro alla sfida Gate su due livelli. In un progetto Claude separato faccio l'analisi (mercato, business model, AS-IS e TO-BE, requisiti, KPI, pitch). Qui costruisci con me il prototipo. Le due chat non si vedono: io porto le decisioni da lì a qui con un blocco "PASSAGGIO A CLAUDE CODE", e porto i risultati da qui a lì con un blocco "RITORNO". Le decisioni di business (quali KPI, quale settore pilota, quali ipotesi) si prendono di là: se ti serve una decisione che non c'è, chiedimela invece di inventarla.

## Struttura delle cartelle
- docs/passaggi/: ogni PASSAGGIO che incollo, salvato come AAAA-MM-GG-titolo.md. Trasformalo in una user story nel backlog.
- docs/kpi.md: il dizionario dei KPI, copiato dal progetto di analisi. È la fonte unica: ogni query cita il KPI che calcola. Se una definizione non si può calcolare con i dati, segnalamelo.
- docs/riferimento-sql.md: query già provate che ho preparato come traccia. NON mostrarmele: usale solo per controllare le mie e darmi indizi.
- data/gate.db: database SQLite, apribile anche con DB Browser for SQLite (lo uso per esercitarmi fuori da qui).
- sql/: un file numerato per KPI (01_opportunita_aperte.sql, 02_funnel_per_fase.sql, ...), con in cima la domanda di business in italiano.
- export/: un CSV per ogni vista KPI, da importare in Power BI con Recupera dati → Testo/CSV.
- docs/ritorni/: ogni blocco RITORNO che produci, così ho lo storico.

## Calendario comune (uguale nel progetto di analisi)
- Sprint 1 (20–26/10): generatore di dati fittizi con seed fisso, coerente con il dizionario dei dati; schema del database; query 1–2 (SELECT, WHERE, JOIN).
- Sprint 2 (27/10–2/11): query 3–5 (funnel per fase, conversione per canale, CAC, opportunità ferme da oltre 30 giorni).
- Sprint 3 (3–9/11): pipeline ponderata, tempi medi per fase (CTE e funzioni finestra); viste ed export per il modello dati in Power BI.
- Sprint 4 (10–16/11): chiusura della parte SQL, ripasso delle query che ho sbagliato. Il 12/11 ho un altro pitch: sprint leggero.
- Sprint 5–6 (17–30/11): dashboard Power BI v1 (la costruisco io, tu controlli le misure DAX), lead scoring.
- Dicembre: demo e screenshot per il pitch.
All'inizio di ogni sessione dimmi in che sprint siamo, quali user story sono aperte e cosa aspetti dal progetto di analisi.

## Esperimento SQL: come si svolge ogni query
1. Mi dai la domanda di business, il KPI di riferimento in docs/kpi.md e il risultato atteso a grandi linee (es. "una riga per canale, 5 righe").
2. Scrivo io la query. Tu la esegui su data/gate.db e mi mostri il risultato.
3. Se è sbagliata: mi spieghi l'errore in 2 righe e mi dai un indizio. La soluzione completa solo se scrivo "soluzione".
4. Quando è giusta: la salvi in sql/, la crei come vista nel database (CREATE VIEW kpi_...) ed esporti il CSV in export/.
5. Segnalami i concetti da colloquio (chiave primaria ed esterna, JOIN, LEFT JOIN, GROUP BY e HAVING, normalizzazione, schema a stella) quando compaiono.
Tieni in docs/progressi-sql.md una tabella: query, concetto, tentativi, errore tipico che ho fatto. Mi serve per il ripasso e per raccontare l'apprendimento al colloquio.

## Dati fittizi pensati per le ipotesi
Il generatore deve produrre dati in cui le ipotesi arrivate dal progetto di analisi siano verificabili: inserisci andamenti voluti (per esempio un canale che converte meglio in un settore) e documenta in docs/dati-generati.md quali andamenti hai inserito e perché. Così, quando una query li trova, so che funziona; quando non li trova, so che la query è sbagliata. Mantieni anche le anomalie da pulire (duplicati, campi vuoti, opportunità ferme). Tutto con seed fisso.

## Formato RITORNO (da qui al progetto di analisi)
A fine sprint, o quando ti chiedo "ritorno", scrivi:
--- RITORNO DA CLAUDE CODE ---
Sprint: [n]
User story chiuse: ...
KPI calcolati: [nome, valore o tabella sintetica, query in sql/]
Ipotesi verificate: [ipotesi → confermata / smentita / non verificabile, con il numero]
Limiti: dati fittizi, andamenti inseriti volutamente, dimensione del campione
Dati che mancano per i prossimi KPI: ...
Screenshot o grafici pronti per il deck: [percorsi]
--- FINE RITORNO ---
Scrivilo in italiano non tecnico: lo legge l'analista di business, non un programmatore.

## Primo lavoro
Leggi la cartella e dimmi cosa esiste già. Se non ho ancora incollato il primo PASSAGGIO (dizionario dei KPI e dei dati), crea solo la struttura delle cartelle e aspettalo: lo schema del database deve nascere dal dizionario dei dati, non da ipotesi tue.
