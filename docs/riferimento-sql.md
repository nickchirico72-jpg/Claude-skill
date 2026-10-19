# SQL applicato a Gate e Miller Group (19/10/2026)

Livello di partenza: primi esercizi (SQLBolt, poi Kaggle). Tutte le query qui sotto sono state provate su SQLite con dati finti e funzionano. Usale come **traccia**: prima prova a scriverle da solo partendo dalla domanda di business, poi confronta.

## In breve

- **Gate:** SQL serve a calcolare i KPI del funnel commerciale che Gate chiede (conversione, CAC, opportunità ferme). È già previsto nel Prompt 1 per Claude Code (`prompt-gate-carriera.md`, sezioni 3–5): qui trovi le prime 5 query pronte da confrontare.
- **Miller Group:** SQL serve a trasformare le fatture sintetiche del CEO in segnali di bancabilità: fatturato mensile, giorni medi di incasso, crediti scaduti, regolarità dei riordini, confronto tra nicchie di clienti.
- **Ordine consigliato:** Gate subito (i dati fittizi li generi tu, scadenza SQL a metà novembre), Miller appena arrivano i dati del CEO. Le query Miller sono quasi le stesse di Gate con altre tabelle, quindi il secondo progetto ti costerà la metà.
- **Strumento:** SQLite con **DB Browser for SQLite** (gratuito, sqlitebrowser.org). Un database è un solo file, niente server da installare. Poi esporti le tabelle dei risultati in CSV e le importi in Power BI.
- **CV:** dopo questi due progetti SQL entra nel CV con una prova concreta ("query KPI su funnel commerciale e su dati di fatturazione").

---

## Lo strumento in 4 passaggi

1. Installa DB Browser for SQLite e crea un nuovo database (`gate.db` oppure `miller.db`).
2. Crea le tabelle: scheda **Execute SQL**, incolla i `CREATE TABLE` qui sotto, premi ▶.
3. Carica i dati: **File → Import → Table from CSV file** (i CSV li produce il generatore di Claude Code per Gate, o arrivano da Miller).
4. Scrivi le query nella scheda **Execute SQL**. Quando una query dà il risultato giusto, salvala come vista (`CREATE VIEW kpi_conversione AS SELECT ...`): Power BI leggerà le viste.

**Collegare Power BI.** La via semplice: in DB Browser, **File → Export → Table(s) as CSV** (le viste compaiono tra le tabelle), poi in Power BI **Recupera dati → Testo/CSV**. La via più professionale, da provare dopo: installare il driver ODBC per SQLite e in Power BI scegliere **Recupera dati → ODBC**, così la dashboard si aggiorna senza riesportare. Per il PL-300 conta saper fare il modello e il DAX in Power BI; SQL prepara dati puliti a monte.

---

## 1. Gate srl: KPI del funnel commerciale

### Tabelle (versione semplice dello schema a stella)

```sql
CREATE TABLE clienti (
  id_cliente INTEGER PRIMARY KEY,
  nome TEXT,
  settore TEXT,        -- GDO, sanità, trasporti, uffici, industria, ricettivo
  provincia TEXT       -- BA, LE, TA, FG, BR, BT
);

CREATE TABLE commerciali (
  id_commerciale INTEGER PRIMARY KEY,
  nome TEXT
);

CREATE TABLE opportunita (
  id_opp INTEGER PRIMARY KEY,
  id_cliente INTEGER REFERENCES clienti(id_cliente),
  id_commerciale INTEGER REFERENCES commerciali(id_commerciale),
  canale TEXT,         -- gare online, porta a porta, intermediari, sito, LinkedIn
  servizio TEXT,       -- cleaning, logistica, servizi alle strutture
  fase TEXT,           -- contatto, qualificato, sopralluogo, offerta, contratto, perso
  valore_annuo REAL,
  margine_pct REAL,
  data_contatto TEXT,          -- formato 'AAAA-MM-GG'
  data_ultima_modifica TEXT
);

CREATE TABLE costi_canale (
  canale TEXT,
  mese TEXT,           -- 'AAAA-MM'
  costo REAL
);
```

Frase da colloquio: "Ho separato clienti e commerciali dalle opportunità per non ripetere gli stessi dati in ogni riga: è la normalizzazione, e le colonne `id_...` sono le chiavi esterne che le collegano."

### Query, dalla più facile alla più difficile

