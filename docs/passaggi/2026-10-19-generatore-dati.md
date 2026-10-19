--- PASSAGGIO A CLAUDE CODE ---
Sprint: 1
User story: Come direzione di Gate voglio vedere il percorso dai contatti ai contratti su un database di prova realistico, per valutare il metodo di misura dei KPI prima di inserire i dati veri. (Il generatore lo scrivi tu, Claude Code; le query le scrivo io, Nicolò, e tu mi fai da tutor.)

Criteri di accettazione:
1. Uno script Python con sola libreria standard e seed fisso crea gate.db (SQLite) e un CSV per tabella. Rieseguito, produce gli stessi dati.
2. Tabelle e campi esattamente come nello schema qui sotto. Le colonne dello schema v0 (clienti, commerciali, opportunita, costi_canale di sql-gate-miller.md) mantengono nome e tipo, quindi le 5 query di quel file girano senza modifiche.
3. Volumi: 120 clienti, circa 180 referenti, 4 commerciali (3 interni, 1 intermediario), circa 300 opportunita con data_contatto tra 2026-01-01 e 2026-10-15, costi_canale per ogni canale e ogni mese.
4. Solo valori ammessi (Domini qui sotto). Circa il 40% dei clienti in "uffici e commercio" in provincia di BA (settore pilota ipotetico).
5. Coerenza: ogni opportunita passa le fasi in ordine con date crescenti in storico_fasi; opportunita.fase = ultima fase dello storico; data_ultima_modifica = data dell'ultimo evento; le perse hanno motivo_perdita e data_chiusura; i contratti hanno data_chiusura; esistono offerte solo per opportunita arrivate in fase offerta; un'attivita di tipo sopralluogo per ogni ingresso in fase sopralluogo.
6. Circa il 10-15% delle opportunita aperte è ferma oltre la soglia della propria fase (fasi.giorni_soglia), con riferimento alla data 2026-10-19.
7. Parametri in un file config separato: probabilità di passaggio tra fasi per canale, valori annui e margini per servizio, costi mensili per canale. README di mezza pagina in italiano che li elenca e dichiara che i dati sono fittizi; nomi chiaramente inventati (es. "Studio Alfa", "Commerciale 1").
8. Uno script di controllo stampa i conteggi per tabella e verifica i punti 5 e 6.

Schema (date TEXT 'AAAA-MM-GG', mese TEXT 'AAAA-MM'; PK = chiave, FK = chiave esterna):
- clienti(id_cliente INTEGER PK, nome TEXT, settore TEXT, provincia TEXT, comune TEXT, km_da_bari INTEGER, superficie_mq INTEGER, tipo_cliente TEXT [pubblico, privato])
- referenti(id_referente INTEGER PK, id_cliente FK, nome TEXT, ruolo TEXT, decisore INTEGER 0/1, email TEXT, telefono TEXT, base_giuridica TEXT [consenso, legittimo interesse B2B, contratto in corso, da verificare], modo_raccolta TEXT [a voce, modulo del sito, email, biglietto da visita])
- commerciali(id_commerciale INTEGER PK, nome TEXT, tipo TEXT [interno, intermediario])
- opportunita(id_opp INTEGER PK, id_cliente FK, id_commerciale FK, id_referente FK, canale TEXT, servizio TEXT, fase TEXT, valore_annuo REAL, margine_pct REAL 0-1, ore_mese_stimate REAL, data_contatto TEXT, data_ultima_modifica TEXT, data_chiusura TEXT vuota se aperta, motivo_perdita TEXT solo se persa, punteggio_coerenza INTEGER 0-100, classe_coerenza TEXT [A >= 75, B 50-74, C < 50])
- fasi(fase TEXT PK, ordine INTEGER, probabilita REAL, giorni_soglia INTEGER): contatto 1 / 0,05 / 7; qualificato 2 / 0,15 / 14; sopralluogo 3 / 0,35 / 14; offerta 4 / 0,55 / 21; contratto 5 / 1 / vuoto; perso 9 / 0 / vuoto
- storico_fasi(id_evento INTEGER PK, id_opp FK, fase TEXT, data_ingresso TEXT)
- offerte(id_offerta INTEGER PK, id_opp FK, versione INTEGER, data_invio TEXT, importo_annuo REAL, margine_pct_previsto REAL, esito TEXT [aperta, firmata, rifiutata, scaduta], data_esito TEXT)
- attivita(id_attivita INTEGER PK, id_opp FK, id_commerciale FK, tipo TEXT [chiamata, email, WhatsApp, visita, sopralluogo], data TEXT, esito TEXT)
- costi_canale(canale TEXT, mese TEXT, costo REAL)

Domini:
- settore: uffici e commercio, GDO, industria, ricettivo, sanità, trasporti, enti pubblici
- provincia: BA, BT, BR, FG, LE, TA
- servizio: cleaning e hospitality, logistica e retail, servizi alle strutture
- canale: portale gare, porta a porta, intermediario, sito web, LinkedIn, passaparola
- fase: contatto, qualificato, sopralluogo, offerta, contratto, perso
- motivo_perdita: prezzo, tempi di avvio, fuori zona, capacità insufficiente, nessuna risposta, altro

Punteggio di coerenza (pesi del prototipo, somma 100): settore pilota 20, distanza da Bari 15 (entro 15 km pieno, entro 35 metà), capacità 20 (simulata a caso: le tabelle della capacità arrivano nello Sprint 3), margine 20 (>= 20% pieno, >= 12% metà), dimensione 10 (valore annuo 6.000-60.000 pieno, 3.000-100.000 metà), decisore identificato 15.

KPI o ipotesi collegati:
- K1 Contatti qualificati = opportunita entrate in "qualificato" nel periodo / nuovi contatti del periodo
- K2 Sopralluoghi = ingressi in "sopralluogo" / ingressi in "qualificato"
- K3 Conversione offerte = contratti / offerte con esito nel periodo
- K4 CAC = costi del canale nel periodo / nuovi contratti del canale
- K5 Margine atteso = somma di valore_annuo x margine_pct x probabilita della fase sulle aperte
- K9 Opportunità ferme = aperte con giorni dall'ultima modifica oltre fasi.giorni_soglia

Dati necessari: tutte le tabelle dello schema; per la prima query clienti (nome, settore) e opportunita (id_opp, fase, valore_annuo).

Domanda di business a cui la query deve rispondere: Quali opportunità sono ancora aperte, in quali settori, e quanto valgono? (prima query SELECT + JOIN, poi il funnel per fase con GROUP BY)
--- FINE PASSAGGIO ---
