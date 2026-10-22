"""
PROVE DELL'ARCHIVIO IN MYSQL (MariaDB vero, avviato in una cartella temporanea)

Prima: NODE_PATH=$(npm root -g) node prove/e2e.js (scrive gli stati dell'app in prove/archivio/).
Poi:   python3 prove/archivio.py
Controlla che:
 1. lo schema si crei e che stato e impostazioni dell'app si carichino;
 2. riletti dal database, i dati tornino identici (andata e ritorno, nessun campo perso), anche con tutti i campi facoltativi;
 3. l'app riapra lo stato riletto e calcoli gli stessi KPI;
 4. i vincoli rifiutino i dati sbagliati (fasi, chiavi esterne, perdite senza motivo, sì/no, orari...);
 5. un campo nuovo dell'app senza colonna fermi la migrazione;
 6. le domande di Alfredo abbiano risposta con query semplici.
"""
import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

CARTELLA = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(CARTELLA / "strumenti"))
import archivio as A  # noqa: E402

STATI = CARTELLA / "prove" / "archivio"
esiti = []


def verifica(nome, ok, dettaglio=""):
    """Registra e stampa l'esito di una verifica."""
    esiti.append(ok)
    print(("  OK   " if ok else "  FAIL ") + nome + (f" — {dettaglio}" if dettaglio else ""))


