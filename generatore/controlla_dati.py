"""
CONTROLLO DEL DATABASE DI PROVA
Stampa conteggi, valori ammessi, chiavi esterne, coerenza del percorso (PASSAGGIO 01, punti 5 e 6),
i criteri A1-A4 del PASSAGGIO 3, le ipotesi H1-H5, le tabelle nuove e i valori attesi di K12-K17
(per controllare le query di Nicolò). Non stampa le query di riferimento: dice solo se girano.
Uso: python3 generatore/controlla_dati.py
"""

import json
import re
import sqlite3
from pathlib import Path

import parametri as P

RADICE = Path(__file__).resolve().parent.parent
con = sqlite3.connect(RADICE / "data" / "gate.db")
RIF = P.DATA_RIFERIMENTO
APERTA = "fase NOT IN ('contratto','perso')"
problemi = []


def uno(sql, *arg):
    """Primo valore di una query."""
    return con.execute(sql, arg).fetchone()[0]


def verifica(descrizione, n_errori):
    """Stampa OK o il numero di righe che violano la regola."""
    print(("  OK   " if n_errori == 0 else "  NO   ") + descrizione + ("" if n_errori == 0 else f" ({n_errori} righe)"))
    if n_errori:
        problemi.append(descrizione)


def condizione(descrizione, vera, dettaglio):
    """Stampa OK o NO per una condizione, con i numeri che la giustificano."""
    print(("  OK   " if vera else "  NO   ") + descrizione + " — " + dettaglio)
    if not vera:
        problemi.append(descrizione)


def pct(a, b):
    """Percentuale con un decimale (0 se il denominatore è 0)."""
    return round(100 * a / b, 1) if b else 0.0


def conversione(where="1=1", join=""):
    """Contratti, chiuse e tasso di chiusura (contratti / contratti + perse) per un sottoinsieme di opportunità."""
    c, n = con.execute(f"""SELECT SUM(o.fase = 'contratto'), SUM(o.fase IN ('contratto','perso'))
                           FROM opportunita o {join} WHERE {where}""").fetchone()
    return c or 0, n or 0, pct(c or 0, n or 0)


TABELLE = ["clienti", "referenti", "commerciali", "opportunita", "fasi", "storico_fasi", "offerte", "attivita", "costi_canale",
           "canali", "contenuti", "kpi_catalogo", "richieste_reali"]
print("Conteggi per tabella")
for t in TABELLE:
    print(f"  {t:16} {uno(f'SELECT COUNT(*) FROM {t}')}")

print("\nValori ammessi e chiavi esterne")
dom = lambda col, tab, valori: uno(f"SELECT COUNT(*) FROM {tab} WHERE {col} NOT IN ({','.join('?' * len(valori))})", *valori)
verifica("settore", dom("settore", "clienti", P.SETTORI))
verifica("provincia", dom("provincia", "clienti", list(P.PROVINCE)))
verifica("servizio", dom("servizio", "opportunita", P.SERVIZI))
verifica("canale delle opportunità storiche (i 6 canali dello schema v0)", dom("canale", "opportunita", P.CANALI))
verifica("canale dei costi", dom("canale", "costi_canale", P.CANALI))
verifica("ogni canale usato è nel dizionario canali", uno("""SELECT COUNT(*) FROM (SELECT canale FROM opportunita UNION SELECT canale FROM costi_canale
  UNION SELECT canale FROM contenuti UNION SELECT canale FROM richieste_reali) u WHERE canale NOT IN (SELECT canale FROM canali)"""))
verifica("fase", dom("fase", "opportunita", [f[0] for f in P.FASI]))
verifica("motivo di perdita solo per le perse (vuoto = NULL)", uno("SELECT COUNT(*) FROM opportunita WHERE (fase = 'perso') <> (motivo_perdita IS NOT NULL) OR (motivo_perdita IS NOT NULL AND motivo_perdita NOT IN (" + ",".join("?" * len(P.MOTIVI_PERDITA)) + "))", *P.MOTIVI_PERDITA))
verifica("nessun testo vuoto '' (i campi vuoti sono NULL)", sum(uno(f"SELECT COUNT(*) FROM {t} WHERE {c} = ''")
    for t in TABELLE for (_, c, tipo, *_r) in con.execute(f"PRAGMA table_info({t})") if tipo == "TEXT"))
