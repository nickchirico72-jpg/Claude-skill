"""
CATALOGO DEI KPI (fonte unica)
Le righe del PASSAGGIO 3 (20/10/2026) senza K14, K16 e K17, tolti il 21/10: 14 KPI; i codici non cambiano. Da qui nascono la tabella kpi_catalogo del database,
docs/kpi.md e le schede degli Indicatori nell'app (js/dati-db.js).
Per cambiare un KPI si cambia solo questo file e si rilancia genera_dati.py.
Dove il PASSAGGIO scrive "da verificare sul PCF" il testo resta così: va controllato sul PCF APQC cross-industry.
"""

# (codice, nome, domanda di business, formula, livello di Anthony, tipo, processo APQC, soglia, dati necessari, fonte)
KPI = [
    ("K1", "Contatti qualificati", "Quanti dei nuovi contatti diventano richieste da seguire?",
     "opportunità entrate in \"qualificato\" nel periodo / nuovi contatti del periodo",
     "tattico", "efficacia", "3.5.1 Manage leads/opportunities", "ipotesi del prototipo: almeno 60%",
     "storico_fasi (fase, data_ingresso); opportunita (data_contatto)", "fittizi"),
    ("K2", "Sopralluoghi", "Quante richieste qualificate arrivano al sopralluogo?",
     "ingressi in \"sopralluogo\" / ingressi in \"qualificato\"",
     "tattico", "efficacia", "3.5.1 Manage leads/opportunities", "ipotesi del prototipo: almeno 50%",
     "storico_fasi (fase, data_ingresso)", "fittizi"),
    ("K3", "Conversione offerte", "Quante offerte decise diventano contratti?",
     "contratti / opportunità con offerta decisa nel periodo (firmate + perse dopo essere arrivate in offerta), "
     "per data_chiusura; si conta per opportunità, le versioni successive della stessa offerta non contano due volte",
     "tattico", "efficacia", "3.5 (sotto-processo da verificare sul PCF)", "ipotesi del prototipo: almeno 35%",
     "opportunita (fase, data_chiusura); storico_fasi (fase = offerta); richieste_reali (data_offerta, esito)", "entrambi"),
    ("K4", "Costo di acquisizione per canale", "Quanto costa un nuovo contratto, canale per canale?",
     "costi del canale nel periodo / nuovi contratti del canale",
     "tattico", "efficienza", "3.0 (da verificare sul PCF)", "ipotesi del prototipo: al massimo 1.500 € per contratto",
     "costi_canale (canale, mese, costo); opportunita (canale, fase, data_chiusura)", "fittizi"),
    ("K5", "Margine atteso", "Quanto margine possiamo aspettarci dalle trattative aperte?",
     "somma di valore_annuo x margine_pct x probabilità della fase sulle aperte",
     "strategico", "efficacia", "3.5", "da definire con Gate",
     "opportunita (valore_annuo, margine_pct, fase); fasi (probabilita)", "fittizi"),
    ("K6", "Pipeline ponderata", "Quanto fatturato annuo possiamo aspettarci dalle trattative aperte?",
     "somma di valore_annuo x probabilità della fase sulle aperte",
     "tattico", "efficacia", "3.5", "da definire con Gate",
     "opportunita (valore_annuo, fase); fasi (probabilita)", "fittizi"),
    ("K7", "Win rate", "Su quante trattative chiuse vinciamo?",
     "contratti / (contratti + perse) nel periodo",
     "tattico", "efficacia", "3.5", "da definire con Gate",
     "opportunita (fase, data_chiusura); richieste_reali (esito)", "entrambi"),
    ("K8", "Durata del ciclo", "Quanto dura una trattativa dal primo contatto alla firma?",
     "giorni medi tra data_contatto e data_chiusura dei contratti",
     "tattico", "efficienza", "3.5", "da definire con Gate",
     "opportunita (data_contatto, data_chiusura, fase)", "fittizi"),
    ("K9", "Opportunità ferme", "Quali trattative sono ferme da troppo tempo?",
     "aperte con giorni dall'ultima modifica oltre fasi.giorni_soglia",
     "operativo", "efficienza", "3.5.1 Manage leads/opportunities", "giorni per fase in fasi.giorni_soglia",
     "opportunita (fase, data_ultima_modifica); fasi (giorni_soglia)", "fittizi"),
    ("K10", "Motivi di perdita", "Perché perdiamo le trattative?",
     "perse per motivo_perdita / perse totali",
     "strategico", "efficacia", "3.5", "da definire con Gate",
     "opportunita (motivo_perdita, fase)", "fittizi"),
    ("K11", "Coerenza del portafoglio", "Le trattative sono coerenti con capacità e margini di Gate?",
     "opportunità con punteggio_coerenza >= 70 / opportunità totali (e la stessa quota sul valore annuo)",
     "strategico", "efficacia", "3.5.1 Manage leads/opportunities", "da definire con Gate",
     "opportunita (punteggio_coerenza, valore_annuo)", "fittizi"),
    ("K12", "Tempo di prima risposta", "Quanto velocemente rispondiamo a una nuova richiesta?",
     "giorni medi tra data_contatto e data_prima_risposta (in SQL la media; la mediana in Power BI)",
     "operativo", "efficienza", "3.5.1 Manage leads/opportunities", "entro 1 giorno lavorativo",
     "opportunita (data_contatto, data_prima_risposta); richieste_reali (data_richiesta, data_risposta)", "entrambi"),
    ("K13", "Tempo dalla richiesta all'offerta", "Quanto tempo passa dalla richiesta all'offerta?",
     "giorni medi tra data_contatto e data_invio della prima versione dell'offerta",
     "operativo", "efficienza", "3.5 (da verificare sul PCF)", "da definire con Gate",
     "opportunita (data_contatto); offerte (data_invio, versione); richieste_reali (data_richiesta, data_offerta)", "entrambi"),
    ("K15", "Quota di richieste digitali", "Quante richieste arrivano dai canali digitali?",
     "richieste da canali con tipo \"digitale\" nella tabella canali / richieste totali",
     "strategico", "efficacia", "3.0 (da verificare sul PCF)", "da definire con Gate",
     "opportunita (canale); canali (tipo); richieste_reali (canale)", "entrambi"),
]

