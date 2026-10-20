--- RITORNO DA CLAUDE CODE ---
Sprint: 1 · modifiche 1, 3 e 4 al prototipo (la 2 è stata scartata)

**Modifica 1 – Canale e date della richiesta: fatta**
- **Cosa è cambiato**
  - **Il modulo "Nuovo contatto"** ha un riquadro "La richiesta" con canale e data della richiesta, entrambi obbligatori: senza, il modulo non si salva e dice cosa manca. La data di annotazione è già compilata con oggi e si può modificare; la data della prima risposta è facoltativa. Queste ultime due stanno in un riquadro che si apre a richiesta, per non affollare il modulo.
  - **La data dell'offerta** si corregge da "Modifica opportunità", dove si cambiano anche canale e date. L'offerta si registra comunque con il passo "Offerta inviata".
  - **I canali.** Restano i canali del database, a cui ho aggiunto telefono ed email: 15 in tutto, di cui 12 attivi. Ogni canale appartiene a uno dei 7 gruppi che hai indicato (sito, LinkedIn, telefono, email, passaparola, portale/gara, altro). Canali e gruppi sono definiti in un solo punto e usati da modulo, dashboard e import.
  - **Il CSV a 7 colonne** si esporta e si importa direttamente dagli Indicatori. Le colonne sono data richiesta, data annotazione, canale, settore, data risposta, data offerta, esito. L'import controlla ogni riga e dice quali scarta e perché. Le righe importate restano in un elenco a parte, non entrano nella Pipeline.
  - Lo stesso CSV si importa anche nel database con lo script.
  - **Prova automatica:** importato un CSV di 12 righe, le 12 righe compaiono nell'elenco e i KPI si ricalcolano.
- **File e funzioni**
  - `generatore/parametri.py`: CANALI_DIZIONARIO e GRUPPI_CANALI.
  - `js/dati.js`: gruppoCanale, canaleDaTesto, opzioniCanali.
  - `js/app.js`: apriNuovoContatto, leggiModulo, erroreDateRichiesta, apriModificaOpportunita, salvaModificaOpportunita.
  - `js/indicatori.js`: esportaCsvRichieste, analizzaCsvReali, confermaCsvReali.
  - `js/kpi.js`: righeReali.
  - `generatore/importa_richieste.py`: accetta i gruppi e "data_annotazione".
- **Fuori**
  - Il filtro per canale nell'elenco Clienti: non l'ho aggiunto per non affollare la schermata; si filtra dagli Indicatori.
  - La data dell'offerta non si inserisce alla creazione, perché l'offerta arriva più avanti nel percorso.

**Modifica 3 – "Da ricontattare" e preventivo: fatta**
- **Cosa è cambiato**
  - **"Da ricontattare"** si segna dal dettaglio dell'opportunità ed è un'etichetta sulla fase attuale, quindi il funnel non cambia. La data è obbligatoria: senza, il salvataggio è bloccato con un messaggio.
  - **Quando la data arriva**, la trattativa compare in cima a "Da seguire" nella Pipeline, con l'etichetta rossa anche sulla scheda. Il pulsante "Ricontattato" la toglie e lascia la chiamata nella cronologia.
  - **Il preventivo** parte da metri quadri, frequenza settimanale, tipo di servizio e tipo di ambiente. 200 mq × 3 volte a settimana danno 17 ore al mese, prezzo annuo e margine stimato.
  - **È sempre indicato come stima**: "È una stima, non un'offerta". La tariffa si può cambiare nel modulo; le tariffe standard sono in un solo punto di configurazione.
  - **La classe A/B/C** compare accanto all'offerta: sulla scheda, nella finestra "Offerta inviata" e in quella della firma da link.
- **File e funzioni**
  - `js/app.js`: apriRicontatto, salvaRicontatto, ricontattato, rigaRicontatto, riquadroPreventivo, apriFirmaLink.
  - `js/kpi.js`: ricontattoScaduto.
  - `js/clienti.js`: trattativeDaSeguire.
  - `js/config.js`: le frequenze, ora da 1 a 6 volte a settimana.
- **Fuori:** i promemoria sul telefono o per email, che sono una funzione del CRM vero.

**Modifica 4 – Dashboard a tre livelli: fatta**
- **Cosa è cambiato**
  - **Direzione:** K1, K3, K6 e K4, con il costo di acquisizione per ognuno dei 7 gruppi di canale.
  - **Commerciale:** K9 con le trattative più ferme, i ricontatti con la data scaduta, i prossimi passi in agenda e i consigli.
  - **Operativo e adozione:** K12, K13, K14 (soglia 80%), K15 e K16.
  - **Altri indicatori:** K2, K5, K7, K8, K10, K11 e K17, funnel, matrice canale × classe, contenuti, settori e previsione.
  - **Ogni KPI** ha il codice del catalogo e una riga che spiega la formula in parole. La formula tecnica e il processo APQC stanno in "Come si calcola", che si apre a richiesta.
  - **Dati vuoti.** Quando i dati mancano compare "nessun dato", mai zero. Con il CSV di prova, per esempio, K13 vale "nessun dato" perché non ci sono date di offerta.
  - **Dati reali.** Sulla fotografia di partenza e sul test i numeri si ricalcolano dal CSV importato. Ogni vista elenca i KPI che con quelle 7 colonne non si possono calcolare e dice quali dati servirebbero.
- **File e funzioni**
  - `js/indicatori.js`: LIVELLI, tesseraKpi, vistaFittizi, vistaReali, risultatiPerGruppo.
  - `generatore/kpi_catalogo.py`: la nuova colonna "spiegazione".

**Pulizia del prototipo (tua richiesta: niente affollamento)**
- **Pipeline.** Tolto il riquadro dei consigli, che ora sta negli Indicatori: sopra il tabellone restano solo "Da fare oggi" e "Da seguire". Nei dati di esempio ci sono meno promemoria in ritardo: 16 invece di 35.
- **Indicatori.** Tolta la legenda delle quattro domande, già indicata in ogni sezione. Formule tecniche richiudibili e pulsanti dei CSV più leggeri.
- **Allocazione.** La previsione mostra solo le zone delle squadre; le altre sono riassunte in una riga.
- **Prove automatiche:** 78 su 78 superate su computer (1440×900) e telefono (390×844), senza errori.

**Screenshot per il deck (in `docs/screenshot/`)**
- Indicatori:
  - `indicatori-desktop.png` (Direzione);
  - `indicatori-commerciale-desktop.png`;
  - `indicatori-operativo-desktop.png`;
  - `indicatori-altri-desktop.png`;
  - le stesse viste da telefono.
- `preventivo-desktop.png` (stima e classe), `pipeline-desktop.png`, `firma-da-link-desktop.png`.

**Dubbi sui dati**
1. **Gruppo dei canali minori.** Intermediario, porta a porta e contatto diretto finiscono nel gruppo "altro". Se il porta a porta deve restare visibile da solo nella dashboard, serve un ottavo gruppo.
2. **WhatsApp Business** è nel gruppo "telefono" ma conta come canale digitale nel KPI K15: va confermato.
3. **K4 per i gruppi telefono ed email** vale "nessun dato", perché il database non ha costi per quei canali. Servono i costi reali.
4. **Data di annotazione nei dati storici:** è vuota, quindi K14 si calcola solo sulle richieste nuove e sui dati reali.
--- FINE RITORNO ---
