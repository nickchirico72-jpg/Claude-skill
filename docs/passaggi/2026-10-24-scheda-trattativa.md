--- PASSAGGIO A CLAUDE CODE ---
Titolo: Scheda della trattativa (pagina intera al posto della finestra di dettaglio)
Riferimento visivo: tavola «Scheda della richiesta» del canvas https://claude.ai/artifact/6Cc8bFcQLmUNpmy6Rq6S9x; sorgente in docs/design/gestionale/Richiesta.dc.html (solo riferimento: non copiarla, il formato .dc.html non è HTML dell'app).

## User story
Come commerciale voglio aprire una trattativa e vedere a che punto è, con un solo pulsante per il passo successivo, per non lasciarla ferma.

## Dove intervenire
- Nuova schermata `#trattativa-<id>`: funzione `disegnaTrattativa(id)` in js/app.js (accanto alla Pipeline), registrata in `SCHERMATE` e in `schermataAttuale()` con `menu: "pipeline"`; titolo della scheda del browser = nome del cliente.
- L'azione `dettaglio` (nome della scheda in Pipeline, codice nella tabella opportunità di js/clienti.js) porta a `#trattativa-<id>` invece di aprire `apriDettaglio()`.
- `apriDettaglio()` si toglie solo dopo aver portato nella pagina TUTTO ciò che contiene (vedi «Da conservare»).
- Stile in css/stile.css riusando le classi esistenti: `link-indietro`, `intestazione()`, `riquadro`, `sezione`, `riga-chip`, `chip-*`, `scheda-cliente` / `colonna-scheda` (due colonne da 1100 px), `cronologia`, `badgePunteggio(p, true)`.

## Contenuto della pagina
1. «← Pipeline» (o la schermata di provenienza, come in disegnaSchedaCliente).
2. Intestazione: occhiello «settore · comune · rif. codice»; titolo = nome del cliente + punteggio di coerenza grande; se persa, chip «Persa · motivo». Istruzione: «Un passo alla volta: il pulsante blu indica sempre il prossimo.»
3. Avanzamento in 4 passi (elenco ordinato, `aria-current="step"` sul passo attuale), ognuno fatto / adesso / da fare con la data sotto:
   - Richiesta = fasi contatto + qualificato (data: `storico.contatto`)
   - Sopralluogo (data fatta `storico.sopralluogo`, oppure quella fissata da `sopralluogoFissato(o)`)
   - Offerta (`storico.offerta`; sotto «valida fino al» `scadenzaOfferta`)
   - Firmato (`storico.contratto`)
   Passo attuale = `faseRaggiunta(o)` (0 contatto e 1 qualificato → passo Richiesta o Sopralluogo come sotto; 4 = tutti fatti). Nel database restano le 5 fasi: non cambiare generatore/parametri.py.
4. Riquadro «Prossimo passo» (bordo primario) con titolo, una riga e UN solo pulsante primario, scelto con la stessa logica di `schedaOpportunita()`:
   - contatto → `data-azione="avanza"`, testo `CONFIG.fasi[0].azione` («È qualificato»)
   - qualificato senza sopralluogo → `fissa-sopralluogo`; con sopralluogo fissato → `avanza` («Sopralluogo fatto»), titolo con giorno e ora
   - sopralluogo → link `#preventivo-<id>` «Prepara l'offerta»
   - offerta → `avanza` («Contratto firmato»); «Firma da link» (`firma-link`) come pulsante secondario, nota: «Se firma dal link si segna da solo»
   - contratto senza allocazione → `assegna-squadra` se `squadraDisponibile()`, altrimenti link `#allocazione`; con allocazione → messaggio di conferma (squadra o partner, avvio `o.avvio`)
   - sotto il pulsante: la prossima azione e l'eventuale «Ferma da N giorni» (riusare `rigaStatoTrattativa(o)` e `rigaRicontatto(o)`)
   - link testuale «Segna come persa» (`perso`: la finestra esistente con motivo obbligatorio va bene)
   - se persa: al posto del riquadro, avviso con data e motivo, rimedio `CONFIG.rimediPerdita[motivo]` e pulsante «Riapri la trattativa» (`riapri`)