# La formula spiegata in parole, per chi legge la dashboard senza conoscere SQL (modifica 4 del 20/10)
SPIEGAZIONI = {
    "K1": "Su 100 nuovi contatti, quanti diventano richieste vere da seguire.",
    "K2": "Su 100 richieste qualificate, quante arrivano al sopralluogo.",
    "K3": "Su 100 offerte su cui il cliente ha deciso, quante sono firmate.",
    "K4": "Quanto si è speso su un canale, diviso per i contratti che quel canale ha portato.",
    "K5": "Il margine che ci si aspetta dalle trattative aperte, pesato con la probabilità di chiuderle.",
    "K6": "Il fatturato annuo che ci si aspetta dalle trattative aperte, pesato con la probabilità di chiuderle.",
    "K7": "Su 100 trattative chiuse, quante sono vinte.",
    "K8": "Quanti giorni passano in media dal primo contatto alla firma.",
    "K9": "Le trattative aperte che non si muovono da più giorni di quanti ne prevede la loro fase.",
    "K10": "Per quali motivi si perdono le trattative, in percentuale sulle perse.",
    "K11": "Quanta parte delle trattative, e del loro valore, è buona: punteggio di coerenza da 70 in su.",
    "K12": "Quanti giorni passano in media tra la richiesta del cliente e la prima risposta di Gate.",
    "K13": "Quanti giorni passano in media tra la richiesta del cliente e l'invio dell'offerta.",
    "K15": "Su 100 richieste, quante arrivano da sito, LinkedIn, profilo Google o WhatsApp.",
}

COLONNE = ["codice", "nome", "domanda_business", "formula", "spiegazione", "livello_anthony", "tipo", "processo_apqc", "soglia",
           "dati_necessari", "fonte"]


def righe():
    """Le righe del catalogo come dizionari (colonna: valore), con la spiegazione in parole."""
    return [dict(zip(COLONNE, k[:4] + (SPIEGAZIONI[k[0]],) + k[4:])) for k in KPI]


def scrivi_markdown(percorso):
    """Rigenera docs/kpi.md dal catalogo, così il dizionario dei KPI resta uno solo."""
    testo = ["# Dizionario dei KPI",
             "",
             "> File generato da `generatore/kpi_catalogo.py` (tabella `kpi_catalogo` del database): non modificarlo a mano.",
             "> Fonte unica: ogni query in `sql/`, la schermata Indicatori dell'app e la dashboard Power BI usano queste definizioni.",
             "> Catalogo del PASSAGGIO 3 (20/10/2026). APQC = Process Classification Framework cross-industry, categoria 3.0 Market and Sell Products and Services.",
             ""]
    for livello in ["operativo", "tattico", "strategico"]:
        testo += [f"## Livello {livello}", "",
                  "| Codice | KPI | Domanda di business | Formula | In parole | Tipo | APQC | Soglia | Dati necessari | Fonte |",
                  "|---|---|---|---|---|---|---|---|---|---|"]
        for r in righe():
            if r["livello_anthony"] == livello:
                testo.append("| {codice} | {nome} | {domanda_business} | {formula} | {spiegazione} | {tipo} | {processo_apqc} | {soglia} | {dati_necessari} | {fonte} |".format(**r))
        testo.append("")
    testo += ["## Note di calcolabilità",
              "- **Fonte**: «fittizi» = solo database di prova; «reali» = solo tabella `richieste_reali` (fotografia di partenza e test); «entrambi» = calcolabile su tutte e due, mai mescolate.",
              "- **K3**: il denominatore conta le opportunità, non le offerte: una seconda versione della stessa offerta non conta due volte.",
              "- **K4**: un contratto si attribuisce al canale dell'opportunità; «nuovi contratti del periodo» usa data_chiusura. I canali senza costi registrati (modulo sito, WhatsApp Business, ...) non hanno un costo di acquisizione.",
              "- **K12**: in SQL si calcola la media; la mediana, meno sensibile ai ritardi eccezionali, si calcola in Power BI.",
              "- **K14, K16 e K17** sono stati tolti dal catalogo il 21/10/2026; i codici degli altri KPI non cambiano. I dati restano nel database (data_registrazione, firma_da_link, voto_facilita).",
              ""]
    percorso.write_text("\n".join(testo), encoding="utf-8")