verifica("classe coerente con il punteggio", uno("SELECT COUNT(*) FROM opportunita WHERE classe_coerenza <> CASE WHEN punteggio_coerenza >= 75 THEN 'A' WHEN punteggio_coerenza >= 50 THEN 'B' ELSE 'C' END"))
verifica("margine tra 0 e 1", uno("SELECT COUNT(*) FROM opportunita WHERE margine_pct < 0 OR margine_pct > 1"))
verifica("chiavi esterne", uno("""SELECT (SELECT COUNT(*) FROM opportunita o LEFT JOIN clienti c USING(id_cliente) WHERE c.id_cliente IS NULL)
  + (SELECT COUNT(*) FROM opportunita o LEFT JOIN referenti r USING(id_referente) WHERE r.id_referente IS NULL)
  + (SELECT COUNT(*) FROM opportunita o LEFT JOIN commerciali m USING(id_commerciale) WHERE m.id_commerciale IS NULL)
  + (SELECT COUNT(*) FROM referenti r LEFT JOIN clienti c USING(id_cliente) WHERE c.id_cliente IS NULL)
  + (SELECT COUNT(*) FROM opportunita WHERE contenuto IS NOT NULL AND contenuto NOT IN (SELECT id FROM contenuti))"""))
verifica("referente dello stesso cliente", uno("SELECT COUNT(*) FROM opportunita o JOIN referenti r USING(id_referente) WHERE r.id_cliente <> o.id_cliente"))
quota = uno("SELECT ROUND(100.0 * SUM(settore = ? AND provincia = 'BA') / COUNT(*), 1) FROM clienti", P.SETTORE_PILOTA)
print(f"  ..   clienti pilota (uffici e commercio, BA): {quota}%")

print("\nPunto 5: coerenza del percorso")
verifica("fasi in ordine con date crescenti", uno("""
  SELECT COUNT(*) FROM storico_fasi a JOIN storico_fasi b ON a.id_opp = b.id_opp AND b.id_evento > a.id_evento
  JOIN fasi fa ON fa.fase = a.fase JOIN fasi fb ON fb.fase = b.fase
  WHERE fb.ordine <= fa.ordine OR b.data_ingresso < a.data_ingresso"""))
verifica("fasi senza salti prima di contratto o perso", uno("""
  SELECT COUNT(*) FROM (SELECT id_opp, COUNT(*) AS n, MAX(CASE WHEN fase <> 'perso' THEN f.ordine END) AS massimo
  FROM storico_fasi JOIN fasi f USING(fase) GROUP BY id_opp) WHERE n - (CASE WHEN n > massimo THEN 1 ELSE 0 END) <> massimo"""))
verifica("primo evento = contatto alla data di contatto", uno("""
  SELECT COUNT(*) FROM opportunita o JOIN storico_fasi s ON s.id_opp = o.id_opp
  WHERE s.id_evento = (SELECT MIN(id_evento) FROM storico_fasi WHERE id_opp = o.id_opp) AND (s.fase <> 'contatto' OR s.data_ingresso <> o.data_contatto)"""))
verifica("fase = ultima fase dello storico", uno("""
  SELECT COUNT(*) FROM opportunita o JOIN storico_fasi s ON s.id_opp = o.id_opp
  WHERE s.id_evento = (SELECT MAX(id_evento) FROM storico_fasi WHERE id_opp = o.id_opp) AND s.fase <> o.fase"""))
verifica("data ultima modifica = data dell'ultimo evento", uno("""
  SELECT COUNT(*) FROM opportunita o WHERE data_ultima_modifica <> (SELECT MAX(data_ingresso) FROM storico_fasi WHERE id_opp = o.id_opp)"""))
verifica("perse e contratti con data di chiusura, aperte senza (NULL)", uno(f"""
  SELECT COUNT(*) FROM opportunita WHERE ({APERTA}) <> (data_chiusura IS NULL)
  OR (data_chiusura IS NOT NULL AND data_chiusura <> data_ultima_modifica)"""))
verifica("offerte solo per opportunità arrivate in offerta", uno("""
  SELECT COUNT(DISTINCT id_opp) FROM offerte WHERE id_opp NOT IN (SELECT id_opp FROM storico_fasi WHERE fase = 'offerta')"""))
