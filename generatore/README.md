# Generatore del database di prova

> **Dati fittizi.** Clienti, referenti, commerciali, opportunità, offerte, attività e costi sono inventati ("Studio Alfa", "Commerciale 1", "Intermediario Delta"). Servono a provare il metodo di misura dei KPI prima di inserire i dati veri di Gate.

**Uso** (Python 3, solo libreria standard):
```
python3 generatore/genera_dati.py        # data/gate.db, data/csv/, data/gate_mysql.sql, js/dizionari.js, js/dati-db.js, docs/kpi.md
python3 generatore/controlla_dati.py     # conteggi, coerenza, criteri A1-A4, ipotesi H1-H5, valori attesi K12-K17
python3 generatore/importa_richieste.py FILE.csv [--voti VOTI.csv]   # dati veri nella tabella richieste_reali
```
Con lo stesso seme i dati sono sempre identici. La tabella `richieste_reali` viene conservata quando si rigenera il database.

**File:**
- `parametri.py`: tutte le ipotesi e i **dizionari condivisi con l'app**. Contiene:
  - seme, data di riferimento e crescita dei contatti (H5);
  - volumi;
  - settori, province, comuni con km e zona;
  - servizi con tariffe e margini;
  - canali (dizionario unico con tipo e stato attivo) e contenuti di prova;
  - fasi e probabilità di passaggio per canale (H1, H6);
  - effetto LinkedIn negli uffici (H2), effetto del punteggio (H3), margine per canale (H4);
  - ritardo della prima risposta (ipotesi AS-IS);
  - costi mensili, pesi del punteggio, anomalie.
- `kpi_catalogo.py`: i 17 KPI del catalogo; da qui nascono la tabella `kpi_catalogo` e `docs/kpi.md`.
- `genera_dati.py`: crea le tabelle e i dati.
- `esporta.py`: scrive la copia per MySQL e i file letti dall'app.
- `importa_richieste.py`: importa e controlla i CSV della fotografia di partenza e del test.
- `controlla_dati.py`: i controlli. Deve finire con "tutti i controlli superati".

Le ipotesi inserite apposta sono descritte in `docs/dati-generati.md`.
