# Archivio condiviso: requisiti e scelta della soluzione

Decisione del 21/10/2026: il vincolo "nessun backend" è tolto. Obiettivo: Alfredo e il suo team usano lo stesso CRM da PC e telefono, senza esportare fogli né fare backup ogni giorno. **La soluzione specifica non è ancora scelta**: questo documento raccoglie cosa deve garantire e come scegliere.

## Cosa deve garantire (requisiti)
1. **Dati condivisi in tempo reale**: una richiesta annotata dal telefono si vede subito dal PC di un collega.
2. **Più persone insieme senza sovrascriversi**: si salva la singola modifica (un'opportunità, un'attività), non tutto l'archivio.
3. **Accesso con login e ruoli**: direzione, commerciale, ufficio; chi lascia l'azienda perde l'accesso.
4. **Nessun backup manuale**: backup automatici del fornitore o del server; l'export resta solo per casi straordinari.
5. **Privacy (GDPR)**: dati in Unione Europea, accordo sul trattamento con il fornitore, registro di chi modifica cosa, cancellazione su richiesta.
6. **Facile da usare da telefono** e anche con connessione debole.
7. **Stesse regole del prototipo**: fasi, punteggio A/B/C, KPI del catalogo (K1-K17), preventivo, allocazione.
8. **Manutenzione sostenibile per una PMI** senza un reparto informatico.
9. **Costi chiari** dopo il pilota.

## Le soluzioni in valutazione
| Soluzione | In breve | Quando conviene |
|---|---|---|
| Database online pronto (es. Supabase, PostgreSQL in UE) | Le pagine attuali leggono e scrivono in un database con login; stesso schema di `gate.db` | Se si vuole tenere il prototipo e lo schema SQL, con poca manutenzione |
| Google Fogli + script | Ogni tabella è un foglio; uno script fa da tramite | Se Gate lavora già con Google e i volumi sono piccoli |
| Microsoft 365 (SharePoint, Power Apps) | I dati nell'account aziendale di Gate | Se Gate usa già Microsoft 365; si collega a Power BI |
| Server proprio (Python + MySQL) | Applicazione nostra su un hosting | Se serve il massimo controllo e qualcuno può mantenerla |
| CRM sul mercato (HubSpot, Zoho, Pipedrive) | Si configura con le nostre regole; il prototipo diventa la specifica | Se Gate vuole zero manutenzione e accetta i limiti di personalizzazione |

## Da chiedere ad Alfredo prima di scegliere
- Gate lavora con Google o con Microsoft 365? Ha già un gestionale o un CRM?
- Quante persone userebbero il CRM, con quali ruoli e da quali dispositivi?
- Chi, in azienda, potrebbe occuparsi di utenti e permessi?
- Quanto è disposto a spendere al mese dopo il pilota?
- Il consulente privacy di Gate ha requisiti particolari (dove stanno i dati, chi vi accede)?

## Cosa resta valido qualunque sia la scelta
- Le schermate, il lessico di Gate e le regole già costruite (punteggio, KPI, preventivo, allocazione).
- Lo schema del database (`data/gate.db`, `data/gate_mysql.sql`) e il catalogo dei KPI.
- La versione statica attuale, per la demo e per GitHub Pages.
- Nel codice, il caricamento e il salvataggio passano già da pochi punti (`carica()`, `salva()`, `applica()` in `js/dati.js` e `js/app.js`): lì si collegherà l'archivio condiviso.
