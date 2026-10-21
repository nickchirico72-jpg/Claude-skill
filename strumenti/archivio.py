"""
ARCHIVIO CONDIVISO IN MYSQL: schema, andata (backup dell'app → MySQL) e ritorno (MySQL → backup dell'app)

Il CRM oggi salva tutto nel browser (un oggetto JSON, lo "stato"). Per lavorare in più persone i dati devono
stare in un database. Questo file dice dove va ogni dato dell'app (tabelle e colonne MySQL) e lo dimostra:
  python3 strumenti/archivio.py schema                       scrive data/archivio_mysql.sql (le tabelle vuote)
  python3 strumenti/archivio.py esporta BACKUP [IMPOSTAZIONI] scrive gli INSERT per MySQL (migrazione dei dati)
Le prove (prove/archivio.py) caricano tutto in MariaDB, rileggono e controllano che non si perda nulla.

Regole: ogni campo dell'app ha la sua colonna (un campo sconosciuto ferma l'esportazione: niente dati persi
in silenzio); id dell'app come chiave (testo); date DATE; sì/no TINYINT(1); vincoli CHECK e chiavi esterne;
ogni tabella dei dati ha aggiornato_il e aggiornato_da per lavorare in più persone.
"""
import json
import sys
from pathlib import Path

CARTELLA = Path(__file__).resolve().parent.parent

