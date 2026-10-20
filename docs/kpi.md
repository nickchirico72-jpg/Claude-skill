# Dizionario dei KPI

> File generato da `generatore/kpi_catalogo.py` (tabella `kpi_catalogo` del database): non modificarlo a mano.
> Fonte unica: ogni query in `sql/`, la schermata Indicatori dell'app e la dashboard Power BI usano queste definizioni.
> Catalogo del PASSAGGIO 3 (20/10/2026). APQC = Process Classification Framework cross-industry, categoria 3.0 Market and Sell Products and Services.

## Livello operativo

| Codice | KPI | Domanda di business | Formula | Tipo | APQC | Soglia | Dati necessari | Fonte |
|---|---|---|---|---|---|---|---|---|
| K9 | Opportunità ferme | Quali trattative sono ferme da troppo tempo? | aperte con giorni dall'ultima modifica oltre fasi.giorni_soglia | efficienza | 3.5.1 Manage leads/opportunities | giorni per fase in fasi.giorni_soglia | opportunita (fase, data_ultima_modifica); fasi (giorni_soglia) | fittizi |
| K12 | Tempo di prima risposta | Quanto velocemente rispondiamo a una nuova richiesta? | giorni medi tra data_contatto e data_prima_risposta (in SQL la media; la mediana in Power BI) | efficienza | 3.5.1 Manage leads/opportunities | entro 1 giorno lavorativo | opportunita (data_contatto, data_prima_risposta); richieste_reali (data_richiesta, data_risposta) | entrambi |
| K13 | Tempo dalla richiesta all'offerta | Quanto tempo passa dalla richiesta all'offerta? | giorni medi tra data_contatto e data_invio della prima versione dell'offerta | efficienza | 3.5 (da verificare sul PCF) | da definire con Gate | opportunita (data_contatto); offerte (data_invio, versione); richieste_reali (data_richiesta, data_offerta) | entrambi |
| K14 | Richieste registrate entro 24 ore | Le richieste vengono annotate subito? | richieste con data_registrazione entro 1 giorno da data_contatto / richieste con data_registrazione | adozione | 3.5.1 Manage leads/opportunities | almeno 80% | opportunita (data_contatto, data_registrazione); richieste_reali (data_richiesta, data_registrazione) | entrambi |

## Livello tattico

| Codice | KPI | Domanda di business | Formula | Tipo | APQC | Soglia | Dati necessari | Fonte |
|---|---|---|---|---|---|---|---|---|
| K1 | Contatti qualificati | Quanti dei nuovi contatti diventano richieste da seguire? | opportunità entrate in "qualificato" nel periodo / nuovi contatti del periodo | efficacia | 3.5.1 Manage leads/opportunities | ipotesi del prototipo: almeno 60% | storico_fasi (fase, data_ingresso); opportunita (data_contatto) | fittizi |
| K2 | Sopralluoghi | Quante richieste qualificate arrivano al sopralluogo? | ingressi in "sopralluogo" / ingressi in "qualificato" | efficacia | 3.5.1 Manage leads/opportunities | ipotesi del prototipo: almeno 50% | storico_fasi (fase, data_ingresso) | fittizi |
| K3 | Conversione offerte | Quante offerte decise diventano contratti? | contratti / opportunità con offerta decisa nel periodo (firmate + perse dopo essere arrivate in offerta), per data_chiusura; si conta per opportunità, le versioni successive della stessa offerta non contano due volte | efficacia | 3.5 (sotto-processo da verificare sul PCF) | ipotesi del prototipo: almeno 35% | opportunita (fase, data_chiusura); storico_fasi (fase = offerta); richieste_reali (data_offerta, esito) | entrambi |
| K4 | Costo di acquisizione per canale | Quanto costa un nuovo contratto, canale per canale? | costi del canale nel periodo / nuovi contratti del canale | efficienza | 3.0 (da verificare sul PCF) | ipotesi del prototipo: al massimo 1.500 € per contratto | costi_canale (canale, mese, costo); opportunita (canale, fase, data_chiusura) | fittizi |
| K6 | Pipeline ponderata | Quanto fatturato annuo possiamo aspettarci dalle trattative aperte? | somma di valore_annuo x probabilità della fase sulle aperte | efficacia | 3.5 | da definire con Gate | opportunita (valore_annuo, fase); fasi (probabilita) | fittizi |
| K7 | Win rate | Su quante trattative chiuse vinciamo? | contratti / (contratti + perse) nel periodo | efficacia | 3.5 | da definire con Gate | opportunita (fase, data_chiusura); richieste_reali (esito) | entrambi |
| K8 | Durata del ciclo | Quanto dura una trattativa dal primo contatto alla firma? | giorni medi tra data_contatto e data_chiusura dei contratti | efficienza | 3.5 | da definire con Gate | opportunita (data_contatto, data_chiusura, fase) | fittizi |
| K16 | Offerte firmate da link | Quante offerte si firmano da link, senza carta? | contratti con firma_da_link = 1 / contratti | adozione | 3.5 (da verificare sul PCF) | da definire con Gate | offerte (firma_da_link, esito); opportunita (fase) | fittizi |