verifica("ogni opportunità arrivata in offerta ha almeno un'offerta", uno("""
  SELECT COUNT(*) FROM storico_fasi WHERE fase = 'offerta' AND id_opp NOT IN (SELECT id_opp FROM offerte)"""))
verifica("un sopralluogo in attività per ogni ingresso in sopralluogo", uno("""
  SELECT ABS((SELECT COUNT(*) FROM storico_fasi WHERE fase = 'sopralluogo') - (SELECT COUNT(*) FROM attivita WHERE tipo = 'sopralluogo'))
  + (SELECT COUNT(*) FROM storico_fasi s WHERE fase = 'sopralluogo' AND NOT EXISTS
     (SELECT 1 FROM attivita a WHERE a.id_opp = s.id_opp AND a.tipo = 'sopralluogo' AND a.data = s.data_ingresso))"""))
verifica("esito delle offerte coerente con la fase", uno("""
  SELECT COUNT(*) FROM offerte f JOIN opportunita o USING(id_opp)
  WHERE f.versione = (SELECT MAX(versione) FROM offerte WHERE id_opp = f.id_opp) AND NOT (
    (o.fase = 'contratto' AND f.esito = 'firmata') OR (o.fase = 'perso' AND f.esito IN ('rifiutata','scaduta')) OR (o.fase = 'offerta' AND f.esito = 'aperta'))"""))
verifica("nessuna data dopo il " + RIF, uno("""
  SELECT (SELECT COUNT(*) FROM storico_fasi WHERE data_ingresso > ?) + (SELECT COUNT(*) FROM attivita WHERE data > ?)
  + (SELECT COUNT(*) FROM opportunita WHERE data_prima_risposta > ?)""", RIF, RIF, RIF))

print("\nCampi nuovi (blocco B)")
verifica("prima risposta per tutte, 0-6 giorni dopo il contatto e non dopo il passo successivo", uno("""
  SELECT COUNT(*) FROM opportunita o WHERE data_prima_risposta IS NULL
  OR julianday(data_prima_risposta) - julianday(data_contatto) NOT BETWEEN 0 AND 6
  OR data_prima_risposta > COALESCE((SELECT MIN(data_ingresso) FROM storico_fasi s WHERE s.id_opp = o.id_opp AND s.fase <> 'contatto'), ?)""", RIF))
verifica("data_registrazione vuota nei dati storici", uno("SELECT COUNT(*) FROM opportunita WHERE data_registrazione IS NOT NULL"))
verifica("consenso_privacy e firma_da_link a 0 nei dati storici", uno("SELECT (SELECT COUNT(*) FROM opportunita WHERE consenso_privacy <> 0) + (SELECT COUNT(*) FROM offerte WHERE firma_da_link <> 0)"))
web = uno("SELECT COUNT(*) FROM opportunita WHERE canale IN ('sito web','LinkedIn')")
con_contenuto = uno("SELECT COUNT(*) FROM opportunita WHERE contenuto IS NOT NULL")
condizione("campagna e contenuto sul 30% delle opportunità da sito web e LinkedIn", abs(con_contenuto - P.QUOTA_CON_CONTENUTO * web) <= 1,
           f"{con_contenuto} su {web} ({pct(con_contenuto, web)}%)")
verifica("contenuto solo su sito web e LinkedIn, dello stesso canale e già pubblicato", uno("""
  SELECT COUNT(*) FROM opportunita o JOIN contenuti c ON c.id = o.contenuto
  WHERE o.canale <> c.canale OR o.data_contatto < c.data_pubblicazione OR o.campagna IS NULL OR o.pagina_arrivo IS NULL"""))
attivi = [c for c, _, a, _, _ in P.CANALI_DIZIONARIO if a]
verifica("ogni canale ha uno dei 7 gruppi", uno(f"SELECT COUNT(*) FROM canali WHERE gruppo NOT IN ({','.join('?' * len(P.GRUPPI_CANALI))})", *P.GRUPPI_CANALI))
condizione("dizionario canali: 12 attivi e 3 da confermare", len(attivi) == 12 and uno("SELECT COUNT(*) FROM canali WHERE attivo = 0 AND nota = 'da confermare con Gate'") == 3,
           f"{len(attivi)} attivi, {uno('SELECT COUNT(*) FROM canali WHERE attivo = 0')} spenti")

