"""
GENERATORE DI DATI FITTIZI PER IL DATABASE DI PROVA DI GATE
Crea data/gate.db (SQLite), un CSV per tabella in data/csv/, la copia per MySQL (data/gate_mysql.sql)
e i dati per l'app (js/dati-db.js): app e database leggono gli stessi dati.
Solo libreria standard di Python; con lo stesso seme (parametri.py) produce sempre gli stessi dati.
La tabella richieste_reali (dati veri importati) viene conservata.
Uso: python3 generatore/genera_dati.py
"""

import csv
import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path

import esporta
import kpi_catalogo
import parametri as P

CARTELLA = Path(__file__).resolve().parent.parent / "data"
RIF = date.fromisoformat(P.DATA_RIFERIMENTO)
rnd = random.Random(P.SEME)
SOGLIA = {f: g for f, _, _, g in P.FASI}   # giorni oltre i quali una trattativa è ferma

SCHEMA = """
CREATE TABLE clienti (
  id_cliente INTEGER PRIMARY KEY, nome TEXT, settore TEXT, provincia TEXT, comune TEXT,
  km_da_bari INTEGER, superficie_mq INTEGER, tipo_cliente TEXT
);
CREATE TABLE referenti (
  id_referente INTEGER PRIMARY KEY, id_cliente INTEGER REFERENCES clienti(id_cliente), nome TEXT, ruolo TEXT,
  decisore INTEGER, email TEXT, telefono TEXT, base_giuridica TEXT, modo_raccolta TEXT
);
CREATE TABLE commerciali (id_commerciale INTEGER PRIMARY KEY, nome TEXT, tipo TEXT);
CREATE TABLE opportunita (
  id_opp INTEGER PRIMARY KEY, id_cliente INTEGER REFERENCES clienti(id_cliente),
  id_commerciale INTEGER REFERENCES commerciali(id_commerciale), id_referente INTEGER REFERENCES referenti(id_referente),
  canale TEXT, servizio TEXT, fase TEXT, valore_annuo REAL, margine_pct REAL, ore_mese_stimate REAL,
  data_contatto TEXT, data_ultima_modifica TEXT, data_chiusura TEXT, motivo_perdita TEXT,
  punteggio_coerenza INTEGER, classe_coerenza TEXT,
  data_prima_risposta TEXT, data_registrazione TEXT, consenso_privacy INTEGER,
  campagna TEXT, contenuto TEXT, pagina_arrivo TEXT
);
CREATE TABLE fasi (fase TEXT PRIMARY KEY, ordine INTEGER, probabilita REAL, giorni_soglia INTEGER);
CREATE TABLE storico_fasi (
  id_evento INTEGER PRIMARY KEY, id_opp INTEGER REFERENCES opportunita(id_opp), fase TEXT, data_ingresso TEXT
);
CREATE TABLE offerte (
  id_offerta INTEGER PRIMARY KEY, id_opp INTEGER REFERENCES opportunita(id_opp), versione INTEGER, data_invio TEXT,
  importo_annuo REAL, margine_pct_previsto REAL, esito TEXT, data_esito TEXT, firma_da_link INTEGER
);
CREATE TABLE attivita (
  id_attivita INTEGER PRIMARY KEY, id_opp INTEGER REFERENCES opportunita(id_opp),
  id_commerciale INTEGER REFERENCES commerciali(id_commerciale), tipo TEXT, data TEXT, esito TEXT
);
CREATE TABLE costi_canale (canale TEXT, mese TEXT, costo REAL);
CREATE TABLE canali (canale TEXT PRIMARY KEY, tipo TEXT, attivo INTEGER, nota TEXT);
CREATE TABLE contenuti (
  id TEXT PRIMARY KEY, data_pubblicazione TEXT, canale TEXT REFERENCES canali(canale), tema TEXT, settore TEXT, formato TEXT
);
CREATE TABLE kpi_catalogo (
  codice TEXT PRIMARY KEY, nome TEXT, domanda_business TEXT, formula TEXT, livello_anthony TEXT, tipo TEXT,
  processo_apqc TEXT, soglia TEXT, dati_necessari TEXT, fonte TEXT
);
CREATE TABLE richieste_reali (
  id INTEGER PRIMARY KEY, fonte TEXT, data_richiesta TEXT, data_registrazione TEXT, canale TEXT, settore TEXT,
  data_risposta TEXT, data_offerta TEXT, esito TEXT, voto_facilita INTEGER, note TEXT
);
"""

