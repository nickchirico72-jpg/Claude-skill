# Esercizi K12-K17 (Sprint 1-2)

Per ogni KPI: la domanda di business, le tabelle e i campi che servono, il risultato atteso. **Le query le scrivi tu**; io le eseguo e ti dico se il numero torna. I valori attesi li ricalcola `python3 generatore/controlla_dati.py` (sezione "Valori attesi"). Definizioni in `docs/kpi.md`.

Le date sono testo `AAAA-MM-GG`: in SQLite i giorni tra due date sono `julianday(fine) - julianday(inizio)`, in MySQL `DATEDIFF(fine, inizio)`. I campi vuoti sono NULL.

## K12 Tempo di prima risposta (operativo, efficienza)
- **Domanda:** quanto velocemente risponde Gate a una nuova richiesta?
- **Tabelle e campi:** `opportunita` (data_contatto, data_prima_risposta).
- **Risultato atteso sui dati fittizi:** una riga, **2,1 giorni** di media su 300 opportunità. Variante: quante entro un giorno (118).
- **Sui dati reali** (`richieste_reali`, data_richiesta e data_risposta, per fonte): partenza 3,92 giorni, test 0,55 giorni. Sono le righe di esempio inventate.
- **Concetto da colloquio:** funzioni sulle date e AVG; la mediana non esiste in SQLite, la calcoliamo in Power BI.

## K13 Tempo dalla richiesta all'offerta (operativo, efficienza)
- **Domanda:** quanto tempo passa dalla richiesta all'offerta?
- **Tabelle e campi:** `opportunita` (id_opp, data_contatto) e `offerte` (id_opp, versione, data_invio). Conta solo la **prima versione** dell'offerta.
- **Risultato atteso:** **26,28 giorni** di media su 112 opportunità con offerta.
- **Sui dati reali:** partenza 19,43 giorni (7 richieste con offerta), test 7,4 giorni (5).
- **Concetto da colloquio:** JOIN tra due tabelle con un filtro sulla tabella collegata (versione = 1).

## K14 Richieste registrate entro 24 ore (operativo, adozione)
- **Domanda:** le richieste vengono annotate subito?
- **Tabelle e campi:** `opportunita` (data_contatto, data_registrazione); `richieste_reali` (data_richiesta, data_registrazione, fonte).
- **Risultato atteso sui dati fittizi:** nessuna riga con data_registrazione: il KPI vale **n.d.** È un buon test: la query deve gestire il denominatore zero senza errori.
- **Sui dati reali:** partenza 0 su 4 registrate, test 10 su 11.
- **Concetto da colloquio:** NULL, `IS NOT NULL`, divisione per zero (NULLIF).

## K15 Quota di richieste digitali (strategico, efficacia)
- **Domanda:** quante richieste arrivano dai canali digitali?
- **Tabelle e campi:** `opportunita` (canale) e `canali` (canale, tipo).
- **Risultato atteso:** **104 su 300 = 34,7%** (sito web e LinkedIn).
- **Sui dati reali:** partenza 2 su 12 (16,7%), test 9 su 11 (81,8%).
- **Concetto da colloquio:** JOIN con una tabella di dizionario (chiave esterna verso `canali.canale`); conteggio condizionale con CASE.

## K16 Offerte firmate da link (tattico, adozione)
- **Domanda:** quante offerte si firmano da link, senza carta?
- **Tabelle e campi:** `offerte` (id_opp, esito, firma_da_link) e `opportunita` (fase).
- **Risultato atteso:** **0 su 29 contratti = 0%**. La firma da link esiste solo nel flusso TO-BE della demo nell'app.
- **Concetto da colloquio:** COUNT(DISTINCT ...), perché un'opportunità può avere più versioni di offerta.

## K17 Facilità percepita (strategico, efficacia)
- **Domanda:** i clienti trovano facile chiedere un sopralluogo e firmare?
- **Tabelle e campi:** `richieste_reali` (fonte, voto_facilita).
- **Risultato atteso:** sui dati fittizi non c'è (n.d.). Sui dati reali di esempio: test **4,29** su 7 voti; partenza nessun voto.
- **Concetto da colloquio:** AVG ignora i NULL: la media è sui soli voti presenti, non su tutte le richieste.