**1. Quali opportunità sono ancora aperte, per settore?** (SELECT, JOIN, WHERE, ORDER BY)
```sql
SELECT o.id_opp, c.nome AS cliente, c.settore, o.fase, o.valore_annuo
FROM opportunita o
JOIN clienti c ON c.id_cliente = o.id_cliente
WHERE o.fase NOT IN ('contratto', 'perso')
ORDER BY c.settore, o.valore_annuo DESC;
```

**2. Quante opportunità ci sono in ogni fase del funnel, e quanto valgono?** (GROUP BY)
```sql
SELECT fase, COUNT(*) AS n_opportunita, SUM(valore_annuo) AS valore_totale
FROM opportunita
GROUP BY fase
ORDER BY n_opportunita DESC;
```

**3. Quale canale converte meglio in contratti?** (CASE dentro SUM: il trucco per contare solo alcune righe)
```sql
SELECT canale,
       COUNT(*) AS opportunita,
       SUM(CASE WHEN fase = 'contratto' THEN 1 ELSE 0 END) AS contratti,
       ROUND(100.0 * SUM(CASE WHEN fase = 'contratto' THEN 1 ELSE 0 END) / COUNT(*), 1) AS conversione_pct
FROM opportunita
GROUP BY canale;
```
Nota: `100.0` e non `100`, altrimenti SQLite fa la divisione tra numeri interi e restituisce 0.

**4. Quanto costa acquisire un cliente, per canale (CAC)?** (sottoquery unite con JOIN)
```sql
SELECT k.canale,
       k.costo_totale,
       v.contratti,
       ROUND(k.costo_totale / v.contratti, 0) AS cac
FROM (SELECT canale, SUM(costo) AS costo_totale FROM costi_canale GROUP BY canale) AS k
JOIN (SELECT canale, COUNT(*) AS contratti FROM opportunita WHERE fase = 'contratto' GROUP BY canale) AS v
  ON v.canale = k.canale;
```

**5. Quali opportunità sono ferme da oltre 30 giorni, e chi deve sollecitarle?** (date, JOIN su tre tabelle)
```sql
SELECT o.id_opp, c.nome AS cliente, m.nome AS commerciale, o.fase,
       CAST(julianday('now') - julianday(o.data_ultima_modifica) AS INTEGER) AS giorni_ferma
FROM opportunita o
JOIN clienti c ON c.id_cliente = o.id_cliente
JOIN commerciali m ON m.id_commerciale = o.id_commerciale
WHERE o.fase NOT IN ('contratto', 'perso')
  AND julianday('now') - julianday(o.data_ultima_modifica) > 30
ORDER BY giorni_ferma DESC;
```
Questa è anche la base dell'automazione "avviso settimanale" del TO-BE.

I passi successivi (pipeline ponderata, tempo medio in ogni fase con CTE e funzioni finestra) sono nel Prompt 1, sezione 4: li fai in Claude Code in modalità tutor.

**In Power BI:** viste 2, 3 e 4 → grafico a imbuto del funnel, barre conversione e CAC per canale; vista 5 → tabella "da sollecitare" filtrabile per commerciale (è anche il punto giusto per provare la sicurezza a livello di riga, ogni commerciale vede solo le sue).

---

## 2. Miller Group: dalle fatture alla bancabilità

L'idea è prevedere la cassa di una PMI dal comportamento dei suoi clienti. Con SQL dimostri il **metodo** sui dati sintetici del CEO: quali numeri una banca vorrebbe vedere e come si calcolano dalle fatture. Lo schema sotto è una proposta: quando arrivano i dati di Miller, adattalo alle colonne che ci sono davvero.

### Tabelle (settore campione: ingrosso B2B)

```sql
CREATE TABLE aziende (           -- le PMI clienti di Miller (es. distributori)
  id_azienda INTEGER PRIMARY KEY,
  ragione_sociale TEXT,
  ateco TEXT,                    -- es. '46.34'
  provincia TEXT
);

CREATE TABLE clienti (           -- i clienti delle PMI (ristoranti, bar, hotel...)
  id_cliente INTEGER PRIMARY KEY,
  id_azienda INTEGER REFERENCES aziende(id_azienda),
  ateco_cliente TEXT,            -- es. '56.10' ristorazione
  tipo_cliente TEXT              -- la "nicchia" dell'hub
);

CREATE TABLE fatture (
  id_fattura INTEGER PRIMARY KEY,
  id_azienda INTEGER REFERENCES aziende(id_azienda),
  id_cliente INTEGER REFERENCES clienti(id_cliente),
  data_fattura TEXT,
  data_scadenza TEXT,
  importo REAL
);

CREATE TABLE incassi (
  id_incasso INTEGER PRIMARY KEY,
  id_fattura INTEGER REFERENCES fatture(id_fattura),
  data_incasso TEXT,
  importo REAL
);
```

