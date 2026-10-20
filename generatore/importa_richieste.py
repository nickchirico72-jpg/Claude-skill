"""
IMPORTA I DATI VERI DI GATE (fotografia di partenza e test di tre settimane) nella tabella richieste_reali.
Il CSV ha le 7 colonne del foglio condiviso: data_richiesta, data_registrazione (o data_annotazione), canale (canale o gruppo),
settore, data_risposta, data_offerta, esito; più fonte (partenza o test, oppure --fonte) e, se c'è, note. Le righe che iniziano con # sono commenti.
Le date si scrivono AAAA-MM-GG oppure GG/MM/AAAA; una data vuota resta vuota (NULL).
Le righe con errori vengono scartate e stampate con il motivo; le altre sostituiscono quelle già importate con la stessa fonte.
Un secondo CSV facoltativo (--voti) porta i voti di facilità: colonne fonte, riga (numero della richiesta nel foglio, 1 = la prima), voto_facilita (1-5).
Dopo l'import si aggiornano la copia MySQL e i dati dell'app.

Uso: python3 generatore/importa_richieste.py data/esempi/richieste-partenza-esempio.csv
     python3 generatore/importa_richieste.py data/esempi/richieste-test-esempio.csv --voti data/esempi/voti-test-esempio.csv
"""

import argparse
import csv
import sqlite3
import sys
from datetime import date
from pathlib import Path

import esporta
import parametri as P

DB = Path(__file__).resolve().parent.parent / "data" / "gate.db"
# Le 7 colonne del CSV (modifica 1); la fonte può stare in una colonna o arrivare da --fonte
COLONNE = ["data_richiesta", "data_registrazione", "canale", "settore", "data_risposta", "data_offerta", "esito"]
# Nomi alternativi accettati nell'intestazione (es. «data annotazione» del foglio condiviso)
SINONIMI = {"data_annotazione": "data_registrazione", "data annotazione": "data_registrazione", "data richiesta": "data_richiesta",
            "data risposta": "data_risposta", "data offerta": "data_offerta", "data_prima_risposta": "data_risposta"}
ESITI = ["aperta", "contratto", "persa", "non interessante"]
FONTI = ["partenza", "test"]


def leggi_csv(percorso):
    """Righe del CSV come dizionari (separatore , o ; riconosciuto da solo), saltando i commenti."""
    with open(percorso, encoding="utf-8-sig", newline="") as f:
        righe = [r for r in f.read().splitlines() if r.strip() and not r.lstrip().startswith("#")]
    sep = ";" if righe and righe[0].count(";") > righe[0].count(",") else ","
    lettore = csv.DictReader(righe, delimiter=sep)
    lettore.fieldnames = [SINONIMI.get(c.strip().lower(), c.strip().lower()) for c in lettore.fieldnames or []]
    return [{k: (v or "").strip() for k, v in r.items() if k} for r in lettore], lettore.fieldnames


def data_iso(testo):
    """'2026-10-05' o '05/10/2026' diventano '2026-10-05'; vuoto diventa None; altrimenti ValueError."""
    if not testo:
        return None
    if "/" in testo:
        g, m, a = testo.split("/")
        testo = f"{int(a):04d}-{int(m):02d}-{int(g):02d}"
    return date.fromisoformat(testo).isoformat()


def controlla(riga, canali, fonte_predefinita=""):
    """Restituisce (valori puliti, None) oppure (None, motivo dello scarto)."""
    v = {}
    try:
        for c in ["data_richiesta", "data_registrazione", "data_risposta", "data_offerta"]:
            v[c] = data_iso(riga.get(c, ""))
    except ValueError:
        return None, f"data non valida in {c}: «{riga.get(c)}» (scrivi AAAA-MM-GG o GG/MM/AAAA)"
    if not v["data_richiesta"]:
        return None, "manca data_richiesta"
    oggi = date.today().isoformat()
    for c in ["data_richiesta", "data_registrazione", "data_risposta", "data_offerta"]:
        if v[c] and v[c] > oggi:
            return None, f"{c} nel futuro ({v[c]})"
        if v[c] and v[c] < v["data_richiesta"]:
            return None, f"{c} prima della data della richiesta"
    # Il canale può essere un canale del dizionario o uno dei 7 gruppi (sito, telefono, portale/gara...)
    gruppi = {g.lower(): c for g, c in P.GRUPPI_CANALI.items()}
    canale = canali.get(riga.get("canale", "").lower()) or gruppi.get(riga.get("canale", "").lower())
    if not canale:
        return None, f"canale non ammesso: «{riga.get('canale')}» (un canale della tabella canali o un gruppo: {', '.join(P.GRUPPI_CANALI)})"
    settore = {s.lower(): s for s in P.SETTORI}.get(riga.get("settore", "").lower())
    if not settore:
        return None, f"settore non ammesso: «{riga.get('settore')}» (ammessi: {', '.join(P.SETTORI)})"
    esito = riga.get("esito", "").lower()
    if esito not in ESITI:
        return None, f"esito non ammesso: «{riga.get('esito')}» (ammessi: {', '.join(ESITI)})"
    fonte = (riga.get("fonte") or fonte_predefinita).lower()
    if fonte not in FONTI:
        return None, f"fonte non ammessa: «{riga.get('fonte')}» (partenza o test)"
    v.update(canale=canale, settore=settore, esito=esito, fonte=fonte,
             note=riga.get("note") or None)
    return v, None


