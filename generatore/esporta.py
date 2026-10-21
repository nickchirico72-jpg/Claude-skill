"""
ESPORTAZIONI DEL DATABASE
 - data/gate_mysql.sql: lo stesso database per MySQL o MariaDB (anche da MySQL Workbench), con tipi e chiavi esterne;
 - js/dizionari.js: i dizionari condivisi (canali, settori, servizi, comuni, fasi, punteggio), letti anche dai moduli pubblici;
 - js/dati-db.js: le tabelle del database per l'app HTML (che non può leggere un file SQLite da sola).
Le chiamano genera_dati.py e importa_richieste.py: non serve lanciarlo a mano.
"""

import json
from pathlib import Path

import parametri as P

RADICE = Path(__file__).resolve().parent.parent

# Ordine di creazione: prima le tabelle a cui puntano le chiavi esterne
ORDINE = ["canali", "fasi", "clienti", "referenti", "commerciali", "opportunita", "storico_fasi", "offerte", "attivita",
          "costi_canale", "contenuti", "kpi_catalogo", "richieste_reali"]

# Tipi MySQL per le colonne che non sono testo breve (gli altri TEXT diventano VARCHAR(255))
TIPI_MYSQL = {
    "valore_annuo": "DECIMAL(12,2)", "importo_annuo": "DECIMAL(12,2)", "costo": "DECIMAL(10,2)",
    "margine_pct": "DECIMAL(5,3)", "margine_pct_previsto": "DECIMAL(5,3)", "probabilita": "DECIMAL(4,2)",
    "ore_mese_stimate": "DECIMAL(7,1)", "mese": "CHAR(7)",
    "decisore": "TINYINT", "attivo": "TINYINT", "consenso_privacy": "TINYINT", "firma_da_link": "TINYINT", "voto_facilita": "TINYINT",
    "formula": "TEXT", "spiegazione": "TEXT", "domanda_business": "TEXT", "dati_necessari": "TEXT", "note": "TEXT", "nota": "TEXT", "tema": "TEXT",
}


def tipo_mysql(nome, tipo_sqlite, chiave):
    """Tipo MySQL di una colonna: date come DATE, numeri con i decimali giusti, chiavi di testo più corte."""
    if nome in TIPI_MYSQL:
        return TIPI_MYSQL[nome]
    if nome.startswith("data"):
        return "DATE"
    if tipo_sqlite == "INTEGER":
        return "INT"
    if tipo_sqlite == "REAL":
        return "DECIMAL(12,2)"
    return "VARCHAR(100)" if chiave else "VARCHAR(255)"


def valore_sql(v):
    """Valore scritto in SQL: NULL, numero o testo tra apici."""
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"


def esporta_mysql(con):
    """Scrive data/gate_mysql.sql: CREATE TABLE con chiavi primarie ed esterne, poi gli INSERT."""
    righe = ["-- Database di prova di Gate S.R.L. per MySQL 8 o MariaDB 10.6+ (DATI FITTIZI).",
             "-- Generato da generatore/genera_dati.py: non modificarlo a mano, rilancia il generatore.",
             "-- Uso: in MySQL Workbench File > Open SQL Script > Esegui (fulmine); da terminale: mysql -u root -p < data/gate_mysql.sql",
             "-- Differenze con SQLite: le date sono di tipo DATE, quindi i giorni tra due date si calcolano con DATEDIFF(fine, inizio)",
             "-- invece di julianday(fine) - julianday(inizio). I campi vuoti sono NULL in tutti e due i database.",
             "",
             "DROP DATABASE IF EXISTS gate;",
             "CREATE DATABASE gate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
             "USE gate;",
             ""]
    for tabella in ORDINE:
        colonne = con.execute(f"PRAGMA table_info({tabella})").fetchall()   # (cid, nome, tipo, notnull, default, pk)
        esterne = con.execute(f"PRAGMA foreign_key_list({tabella})").fetchall()   # (id, seq, tabella, da, a, ...)
        definizioni = []
        for _, nome, tipo, _, _, pk in colonne:
            chiave = pk or any(e[3] == nome for e in esterne)
            definizioni.append(f"  {nome} {tipo_mysql(nome, tipo, chiave)}" + (" PRIMARY KEY" if pk else ""))
        for e in esterne:
            definizioni.append(f"  FOREIGN KEY ({e[3]}) REFERENCES {e[2]}({e[4]})")
        righe.append(f"CREATE TABLE {tabella} (\n" + ",\n".join(definizioni) + "\n);")
        dati = con.execute(f"SELECT * FROM {tabella}").fetchall()
        nomi = ", ".join(c[1] for c in colonne)
        for i in range(0, len(dati), 100):
            blocco = ",\n".join("(" + ", ".join(valore_sql(v) for v in r) + ")" for r in dati[i:i + 100])
            righe.append(f"INSERT INTO {tabella} ({nomi}) VALUES\n{blocco};")
        righe.append("")
    (RADICE / "data" / "gate_mysql.sql").write_text("\n".join(righe), encoding="utf-8")


