# Archivio condiviso in MySQL: schema verificato e cosa manca

Decisione del 21/10: il database di riferimento è **MySQL** (o MariaDB, la versione libera compatibile), interrogabile con query semplici.

## Cosa è pronto e verificato
- **Schema**: `data/archivio_mysql.sql`, 28 tabelle, generato da `strumenti/archivio.py`. Contiene **ogni dato che l'app oggi tiene nel browser** (aziende, referenti con privacy, trattative con fasi, preventivo, ricontatto, allocazione, proposte ai partner, attività, contenuti, richieste reali, registro delle modifiche) **e le impostazioni oggi scritte nel codice** (squadre, partner, servizi, preventivo, canali, settori, comuni, soglie).
- **Migrazione**: `python3 strumenti/archivio.py esporta BACKUP.json IMPOSTAZIONI.json > dati.sql` trasforma il backup dell'app («Salva backup») negli INSERT per MySQL. Se l'app ha un campo che il database non conosce, la migrazione si ferma e dice quale: nessun dato si perde in silenzio.
- **Prove** (`python3 prove/archivio.py`, dopo `prove/e2e.js`), su un **MariaDB vero** avviato per l'occasione:
  - andata e ritorno: stato iniziale, stato dopo la demo e uno stato con **tutti i campi facoltativi** si caricano, si rileggono e tornano **identici**;
  - l'app riapre lo stato riletto dal database e calcola **gli stessi KPI**;
  - **16 dati sbagliati vengono rifiutati** dal database: fase inesistente, trattativa di un'azienda che non esiste, perdita senza motivo, codice doppio, ore negative, sì/no diverso da 0/1, azienda senza nome, orario o data impossibili, proposta a un partner inesistente, allocazione a partner senza partner, ruolo non previsto, impostazione non in JSON, due proposte in attesa per la stessa trattativa, cancellazione di un'azienda che ha trattative;
  - ogni modifica registra **chi e quando** (`aggiornato_da`, `aggiornato_il`);
  - le domande di Alfredo hanno risposta con query brevi (trattative aperte per fase, commesse senza esecutore, DURC in scadenza, ultime modifiche).

## Le tabelle in breve
| Gruppo | Tabelle |
|---|---|
| Dati del CRM | aziende, referenti, opportunita, fasi_opportunita, preventivi, ricontatti, allocazioni, proposte_partner, attivita, contenuti, richieste_reali, registro |
| Impostazioni (schermata Impostazioni) | squadre (+ zone, servizi), partner (+ zone, servizi), servizi, ambienti_preventivo, frequenze_preventivo, impostazioni (soglie in JSON) |
| Dizionari | settori, comuni, canali, motivi_perdita |
| Accesso e sistema | utenti (nome, email, ruolo), archivio_info (versione, contatori) |

Scelte da raccontare: chiavi primarie ed esterne ovunque; tabelle separate per ciò che si ripete (fasi, proposte, zone: **normalizzazione**); `ordine` dove l'ordine dei menu conta; date di tipo DATE; sì/no come 0/1 controllati; le zone e i servizi di squadre e partner come insiemi.

## Cosa manca (non è il database: è il server e le regole di lavoro)
| # | Lacuna | Perché conta | Come si chiude |
|---|---|---|---|
| 1 | **Il server tra pagine e MySQL** (API) | Il browser non deve parlare direttamente con MySQL: password e permessi starebbero nel browser | Un piccolo programma sul server che legge e scrive le tabelle; in `js/archivio.js` si aggiunge l'archivio «condiviso» con le stesse `leggi()` e `scrivi()` |
| 2 | **Id generati dal browser** («op301», «at10019») | Due persone che creano insieme una trattativa possono ottenere lo stesso id | Id creati dal server, oppure codici casuali lunghi (UUID); il codice di riferimento «GT-2026-…» lo assegna il server |
| 3 | **Login e permessi per ruolo** | Oggi il nome è solo scritto nel browser | Tabella `utenti` pronta; va deciso **chi può fare cosa** (fatto nel prototipo il 24/10, `CONFIG.ruoli`: amministratore unico tutto, comprese le operazioni che sostituiscono i dati; commerciale Oggi, clienti, trattative, allocazione; marketing e analisi cruscotto, approfondimenti, canali e dati reali, trattative in sola lettura). Manca l'accesso protetto, che arriva con l'archivio condiviso |
| 4 | **Due modifiche allo stesso record** | Il secondo salvataggio non deve cancellare il primo | Colonna `aggiornato_il` pronta: il server rifiuta il salvataggio se il record è cambiato dopo la lettura, l'app avvisa «modificato da …» |
| 5 | **Date vere** | Con i dati di prova l'app sposta le date a oggi | Con l'archivio condiviso lo spostamento si spegne (serve solo alla demo) |
| 6 | **Backup e ripristino** | Nessun backup manuale | Backup automatico giornaliero del MySQL (servizio dell'hosting) e una prova di ripristino prima della consegna |
| 7 | **Moduli del sito → CRM** | Oggi la richiesta passa da WhatsApp e da un copia-incolla | Il server riceve il modulo e crea la trattativa in Contatto, con anti-spam e consenso registrato |
| 8 | **Privacy** | Dati personali dei referenti | Accesso solo con login, dati in UE, accordo con l'hosting; cancellazione e registro esistono già |

## Dove può stare il server MySQL
Da chiedere ad Alfredo: **dove è ospitato oggi gatesrl.it?** Molti hosting italiani includono già MySQL e PHP: il server (punto 1) potrebbe stare lì, senza costi in più. In alternativa un MySQL gestito in UE con backup automatici. Lo schema non cambia in nessuno dei due casi.

## Controlli già fatti nel prototipo (25/10)
- Validazione completa dei dati letti, con identificativi e codici unici (come le chiavi primarie e il vincolo UNIQUE dell'archivio MySQL).
- Registro delle modifiche con l'ora locale.
- Backup automatico prima di ogni sostituzione completa dei dati.
- CSV del ponte protetti dalle formule di Excel (apostrofo all'export, tolto all'import).
- Diritto alla cancellazione: nome, email e telefono del referente tolti anche dai testi liberi e dal registro.

Restano compiti dell'archivio condiviso: accesso con password e permessi controllati dal server, cifratura, copie automatiche, scrittura contemporanea di più persone.