print("\nA1: pipeline aperta realistica (riferimento " + RIF + ")")
aperte = uno(f"SELECT COUNT(*) FROM opportunita WHERE {APERTA}")
recenti = uno(f"SELECT COUNT(*) FROM opportunita WHERE {APERTA} AND data_contatto >= '2026-08-01'")
condizione("aperte tra 70 e 90, concentrate sui contatti dal 2026-08-01", 70 <= aperte <= 90 and recenti / aperte >= 0.8,
           f"{aperte} aperte, {recenti} con contatto dal 1/8 ({pct(recenti, aperte)}%)")
print("  ..   aperte per fase: " + ", ".join(f"{f} {n}" for f, n in con.execute(
    f"SELECT o.fase, COUNT(*) FROM opportunita o JOIN fasi USING(fase) WHERE {APERTA} GROUP BY o.fase ORDER BY ordine")))
print("  ..   aperte per mese di contatto: " + ", ".join(f"{m} {n}" for m, n in con.execute(
    f"SELECT substr(data_contatto, 1, 7), COUNT(*) FROM opportunita WHERE {APERTA} GROUP BY 1")))
so = dict(con.execute("SELECT fase, COUNT(*) FROM opportunita WHERE data_contatto >= '2026-09-01' GROUP BY fase").fetchall())
iniziali = sum(so.get(f, 0) for f in ("contatto", "qualificato", "sopralluogo"))
aperte_so = sum(so.get(f, 0) for f in ("contatto", "qualificato", "sopralluogo", "offerta"))
condizione("contatti di settembre e ottobre ancora aperti: in maggioranza in contatto, qualificato o sopralluogo", iniziali > aperte_so / 2,
           f"{iniziali} su {aperte_so} aperte ({pct(iniziali, aperte_so)}%); su tutti i {sum(so.values())} contatti: {pct(iniziali, sum(so.values()))}%, perse {so.get('perso', 0)}")
c, n, tasso = conversione()
condizione("tasso di chiusura sulle chiuse tra 11% e 15%", 11 <= tasso <= 15, f"{c} contratti su {n} chiuse = {tasso}%")
ferme = uno(f"""SELECT COUNT(*) FROM opportunita o JOIN fasi f USING(fase)
  WHERE {APERTA} AND julianday(?) - julianday(o.data_ultima_modifica) > f.giorni_soglia""", RIF)
condizione("ferme oltre la soglia della fase tra il 10% e il 15% delle aperte (K9)", 10 <= pct(ferme, aperte) <= 15, f"{ferme} su {aperte} = {pct(ferme, aperte)}%")

print("\nA2: ipotesi inserite H1-H5")
per_canale = {r[0]: conversione(f"o.canale = '{r[0]}'") for r in con.execute("SELECT DISTINCT canale FROM opportunita")}
migliore = max(per_canale, key=lambda k: per_canale[k][2])
condizione("H1 il passaparola converte in contratto più di ogni altro canale (PASSAGGIO_PER_CANALE)", migliore == "passaparola",
           ", ".join(f"{k} {v[2]}%" for k, v in sorted(per_canale.items(), key=lambda x: -x[1][2])))
uff = "JOIN clienti c USING(id_cliente)"
li = conversione(f"c.settore = '{P.SETTORE_PILOTA}' AND o.canale = 'LinkedIn'", uff)
pap = conversione(f"c.settore = '{P.SETTORE_PILOTA}' AND o.canale = 'porta a porta'", uff)
condizione("H2 negli uffici LinkedIn converte meglio del porta a porta (BOOST_LINKEDIN_UFFICI)", li[2] > pap[2],
           f"LinkedIn {li[0]} su {li[1]} = {li[2]}%, porta a porta {pap[0]} su {pap[1]} = {pap[2]}%")
classi = {k: conversione(f"o.classe_coerenza = '{k}'") for k in "ABC"}
condizione("H3 la classe A chiude più spesso della classe C (EFFETTO_PUNTEGGIO)", classi["A"][2] > classi["C"][2],
           ", ".join(f"{k} {v[0]} su {v[1]} = {v[2]}%" for k, v in classi.items()))
