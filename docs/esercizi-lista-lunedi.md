# Esercizi SQL per la lista del lunedì (PASSAGGIO 4, N4.4)

Le query le scrivi tu su `data/gate.db` (DB Browser for SQLite o qui in chat). Qui trovi la domanda, le tabelle, i campi e il valore atteso sui dati fittizi, ma non la soluzione: se la query è sbagliata ti do un indizio, la soluzione completa solo se scrivi «soluzione».
I valori attesi li ricalcola `python3 generatore/controlla_dati.py` (sezione «Lista del lunedì»).

## Esercizio 1 · K9 Trattative ferme
- **Domanda di business:** quali trattative aperte sono ferme da più giorni di quanti ne prevede la loro fase, e vanno riprese questa settimana?
- **KPI:** K9 in `docs/kpi.md`: aperte con giorni dall'ultima modifica oltre `fasi.giorni_soglia`.
- **Tabelle:** `opportunita` (fase, data_ultima_modifica, valore_annuo, id_cliente) e `fasi` (fase, giorni_soglia); per il nome del cliente, `clienti`.
- **Data di riferimento:** 2026-10-19.
- **Risultato atteso:** **10 trattative**: contatto 4, qualificato 2, offerta 4. Ordinate dalla più ferma, oppure per valore annuo.
- **Concetti:** JOIN tra due tabelle su una colonna di testo, calcolo dei giorni tra due date (in SQLite `julianday`, in MySQL `DATEDIFF`), condizione che confronta due colonne.
- **Nella lista del lunedì dell'app** le trattative ferme sono 6, non 10: le 4 offerte ferme finiscono nella sezione «Offerte senza esito», perché ogni trattativa compare una sola volta.

## Esercizio 2 · Richieste senza prima risposta
- **Domanda di business:** quali richieste aspettano ancora la prima risposta di Gate da più di un giorno?
- **KPI:** K12 (soglia: entro 1 giorno lavorativo).
- **Tabelle:** `opportunita` (data_contatto, data_prima_risposta, fase) e, per la versione «fotografia a una data», `storico_fasi` (fase, data_ingresso).
- **Data di riferimento:** **2026-10-13**. Al 19/10 il risultato è 0, perché l'ultima richiesta dei dati fittizi è del 14/10 e a quella data hanno avuto tutte risposta.
- **Regola:** una richiesta conta se è arrivata entro il 13/10, se a quella data non era ancora né persa né firmata, se la prima risposta manca o arriva dal 13/10 in poi («ancora senza risposta la mattina del 13») e se dalla richiesta sono passati più di 1 giorno.
- **Risultato atteso:** **6 richieste** contando i giorni di calendario (più di 1). L'app conta i giorni lavorativi e trova le stesse 6.
- **Due livelli:**
  - **semplice:** usa la fase attuale (`fase NOT IN ('contratto', 'perso')`) invece della fotografia al 13/10: il risultato è **4**;
  - **completo:** controlla in `storico_fasi` che la trattativa non fosse già persa o firmata entro il 13/10 (sottoquery con NOT EXISTS, oppure LEFT JOIN): il risultato è **6**.
- **Concetti:** condizione con IS NULL, OR tra parentesi, sottoquery correlata (NOT EXISTS) o LEFT JOIN, perché la «fotografia a una data» è diversa dallo stato di oggi.
