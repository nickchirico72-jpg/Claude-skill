# Dati generati: andamenti inseriti apposta

Database di prova creato da `generatore/genera_dati.py` (seme 20261019, data di riferimento 19/10/2026). **Tutti i dati sono fittizi.** Gli andamenti qui sotto sono stati inseriti di proposito: se una query li ritrova, la query funziona; se non li ritrova, probabilmente è sbagliata. I numeri sono quelli del database generato.

> Gli andamenti 1–5 sono ipotesi tecniche per rendere i KPI verificabili, **non decisioni di business**: vanno confermati o sostituiti con le ipotesi del progetto di analisi.

| # | Andamento | Dove si vede | Numeri attesi |
|---|---|---|---|
| 1 | Il **passaparola converte di più**, sito web e porta a porta meno | conversione per canale (K3, query 3) | passaparola 14 contratti su 53 (26%); sito web 3 su 47 (6%); porta a porta 6 su 72 (8%) |
| 2 | **LinkedIn converte meglio negli uffici e commercio** che negli altri settori | conversione per canale e settore | LinkedIn uffici 5 su 36 (14%) contro altri settori 1 su 18 (6%) |
| 3 | Il **punteggio A/B/C predice la chiusura** | conversione per classe (base del lead scoring, Sprint 5–6) | sulle trattative chiuse: A 24%, B 10%, C 0% |
| 4 | Il **portale gare ha margini più bassi**; l'**intermediario costa di più** | margine medio e CAC per canale (K4) | margine medio: gare 13%, passaparola 22%; CAC: passaparola 24 €, intermediario 1.786 € |
| 5 | I **nuovi contatti crescono nei mesi** (campagna del pilota) | contatti per mese | da 2 a gennaio fino a 55 ad agosto e settembre (ottobre parziale: 28) |
| 6 | Il **40% dei clienti** è nel settore pilota (uffici e commercio a BA) e riceve più opportunità | clienti per settore e provincia | 48 clienti su 120 |
| 7 | Il **12,5% delle opportunità aperte è ferma** oltre la soglia della sua fase (K9) | opportunità ferme | 5 aperte ferme su 40 |

## Anomalie da pulire (volute)
- **Clienti doppi**: 4 clienti del pilota compaiono due volte con il nome scritto diversamente (es. "Negozio Zeta" e "Negozio Zeta S.r.l.", uno con spazi in fondo, uno con "(sede)").
- **Campi vuoti**: 6 referenti senza email, 9 senza telefono, 4 clienti senza superficie, 10 opportunità senza ore stimate.
- **Opportunità ferme**: vedi andamento 7.

## Come sono costruiti i dati (in breve)
- Ogni opportunità parte da "contatto" alla data di contatto e prova a passare le fasi una alla volta; la probabilità dipende dal canale (andamento 1), dal punteggio (3) e da LinkedIn negli uffici (2). Se non passa, viene persa (con un motivo tipico della fase) oppure resta aperta.
- I tempi tra una fase e l'altra sono casuali entro intervalli realistici; nessun evento supera il 19/10/2026.
- Le trattative rimaste aperte ma ferme da troppo tempo vengono in gran parte chiuse come perse: ne resta ferma solo la quota dell'andamento 7.
- Offerte solo per chi arriva in fase offerta (a volte in due versioni); esito coerente con la fase finale. Un'attività per ogni passaggio di fase, un sopralluogo per ogni ingresso in sopralluogo, più alcuni solleciti tra un passaggio e l'altro.
- Commerciali: tre interni ("Commerciale 1–3") e un intermediario, che segue tutte le opportunità del canale intermediario.