margini = dict(con.execute("SELECT canale, ROUND(100 * AVG(margine_pct), 1) FROM opportunita GROUP BY canale").fetchall())
condizione("H4 l'intermediario ha il margine medio più basso (MARGINE_PER_CANALE)", min(margini, key=margini.get) == "intermediario",
           ", ".join(f"{k} {v}%" for k, v in sorted(margini.items(), key=lambda x: x[1])))
mesi = con.execute("SELECT substr(data_contatto, 1, 7), COUNT(*) FROM opportunita GROUP BY 1").fetchall()
crescono = all(a[1] <= b[1] for a, b in zip(mesi[:-1], mesi[1:-1]))   # ottobre è parziale (fino al 15)
condizione("H5 i nuovi contatti crescono di mese in mese (CRESCITA_CONTATTI; ottobre parziale)", crescono,
           ", ".join(f"{m} {n}" for m, n in mesi))

print("\nA3: H6 non inserita (test cieco)")
media = [round(sum(v[i] for k, v in P.PASSAGGIO_PER_CANALE.items() if k != "portale gare") / 5, 2) for i in range(4)]
condizione("il portale gare usa la media degli altri canali in tutti i settori e nessuna variazione del margine",
           P.PASSAGGIO_PER_CANALE["portale gare"] == media and P.MARGINE_PER_CANALE["portale gare"] == 0,
           f"passaggi {P.PASSAGGIO_PER_CANALE['portale gare']}, nessun parametro per la GDO")

print("\nA4: le 5 query di riferimento (sql-gate-miller.md) girano senza modifiche")
testo = (RADICE / "docs" / "riferimento-sql.md").read_text(encoding="utf-8")
blocco = testo[testo.index("### Query, dalla più facile"):testo.index("## 2.")]
for n, sql in enumerate(re.findall(r"```sql\n(.*?)```", blocco, re.S)[:5], 1):
    try:
        print(f"  OK   query {n}: {len(con.execute(sql).fetchall())} righe")
    except sqlite3.Error as e:
        print(f"  NO   query {n}: {e}")
        problemi.append(f"query di riferimento {n}")

print("\nTabelle nuove")
condizione("kpi_catalogo con 17 righe (K1-K17), livelli e tipi ammessi", uno("SELECT COUNT(*) FROM kpi_catalogo") == 17 and uno(
    "SELECT COUNT(*) FROM kpi_catalogo WHERE livello_anthony NOT IN ('operativo','tattico','strategico') OR tipo NOT IN ('efficacia','efficienza','adozione') OR fonte NOT IN ('fittizi','reali','entrambi')") == 0,
    ", ".join(f"{l} {n}" for l, n in con.execute("SELECT livello_anthony, COUNT(*) FROM kpi_catalogo GROUP BY 1")))
condizione("contenuti di prova", uno("SELECT COUNT(*) FROM contenuti WHERE tema LIKE '[prova]%'") == len(P.CONTENUTI),
           f"{len(P.CONTENUTI)} contenuti marcati [prova]")
print("  ..   richieste_reali per fonte: " + (", ".join(f"{f} {n}" for f, n in con.execute("SELECT fonte, COUNT(*) FROM richieste_reali GROUP BY fonte")) or "nessuna"))
esempio = uno("SELECT COUNT(*) FROM richieste_reali WHERE note LIKE 'ESEMPIO%'")
if esempio:
    print(f"  ..   {esempio} righe sono ESEMPI DI PROVA (data/esempi/), non dati di Gate")

print("\nApp e MySQL leggono gli stessi dati")
js = (RADICE / "js" / "dati-db.js").read_text(encoding="utf-8")
app = json.loads(js[js.index("{"):js.rindex(";")])
diversi = [t for t in ["clienti", "referenti", "opportunita", "storico_fasi", "offerte", "attivita", "contenuti", "kpi_catalogo", "richieste_reali"]
           if len(app[t]["righe"]) != uno(f"SELECT COUNT(*) FROM {t}")]
verifica("js/dati-db.js ha le stesse righe del database", len(diversi))
mysql = (RADICE / "data" / "gate_mysql.sql").read_text(encoding="utf-8")
verifica("data/gate_mysql.sql crea tutte le tabelle", sum(f"CREATE TABLE {t} (" not in mysql for t in TABELLE))

