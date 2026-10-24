"""
PONTE CON IL GESTIONALE (PASSAGGIO 4, N5), versione Python: stesse tabelle, stessi controlli di js/ponte.js
  python3 strumenti/ponte_gestionale.py esporta [CARTELLA]              un CSV per tabella da data/gate.db (nomi del dizionario, UTF-8)
  python3 strumenti/ponte_gestionale.py importa CARTELLA DATABASE_NUOVO  controlla i CSV e li scrive in un database vuoto
L'import elenca le righe scartate con il motivo. Solo libreria standard.
"""
import csv
import sqlite3
import sys
from datetime import date
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RADICE / "generatore"))
import genera_dati  # noqa: E402  (schema del database)
import parametri as P  # noqa: E402

# Tabelle e colonne del ponte, nell'ordine dei collegamenti (uguali a TABELLE_PONTE in js/ponte.js)
TABELLE = {
    "commerciali": ["id_commerciale", "nome", "tipo"],
    "clienti": ["id_cliente", "nome", "settore", "provincia", "comune", "km_da_bari", "superficie_mq", "tipo_cliente"],
    "referenti": ["id_referente", "id_cliente", "nome", "ruolo", "decisore", "email", "telefono", "base_giuridica", "modo_raccolta"],
    "opportunita": ["id_opp", "id_cliente", "id_commerciale", "id_referente", "canale", "servizio", "fase", "valore_annuo", "margine_pct",
                    "ore_mese_stimate", "data_contatto", "data_ultima_modifica", "data_chiusura", "motivo_perdita", "punteggio_coerenza",
                    "classe_coerenza", "data_prima_risposta", "data_registrazione", "consenso_privacy", "campagna", "contenuto", "pagina_arrivo",
                    "data_scadenza_contratto"],
    "storico_fasi": ["id_evento", "id_opp", "fase", "data_ingresso"],
    "offerte": ["id_offerta", "id_opp", "versione", "data_invio", "importo_annuo", "margine_pct_previsto", "esito", "data_esito", "firma_da_link", "pacchetto"],
    "canali": ["canale", "tipo", "attivo", "gruppo", "nota"],
}
OBBLIGATORIE = ["clienti", "referenti", "opportunita"]
INTERI = {"id_commerciale", "id_cliente", "id_referente", "id_opp", "id_evento", "id_offerta", "km_da_bari", "superficie_mq",
          "decisore", "punteggio_coerenza", "consenso_privacy", "versione", "firma_da_link", "attivo"}
DECIMALI = {"valore_annuo", "margine_pct", "ore_mese_stimate", "importo_annuo", "margine_pct_previsto"}
CAMPI_OBBLIGATORI = {"commerciali": ["nome"], "clienti": ["nome"], "referenti": ["id_cliente", "nome", "base_giuridica"],
                     "opportunita": ["id_cliente", "servizio", "fase", "data_contatto"], "storico_fasi": ["id_opp", "fase", "data_ingresso"],
                     "offerte": ["id_opp", "data_invio"], "canali": ["tipo"]}
SI_NO = {"decisore", "consenso_privacy", "firma_da_link", "attivo"}
PACCHETTI = ["Base", "Plus", "Completo"]   # nomi dei pacchetti in js/config.js


def esporta(cartella, database=RADICE / "data" / "gate.db"):
    """Scrive un CSV per tabella (intestazione con i nomi del dizionario, celle vuote per NULL)."""
    cartella = Path(cartella)
    cartella.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(database)
    for nome, colonne in TABELLE.items():
        with open(cartella / f"{nome}.csv", "w", newline="", encoding="utf-8") as f:
            scrittore = csv.writer(f)
            scrittore.writerow(colonne)
            # Un testo che comincia con = + - @ prende un apostrofo: in Excel non diventa una formula (all'import si toglie)
            scrittore.writerows([[f"'{v}" if di_testo(c) and isinstance(v, str) and v[:1] in "=+-@\t\r" and v else v for c, v in zip(colonne, riga)]
                                 for riga in con.execute(f"SELECT {', '.join(colonne)} FROM {nome}")])
    con.close()


def di_testo(colonna):
    """Colonna di testo libero (non numero, non data): l'unica in cui può nascondersi una formula."""
    return colonna not in INTERI and colonna not in DECIMALI and not colonna.startswith("data")


def valore(colonna, testo):
    """Cella convertita nel tipo della colonna: (valore, errore)."""
    s = (testo or "").strip()
    if s == "":
        return None, None
    if colonna in INTERI:
        return (int(s), None) if s.lstrip("-").isdigit() else (None, f"{colonna} non è un numero intero: «{s}»")
    if colonna in DECIMALI:
        try:
            return float(s.replace(",", ".")), None
        except ValueError:
            return None, f"{colonna} non è un numero: «{s}»"
    if colonna.startswith("data"):
        try:
            date.fromisoformat(s)
            return s, None
        except ValueError:
            return None, f"{colonna} non è una data AAAA-MM-GG: «{s}»"
    return (s[1:] if len(s) > 1 and s[0] == "'" and s[1] in "=+-@" else s), None   # l'apostrofo messo all'export contro le formule si toglie