# Nomi chiaramente inventati
NOMI_SETTORE = {
    "uffici e commercio": ["Studio Legale", "Studio Commercialisti", "Studio Tecnico", "Agenzia", "Centro Uffici", "Negozio"],
    "GDO": ["Supermercato", "Discount", "Centro Commerciale", "Magazzino"],
    "industria": ["Officine", "Stabilimento", "Laboratorio", "Manifattura"],
    "ricettivo": ["Hotel", "B&B", "Residence", "Ristorante"],
    "sanità": ["Poliambulatorio", "Studio Medico", "Clinica", "Laboratorio Analisi"],
    "trasporti": ["Autotrasporti", "Deposito", "Logistica", "Autostazione"],
    "enti pubblici": ["Ente", "Consorzio", "Istituto", "Ufficio Comunale"],
}
NOMI_FANTASIA = ["Alfa", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda", "Mu",
                 "Nu", "Xi", "Omicron", "Pi", "Rho", "Sigma", "Tau", "Ypsilon", "Phi", "Chi", "Psi", "Omega",
                 "Aurora", "Levante", "Ponente", "Orione", "Vega", "Sirio"]
NOMI_PERSONA = ["Anna", "Marco", "Giulia", "Paolo", "Sara", "Luca", "Elena", "Davide", "Chiara", "Fabio",
                "Laura", "Roberto", "Silvia", "Andrea", "Marta", "Giorgio", "Irene", "Nadia", "Enrico", "Simona"]
RUOLI = ["titolare", "socio amministratore", "facility manager", "responsabile acquisti", "segreteria",
         "direttore", "office manager", "responsabile di sede"]
ESITI_ATTIVITA = {
    "chiamata": ["interessato", "richiamare", "chiesto preventivo", "nessuna risposta"],
    "email": ["inviata", "risposta ricevuta", "in attesa di risposta"],
    "WhatsApp": ["letto", "risposto", "in attesa di risposta"],
    "visita": ["incontro svolto", "rinviata"],
    "sopralluogo": ["svolto"],
}


def scegli_pesato(valori, pesi):
    """Un valore a caso secondo i pesi."""
    return rnd.choices(valori, weights=pesi, k=1)[0]


def data_a_caso(da, a):
    """Una data a caso tra due date, più frequente verso la fine (H5: i contatti crescono con la campagna del pilota)."""
    return da + timedelta(days=round((a - da).days * rnd.random() ** (1 / P.CRESCITA_CONTATTI)))


def genera_clienti():
    """120 clienti: il 40% nel pilota (uffici e commercio a BA), più alcuni doppioni scritti in modo diverso."""
    clienti, usati = [], set()
    n_unici = P.N_CLIENTI - P.N_CLIENTI_DUPLICATI
    n_pilota = round(P.N_CLIENTI * P.QUOTA_CLIENTI_PILOTA) - P.N_CLIENTI_DUPLICATI   # i doppioni sono del pilota
    for i in range(1, n_unici + 1):
        if i <= n_pilota:
            settore, provincia = P.SETTORE_PILOTA, "BA"
        else:
            settore = rnd.choice(P.SETTORI)
            provincia = scegli_pesato(list(P.PROVINCE), list(P.PROVINCE.values()))
            while settore == P.SETTORE_PILOTA and provincia == "BA":   # la quota del pilota resta quella voluta
                provincia = scegli_pesato(list(P.PROVINCE), list(P.PROVINCE.values()))
        nome = rnd.choice(NOMI_SETTORE[settore]) + " " + rnd.choice(NOMI_FANTASIA)
        while nome in usati:   # nomi tutti diversi
            nome = rnd.choice(NOMI_SETTORE[settore]) + " " + rnd.choice(NOMI_FANTASIA)
        usati.add(nome)
        comune, km, _ = rnd.choice(P.COMUNI[provincia])
        pubblico = settore == "enti pubblici" or (settore == "sanità" and rnd.random() < 0.4)
        superficie = None if rnd.random() < P.QUOTA_SUPERFICIE_VUOTA else rnd.randrange(80, 3000, 10)
        clienti.append({"id_cliente": i, "nome": nome, "settore": settore, "provincia": provincia, "comune": comune,
                        "km_da_bari": km, "superficie_mq": superficie, "tipo_cliente": "pubblico" if pubblico else "privato"})
    # Doppioni voluti: stesso cliente con il nome scritto diversamente
    for j, originale in enumerate(rnd.sample(clienti[:n_pilota], P.N_CLIENTI_DUPLICATI)):
        copia = dict(originale, id_cliente=n_unici + j + 1, nome=originale["nome"] + [" S.r.l.", " srl", "  ", " (sede)"][j % 4])
        clienti.append(copia)
    return clienti