# ------------------------------------------------------------------ Schema
# Ogni tabella: (nome, descrizione, colonne, vincoli). Colonna: (nome, tipo MySQL, vincolo sulla colonna)
ID = "VARCHAR(64)"
TESTO = "VARCHAR(255)"
DATA = "DATE"
SINO = "TINYINT(1)"
NUMERO = "DOUBLE"
META = [("aggiornato_il", "TIMESTAMP", "NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ("aggiornato_da", TESTO, "")]


def sino(colonna, obbligatoria=False):
    """Colonna sì/no: 0 o 1 (NULL ammesso se facoltativa)."""
    return (colonna, SINO, ("NOT NULL " if obbligatoria else "") + f"CHECK ({colonna} IN (0, 1))")


TABELLE = [
    # --- Dizionari (oggi in generatore/parametri.py)
    # ordine = posizione nei menu dell'app
    ("settori", "Settori dei clienti", [("settore", TESTO, "PRIMARY KEY"), ("ordine", "INT", "NOT NULL")], []),
    ("comuni", "Comuni con provincia, distanza da Bari e zona operativa",
     [("comune", TESTO, "PRIMARY KEY"), ("provincia", "VARCHAR(8)", "NOT NULL"), ("km_da_bari", "INT", "NOT NULL CHECK (km_da_bari >= 0)"),
      ("zona", TESTO, "NOT NULL"), ("ordine", "INT", "NOT NULL")], []),
    ("canali", "Canali di acquisizione e loro gruppo",
     [("canale", TESTO, "PRIMARY KEY"), ("tipo", TESTO, "NOT NULL"), sino("attivo", True), ("gruppo", TESTO, "NOT NULL"), ("nota", TESTO, ""),
      ("ordine", "INT", "NOT NULL")], []),
    ("motivi_perdita", "Motivi per cui si perde una trattativa", [("motivo", TESTO, "PRIMARY KEY"), ("ordine", "INT", "NOT NULL")], []),
    # --- Impostazioni (oggi in js/config.js): Alfredo le cambierà dalla schermata Impostazioni
    ("servizi", "Servizi con tariffa e costi orari",
     [("servizio", TESTO, "PRIMARY KEY"), ("tariffa", NUMERO, "NOT NULL CHECK (tariffa > 0)"),
      ("costo_interno", NUMERO, "CHECK (costo_interno >= 0)"), ("costo_partner", NUMERO, "CHECK (costo_partner >= 0)"),
      ("ordine", "INT", "NOT NULL")] + META, []),
    ("squadre", "Squadre interne di Gate",
     [("id", ID, "PRIMARY KEY"), ("nome", TESTO, "NOT NULL"), ("caposquadra", TESTO, ""),
      ("ore_capacita", "INT", "NOT NULL CHECK (ore_capacita >= 0)"), ("ore_impegnate", "INT", "NOT NULL CHECK (ore_impegnate >= 0)"),
      ("ordine", "INT", "NOT NULL"), sino("attiva", True)] + META, []),
    ("squadre_zone", "Zone coperte da ogni squadra",
     [("id_squadra", ID, "NOT NULL"), ("zona", TESTO, "NOT NULL")],
     ["PRIMARY KEY (id_squadra, zona)", "FOREIGN KEY (id_squadra) REFERENCES squadre(id) ON DELETE CASCADE"]),
    ("squadre_servizi", "Servizi svolti da ogni squadra",
     [("id_squadra", ID, "NOT NULL"), ("servizio", TESTO, "NOT NULL")],
     ["PRIMARY KEY (id_squadra, servizio)", "FOREIGN KEY (id_squadra) REFERENCES squadre(id) ON DELETE CASCADE",
      "FOREIGN KEY (servizio) REFERENCES servizi(servizio) ON UPDATE CASCADE"]),
    ("partner", "Imprese partner in ordine di priorità",
     [("id", ID, "PRIMARY KEY"), ("nome", TESTO, "NOT NULL"), ("tipo", "VARCHAR(16)", "NOT NULL CHECK (tipo IN ('impresa', 'autonomo'))"),
      ("referente", TESTO, ""), ("telefono", "VARCHAR(32)", ""), ("durc_scadenza", DATA, ""), ("ordine", "INT", "NOT NULL"),
      sino("attivo", True)] + META, []),
    ("partner_zone", "Zone coperte da ogni partner",
     [("id_partner", ID, "NOT NULL"), ("zona", TESTO, "NOT NULL")],
     ["PRIMARY KEY (id_partner, zona)", "FOREIGN KEY (id_partner) REFERENCES partner(id) ON DELETE CASCADE"]),
    ("partner_servizi", "Servizi svolti da ogni partner",
     [("id_partner", ID, "NOT NULL"), ("servizio", TESTO, "NOT NULL")],
     ["PRIMARY KEY (id_partner, servizio)", "FOREIGN KEY (id_partner) REFERENCES partner(id) ON DELETE CASCADE",
      "FOREIGN KEY (servizio) REFERENCES servizi(servizio) ON UPDATE CASCADE"]),
    ("ambienti_preventivo", "Tipi di ambiente del preventivo: resa in mq all'ora e spese dirette",
     [("ambiente", TESTO, "PRIMARY KEY"), ("resa_mq_ora", NUMERO, "NOT NULL CHECK (resa_mq_ora > 0)"),
      ("spese_dirette", NUMERO, "NOT NULL CHECK (spese_dirette BETWEEN 0 AND 1)"), ("ordine", "INT", "NOT NULL")] + META, []),
    ("frequenze_preventivo", "Frequenze del preventivo: passaggi a settimana e sconto",
     [("frequenza", TESTO, "PRIMARY KEY"), ("passaggi_settimana", "INT", "NOT NULL CHECK (passaggi_settimana BETWEEN 1 AND 7)"),
      ("sconto", NUMERO, "NOT NULL CHECK (sconto BETWEEN 0 AND 1)"), ("ordine", "INT", "NOT NULL")] + META, []),
    ("impostazioni", "Soglie e valori singoli (giorni, obiettivi, avvisi...): valore in JSON",
     [("chiave", "VARCHAR(64)", "PRIMARY KEY"), ("valore", "TEXT", "NOT NULL CHECK (JSON_VALID(valore))")] + META, []),
    ("utenti", "Chi usa il CRM: nome, email per l'accesso, ruolo",
     [("id", ID, "PRIMARY KEY"), ("nome", TESTO, "NOT NULL"), ("email", TESTO, "UNIQUE"),
      ("ruolo", "VARCHAR(16)", "NOT NULL CHECK (ruolo IN ('direzione', 'commerciale', 'ufficio'))"), sino("attivo", True)] + META, []),
    # --- Dati del CRM (oggi lo "stato" nel browser)
    ("aziende", "Aziende clienti o potenziali",
     [("id", ID, "PRIMARY KEY"), ("ragione_sociale", TESTO, "NOT NULL CHECK (TRIM(ragione_sociale) <> '')"), ("partita_iva", "VARCHAR(32)", ""),
      ("settore", TESTO, ""), ("comune", TESTO, ""), ("fonte", TESTO, ""), ("note", "TEXT", ""), ("creata_il", DATA, ""),
      ("superficie_mq", NUMERO, "CHECK (superficie_mq >= 0)"), ("tipo_cliente", TESTO, "")] + META, []),
    ("referenti", "Persone di riferimento delle aziende, con la privacy",
     [("id", ID, "PRIMARY KEY"), ("id_azienda", ID, "NOT NULL"), ("nome", TESTO, "NOT NULL"), ("ruolo", TESTO, ""),
      ("telefono", "VARCHAR(32)", ""), ("email", TESTO, ""), ("canale_preferito", "VARCHAR(16)", ""), sino("decisore"),
      ("privacy_base", TESTO, "NOT NULL"), ("privacy_data", DATA, ""), ("privacy_raccolta", TESTO, "NOT NULL"),
      sino("privacy_opposizione", True), sino("cancellato")] + META,
     ["FOREIGN KEY (id_azienda) REFERENCES aziende(id)"]),
    ("opportunita", "Trattative: una per servizio richiesto",
     [("id", ID, "PRIMARY KEY"), ("codice", "VARCHAR(32)", "NOT NULL UNIQUE"), ("id_azienda", ID, "NOT NULL"), ("id_referente", ID, ""),
      ("canale", TESTO, ""), ("comune", TESTO, ""), ("servizio", TESTO, "NOT NULL"), ("ore_mese", NUMERO, "NOT NULL CHECK (ore_mese >= 0)"),
      ("valore_annuo", NUMERO, ""), ("margine", NUMERO, ""), ("capacita_simulata", NUMERO, ""), ("tariffa", NUMERO, "CHECK (tariffa >= 0)"),
      ("note", "TEXT", ""), ("scadenza_offerta", DATA, ""), ("data_avvio", DATA, ""), ("riaperta_il", DATA, ""), ("motivazione_c", "TEXT", ""),
      ("data_prima_risposta", DATA, ""), ("data_registrazione", DATA, ""), sino("consenso_privacy"), ("campagna", TESTO, ""),
      ("contenuto", TESTO, ""), ("pagina_arrivo", TESTO, ""), sino("firma_da_link"),
      ("perso_il", DATA, ""), ("motivo_perdita", TESTO, ""), ("nota_perdita", "TEXT", "")] + META,
     ["FOREIGN KEY (id_azienda) REFERENCES aziende(id)", "FOREIGN KEY (id_referente) REFERENCES referenti(id)",
      "CHECK ((perso_il IS NULL) = (motivo_perdita IS NULL))"]),
    ("fasi_opportunita", "Data in cui ogni trattativa è entrata in ogni fase",
     [("id_opportunita", ID, "NOT NULL"),
      ("fase", "VARCHAR(16)", "NOT NULL CHECK (fase IN ('contatto', 'qualificato', 'sopralluogo', 'offerta', 'contratto'))"),
      ("data", DATA, "NOT NULL")],
     ["PRIMARY KEY (id_opportunita, fase)", "FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE CASCADE"]),
    ("preventivi", "Misure del preventivo di una trattativa",
     [("id_opportunita", ID, "PRIMARY KEY"), ("ambiente", TESTO, "NOT NULL"), ("mq", NUMERO, "NOT NULL CHECK (mq >= 0)"),
      ("frequenza", TESTO, "NOT NULL")] + META,
     ["FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE CASCADE"]),
    ("ricontatti", "Trattative da ricontattare in una data",
     [("id_opportunita", ID, "PRIMARY KEY"), ("data", DATA, "NOT NULL"), ("nota", "TEXT", "NOT NULL")] + META,
     ["FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE CASCADE"]),
    ("allocazioni", "Chi esegue la commessa firmata: squadra, partner o già avviata (storico)",
     [("id_opportunita", ID, "PRIMARY KEY"), ("tipo", "VARCHAR(16)", "NOT NULL CHECK (tipo IN ('storico', 'squadra', 'partner'))"),
      ("id_squadra", ID, ""), ("id_partner", ID, ""), ("data", DATA, "NOT NULL")] + META,
     ["FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE CASCADE",
      "FOREIGN KEY (id_squadra) REFERENCES squadre(id)", "FOREIGN KEY (id_partner) REFERENCES partner(id)",
      "CHECK ((tipo = 'squadra') = (id_squadra IS NOT NULL) AND (tipo = 'partner') = (id_partner IS NOT NULL))"]),
    ("proposte_partner", "Proposte inviate ai partner su WhatsApp e loro risposta",
     [("id_opportunita", ID, "NOT NULL"), ("ordine", "INT", "NOT NULL"), ("id_partner", ID, "NOT NULL"), ("data", DATA, "NOT NULL"),
      ("esito", "VARCHAR(8)", "NOT NULL CHECK (esito IN ('attesa', 'si', 'no'))"),
      # Colonna calcolata: vale l'id della trattativa solo se la proposta è in attesa, così UNIQUE vieta due attese insieme
      ("in_attesa", ID, "AS (IF(esito = 'attesa', id_opportunita, NULL)) STORED UNIQUE")] + META,
     ["PRIMARY KEY (id_opportunita, ordine)", "FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE CASCADE",
      "FOREIGN KEY (id_partner) REFERENCES partner(id)"]),
    ("attivita", "Attività svolte e da fare (chiamate, email, visite, promemoria)",
     [("id", ID, "PRIMARY KEY"), ("id_azienda", ID, "NOT NULL"), ("id_referente", ID, ""), ("id_opportunita", ID, ""),
      sino("da_fare", True), sino("automatica"), ("tipo", "VARCHAR(32)", "NOT NULL"), ("data", DATA, "NOT NULL"),
      ("ora", "VARCHAR(5)", "CHECK (ora = '' OR ora REGEXP '^[0-9]{2}:[0-9]{2}$')"), ("testo", "TEXT", "NOT NULL"), ("fase", "VARCHAR(16)", "")] + META,
     ["FOREIGN KEY (id_azienda) REFERENCES aziende(id)", "FOREIGN KEY (id_referente) REFERENCES referenti(id)",
      "FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE CASCADE"]),
    ("contenuti", "Contenuti del piano editoriale aggiunti nel CRM (link tracciati)",
     [("id", ID, "PRIMARY KEY"), ("data_pubblicazione", DATA, "NOT NULL"), ("canale", TESTO, "NOT NULL"), ("tema", TESTO, "NOT NULL"),
      ("settore", TESTO, "NOT NULL"), ("formato", TESTO, "NOT NULL")] + META, []),
    ("richieste_reali", "Richieste vere importate dal CSV a 7 colonne",
     [("id", "INT", "PRIMARY KEY"), ("fonte", "VARCHAR(16)", "NOT NULL CHECK (fonte IN ('partenza', 'test'))"),
      ("data_richiesta", DATA, "NOT NULL"), ("data_registrazione", DATA, ""), ("canale", TESTO, "NOT NULL"), ("settore", TESTO, "NOT NULL"),
      ("data_risposta", DATA, ""), ("data_offerta", DATA, ""), ("esito", TESTO, "NOT NULL"),
      ("voto_facilita", "INT", "CHECK (voto_facilita BETWEEN 1 AND 5)"), ("note", "TEXT", "")] + META, []),
    ("registro", "Registro delle modifiche: chi, quando, cosa",
     [("id", "INT", "PRIMARY KEY"), ("quando", "DATETIME", "NOT NULL"), ("chi", TESTO, "NOT NULL"), ("ruolo", "VARCHAR(16)", ""),
      ("cosa", "TEXT", "NOT NULL"), ("record", "INT", "CHECK (record >= 0)")], []),
    ("archivio_info", "Versione dei dati e contatori per i nuovi id",
     [("chiave", "VARCHAR(64)", "PRIMARY KEY"), ("valore", TESTO, "")], []),
]

# Indici per le ricerche più frequenti (oltre a chiavi primarie ed esterne, che MySQL indicizza da solo)
INDICI = [
    ("opportunita", "perso_il"), ("opportunita", "scadenza_offerta"), ("fasi_opportunita", "data"),
    ("attivita", "data"), ("aziende", "ragione_sociale"), ("referenti", "telefono"), ("partner", "durc_scadenza"),
]


def schema_mysql():
    """Testo SQL che crea tutte le tabelle (MySQL 8 o MariaDB 10.5+), in ordine di dipendenza."""
    righe = ["-- Archivio condiviso del CRM Gate (MySQL 8 / MariaDB 10.5+). Generato da strumenti/archivio.py: non modificarlo a mano.",
             "-- Ogni dato dell'app ha qui la sua colonna; vedi docs/schema-archivio.md.",
             "SET NAMES utf8mb4;", ""]
    for nome, descrizione, colonne, vincoli in TABELLE:
        definizioni = [f"  {c} {t}{(' ' + v) if v else ''}" for c, t, v in colonne] + [f"  {v}" for v in vincoli]
        righe.append(f"-- {descrizione}")
        righe.append(f"CREATE TABLE {nome} (\n" + ",\n".join(definizioni) + "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n")
    for tabella, colonna in INDICI:
        righe.append(f"CREATE INDEX idx_{tabella}_{colonna} ON {tabella} ({colonna});")
    return "\n".join(righe) + "\n"


def colonne_di(tabella):
    """Colonne che si scrivono e si leggono (senza aggiornato_il e le colonne calcolate, che MySQL riempie da solo)."""
    return [c for c, _, v in next(t for t in TABELLE if t[0] == tabella)[2] if c != "aggiornato_il" and not v.startswith("AS (")]


# ------------------------------------------------- Andata: stato dell'app → righe delle tabelle
class CampoSconosciuto(Exception):
    """Un campo dell'app senza colonna nel database: va aggiunto allo schema prima di migrare."""


def controlla(oggetto, ammessi, dove):
    """Ferma tutto se l'oggetto ha un campo che lo schema non conosce."""
    altri = set(oggetto) - set(ammessi)
    if altri:
        raise CampoSconosciuto(f"{dove}: campi senza colonna nel database: {', '.join(sorted(altri))}")


def sn(valore):
    """Sì/no dell'app (true, false o assente) → 1, 0 o NULL."""
    return None if valore is None else int(bool(valore))


def da_stato(stato, utente="migrazione"):
    """Righe di ogni tabella a partire dallo stato dell'app (il backup JSON). utente = aggiornato_da."""
    controlla(stato, ["versione", "aziende", "referenti", "opportunita", "attivita", "contenuti", "richiesteReali", "registro",
                      "contatore", "contatoreId", "ultimoBackup"], "stato")
    t = {nome: [] for nome, *_ in TABELLE}
    for a in stato["aziende"]:
        controlla(a, ["id", "ragioneSociale", "piva", "settore", "comune", "fonte", "note", "creata", "superficie", "tipoCliente"], "azienda " + a["id"])
        t["aziende"].append({"id": a["id"], "ragione_sociale": a["ragioneSociale"], "partita_iva": a.get("piva"), "settore": a.get("settore"),
                             "comune": a.get("comune"), "fonte": a.get("fonte"), "note": a.get("note"), "creata_il": a.get("creata"),
                             "superficie_mq": a.get("superficie"), "tipo_cliente": a.get("tipoCliente"), "aggiornato_da": utente})
    for r in stato["referenti"]:
        controlla(r, ["id", "aziendaId", "nome", "ruolo", "telefono", "email", "canale", "decisore", "privacy", "cancellato"], "referente " + r["id"])
        p = r["privacy"]
        controlla(p, ["base", "data", "raccolta", "opposizione"], "privacy del referente " + r["id"])
        t["referenti"].append({"id": r["id"], "id_azienda": r["aziendaId"], "nome": r["nome"], "ruolo": r.get("ruolo"), "telefono": r.get("telefono"),
                               "email": r.get("email"), "canale_preferito": r.get("canale"), "decisore": sn(r.get("decisore")),
                               "privacy_base": p["base"], "privacy_data": p["data"], "privacy_raccolta": p["raccolta"],
                               "privacy_opposizione": sn(p["opposizione"]), "cancellato": sn(r.get("cancellato")), "aggiornato_da": utente})
    for o in stato["opportunita"]:
        controlla(o, ["id", "codice", "aziendaId", "referenteId", "canale", "comune", "servizio", "ore", "valore", "margine", "capacitaSimulata",
                      "tariffa", "note", "perso", "storico", "proposte", "scadenzaOfferta", "avvio", "allocazione", "dataPrimaRisposta",
                      "dataRegistrazione", "consensoPrivacy", "campagna", "contenuto", "paginaArrivo", "firmaDaLink", "preventivo",
                      "ricontatto", "riaperta", "motivazioneC"], "opportunità " + o["id"])
        perso = o.get("perso") or {}
        controlla(perso, ["data", "motivo", "nota"], "perdita di " + o["id"])
        t["opportunita"].append({"id": o["id"], "codice": o["codice"], "id_azienda": o["aziendaId"], "id_referente": o.get("referenteId"),
                                 "canale": o.get("canale"), "comune": o.get("comune"), "servizio": o["servizio"], "ore_mese": o["ore"],
                                 "valore_annuo": o.get("valore"), "margine": o.get("margine"), "capacita_simulata": o.get("capacitaSimulata"),
                                 "tariffa": o.get("tariffa"), "note": o.get("note"), "scadenza_offerta": o.get("scadenzaOfferta"),
                                 "data_avvio": o.get("avvio"), "riaperta_il": o.get("riaperta"), "motivazione_c": o.get("motivazioneC"),
                                 "data_prima_risposta": o.get("dataPrimaRisposta"), "data_registrazione": o.get("dataRegistrazione"),
                                 "consenso_privacy": sn(o.get("consensoPrivacy")), "campagna": o.get("campagna"), "contenuto": o.get("contenuto"),
                                 "pagina_arrivo": o.get("paginaArrivo"), "firma_da_link": sn(o.get("firmaDaLink")),
                                 "perso_il": perso.get("data"), "motivo_perdita": perso.get("motivo"), "nota_perdita": perso.get("nota"),
                                 "aggiornato_da": utente})
        for fase, data in o["storico"].items():
            t["fasi_opportunita"].append({"id_opportunita": o["id"], "fase": fase, "data": data})
        if o.get("preventivo"):
            controlla(o["preventivo"], ["ambiente", "mq", "frequenza"], "preventivo di " + o["id"])
            t["preventivi"].append({"id_opportunita": o["id"], **o["preventivo"], "aggiornato_da": utente})
        if o.get("ricontatto"):
            controlla(o["ricontatto"], ["data", "nota"], "ricontatto di " + o["id"])
            t["ricontatti"].append({"id_opportunita": o["id"], **o["ricontatto"], "aggiornato_da": utente})
        if o.get("allocazione"):
            x = o["allocazione"]
            controlla(x, ["tipo", "id", "data"], "allocazione di " + o["id"])
            t["allocazioni"].append({"id_opportunita": o["id"], "tipo": x["tipo"], "id_squadra": x.get("id") if x["tipo"] == "squadra" else None,
                                     "id_partner": x.get("id") if x["tipo"] == "partner" else None, "data": x["data"], "aggiornato_da": utente})
        for i, p in enumerate(o.get("proposte") or []):
            controlla(p, ["partnerId", "data", "esito"], "proposta di " + o["id"])
            t["proposte_partner"].append({"id_opportunita": o["id"], "ordine": i, "id_partner": p["partnerId"], "data": p["data"], "esito": p["esito"],
                                          "aggiornato_da": utente})
    for x in stato["attivita"]:
        controlla(x, ["id", "aziendaId", "referenteId", "opportunitaId", "daFare", "automatica", "tipo", "data", "ora", "testo", "fase"], "attività " + x["id"])
        t["attivita"].append({"id": x["id"], "id_azienda": x["aziendaId"], "id_referente": x.get("referenteId"), "id_opportunita": x.get("opportunitaId"),
                              "da_fare": sn(x["daFare"]), "automatica": sn(x.get("automatica")), "tipo": x["tipo"], "data": x["data"], "ora": x.get("ora"),
                              "testo": x["testo"], "fase": x.get("fase"), "aggiornato_da": utente})
    for c in stato.get("contenuti") or []:
        controlla(c, ["id", "data_pubblicazione", "canale", "tema", "settore", "formato"], "contenuto " + c["id"])
        t["contenuti"].append({**c, "aggiornato_da": utente})
    for i, r in enumerate(stato.get("richiesteReali") or []):
        controlla(r, colonne_di("richieste_reali"), f"richiesta reale {i + 1}")
        t["richieste_reali"].append({**r, "id": i + 1, "aggiornato_da": utente})
    for i, r in enumerate(stato.get("registro") or []):
        controlla(r, ["quando", "chi", "ruolo", "cosa", "record"], f"riga {i + 1} del registro")
        t["registro"].append({"id": i + 1, **r, "quando": r["quando"].replace("T", " ")})
    for chiave in ["versione", "contatore", "contatoreId", "ultimoBackup"]:
        t["archivio_info"].append({"chiave": chiave, "valore": None if stato.get(chiave) is None else str(stato[chiave])})
    return t


def da_impostazioni(imp, utente="migrazione"):
    """Righe di dizionari e impostazioni (oggi in config.js e parametri.py), dal file scritto da impostazioniDaSalvare()."""
    controlla(imp, ["squadre", "partner", "servizi", "ambienti", "frequenze", "canali", "settori", "comuni", "motiviPerdita", "varie"], "impostazioni")
    t = {nome: [] for nome, *_ in TABELLE}
    t["settori"] = [{"settore": s, "ordine": i} for i, s in enumerate(imp["settori"])]
    t["comuni"] = [{"comune": c["nome"], "provincia": c["provincia"], "km_da_bari": c["km"], "zona": c["zona"], "ordine": i} for i, c in enumerate(imp["comuni"])]
    t["canali"] = [{"canale": c["canale"], "tipo": c["tipo"], "attivo": sn(c["attivo"]), "gruppo": c["gruppo"], "nota": c.get("nota"), "ordine": i}
                   for i, c in enumerate(imp["canali"])]
    t["motivi_perdita"] = [{"motivo": m, "ordine": i} for i, m in enumerate(imp["motiviPerdita"])]
    for i, s in enumerate(imp["servizi"]):
        controlla(s, ["nome", "tariffa", "costoInterno", "costoPartner"], "servizio " + s["nome"])
        t["servizi"].append({"servizio": s["nome"], "tariffa": s["tariffa"], "costo_interno": s.get("costoInterno"),
                             "costo_partner": s.get("costoPartner"), "ordine": i, "aggiornato_da": utente})
    for i, s in enumerate(imp["squadre"]):
        controlla(s, ["id", "nome", "caposquadra", "zone", "servizi", "oreCapacita", "oreImpegnate"], "squadra " + s["id"])
        t["squadre"].append({"id": s["id"], "nome": s["nome"], "caposquadra": s.get("caposquadra"), "ore_capacita": s["oreCapacita"],
                             "ore_impegnate": s["oreImpegnate"], "ordine": i, "attiva": 1, "aggiornato_da": utente})
        t["squadre_zone"] += [{"id_squadra": s["id"], "zona": z} for z in s["zone"]]
        t["squadre_servizi"] += [{"id_squadra": s["id"], "servizio": x} for x in s["servizi"]]
    for i, p in enumerate(imp["partner"]):
        controlla(p, ["id", "nome", "tipo", "referente", "telefono", "zone", "servizi", "durcScadenza"], "partner " + p["id"])
        t["partner"].append({"id": p["id"], "nome": p["nome"], "tipo": p["tipo"], "referente": p.get("referente"), "telefono": p.get("telefono"),
                             "durc_scadenza": p.get("durcScadenza"), "ordine": i, "attivo": 1, "aggiornato_da": utente})
        t["partner_zone"] += [{"id_partner": p["id"], "zona": z} for z in p["zone"]]
        t["partner_servizi"] += [{"id_partner": p["id"], "servizio": x} for x in p["servizi"]]
    for i, a in enumerate(imp["ambienti"]):
        controlla(a, ["nome", "resaMqOra", "speseDirette"], "ambiente " + a["nome"])
        t["ambienti_preventivo"].append({"ambiente": a["nome"], "resa_mq_ora": a["resaMqOra"], "spese_dirette": a["speseDirette"], "ordine": i,
                                         "aggiornato_da": utente})
    for i, f in enumerate(imp["frequenze"]):
        controlla(f, ["nome", "passaggiSettimana", "sconto"], "frequenza " + f["nome"])
        t["frequenze_preventivo"].append({"frequenza": f["nome"], "passaggi_settimana": f["passaggiSettimana"], "sconto": f["sconto"], "ordine": i,
                                          "aggiornato_da": utente})
    t["impostazioni"] = [{"chiave": k, "valore": json.dumps(v, ensure_ascii=False), "aggiornato_da": utente} for k, v in imp["varie"].items()]
    return t


# --------------------------------------------- Ritorno: righe delle tabelle → stato dell'app
def senza_null(d):
    """Toglie le chiavi senza valore: nell'app un campo assente e un campo null valgono uguale."""
    return {k: v for k, v in d.items() if v is not None}


def booleano(v):
    """1/0 → true/false (NULL resta assente)."""
    return None if v is None else bool(v)


def numero(v):
    """Numero da MySQL: 5.0 torna 5, come nell'app."""
    return int(v) if isinstance(v, float) and v.is_integer() else v


def a_stato(t):
    """Stato dell'app ricostruito dalle righe delle tabelle (lo stesso formato del backup JSON)."""
    fasi, preventivi, ricontatti, allocazioni, proposte = {}, {}, {}, {}, {}
    for r in t["fasi_opportunita"]:
        fasi.setdefault(r["id_opportunita"], {})[r["fase"]] = r["data"]
    for r in t["preventivi"]:
        preventivi[r["id_opportunita"]] = {"ambiente": r["ambiente"], "mq": numero(r["mq"]), "frequenza": r["frequenza"]}
    for r in t["ricontatti"]:
        ricontatti[r["id_opportunita"]] = {"data": r["data"], "nota": r["nota"]}
    for r in t["allocazioni"]:
        allocazioni[r["id_opportunita"]] = senza_null({"tipo": r["tipo"], "id": r["id_squadra"] or r["id_partner"], "data": r["data"]})
    for r in sorted(t["proposte_partner"], key=lambda r: (r["id_opportunita"], r["ordine"])):
        proposte.setdefault(r["id_opportunita"], []).append({"partnerId": r["id_partner"], "data": r["data"], "esito": r["esito"]})
    info = {r["chiave"]: r["valore"] for r in t["archivio_info"]}
    return {
        "versione": int(info["versione"]),
        "aziende": [senza_null({"id": a["id"], "ragioneSociale": a["ragione_sociale"], "piva": a["partita_iva"], "settore": a["settore"],
                                "comune": a["comune"], "fonte": a["fonte"], "note": a["note"], "creata": a["creata_il"],
                                "superficie": numero(a["superficie_mq"]), "tipoCliente": a["tipo_cliente"]}) for a in t["aziende"]],
        "referenti": [senza_null({"id": r["id"], "aziendaId": r["id_azienda"], "nome": r["nome"], "ruolo": r["ruolo"], "telefono": r["telefono"],
                                  "email": r["email"], "canale": r["canale_preferito"], "decisore": booleano(r["decisore"]),
                                  # privacy.data resta anche se null: l'app lo richiede
                                  "privacy": {"base": r["privacy_base"], "data": r["privacy_data"], "raccolta": r["privacy_raccolta"],
                                              "opposizione": bool(r["privacy_opposizione"])},
                                  "cancellato": booleano(r["cancellato"])}) for r in t["referenti"]],
        "opportunita": [senza_null({
            "id": o["id"], "codice": o["codice"], "aziendaId": o["id_azienda"], "referenteId": o["id_referente"], "canale": o["canale"],
            "comune": o["comune"], "servizio": o["servizio"], "ore": numero(o["ore_mese"]), "valore": numero(o["valore_annuo"]),
            "margine": numero(o["margine"]), "capacitaSimulata": numero(o["capacita_simulata"]), "tariffa": numero(o["tariffa"]), "note": o["note"],
            "perso": senza_null({"data": o["perso_il"], "motivo": o["motivo_perdita"], "nota": o["nota_perdita"]}) if o["perso_il"] else None,
            "storico": fasi.get(o["id"], {}), "proposte": proposte.get(o["id"], []), "scadenzaOfferta": o["scadenza_offerta"],
            "avvio": o["data_avvio"], "allocazione": allocazioni.get(o["id"]), "dataPrimaRisposta": o["data_prima_risposta"],
            "dataRegistrazione": o["data_registrazione"], "consensoPrivacy": booleano(o["consenso_privacy"]), "campagna": o["campagna"],
            "contenuto": o["contenuto"], "paginaArrivo": o["pagina_arrivo"], "firmaDaLink": booleano(o["firma_da_link"]),
            "preventivo": preventivi.get(o["id"]), "ricontatto": ricontatti.get(o["id"]), "riaperta": o["riaperta_il"],
            "motivazioneC": o["motivazione_c"]}) for o in t["opportunita"]],
        "attivita": [senza_null({"id": x["id"], "aziendaId": x["id_azienda"], "referenteId": x["id_referente"], "opportunitaId": x["id_opportunita"],
                                 "daFare": bool(x["da_fare"]), "automatica": booleano(x["automatica"]), "tipo": x["tipo"], "data": x["data"],
                                 "ora": x["ora"], "testo": x["testo"], "fase": x["fase"]}) for x in t["attivita"]],
        "contenuti": [{k: c[k] for k in colonne_di("contenuti") if k != "aggiornato_da"} for c in t["contenuti"]],
        # Le righe reali tengono tutte le colonne, anche vuote: l'app le controlla così
        "richiesteReali": [{k: numero(r[k]) for k in colonne_di("richieste_reali") if k not in ("id", "aggiornato_da")}
                           for r in sorted(t["richieste_reali"], key=lambda r: r["id"])],
        "registro": [senza_null({"quando": r["quando"][:16].replace(" ", "T"), "chi": r["chi"], "ruolo": r["ruolo"], "cosa": r["cosa"],
                                 "record": r["record"]}) for r in sorted(t["registro"], key=lambda r: r["id"])],
        "contatore": int(info["contatore"]), "contatoreId": int(info["contatoreId"]),
        "ultimoBackup": info.get("ultimoBackup"),
    }


def a_impostazioni(t):
    """Impostazioni ricostruite dalle tabelle (lo stesso formato di impostazioniDaSalvare() nell'app)."""
    zone = lambda tab, chiave, id_: [r["zona"] for r in t[tab] if r[chiave] == id_]  # noqa: E731
    servizi = lambda tab, chiave, id_: [r["servizio"] for r in t[tab] if r[chiave] == id_]  # noqa: E731
    ordinate = lambda tab: sorted(t[tab], key=lambda r: r["ordine"])  # noqa: E731
    return {
        "squadre": [senza_null({"id": s["id"], "nome": s["nome"], "caposquadra": s["caposquadra"], "zone": zone("squadre_zone", "id_squadra", s["id"]),
                                "servizi": servizi("squadre_servizi", "id_squadra", s["id"]), "oreCapacita": s["ore_capacita"],
                                "oreImpegnate": s["ore_impegnate"]}) for s in ordinate("squadre")],
        "partner": [senza_null({"id": p["id"], "nome": p["nome"], "tipo": p["tipo"], "referente": p["referente"], "telefono": p["telefono"],
                                "zone": zone("partner_zone", "id_partner", p["id"]), "servizi": servizi("partner_servizi", "id_partner", p["id"]),
                                "durcScadenza": p["durc_scadenza"]}) for p in ordinate("partner")],
        "servizi": [senza_null({"nome": s["servizio"], "tariffa": numero(s["tariffa"]), "costoInterno": numero(s["costo_interno"]),
                                "costoPartner": numero(s["costo_partner"])}) for s in ordinate("servizi")],
        "ambienti": [{"nome": a["ambiente"], "resaMqOra": numero(a["resa_mq_ora"]), "speseDirette": numero(a["spese_dirette"])} for a in ordinate("ambienti_preventivo")],
        "frequenze": [{"nome": f["frequenza"], "passaggiSettimana": f["passaggi_settimana"], "sconto": numero(f["sconto"])} for f in ordinate("frequenze_preventivo")],
        "canali": [senza_null({"canale": c["canale"], "tipo": c["tipo"], "attivo": bool(c["attivo"]), "gruppo": c["gruppo"], "nota": c["nota"]})
                   for c in ordinate("canali")],
        "settori": [s["settore"] for s in ordinate("settori")],
        "comuni": [{"nome": c["comune"], "provincia": c["provincia"], "km": c["km_da_bari"], "zona": c["zona"]} for c in ordinate("comuni")],
        "motiviPerdita": [m["motivo"] for m in ordinate("motivi_perdita")],
        "varie": {r["chiave"]: json.loads(r["valore"]) for r in t["impostazioni"]},
    }


# ---------------------------------------------------------- Testo SQL degli INSERT
def valore_sql(v):
    """Valore Python → letterale MySQL (testo con apici raddoppiati e barre protette)."""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return str(int(v))
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"


def insert_sql(tabelle):
    """INSERT di tutte le righe, nell'ordine delle tabelle (prima quelle a cui le altre fanno riferimento)."""
    righe = ["SET NAMES utf8mb4;", "START TRANSACTION;"]
    for nome, *_ in TABELLE:
        colonne = colonne_di(nome)
        for i in range(0, len(tabelle[nome]), 200):   # blocchi da 200 righe
            blocco = tabelle[nome][i:i + 200]
            valori = ",\n  ".join("(" + ", ".join(valore_sql(r.get(c)) for c in colonne) + ")" for r in blocco)
            righe.append(f"INSERT INTO {nome} ({', '.join(colonne)}) VALUES\n  {valori};")
    righe.append("COMMIT;")
    return "\n".join(righe) + "\n"


def unisci(*gruppi):
    """Unisce le righe di più gruppi di tabelle (impostazioni + dati)."""
    return {nome: [r for g in gruppi for r in g[nome]] for nome, *_ in TABELLE}


if __name__ == "__main__":
    comando = sys.argv[1] if len(sys.argv) > 1 else ""
    if comando == "schema":
        destinazione = CARTELLA / "data" / "archivio_mysql.sql"
        destinazione.write_text(schema_mysql(), encoding="utf-8")
        print(f"Creato {destinazione} ({len(TABELLE)} tabelle)")
    elif comando == "esporta" and len(sys.argv) >= 3:
        stato = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
        imp = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8")) if len(sys.argv) > 3 else None
        tabelle = unisci(da_impostazioni(imp), da_stato(stato)) if imp else da_stato(stato)
        sys.stdout.write(insert_sql(tabelle))
    else:
        print(__doc__)
