# Prototipo CRM per Gate S.R.L. – istruzioni generali

Prototipo web per l'Open Challenge by Enterprise 2026 (Digital Transformation, LM-77, Università LUM) con Gate S.R.L., servizi integrati alle strutture a Bari. Settore e territorio pilota: uffici e studi professionali a Bari. Lavora e scrivi in italiano.

## Vincoli
- Archivio dei dati (decisione del 21/10): il vincolo "nessun backend" è tolto, perché il prototipo deve diventare uno strumento che Alfredo usa con il suo team, senza backup ed export quotidiani. La soluzione specifica (database online, Google, Microsoft 365, server proprio o CRM sul mercato) non è ancora scelta: vedi docs/archivio-condiviso.md. Finché non è scelta, la versione attuale resta com'è: file statici, dati nel browser (localStorage), funziona con un doppio clic ed è la versione per la demo e per GitHub Pages. Ogni modifica ai dati continua a passare da applica(), carica() e salva(): sono i punti da cui passerà l'archivio condiviso.
- HTML, CSS e JavaScript puro, script classici (niente moduli ES, framework, librerie o build).
- Interfaccia in italiano sobrio, con il lessico di Gate (commessa, squadra, caposquadra, sede di lavoro, referente, margine). Facile per chi non è tecnico: ogni schermata dice in una riga cosa fare, azioni con un clic, niente menu nascosti. Deve funzionare da telefono.
- Non affollare il prototipo (richiesta del 20/10, vale per tutto): ogni schermata mostra solo ciò che serve per decidere; i dettagli tecnici (formule SQL, APQC, date secondarie) stanno in riquadri richiudibili; niente doppioni tra pannelli; una funzione nuova si aggiunge togliendo o raccogliendo qualcosa, non accumulando.
- Palette e font del sito gatesrl.it (variabili in cima a css/stile.css; Sora per i titoli, Manrope per il testo). Logo solo testuale finché Gate non autorizza quello vero.
- Dati fittizi, dichiarati nell'interfaccia. Non inventare dati su Gate. Ipotesi dell'app in js/config.js; dati di esempio e dizionari condivisi (canali, settori, servizi, comuni, fasi, pesi del punteggio) in generatore/parametri.py, da cui nascono data/gate.db, js/dizionari.js e js/dati-db.js: app e SQL lavorano sugli stessi dati (database unificato, decisione del 20/10).
- Il riferimento al progetto universitario va solo nel piè di pagina. Nessun richiamo grafico al "prototipo" nell'interfaccia (decisione del 21/10): i dati fittizi si dichiarano solo nel piè di pagina e nel menu «Fonte dei dati» degli Indicatori (niente etichette, legende o istruzione in Pipeline: decisione del 21/10).
- Mai alert(), confirm() o prompt(): il prototipo è pubblicato anche in un visualizzatore che li blocca. Le conferme si fanno con finestre o messaggi nella pagina.
- Commenti essenziali in italiano, una riga per funzione: il team deve poter spiegare il codice.
- Niente etichette delle quattro domande ("Cosa è successo?" ecc.: decisione del 21/10, i dati si spiegano da soli). La sezione «Cosa fare domani» degli Indicatori ragiona in avanti con i dati di oggi: quattro previsioni (contratti in arrivo, trattative a rischio, capacità delle squadre, nuovi contatti), ognuna con la base del calcolo e le azioni che ne seguono (js/analisi.js), regole leggibili con il loro "perché", soglie in config.js.
- Punteggio di coerenza: solo il numero da 0 a 100, con il colore pieno della fascia (bassissimo 0–29 rosso, basso 30–49 arancione, medio 50–69 giallo, alto 70–84 verde chiaro, altissimo 85–100 verde scuro; punteggio.fasce in config.js). Trattativa buona = punteggio da 70 in su (decisione del 21/10; SOGLIA_BUONA in generatore/parametri.py): base del K11 e delle azioni di «Cosa fare domani».

