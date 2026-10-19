# Generatore del database di prova (Sprint 1)

> **Dati fittizi.** Clienti, referenti, commerciali, opportunità, offerte, attività e costi sono inventati ("Studio Alfa", "Commerciale 1", "Intermediario Delta"). Servono a provare il metodo di misura dei KPI prima di inserire i dati veri di Gate.

**Uso** (Python 3, solo libreria standard):
```
python3 generatore/genera_dati.py      # crea data/gate.db e data/csv/<tabella>.csv
python3 generatore/controlla_dati.py   # conteggi e controlli di coerenza
```
Con lo stesso seme i dati sono sempre identici. Il database si apre anche con **DB Browser for SQLite**.

**Parametri** (tutti in `generatore/parametri.py`):
- seme, data di riferimento (19/10/2026) e periodo dei contatti (1/1–15/10/2026);
- volumi: 120 clienti (40% uffici e commercio a BA), circa 180 referenti, 4 commerciali, 300 opportunità;
- valori ammessi: settori, province, servizi, canali, fasi, motivi di perdita;
- probabilità di passaggio tra fasi per canale, effetto del punteggio A/B/C, aumento di LinkedIn negli uffici;
- valori e margini per servizio (tariffa oraria, ore al mese, margine medio), variazione del margine per canale;
- costi mensili per canale;
- pesi e soglie del punteggio di coerenza (come nel prototipo; la capacità è simulata a caso fino allo Sprint 3);
- anomalie volute: clienti doppi, email e telefoni mancanti, superfici e ore vuote.

Gli andamenti inseriti apposta sono descritti in `docs/dati-generati.md`.
