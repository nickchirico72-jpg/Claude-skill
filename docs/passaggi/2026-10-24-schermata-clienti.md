--- PASSAGGIO A CLAUDE CODE ---
Titolo: nuova schermata Clienti (elenco + scheda dell'azienda nella stessa pagina)
Riferimento visivo: tavola «Clienti» del canvas https://claude.ai/artifact/6Cc8bFcQLmUNpmy6Rq6S9x; sorgente in docs/design/gestionale/Clienti.dc.html (solo riferimento: non copiarla, il formato .dc.html non è HTML dell'app).
File da toccare: js/clienti.js (schermata), css/stile.css, prove/e2e.js, README, docs/screenshot/.

## User story
Come commerciale voglio trovare un'azienda e vedere in una sola pagina referenti, trattative, prossima azione e cronologia, per sapere subito cosa fare con quel cliente.

## Criteri di accettazione
Intestazione
- Titolo «Clienti» e una riga: «Scegli un'azienda: a destra trovi referenti, trattative e la prossima azione.»
- In alto a destra «Nuova richiesta» (stessa funzione di oggi).

Elenco (colonna sinistra; a 390 px sta sopra la scheda)
- Ricerca per nome o comune, che filtra mentre si scrive.
- Filtri: Tutti · In trattativa · Con contratto · Da sistemare (= ferme oltre la soglia della fase oppure senza prossima azione).
- Ogni riga è un pulsante con: nome, stato (In trattativa / Con contratto), comune e settore, prossima azione in breve colorata per urgenza (verde ok, arancione da sistemare, rosso in ritardo; sempre con testo).
- La riga scelta è evidenziata; all'apertura è scelta la prima della lista.
- Prime 30 righe, poi «Mostra le altre» (come oggi).
- Nessun risultato → «Nessun cliente trovato. Controlla il nome o registra una nuova richiesta.»

Scheda dell'azienda (colonna destra)
- Settore · comune, nome, etichette: stato, «Arrivato da: <canale>», «In archivio dal <data>».
- Riquadro «Prossima azione» con testo e UN solo pulsante (quello del passo successivo della trattativa aperta).
- Referenti: nome, ruolo, canale preferito, pulsanti Chiama / WhatsApp / Email (alti almeno 44 px), base giuridica della privacy; «Aggiungi referente» e «Modifica dati» restano disponibili (oggi ci sono: non toglierli).
- Trattative e contratti: codice e servizio (link alla scheda della richiesta), fase, punteggio di coerenza col colore pieno della fascia, valore annuo.
- «Registra un contatto»: tipo (Chiamata, WhatsApp, Email, Visita, Nota = CONFIG.tipiAttivita), testo; pulsante «Registra» attivo solo con testo; dopo il salvataggio, messaggio di conferma con l'ora e voce in cima alla cronologia. Passa da applica() (con Annulla).
- Cronologia dal più recente.
- «Dati dell'azienda e privacy» richiudibile, con «Cancella i dati personali di un referente» (funzione già presente: l'azienda e le trattative restano).

## Cosa sostituisce
L'attuale elenco Clienti + scheda cliente separata (#cliente-<id>) diventano un'unica vista elenco + dettaglio. Nessuna funzione si toglie: «Da fare» confluisce in «Prossima azione», «Registra un'attività» in «Registra un contatto», «Opportunità» in «Trattative e contratti».

## Indicatori collegati
K9 Trattative ferme (filtro «Da sistemare»), K11 Clienti adatti a Gate (punteggio), K12 Tempo di prima risposta (prossima azione in ritardo).

## Campi usati
cliente: nome, comune, settore, canale di origine, data di ingresso; referente: nome, ruolo, canale preferito, telefono, email, base giuridica e data; opportunità: codice, servizio, fase, punteggio, valore annuo, prossima azione e data; attività: tipo, testo, data e ora.

## Vincoli (da CLAUDE.md)
HTML, CSS e JS puro, script classici; ogni modifica da applica(); esc() su ogni valore salvato; niente alert/confirm/prompt; palette e font di css/stile.css; dati fittizi dichiarati solo nel piè di pagina.

## Prove
prove/e2e.js: ricerca, filtri, scelta di un cliente, registrazione di un contatto, cancellazione dei dati del referente. Zero errori in console; 1440x900 e 390x844 senza scorrimento orizzontale; screenshot clienti-desktop.png e clienti-mobile.png aggiornati; README aggiornato.
--- FINE PASSAGGIO ---