## Struttura
- index.html: il CRM (schermate Pipeline, Clienti, Allocazione, Indicatori su tre livelli). Moduli pubblici per sito e social: sopralluogo.html "Richiedi un sopralluogo" e modulo.html "Richiedi un preventivo" (due moduli distinti, decisione del team), con utm_source, utm_campaign e utm_content.
- js/dizionari.js e js/dati-db.js: generati da generatore/genera_dati.py, non si modificano a mano. js/config.js: ipotesi dell'app (squadre, partner, costi, preventivo, soglie, funzioni.partner). Ordine di caricamento degli script: dizionari, dati-db, config, archivio, formato, dati, allocazione, punteggio, kpi, analisi, clienti, canali, indicatori, preventivi, app. I moduli pubblici caricano solo dizionari e config.
- js/archivio.js: archivio dei dati (oggi solo locale), record cambiati a ogni salvataggio, utente e ruolo, registro delle modifiche; schema dell'archivio condiviso in docs/schema-archivio.md. js/dati.js: stato, migrazione e validazione dei dati salvati, backup, CSV, doppioni, privacy. js/allocazione.js: squadre interne, partner, DURC, WhatsApp, avvisi su scadenze e partner (riga in cima alla Pipeline, soglie in config.js avvisi). js/punteggio.js: punteggio di coerenza da 0 a 100, trattativa buona (da 70) e fascia di colore; la classe A/B/C resta solo nel database e nel controllo delle offerte con punteggio sotto 50. js/kpi.js: KPI del catalogo (14 KPI: K14, K16, K17 tolti il 21/10), funnel, settori, canali, contenuti, dati reali. js/indicatori.js: schermata Indicatori lungo il percorso del cliente (Marketing, Fino all'offerta, Dall'offerta al contratto, Cosa fare domani; fonte fittizi o reali; import ed export del CSV a 7 colonne) e Riepilogo del mese stampabile (#riepilogo). js/preventivi.js: schermata Preventivo (#preventivo-<id>): misure, conti, prezzi di riferimento, riepilogo stampabile per il cliente. js/analisi.js: previsioni e azioni di «Cosa fare domani». js/clienti.js: schermata Clienti (righe compatte, prime 30 poi «Mostra le altre»). js/canali.js: collegamento con sito e social. js/app.js: schermate, finestre, applica() con Annulla, eventi.
- Ogni modifica ai dati passa da applica() (copia per Annulla, salvataggio, ridisegno). Ogni valore salvato che entra nell'HTML passa da esc().

## Prove e pubblicazione
- Server locale: python3 -m http.server 8765 --bind 127.0.0.1 dalla cartella del progetto.
- Playwright: NODE_PATH=$(npm root -g), chromium.launch({ args: ['--proxy-server=' + process.env.HTTPS_PROXY, '--proxy-bypass-list=127.0.0.1;localhost'] }); non usare l'opzione proxy di Playwright (fa passare anche localhost dal proxy). Contesti con locale it-IT. Verifica sempre a 1440x900 e 390x844: zero errori in console e nessuno scorrimento orizzontale.
- Suite di prove end-to-end: prove/e2e.js (NODE_PATH=$(npm root -g) node prove/e2e.js; FOTO=1 rifà gli screenshot in docs/screenshot/). Copre il flusso demo (modulo → import → preventivo e classe → fasi → firma da link → allocazione con partner NO poi SÌ → indicatori), app = database, fonti reali, partner spenti, migrazione, contenuti.
- Dati: python3 generatore/genera_dati.py rigenera database, CSV, copia MySQL e dati dell'app; python3 generatore/controlla_dati.py verifica tutto (deve finire con "tutti i controlli superati"); python3 generatore/importa_richieste.py importa i CSV dei dati veri.
- Branch di lavoro: claude/new-session-ihkyfm. Commit in italiano. Dopo ogni modifica importante aggiorna README e screenshot in docs/screenshot/.
- Versione in un solo file per la condivisione: python3 strumenti/versione_unica.py (inserisce css e js dentro index.html; scrive dist/gate-crm-prototipo.html, non versionato).

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
