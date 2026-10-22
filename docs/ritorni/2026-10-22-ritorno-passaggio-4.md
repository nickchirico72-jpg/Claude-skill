--- RITORNO DA CLAUDE CODE ---
Sprint: 1 (20–26/10). PASSAGGIO 4: piattaforma su cinque livelli e demo.

User story chiuse: US-N1 richiesta da nota, US-N2 offerta da pacchetto, US-N3 tempo risparmiato, US-N4 lista del lunedì, US-N5 ponte con il gestionale, US-N6 pagina «Come funziona» con la demo guidata. Non fatta: US-N7 report mensile al cliente (opzionale). Il Riepilogo del mese per la direzione ne è la base.

Cosa è cambiato nel prototipo
- N1. «Nuovo contatto» → «Da una nota»: chi risponde al telefono scrive o detta la nota (con il microfono della tastiera, fuori dal browser) e ritrova la richiesta compilata. L'assistente è fatto di regole leggibili, senza intelligenza artificiale. Per ogni campo mostra il valore, la frase da cui viene e lo stato: «sicuro», «da controllare» (giallo) o «mancante» (rosso). Ogni campo si corregge. Solo «Conferma e registra» crea la trattativa, che si apre subito con preventivo e punteggio. Il tempo impiegato si salva.
- N2. Nel preventivo si sceglie un pacchetto per uffici e studi (Base, Plus, Completo; prezzi di prova al mq all'anno). L'offerta stampabile riporta servizi inclusi e opzionali, prezzo annuo e mensile, validità con la data e condizioni essenziali, ma non il margine. «Segna l'offerta come inviata» registra la data di invio. La firma da link porta a contratto con data di chiusura oggi e scadenza a 12 mesi.
- N3. In «Cosa fare domani» c'è il tempo risparmiato su quattro attività: annotare una richiesta, preparare un'offerta, ricostruire le trattative da sollecitare, preparare il report per la direzione. Per ognuna: minuti prima e dopo (stime modificabili), volte al mese (dai dati), ore ed euro. La formula è scritta in parole. Una riga riassuntiva è anche nel Riepilogo del mese.
- N4. La lista del lunedì si apre da «Da seguire» nella Pipeline e ha quattro sezioni: richieste senza prima risposta, trattative ferme, offerte senza esito da oltre 14 giorni, contratti da rinnovare entro 90 giorni (quelli entro 60 in evidenza). Ogni riga ha cliente, punteggio, valore, giorni, responsabile e azione suggerita. La data di riferimento si cambia e la lista si stampa o si copia come testo.
- N5. In Clienti, «Gestionale e Excel» esporta e importa un CSV per tabella con i nomi del dizionario. L'import controlla tipi, valori ammessi e collegamenti, elenca le righe scartate con il motivo e sostituisce i dati di lavoro solo dopo aver scaricato un backup: non li mescola mai con quelli di esempio.
- N6. La pagina «Come funziona» (dal piè di pagina) mostra i cinque livelli. Ogni passaggio ha la sua etichetta («automatico», «l'assistente propone, la persona conferma», «persona») e il collegamento alla schermata. In fondo c'è la demo guidata in 7 passi.

Criteri verificati (prove automatiche: 152 nell'app, 39 sull'archivio MySQL, tutti i controlli dei dati superati)
- N1.1–N1.6 verificati. Le 5 note di prova arrivano tutte a 9 campi su 9 (l'obiettivo era almeno 7 su 9).
- N2.1–N2.4 verificati. Il margine non compare nell'offerta stampata. Nuovi campi: offerte.pacchetto e opportunita.data_scadenza_contratto, anche nei dati storici.
- N3.1–N3.3 verificati. Cambiando un minuto i totali si aggiornano. Con 3 richieste da nota, il «dopo» diventa la media vera.
- N4.1–N4.4 verificati. App e database danno gli stessi numeri a due date diverse. Gli esercizi SQL sono in docs/esercizi-lista-lunedi.md.
- N5.1–N5.3 verificati. Andata e ritorno: stesse righe nelle tabelle, nessuna scartata. Una riga sbagliata viene scartata con tre motivi. I file scaricati dall'app passano anche i controlli in Python.
- N6.1–N6.3 verificati. La demo guidata gira in 7 secondi in automatico; a mano, leggendo la nota, resta ben sotto i 90 secondi.
- Non verificato: N7 (non fatto).

KPI calcolati e numeri chiave (dati fittizi)
- Estrazione sulle 5 note di prova: 9 campi corretti su 9 in tutte e cinque (45 su 45). Attenzione: le note e le regole sono state scritte insieme, quindi su note vere di Gate il risultato sarà più basso. Servono 10–20 note vere (anonimizzate) per tarare le regole.
- Lista del lunedì al 19/10: richieste senza risposta 0, trattative ferme 6, offerte senza esito 11, contratti da rinnovare 12 (8 entro 60 giorni). Al 13/10: 6, 20, 12, 9 (7 entro 60). Al 19/10 le richieste senza risposta sono 0 perché l'ultima richiesta dei dati è del 14/10.
- Tempo risparmiato con i parametri di partenza: 59,9 ore e 1.497 € al mese (70 richieste e 35 offerte nell'ultimo mese, costo orario 25 €). La voce che pesa di più è preparare le offerte: 43,8 ore.
- Demo guidata: 7 secondi in automatico; la commessa viene assegnata e i contratti passano da 29 a 30.
- KPI per gli esercizi: K9 trattative ferme al 19/10 = 10 (contatto 4, qualificato 2, offerta 4).

Ipotesi verificate: nessuna ipotesi nuova in questo PASSAGGIO. Il tempo risparmiato non è verificabile finché i minuti restano stime: vanno sostituiti con la fotografia di partenza.

Decisioni prese qui (dal 21/10) che il progetto di analisi deve conoscere
- Nell'interfaccia niente classi A/B/C: solo il punteggio da 0 a 100, a colori. Una trattativa è «buona» da 70 in su, e il K11 diventa la quota di trattative buone. Liste ordinate prima per buone, poi per valore.
- K14, K16 e K17 restano fuori dal catalogo. I dati però si salvano: data di registrazione, firma da link e secondi.
- Nessuna etichetta «di prova» o «dati fittizi» nelle schermate: si dichiarano solo nel piè di pagina e nel menu «Fonte dei dati». L'assistente non si chiama «simulazione», ma la scheda dice che propone i campi con regole e che la persona controlla e conferma.
- I contratti in corso dei clienti storici stanno in una tabella a parte, così i KPI del funnel non cambiano.
- Il ponte esporta 7 tabelle, non 5: in più storico delle fasi e commerciali, per non perdere le date delle fasi e i responsabili.
- Un'offerta da pacchetto può partire senza sopralluogo. Le fasi saltate si registrano con la stessa data e sono dichiarate nella cronologia.

Limiti
- Dati fittizi, con andamenti inseriti volutamente; 300 opportunità.
- Minuti del tempo risparmiato, prezzi dei pacchetti e condizioni sono valori di prova.
- I giorni lavorativi non tengono conto delle festività.
- La dettatura usa il telefono o il computer, non il CRM.

Dati che mancano
- Fotografia di partenza dei tempi: quanti minuti servono oggi per annotare una richiesta, preparare un'offerta e il report.
- Prezzi reali dei pacchetti e condizioni contrattuali.
- Durata reale dei contratti e date di scadenza dei clienti in corso.
- Alcune note vere delle telefonate, anonimizzate.
- Nomi dei commerciali.
- Formato degli export del gestionale di Gate, per adattare i nomi delle colonne.

Screenshot pronti per il deck (docs/screenshot/)
- nota-desktop.png, nota-mobile.png (richiesta da nota)
- offerta-pacchetto-desktop.png (preventivo con pacchetto)
- lunedi-desktop.png, lunedi-mobile.png (lista del lunedì)
- indicatori-previsione-desktop.png (Cosa fare domani con il tempo risparmiato)
- come-funziona-desktop.png, come-funziona-mobile.png (i cinque livelli)
- riepilogo-desktop.png (riepilogo del mese)

Dubbi aperti
1. Canali: Gate dice che le richieste arrivano per telefono e dagli incontri, e che LinkedIn non è operativo. I dati fittizi danno peso a sito web e LinkedIn. Va rivisto il peso dei canali nel generatore, oppure resta lo scenario TO-BE?
2. «Tutti i giorni» per un ufficio: 5 o 6 volte a settimana? Oggi l'assistente propone 5 e chiede di controllare.
3. Le offerte da pacchetto senza sopralluogo contano come «sopralluogo fatto» nel K2. Va bene, o il K2 deve contare solo i sopralluoghi veri?
4. Il report mensile al cliente (N7): lo facciamo nello Sprint 2?
--- FINE RITORNO ---
