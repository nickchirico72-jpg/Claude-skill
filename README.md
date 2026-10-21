# Gate · Sviluppo commerciale (prototipo)

Prototipo web per **Gate S.R.L.**: porta in digitale il percorso commerciale "dai contatti ai contratti", dalla richiesta del cliente alla commessa affidata a chi la esegue. Ha un **database SQL** interrogabile con SQLite o MySQL. L'app e le query lavorano sugli **stessi dati**.

> **Dati fittizi.** Clienti, referenti, squadre, partner, valori, margini, ore e numeri di telefono sono inventati a scopo dimostrativo e non sono dati reali di Gate. Gli andamenti del database sono inseriti apposta per verificare il metodo (vedi `docs/dati-generati.md`). Il logo è provvisorio: verrà sostituito da quello ufficiale solo previo permesso di Gate.

![Pipeline commerciale](docs/screenshot/pipeline-desktop.png)

## Il problema

Oggi Gate acquisisce commesse da portali di gara, con attività "porta a porta" e tramite intermediari. La sfida proposta da Gate: **come acquisire nuovi clienti e posizionarsi come partner nella gestione delle strutture**, partendo da un settore e un territorio pilota (ipotesi: uffici e studi professionali a Bari, nel database "uffici e commercio").

Gate ha chiesto tre risultati:
- un piano commerciale pilota;
- un percorso di vendita nel CRM;
- una dashboard delle opportunità "dai contatti ai contratti".

Il vincolo: acquisire solo clienti coerenti con la capacità operativa e la marginalità attesa.

**Regola di adozione:** al cliente non si chiedono app, account o password.
- La richiesta arriva dal modulo "Richiedi un sopralluogo" o da WhatsApp Business ed entra nel CRM con il canale di origine.
- L'offerta si firma da un link.
- La tecnologia nuova sta tutta dal lato di Gate.

## I componenti

| Componente | Cosa fa | Slide del deck (ipotesi da confermare) |
|---|---|---|
| **Database** (`data/gate.db`, `data/gate_mysql.sql`) | 13 tabelle: clienti, referenti, commerciali, opportunità con storico delle fasi, offerte, attività, costi dei canali. Poi i dizionari dei **canali** e dei **contenuti**, il **catalogo dei KPI** e le **richieste reali** importate. Si apre con DB Browser for SQLite o si carica in MySQL. | 26 (KPI di partenza), 27, 30 |
| **Catalogo dei KPI** (`kpi_catalogo`, `docs/kpi.md`) | 17 KPI con domanda di business, formula, livello della piramide di Anthony, tipo (efficacia, efficienza, adozione), processo APQC e soglia. È la fonte unica per SQL, app e Power BI. | 34-35 (TO-BE e KPI) |
| **Modulo "Richiedi un sopralluogo"** (`sopralluogo.html`) | Modulo breve, senza registrazione: azienda, settore, comune, tipo di ambienti, metri quadri, frequenza, referente, contatto e consenso privacy con informativa breve. Legge dal link `utm_source`, `utm_campaign` e `utm_content` e prepara il messaggio per WhatsApp o per email. | 40 |
| **Modulo "Richiedi un preventivo"** (`modulo.html`) | Secondo modulo, distinto (decisione del team), per chi conosce già servizio e ore. | 40 |
| **Pipeline** | Fasi Contatto → Qualificato → Sopralluogo → Offerta → Contratto (più Perso). Ogni richiesta ha **canale** e **data della richiesta** obbligatori, la **data di annotazione** (oggi, modificabile) e, se c'è, la **data della prima risposta**; la data dell'offerta si corregge da «Modifica». Ogni opportunità ha il **punteggio di coerenza da 0 a 100** (solo il numero, senza classi né livelli: decisione del 21/10), con il contributo di ogni criterio. Alla creazione si calcola il **preventivo indicativo** da metri quadri, frequenza e servizio (è una stima, con avviso se il margine è sotto il minimo). Una trattativa si può segnare **«Da ricontattare»** con una data obbligatoria: quando la data arriva compare in «Da seguire». Dal Sopralluogo, **«Prepara l'offerta»** apre la schermata **Preventivo**: misure del sopralluogo → ore, prezzo, costo del lavoro (squadra o partner), margine e punteggio; tariffa minima e obiettivo calcolate dai costi e mediana dei contratti simili, applicabili con un clic; riepilogo per il cliente stampabile o salvabile in PDF (senza costi né margini); poi «Registra l'offerta inviata». In fase Offerta c'è la **firma da link**. | 42 (preventivo e classe), 43 (pipeline e firma) |
| **Clienti** | Aziende e referenti, contatto con un clic (Chiama, WhatsApp, Email), cronologia, prossime azioni, privacy. La finestra **Sito e social** contiene: i link tracciati per canale, il **piano dei contenuti** con il link pronto per ogni contenuto e l'importazione delle richieste. | 40 |
| **Allocazione** | Ogni contratto va prima a una **squadra interna** con ore libere nella zona. Altrimenti si propone a un'**impresa partner** su WhatsApp, che risponde SÌ o NO (solo DURC regolare, niente lavoratori autonomi; il cliente resta di Gate). Le commesse da assegnare sono righe compatte con il prossimo passo (squadra disponibile, partner da proporre, in attesa, nessun partner) che si aprono con un clic; una tendina le filtra per zona. Capacità futura, squadre e partner, commesse assegnate, registro delle proposte e portale partner stanno in riquadri richiudibili. I partner sono "in roadmap" nel PASSAGGIO 3: il team ha scelto di tenerli. Si spengono con `funzioni.partner` in `js/config.js`. | 43 |
| **Indicatori** | Tre livelli più «Altri indicatori». Ogni vista dice da quale fonte legge: **Dati fittizi** oppure **Dati reali** (fotografia di partenza o test). Il CSV dei dati reali (7 colonne) si **importa ed esporta direttamente qui**; le righe importate restano in un elenco a parte. | 44 (dashboard) |