def importa(file_richieste, file_voti=None, fonte=""):
    """Controlla e importa le richieste (e i voti); stampa righe importate e scartate."""
    con = sqlite3.connect(DB)
    canali = {c.lower(): c for (c,) in con.execute("SELECT canale FROM canali")}
    righe, intestazioni = leggi_csv(file_richieste)
    mancanti = [c for c in COLONNE if c not in intestazioni]
    if mancanti:
        sys.exit("Colonne mancanti nel CSV: " + ", ".join(mancanti))
    buone, scartate = [], []
    for n, r in enumerate(righe, 1):
        valori, motivo = controlla(r, canali, fonte)
        if motivo:
            scartate.append((n, motivo))
        else:
            valori["riga"] = n
            buone.append(valori)

    voti = {}
    if file_voti:
        for n, r in enumerate(leggi_csv(file_voti)[0], 1):
            try:
                voto = int(r.get("voto_facilita", ""))
                riga = int(r.get("riga", ""))
            except ValueError:
                scartate.append((f"voti {n}", "riga o voto non numerici"))
                continue
            if not 1 <= voto <= 5:
                scartate.append((f"voti {n}", f"voto fuori scala 1-5: {voto}"))
                continue
            voti[(r.get("fonte", "").lower(), riga)] = voto

    fonti = sorted({b["fonte"] for b in buone})
    con.executemany("DELETE FROM richieste_reali WHERE fonte = ?", [(f,) for f in fonti])
    prossimo = (con.execute("SELECT MAX(id) FROM richieste_reali").fetchone()[0] or 0) + 1
    for i, b in enumerate(buone):
        con.execute("""INSERT INTO richieste_reali (id, fonte, data_richiesta, data_registrazione, canale, settore,
                       data_risposta, data_offerta, esito, voto_facilita, note) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                    (prossimo + i, b["fonte"], b["data_richiesta"], b["data_registrazione"], b["canale"], b["settore"],
                     b["data_risposta"], b["data_offerta"], b["esito"], voti.get((b["fonte"], b["riga"])), b["note"]))
    con.commit()
    esporta.tutto(con)
    totale = con.execute("SELECT fonte, COUNT(*) FROM richieste_reali GROUP BY fonte").fetchall()
    con.close()

    print(f"Importate {len(buone)} richieste (fonte: {', '.join(fonti) or 'nessuna'}), {sum(1 for b in buone if (b['fonte'], b['riga']) in voti)} con il voto di facilità.")
    if scartate:
        print(f"Scartate {len(scartate)} " + ("riga:" if len(scartate) == 1 else "righe:"))
        for n, motivo in scartate:
            print(f"  riga {n}: {motivo}")
    print("Ora in richieste_reali: " + ", ".join(f"{f} {n}" for f, n in totale))
    print("Aggiornati data/gate_mysql.sql e js/dati-db.js: ricarica l'app per vedere i dati reali negli Indicatori.")


if __name__ == "__main__":
    a = argparse.ArgumentParser(description="Importa i dati veri di Gate nella tabella richieste_reali")
    a.add_argument("richieste", help="CSV del foglio condiviso")
    a.add_argument("--voti", help="CSV facoltativo con i voti di facilità")
    a.add_argument("--fonte", choices=FONTI, default="", help="fonte delle righe, se il CSV non ha la colonna fonte")
    argomenti = a.parse_args()
    importa(argomenti.richieste, argomenti.voti, argomenti.fonte)
