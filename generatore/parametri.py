"""
PARAMETRI DEL GENERATORE DI DATI FITTIZI (Gate S.R.L.)
Tutte le ipotesi stanno qui: per cambiare i dati basta cambiare questo file e rilanciare genera_dati.py.
Con lo stesso SEME i dati generati sono sempre identici.
"""

SEME = 20261019                      # seme fisso: stessi dati a ogni esecuzione
DATA_RIFERIMENTO = "2026-10-19"      # "oggi" per calcolare le opportunità ferme
CONTATTI_DAL = "2026-01-01"          # periodo delle date di primo contatto
CONTATTI_AL = "2026-10-15"
# H5 – i nuovi contatti crescono di mese in mese (campagna del pilota).
# Esponente della crescita: 1 = contatti distribuiti in modo uniforme; più è alto, più i contatti si concentrano verso la fine
# (con 3,5 circa i due terzi dei contatti arrivano da agosto in poi: è il periodo della campagna del pilota)
CRESCITA_CONTATTI = 3.5

# ------------------------------------------------------------------ Volumi
N_CLIENTI = 120
QUOTA_CLIENTI_PILOTA = 0.40          # clienti "uffici e commercio" in provincia di BA
QUOTA_CLIENTI_DUE_REFERENTI = 0.50   # ~180 referenti in totale
N_OPPORTUNITA = 300
QUOTA_FERME_SU_APERTE = 0.125        # obiettivo 10-15% di aperte ferme oltre la soglia

# ------------------------------------------------------------------ Domini
SETTORI = ["uffici e commercio", "GDO", "industria", "ricettivo", "sanità", "trasporti", "enti pubblici"]
SETTORE_PILOTA = "uffici e commercio"
PROVINCE = {"BA": 0.55, "BT": 0.10, "BR": 0.08, "FG": 0.09, "LE": 0.08, "TA": 0.10}
SERVIZI = ["cleaning e hospitality", "logistica e retail", "servizi alle strutture"]
# Canali usati dal generatore storico (i 6 dello schema v0); il dizionario completo è CANALI_DIZIONARIO più sotto
CANALI = ["portale gare", "porta a porta", "intermediario", "sito web", "LinkedIn", "passaparola"]
MOTIVI_PERDITA = ["prezzo", "tempi di avvio", "fuori zona", "capacità insufficiente", "nessuna risposta", "altro"]
BASI_GIURIDICHE = ["consenso", "legittimo interesse B2B", "contratto in corso", "da verificare"]
MODI_RACCOLTA = ["a voce", "modulo del sito", "email", "biglietto da visita"]

# Fasi: ordine, probabilità di chiusura (per il margine atteso), giorni oltre i quali una trattativa è ferma
FASI = [
    ("contatto", 1, 0.05, 7),
    ("qualificato", 2, 0.15, 14),
    ("sopralluogo", 3, 0.35, 14),
    ("offerta", 4, 0.55, 21),
    ("contratto", 5, 1.0, None),
    ("perso", 9, 0.0, None),
]

# Comuni per provincia: (comune, km indicativi da Bari, zona operativa usata dall'app per squadre e partner)
COMUNI = {
    "BA": [("Bari", 0, "Bari città"), ("Modugno", 11, "Area Nord"), ("Triggiano", 10, "Area Sud-Est"),
           ("Capurso", 12, "Area Sud-Est"), ("Valenzano", 13, "Area Sud-Est"), ("Noicattaro", 17, "Area Sud-Est"),
           ("Bitonto", 19, "Area Nord"), ("Casamassima", 20, "Area Sud-Est"), ("Giovinazzo", 21, "Area Nord"),
           ("Mola di Bari", 22, "Area Sud-Est"), ("Molfetta", 29, "Area Nord"), ("Conversano", 31, "Area Sud-Est"),
           ("Gioia del Colle", 41, "Murgia"), ("Monopoli", 44, "Area Sud-Est"), ("Altamura", 46, "Murgia")],
    "BT": [("Bisceglie", 37, "BAT"), ("Trani", 45, "BAT"), ("Andria", 57, "BAT"), ("Barletta", 58, "BAT")],
    "BR": [("Fasano", 60, "Brindisi e provincia"), ("Ostuni", 82, "Brindisi e provincia"), ("Brindisi", 114, "Brindisi e provincia")],
    "FG": [("Cerignola", 96, "Foggia e provincia"), ("Foggia", 132, "Foggia e provincia"), ("San Severo", 160, "Foggia e provincia")],
    "LE": [("Lecce", 152, "Lecce e provincia"), ("Nardò", 175, "Lecce e provincia")],
    "TA": [("Martina Franca", 74, "Taranto e provincia"), ("Massafra", 76, "Taranto e provincia"), ("Taranto", 94, "Taranto e provincia")],
}

# Servizio più probabile per settore (pesi sui 3 servizi, nell'ordine di SERVIZI)
SERVIZIO_PER_SETTORE = {
    "uffici e commercio": [0.75, 0.05, 0.20],
    "GDO": [0.30, 0.60, 0.10],
    "industria": [0.40, 0.30, 0.30],
    "ricettivo": [0.70, 0.05, 0.25],
    "sanità": [0.75, 0.05, 0.20],
    "trasporti": [0.40, 0.40, 0.20],
    "enti pubblici": [0.50, 0.05, 0.45],
}

