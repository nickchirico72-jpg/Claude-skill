# Dati generati: ipotesi inserite apposta

Database di prova creato da `generatore/genera_dati.py` (seme 20261019, data di riferimento 19/10/2026), rifatto con il PASSAGGIO 3 del 20/10/2026. **Tutti i dati sono fittizi.** Le ipotesi qui sotto sono inserite di proposito: se una query le ritrova, la query funziona; se non le ritrova, probabilmente è sbagliata. I numeri sono quelli del database generato (li ricalcola `generatore/controlla_dati.py`).

## Ipotesi H1-H6

| # | Ipotesi | Parametro in `parametri.py` | Dove si vede | Numeri sui dati |
|---|---|---|---|---|
| H1 | Il **passaparola converte in contratto** più di ogni altro canale | `PASSAGGIO_PER_CANALE` | conversione per canale (contratti ÷ chiuse) | passaparola 24,2%; portale gare 21,2%; LinkedIn 19,4%; sito web 9,5%; intermediario 6,5%; porta a porta 2,4% |
| H2 | Negli **uffici e commercio LinkedIn converte meglio del porta a porta** | `BOOST_LINKEDIN_UFFICI` | conversione per canale nel settore pilota | LinkedIn 7 su 28 chiuse (25,0%); porta a porta 1 su 27 (3,7%) |
| H3 | La **classe A chiude più spesso della classe C** | `EFFETTO_PUNTEGGIO` | conversione per classe di coerenza | A 18 su 107 (16,8%); B 11 su 99 (11,1%); C 0 su 11 (0%) |
| H4 | L'**intermediario ha il margine più basso** | `MARGINE_PER_CANALE` | margine medio per canale | intermediario 15,5%; porta a porta 18,0%; LinkedIn 19,0%; portale gare 19,1%; sito web 20,8%; passaparola 22,2% |
| H5 | I **nuovi contatti crescono di mese in mese** | `CRESCITA_CONTATTI` | contatti per mese | marzo 2, aprile 13, maggio 14, giugno 34, luglio 50, agosto 71, settembre 72, ottobre 44 (solo fino al 15) |
| H6 | Nella GDO il portale gare converte meno ma con margine più alto | **non inserita** | **test cieco** | il portale gare usa la media degli altri canali, in tutti i settori, senza variazione del margine: una differenza trovata è solo casuale (nella GDO ci sono poche opportunità da portale gare) |

> Le ipotesi H1-H5 sono **ipotesi del progetto di analisi**, inserite per rendere i KPI verificabili: non sono risultati su Gate. H6 serve a provare che il metodo sa anche **smentire** un'ipotesi.

## Pipeline aperta (A1)
- **83 opportunità aperte su 300**, il **96%** con il primo contatto dal 1° agosto 2026.
- Aperte per fase: contatto 6, qualificato 34, sopralluogo 13, offerta 30.
- Dei contatti di settembre e ottobre ancora aperti, il **68%** è in contatto, qualificato o sopralluogo. Su tutti i contatti di quei due mesi la quota è il 43%, perché 40 sono già persi.
- Tasso di chiusura sulle chiuse **13,4%** (29 contratti, 188 perse).
- **10 aperte ferme** oltre la soglia della propria fase: il 12% (K9).

## Campi del processo TO-BE (B)
- `data_prima_risposta`: per tutte le opportunità, 0-6 giorni dopo il contatto, **media 2,1 giorni** (118 su 300 entro un giorno). È un'**ipotesi AS-IS, da sostituire con la fotografia di partenza** (parametro `RITARDO_PRIMA_RISPOSTA`).
- `data_registrazione`: vuota (NULL) nei dati storici; si valorizza per le richieste del modulo e per i dati importati.
- `consenso_privacy` e `firma_da_link`: 0 nei dati storici. Diventano 1 con le richieste del modulo e con le offerte firmate da link nella demo.
- `campagna`, `contenuto`, `pagina_arrivo`: valorizzati sul 30% delle opportunità da sito web e LinkedIn (31 su 104), con 4 contenuti di prova. Distribuzione: prova-01 9, prova-02 14, prova-03 6, prova-04 2. **Nessun effetto inserito sui contenuti.**
- Tabella `canali`: 10 canali attivi; Facebook, Instagram e Google Ads sono spenti, con la nota "da confermare con Gate". Il generatore storico usa solo i 6 canali dello schema v0.

## Anomalie da pulire (volute)
- **Clienti doppi:** 4 clienti del pilota compaiono due volte con il nome scritto diversamente ("Agenzia Sigma" e "Agenzia Sigma S.r.l.", "Studio Legale Tau srl", "Negozio Sigma" con spazi in fondo, "Negozio Beta (sede)").
- **Campi vuoti (NULL):** 6 referenti senza email, 9 senza telefono, 6 clienti senza superficie, 7 opportunità senza ore stimate.
- **Opportunità ferme:** vedi sopra (K9).

## Come sono costruiti i dati (in breve)
- **Le date.** I contatti si concentrano verso la fine del periodo (H5). Ogni opportunità parte da "contatto" e prova a passare le fasi una alla volta. La probabilità dipende dal canale (H1), dal punteggio (H3) e da LinkedIn negli uffici (H2). I tempi in ogni fase non superano la soglia della fase.
- **Le perdite.** Una trattativa che non passa si registra come persa solo dopo essere rimasta ferma oltre la soglia, con un motivo tipico della fase. Per questo molte trattative recenti sono ancora aperte. Quelle ferme in eccesso vengono chiuse come perse: ne resta ferma solo la quota voluta.
- **Il punteggio di coerenza.** Si calcola con le stesse regole dell'app, criterio per criterio. La capacità è simulata ed è esportata all'app, quindi app e database danno lo stesso punteggio per ogni opportunità.
- **Offerte e attività.** Le offerte esistono solo per chi arriva in fase offerta, a volte in due versioni. Ogni passaggio ha un'attività, ogni ingresso in sopralluogo un'attività di sopralluogo.
- **I campi vuoti** sono NULL in tutto il database, come nella copia per MySQL.