# ------------------------------------------------------------ MariaDB temporaneo
class MariaDB:
    """Server MariaDB usa e getta: cartella dei dati temporanea, solo socket locale."""

    def __enter__(self):
        self.cartella = Path(tempfile.mkdtemp(prefix="gate-mariadb-"))
        self.socket = str(self.cartella / "mysql.sock")
        subprocess.run(["mariadb-install-db", "--no-defaults", f"--datadir={self.cartella / 'dati'}", "--auth-root-authentication-method=normal",
                        "--skip-test-db", "--user=root"], check=True, capture_output=True)
        self.processo = subprocess.Popen(["mariadbd", "--no-defaults", f"--datadir={self.cartella / 'dati'}", f"--socket={self.socket}",
                                          "--skip-networking", "--user=root", f"--pid-file={self.cartella / 'pid'}"],
                                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            if os.path.exists(self.socket):
                break
            time.sleep(0.1)
        time.sleep(0.5)
        return self

    def sql(self, testo, database="gate", controlla=True):
        """Esegue SQL con il client mariadb; restituisce (ok, uscita)."""
        r = subprocess.run(["mariadb", "--no-defaults", f"--socket={self.socket}", "-uroot", "--batch", "--raw", "--skip-column-names",
                            "--default-character-set=utf8mb4"] + ([database] if database else []),
                           input=testo, capture_output=True, text=True)
        if controlla and r.returncode:
            raise RuntimeError(r.stderr[:500])
        return r.returncode == 0, (r.stdout if r.returncode == 0 else r.stderr)

    def righe(self, tabella):
        """Tutte le righe di una tabella come dizionari (MariaDB le restituisce già in JSON)."""
        colonne = A.colonne_di(tabella)
        # CONCAT: le colonne JSON tornano come testo (altrimenti MariaDB le inserirebbe già aperte nell'oggetto)
        campi = ", ".join(f"'{c}', " + (f"CONCAT({c})" if (tabella, c) == ("impostazioni", "valore") else c) for c in colonne)
        _, uscita = self.sql(f"SELECT JSON_OBJECT({campi}) FROM {tabella};")
        return [json.loads(riga) for riga in uscita.splitlines() if riga.strip()]

    def tutte(self):
        """Righe di tutte le tabelle."""
        return {nome: self.righe(nome) for nome, *_ in A.TABELLE}

    def nuovo_database(self):
        """Database vuoto con lo schema dell'archivio."""
        self.sql("DROP DATABASE IF EXISTS gate; CREATE DATABASE gate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;", database=None)
        self.sql(A.schema_mysql())

    def __exit__(self, *errore):
        self.processo.terminate()
        self.processo.wait(timeout=20)
        shutil.rmtree(self.cartella, ignore_errors=True)


# ------------------------------------------------------------------ Confronti
def normalizza(x):
    """Toglie i valori null (assente = null nell'app), rende confrontabili 5 e 5.0 e ordina per id le raccolte
    (il database non ricorda l'ordine di inserimento; l'app ordina da sola per data e fase)."""
    if isinstance(x, dict):
        return {k: normalizza(v) for k, v in x.items() if v is not None}
    if isinstance(x, list):
        lista = [normalizza(v) for v in x]
        return sorted(lista, key=lambda v: v["id"]) if lista and all(isinstance(v, dict) and "id" in v for v in lista) else lista
    if isinstance(x, float) and x.is_integer():
        return int(x)
    return x


def insiemi(imp):
    """Zone e servizi di squadre e partner sono insiemi: l'ordine non conta, si confrontano ordinati."""
    for chi in imp["squadre"] + imp["partner"]:
        chi["zone"], chi["servizi"] = sorted(chi["zone"]), sorted(chi["servizi"])
    return imp


def differenze(a, b, percorso="", fino=5):
    """Prime differenze tra due strutture, per capire cosa si è perso."""
    out = []
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                out.append(f"{percorso}.{k}: {'manca al ritorno' if k in a else 'in più al ritorno'}")
            else:
                out += differenze(a[k], b[k], f"{percorso}.{k}", fino)
    elif isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        for i, (x, y) in enumerate(zip(a, b)):
            out += differenze(x, y, f"{percorso}[{i}]", fino)
    elif a != b:
        out.append(f"{percorso}: {str(a)[:60]} ≠ {str(b)[:60]}")
    return out[:fino]


def andata_e_ritorno(db, stato, imp, nome):
    """Carica stato e impostazioni nel database, li rilegge e controlla che siano identici."""
    db.nuovo_database()
    ok, errore = db.sql(A.insert_sql(A.unisci(A.da_impostazioni(imp), A.da_stato(stato))), controlla=False)
    verifica(f"{nome}: caricamento in MariaDB", ok, "" if ok else errore[:300])
    if not ok:
        return None
    righe = db.tutte()
    attese = A.unisci(A.da_impostazioni(imp), A.da_stato(stato))
    conteggi = [n for n, *_ in A.TABELLE if len(righe[n]) != len(attese[n])]
    verifica(f"{nome}: stesse righe in ogni tabella", not conteggi, ", ".join(conteggi))
    ritorno = A.a_stato(righe)
    d = differenze(normalizza(stato), normalizza(ritorno))
    verifica(f"{nome}: lo stato riletto dal database è identico", not d, "; ".join(d))
    d = differenze(insiemi(normalizza(imp)), insiemi(normalizza(A.a_impostazioni(righe))))
    verifica(f"{nome}: le impostazioni rilette sono identiche", not d, "; ".join(d))
    return ritorno


def tutti_i_facoltativi(stato):
    """Copia dello stato con ogni campo facoltativo dell'app valorizzato almeno una volta (anche quelli rari)."""
    s = copy.deepcopy(stato)
    perse = [o for o in s["opportunita"] if o.get("perso")]
    perse[0]["perso"]["nota"] = "Ha scelto un fornitore interno; l'apostrofo e la \\ non devono rompere nulla"
    aperta = next(o for o in s["opportunita"] if not o.get("perso") and not o["storico"].get("contratto"))
    aperta.update({"riaperta": aperta["storico"]["contatto"], "motivazioneC": "Cliente strategico", "tariffa": 23.5, "note": "Note\nsu due righe",
                   "preventivo": {"ambiente": "Uffici e studi", "mq": 380.5, "frequenza": "3 volte a settimana"},
                   "ricontatto": {"data": aperta["storico"]["contatto"], "nota": "Richiamare dopo le ferie"}})
    firmata = next(o for o in s["opportunita"] if o["storico"].get("contratto") and not o.get("perso"))
    firmata["allocazione"] = {"tipo": "squadra", "id": "sq1", "data": firmata["storico"]["contratto"]}
    firmata["proposte"] = [{"partnerId": "pa1", "data": firmata["storico"]["contratto"], "esito": "no"}]
    s["referenti"][0]["cancellato"] = True
    s["attivita"][0].update({"ora": "09:30", "fase": "sopralluogo"})
    s["attivita"][1]["ora"] = ""
    s["ultimoBackup"] = "2026-10-20"
    s["tempiRegistrazione"] = [{"id": "tr1", "opportunitaId": aperta["id"], "secondi": 42, "data": aperta["storico"]["contatto"]},
                               {"id": "tr2", "secondi": 55, "data": aperta["storico"]["contatto"]}]
    return s


def app_riapre(percorso_ritorno, percorso_originale):
    """L'app (Chromium) riapre lo stato riletto: struttura valida e stessi KPI dell'originale."""
    script = CARTELLA / "prove" / "riapri_stato.js"
    r = subprocess.run(["node", str(script), str(percorso_originale), str(percorso_ritorno)], capture_output=True, text=True,
                       env={**os.environ, "NODE_PATH": subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()})
    try:
        return json.loads(r.stdout.strip().splitlines()[-1])
    except (IndexError, json.JSONDecodeError):
        return {"errore": (r.stderr or r.stdout)[:300]}


# ---------------------------------------------------------------------- Prove
def main():
    file = {n: STATI / f"{n}.json" for n in ["stato-iniziale", "stato-demo", "impostazioni"]}
    mancanti = [str(f) for f in file.values() if not f.exists()]
    if mancanti:
        print("Mancano gli stati dell'app: lancia prima  NODE_PATH=$(npm root -g) node prove/e2e.js\n" + "\n".join(mancanti))
        sys.exit(1)
    stati = {n: json.loads(f.read_text(encoding="utf-8")) for n, f in file.items()}
    imp = stati.pop("impostazioni")

    print("\nschema")
    (CARTELLA / "data" / "archivio_mysql.sql").write_text(A.schema_mysql(), encoding="utf-8")
    with MariaDB() as db:
        db.nuovo_database()
        _, uscita = db.sql("SHOW TABLES;")
        verifica(f"schema creato in MariaDB: {len(uscita.split())} tabelle", len(uscita.split()) == len(A.TABELLE))

        print("\nandata e ritorno")
        for nome, stato in stati.items():
            ritorno = andata_e_ritorno(db, stato, imp, nome)
            if ritorno is not None:
                percorso = STATI / f"{nome}-ritorno.json"
                percorso.write_text(json.dumps(ritorno, ensure_ascii=False), encoding="utf-8")
                esito = app_riapre(percorso, file[nome])
                verifica(f"{nome}: l'app riapre lo stato riletto con gli stessi KPI", esito.get("valido") and esito.get("ugualiKpi"), json.dumps(esito)[:200])
        andata_e_ritorno(db, tutti_i_facoltativi(stati["stato-demo"]), imp, "tutti i campi facoltativi")

        print("\nvincoli")
        db.nuovo_database()
        db.sql(A.insert_sql(A.unisci(A.da_impostazioni(imp), A.da_stato(stati["stato-demo"]))))
        o = stati["stato-demo"]["opportunita"][0]
        sbagliati = {
            "fase che non esiste": f"INSERT INTO fasi_opportunita VALUES ('{o['id']}', 'trattativa', '2026-10-01');",
            "opportunità di un'azienda che non esiste": "INSERT INTO opportunita (id, codice, id_azienda, servizio, ore_mese) VALUES ('x1', 'GT-X', 'nessuna', 'cleaning e hospitality', 10);",
            "perdita senza motivo": f"UPDATE opportunita SET perso_il = '2026-10-01', motivo_perdita = NULL WHERE id = '{o['id']}';",
            "codice di riferimento doppio": f"INSERT INTO opportunita (id, codice, id_azienda, servizio, ore_mese) VALUES ('x2', '{o['codice']}', '{o['aziendaId']}', 'cleaning e hospitality', 10);",
            "ore negative": f"UPDATE opportunita SET ore_mese = -5 WHERE id = '{o['id']}';",
            "sì/no diverso da 0 e 1": f"UPDATE opportunita SET firma_da_link = 2 WHERE id = '{o['id']}';",
            "azienda senza nome": "INSERT INTO aziende (id, ragione_sociale) VALUES ('x3', '   ');",
            "orario non valido": "UPDATE attivita SET ora = '9.30' LIMIT 1;",
            "proposta a un partner che non esiste": f"INSERT INTO proposte_partner (id_opportunita, ordine, id_partner, data, esito) VALUES ('{o['id']}', 9, 'pa99', '2026-10-01', 'attesa');",
            "allocazione a partner senza partner": f"INSERT INTO allocazioni (id_opportunita, tipo, data) VALUES ('{o['id']}', 'partner', '2026-10-01');",
            "ruolo utente non previsto": "INSERT INTO utenti (id, nome, ruolo, attivo) VALUES ('u1', 'Prova', 'amministratore', 1);",
            "lavoratore autonomo come tipo sbagliato": "INSERT INTO partner (id, nome, tipo, ordine, attivo) VALUES ('px', 'Prova', 'freelance', 9, 1);",
            "impostazione non in JSON": "INSERT INTO impostazioni (chiave, valore) VALUES ('prova', 'non json');",
            "data impossibile": "UPDATE attivita SET data = '2026-02-30' LIMIT 1;",
            "eliminare un'azienda con le sue trattative": f"DELETE FROM aziende WHERE id = '{o['aziendaId']}';",
        }
        db.sql("SET GLOBAL sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';", database=None)
        for nome, istruzione in sbagliati.items():
            ok, _ = db.sql(istruzione, controlla=False)
            verifica(f"rifiutato: {nome}", not ok)
        ok1, _ = db.sql(f"INSERT INTO proposte_partner (id_opportunita, ordine, id_partner, data, esito) VALUES ('{o['id']}', 7, 'pa1', '2026-10-01', 'attesa');", controlla=False)
        ok2, _ = db.sql(f"INSERT INTO proposte_partner (id_opportunita, ordine, id_partner, data, esito) VALUES ('{o['id']}', 8, 'pa2', '2026-10-02', 'attesa');", controlla=False)
        verifica("rifiutato: due proposte in attesa per la stessa trattativa (la prima è accettata)", ok1 and not ok2)
        ok, _ = db.sql("INSERT INTO utenti (id, nome, email, ruolo, attivo) VALUES ('u1', 'Alfredo R.', 'alfredo@esempio.it', 'direzione', 1);", controlla=False)
        verifica("accettato: un utente con ruolo direzione", ok)
        ok, _ = db.sql("UPDATE squadre SET ore_impegnate = 2000, aggiornato_da = 'Alfredo R.' WHERE id = 'sq1';", controlla=False)
        _, quando = db.sql("SELECT aggiornato_da, aggiornato_il IS NOT NULL FROM squadre WHERE id = 'sq1';")
        verifica("ogni modifica registra chi e quando (aggiornato_da, aggiornato_il)", ok and quando.split() [:1] == ["Alfredo"], quando.strip())

        print("\ncampi nuovi")
        s = copy.deepcopy(stati["stato-demo"])
        s["opportunita"][0]["campoNuovo"] = 1
        try:
            A.da_stato(s)
            verifica("un campo dell'app senza colonna ferma la migrazione", False)
        except A.CampoSconosciuto as e:
            verifica("un campo dell'app senza colonna ferma la migrazione", True, str(e))

        print("\ndomande di Alfredo (query leggibili)")
        domande = {
            "Quante trattative sono aperte, per fase?": """
                SELECT f.fase, COUNT(*) AS trattative FROM fasi_opportunita f JOIN opportunita o ON o.id = f.id_opportunita
                WHERE o.perso_il IS NULL AND f.data = (SELECT MAX(data) FROM fasi_opportunita WHERE id_opportunita = o.id)
                GROUP BY f.fase;""",
            "Quali commesse firmate non hanno ancora chi le esegue?": """
                SELECT o.codice, a.ragione_sociale FROM opportunita o JOIN aziende a ON a.id = o.id_azienda
                JOIN fasi_opportunita f ON f.id_opportunita = o.id AND f.fase = 'contratto'
                LEFT JOIN allocazioni al ON al.id_opportunita = o.id WHERE al.id_opportunita IS NULL AND o.perso_il IS NULL;""",
            "Di quali partner scade il DURC nei prossimi 60 giorni?": """
                SELECT nome, durc_scadenza FROM partner WHERE durc_scadenza <= CURDATE() + INTERVAL 60 DAY ORDER BY durc_scadenza;""",
            "Chi ha fatto le ultime modifiche?": "SELECT quando, chi, cosa FROM registro ORDER BY quando DESC LIMIT 3;",
        }
        for domanda, query in domande.items():
            ok, uscita = db.sql(query, controlla=False)
            righe = [r for r in uscita.splitlines() if r.strip()] if ok else []
            verifica(domanda, ok and len(righe) > 0, f"{len(righe)} righe, es. {righe[0][:70] if righe else uscita[:120]}")

    falliti = esiti.count(False)
    print(f"\n{len(esiti) - falliti}/{len(esiti)} verifiche superate")
    sys.exit(1 if falliti else 0)


if __name__ == "__main__":
    main()