Le sezioni degli Indicatori seguono il percorso del cliente (riorganizzate il 21/10). Ogni KPI ha il suo codice, una riga che spiega la formula in parole, la formula tecnica e il livello della piramide di Anthony in «Come si calcola»; senza dati compare «nessun dato», mai zero. Il catalogo ha 14 KPI: K14, K16 e K17 sono stati tolti il 21/10, gli altri codici non cambiano.
- **Marketing** (da dove arrivano i clienti): quota di richieste digitali K15, costo di acquisizione K4; tabella dei 7 gruppi di canale con chiusura, punteggio medio, margine e costo per contratto; per settore e per contenuto in riquadri richiudibili.
- **Fino all'offerta**: prima risposta K12, contatti qualificati K1, sopralluoghi K2, tempo fino all'offerta K13, trattative ferme K9, funnel.
- **Dall'offerta al contratto**: conversione delle offerte K3, win rate K7, durata del ciclo K8, motivi di perdita K10.
- **Cosa fare domani**: pipeline ponderata K6, margine atteso K5, coerenza del portafoglio K11, capacità delle squadre e consigli.
- Le liste di lavoro (ferme, da ricontattare, prossimi passi) stanno solo nella Pipeline, in «Da fare oggi» e «Da seguire».

**Canali.** I 15 canali del database (12 attivi) sono raggruppati nei 7 gruppi usati da filtri, dashboard e CSV: sito, LinkedIn, telefono, email, passaparola, portale/gara, altro. Elenco e gruppi stanno in un solo punto: `CANALI_DIZIONARIO` e `GRUPPI_CANALI` in `generatore/parametri.py`.

![Indicatori, vista Direzione](docs/screenshot/indicatori-desktop.png)

<p>
  <img src="docs/screenshot/sopralluogo-mobile.png" alt="Modulo Richiedi un sopralluogo da telefono" width="200">
  <img src="docs/screenshot/pipeline-mobile.png" alt="Pipeline da telefono" width="200">
  <img src="docs/screenshot/indicatori-mobile.png" alt="Indicatori operativi da telefono" width="200">
  <img src="docs/screenshot/allocazione-mobile.png" alt="Allocazione da telefono" width="200">
</p>

## Il flusso della demo (meno di 90 secondi)