# Servizi: tariffa oraria di vendita (€), ore al mese (min, max), margine medio e sua variabilità
SERVIZI_ECONOMIA = {
    "cleaning e hospitality": {"tariffa": 22, "ore": (12, 160), "margine": 0.19, "variabilita": 0.05},
    "logistica e retail": {"tariffa": 21, "ore": (40, 320), "margine": 0.14, "variabilita": 0.04},
    "servizi alle strutture": {"tariffa": 30, "ore": (8, 80), "margine": 0.22, "variabilita": 0.06},
}

# Gruppi di canale (modifica 1 del 20/10): i 7 valori usati da filtri, dashboard e import CSV,
# ognuno con il canale che lo rappresenta quando un CSV indica solo il gruppo
GRUPPI_CANALI = {"sito": "sito web", "LinkedIn": "LinkedIn", "telefono": "telefono", "email": "email",
                 "passaparola": "passaparola", "portale/gara": "portale gare", "altro": "contatto diretto"}

# Dizionario unico dei canali (tabella canali del database e menu dell'app): (canale, tipo, attivo, gruppo, nota).
# Tipo: digitale, diretto, intermediato, gara. I canali spenti non compaiono nei menu né nei costi dell'app.
CANALI_DIZIONARIO = [
    ("sito web", "digitale", 1, "sito", "sito gatesrl.it (confermato)"),
    ("modulo sito", "digitale", 1, "sito", "modulo «Richiedi un sopralluogo» aperto senza link tracciato"),
    ("profilo Google", "digitale", 1, "sito", "scheda dell'azienda su Google"),
    ("LinkedIn", "digitale", 1, "LinkedIn", "pagina aziendale e profili dei commerciali (confermato)"),
    ("WhatsApp Business", "digitale", 1, "telefono", "richieste arrivate direttamente su WhatsApp"),
    ("telefono", "diretto", 1, "telefono", "telefonata ricevuta dal cliente"),
    ("email", "diretto", 1, "email", "email ricevuta dal cliente"),
    ("passaparola", "diretto", 1, "passaparola", "segnalazione di un cliente o di un conoscente"),
    ("intermediario", "intermediato", 1, "altro", "agente o intermediario con provvigione"),
    ("porta a porta", "diretto", 1, "altro", "visita commerciale senza appuntamento"),
    ("portale gare", "gara", 1, "portale/gara", "gare e richieste di offerta su portali"),
    ("contatto diretto", "diretto", 1, "altro", "incontro o contatto senza un canale preciso"),
    ("Facebook", "digitale", 0, "altro", "da confermare con Gate"),
    ("Instagram", "digitale", 0, "altro", "da confermare con Gate"),
    ("Google Ads", "digitale", 0, "altro", "da confermare con Gate"),
]

# Pesi dei canali per le nuove opportunità
PESO_CANALI = {"portale gare": 0.14, "porta a porta": 0.22, "intermediario": 0.14,
               "sito web": 0.18, "LinkedIn": 0.16, "passaparola": 0.16}

# Probabilità di passare alla fase successiva, per canale:
# [contatto→qualificato, qualificato→sopralluogo, sopralluogo→offerta, offerta→contratto]
PASSAGGIO_PER_CANALE = {
    "porta a porta": [0.55, 0.55, 0.65, 0.240],
    "intermediario": [0.80, 0.65, 0.70, 0.264],
    "sito web":      [0.65, 0.60, 0.70, 0.264],
    "LinkedIn":      [0.60, 0.55, 0.65, 0.240],
    "passaparola":   [0.85, 0.75, 0.80, 0.384],   # H1: il passaparola converte in contratto più di ogni altro canale
}
# H6 (test cieco, NON inserita): il portale gare usa la media degli altri canali, in tutti i settori (GDO compresa)
PASSAGGIO_PER_CANALE["portale gare"] = [round(sum(v[i] for v in PASSAGGIO_PER_CANALE.values()) / 5, 2) for i in range(4)]

# H2 – negli uffici e commercio LinkedIn converte meglio del porta a porta:
# LinkedIn nel settore pilota passa ogni fase con probabilità moltiplicata per questo fattore
BOOST_LINKEDIN_UFFICI = 1.35

# H3 – la classe A chiude più spesso della classe C: la probabilità di passaggio
# viene moltiplicata per (1 + EFFETTO_PUNTEGGIO * (punteggio - 60) / 40)
EFFETTO_PUNTEGGIO = 0.30

# H4 – le opportunità dell'intermediario hanno il margine più basso (punti percentuali sul margine del servizio).
# H6: il portale gare non ha variazioni (test cieco)
MARGINE_PER_CANALE = {"portale gare": 0.0, "porta a porta": 0.0, "intermediario": -0.035,
                      "sito web": 0.01, "LinkedIn": 0.0, "passaparola": 0.02}

