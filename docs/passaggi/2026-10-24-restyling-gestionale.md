--- PASSAGGIO A CLAUDE CODE ---
Titolo: restyling del gestionale commerciale (dal canvas di design del 23-24/10/2026)
Canvas di riferimento: https://claude.ai/artifact/6Cc8bFcQLmUNpmy6Rq6S9x (privato: va condiviso dal menu Condividi)
Sorgenti delle tavole: docs/design/gestionale/*.dc.html (solo riferimento visivo e di comportamento: NON copiarle nel prototipo, il formato .dc.html non è HTML dell'app)

## Come lavorare
- Una schermata alla volta, nell'ordine qui sotto; un commit per schermata, con prove e2e e screenshot aggiornati (CLAUDE.md).
- Restano validi tutti i vincoli di CLAUDE.md: HTML, CSS e JS puro, script classici; ogni modifica ai dati da applica(); esc() su ogni valore salvato; niente alert/confirm/prompt; palette e font già in css/stile.css; dati fittizi dichiarati solo nel piè di pagina; nessuna sigla dei KPI nell'interfaccia.
- "Non affollare": ogni funzione nuova sostituisce o raccoglie qualcosa. Le funzioni esistenti non si tolgono: si spostano (vedi «Cosa cambia nel menu»).
- Dove manca un dato su Gate resta il segnaposto tra parentesi quadre.

## Cosa cambia nel menu
Nuovo ordine: Oggi · Trattative · Clienti · Squadre · Cruscotto. In fondo al menu: Documenti e backup · Come funziona · «Lavori come <ruolo>».
- Oggi (#oggi) diventa la pagina iniziale.
- Pipeline → Trattative (stessa logica, quattro colonne).
- Allocazione → Squadre (stessa logica, schermata più corta).
- Direzione + Indicatori → Cruscotto: i quattro livelli degli Indicatori (Marketing, Fino all'offerta, Dall'offerta al contratto, Cosa fare domani) restano raggiungibili dal Cruscotto come sezioni richiudibili o link «Tutti gli indicatori»; nessun KPI va perso.
- Documenti resta com'è (#documenti), raggiunto dal fondo del menu.
- Da telefono: barra in basso con Oggi, Trattative, pulsante centrale «Nuova richiesta», Squadre, Cruscotto.

## Decisione da confermare con il progetto di analisi
Fasi mostrate all'utente: Richiesta → Sopralluogo → Offerta → Firmato, più Persa con motivo obbligatorio.
Nel database restano le 5 fasi attuali (contatto, qualificato, sopralluogo, offerta, contratto): «Richiesta» nell'interfaccia raggruppa contatto e qualificato. Non cambiare generatore/parametri.py finché il progetto di analisi non lo decide.

## Schermate (in ordine di sviluppo)

### 1. Oggi — tavola Main.dc.html
User story: come persona che riceve le richieste voglio vedere al massimo tre cose da fare oggi, con un pulsante ciascuna, per non perdere nessuna richiesta.
Criteri di accettazione:
- Al massimo 3 schede, in quest'ordine di priorità: richiesta senza risposta oltre la soglia (K12), sopralluogo di oggi, offerta da inviare. Se una categoria è vuota sale la successiva.
- Ogni scheda: fase, stato con icona e testo (in ritardo / ora / entro data), azienda, referente, comune, canale, una riga di contenuto, punteggio di coerenza col colore pieno della fascia, UN solo pulsante.
- Pulsante eseguito → messaggio di conferma nella scheda + «Annulla» (applica()); il conteggio nel menu scende.
- Sotto: «Poi, se resta tempo» con le prime 3 trattative ferme o senza prossima azione (K9), ognuna con un pulsante che fissa la prossima azione; link «Tutte le trattative da seguire (n)».
- Lista vuota → messaggio «Niente di urgente oggi» con un pulsante verso le trattative da seguire.
- In alto a destra «Nuova richiesta» (porta alla schermata 4).
Indicatori: K12 Tempo di prima risposta, K9 Trattative ferme, K14 Richieste registrate entro 24 ore.
Sostituisce: le schede «Da fare oggi» e «Da seguire» in cima alla Pipeline.

### 2. Scheda della richiesta — tavola Richiesta.dc.html
User story: come commerciale voglio vedere a che punto è una trattativa e fare il passo successivo con un clic.
Criteri:
- Avanzamento in 4 passi (fatto / adesso / da fare) con data sotto ogni passo.
- Riquadro «Prossimo passo» con titolo, una riga di spiegazione e UN pulsante che cambia con la fase: Fissa il sopralluogo → Registra le misure → Prepara l'offerta (apre il preventivo) → Segna come firmata (se firma su carta; dal link si segna da solo) → Assegna alla squadra.
- «Segna come persa»: scelta del motivo obbligatoria tra i 6 motivi di perdita; il pulsante di conferma resta disattivato finché non si sceglie; dopo, il rimedio suggerito (CONFIG.rimediPerdita) e «Riapri la trattativa».
- Colonna principale: pacchetto consigliato (nome, frequenza, prezzo al mese e all'anno, margine stimato, inclusi, «Perché questo pacchetto» in una riga); cronologia dal più recente.
- Colonna laterale: referente con Chiama / WhatsApp / Email, base giuridica della privacy, cancellazione dei dati personali; dati della richiesta (canale, servizio, zona, prima risposta, data e durata dell'annotazione); «Perché la coerenza è N» richiudibile; squadra che la eseguirebbe con ore libere e ore richieste.
Indicatori: K5 Margine atteso, K8 Durata della trattativa, K10 Motivi di perdita, K11 Clienti adatti a Gate, K13 Dalla richiesta all'offerta.
Campi: fase, data di ogni passaggio di fase, motivo di perdita, prossima azione e data, canale, data richiesta, data annotazione, data prima risposta, m², frequenza, pacchetto, valore, margine.

### 3. Offerta da pacchetto — tavola Offerta.dc.html (N2)
User story: come commerciale voglio preparare l'offerta dal pacchetto del settore e inviarla con un link di firma, per mandarla il giorno stesso del sopralluogo.
Criteri:
- Tre pacchetti (CONFIG.preventivo.pacchetti: Base, Plus, Completo) selezionabili; il consigliato è segnato.
- Metri quadri modificabili; ambienti e frequenza vengono dal pacchetto.
- «Il conto» si ricalcola subito: prezzo = m² × prezzo al m² all'anno; ore al mese = m² ÷ resa × passaggi × 4,33; costo del lavoro = ore × costo orario della squadra; prodotti = % spese dirette; margine in € e %.
- Stato del margine con icona e testo: sopra l'obiettivo (18%), tra minimo e obiettivo, sotto il minimo (12%) con invito a rivedere.
- «Chi la esegue»: ore richieste contro ore libere della squadra di zona; se non bastano, proposta a un partner.
- Messaggio al referente con scelta WhatsApp / Email, testo generato dal pacchetto; pulsante «Invia il link di firma»; niente parte senza il clic; conferma con ora, data di sollecito e link «Vedi cosa riceve il cliente».
- «Da dove vengono i numeri» richiudibile: formula in parole; costo orario da tabella ministeriale pulizie e multiservizi, provincia di Bari (parametro modificabile).
Indicatori: K5 Margine atteso, K13 Dalla richiesta all'offerta, K16 Offerte firmate da link (tolto dal catalogo il 21/10: registrare solo il dato «firmata da link sì/no»).
Sostituisce/raccoglie: la schermata Preventivo attuale (#preventivo-<id>) e l'offerta da pacchetto; la stampa per il cliente resta in Documenti.

### 4. Nuova richiesta da nota — tavole Nota.dc.html e Nota-telefono.dc.html (N1)
User story: come persona che riceve le richieste voglio incollare un messaggio e salvare la richiesta in meno di un minuto.
Criteri:
- Area di testo + scelta del canale (Telefono, WhatsApp, Email, Modulo del sito, LinkedIn, Profilo Google, Passaparola, Intermediario: dal dizionario dei canali).
- «Compila i campi dalla nota» usa le regole di js/assistente.js: azienda, referente, telefono, comune, settore, servizio, m², frequenza, avvio.
- Ogni campo ha un'etichetta: «dalla nota», «proposto: controlla», «da completare», «scritto da te»; tutti modificabili.
- Data della richiesta modificabile; data di annotazione automatica al salvataggio; base giuridica della privacy.
- Salvataggio possibile con almeno azienda e telefono; conferma con secondi impiegati e prossima azione creata in Oggi; «Registra un'altra richiesta».
- Dichiarare che la proposta è automatica e che niente si salva senza conferma.
Indicatori: K14 Richieste registrate entro 24 ore, K15 Richieste dai canali digitali, N3 secondi di annotazione.

### 5. Trattative — tavola Trattative.dc.html
User story: come commerciale voglio vedere tutte le trattative per fase e capire subito quali sono ferme.
Criteri: 4 colonne (Richiesta, Sopralluogo, Offerta, Firmato questo mese) con numero; scheda compatta con nome, punteggio, comune e misure, valore annuo, stato (ferma in arancione con icona), UN pulsante con il passo successivo e link «Persa»; filtro «Tutte / Solo le ferme»; valore pesato totale in alto; prime 3 schede per colonna + «Mostra le altre n»; a telefono le colonne scorrono in orizzontale dentro il loro riquadro.
Indicatori: K6 Trattative pesate, K9 Trattative ferme.

### 6. Clienti — tavola Clienti.dc.html
User story: come commerciale voglio trovare un'azienda e vedere in una pagina referenti, trattative, prossima azione e cronologia.
Criteri:
- Elenco a sinistra con ricerca per nome o comune e filtri (Tutti, In trattativa, Con contratto, Da sistemare = ferme o senza prossima azione); riga con nome, stato, comune e settore, prossima azione colorata per urgenza; prime 30 + «Mostra le altre» (come oggi).
- Scheda a destra (a telefono sotto): settore e comune, stato, fonte, data di ingresso; riquadro «Prossima azione» con UN pulsante; referenti con Chiama / WhatsApp / Email e privacy; trattative e contratti con fase, punteggio, valore e link alla scheda della richiesta; «Registra un contatto» (tipo + testo, pulsante attivo solo con testo, conferma); cronologia; «Dati dell'azienda e privacy» richiudibile con la cancellazione dei dati personali del referente.
Raccoglie: l'attuale scheda cliente (Referenti, Opportunità, Da fare, Registra un'attività, Cronologia) in un'unica vista elenco + dettaglio.

### 7. Squadre — tavola Squadre.dc.html
User story: come ufficio voglio assegnare un contratto firmato a una squadra con ore libere o a un partner, per avviare il servizio nei tempi promessi.
Criteri: «Da assegnare» con proposta automatica (squadra di zona con ore libere, altrimenti partner con DURC valido) e UN pulsante; dopo l'assegnazione le ore libere della squadra si aggiornano; schede delle squadre con barra ore impegnate/libere e stato (Ha posto, Quasi piena sotto il 10%, Piena); avviso se le offerte aperte superano le ore libere di una zona; partner in un riquadro richiudibile, con DURC scaduto = non proponibile; il messaggio al partner non contiene mai il nome del cliente.
Indicatori: vincolo di capacità di Gate; capacità delle squadre di «Cosa fare domani».

### 8. Cruscotto — tavola Cruscotto.dc.html
User story: come direzione voglio capire in dieci secondi se il processo migliora, dove si perdono i clienti e cosa decidere.
Criteri:
- Quattro numeri della direzione: K3 Conversione delle offerte, K4 Costo di acquisizione, K5 Margine atteso, K11 Clienti adatti a Gate; ciascuno con base del calcolo, obiettivo (icona + testo) e confronto con il mese prima.
- «Da decidere questa settimana»: 3 decisioni con il loro «perché» e un link (da js/analisi.js).
- «Dove si perdono i clienti»: barre Richieste → Sopralluoghi → Offerte → Firmate con la percentuale di passaggio; il passo più debole evidenziato con il consiglio.
- «Perché le perdiamo»: barre dei motivi di perdita (K10) e rimedio per il primo.
- «Da dove arrivano i clienti»: tabella per canale (richieste, contratti, costo del mese, costo per contratto); sito = gatefacilitymanagement.it; K1, K2 e K15 nella riga sotto il titolo.
- Richiudibili: «Controllo del processo» (K12, K14, K13, K8, K9, K7) e «Tempo risparmiato» (N3).
- Un solo colore per le barre (primario); stati sempre con icona e testo; tooltip sulle barre.
Raccoglie: Direzione, Indicatori e Riepilogo del mese (il riepilogo stampabile resta, dal pulsante in alto).

### 9. Firma da link, lato cliente — tavola Firma-cliente.dc.html
User story: come referente del cliente voglio leggere e firmare l'offerta dal telefono, senza app né password.
Criteri: intestazione Gate e sito; titolo, destinatario, date di invio e validità; prezzo al mese IVA esclusa; cosa comprende; condizioni; nome precompilato, casella «Ho letto e accetto» obbligatoria, pulsante «Firma l'offerta»; conferma con data e ora e prossimi passi; «Preferisce parlarne prima?» con [TELEFONO UFFICIO]; segnaposto [tipo di firma elettronica da definire con il consulente di Gate].
Parte da: l'attuale firma da link del prototipo.

### 10. Oggi da telefono — tavola Oggi-telefono.dc.html
Criteri: stesse 3 schede di Oggi in versione compatta, barra di navigazione in basso, nessuno scorrimento orizzontale a 390 px, pulsanti alti almeno 44 px.

## Valori di prova usati nelle tavole (già in js/config.js, non inventarne altri)
Pacchetti 15 / 23 / 39 € al m² all'anno; resa 150 m² l'ora; costo orario squadra interna 16,50 €; spese dirette 4%; margine obiettivo 18%, minimo 12%; squadre e partner fittizi di CONFIG; durata 12 mesi, avvio entro 15 giorni, validità offerta 30 giorni.

## Segnaposto aperti
[TELEFONO UFFICIO]; [tipo di firma elettronica]; palette del sito gatefacilitymanagement.it (il sito in uso: per ora resta quella di gatesrl.it, da verificare).

## Prove
Per ogni schermata: prove/e2e.js aggiornato, zero errori in console, 1440x900 e 390x844 senza scorrimento orizzontale, screenshot in docs/screenshot/, README aggiornato.
--- FINE PASSAGGIO ---