def genera_referenti(clienti):
    """1 o 2 referenti per cliente; il primo spesso è il decisore. Alcune email e telefoni mancano (anomalie)."""
    referenti = []
    for c in clienti:
        quanti = 2 if rnd.random() < P.QUOTA_CLIENTI_DUE_REFERENTI else 1
        for k in range(quanti):
            nome = rnd.choice(NOMI_PERSONA) + " " + chr(65 + rnd.randint(0, 25)) + "."
            id_r = len(referenti) + 1
            email = None if rnd.random() < P.QUOTA_EMAIL_VUOTE else f"referente{id_r}@cliente{c['id_cliente']}.example"
            telefono = None if rnd.random() < P.QUOTA_TELEFONI_VUOTI else f"+39 300 000 {id_r:04d}"
            referenti.append({"id_referente": id_r, "id_cliente": c["id_cliente"], "nome": nome,
                              "ruolo": rnd.choice(RUOLI), "decisore": 1 if (k == 0 and rnd.random() < 0.7) else 0,
                              "email": email, "telefono": telefono,
                              "base_giuridica": scegli_pesato(P.BASI_GIURIDICHE, [0.35, 0.40, 0.10, 0.15]),
                              "modo_raccolta": rnd.choice(P.MODI_RACCOLTA)})
    return referenti


def punti(valore, peso):
    """Punti di un criterio arrotondati come nell'app (7,5 diventa 8)."""
    return int(valore * peso + 0.5)


def punteggio(cliente, margine, valore, ha_decisore):
    """Punteggio di coerenza 0-100 con i pesi del prototipo, la classe A/B/C e la capacità simulata (0, 0,5 o 1)."""
    w = P.PESI
    settore = 1 if cliente["settore"] == P.SETTORE_PILOTA else P.SETTORE_FUORI_PILOTA
    km = cliente["km_da_bari"]
    distanza = 1 if km <= P.DISTANZA_PIENA else 0.5 if km <= P.DISTANZA_META else 0
    capacita = scegli_pesato([v for v, _ in P.CAPACITA_SIMULATA], [p for _, p in P.CAPACITA_SIMULATA])
    marg = 1 if margine >= P.MARGINE_PIENO else 0.5 if margine >= P.MARGINE_META else 0
    dim = 1 if P.DIMENSIONE_PIENA[0] <= valore <= P.DIMENSIONE_PIENA[1] else \
        0.5 if P.DIMENSIONE_META[0] <= valore <= P.DIMENSIONE_META[1] else 0
    totale = (punti(settore, w["settore"]) + punti(distanza, w["distanza"]) + punti(capacita, w["capacita"])
              + punti(marg, w["margine"]) + punti(dim, w["dimensione"]) + punti(1 if ha_decisore else 0, w["decisore"]))
    return totale, "A" if totale >= 75 else "B" if totale >= 50 else "C", capacita


def simula_percorso(opp, cliente, inizio):
    """Fa avanzare l'opportunità tra le fasi: restituisce gli eventi [(fase, data)] e l'eventuale motivo di perdita."""
    fasi = ["contatto", "qualificato", "sopralluogo", "offerta", "contratto"]
    eventi = [("contatto", inizio)]
    fattore = 1 + P.EFFETTO_PUNTEGGIO * (opp["punteggio_coerenza"] - 60) / 40
    if opp["canale"] == "LinkedIn" and cliente["settore"] == P.SETTORE_PILOTA:
        fattore *= P.BOOST_LINKEDIN_UFFICI
    for i in range(4):
        fase = fasi[i]
        giorno = eventi[-1][1] + timedelta(days=rnd.randint(*P.GIORNI_IN_FASE[fase]))
        if giorno > RIF:
            return eventi, None                       # non è ancora successo nulla: resta aperta
        if rnd.random() < min(0.97, P.PASSAGGIO_PER_CANALE[opp["canale"]][i] * fattore):
            eventi.append((fasi[i + 1], giorno))
            continue
        if rnd.random() < P.PROBABILITA_PERSA_SE_NON_PASSA:
            # La perdita si registra solo dopo che la trattativa è rimasta ferma oltre la soglia della fase
            perso_il = eventi[-1][1] + timedelta(days=SOGLIA[fase] + rnd.randint(*P.GIORNI_PRIMA_DI_PERDERE))
            if perso_il > RIF:
                return eventi, None                   # non ancora registrata: resta aperta
            motivo = scegli_pesato(P.MOTIVI_PERDITA, P.MOTIVI_PER_FASE[fase])
            if cliente["km_da_bari"] > 60 and rnd.random() < 0.5:
                motivo = "fuori zona"
            eventi.append(("perso", perso_il))
            return eventi, motivo
        return eventi, None                           # né avanti né persa: resta aperta
    return eventi, None