# Quando un'opportunità non passa alla fase successiva: probabilità che sia persa (altrimenti resta aperta)
PROBABILITA_PERSA_SE_NON_PASSA = 0.65
# Una trattativa si registra come persa solo dopo essere rimasta ferma oltre la soglia della fase: giorni in più (min, max)
GIORNI_PRIMA_DI_PERDERE = (1, 10)

# Giorni di permanenza in ogni fase prima del passaggio (min, max)
GIORNI_IN_FASE = {"contatto": (3, 7), "qualificato": (7, 14), "sopralluogo": (7, 14), "offerta": (10, 21)}

# Motivi di perdita più probabili per fase raggiunta (pesi nell'ordine di MOTIVI_PERDITA)
MOTIVI_PER_FASE = {
    "contatto":    [0.05, 0.05, 0.30, 0.05, 0.50, 0.05],
    "qualificato": [0.15, 0.15, 0.15, 0.10, 0.35, 0.10],
    "sopralluogo": [0.25, 0.20, 0.05, 0.25, 0.15, 0.10],
    "offerta":     [0.55, 0.15, 0.00, 0.05, 0.20, 0.05],
}

# Costi mensili per canale (€): base e variabilità percentuale
COSTI_MENSILI = {"portale gare": (150, 0.2), "porta a porta": (400, 0.25), "intermediario": (900, 0.3),
                 "sito web": (250, 0.15), "LinkedIn": (350, 0.2), "passaparola": (40, 0.5)}

# Punteggio di coerenza: pesi del prototipo (somma 100)
PESI = {"settore": 20, "distanza": 15, "capacita": 20, "margine": 20, "dimensione": 10, "decisore": 15}
SOGLIA_BUONA = 70                  # una trattativa è "buona" da 70 punti in su (decisione del 21/10, K11)
SETTORE_FUORI_PILOTA = 0.3          # come nel prototipo: fuori dal pilota vale 0,3 del peso
DISTANZA_PIENA, DISTANZA_META = 15, 35
MARGINE_PIENO, MARGINE_META = 0.20, 0.12
DIMENSIONE_PIENA = (6000, 60000)
DIMENSIONE_META = (3000, 100000)
CAPACITA_SIMULATA = [(1.0, 0.55), (0.5, 0.35), (0.0, 0.10)]   # valore e probabilità (tabelle reali nello Sprint 3)

# ------------------------------------------------- Campi del processo TO-BE (PASSAGGIO 3)
# Giorni tra la richiesta e la prima risposta di Gate (0-6, media circa 2).
# IPOTESI AS-IS, DA SOSTITUIRE CON LA FOTOGRAFIA DI PARTENZA. Pesi dei ritardi 0, 1, 2, 3, 4, 5, 6 giorni
RITARDO_PRIMA_RISPOSTA = [0.15, 0.25, 0.25, 0.15, 0.10, 0.06, 0.04]

# Contenuti di prova del piano editoriale (tabella contenuti): id = utm_content, campagna = settore pilota.
# Servono solo a mostrare il metodo: nessun effetto è inserito sui risultati dei contenuti.
CAMPAGNA_PILOTA = "uffici-e-commercio"
CONTENUTI = [
    # (id, data_pubblicazione, canale, tema, settore, formato, pagina di arrivo)
    ("prova-01", "2026-02-10", "LinkedIn", "[prova] Uffici puliti prima dell'apertura: come lavoriamo", "uffici e commercio", "post", "/richiedi-un-sopralluogo"),
    ("prova-02", "2026-04-14", "sito web", "[prova] Pulizia di uffici e studi professionali a Bari", "uffici e commercio", "pagina", "/uffici-e-studi"),
    ("prova-03", "2026-06-09", "LinkedIn", "[prova] Caso di studio: uno studio professionale di Bari", "uffici e commercio", "caso di studio", "/richiedi-un-sopralluogo"),
    ("prova-04", "2026-08-25", "sito web", "[prova] Quanto costa pulire un ufficio? Guida rapida", "uffici e commercio", "articolo", "/blog/costo-pulizia-uffici"),
]
QUOTA_CON_CONTENUTO = 0.30          # quota delle opportunità da sito web e LinkedIn con campagna e contenuto

# ------------------------------------------------- PASSAGGIO 4 (22/10)
# Contratti già in corso: clienti storici di Gate con un contratto firmato prima del periodo della pipeline.
# Stanno nella tabella contratti_in_corso (non tra le opportunità): non cambiano i KPI del funnel.
# Servono alla lista del lunedì (contratti da rinnovare). Durata di ogni contratto: 12 mesi.
N_CONTRATTI_IN_CORSO = 12
CONTRATTI_FIRMATI_DAL, CONTRATTI_FIRMATI_AL = "2025-11-01", "2026-01-31"
DURATA_CONTRATTO_MESI = 12

# Anomalie da pulire (volute)
N_CLIENTI_DUPLICATI = 4             # stessi clienti scritti in modo diverso
QUOTA_EMAIL_VUOTE = 0.06
QUOTA_TELEFONI_VUOTI = 0.04
QUOTA_SUPERFICIE_VUOTA = 0.05
QUOTA_ORE_VUOTE = 0.02