1. **Il cliente chiede un sopralluogo.** Apre `sopralluogo.html` dal link di un post LinkedIn (`?utm_source=linkedin&utm_campaign=uffici-e-commercio&utm_content=prova-03`) e invia la richiesta su WhatsApp.
2. **La richiesta entra nel CRM.** In Clienti → Sito e social si incolla il messaggio e si preme Importa. Nasce un'opportunità in **Contatto** con canale, campagna, contenuto, data di registrazione di oggi e consenso. Ha già il **preventivo** e il **punteggio**.
3. **La trattativa avanza nella Pipeline:** È qualificato → Sopralluogo fatto → Offerta inviata → **Firma da link** → Contratto.
4. **Allocazione e Indicatori.** In Allocazione la commessa va a una squadra o a un partner. Negli **Indicatori** («Dall'offerta al contratto») il nuovo contratto entra nella conversione delle offerte K3; in «Marketing» il contenuto compare tra le richieste qualificate.

## Cosa fare domani

L'ultima sezione degli Indicatori ragiona in avanti con i dati di oggi. Quattro previsioni, ognuna con il dato su cui si basa e le azioni che ne seguono:
1. **Contratti in arrivo**: offerte aperte × conversione delle offerte (K3) → offerte da sollecitare.
2. **Trattative a rischio**: trattative ferme oltre la soglia della fase (K9) e ricavi attesi in gioco → trattative da riprendere, rimedio al motivo di perdita prevalente.
3. **Capacità delle squadre**: ore delle offerte aperte, se firmate, contro le ore libere per zona → partner da preparare.
4. **Nuovi contatti il prossimo mese**: media degli ultimi 3 mesi × trattative chiuse con un contratto (K7) → budget da spostare tra canali.

Sotto restano K6, K5 e K11. Le previsioni proiettano i tassi di oggi; le azioni sono regole leggibili in `js/analisi.js`, con le soglie in `js/config.js`. Nelle altre sezioni non ci sono etichette («Cosa è successo?» ecc.): i dati si spiegano da soli.

Il **punteggio di coerenza** (0–100) ha il colore pieno della sua fascia: bassissimo (0–29, rosso), basso (30–49, arancione), medio (50–69, giallo), alto (70–84, verde chiaro), altissimo (85–100, verde scuro). Una **trattativa buona** ha punteggio da **70** in su (decisione del 21/10): è la base del K11 (quota di trattative buone) e delle trattative da riprendere in «Cosa fare domani». La soglia 70 è in `generatore/parametri.py` (`SOGLIA_BUONA`), uguale per app e SQL; le fasce in `js/config.js` (`punteggio.fasce`). La legenda dei colori sta sopra le schede della Pipeline.

## Collegamento con la deliverable del corso

| Task della deliverable | Dove si trova nel progetto |
|---|---|
| Processi AS-IS e TO-BE (BPM, APQC) | **AS-IS:** i tempi di risposta e di registrazione oggi, misurati sulla **fotografia di partenza** (`richieste_reali`, fonte partenza). **TO-BE:** modulo, registrazione immediata, preventivo, firma da link e report; il test di tre settimane li misura (fonte test). |
| KPI (APQC e KPI compendium) | `kpi_catalogo` e `docs/kpi.md`: ogni KPI ha il processo APQC, categoria 3.0 Market and Sell (dove il PASSAGGIO lo indica, "da verificare sul PCF"). |
| Piramide di Anthony | Il livello di ogni KPI (operativo, tattico, strategico) in «Come si calcola» e nella colonna `livello_anthony` del catalogo; le sezioni seguono il percorso del cliente. |
| Piattaforma e platform thinking | Cliente senza app (modulo e WhatsApp), partner via WhatsApp, CRM come punto unico dei dati, canali tracciati con utm senza pixel. |
| Roadmap della trasformazione | Le **evoluzioni previste:** portale partner (anteprima in Allocazione), lead scoring con modello statistico, archivio condiviso online. |
| Digital gap | La quota di richieste digitali (K15) e il tempo di prima risposta (K12), prima e dopo il test. |

## Interrogare il database con SQL

Il database è uno solo e si può usare in tre modi, dal più semplice:

1. **DB Browser for SQLite** (gratuito, nessuna installazione di server). Apri `data/gate.db` e scrivi le query nella scheda "Esegui SQL".
2. **MySQL o MariaDB.** Carica `data/gate_mysql.sql`, provato su MariaDB:
   - con **MySQL Workbench**: *File → Open SQL Script → esegui*;
   - da terminale: `mysql -u root -p < data/gate_mysql.sql`.

   Crea il database `gate` con tipi veri (DATE, DECIMAL), chiavi primarie ed esterne.
3. **Power BI o Excel.** Importa i CSV di `data/csv/`, uno per tabella.

**Differenze tra i dialetti:**
- I giorni tra due date si calcolano con `julianday(fine) - julianday(inizio)` in SQLite e con `DATEDIFF(fine, inizio)` in MySQL.
- I campi vuoti sono `NULL` in entrambi: si cercano con `IS NULL`, non con `= ''`.

## Rigenerare i dati e importare i dati veri

```
python3 generatore/genera_dati.py        # database, CSV, copia MySQL, js/dizionari.js, js/dati-db.js, docs/kpi.md
python3 generatore/controlla_dati.py     # controlli: deve finire con "tutti i controlli superati"
python3 generatore/importa_richieste.py data/esempi/richieste-partenza-esempio.csv
python3 generatore/importa_richieste.py data/esempi/richieste-test-esempio.csv --voti data/esempi/voti-test-esempio.csv
```

- **Parametri e dizionari.** Stanno in `generatore/parametri.py`: canali, settori, servizi, comuni, fasi, pesi del punteggio e ipotesi H1–H5. Con lo stesso seme i dati sono identici. L'app legge gli stessi dizionari da `js/dizionari.js`: si cambia un solo file e si rilancia il generatore.
- **Dati veri (fotografia di partenza e test).** Si scrivono in un CSV con le 7 colonne del foglio condiviso: `data_richiesta, data_annotazione, canale, settore, data_risposta, data_offerta, esito` (il canale può essere anche uno dei 7 gruppi). Le date possono essere scritte `AAAA-MM-GG` o `GG/MM/AAAA`. Il CSV si importa in due modi: **nell'app** (Indicatori → «Importa CSV dati reali», con il controllo delle righe e l'elenco a parte) oppure **nel database** con lo script qui sopra (`--fonte partenza` o `--fonte test` se il file non ha la colonna fonte).
- **Controlli dell'import.** Controlla date, canali, settori ed esiti, stampa le righe scartate con il motivo e sostituisce le righe già importate con la stessa fonte. I voti di facilità arrivano da un secondo CSV facoltativo (`fonte, riga, voto_facilita`).
- **I CSV di esempio.** Quelli in `data/esempi/` sono **inventati**: servono a provare l'import prima dei dati veri, e l'app li segnala come esempio. Nel CSV del test c'è apposta una riga sbagliata.
- **Il database si rigenera senza perdere i dati veri.** `genera_dati.py` conserva la tabella `richieste_reali`. I dati reali non si mescolano mai con quelli fittizi.
- **Attenzione alla privacy.** Il prototipo pubblicato su GitHub Pages contiene `js/dati-db.js`. Con dati personali veri il prototipo **non va pubblicato**: si usa in locale, previa verifica GDPR con Gate.