def genera():
    clienti = genera_clienti()
    referenti = genera_referenti(clienti)
    commerciali = [{"id_commerciale": i, "nome": f"Commerciale {i}", "tipo": "interno"} for i in (1, 2, 3)]
    commerciali.append({"id_commerciale": 4, "nome": "Intermediario Delta", "tipo": "intermediario"})
    ref_per_cliente = {}
    for r in referenti:
        ref_per_cliente.setdefault(r["id_cliente"], []).append(r)

    # I clienti del pilota ricevono più opportunità; i doppioni ne hanno al massimo una
    pesi_clienti = [3 if c["settore"] == P.SETTORE_PILOTA and c["provincia"] == "BA" else 1 for c in clienti]
    for k in range(P.N_CLIENTI - P.N_CLIENTI_DUPLICATI, P.N_CLIENTI):
        pesi_clienti[k] = 0.2

    opportunita, storico, eventi_opp = [], [], {}
    da, a = date.fromisoformat(P.CONTATTI_DAL), date.fromisoformat(P.CONTATTI_AL)
    for id_opp in range(1, P.N_OPPORTUNITA + 1):
        cliente = rnd.choices(clienti, weights=pesi_clienti, k=1)[0]
        canale = scegli_pesato(P.CANALI, [P.PESO_CANALI[c] for c in P.CANALI])
        commerciale = 4 if canale == "intermediario" else rnd.randint(1, 3)
        refs = ref_per_cliente[cliente["id_cliente"]]
        referente = rnd.choice(refs)
        servizio = scegli_pesato(P.SERVIZI, P.SERVIZIO_PER_SETTORE[cliente["settore"]])
        eco = P.SERVIZI_ECONOMIA[servizio]
        ore = rnd.randint(*eco["ore"])
        valore = round(ore * 12 * eco["tariffa"] * rnd.uniform(0.9, 1.1), 2)
        margine = round(max(0.02, rnd.gauss(eco["margine"], eco["variabilita"]) + P.MARGINE_PER_CANALE[canale]), 3)
        ha_decisore = any(r["decisore"] for r in refs)
        totale, classe, capacita = punteggio(cliente, margine, valore, ha_decisore)
        opp = {"id_opp": id_opp, "id_cliente": cliente["id_cliente"], "id_commerciale": commerciale,
               "id_referente": referente["id_referente"], "canale": canale, "servizio": servizio, "fase": None,
               "valore_annuo": valore, "margine_pct": margine,
               "ore_mese_stimate": None if rnd.random() < P.QUOTA_ORE_VUOTE else float(ore),
               "data_contatto": data_a_caso(da, a), "data_ultima_modifica": None, "data_chiusura": None,
               "motivo_perdita": None, "punteggio_coerenza": totale, "classe_coerenza": classe,
               "data_prima_risposta": None, "data_registrazione": None, "consenso_privacy": 0,
               "campagna": None, "contenuto": None, "pagina_arrivo": None, "_capacita": capacita}
        eventi, motivo = simula_percorso(opp, cliente, opp["data_contatto"])
        opp["motivo_perdita"] = motivo
        eventi_opp[id_opp] = eventi
        opportunita.append(opp)

    # Aperte ferme: se ne tiene circa il 12,5% delle aperte; le altre ferme vengono chiuse come perse (motivo tipico della fase)
    soglia = {f: g for f, _, _, g in P.FASI}
    aperte = [o for o in opportunita if eventi_opp[o["id_opp"]][-1][0] not in ("contratto", "perso")]
    ferme = [o for o in aperte if (RIF - eventi_opp[o["id_opp"]][-1][1]).days > soglia[eventi_opp[o["id_opp"]][-1][0]]]
    fresche = len(aperte) - len(ferme)
    da_tenere = round(P.QUOTA_FERME_SU_APERTE * fresche / (1 - P.QUOTA_FERME_SU_APERTE))
    rnd.shuffle(ferme)
    for o in ferme[da_tenere:]:
        ultima_fase, ultima_data = eventi_opp[o["id_opp"]][-1]
        chiusura = min(RIF, ultima_data + timedelta(days=soglia[ultima_fase] + rnd.randint(1, 20)))
        eventi_opp[o["id_opp"]].append(("perso", chiusura))
        o["motivo_perdita"] = scegli_pesato(P.MOTIVI_PERDITA, P.MOTIVI_PER_FASE[ultima_fase])

    # Fase attuale, date e storico coerenti con gli eventi
    for o in opportunita:
        eventi = eventi_opp[o["id_opp"]]
        o["fase"] = eventi[-1][0]
        o["data_ultima_modifica"] = eventi[-1][1].isoformat()
        o["data_chiusura"] = eventi[-1][1].isoformat() if o["fase"] in ("contratto", "perso") else None
        # Prima risposta di Gate: 0-6 giorni dopo la richiesta, mai dopo il passo successivo né dopo il riferimento
        ritardo = scegli_pesato(list(range(len(P.RITARDO_PRIMA_RISPOSTA))), P.RITARDO_PRIMA_RISPOSTA)
        limite = eventi[1][1] if len(eventi) > 1 else RIF
        o["data_prima_risposta"] = min(o["data_contatto"] + timedelta(days=ritardo), limite, RIF).isoformat()
        o["data_contatto"] = o["data_contatto"].isoformat()
        for fase, giorno in eventi:
            storico.append({"id_evento": len(storico) + 1, "id_opp": o["id_opp"], "fase": fase, "data_ingresso": giorno.isoformat()})

    assegna_contenuti(opportunita)
    offerte, attivita = genera_offerte_attivita(opportunita, eventi_opp)

    # Costi mensili per canale (gennaio-ottobre 2026)
    costi = []
    for canale in P.CANALI:
        base, var = P.COSTI_MENSILI[canale]
        for mese in range(1, 11):
            costi.append({"canale": canale, "mese": f"2026-{mese:02d}", "costo": round(base * rnd.uniform(1 - var, 1 + var), 2)})

    fasi = [{"fase": f, "ordine": o, "probabilita": p, "giorni_soglia": g} for f, o, p, g in P.FASI]
    canali = [{"canale": c, "tipo": t, "attivo": a, "nota": n} for c, t, a, n in P.CANALI_DIZIONARIO]
    contenuti = [{"id": i, "data_pubblicazione": d, "canale": c, "tema": t, "settore": st, "formato": f}
                 for i, d, c, t, st, f, _ in P.CONTENUTI]
    return {"clienti": clienti, "referenti": referenti, "commerciali": commerciali, "opportunita": opportunita,
            "fasi": fasi, "storico_fasi": storico, "offerte": offerte, "attivita": attivita, "costi_canale": costi,
            "canali": canali, "contenuti": contenuti, "kpi_catalogo": kpi_catalogo.righe()}


