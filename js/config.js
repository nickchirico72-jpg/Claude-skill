/*
 * CONFIGURAZIONE DEL PROTOTIPO
 * ----------------------------------------------------------------------------
 * Qui stanno le ipotesi dell'app (squadre, partner, costi, preventivo, soglie). Sono FITTIZIE.
 * I dizionari condivisi con il database (canali, settori, servizi, comuni, fasi, pesi del punteggio)
 * arrivano da js/dizionari.js e i dati di esempio (clienti, opportunità, attività) da js/dati-db.js,
 * entrambi generati da generatore/genera_dati.py: così app e query SQL lavorano sugli stessi dati.
 * Per cambiare un dizionario si cambia generatore/parametri.py e si rilancia il generatore.
 */

// Restituisce la data di oggi spostata di n giorni, nel formato AAAA-MM-GG
function traGiorni(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Dizionari condivisi con il database (vedi js/dizionari.js)
const DIZIONARI = DIZIONARI_DB;

// Proprietà di una fase presa dal database (probabilità e giorni oltre i quali è ferma)
function faseDb(id) {
  return DIZIONARI.fasi.find((f) => f.id === id);
}

const CONFIG = {
  // Dove stanno i dati (js/archivio.js): oggi "locale" = solo questo browser. L'archivio condiviso è da scegliere
  // (docs/archivio-condiviso.md). righeRegistro = quante modifiche ricorda il registro (chi, quando, cosa)
  archivio: { tipo: "locale", righeRegistro: 300 },

  // Ruoli di chi usa il CRM (decisione del 24/10): schermate del menu, schermata di apertura (casa), vista degli
  // approfondimenti e permessi. modifica = trattative, clienti, attività; delicate = sostituire tutti i dati (gestionale,
  // backup, dati di esempio); datiReali = CSV dei dati veri per gli indicatori; canali = sito, social e contenuti.
  // Senza server non è una protezione: è l'ordine delle schermate per chi lavora (l'accesso vero arriva con l'archivio condiviso).
  ruoli: [
    { id: "amministratore", nome: "Amministratore unico", descrizione: "Numeri, decisioni e tutte le schermate",
      casa: "cruscotto", vista: "previsione", schermate: ["cruscotto", "oggi", "clienti", "allocazione", "documenti"],
      permessi: ["modifica", "delicate", "datiReali", "canali", "approfondimenti"] },
    { id: "commerciale", nome: "Commerciale", descrizione: "Richieste, sopralluoghi, offerte e clienti",
      casa: "oggi", vista: "offerta", schermate: ["oggi", "clienti", "allocazione", "cruscotto", "documenti"],
      permessi: ["modifica", "canali"] },
    { id: "marketing", nome: "Marketing e analisi", descrizione: "Canali, contenuti e indicatori; le trattative in sola lettura",
      casa: "cruscotto", vista: "marketing", schermate: ["cruscotto", "clienti", "documenti"],
      permessi: ["datiReali", "canali", "approfondimenti"] },
  ],
  // Cruscotto: rimedio proposto per il passo più debole e per il primo motivo di perdita (regole leggibili, da validare con Gate)
  cruscotto: {
    rimediPasso: {
      qualificato: "richiama entro un giorno le richieste nuove e fai le domande di qualifica.",
      sopralluogo: "proponi la data del sopralluogo già nella prima telefonata.",
      offerta: "prepara l'offerta dal pacchetto del settore entro 5 giorni dal sopralluogo.",
      contratto: "sollecita le offerte dopo 7 giorni e manda il link per firmare.",
    },
    rimediMotivo: {
      "prezzo": "rivedi la tariffa con i prezzi di riferimento o proponi una frequenza ridotta.",
      "tempi di avvio": "verifica le squadre libere prima dell'offerta e indica la data di avvio.",
      "fuori zona": "accetta richieste fuori zona solo con un partner disponibile.",
      "capacità insufficiente": "controlla l'avviso di capacità nel preventivo prima di inviare l'offerta.",
      "nessuna risposta": "sollecita entro 7 giorni e chiama il decisore, non solo la segreteria.",
    },
  },
  // Ruoli dei salvataggi precedenti al 24/10
  ruoliVecchi: { direzione: "amministratore", ufficio: "commerciale" },

  // Chiave con cui i dati vengono salvati nel browser (localStorage)
  chiaveSalvataggio: "gate-sviluppo-commerciale-v2",
  // Versione della struttura dei dati salvati: NON modificarla, la aggiorna chi cambia il codice (vedi migra() in dati.js)
  versioneDati: 4,

  // Funzioni che si possono spegnere senza cancellare il codice (PASSAGGIO 3: partner in roadmap, tenuti accesi per scelta del team)
  funzioni: {
    partner: true,   // false = l'Allocazione verifica solo le squadre interne; la proposta ai partner su WhatsApp sparisce
  },

  // ---------------------------------------------------------------- Pilota
  pilota: {
    settore: DIZIONARI.settorePilota,   // "uffici e commercio": uffici e studi professionali, agenzie, negozi
    territorio: "Bari e provincia",
  },
  // Settori del dizionario scritti in parole nell'interfaccia (il dizionario usa la sigla)
  etichetteSettori: { GDO: "grande distribuzione" },

  // Chi firma i messaggi WhatsApp ai partner
  mittente: "l'Ufficio commerciale di Gate S.R.L.",

  // Giorni tra la firma del contratto e l'avvio del servizio (proposta, modificabile alla firma)
  giorniAvvioServizio: 15,
  // Giorni di validità di un'offerta dalla data di invio (proposta, modificabile all'invio)
  giorniValiditaOfferta: 30,
  // Durata di un contratto in mesi: la scadenza serve alla lista dei rinnovi (dal database, uguale per app e SQL)
  durataContrattoMesi: DIZIONARI.durataContrattoMesi,

  // ------------------------------------------------- Fasi della pipeline
  // probabilita = probabilità di chiusura (ipotesi), usata per il margine atteso
  // azione = pulsante che registra il passaggio alla fase successiva, già avvenuto
  // metodo = passo corrispondente del metodo Gate ("Come lavoriamo" sul sito)
  // giorniFerma = oltre questi giorni nella fase la trattativa è "ferma" (ipotesi da confermare con Gate)
  // followUp = promemoria creato da solo quando la trattativa entra nella fase (ipotesi da confermare con Gate)
  fasi: [
    { id: "contatto",    nome: "Contatto",    probabilita: faseDb("contatto").probabilita, azione: "È qualificato",
      giorniFerma: faseDb("contatto").giorniFerma,    followUp: { giorni: 2,  tipo: "Chiamata", testo: "Chiamata di qualifica" } },
    { id: "qualificato", nome: "Qualificato", probabilita: faseDb("qualificato").probabilita, azione: "Sopralluogo fatto",
      giorniFerma: faseDb("qualificato").giorniFerma, followUp: { giorni: 3,  tipo: "Chiamata", testo: "Fissare il sopralluogo" } },
    { id: "sopralluogo", nome: "Sopralluogo", probabilita: faseDb("sopralluogo").probabilita, azione: "Offerta inviata", metodo: "Analisi",
      giorniFerma: faseDb("sopralluogo").giorniFerma, followUp: { giorni: 5,  tipo: "Email",    testo: "Preparare e inviare l'offerta" } },
    { id: "offerta",     nome: "Offerta",     probabilita: faseDb("offerta").probabilita, azione: "Contratto firmato", metodo: "Proposta",
      giorniFerma: faseDb("offerta").giorniFerma,     followUp: { giorni: 7,  tipo: "Chiamata", testo: "Sollecitare la risposta all'offerta" } },
    { id: "contratto",   nome: "Contratto",   probabilita: faseDb("contratto").probabilita, metodo: "Esecuzione",
      giorniFerma: null, followUp: { giorni: 45, tipo: "Visita",   testo: "Controllo qualità dopo il primo mese" } },
  ],
  motiviPerdita: DIZIONARI.motiviPerdita,

  // ------------------------------------------- Settori e comuni (dal database)
  settori: DIZIONARI.settori,
  // Comuni con provincia, distanza indicativa da Bari e zona operativa delle squadre
  comuni: DIZIONARI.comuni,

  // ------------------------------------------------------- Servizi (€/ora)
  // tariffa = prezzo di vendita orario (dal database, uguale per app e SQL)
  // costoInterno = costo del lavoro orario di una squadra Gate; costoPartner = quanto Gate paga al partner per un'ora
  servizi: Object.fromEntries(DIZIONARI.servizi.map((s) => [s.nome, {
    tariffa: s.tariffa,
    ...{ "cleaning e hospitality": { costoInterno: 16.5, costoPartner: 18.2 },
         "logistica e retail":     { costoInterno: 17.0, costoPartner: 18.4 },
         "servizi alle strutture": { costoInterno: 21.5, costoPartner: 25.0 } }[s.nome],
  }])),
  // Spese dirette (prodotti, attrezzature, trasferte) in % sui ricavi, quando non c'è un preventivo per tipo di ambiente
  speseDirettePercentuale: 0.04,

  // ------------------------------------------- Preventivo indicativo (US-E)
  // VALORI DI PROVA, DA SOSTITUIRE DOPO L'INTERVISTA. Ore al mese = mq ÷ resa oraria × passaggi al mese.
  // Le tariffe orarie del preventivo sono quelle dei servizi qui sopra: si cambiano in un solo punto,
  // generatore/parametri.py (SERVIZI_ECONOMIA), che le passa a database e app; costi orari e rese stanno qui.
  preventivo: {
    ambienti: [
      { nome: "Uffici e studi",           resaMqOra: 150, speseDirette: 0.04 },
      { nome: "Negozi e sale d'attesa",   resaMqOra: 120, speseDirette: 0.05 },
      { nome: "Ambulatori e studi medici", resaMqOra: 90, speseDirette: 0.08 },
      { nome: "Magazzini e capannoni",    resaMqOra: 250, speseDirette: 0.03 },
      { nome: "Hotel e ricettivo",        resaMqOra: 110, speseDirette: 0.06 },
    ],
    // Passaggi a settimana e sconto sulla tariffa per le frequenze alte
    frequenze: [
      { nome: "1 volta a settimana",  passaggiSettimana: 1, sconto: 0 },
      { nome: "2 volte a settimana",  passaggiSettimana: 2, sconto: 0 },
      { nome: "3 volte a settimana",  passaggiSettimana: 3, sconto: 0.03 },
      { nome: "4 volte a settimana",  passaggiSettimana: 4, sconto: 0.03 },
      { nome: "5 volte a settimana",  passaggiSettimana: 5, sconto: 0.06 },
      { nome: "6 volte a settimana",  passaggiSettimana: 6, sconto: 0.06 },
    ],
    settimaneAlMese: 4.33,
    // Pacchetti standard per uffici e studi professionali (settore pilota): prezzo al mq all'anno, frequenza, servizi.
    // VALORI DI PROVA, DA SOSTITUIRE DOPO L'INTERVISTA. Ore e tariffa oraria si ricavano dal prezzo, così margine e punteggio restano coerenti.
    pacchetti: [
      { nome: "Base", frequenza: "2 volte a settimana", prezzoMqAnno: 15, ambiente: "Uffici e studi", servizio: "cleaning e hospitality",
        inclusi: ["Pavimenti e superfici di lavoro", "Svuotamento dei cestini e raccolta differenziata", "Pulizia e igienizzazione dei bagni"],
        opzionali: ["Vetri interni ed esterni", "Fornitura dei materiali di consumo per i bagni"] },
      { nome: "Plus", frequenza: "3 volte a settimana", prezzoMqAnno: 23, ambiente: "Uffici e studi", servizio: "cleaning e hospitality",
        inclusi: ["Pavimenti e superfici di lavoro", "Svuotamento dei cestini e raccolta differenziata", "Pulizia e igienizzazione dei bagni",
          "Vetri interni una volta al mese", "Materiali di consumo per i bagni"],
        opzionali: ["Vetri esterni", "Sanificazione periodica degli ambienti"] },
      { nome: "Completo", frequenza: "5 volte a settimana", prezzoMqAnno: 39, ambiente: "Uffici e studi", servizio: "cleaning e hospitality",
        inclusi: ["Pavimenti e superfici di lavoro", "Svuotamento dei cestini e raccolta differenziata", "Pulizia e igienizzazione dei bagni",
          "Vetri interni ed esterni una volta al mese", "Materiali di consumo per i bagni", "Sanificazione trimestrale degli ambienti"],
        opzionali: ["Pulizia straordinaria dopo lavori o traslochi", "Manutenzione del verde interno"] },
    ],
    // Condizioni essenziali stampate nell'offerta (VALORI DI PROVA, DA SOSTITUIRE DOPO L'INTERVISTA)
    condizioni: ["Prezzi IVA esclusa, fatturazione mensile posticipata", "Durata 12 mesi, rinnovabile alla scadenza",
      "Prodotti e attrezzature a carico di Gate", "Avvio del servizio entro 15 giorni dalla firma", "Personale assicurato e formato sulla sicurezza"],
    // Il margine minimo è quello del punteggio (punteggio.margine.minimo): sotto compare un avviso
  },

  // ----------------------------------------------- Punteggio di coerenza
  // Ogni criterio vale da 0 a 1 e viene moltiplicato per il suo peso.
  // Somma dei pesi = 100, quindi il punteggio va da 0 a 100.
  // Pesi e soglie arrivano dal database (generatore/parametri.py), così il punteggio dell'app è uguale a quello di SQL.
  // Ogni criterio vale da 0 a 1 e viene moltiplicato per il suo peso; somma dei pesi = 100.
  punteggio: {
    ...DIZIONARI.punteggio,
    confermaPerPunteggioC: true,       // true = un'opportunità C passa a Offerta solo con una motivazione; false = nessun controllo
    // Colore del punteggio: ogni fascia vale da «da» punti in su (dalla migliore alla peggiore).
    // Alto e altissimo = trattativa buona (da punteggio.buona = 70 in su, decisione del 21/10)
    fasce: [
      { da: 85, nome: "altissimo" },
      { da: DIZIONARI.punteggio.buona, nome: "alto" },
      { da: 50, nome: "medio" },
      { da: 30, nome: "basso" },
      { da: 0, nome: "bassissimo" },
    ],
  },

  // ------------------------------------------------ Canali di acquisizione
  // Dizionario unico (tabella canali del database): tipo digitale, diretto, intermediato o gara.
  // I canali spenti (attivo = false, «da confermare con Gate») non compaiono nei menu né nei costi.
  // I costi dei canali sono quelli mensili del database (tabella costi_canale).
  canali: DIZIONARI.canali,
  // I 7 gruppi di canale (modifica 1) con il canale che rappresenta ciascuno quando un CSV indica solo il gruppo
  gruppiCanali: DIZIONARI.gruppiCanali,

  // Tipi di attività registrabili nella scheda cliente
  tipiAttivita: ["Chiamata", "Email", "WhatsApp", "Visita", "Nota"],
  canaliPreferiti: ["Telefono", "WhatsApp", "Email"],

  // ------------------------------------------------------------- Privacy
  // Da confermare con il consulente privacy di Gate: il prototipo serve solo a registrarle.
  // La prima voce indica che la base giuridica non è ancora stata verificata: lasciala per prima.
  basiGiuridiche: DIZIONARI.basiGiuridiche,
  modiRaccolta: DIZIONARI.modiRaccolta,

  // ------------------------------------------------- Obiettivi dei KPI
  obiettivi: {
    tassoQualificati: 0.60,        // contatti qualificati / contatti
    tassoSopralluoghi: 0.50,       // sopralluoghi / qualificati
    conversioneOfferte: 0.35,      // contratti / offerte
    costoAcquisizioneMax: 1500,    // € per contratto (costi dei canali ÷ contratti)
    marginalitaMedia: 0.18,        // margine atteso / ricavi attesi delle trattative aperte
    // Soglia del catalogo dei KPI (kpi_catalogo.soglia), dal PASSAGGIO 3
    primaRispostaGiorni: 1,        // K12: entro 1 giorno lavorativo
  },

  // Suggerimenti mostrati in «Il pilota in sintesi» quando un obiettivo non è raggiunto
  // (stesse chiavi degli obiettivi; ipotesi da confermare con Gate)
  suggerimenti: {
    tassoQualificati: "Filtra meglio i contatti alla prima telefonata",
    tassoSopralluoghi: "Proponi il sopralluogo già nella telefonata di qualifica",
    conversioneOfferte: "Sollecita le offerte aperte e controlla i motivi di perdita",
    costoAcquisizioneMax: "Sposta il budget sui canali con il costo per contratto più basso",
    marginalitaMedia: "Privilegia le commesse eseguibili dalle squadre interne o rivedi la tariffa",
  },

  // ------------------------------------------------- Messaggio WhatsApp
  // Il nome del cliente NON compare: il cliente resta di Gate.
  messaggioWhatsApp:
    "Buongiorno {referente},\nle scrive {mittente}\n" +
    "Le proponiamo una commessa di {servizio} a {comune}: circa {ore} ore al mese, avvio dal {avvio}.\n" +
    "Il contratto con il cliente resta in capo a Gate, che coordina il servizio e ne controlla la qualità.\n" +
    "Può rispondere SÌ o NO a questo messaggio?\n" +
    "Rif. {codice}",

  // ====================================================================
  // SQUADRE E PARTNER DI ESEMPIO (FITTIZI)
  // ====================================================================

  // Squadre interne Gate: ore al mese disponibili e già impegnate su altre commesse (comprese quelle già avviate)
  squadre: [
    { id: "sq1", nome: "Squadra Bari Centro", caposquadra: "Caposquadra A.", zone: ["Bari città"],
      servizi: ["cleaning e hospitality", "servizi alle strutture"], oreCapacita: 2400, oreImpegnate: 2150 },
    { id: "sq2", nome: "Squadra Area Nord", caposquadra: "Caposquadra B.", zone: ["Area Nord"],
      servizi: ["cleaning e hospitality", "logistica e retail"], oreCapacita: 1600, oreImpegnate: 1600 },
    { id: "sq3", nome: "Squadra Sud-Est", caposquadra: "Caposquadra C.", zone: ["Area Sud-Est"],
      servizi: ["cleaning e hospitality", "servizi alle strutture"], oreCapacita: 1500, oreImpegnate: 1300 },
    { id: "sq4", nome: "Squadra Manutenzioni", caposquadra: "Caposquadra D.", zone: ["Bari città", "Area Nord", "Area Sud-Est"],
      servizi: ["servizi alle strutture"], oreCapacita: 480, oreImpegnate: 380 },
  ],

  // Imprese partner, in ordine di priorità.
  // tipo: "impresa" oppure "autonomo" (gli autonomi non sono ammessi).
  // telefono: formato internazionale senza "+" (numeri fittizi: sostituirli prima della demo)
  partner: [
    { id: "pa1", nome: "Orione Servizi S.r.l.", tipo: "impresa", referente: "sig. Orione", telefono: "390000000001",
      zone: ["Area Nord", "Bari città"], servizi: ["cleaning e hospitality"], durcScadenza: traGiorni(140) },
    { id: "pa2", nome: "Vega Facility S.r.l.", tipo: "impresa", referente: "sig.ra Vega", telefono: "390000000002",
      zone: ["Area Nord", "BAT"], servizi: ["cleaning e hospitality", "servizi alle strutture"], durcScadenza: traGiorni(95) },
    { id: "pa3", nome: "Sirio Pulizie Soc. Coop.", tipo: "impresa", referente: "sig. Sirio", telefono: "390000000003",
      zone: ["Area Nord", "Murgia", "Area Sud-Est"], servizi: ["cleaning e hospitality"], durcScadenza: traGiorni(-18) },
    { id: "pa4", nome: "Altair Manutenzioni S.r.l.", tipo: "impresa", referente: "sig. Altair", telefono: "390000000004",
      zone: ["Bari città", "Area Sud-Est", "Murgia"], servizi: ["servizi alle strutture", "logistica e retail"], durcScadenza: traGiorni(200) },
    { id: "pa5", nome: "Luca Deneb", tipo: "autonomo", referente: "Luca Deneb", telefono: "390000000005",
      zone: ["Bari città", "Area Nord"], servizi: ["cleaning e hospitality"], durcScadenza: traGiorni(300) },
  ],

  // Contratti del database firmati negli ultimi N giorni: restano «da assegnare» nell'Allocazione;
  // i più vecchi risultano già avviati (l'esecutore non è registrato nel database di prova)
  giorniContrattiDaAssegnare: 14,

  // Le quattro domande: soglie dei consigli "Cosa conviene fare?" (ipotesi da tarare con Gate)
  // Lista del lunedì (PASSAGGIO 4, N4): soglie delle quattro sezioni
  lunedi: {
    giorniLavorativiRisposta: 1,   // richieste senza prima risposta da più di 1 giorno lavorativo (K12)
    giorniOffertaSenzaEsito: 14,   // offerte inviate senza esito da più di 14 giorni
    giorniScadenzaContratti: 90,   // contratti in scadenza entro 90 giorni...
    giorniScadenzaEvidenza: 60,    // ...in evidenza quelli entro 60
  },

  // Avvisi in cima a «Oggi» (commesse, partner, DURC): compaiono solo quando c'è qualcosa da fare
  avvisi: {
    giorniDurc: 30,              // DURC di un partner scaduto o in scadenza entro 30 giorni
    giorniOfferta: 3,            // soglia della scheda «Sollecita» di Oggi: offerte aperte scadute o in scadenza entro 3 giorni
    giorniCommessa: 5,           // contratti firmati da oltre 5 giorni ancora senza squadra né partner
    giorniRispostaPartner: 2,    // proposte ai partner senza risposta da oltre 2 giorni
  },

  consigli: {
    giorniAvvisoScadenzaOfferta: 3,   // sollecitare le offerte che scadono entro 3 giorni (o già scadute)
    minimoPerditeStessoMotivo: 1,     // consigliare un rimedio quando almeno N trattative sono perse per lo stesso motivo
    rapportoCanaleCaro: 1.5,          // un canale è "caro" se il suo costo per contratto supera di 1,5 volte il migliore
  },
  // Rimedio suggerito per ogni motivo di perdita
  rimediPerdita: {
    "prezzo": "Rivedi la tariffa o proponi una frequenza ridotta",
    "tempi di avvio": "Proponi un avvio più rapido con un partner",
    "fuori zona": "Filtra prima i contatti fuori zona (punteggio basso)",
    "capacità insufficiente": "Allarga la rete dei partner nelle zone sature",
    "nessuna risposta": "Fissa sempre una data di sollecito dopo l'offerta",
  },

  // --------------------------------------- Tempo risparmiato (PASSAGGIO 4, N3)
  // STIME, DA SOSTITUIRE CON LA FOTOGRAFIA DI PARTENZA: minuti per volta oggi (prima) e con il CRM (dopo).
  // volume: "richieste" e "offerte" = quante nell'ultimo mese, dai dati; un numero = volte al mese.
  // «Annotare una richiesta», dopo: la media vera dei secondi registrati con la nota, quando ce ne sono almeno minimoTempiVeri.
  tempoRisparmiato: {
    attivita: [
      { id: "richiesta", nome: "Annotare una richiesta", prima: 10, dopo: 2, volume: "richieste" },
      { id: "offerta", nome: "Preparare un'offerta", prima: 90, dopo: 15, volume: "offerte" },
      { id: "solleciti", nome: "Ricostruire le trattative da sollecitare", prima: 60, dopo: 5, volume: 4.33, nota: "una volta a settimana" },
      { id: "report", nome: "Preparare il report per la direzione", prima: 180, dopo: 10, volume: 1, nota: "una volta al mese" },
    ],
    costoOrario: 25,        // costo di un'ora di lavoro d'ufficio (€)
    minimoTempiVeri: 3,
  },

  // --------------------------------------- Richiesta da nota (PASSAGGIO 4, N1)
  // Regole leggibili con cui l'assistente propone i campi di una nota scritta o dettata. Nessuna intelligenza artificiale:
  // solo parole chiave ed espressioni regolari. Niente si salva senza la conferma di una persona.
  // Le parole che finiscono con * valgono anche come inizio di parola (es. "commercialist*" trova "commercialista").
  assistente: {
    // Parole che introducono il nome dell'azienda (non fanno parte del nome)
    introducono: ["azienda", "ditta", "società", "societa"],
    // Parole con cui comincia il nome dell'azienda (fanno parte del nome), dalla più lunga
    prefissi: ["Studio Legale", "Studio Tecnico", "Studio Commercialisti", "Studio Medico", "Studio", "Poliambulatorio", "Clinica",
      "Laboratorio Analisi", "Laboratorio", "Hotel", "Albergo", "B&B", "Residence", "Ristorante", "Supermercato", "Discount",
      "Centro Uffici", "Centro Commerciale", "Agenzia", "Negozio", "Officine", "Istituto", "Consorzio", "Deposito", "Autotrasporti",
      "Università", "Ospedale", "Farmacia", "Palestra"],
    settori: {
      "uffici e commercio": ["ufficio", "uffici", "studio legale", "studio tecnico", "studio professionale", "commercialist*", "notai*",
        "avvocat*", "agenzia", "negozio", "negozi", "showroom", "coworking", "amministrativ*"],
      "GDO": ["supermercat*", "discount", "centro commerciale", "ipermercat*", "punto vendita"],
      "industria": ["stabiliment*", "officin*", "fabbric*", "produzione", "manifattur*", "industrial*"],
      "ricettivo": ["hotel", "albergo", "b&b", "residence", "ristorant*", "camere", "ricettiv*"],
      "sanità": ["ambulatori*", "poliambulatori*", "clinica", "studio medico", "laboratorio analisi", "dentist*", "sanitari*"],
      "trasporti": ["logistica", "autotrasport*", "spedizion*", "autostazione", "corrier*"],
      "enti pubblici": ["comune di", "scuola", "istituto", "asl", "pubblica amministrazione", "ufficio comunale", "universit*"],
    },
    // Tipo di ambienti del preventivo (nomi uguali a preventivo.ambienti)
    ambienti: {
      "Uffici e studi": ["ufficio", "uffici", "studio legale", "studio tecnico", "studio professionale", "sede amministrativa"],
      "Negozi e sale d'attesa": ["negozio", "negozi", "sala d'attesa", "sale d'attesa", "showroom", "punto vendita"],
      "Ambulatori e studi medici": ["ambulatori*", "poliambulatori*", "studio medico", "studi medici", "clinica"],
      "Magazzini e capannoni": ["magazzin*", "capannon*", "deposito"],
      "Hotel e ricettivo": ["hotel", "albergo", "camere", "b&b", "residence"],
    },
    // «Tutti i giorni» per un ufficio vuol dire di solito dal lunedì al venerdì: proposta da controllare
    frequenzaGiornaliera: "5 volte a settimana",
    frequenzaGiorniAlterni: "3 volte a settimana",
    // Canale (nomi del dizionario canali), in ordine di priorità quando la nota ne cita più di uno
    canali: [
      ["LinkedIn", ["linkedin"]],
      ["passaparola", ["passaparola", "consigliat*", "consiglio di", "su consiglio"]],
      ["intermediario", ["intermediari*", "agenzia", "un'agenzia"]],
      ["profilo Google", ["google"]],
      ["sito web", ["sito", "internet", "online"]],
      ["WhatsApp Business", ["whatsapp"]],
      ["portale gare", ["gara", "portale"]],
      ["porta a porta", ["porta a porta"]],
      ["contatto diretto", ["evento", "fiera", "incontro", "sul posto", "di persona"]],
    ],
    // Se la nota non dice come ci ha conosciuto ma che ha chiamato, il canale proposto è il telefono (da controllare)
    canaleTelefono: ["telefonat*", "ha chiamato", "ci ha chiamato", "chiamata"],
    ruoli: ["responsabile acquisti", "responsabile di sede", "responsabile amministrativo", "facility manager", "office manager",
      "socio amministratore", "amministratore delegato", "amministratore", "titolare", "direttore", "direttrice", "segreteria",
      "segretaria", "proprietario", "presidente", "responsabile"],
    titoli: ["sig.ra", "sig.", "signora", "signor", "dott.ssa", "dott.", "dottoressa", "dottor", "avv.", "ing.", "arch."],
    // Servizio riconosciuto dalle parole della nota (prevale su quello proposto dal settore)
    servizi: {
      "cleaning e hospitality": ["pulizi*", "sanificazion*", "igienizzazion*", "portineria", "reception", "accoglienza"],
      "logistica e retail": ["facchinaggio", "logistica", "scaffalatur*", "rifornimento", "movimentazione"],
      "servizi alle strutture": ["manutenzion*", "giardinaggio", "verde", "impianti", "piccoli lavori"],
    },
    // Servizio proposto in base al settore (si può cambiare prima di confermare)
    servizioPerSettore: {
      "uffici e commercio": "cleaning e hospitality", "GDO": "logistica e retail", "industria": "servizi alle strutture",
      "ricettivo": "cleaning e hospitality", "sanità": "cleaning e hospitality", "trasporti": "logistica e retail",
      "enti pubblici": "cleaning e hospitality",
    },
    // Note di esempio (INVENTATE: nomi, numeri e indirizzi non esistono) con il risultato atteso per la prova (prove/e2e.js)
    noteDiProva: [
      { testo: "Ha chiamato la dott.ssa Laura Bianchi, office manager dello Studio Legale Ferri di Bari. Hanno uffici di 350 mq in via Sparano, " +
          "vorrebbero la pulizia 3 volte a settimana. Ci ha conosciuti tramite LinkedIn. Tel 333 123 4567, email l.bianchi@studioferri.example",
        atteso: { azienda: "Studio Legale Ferri", comune: "Bari", settore: "uffici e commercio", mq: 350, ambiente: "Uffici e studi",
          frequenza: "3 volte a settimana", canale: "LinkedIn", ruolo: "office manager", telefono: "3331234567", email: "l.bianchi@studioferri.example" } },
      { testo: "Incontro sul posto con il titolare della ditta Logistica Mare a Modugno: capannone e magazzino di 1.200 metri quadri, pulizia settimanale. " +
          "Ce l'ha consigliato un cliente (passaparola). Cell. 340 555 0101",
        atteso: { azienda: "Logistica Mare", comune: "Modugno", settore: "trasporti", mq: 1200, ambiente: "Magazzini e capannoni",
          frequenza: "1 volta a settimana", canale: "passaparola", ruolo: "titolare", telefono: "3405550101", email: "" } },
      { testo: "Telefonata dal Poliambulatorio San Nicola, Bitonto. Parla la responsabile acquisti, sig.ra Marta Greco. Ambulatori per circa 280 m2, " +
          "servono pulizie tutti i giorni. Ci hanno trovati sul sito. marta.greco@sannicola.example",
        atteso: { azienda: "Poliambulatorio San Nicola", comune: "Bitonto", settore: "sanità", mq: 280, ambiente: "Ambulatori e studi medici",
          frequenza: "5 volte a settimana", canale: "sito web", ruolo: "responsabile acquisti", telefono: "", email: "marta.greco@sannicola.example" } },
      { testo: "Società Adriatica Servizi Srl di Molfetta, uffici amministrativi 600 mq, due volte alla settimana. Referente: Paolo Conti, facility manager, " +
          "080 123 4567. Contatto avuto a un evento a Bari.",
        atteso: { azienda: "Adriatica Servizi Srl", comune: "Molfetta", settore: "uffici e commercio", mq: 600, ambiente: "Uffici e studi",
          frequenza: "2 volte a settimana", canale: "contatto diretto", ruolo: "facility manager", telefono: "0801234567", email: "" } },
      { testo: "Hotel Belvedere a Monopoli, 40 camere più la hall: chiedono un preventivo per pulizie 6 volte a settimana, circa 900 mq. " +
          "Ci ha chiamato il direttore, Giorgio Lamanna, 347 222 3344: dice che ci conosce tramite un'agenzia (intermediario).",
        atteso: { azienda: "Hotel Belvedere", comune: "Monopoli", settore: "ricettivo", mq: 900, ambiente: "Hotel e ricettivo",
          frequenza: "6 volte a settimana", canale: "intermediario", ruolo: "direttore", telefono: "3472223344", email: "" } },
    ],
  },

  // ------------------------------------------- Collegamento con sito e social
  // Ogni link del modulo porta utm_source (canale), utm_campaign (settore pilota) e utm_content (id del contenuto):
  // così il CRM segue ogni richiesta dal contenuto che l'ha generata fino al contratto e al margine. Niente pixel di tracciamento.
  campagnaPilota: DIZIONARI.campagnaPilota,
  // Dove arrivano le richieste dei moduli "Richiedi un sopralluogo" e "Richiedi un preventivo" (fittizi: sostituirli con quelli di Gate)
  contattiGate: {
    whatsapp: "390000000000",
    email: "commerciale@example.com",
  },
};