print("\nValori attesi per gli esercizi K12-K17 (dati fittizi; controlla la tua query con questi)")
k12 = uno("SELECT ROUND(AVG(julianday(data_prima_risposta) - julianday(data_contatto)), 2) FROM opportunita")
print(f"  K12 tempo medio di prima risposta: {k12} giorni su {uno('SELECT COUNT(*) FROM opportunita')} opportunità")
k13 = con.execute("""SELECT ROUND(AVG(julianday(f.data_invio) - julianday(o.data_contatto)), 2), COUNT(*)
  FROM offerte f JOIN opportunita o USING(id_opp) WHERE f.versione = 1""").fetchone()
print(f"  K13 tempo medio dalla richiesta alla prima offerta: {k13[0]} giorni su {k13[1]} opportunità con offerta")
reg = uno("SELECT COUNT(*) FROM opportunita WHERE data_registrazione IS NOT NULL")
print(f"  K14 richieste registrate entro 24 ore: " + ("n.d., nessuna richiesta con data_registrazione nei dati storici" if not reg else
      f"{pct(uno('SELECT COUNT(*) FROM opportunita WHERE julianday(data_registrazione) - julianday(data_contatto) <= 1'), reg)}% su {reg}"))
dig = uno("SELECT COUNT(*) FROM opportunita o JOIN canali c USING(canale) WHERE c.tipo = 'digitale'")
print(f"  K15 quota di richieste digitali: {dig} su {uno('SELECT COUNT(*) FROM opportunita')} = {pct(dig, uno('SELECT COUNT(*) FROM opportunita'))}%")
contratti = uno("SELECT COUNT(*) FROM opportunita WHERE fase = 'contratto'")
firmate = uno("SELECT COUNT(DISTINCT id_opp) FROM offerte WHERE firma_da_link = 1 AND esito = 'firmata'")
print(f"  K16 offerte firmate da link: {firmate} su {contratti} contratti = {pct(firmate, contratti)}% (cresce solo con la demo)")
print("  K17 facilità percepita: n.d. sui dati fittizi (arriva solo dai dati reali)")

for fonte in [f for (f,) in con.execute("SELECT DISTINCT fonte FROM richieste_reali ORDER BY fonte")]:
    w = f"fonte = '{fonte}'"
    tot = uno(f"SELECT COUNT(*) FROM richieste_reali WHERE {w}")
    print(f"\nValori attesi sui dati reali, fonte «{fonte}»" + (" (ESEMPI DI PROVA)" if esempio else "") + f": {tot} richieste")
    print(f"  K12 prima risposta: {uno(f'SELECT ROUND(AVG(julianday(data_risposta) - julianday(data_richiesta)), 2) FROM richieste_reali WHERE {w}')} giorni")
    print(f"  K13 richiesta → offerta: {uno(f'SELECT ROUND(AVG(julianday(data_offerta) - julianday(data_richiesta)), 2) FROM richieste_reali WHERE {w} AND data_offerta IS NOT NULL')} giorni "
          f"su {uno(f'SELECT COUNT(*) FROM richieste_reali WHERE {w} AND data_offerta IS NOT NULL')} richieste con offerta")
    r = uno(f"SELECT COUNT(*) FROM richieste_reali WHERE {w} AND data_registrazione IS NOT NULL")
    print(f"  K14 registrate entro 24 ore: {uno(f'SELECT COUNT(*) FROM richieste_reali WHERE {w} AND julianday(data_registrazione) - julianday(data_richiesta) <= 1')} su {r} registrate")
    d = uno(f"SELECT COUNT(*) FROM richieste_reali r JOIN canali c USING(canale) WHERE {w} AND c.tipo = 'digitale'")
    print(f"  K15 richieste digitali: {d} su {tot} = {pct(d, tot)}%")
    print(f"  K17 facilità percepita: {uno(f'SELECT ROUND(AVG(voto_facilita), 2) FROM richieste_reali WHERE {w}') or 'n.d.'} "
          f"su {uno(f'SELECT COUNT(voto_facilita) FROM richieste_reali WHERE {w}')} voti")

print("\nRISULTATO: " + ("tutti i controlli superati" if not problemi else f"{len(problemi)} controlli non superati: " + "; ".join(problemi)))
