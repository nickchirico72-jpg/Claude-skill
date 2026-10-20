--- PASSAGGIO A CLAUDE CODE ---
Sprint: 1 (20-26/10/2026). Questo passaggio sostituisce il PASSAGGIO 2, mai eseguito: le sue correzioni sono incluse qui sotto (blocco A).

Contesto (decisioni prese nel progetto, che tu non hai visto):
- Il gruppo lavora solo per il corso di Digital Transformation (Corporate Strategy non c'è più). Il prototipo serve a tre capitoli del deck: Gate oggi (KPI di partenza), processo TO-BE con i KPI, soluzione e piattaforma con la demo.
- Regola di adozione: al cliente non chiediamo app, account o password. La richiesta arriva da un modulo "Richiedi un sopralluogo" o da WhatsApp Business ed entra nel CRM con il canale di origine; l'offerta si firma da link; il cliente riceve un report mensile in PDF. La tecnologia nuova sta tutta dal lato di Gate.
- Proporremo a Gate un test reale di tre settimane: ogni richiesta viene annotata in un foglio condiviso. Prima del test ricostruiamo con Gate le ultime 10-15 richieste (fotografia di partenza). Il prototipo deve saper leggere questi dati veri.
- I KPI si leggono su tre livelli della piramide di Anthony (operativo, tattico, strategico) e ognuno ha un riferimento al processo APQC (cross-industry, categoria 3.0 Market and Sell Products and Services).
- Escono dal prototipo attuale o passano alla roadmap: assegnazione a imprese partner via WhatsApp (resta solo la verifica della capacità delle squadre interne), lead scoring con modello statistico, portale. Non cancellare il codice: spostalo in una cartella "roadmap" o nascondilo dietro un'opzione spenta.
- Sito e social (decisione del 20/10): il valore non è essere presenti su più social, ma seguire ogni richiesta dal canale, dalla campagna e dal contenuto che l'hanno generata fino al contratto e al margine, per capire quali canali portano clienti coerenti (classe A, margine sopra soglia). Canali confermati per Gate: sito gatesrl.it e LinkedIn. Facebook, Instagram, profilo Google dell'azienda e campagne a pagamento sono da confermare in intervista. Niente pixel di tracciamento nel pilota: solo parametri utm nei link.
- Il prototipo HTML ha già la funzione "Collega sito e social" (modulo.html con utm_source per canale, import dei messaggi ricevuti su WhatsApp o email, import dei CSV delle campagne Meta e LinkedIn). Va adattata, non rifatta.
- Vincoli invariati: Python con sola libreria standard, SQLite, app senza server, nessun account o servizio esterno (niente CRM vero, niente API di modelli IA in questo passaggio), dati fittizi dichiarati ovunque. Le query di analisi le scrivo io (Nicolò); tu mi fai da tutor.

Passo 0, prima di modificare qualsiasi cosa: elenca file, tabelle e funzioni attuali del progetto (database, generatore, app, dashboard), poi mostrami il piano delle modifiche per i blocchi A-F con i file che toccherai. Aspetta il mio ok prima di procedere.

User story:
- US-A Come direzione di Gate voglio un database di prova con una pipeline aperta realistica e ipotesi dichiarate, per vedere sia le trattative in corso sia che il metodo sa confermare e smentire un'ipotesi.
- US-B Come direzione di Gate voglio importare il foglio della fotografia di partenza e del test, per calcolare i KPI su dati veri e confrontarli prima e dopo.
- US-C Come responsabile commerciale voglio un catalogo dei KPI con formula, livello decisionale e riferimento APQC, per sapere chi guarda cosa e perché.
- US-D Come impresa cliente voglio chiedere un sopralluogo da un modulo breve, senza registrarmi, per ricevere risposta in fretta. (Nel prototipo: simulazione.)
- US-E Come commerciale di Gate voglio che ogni nuova richiesta abbia subito un preventivo indicativo e la classe A/B/C calcolata anche sul margine, per decidere prima del sopralluogo se vale la pena.
- US-F Come direzione, responsabile commerciale e ufficio voglio una dashboard divisa in tre viste, per vedere ciascuno le misure del proprio livello.

Criteri di accettazione:

A. Correzioni ai dati fittizi (ex PASSAGGIO 2)
A1. Le opportunità aperte diventano tra 70 e 90 su 300, concentrate sui contatti dal 2026-08-01; i contatti di settembre e ottobre sono in maggioranza in contatto, qualificato o sopralluogo. Il tasso di chiusura sulle opportunità chiuse resta tra 11% e 15%. Il 10-15% delle aperte resta fermo oltre la soglia della propria fase (riferimento 2026-10-19).
A2. I 5 andamenti già inseriti si chiamano H1-H5 nel config e nel README, ognuno con il parametro che lo produce: H1 il passaparola converte in contratto più di ogni altro canale; H2 negli uffici LinkedIn converte meglio del porta a porta; H3 la classe A chiude più spesso della classe C; H4 le opportunità dell'intermediario hanno margine più basso; H5 i nuovi contatti crescono di mese in mese.
A3. H6 "nella GDO il portale gare converte meno ma con margine più alto" NON va inserita: nella GDO il portale gare segue gli stessi parametri degli altri canali. Il README la segnala come test cieco.
A4. Le 5 query di sql-gate-miller.md girano ancora senza modifiche.

B. Campi nuovi per il TO-BE e i KPI di adozione (le colonne esistenti non cambiano nome né tipo)
B1. opportunita: aggiungi data_prima_risposta TEXT (primo contatto di Gate dopo la richiesta) e data_registrazione TEXT (quando la richiesta è stata annotata). Il generatore valorizza data_prima_risposta per tutte le opportunità con un ritardo da 0 a 6 giorni, media intorno a 2, parametro nel config marcato "ipotesi AS-IS, da sostituire con la fotografia di partenza". data_registrazione resta vuota nei dati storici e si valorizza solo per le richieste del modulo simulato e per i dati importati.
B2. opportunita: aggiungi consenso_privacy INTEGER 0/1 (1 per le richieste dal modulo).
B3. offerte: aggiungi firma_da_link INTEGER 0/1 (0 nei dati storici; 1 per le offerte firmate nel flusso TO-BE della demo).
B4. Un solo dizionario dei canali, uguale nell'app HTML e nel database, in una tabella canali(canale TEXT PK, tipo TEXT [digitale, diretto, intermediato, gara], attivo INTEGER 0/1, nota TEXT): sito web, modulo sito, profilo Google, LinkedIn, WhatsApp Business, passaparola, intermediario, porta a porta, portale gare, contatto diretto (attivi); Facebook, Instagram, Google Ads (attivo 0, nota "da confermare con Gate"). Nell'app i canali spenti non compaiono nei menu né nei costi; "Eventi e LinkedIn" si divide in LinkedIn e contatto diretto. Il generatore storico continua a usare i 6 canali attuali (portale gare, porta a porta, intermediario, sito web, LinkedIn, passaparola); gli altri li usano il modulo e l'import.
B5. opportunita: aggiungi campagna TEXT e contenuto TEXT (valori di utm_campaign e utm_content, vuoti se assenti) e pagina_arrivo TEXT (per esempio la pagina del settore pilota). Nei dati storici restano vuoti, tranne un 30% delle opportunità da sito web e LinkedIn a cui assegni 3-4 contenuti di prova (parametro nel config), per mostrare il metodo.

C. Import dei dati veri (US-B)
C1. Nuova tabella richieste_reali(id INTEGER PK, fonte TEXT [partenza, test], data_richiesta TEXT, data_registrazione TEXT vuota se non nota, canale TEXT, settore TEXT, data_risposta TEXT, data_offerta TEXT, esito TEXT [aperta, contratto, persa, non interessante], voto_facilita INTEGER 1-5 vuoto se non chiesto, note TEXT).
C2. Uno script importa un CSV con le colonne del foglio condiviso (data_richiesta, data_registrazione, canale, settore, data_risposta, data_offerta, esito) più fonte; controlla date e valori ammessi e stampa le righe scartate con il motivo. Un secondo CSV opzionale porta i voti di facilità.
C3. Prepara due CSV di esempio di 12 righe (uno "partenza", uno "test"), con nomi inventati e un avviso in testa che sono di prova, per verificare l'import prima dei dati veri.
C4. I dati di richieste_reali non si mescolano mai con quelli fittizi: ogni vista o schermata dice da quale fonte legge.

D. Catalogo dei KPI (US-C)
D1. Nuova tabella kpi_catalogo(codice TEXT PK, nome TEXT, domanda_business TEXT, formula TEXT, livello_anthony TEXT [operativo, tattico, strategico], tipo TEXT [efficacia, efficienza, adozione], processo_apqc TEXT, soglia TEXT, dati_necessari TEXT, fonte TEXT [fittizi, reali, entrambi]), popolata con le 17 righe qui sotto (KPI o ipotesi collegati). Dove scrivo "da verificare sul PCF", lascia quel testo.

E. Modulo, preventivo, punteggio e contenuti (US-D, US-E)
E1. Adatta il modulo esistente (modulo.html) in "Richiedi un sopralluogo" con: azienda, settore, comune, tipo di ambienti, mq indicativi, frequenza desiderata, nome e ruolo del referente, email o telefono, consenso privacy obbligatorio con una informativa breve. Nessuna registrazione. Il modulo legge utm_source, utm_campaign e utm_content dal link e li riporta nel messaggio WhatsApp o email precompilato; l'import lo trasforma in un'opportunità in fase contatto con canale, campagna, contenuto, pagina_arrivo, data_contatto e data_registrazione di oggi, consenso_privacy 1.
E2. Alla creazione si calcolano un preventivo indicativo (ore al mese, prezzo annuo, margine %) da servizio, mq, tipo di ambiente e frequenza, e la classe di coerenza A/B/C che usa quel margine. Rese in mq all'ora, tariffe, costo orario e margine minimo stanno nel config con l'etichetta "valori di prova, da sostituire dopo l'intervista". Se il margine è sotto il minimo compare un avviso. Ogni criterio del punteggio mostra il suo contributo.
E3. La verifica della capacità resta solo per le squadre interne; l'assegnazione a partner via WhatsApp esce dalla navigazione e va nella cartella "roadmap".
E4. Nella finestra "Collega sito e social" aggiungi un piano dei contenuti leggero: tabella contenuti(id TEXT PK, data_pubblicazione TEXT, canale TEXT, tema TEXT, settore TEXT, formato TEXT [post, articolo, caso di studio, pagina]) e per ogni riga il link tracciato già pronto (utm_source = canale, utm_campaign = settore pilota, utm_content = id). Precarica 4 contenuti di prova marcati come tali.

F. Dashboard su tre livelli (US-F)
F1. Tre viste: Operativo (richieste da gestire, opportunità ferme K9, K12, K14), Tattico (funnel K1-K3, conversione e costo per canale K4, pipeline ponderata K6, K8, K13, K16, richieste qualificate per contenuto), Strategico (K5, K10, K11, K15, K17, e la matrice canale × classe A/B/C con il margine atteso per canale: quali canali portano clienti coerenti, non solo quanti contatti).
F2. In ogni vista un'etichetta ben visibile dice "Dati fittizi" oppure "Dati reali: fotografia di partenza / test", e un selettore permette di passare da una fonte all'altra quando esistono dati reali.
F3. Il flusso della demo deve funzionare in meno di 90 secondi: richiesta dal modulo → preventivo e classe → trattativa in pipeline → offerta firmata da link (simulata) → la dashboard si aggiorna.

G. Consegna
G1. README aggiornato: cosa fa ogni componente, a quale slide del deck serve (26, 27, 30, 34-35, 40, 42, 43, 44), come rigenerare i dati, come importare i CSV veri.
G2. Lo script di controllo stampa: aperte per fase e per mese di contatto, tasso di chiusura, verifica di A1, A3, A4, conteggi delle tabelle nuove, righe di kpi_catalogo.
G3. Per K12-K17 non scrivere le query: per ognuno prepara un esercizio con la domanda di business, le tabelle e i campi coinvolti e il valore atteso sui dati fittizi (calcolato dallo script di controllo), così controllo la mia query.
G4. Alla fine scrivimi un blocco "--- RITORNO DA CLAUDE CODE ---" con: cosa hai cambiato, criteri verificati e non verificati, numeri chiave (aperte, tasso di chiusura, valori attesi di K12-K17 sui dati fittizi), elenco degli screenshot pronti per le slide, dubbi aperti.

KPI o ipotesi collegati (righe di kpi_catalogo; APQC = PCF cross-industry):
- K1 Contatti qualificati = opportunità entrate in "qualificato" nel periodo / nuovi contatti del periodo. Tattico, efficacia, APQC 3.5.1 Manage leads/opportunities.
- K2 Sopralluoghi = ingressi in "sopralluogo" / ingressi in "qualificato". Tattico, efficacia, APQC 3.5.1.
- K3 Conversione offerte = contratti / opportunità con offerta decisa nel periodo (firmate + perse dopo essere arrivate in offerta), per data_chiusura; si conta per opportunità, le versioni successive della stessa offerta non contano due volte. Tattico, efficacia, APQC 3.5 (sotto-processo da verificare sul PCF).
- K4 Costo di acquisizione per canale = costi del canale nel periodo / nuovi contratti del canale. Tattico, efficienza, APQC 3.0 (da verificare sul PCF).
- K5 Margine atteso = somma di valore_annuo x margine_pct x probabilità della fase sulle aperte. Strategico, efficacia, APQC 3.5.
- K6 Pipeline ponderata = somma di valore_annuo x probabilità della fase sulle aperte. Tattico, efficacia, APQC 3.5.
- K7 Win rate = contratti / (contratti + perse) nel periodo. Tattico, efficacia, APQC 3.5.
- K8 Durata del ciclo = giorni medi tra data_contatto e data_chiusura dei contratti. Tattico, efficienza, APQC 3.5.
- K9 Opportunità ferme = aperte con giorni dall'ultima modifica oltre fasi.giorni_soglia. Operativo, efficienza, APQC 3.5.1.
- K10 Motivi di perdita = perse per motivo_perdita / perse totali. Strategico, efficacia, APQC 3.5.
- K11 Coerenza del portafoglio = quota di opportunità e di valore in classe A, B, C. Strategico, efficacia, APQC 3.5.1.
- K12 Tempo di prima risposta = giorni medi tra data_contatto e data_prima_risposta (in SQL la media; la mediana la calcoliamo in Power BI). Operativo, efficienza, APQC 3.5.1. Soglia: entro 1 giorno lavorativo.
- K13 Tempo dalla richiesta all'offerta = giorni medi tra data_contatto e data_invio della prima versione dell'offerta. Operativo, efficienza, APQC 3.5 (da verificare sul PCF).
- K14 Richieste registrate entro 24 ore = richieste con data_registrazione entro 1 giorno da data_contatto / richieste con data_registrazione. Operativo, adozione, APQC 3.5.1. Soglia: almeno 80%.
- K15 Quota di richieste digitali = richieste da canali con tipo "digitale" nella tabella canali / richieste totali. Strategico, efficacia, APQC 3.0 (da verificare sul PCF).
- K16 Offerte firmate da link = contratti con firma_da_link = 1 / contratti. Tattico, adozione, APQC 3.5 (da verificare sul PCF).
- K17 Facilità percepita = media di voto_facilita (1-5). Strategico, efficacia, APQC 6.0 (da verificare sul PCF). Soglia: almeno 4.
- Ipotesi H1-H5 inserite, H6 test cieco (vedi A2 e A3).

Dati necessari: tabelle attuali (clienti, referenti, commerciali, opportunita, fasi, storico_fasi, offerte, attivita, costi_canale) con i campi nuovi di B1-B5; tabelle nuove canali, contenuti, richieste_reali e kpi_catalogo; config con i parametri di preventivo, punteggio e ritardi di risposta.

Domanda di business a cui la query deve rispondere: Quanto velocemente risponde Gate a una nuova richiesta, e quanto tempo passa dalla richiesta all'offerta? (K12 e K13: le scrivo io, prima sui dati fittizi, poi sulla fotografia di partenza.)
--- FINE PASSAGGIO ---
