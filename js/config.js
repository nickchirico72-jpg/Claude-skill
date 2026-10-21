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

  // Ruoli di chi usa il CRM; vista = livello degli Indicatori che si apre per primo
  ruoli: [
    { id: "direzione", nome: "Direzione", vista: "previsione" },
    { id: "commerciale", nome: "Commerciale", vista: "offerta" },
    { id: "ufficio", nome: "Ufficio", vista: "offerta" },
  ],

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

  // Chi firma i messaggi WhatsApp ai partner
  mittente: "l'Ufficio commerciale di Gate S.R.L.",

  // Giorni tra la firma del contratto e l'avvio del servizio (proposta, modificabile alla firma)
  giorniAvvioServizio: 15,
  // Giorni di validità di un'offerta dalla data di invio (proposta, modificabile all'invio)
  giorniValiditaOfferta: 30,

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