def tabella(con, nome, extra=None):
    """Una tabella in forma compatta per l'app: { colonne: [...], righe: [[...], ...] }."""
    cur = con.execute(f"SELECT * FROM {nome}")
    colonne = [d[0] for d in cur.description]
    righe = [list(r) for r in cur.fetchall()]
    if extra:   # colonna aggiunta solo per l'app (es. capacità simulata usata dal punteggio)
        nome_extra, valori = extra
        colonne.append(nome_extra)
        for r in righe:
            r.append(valori.get(r[0]))
    return {"colonne": colonne, "righe": righe}


def esporta_app(con, capacita):
    """Scrive js/dizionari.js (dizionari condivisi, da parametri.py) e js/dati-db.js (tabelle), letti dall'app all'avvio."""
    dizionari = {
        "canali": [{"canale": c, "tipo": t, "attivo": bool(a), "gruppo": g, "nota": n} for c, t, a, g, n in P.CANALI_DIZIONARIO],
        "gruppiCanali": P.GRUPPI_CANALI,
        "settori": P.SETTORI,
        "settorePilota": P.SETTORE_PILOTA,
        "servizi": [{"nome": s, "tariffa": e["tariffa"], "margineMedio": e["margine"]} for s, e in P.SERVIZI_ECONOMIA.items()],
        "comuni": [{"nome": c, "provincia": prov, "km": km, "zona": zona} for prov, elenco in P.COMUNI.items() for c, km, zona in elenco],
        "fasi": [{"id": f, "probabilita": p, "giorniFerma": g} for f, _, p, g in P.FASI if f != "perso"],
        "motiviPerdita": P.MOTIVI_PERDITA,
        "basiGiuridiche": ["da verificare"] + [b for b in P.BASI_GIURIDICHE if b != "da verificare"],
        "modiRaccolta": P.MODI_RACCOLTA,
        "campagnaPilota": P.CAMPAGNA_PILOTA,
        "punteggio": {
            "pesi": P.PESI, "soglie": {"A": 75, "B": 50}, "settoreFuoriPilota": P.SETTORE_FUORI_PILOTA, "buona": P.SOGLIA_BUONA,
            "distanzaKm": {"piena": P.DISTANZA_PIENA, "massima": P.DISTANZA_META},
            "margine": {"obiettivo": P.MARGINE_PIENO, "minimo": P.MARGINE_META},
            "valoreAnnuo": {"idealeDa": P.DIMENSIONE_PIENA[0], "idealeA": P.DIMENSIONE_PIENA[1],
                            "accettabileDa": P.DIMENSIONE_META[0], "accettabileA": P.DIMENSIONE_META[1]},
        },
        "pagineContenuti": {c[0]: c[6] for c in P.CONTENUTI},
    }
    testo = ("/*\n * DIZIONARI CONDIVISI TRA DATABASE E APP (canali, settori, servizi, comuni, fasi, punteggio)\n"
             " * File generato da generatore/genera_dati.py a partire da generatore/parametri.py: NON modificarlo a mano.\n */\n"
             "const DIZIONARI_DB = " + json.dumps(dizionari, ensure_ascii=False, indent=1) + ";\n")
    (RADICE / "js" / "dizionari.js").write_text(testo, encoding="utf-8")
    dati = {"dataRiferimento": P.DATA_RIFERIMENTO, "seme": P.SEME}
    for nome in ["clienti", "referenti", "commerciali", "storico_fasi", "offerte", "attivita", "costi_canale",
                 "contenuti", "kpi_catalogo", "richieste_reali"]:
        dati[nome] = tabella(con, nome)
    dati["opportunita"] = tabella(con, "opportunita", ("capacita_simulata", capacita))
    testo = ("/*\n * DATI DEL DATABASE PER L'APP (FITTIZI, tranne la tabella richieste_reali)\n"
             " * File generato da generatore/genera_dati.py a partire da data/gate.db: NON modificarlo a mano.\n"
             " * Così l'app e le query SQL lavorano sugli stessi dati. I dizionari sono in js/dizionari.js.\n */\n"
             "const DATI_DB = " + json.dumps(dati, ensure_ascii=False, separators=(",", ":")) + ";\n")
    (RADICE / "js" / "dati-db.js").write_text(testo, encoding="utf-8")


def tutto(con, capacita=None):
    """Rigenera la copia MySQL e i dati dell'app; senza capacità nuove riusa quelle già esportate."""
    if capacita is None:
        capacita = capacita_esportata()
    esporta_mysql(con)
    esporta_app(con, capacita)


def capacita_esportata():
    """Capacità simulate già scritte in js/dati-db.js (servono quando si importano solo i dati reali)."""
    testo = (RADICE / "js" / "dati-db.js").read_text(encoding="utf-8")
    dati = json.loads(testo[testo.index("{"):testo.rindex(";")])
    opp = dati["opportunita"]
    i = opp["colonne"].index("capacita_simulata")
    return {r[0]: r[i] for r in opp["righe"]}
