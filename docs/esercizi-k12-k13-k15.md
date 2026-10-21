# Esercizi K12, K13 e K15 (Sprint 1-2)

> K14, K16 e K17 sono stati tolti dal catalogo il 21/10/2026: i loro esercizi non servono più.

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

## K15 Quota di richieste digitali (strategico, efficacia)
- **Domanda:** quante richieste arrivano dai canali digitali?
- **Tabelle e campi:** `opportunita` (canale) e `canali` (canale, tipo).
- **Risultato atteso:** **104 su 300 = 34,7%** (sito web e LinkedIn).
- **Sui dati reali:** partenza 2 su 12 (16,7%), test 9 su 11 (81,8%).
- **Concetto da colloquio:** JOIN con una tabella di dizionario (chiave esterna verso `canali.canale`); conteggio condizionale con CASE.
