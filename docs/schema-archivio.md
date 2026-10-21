# Schema dell'archivio condiviso (bozza, valida per qualunque soluzione)

Oggi esistono due forme degli stessi dati:
- il **database** (`data/gate.db`, 13 tabelle), da cui nascono le query SQL;
- lo **stato dell'app** (JSON nel browser), che il database riempie all'avvio, ma che non riscrive nel database.

Con un archivio condiviso deve esserci **una sola forma**: l'app legge e scrive direttamente le tabelle. Questa bozza dice cosa aggiungere al database perché contenga tutto quello che l'app oggi tiene solo nel browser. Le colonne dello schema v0 non cambiano, quindi le query di Nicolò continuano a funzionare.

## Corrispondenze tra app e tabelle
| Nell'app | Tabella | Già nel database | Da aggiungere |
|---|---|---|---|
| aziende | clienti | nome, settore, comune, provincia, km, superficie, tipo | partita_iva, note, fonte (canale del primo contatto), creata_il |
| referenti | referenti | nome, ruolo, decisore, email, telefono, base_giuridica, modo_raccolta | canale_preferito, data_privacy, opposizione, cancellato |
| opportunita | opportunita + storico_fasi | canale, servizio, fase, valore, margine, date, motivo, punteggio, campi TO-BE | comune_lavoro, ore_mese, tariffa, note, scadenza_offerta, data_avvio, motivazione_classe_c, riaperta_il |
| opportunita.preventivo | **preventivi** (nuova) | – | id_opp, tipo_ambiente, mq, frequenza, ore, tariffa, margine |
| opportunita.ricontatto | **ricontatti** (nuova) | – | id_opp, data, nota, fatto_il |
| opportunita.allocazione, proposte | **allocazioni**, **proposte_partner** (nuove) | – | id_opp, squadra o partner, data; id_opp, partner, data, esito |
| firma da link | offerte | firma_da_link | – |
| attivita (fatte e da fare) | attivita | tipo, data, esito | id_cliente, id_referente, testo, da_fare, ora, automatica, fase |
| contenuti, richieste reali | contenuti, richieste_reali | sì | id per le righe importate dall'app |
| registro delle modifiche | **registro** (nuova) | – | quando, utente, cosa, tabella, id_record |
| utente e ruolo | **utenti** (nuova) | commerciali (nome, tipo) | email, ruolo (direzione, commerciale, ufficio), attivo |

## Dati oggi scritti nel codice, che Alfredo deve poter cambiare da solo
Sono in `js/config.js` o in `generatore/parametri.py`: oggi solo chi programma può modificarli. Nell'archivio condiviso diventano tabelle, con una schermata "Impostazioni" visibile solo alla direzione.
- **squadre** (nome, caposquadra, zone, servizi, ore di capacità e già impegnate) e **partner** (tipo, zone, servizi, scadenza del DURC, telefono);
- **servizi** (tariffa, costo orario interno e partner), **preventivo** (rese in mq all'ora, sconti per frequenza);
- **soglie** (obiettivi dei KPI, pesi del punteggio, giorni oltre cui una trattativa è ferma);
- **canali** (già tabella) e **costi_canale** (oggi solo dati di prova).

## Regole per lavorare in più persone
- Si salva il singolo record cambiato, non tutto l'archivio: l'app lo sa già fare (`confrontaStati` in `js/archivio.js`).
- Ogni record ha `aggiornato_il` e `aggiornato_da`. Se due persone cambiano lo stesso record, il secondo salvataggio avvisa invece di sovrascrivere.
- Gli id diventano generati dall'archivio (oggi: "op12", "c5", "at10001").
- Le date restano vere: niente spostamento a "oggi", che oggi serve solo alla demo con i dati di prova.
