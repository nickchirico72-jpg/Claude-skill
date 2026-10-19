"""
CONTROLLO DEL DATABASE DI PROVA
Stampa i conteggi per tabella e verifica la coerenza richiesta dal PASSAGGIO 01 (punti 5 e 6),
i valori ammessi, le chiavi esterne e che le 5 query di riferimento girino.
Uso: python3 generatore/controlla_dati.py
"""

import sqlite3
from pathlib import Path

import parametri as P

DB = Path(__file__).resolve().parent.parent / "data" / "gate.db"
con = sqlite3.connect(DB)
problemi = []


def uno(sql, *arg):
    """Primo valore di una query."""
    return con.execute(sql, arg).fetchone()[0]


def verifica(descrizione, n_errori):
    """Stampa OK o il numero di righe che violano la regola."""
    print(("  OK   " if n_errori == 0 else "  NO   ") + descrizione + ("" if n_errori == 0 else f" ({n_errori} righe)"))
    if n_errori:
        problemi.append(descrizione)


print("Conteggi per tabella")
for t in ["clienti", "referenti", "commerciali", "opportunita", "fasi", "storico_fasi", "offerte", "attivita", "costi_canale"]:
    print(f"  {t:14} {uno(f'SELECT COUNT(*) FROM {t}')}")

print("\nValori ammessi e chiavi esterne")
dom = lambda col, tab, valori: uno(f"SELECT COUNT(*) FROM {tab} WHERE {col} NOT IN ({','.join('?' * len(valori))})", *valori)
verifica("settore", dom("settore", "clienti", P.SETTORI))
verifica("provincia", dom("provincia", "clienti", list(P.PROVINCE)))
verifica("servizio", dom("servizio", "opportunita", P.SERVIZI))
verifica("canale", dom("canale", "opportunita", P.CANALI))
verifica("canale dei costi", dom("canale", "costi_canale", P.CANALI))
verifica("fase", dom("fase", "opportunita", [f[0] for f in P.FASI]))
verifica("motivo di perdita (solo per le perse)", uno("SELECT COUNT(*) FROM opportunita WHERE (fase = 'perso') <> (motivo_perdita <> '') OR (motivo_perdita <> '' AND motivo_perdita NOT IN (" + ",".join("?" * len(P.MOTIVI_PERDITA)) + "))", *P.MOTIVI_PERDITA))
verifica("classe coerente con il punteggio", uno("SELECT COUNT(*) FROM opportunita WHERE classe_coerenza <> CASE WHEN punteggio_coerenza >= 75 THEN 'A' WHEN punteggio_coerenza >= 50 THEN 'B' ELSE 'C' END"))
verifica("margine tra 0 e 1", uno("SELECT COUNT(*) FROM opportunita WHERE margine_pct < 0 OR margine_pct > 1"))
verifica("chiavi esterne", uno("""SELECT (SELECT COUNT(*) FROM opportunita o LEFT JOIN clienti c USING(id_cliente) WHERE c.id_cliente IS NULL)
  + (SELECT COUNT(*) FROM opportunita o LEFT JOIN referenti r USING(id_referente) WHERE r.id_referente IS NULL)
  + (SELECT COUNT(*) FROM opportunita o LEFT JOIN commerciali m USING(id_commerciale) WHERE m.id_commerciale IS NULL)
  + (SELECT COUNT(*) FROM referenti r LEFT JOIN clienti c USING(id_cliente) WHERE c.id_cliente IS NULL)"""))
verifica("referente dello stesso cliente", uno("SELECT COUNT(*) FROM opportunita o JOIN referenti r USING(id_referente) WHERE r.id_cliente <> o.id_cliente"))
quota = uno("SELECT ROUND(100.0 * SUM(settore = ? AND provincia = 'BA') / COUNT(*), 1) FROM clienti", P.SETTORE_PILOTA)
print(f"  ..   clienti pilota (uffici e commercio, BA): {quota}%")

print("\nPunto 5: coerenza del percorso")
verifica("fasi in ordine con date crescenti", uno("""
  SELECT COUNT(*) FROM storico_fasi a JOIN storico_fasi b ON a.id_opp = b.id_opp AND b.id_evento > a.id_evento
  JOIN fasi fa ON fa.fase = a.fase JOIN fasi fb ON fb.fase = b.fase
  WHERE fb.ordine <= fa.ordine OR b.data_ingresso < a.data_ingresso"""))
verifica("fasi senza salti (contatto, qualificato, ... ) prima di contratto o perso", uno("""
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
verifica("perse e contratti con data di chiusura, aperte senza", uno("""
  SELECT COUNT(*) FROM opportunita WHERE (fase IN ('contratto','perso')) <> (data_chiusura <> '')
  OR (data_chiusura <> '' AND data_chiusura <> data_ultima_modifica)"""))
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
verifica("nessuna data dopo il " + P.DATA_RIFERIMENTO, uno("""
  SELECT (SELECT COUNT(*) FROM storico_fasi WHERE data_ingresso > ?) + (SELECT COUNT(*) FROM attivita WHERE data > ?)""", P.DATA_RIFERIMENTO, P.DATA_RIFERIMENTO))

print("\nPunto 6: opportunità aperte ferme oltre la soglia della propria fase")
aperte = uno("SELECT COUNT(*) FROM opportunita WHERE fase NOT IN ('contratto','perso')")
ferme = uno("""SELECT COUNT(*) FROM opportunita o JOIN fasi f USING(fase)
  WHERE o.fase NOT IN ('contratto','perso') AND julianday(?) - julianday(o.data_ultima_modifica) > f.giorni_soglia""", P.DATA_RIFERIMENTO)
print(f"  ..   aperte {aperte}, ferme {ferme} = {100 * ferme / aperte:.1f}%")
verifica("ferme tra il 10% e il 15% delle aperte", 0 if 10 <= 100 * ferme / aperte <= 15 else 1)

print("\nLe 5 query di riferimento (schema v0) girano senza errori")
QUERY = {
    "1 aperte per settore": "SELECT o.id_opp, c.nome, c.settore, o.fase, o.valore_annuo FROM opportunita o JOIN clienti c ON c.id_cliente = o.id_cliente WHERE o.fase NOT IN ('contratto','perso')",
    "2 funnel per fase": "SELECT fase, COUNT(*), SUM(valore_annuo) FROM opportunita GROUP BY fase",
    "3 conversione per canale": "SELECT canale, COUNT(*), SUM(CASE WHEN fase = 'contratto' THEN 1 ELSE 0 END) FROM opportunita GROUP BY canale",
    "4 CAC per canale": "SELECT k.canale FROM (SELECT canale, SUM(costo) AS c FROM costi_canale GROUP BY canale) k JOIN (SELECT canale, COUNT(*) AS n FROM opportunita WHERE fase = 'contratto' GROUP BY canale) v ON v.canale = k.canale",
    "5 ferme oltre 30 giorni": "SELECT o.id_opp FROM opportunita o JOIN clienti c ON c.id_cliente = o.id_cliente JOIN commerciali m ON m.id_commerciale = o.id_commerciale WHERE o.fase NOT IN ('contratto','perso') AND julianday('now') - julianday(o.data_ultima_modifica) > 30",
}
for nome, sql in QUERY.items():
    try:
        n = len(con.execute(sql).fetchall())
        print(f"  OK   {nome}: {n} righe")
    except sqlite3.Error as e:
        print(f"  NO   {nome}: {e}")
        problemi.append(nome)

print("\nRISULTATO: " + ("tutti i controlli superati" if not problemi else f"{len(problemi)} controlli non superati: " + "; ".join(problemi)))