## Ipotesi nei dati fittizi

| Ipotesi | Parametro | Sui dati generati |
|---|---|---|
| H1 il passaparola converte in contratto più di ogni altro canale | `PASSAGGIO_PER_CANALE` | passaparola 24,2%, il primo canale |
| H2 negli uffici LinkedIn converte meglio del porta a porta | `BOOST_LINKEDIN_UFFICI` | 25,0% contro 3,7% |
| H3 la classe A chiude più spesso della classe C | `EFFETTO_PUNTEGGIO` | A 16,8%, B 11,1%, C 0% |
| H4 l'intermediario ha il margine più basso | `MARGINE_PER_CANALE` | 15,5%, contro 18–22% degli altri canali |
| H5 i nuovi contatti crescono di mese in mese | `CRESCITA_CONTATTI` | da 2 a marzo a 72 a settembre (ottobre parziale) |
| H6 nella GDO il portale gare converte meno ma con margine più alto | **non inserita: test cieco** | il portale gare usa la media degli altri canali in tutti i settori |

Pipeline aperta: 83 opportunità aperte su 300 (96% contattate da agosto), chiusura 13,4% sulle chiuse, 12% delle aperte ferme.

## Come avviarlo

- **In locale:** apri `index.html` con un doppio clic, non serve installare nulla. Per condividerlo in un solo file: `python3 strumenti/versione_unica.py` crea `dist/gate-crm-prototipo.html`.
- **Online, con GitHub Pages:** *Settings → Pages → Deploy from a branch*, cartella `/ (root)`.
- **Dove stanno i dati.** I dati del CRM restano nel browser (localStorage). Il piè di pagina ha tre pulsanti:
  - **Salva backup**;
  - **Carica backup**;
  - **Ripristina dati di esempio**: riparte dal database di prova, con le date spostate in modo che il 19/10/2026 coincida con oggi.
