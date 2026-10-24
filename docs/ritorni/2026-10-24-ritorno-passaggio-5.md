--- RITORNO DA CLAUDE CODE ---
Sprint: 1 (20–26/10). PASSAGGIO 5 (restyling da Claude Design) e richieste dirette del 22–24/10.

User story chiuse
- Oggi come schermata di apertura (US-R2): al massimo tre cose urgenti, ognuna con un solo pulsante (Rispondi, Sopralluogo di oggi, Offerta da inviare, Sollecita), poi «se resta tempo» e sotto le trattative per fase.
- Scheda della trattativa (US-R3 e US-S): una pagina per ogni trattativa con l'avanzamento in 4 passi (Richiesta, Sopralluogo, Offerta, Firmato) e un solo pulsante per il passo successivo. Sostituisce la vecchia finestra di dettaglio senza perdere nulla.
- Cruscotto (US-R7): un'unica schermata al posto di Direzione e Indicatori. Ha quattro numeri con obiettivo e confronto col mese prima, le tre decisioni della settimana, dove e perché si perdono i clienti (ciascuno con il suo rimedio), i canali con i costi e sei indicatori di controllo. Gli indicatori dettagliati restano dietro «Approfondisci».
- Richiesta da nota (US-R4, migliorata):
  - la nota scritta a mano si legge da sola, come gli esempi;
  - le regole riconoscono il nome dell'azienda dopo «della / presso», anche come sigla, i comuni scritti con un errore e le ore al mese, e ricavano il servizio dalle parole della nota;
  - se la nota chiede più servizi, nasce una trattativa per ciascuno.
- Avviso di capacità (US-R6, in parte): il preventivo segnala se nessuna squadra della zona ha abbastanza ore libere al mese, prima di inviare l'offerta.
- Ruoli (US-T): al primo uso si sceglie chi lavora. I ruoli sono tre:
  - amministratore unico: tutto, comprese le operazioni che sostituiscono i dati;
  - commerciale: Oggi, Clienti, Allocazione, Cruscotto, Documenti;
  - marketing e analisi: Cruscotto con gli approfondimenti, canali e dati reali; clienti e trattative in sola consultazione.
- Documenti (US-P): report da stampare, scambio con il gestionale ed Excel, dati reali e backup sono tutti in un posto.
- Clienti: su computer la scheda di un cliente ha l'elenco accanto, per passare da un cliente all'altro con un clic.
- Demo guidata aggiornata: 7 passi, circa 6 secondi in automatico. Dopo l'offerta si apre la scheda della trattativa e la firma è il passo successivo.

KPI calcolati (dati fittizi, ultimi 30 giorni o tutto lo storico, come indicato)
- Contratti firmati nel mese: 13, per circa 366.000 € all'anno.
- K3 Conversione delle offerte: 35% (29 contratti su 82 offerte con esito). L'obiettivo era almeno 35%: raggiunto per poco.
- K12 Tempo di prima risposta nel mese: 1,9 giorni, contro un obiettivo di 1 giorno, quindi sotto l'obiettivo.
- K6 Ricavi attesi: circa 572.000 € all'anno da 83 trattative aperte, pesati per fase.
- Dove si perdono i clienti, su 300 richieste: 232 qualificate (77%), 143 sopralluoghi (62%), 112 offerte (78%), 29 contratti (26%). Il passo più debole è la firma.
- K10 Motivi di perdita: 188 trattative perse. I primi motivi sono «nessuna risposta» (57) e «prezzo» (49).
- K9 Trattative ferme: 10 su 83 aperte. K11 Trattative buone (punteggio da 70 in su): 62%. K15 Richieste dai canali digitali: 35%.
- Tempo risparmiato con i minuti di partenza: circa 60 ore e 1.500 € al mese (stima).
- Nessuna query nuova in sql/ in questo sprint: le query di US-01 restano aperte.

Ipotesi verificate
- Nessuna ipotesi nuova. I numeri sopra servono a mostrare come funziona il cruscotto, non dicono nulla su Gate.

Decisioni prese qui che il progetto di analisi deve conoscere
- K14, K16 e K17 restano fuori anche dal cruscotto (decisione di Nicolò del 23/10). Al posto di «richieste registrate entro 24 ore», tra i quattro numeri c'è la conversione delle offerte.
- I ruoli sono tre, non quattro: ufficio e commerciale sono uniti, analista e marketing pure. Senza un server l'accesso non è protetto: lo diventerà con l'archivio condiviso.
- Più servizi chiesti dallo stesso cliente diventano più trattative, una per servizio, ognuna con squadra, margine e punteggio propri. L'offerta unica con un solo prezzo (opzione 2) si decide dopo l'incontro con Alfredo.
- La voce «Pipeline» non esiste più: si chiama «Oggi». «Direzione» è diventata il Cruscotto.
- I rimedi del cruscotto, per il passo più debole e per il primo motivo di perdita, sono regole scritte da noi e vanno validate con Gate.

Limiti
- Dati fittizi con andamenti inseriti volutamente; 300 opportunità.
- Le date sono spostate per far coincidere i dati con oggi, quindi i numeri del mese cambiano ogni giorno.
- Le regole della nota sono state provate su note scritte da noi. Su note vere di Gate saranno meno precise.

Dati che mancano
- Note vere delle telefonate, anonimizzate (10–20), per tarare le regole.
- Come Gate prepara oggi le offerte con più servizi: un prezzo unico o una riga per servizio, un contratto o più contratti.
- Ore libere reali delle squadre e da quando sono disponibili, per l'avviso di capacità per data.
- Canali reali da cui arrivano le richieste. Oggi i dati fittizi danno molto peso a sito e LinkedIn, mentre Alfredo dice telefono e incontri.
- Tempi di partenza misurati (minuti per annotare una richiesta, preparare un'offerta, preparare il report), al posto delle stime.

Screenshot pronti per il deck (docs/screenshot/)
- oggi-desktop.png, oggi-mobile.png (Oggi)
- trattativa-desktop.png, trattativa-mobile.png (Scheda della trattativa)
- cruscotto-desktop.png, cruscotto-mobile.png (Cruscotto)
- nota-desktop.png, nota-mobile.png (Richiesta da nota)
- documenti-desktop.png, clienti-desktop.png

Dubbi aperti
1. I quattro numeri del cruscotto (contratti, conversione delle offerte, prima risposta, ricavi attesi) sono quelli giusti per Alfredo?
2. L'offerta unica con più servizi: dopo l'incontro del 29/10.
3. Correggiamo i pesi dei canali nei dati fittizi per avvicinarli a quello che dice Gate?
4. La vista del cliente per firmare l'offerta (schermata 10) la facciamo prima della demo?
--- FINE RITORNO ---