5. Colonna principale:
   - «Il servizio»: servizio, valore annuo e margine stimato (chip con il tono di schedaOpportunita), ore al mese; se c'è `o.preventivo`: pacchetto, metri quadri, ambienti, frequenza; se non c'è e la fase è prima dell'offerta: «Il preventivo si prepara dopo il sopralluogo». Note della trattativa (`o.note`).
   - «Cronologia»: attività svolte dell'azienda (`attivitaDi(o.aziendaId)`, non da fare), dalla più recente, stesso markup di disegnaSchedaCliente; le prime 8 + link «Tutta la cronologia» a `#cliente-<aziendaId>`.
6. Colonna laterale:
   - Referente (`trovaReferente(o.referenteId)`): nome, ruolo, `pulsantiContatto(ref)`, `chipPrivacy(ref)`, «Cancella i dati personali del referente» (azione esistente `cancella-dati`). Senza referente: «Referente non indicato» + link alla scheda cliente.
   - «La richiesta»: canale (e contenuto/campagna se ci sono), comune e zona (`infoComune`), data richiesta, data di annotazione (`dataRegistrazione`), prima risposta (`dataPrimaRisposta`, verde se entro `CONFIG.obiettivi.primaRispostaGiorni`), firmata da link sì/no.
   - «Perché la coerenza è N» richiudibile con `tabellaCriteri(p)`.
   - «Chi la eseguirebbe»: `esecutorePrevisto()` con ore libere della squadra contro `o.ore`; stato con icona e testo (c'è posto / non basta, serve un partner).
   - «Correzioni» (in fondo, pulsanti secondari o testuali): Modifica (`modifica-opportunita`), Torna a «fase precedente» (`torna-indietro`, solo se `puoTornareIndietro`), Da ricontattare (`da-ricontattare`), Apri la scheda cliente.

## Da conservare (oggi nella finestra di dettaglio)
Dati e chip (canale, contenuto, campagna, firmata da link, preventivo), referente con contatti, note, punteggio con i 6 criteri, storico delle fasi con validità dell'offerta e avvio, perso con nota, motivazione dell'offerta con punteggio sotto 50 (`o.motivazioneC`), e le azioni Torna a, Riapri, Da ricontattare, Modifica, Preventivo, Scheda cliente.

## Comportamento
- Ogni azione passa dalle funzioni esistenti (e quindi da `applica()` con Annulla); dopo l'azione la pagina si ridisegna restando su `#trattativa-<id>` (oggi `salvaFase` porta all'allocazione quando firma: va bene).
- Ogni valore salvato passa da `esc()`. Niente alert/confirm/prompt.
- Id inesistente in `#trattativa-…` → Pipeline (come fa `#preventivo-`).
- Da telefono (390 px): una colonna, il riquadro «Prossimo passo» subito dopo l'avanzamento, pulsanti alti almeno 44 px, nessuno scorrimento orizzontale.

## Indicatori collegati
K5 Margine atteso, K8 Durata della trattativa, K9 Trattative ferme, K10 Motivi di perdita, K11 Clienti adatti a Gate, K12 Tempo di prima risposta, K13 Dalla richiesta all'offerta.

## Prove
- prove/e2e.js: oggi `ricontatto` e il flusso demo chiamano `apriDettaglio(i)`; vanno portati alla pagina (`location.hash = '#trattativa-' + i`) senza perdere i controlli.
- Nuovi controlli: dal nome in Pipeline si apre la pagina; il pulsante principale cambia nelle 5 fasi; «Segna come persa» chiede il motivo e mostra il rimedio; «Riapri» torna alla fase; «Torna a» funziona; Annulla dopo un'azione.
- Zero errori in console; 1440x900 e 390x844 senza scorrimento orizzontale; nuovi screenshot trattativa-desktop.png e trattativa-mobile.png in docs/screenshot/; README aggiornato.
--- FINE PASSAGGIO ---