def controlla(cartella):
    """Legge i CSV della cartella e li controlla: (tabelle valide, righe scartate, problemi gravi)."""
    cartella = Path(cartella)
    fasi = [f for f, *_ in P.FASI]
    canali = [c[0] for c in P.CANALI_DIZIONARIO]
    ammessi = {
        "commerciali": {"tipo": ["interno", "intermediario", "esterno"]},
        "clienti": {"settore": P.SETTORI, "tipo_cliente": ["privato", "pubblico"]},
        "referenti": {"base_giuridica": P.BASI_GIURIDICHE},
        "opportunita": {"canale": canali, "servizio": P.SERVIZI, "fase": fasi, "motivo_perdita": P.MOTIVI_PERDITA},
        "storico_fasi": {"fase": fasi},
        "offerte": {"esito": ["aperta", "firmata", "rifiutata", "scaduta"], "pacchetto": PACCHETTI},
        "canali": {"tipo": ["digitale", "diretto", "intermediato", "gara"]},
    }
    tabelle, scartate, problemi = {}, [], []
    for nome, colonne in TABELLE.items():
        file = cartella / f"{nome}.csv"
        if not file.exists():
            if nome in OBBLIGATORIE:
                problemi.append(f"manca il file della tabella {nome}")
            continue
        with open(file, newline="", encoding="utf-8-sig") as f:
            lettore = csv.reader(f)
            intestazione = [h.strip().lower() for h in next(lettore, [])]
            righe_file = list(lettore)
        tabelle[nome], visti = [], set()
        for n, celle in enumerate(righe_file, 2):
            if not any(c.strip() for c in celle):
                continue
            riga, errori = {}, []
            for c in colonne:
                v, e = valore(c, celle[intestazione.index(c)] if c in intestazione and intestazione.index(c) < len(celle) else "")
                riga[c] = v
                if e:
                    errori.append(e)
            chiave = colonne[0]
            if riga[chiave] is None:
                errori.append(f"{chiave} mancante")
            elif riga[chiave] in visti:
                errori.append(f"{chiave} {riga[chiave]} ripetuto")
            errori += [f"{c} mancante" for c in CAMPI_OBBLIGATORI[nome] if riga[c] is None and not any(e.startswith(c) for e in errori)]
            errori += [f"{c} non ammesso: «{riga[c]}»" for c, valori in ammessi[nome].items() if riga[c] is not None and riga[c] not in valori]
            errori += [f"{c} deve essere 0 o 1" for c in SI_NO if c in riga and riga[c] not in (None, 0, 1)]
            esiste = lambda tab, campo, v: any(r[campo] == v for r in tabelle.get(tab, []))  # noqa: E731
            if nome in ("referenti", "opportunita") and riga["id_cliente"] is not None and not esiste("clienti", "id_cliente", riga["id_cliente"]):
                errori.append(f"cliente {riga['id_cliente']} inesistente")
            if nome == "opportunita":
                if riga["id_referente"] is not None and not esiste("referenti", "id_referente", riga["id_referente"]):
                    errori.append(f"referente {riga['id_referente']} inesistente")
                if riga["id_commerciale"] is not None and "commerciali" in tabelle and not esiste("commerciali", "id_commerciale", riga["id_commerciale"]):
                    errori.append(f"commerciale {riga['id_commerciale']} inesistente")
                if riga["fase"] == "perso" and not riga["motivo_perdita"]:
                    errori.append("trattativa persa senza motivo")
                if riga["margine_pct"] is not None and not 0 <= riga["margine_pct"] <= 1:
                    errori.append("margine_pct fuori da 0-1")
            if nome in ("storico_fasi", "offerte") and riga["id_opp"] is not None and not esiste("opportunita", "id_opp", riga["id_opp"]):
                errori.append(f"opportunità {riga['id_opp']} inesistente")
            if errori:
                scartate.append((nome, n, "; ".join(errori)))
            else:
                visti.add(riga[chiave])
                tabelle[nome].append(riga)
    return tabelle, scartate, problemi


def importa(cartella, database):
    """Controlla i CSV e scrive le righe valide in un database nuovo con lo schema di gate.db; restituisce l'esito."""
    tabelle, scartate, problemi = controlla(cartella)
    database = Path(database)
    if database.exists():
        database.unlink()
    con = sqlite3.connect(database)
    con.executescript(genera_dati.SCHEMA)
    for nome, righe in tabelle.items():
        colonne = TABELLE[nome]
        con.executemany(f"INSERT INTO {nome} ({', '.join(colonne)}) VALUES ({', '.join('?' * len(colonne))})",
                        [tuple(r[c] for c in colonne) for r in righe])
    con.commit()
    con.close()
    return tabelle, scartate, problemi


if __name__ == "__main__":
    comando = sys.argv[1] if len(sys.argv) > 1 else ""
    if comando == "esporta":
        destinazione = sys.argv[2] if len(sys.argv) > 2 else RADICE / "export" / "gestionale"
        esporta(destinazione)
        print(f"Scritti {len(TABELLE)} CSV in {destinazione}")
    elif comando == "importa" and len(sys.argv) == 4:
        t, s, p = importa(sys.argv[2], sys.argv[3])
        print(", ".join(f"{n} {len(r)}" for n, r in t.items()))
        for nome, riga, motivo in s:
            print(f"  scartata: {nome}, riga {riga}: {motivo}")
        for problema in p:
            print("  PROBLEMA: " + problema)
    else:
        print(__doc__)