def assegna_contenuti(opportunita):
    """Al 30% delle opportunità da sito web e LinkedIn assegna campagna, contenuto e pagina di arrivo (contenuti già pubblicati)."""
    candidate = []
    for o in opportunita:
        adatti = [c for c in P.CONTENUTI if c[2] == o["canale"] and c[1] <= o["data_contatto"]]
        if adatti:
            candidate.append((o, adatti))
    totale = sum(1 for o in opportunita if o["canale"] in ("sito web", "LinkedIn"))
    for o, adatti in rnd.sample(candidate, min(len(candidate), round(P.QUOTA_CON_CONTENUTO * totale))):
        c = rnd.choice(adatti)
        o["campagna"], o["contenuto"], o["pagina_arrivo"] = P.CAMPAGNA_PILOTA, c[0], c[6]


def genera_offerte_attivita(opportunita, eventi_opp):
    """Offerte solo per chi è arrivato in fase offerta; un'attività per ogni passaggio, un sopralluogo per ogni ingresso in sopralluogo."""
    offerte, attivita = [], []
    tipo_per_fase = {"contatto": ["chiamata", "email"], "qualificato": ["chiamata", "WhatsApp"],
                     "sopralluogo": ["sopralluogo"], "offerta": ["email"], "contratto": ["visita"]}
    for o in opportunita:
        eventi = eventi_opp[o["id_opp"]]
        for n, (fase, giorno) in enumerate(eventi):
            if fase == "perso":
                continue
            tipo = rnd.choice(tipo_per_fase[fase])
            attivita.append({"id_attivita": len(attivita) + 1, "id_opp": o["id_opp"], "id_commerciale": o["id_commerciale"],
                             "tipo": tipo, "data": giorno.isoformat(), "esito": rnd.choice(ESITI_ATTIVITA[tipo])})
            # Un contatto di sollecito tra due passaggi (mai dopo l'ultimo evento, così l'ultima modifica resta quella dello storico)
            if n + 1 < len(eventi) and (eventi[n + 1][1] - giorno).days >= 3 and rnd.random() < 0.5:
                giorno_mezzo = giorno + timedelta(days=rnd.randint(1, (eventi[n + 1][1] - giorno).days - 1))
                tipo2 = rnd.choice(["chiamata", "email", "WhatsApp"])
                attivita.append({"id_attivita": len(attivita) + 1, "id_opp": o["id_opp"], "id_commerciale": o["id_commerciale"],
                                 "tipo": tipo2, "data": giorno_mezzo.isoformat(), "esito": rnd.choice(ESITI_ATTIVITA[tipo2])})
        fasi = [f for f, _ in eventi]
        if "offerta" not in fasi:
            continue
        invio = eventi[fasi.index("offerta")][1]
        fine = eventi[-1][1] if o["fase"] in ("contratto", "perso") else None
        versioni = 2 if (fine and (fine - invio).days >= 6 and rnd.random() < 0.25) else 1
        for v in range(1, versioni + 1):
            ultima = v == versioni
            data_invio = invio if v == 1 else invio + timedelta(days=rnd.randint(2, (fine - invio).days - 2))
            importo = round(o["valore_annuo"] * (1 if v == 1 else 0.95), 2)
            if not ultima:
                esito, data_esito = "rifiutata", data_invio + timedelta(days=1)
            elif o["fase"] == "contratto":
                esito, data_esito = "firmata", fine
            elif o["fase"] == "perso":
                esito = "scaduta" if o["motivo_perdita"] == "nessuna risposta" else "rifiutata"
                data_esito = fine
            else:
                esito, data_esito = "aperta", None
            offerte.append({"id_offerta": len(offerte) + 1, "id_opp": o["id_opp"], "versione": v,
                            "data_invio": data_invio.isoformat(), "importo_annuo": importo,
                            "margine_pct_previsto": o["margine_pct"], "esito": esito,
                            "data_esito": data_esito.isoformat() if data_esito else None, "firma_da_link": 0})
    attivita.sort(key=lambda x: (x["data"], x["id_opp"]))
    for i, x in enumerate(attivita, 1):
        x["id_attivita"] = i
    return offerte, attivita


