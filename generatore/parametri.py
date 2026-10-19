"""
PARAMETRI DEL GENERATORE DI DATI FITTIZI (Gate S.R.L.)
Tutte le ipotesi stanno qui: per cambiare i dati basta cambiare questo file e rilanciare genera_dati.py.
Con lo stesso SEME i dati generati sono sempre identici.
"""

SEME = 20261019                      # seme fisso: stessi dati a ogni esecuzione
DATA_RIFERIMENTO = "2026-10-19"      # "oggi" per calcolare le opportunità ferme
CONTATTI_DAL = "2026-01-01"          # periodo delle date di primo contatto
CONTATTI_AL = "2026-10-15"
# Andamento voluto: i nuovi contatti crescono nei mesi (campagna del pilota).
# Le date seguono una distribuzione triangolare con il picco a questa frazione del periodo (1 = alla fine)
CRESCITA_CONTATTI = 1.0

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

# Comuni per provincia con la distanza indicativa da Bari in km
COMUNI = {
    "BA": [("Bari", 0), ("Modugno", 11), ("Triggiano", 10), ("Bitonto", 19), ("Casamassima", 20),
           ("Molfetta", 29), ("Conversano", 31), ("Gioia del Colle", 41), ("Monopoli", 44), ("Altamura", 46)],
    "BT": [("Bisceglie", 37), ("Trani", 45), ("Andria", 57), ("Barletta", 58)],
    "BR": [("Fasano", 60), ("Ostuni", 82), ("Brindisi", 114)],
    "FG": [("Cerignola", 96), ("Foggia", 132), ("San Severo", 160)],
    "LE": [("Lecce", 152), ("Nardò", 175)],
    "TA": [("Martina Franca", 74), ("Massafra", 76), ("Taranto", 94)],
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

# Pesi dei canali per le nuove opportunità
PESO_CANALI = {"portale gare": 0.14, "porta a porta": 0.22, "intermediario": 0.14,
               "sito web": 0.18, "LinkedIn": 0.16, "passaparola": 0.16}

# Probabilità di passare alla fase successiva, per canale:
# [contatto→qualificato, qualificato→sopralluogo, sopralluogo→offerta, offerta→contratto]
PASSAGGIO_PER_CANALE = {
    "portale gare":  [0.70, 0.45, 0.80, 0.25],   # andamento voluto: gare = tante offerte, poche vinte
    "porta a porta": [0.45, 0.55, 0.65, 0.35],
    "intermediario": [0.75, 0.65, 0.70, 0.40],
    "sito web":      [0.55, 0.60, 0.70, 0.40],
    "LinkedIn":      [0.50, 0.55, 0.65, 0.35],
    "passaparola":   [0.80, 0.75, 0.80, 0.55],   # andamento voluto: il passaparola converte di più
}

# Andamento voluto "un canale che converte meglio in un settore":
# LinkedIn negli uffici e commercio passa ogni fase con probabilità moltiplicata per questo fattore
BOOST_LINKEDIN_UFFICI = 1.35

# Andamento voluto "il punteggio A/B/C predice la chiusura": la probabilità di passaggio
# viene moltiplicata per (1 + EFFETTO_PUNTEGGIO * (punteggio - 60) / 40)
EFFETTO_PUNTEGGIO = 0.30

# Variazione del margine per canale (punti percentuali): le gare spingono i prezzi verso il basso
MARGINE_PER_CANALE = {"portale gare": -0.05, "porta a porta": 0.0, "intermediario": -0.02,
                      "sito web": 0.01, "LinkedIn": 0.0, "passaparola": 0.02}

# Quando un'opportunità non passa alla fase successiva: probabilità che sia persa (altrimenti resta aperta)
PROBABILITA_PERSA_SE_NON_PASSA = 0.65

# Giorni di permanenza in ogni fase prima del passaggio (min, max)
GIORNI_IN_FASE = {"contatto": (1, 8), "qualificato": (3, 15), "sopralluogo": (3, 14), "offerta": (7, 30)}

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
SETTORE_FUORI_PILOTA = 0.3          # come nel prototipo: fuori dal pilota vale 0,3 del peso
DISTANZA_PIENA, DISTANZA_META = 15, 35
MARGINE_PIENO, MARGINE_META = 0.20, 0.12
DIMENSIONE_PIENA = (6000, 60000)
DIMENSIONE_META = (3000, 100000)
CAPACITA_SIMULATA = [(1.0, 0.55), (0.5, 0.35), (0.0, 0.10)]   # valore e probabilità (tabelle reali nello Sprint 3)

# Anomalie da pulire (volute)
N_CLIENTI_DUPLICATI = 4             # stessi clienti scritti in modo diverso
QUOTA_EMAIL_VUOTE = 0.06
QUOTA_TELEFONI_VUOTI = 0.04
QUOTA_SUPERFICIE_VUOTA = 0.05
QUOTA_ORE_VUOTE = 0.02