## Livello strategico

| Codice | KPI | Domanda di business | Formula | Tipo | APQC | Soglia | Dati necessari | Fonte |
|---|---|---|---|---|---|---|---|---|
| K5 | Margine atteso | Quanto margine possiamo aspettarci dalle trattative aperte? | somma di valore_annuo x margine_pct x probabilità della fase sulle aperte | efficacia | 3.5 | da definire con Gate | opportunita (valore_annuo, margine_pct, fase); fasi (probabilita) | fittizi |
| K10 | Motivi di perdita | Perché perdiamo le trattative? | perse per motivo_perdita / perse totali | efficacia | 3.5 | da definire con Gate | opportunita (motivo_perdita, fase) | fittizi |
| K11 | Coerenza del portafoglio | Le trattative sono coerenti con capacità e margini di Gate? | quota di opportunità e di valore in classe A, B, C | efficacia | 3.5.1 Manage leads/opportunities | da definire con Gate | opportunita (classe_coerenza, valore_annuo) | fittizi |
| K15 | Quota di richieste digitali | Quante richieste arrivano dai canali digitali? | richieste da canali con tipo "digitale" nella tabella canali / richieste totali | efficacia | 3.0 (da verificare sul PCF) | da definire con Gate | opportunita (canale); canali (tipo); richieste_reali (canale) | entrambi |
| K17 | Facilità percepita | I clienti trovano facile chiedere un sopralluogo e firmare? | media di voto_facilita (1-5) | efficacia | 6.0 (da verificare sul PCF) | almeno 4 | richieste_reali (voto_facilita) | reali |

## Note di calcolabilità
- **Fonte**: «fittizi» = solo database di prova; «reali» = solo tabella `richieste_reali` (fotografia di partenza e test); «entrambi» = calcolabile su tutte e due, mai mescolate.
- **K3**: il denominatore conta le opportunità, non le offerte: una seconda versione della stessa offerta non conta due volte.
- **K4**: un contratto si attribuisce al canale dell'opportunità; «nuovi contratti del periodo» usa data_chiusura. I canali senza costi registrati (modulo sito, WhatsApp Business, ...) non hanno un costo di acquisizione.
- **K12**: in SQL si calcola la media; la mediana, meno sensibile ai ritardi eccezionali, si calcola in Power BI.
- **K14**: nei dati storici fittizi `data_registrazione` è vuota (NULL): il KPI si calcola sulle richieste del modulo e sui dati importati.
- **K16** e **K17**: nei dati storici non ci sono firme da link né voti; K16 cresce con la demo, K17 arriva solo dai dati reali.