def salva(tabelle):
    """Scrive il database SQLite (conservando richieste_reali), un CSV per tabella, la copia MySQL e i dati dell'app."""
    CARTELLA.mkdir(exist_ok=True)
    (CARTELLA / "csv").mkdir(exist_ok=True)
    db = CARTELLA / "gate.db"
    reali = []
    if db.exists():
        vecchio = sqlite3.connect(db)
        try:
            vecchio.row_factory = sqlite3.Row
            reali = [dict(r) for r in vecchio.execute("SELECT * FROM richieste_reali ORDER BY id")]
        except sqlite3.Error:
            reali = []   # database di una versione precedente, senza dati reali
        vecchio.close()
        db.unlink()
    con = sqlite3.connect(db)
    con.executescript(SCHEMA)
    tabelle["richieste_reali"] = reali
    for nome, righe in tabelle.items():
        colonne = [c for c in righe[0].keys() if not c.startswith("_")] if righe else \
            [r[1] for r in con.execute(f"PRAGMA table_info({nome})")]
        con.executemany(f"INSERT INTO {nome} ({', '.join(colonne)}) VALUES ({', '.join('?' * len(colonne))})",
                        [tuple(r[c] for c in colonne) for r in righe])
        with open(CARTELLA / "csv" / f"{nome}.csv", "w", newline="", encoding="utf-8") as f:
            scrittore = csv.DictWriter(f, fieldnames=colonne, extrasaction="ignore")
            scrittore.writeheader()
            scrittore.writerows(righe)
    con.commit()
    capacita = {o["id_opp"]: o["_capacita"] for o in tabelle["opportunita"]}
    esporta.tutto(con, capacita)
    con.close()
    kpi_catalogo.scrivi_markdown(CARTELLA.parent / "docs" / "kpi.md")
    print(f"Creato {db}, {len(tabelle)} CSV in {CARTELLA / 'csv'}, data/gate_mysql.sql, js/dizionari.js, js/dati-db.js e docs/kpi.md")


if __name__ == "__main__":
    salva(genera())