### Query

**1. Come va il fatturato mese per mese?** (date + GROUP BY: la base di ogni previsione)
```sql
SELECT id_azienda, strftime('%Y-%m', data_fattura) AS mese, SUM(importo) AS fatturato
FROM fatture
GROUP BY id_azienda, mese
ORDER BY id_azienda, mese;
```

**2. L'azienda dipende da pochi clienti?** (concentrazione: una banca la guarda sempre)
```sql
SELECT id_cliente, SUM(importo) AS fatturato
FROM fatture
WHERE id_azienda = 1
GROUP BY id_cliente
ORDER BY fatturato DESC
LIMIT 5;
```

**3. Dopo quanti giorni pagano i clienti, e con quanto ritardo?** (JOIN fatture–incassi, differenza tra date)
```sql
SELECT f.id_cliente,
       COUNT(*) AS fatture_pagate,
       ROUND(AVG(julianday(i.data_incasso) - julianday(f.data_fattura)), 0) AS giorni_medi_incasso,
       ROUND(AVG(julianday(i.data_incasso) - julianday(f.data_scadenza)), 0) AS ritardo_medio
FROM fatture f
JOIN incassi i ON i.id_fattura = f.id_fattura
GROUP BY f.id_cliente;
```

**4. Quali fatture sono scadute e non ancora incassate?** (LEFT JOIN + IS NULL: il trucco per trovare "ciò che manca")
```sql
SELECT f.id_fattura, f.id_cliente, f.importo, f.data_scadenza
FROM fatture f
LEFT JOIN incassi i ON i.id_fattura = f.id_fattura
WHERE i.id_incasso IS NULL
  AND f.data_scadenza < date('now')
ORDER BY f.data_scadenza;
```

**5. Ogni quanti giorni riordina un cliente?** (il segnale "alla Amazon": un riordino regolare è un incasso prevedibile)
```sql
SELECT id_cliente,
       COUNT(*) AS ordini,
       ROUND((julianday(MAX(data_fattura)) - julianday(MIN(data_fattura))) / (COUNT(*) - 1), 0) AS giorni_tra_ordini
FROM fatture
GROUP BY id_cliente
HAVING COUNT(*) >= 2;
```

**6. Come si comporta ogni nicchia di clienti?** (il livello "hub": confronto tra ristoranti, bar, hotel)
```sql
SELECT c.tipo_cliente,
       COUNT(DISTINCT c.id_cliente) AS clienti,
       SUM(f.importo) AS fatturato,
       ROUND(AVG(julianday(i.data_incasso) - julianday(f.data_fattura)), 0) AS giorni_medi_incasso
FROM fatture f
JOIN clienti c ON c.id_cliente = f.id_cliente
LEFT JOIN incassi i ON i.id_fattura = f.id_fattura
GROUP BY c.tipo_cliente;
```

**Il passo in più (dopo, con Claude Code):** una previsione semplice degli incassi del mese prossimo = fatture aperte + riordini attesi (query 5) × importo medio, con la data spostata del ritardo medio del cliente (query 3). Non è un modello di IA, ma è spiegabile in un minuto davanti alla giuria e mostra la logica.

**In Power BI:** linea del fatturato mensile, barre dei giorni di incasso per nicchia, tabella dei crediti scaduti, scheda KPI "concentrazione primo cliente". Per il pitch del 12/11 basta una pagina con 3–4 visual, e sono uno screenshot efficace anche se i dati di Miller arrivano tardi (usi i tuoi dati finti dichiarandolo).

---

## Come raccontarlo (CV e colloquio)

- **Gate:** "Ho progettato il modello dati e scritto in SQL i KPI del funnel commerciale di un'azienda di facility services (conversione, CAC, opportunità ferme), poi visualizzati in Power BI."
- **Miller:** "Ho calcolato da dati di fatturazione indicatori di bancabilità per PMI (giorni medi di incasso, concentrazione clienti, regolarità dei riordini) per un pilota di previsione dei flussi di cassa."