- **Browser che avevano la versione precedente.** Un avviso propone di passare ai nuovi dati, senza cancellare quelli salvati.
- **Prove automatiche.** Si avviano con `NODE_PATH=$(npm root -g) node prove/e2e.js`, con il server locale `python3 -m http.server 8765 --bind 127.0.0.1` acceso. Coprono:
  - il flusso della demo;
  - l'app uguale al database;
  - le fonti reali;
  - i partner spenti;
  - la migrazione;
  - i contenuti.

  Tutto a 1440×900 e 390×844, con zero errori in console. `FOTO=1` rifà gli screenshot.

## Gate può usarlo davvero?

Per il pilota sì, da una persona alla volta: registra clienti, trattative e attività, con backup ogni sera.

**Limiti:**
- un browser, una copia dei dati;
- nessun login;
- promemoria solo dentro l'app;
- un servizio per opportunità;
- costi, soglie, rese del preventivo e tariffe sono **valori di prova, da sostituire dopo l'intervista**.

**Passi successivi:**
1. un archivio condiviso online con login, per esempio Python e un database MySQL, riusando lo stesso schema;
2. il collegamento al gestionale di Gate;
3. i webhook, così che modulo e campagne scrivano direttamente nel CRM.

## Struttura dei file

```
index.html              il CRM: Pipeline, Clienti, Allocazione, Indicatori
sopralluogo.html        modulo pubblico "Richiedi un sopralluogo" (utm_source, utm_campaign, utm_content)
modulo.html             modulo pubblico "Richiedi un preventivo"
css/stile.css           palette e font del sito Gate (variabili in cima al file)
js/dizionari.js         GENERATO: canali, settori, servizi, comuni, fasi, pesi del punteggio (uguali al database)
js/dati-db.js           GENERATO: le tabelle del database per l'app
js/archivio.js          dove stanno i dati (oggi questo browser), chi lavora, registro delle modifiche
js/config.js            ipotesi dell'app: squadre, partner, preventivo, obiettivi, consigli, funzioni.partner
js/formato.js           euro, percentuali e date
js/dati.js              stato, dati iniziali dal database, migrazione, backup, CSV, doppioni, privacy
js/allocazione.js       squadre, partner, DURC, messaggio WhatsApp
js/punteggio.js         preventivo indicativo, margine e punteggio di coerenza (0-100)
js/kpi.js               KPI del catalogo (fittizi e reali), funnel, canali, contenuti, settori
js/analisi.js           consigli «Cosa fare domani»
js/clienti.js           schermata Clienti
js/canali.js            sito e social: link tracciati, piano dei contenuti, import delle richieste
js/indicatori.js        Indicatori su tre livelli con la scelta della fonte
js/preventivi.js        schermata Preventivo: conti, prezzi di riferimento, riepilogo da stampare
js/app.js               Pipeline, Allocazione, finestre, firma da link, eventi
generatore/             parametri.py, genera_dati.py, kpi_catalogo.py, esporta.py, importa_richieste.py, controlla_dati.py
data/                   gate.db (SQLite), gate_mysql.sql (MySQL), csv/, esempi/
docs/                   kpi.md, dati-generati.md, backlog.md, esercizi-k12-k13-k15.md, passaggi/, ritorni/, screenshot/
sql/  export/           le query di Nicolò e i CSV per Power BI
prove/e2e.js            prove automatiche (Playwright)
strumenti/              versione in un solo file
```

## Progetto

Prototipo realizzato per l'**Open Challenge by Enterprise 2026**, corso di Digital Transformation, laurea magistrale LM-77, Università LUM, con Gate S.R.L. come azienda partner.
