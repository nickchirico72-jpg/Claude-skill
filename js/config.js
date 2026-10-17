/*
 * CONFIGURAZIONE DEL PROTOTIPO
 * ----------------------------------------------------------------------------
 * Qui stanno TUTTE le ipotesi e i dati di esempio. Sono FITTIZI.
 * Dopo l'intervista a Gate basta sostituire i valori in questo file:
 * la logica (punteggio, allocazione, KPI) non va toccata.
 *
 * Le date degli esempi sono relative a oggi (es. traGiorni(-30) = 30 giorni fa),
 * così la demo resta sempre attuale. Con i dati reali si possono scrivere
 * date normali nel formato "2026-11-30".
 */

// Restituisce la data di oggi spostata di n giorni, nel formato AAAA-MM-GG
function traGiorni(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

const CONFIG = {
  // Chiave con cui i dati vengono salvati nel browser (localStorage)
  chiaveSalvataggio: "gate-sviluppo-commerciale-v2",
  // Versione della struttura dei dati salvati: NON modificarla, la aggiorna chi cambia il codice (vedi migra() in dati.js)
  versioneDati: 3,

  // ---------------------------------------------------------------- Pilota
  pilota: {
    settore: "Uffici e studi professionali",
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
    { id: "contatto",    nome: "Contatto",    probabilita: 0.05, azione: "È qualificato",
      giorniFerma: 7,    followUp: { giorni: 2,  tipo: "Chiamata", testo: "Chiamata di qualifica" } },
    { id: "qualificato", nome: "Qualificato", probabilita: 0.15, azione: "Sopralluogo fatto",
      giorniFerma: 14,   followUp: { giorni: 3,  tipo: "Chiamata", testo: "Fissare il sopralluogo" } },
    { id: "sopralluogo", nome: "Sopralluogo", probabilita: 0.35, azione: "Offerta inviata", metodo: "Analisi",
      giorniFerma: 14,   followUp: { giorni: 5,  tipo: "Email",    testo: "Preparare e inviare l'offerta" } },
    { id: "offerta",     nome: "Offerta",     probabilita: 0.55, azione: "Contratto firmato", metodo: "Proposta",
      giorniFerma: 21,   followUp: { giorni: 7,  tipo: "Chiamata", testo: "Sollecitare la risposta all'offerta" } },
    { id: "contratto",   nome: "Contratto",   probabilita: 1.0,  metodo: "Esecuzione",
      giorniFerma: null, followUp: { giorni: 45, tipo: "Visita",   testo: "Controllo qualità dopo il primo mese" } },
  ],
  motiviPerdita: ["Prezzo", "Tempi di avvio", "Fuori zona", "Capacità insufficiente", "Nessuna risposta", "Altro"],

  // ------------------------------------------------------------- Settori
  settori: [
    "Uffici e studi professionali",
    "Sanità privata",
    "GDO e logistica",
    "Industria",
    "Enti pubblici",
  ],

  // ------------------------------------------------------- Servizi (€/ora)
  // tariffa = prezzo di vendita orario proposto al cliente
  // costoInterno = costo del lavoro orario di una squadra Gate
  // costoPartner = quanto Gate paga all'impresa partner per un'ora di servizio
  servizi: {
    "Pulizia Professionale": { tariffa: 22, costoInterno: 16.0, costoPartner: 18.2 },
    "Pest Control":          { tariffa: 40, costoInterno: 26.0, costoPartner: 31.0 },
    "Manutenzioni":          { tariffa: 32, costoInterno: 22.0, costoPartner: 26.0 },
    "Giardinaggio":          { tariffa: 25, costoInterno: 17.5, costoPartner: 20.0 },
    "Logistica":             { tariffa: 21, costoInterno: 15.5, costoPartner: 17.5 },
  },
  // Spese dirette (prodotti, attrezzature, trasferte) in % sui ricavi
  speseDirettePercentuale: 0.04,

  // ------------------------------------------- Comuni e zone (distanze indicative)
  comuni: [
    { nome: "Bari",            km: 0,  zona: "Bari città" },
    { nome: "Modugno",         km: 11, zona: "Area Nord" },
    { nome: "Bitonto",         km: 19, zona: "Area Nord" },
    { nome: "Giovinazzo",      km: 21, zona: "Area Nord" },
    { nome: "Molfetta",        km: 29, zona: "Area Nord" },
    { nome: "Triggiano",       km: 10, zona: "Area Sud-Est" },
    { nome: "Capurso",         km: 12, zona: "Area Sud-Est" },
    { nome: "Valenzano",       km: 13, zona: "Area Sud-Est" },
    { nome: "Noicattaro",      km: 17, zona: "Area Sud-Est" },
    { nome: "Casamassima",     km: 20, zona: "Area Sud-Est" },
    { nome: "Mola di Bari",    km: 22, zona: "Area Sud-Est" },
    { nome: "Conversano",      km: 31, zona: "Area Sud-Est" },
    { nome: "Gioia del Colle", km: 41, zona: "Murgia" },
    { nome: "Altamura",        km: 46, zona: "Murgia" },
    { nome: "Trani",           km: 45, zona: "BAT" },
  ],

  // ----------------------------------------------- Punteggio di coerenza
  // Ogni criterio vale da 0 a 1 e viene moltiplicato per il suo peso.
  // Somma dei pesi = 100, quindi il punteggio va da 0 a 100.
  punteggio: {
    pesi: {
      settore: 20,     // settore pilota
      distanza: 15,    // distanza da Bari
      capacita: 20,    // capacità disponibile (squadra o partner)
      margine: 20,     // margine stimato
      dimensione: 10,  // dimensione della commessa (valore annuo)
      decisore: 15,    // decisore identificato
    },
    soglie: { A: 75, B: 50 },          // A da 75 in su, B da 50 in su, C sotto
    settoreFuoriPilota: 0.3,           // valore del criterio per settori non pilota
    distanzaKm: { piena: 15, massima: 35 },          // entro 15 km = 1; entro 35 = 0,5; oltre = 0
    margine: { obiettivo: 0.20, minimo: 0.12 },      // >= 20% = 1; >= 12% = 0,5; sotto = 0
    valoreAnnuo: {                                   // € all'anno
      idealeDa: 6000, idealeA: 60000,                // nel range ideale = 1
      accettabileDa: 3000, accettabileA: 100000,     // nel range accettabile = 0,5; fuori = 0
    },
    confermaPerPunteggioC: true,       // true = un'opportunità C passa a Offerta solo con una motivazione; false = nessun controllo
  },

  // ---------------------------------- Costi commerciali (costo di acquisizione)
  costiAcquisizione: {
    perContatto: 20,          // € di tempo commerciale per ogni contatto gestito
    perSopralluogo: 80,       // € per ogni sopralluogo (tempo + trasferta)
    perOfferta: 120,          // € per preparare ogni offerta
    // € spesi nel pilota per ogni canale di acquisizione (materiali, eventi, provvigioni...)
    fissiPerCanale: {
      "Sito web": 300,
      "Porta a porta": 200,
      "Intermediario": 500,
      "Portale gare": 100,
      "Eventi e LinkedIn": 400,
      "Passaparola": 0,
      "Contatto diretto": 0,   // telefonata o email ricevuta senza un canale preciso
      "Facebook": 250,         // campagne e post sponsorizzati
      "Instagram": 250,
      "LinkedIn": 300,
      "Google Ads": 400,
    },
  },

  // Tipi di attività registrabili nella scheda cliente
  tipiAttivita: ["Chiamata", "Email", "WhatsApp", "Visita", "Nota"],
  canaliPreferiti: ["Telefono", "WhatsApp", "Email"],

  // ------------------------------------------------------------- Privacy
  // Da confermare con il consulente privacy di Gate: il prototipo serve solo a registrarle.
  // La prima voce indica che la base giuridica non è ancora stata verificata: lasciala per prima.
  basiGiuridiche: ["Da verificare", "Consenso", "Legittimo interesse (B2B)", "Contratto in corso"],
  modiRaccolta: ["A voce", "Modulo del sito", "Email", "Biglietto da visita", "Altro"],

  // ------------------------------------------------- Obiettivi dei KPI
  obiettivi: {
    tassoQualificati: 0.60,        // contatti qualificati / contatti
    tassoSopralluoghi: 0.50,       // sopralluoghi / qualificati
    conversioneOfferte: 0.35,      // contratti / offerte
    costoAcquisizioneMax: 1500,    // € per contratto
    marginalitaMedia: 0.18,        // margine / ricavi previsti
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
  // DATI DI ESEMPIO (FITTIZI)
  // ====================================================================

  // Squadre interne Gate: ore al mese disponibili e già impegnate su altre commesse
  squadre: [
    { id: "sq1", nome: "Squadra Bari Centro", caposquadra: "Caposquadra A.", zone: ["Bari città"],
      servizi: ["Pulizia Professionale", "Manutenzioni"], oreCapacita: 640, oreImpegnate: 540 },
    { id: "sq2", nome: "Squadra Area Nord", caposquadra: "Caposquadra B.", zone: ["Area Nord"],
      servizi: ["Pulizia Professionale", "Logistica"], oreCapacita: 520, oreImpegnate: 520 },
    { id: "sq3", nome: "Squadra Sud-Est", caposquadra: "Caposquadra C.", zone: ["Area Sud-Est"],
      servizi: ["Pulizia Professionale", "Giardinaggio"], oreCapacita: 480, oreImpegnate: 440 },
    { id: "sq4", nome: "Squadra Pest Control", caposquadra: "Caposquadra D.", zone: ["Bari città", "Area Nord", "Area Sud-Est"],
      servizi: ["Pest Control"], oreCapacita: 160, oreImpegnate: 120 },
  ],

  // Imprese partner, in ordine di priorità.
  // tipo: "impresa" oppure "autonomo" (gli autonomi non sono ammessi).
  // telefono: formato internazionale senza "+" (numeri fittizi: sostituirli prima della demo)
  partner: [
    { id: "pa1", nome: "Orione Servizi S.r.l.", tipo: "impresa", referente: "sig. Orione", telefono: "390000000001",
      zone: ["Area Nord", "Bari città"], servizi: ["Pulizia Professionale"], durcScadenza: traGiorni(140) },
    { id: "pa2", nome: "Vega Facility S.r.l.", tipo: "impresa", referente: "sig.ra Vega", telefono: "390000000002",
      zone: ["Area Nord", "BAT"], servizi: ["Pulizia Professionale", "Giardinaggio"], durcScadenza: traGiorni(95) },
    { id: "pa3", nome: "Sirio Pulizie Soc. Coop.", tipo: "impresa", referente: "sig. Sirio", telefono: "390000000003",
      zone: ["Area Nord", "Murgia", "Area Sud-Est"], servizi: ["Pulizia Professionale"], durcScadenza: traGiorni(-18) },
    { id: "pa4", nome: "Altair Manutenzioni S.r.l.", tipo: "impresa", referente: "sig. Altair", telefono: "390000000004",
      zone: ["Bari città", "Area Sud-Est", "Murgia"], servizi: ["Manutenzioni", "Giardinaggio"], durcScadenza: traGiorni(200) },
    { id: "pa5", nome: "Luca Deneb", tipo: "autonomo", referente: "Luca Deneb", telefono: "390000000005",
      zone: ["Bari città", "Area Nord"], servizi: ["Pulizia Professionale"], durcScadenza: traGiorni(300) },
  ],

  // Aziende (clienti e potenziali clienti) con i loro referenti.
  // fonte = canale da cui è arrivato il contatto (vedi costiAcquisizione.fissiPerCanale).
  // privacy: true = consenso dato, false = da verificare (nei dati salvati diventa base giuridica, data, modo di raccolta e opposizione: vedi migra() in dati.js).
  aziende: [
    { id: "az1", ragioneSociale: "Studio Legale Alfa", piva: "00000000101", settore: "Uffici e studi professionali", comune: "Bari", fonte: "Passaparola",
      referenti: [
        { nome: "Avv. Laura Ferri", ruolo: "Socia titolare", decisore: true, telefono: "390000001011", email: "l.ferri@example.com", canale: "Telefono", privacy: true },
        { nome: "Giulia Neri", ruolo: "Segreteria", decisore: false, telefono: "390000001012", email: "segreteria.alfa@example.com", canale: "Email", privacy: true },
      ] },
    { id: "az2", ragioneSociale: "Studio Notarile Kappa", piva: "00000000102", settore: "Uffici e studi professionali", comune: "Bitonto", fonte: "Sito web",
      referenti: [
        { nome: "Notaio Paolo Conte", ruolo: "Titolare", decisore: true, telefono: "390000001021", email: "p.conte@example.com", canale: "Email", privacy: true },
        { nome: "Sara Gallo", ruolo: "Segreteria", decisore: false, telefono: "390000001022", email: "info.kappa@example.com", canale: "Telefono", privacy: true },
      ] },
    { id: "az3", ragioneSociale: "Studio Associato Beta", piva: "00000000103", settore: "Uffici e studi professionali", comune: "Bari", fonte: "Eventi e LinkedIn",
      referenti: [{ nome: "Dott. Andrea Lupo", ruolo: "Socio amministratore", decisore: true, telefono: "390000001031", email: "a.lupo@example.com", canale: "WhatsApp", privacy: true }] },
    { id: "az4", ragioneSociale: "Centro Uffici Gamma", piva: "00000000104", settore: "Uffici e studi professionali", comune: "Modugno", fonte: "Intermediario",
      referenti: [{ nome: "Ing. Marta Riva", ruolo: "Facility manager", decisore: true, telefono: "390000001041", email: "m.riva@example.com", canale: "Telefono", privacy: true }] },
    { id: "az5", ragioneSociale: "Poliambulatorio Zeta", piva: "00000000105", settore: "Sanità privata", comune: "Bari", fonte: "Sito web",
      referenti: [
        { nome: "Dott. Luca Sala", ruolo: "Direttore sanitario", decisore: true, telefono: "390000001051", email: "l.sala@example.com", canale: "Email", privacy: true },
        { nome: "Elena Moro", ruolo: "Amministrazione", decisore: false, telefono: "390000001052", email: "amministrazione.zeta@example.com", canale: "Email", privacy: true },
      ] },
    { id: "az6", ragioneSociale: "Studio Dentistico Lambda", piva: "00000000106", settore: "Sanità privata", comune: "Bari", fonte: "Porta a porta",
      referenti: [{ nome: "Dott.ssa Chiara Fois", ruolo: "Titolare", decisore: true, telefono: "390000001061", email: "c.fois@example.com", canale: "Telefono", privacy: true }] },
    { id: "az7", ragioneSociale: "Agenzia Delta Assicurazioni", piva: "00000000107", settore: "Uffici e studi professionali", comune: "Bari", fonte: "Porta a porta",
      referenti: [{ nome: "Davide Testa", ruolo: "Responsabile di sede", decisore: false, telefono: "390000001071", email: "d.testa@example.com", canale: "Telefono", privacy: true }] },
    { id: "az8", ragioneSociale: "Magazzino Omicron", piva: "00000000108", settore: "GDO e logistica", comune: "Modugno", fonte: "Portale gare",
      referenti: [{ nome: "Fabio Greco", ruolo: "Responsabile logistica", decisore: true, telefono: "390000001081", email: "f.greco@example.com", canale: "Email", privacy: true }] },
    { id: "az9", ragioneSociale: "Coworking Iota", piva: "00000000109", settore: "Uffici e studi professionali", comune: "Bari", fonte: "Eventi e LinkedIn",
      referenti: [{ nome: "Valeria Costa", ruolo: "Community manager", decisore: true, telefono: "390000001091", email: "v.costa@example.com", canale: "WhatsApp", privacy: true }] },
    { id: "az10", ragioneSociale: "Studio Tecnico Epsilon", piva: "00000000110", settore: "Uffici e studi professionali", comune: "Triggiano", fonte: "Passaparola",
      referenti: [{ nome: "Ing. Roberto Fini", ruolo: "Titolare", decisore: true, telefono: "390000001101", email: "r.fini@example.com", canale: "Telefono", privacy: true }] },
    { id: "az11", ragioneSociale: "Officine Theta", piva: "00000000111", settore: "Industria", comune: "Molfetta", fonte: "Intermediario",
      referenti: [{ nome: "Silvia Rota", ruolo: "Ufficio acquisti", decisore: false, telefono: "390000001111", email: "acquisti.theta@example.com", canale: "Email", privacy: true }] },
    { id: "az12", ragioneSociale: "Ente di Formazione Mu", piva: "00000000112", settore: "Enti pubblici", comune: "Bari", fonte: "Portale gare",
      referenti: [{ nome: "Mario Piras", ruolo: "Ufficio economato", decisore: false, telefono: "390000001121", email: "economato.mu@example.com", canale: "Email", privacy: true }] },
    { id: "az13", ragioneSociale: "Studio Commercialisti Nu", piva: "00000000113", settore: "Uffici e studi professionali", comune: "Casamassima", fonte: "Sito web",
      referenti: [{ nome: "Dott. Paolo Serra", ruolo: "Titolare", decisore: true, telefono: "390000001131", email: "p.serra@example.com", canale: "Telefono", privacy: true }] },
    { id: "az14", ragioneSociale: "Studio Architetti Pi", piva: "00000000114", settore: "Uffici e studi professionali", comune: "Bari", fonte: "Eventi e LinkedIn",
      referenti: [{ nome: "Irene Valli", ruolo: "Segreteria", decisore: false, telefono: "390000001141", email: "studio.pi@example.com", canale: "Email", privacy: false }] },
    { id: "az15", ragioneSociale: "Supermercato Eta", piva: "00000000115", settore: "GDO e logistica", comune: "Altamura", fonte: "Porta a porta",
      referenti: [{ nome: "Giorgio Pace", ruolo: "Direttore di punto vendita", decisore: true, telefono: "390000001151", email: "g.pace@example.com", canale: "Telefono", privacy: true }] },
    { id: "az16", ragioneSociale: "Laboratorio Sigma", piva: "00000000116", settore: "Industria", comune: "Gioia del Colle", fonte: "Intermediario",
      referenti: [{ nome: "Nadia Leone", ruolo: "Ufficio acquisti", decisore: false, telefono: "390000001161", email: "n.leone@example.com", canale: "Email", privacy: true }] },
    { id: "az17", ragioneSociale: "Studio Medico Tau", piva: "00000000117", settore: "Sanità privata", comune: "Valenzano", fonte: "Sito web",
      referenti: [{ nome: "Dott. Enrico Bassi", ruolo: "Titolare", decisore: true, telefono: "390000001171", email: "e.bassi@example.com", canale: "Telefono", privacy: true }] },
    { id: "az18", ragioneSociale: "Agenzia Immobiliare Rho", piva: "00000000118", settore: "Uffici e studi professionali", comune: "Bari", fonte: "Porta a porta",
      referenti: [{ nome: "Simona Ricci", ruolo: "Titolare", decisore: true, telefono: "390000001181", email: "s.ricci@example.com", canale: "WhatsApp", privacy: false }] },
  ],

  // Opportunità commerciali: una trattativa per un servizio con un'azienda.
  // comune = sede di lavoro dove si svolge il servizio.
  // storico: fasi raggiunte con la data. Le opportunità perse hanno anche "perso".
  // scadenzaOfferta: fino a quando vale l'offerta inviata.
  // allocazione: a chi è stata affidata la commessa (solo per i contratti).
  opportunita: [
    { azienda: "az1", comune: "Bari", servizio: "Pulizia Professionale", ore: 48,
      storico: { contatto: traGiorni(-82), qualificato: traGiorni(-78), sopralluogo: traGiorni(-70), offerta: traGiorni(-62), contratto: traGiorni(-41) },
      allocazione: { tipo: "squadra", id: "sq1", data: traGiorni(-40) } },
    { azienda: "az2", comune: "Bitonto", servizio: "Pulizia Professionale", ore: 36,
      storico: { contatto: traGiorni(-75), qualificato: traGiorni(-71), sopralluogo: traGiorni(-60), offerta: traGiorni(-52), contratto: traGiorni(-30) },
      allocazione: { tipo: "partner", id: "pa2", data: traGiorni(-28) },
      proposte: [{ partnerId: "pa2", data: traGiorni(-29), esito: "si" }] },
    { azienda: "az3", comune: "Bari", servizio: "Pulizia Professionale", ore: 32,
      storico: { contatto: traGiorni(-50), qualificato: traGiorni(-47), sopralluogo: traGiorni(-40), offerta: traGiorni(-33), contratto: traGiorni(-3) } },
    { azienda: "az4", comune: "Modugno", servizio: "Pulizia Professionale", ore: 120,
      storico: { contatto: traGiorni(-44), qualificato: traGiorni(-41), sopralluogo: traGiorni(-30), offerta: traGiorni(-20) },
      scadenzaOfferta: traGiorni(10) },
    { azienda: "az5", comune: "Bari", servizio: "Pulizia Professionale", ore: 90,
      storico: { contatto: traGiorni(-58), qualificato: traGiorni(-55), sopralluogo: traGiorni(-45), offerta: traGiorni(-35) },
      scadenzaOfferta: traGiorni(-5) },
    { azienda: "az6", comune: "Bari", servizio: "Pulizia Professionale", ore: 16,
      storico: { contatto: traGiorni(-66), qualificato: traGiorni(-63), sopralluogo: traGiorni(-57), offerta: traGiorni(-50) },
      perso: { data: traGiorni(-36), motivo: "Prezzo" } },
    { azienda: "az7", comune: "Bari", servizio: "Pulizia Professionale", ore: 24,
      storico: { contatto: traGiorni(-30), qualificato: traGiorni(-26), sopralluogo: traGiorni(-12) } },
    { azienda: "az8", comune: "Modugno", servizio: "Logistica", ore: 160,
      storico: { contatto: traGiorni(-34), qualificato: traGiorni(-30), sopralluogo: traGiorni(-15) } },
    { azienda: "az9", comune: "Bari", servizio: "Pulizia Professionale", ore: 40,
      storico: { contatto: traGiorni(-25), qualificato: traGiorni(-21), sopralluogo: traGiorni(-9) } },
    { azienda: "az10", comune: "Triggiano", servizio: "Pulizia Professionale", ore: 20,
      storico: { contatto: traGiorni(-18), qualificato: traGiorni(-14) } },
    { azienda: "az11", comune: "Molfetta", servizio: "Manutenzioni", ore: 40,
      storico: { contatto: traGiorni(-22), qualificato: traGiorni(-16) } },
    { azienda: "az12", comune: "Bari", servizio: "Giardinaggio", ore: 30,
      storico: { contatto: traGiorni(-48), qualificato: traGiorni(-44) },
      perso: { data: traGiorni(-31), motivo: "Tempi di avvio" } },
    { azienda: "az13", comune: "Casamassima", servizio: "Pulizia Professionale", ore: 28,
      storico: { contatto: traGiorni(-6) } },
    { azienda: "az14", comune: "Bari", servizio: "Pulizia Professionale", ore: 12,
      storico: { contatto: traGiorni(-4) } },
    { azienda: "az15", comune: "Altamura", servizio: "Pest Control", ore: 6,
      storico: { contatto: traGiorni(-9) } },
    { azienda: "az16", comune: "Gioia del Colle", servizio: "Pulizia Professionale", ore: 70,
      storico: { contatto: traGiorni(-40) },
      perso: { data: traGiorni(-33), motivo: "Fuori zona" } },
  ],

  // Attività registrate (chiamate, email, visite, note) e attività da fare (promemoria).
  // automatica: true = promemoria della fase in cui è la trattativa: sparisce da solo quando la fase cambia.
  attivita: [
    { azienda: "az1", tipo: "Nota", data: traGiorni(-35), testo: "Servizio avviato: controllo qualità previsto dopo il primo mese." },
    { azienda: "az1", tipo: "Visita", data: traGiorni(5), testo: "Controllo qualità con il cliente", daFare: true, automatica: true },
    { azienda: "az4", tipo: "Chiamata", data: traGiorni(-15), testo: "Follow-up sull'offerta: il cliente chiede i tempi di avvio." },
    { azienda: "az4", tipo: "Chiamata", data: traGiorni(0), testo: "Richiamare per l'esito dell'offerta", daFare: true, automatica: true },
    { azienda: "az5", tipo: "Email", data: traGiorni(-35), testo: "Inviata l'offerta per pulizia e sanificazione degli ambulatori." },
    { azienda: "az5", tipo: "Email", data: traGiorni(-2), testo: "Sollecitare la risposta all'offerta", daFare: true, automatica: true },
    { azienda: "az6", tipo: "Chiamata", data: traGiorni(-36), testo: "Il cliente ha scelto un'offerta più economica." },
    { azienda: "az7", tipo: "Visita", data: traGiorni(-12), testo: "Sopralluogo: uffici su due piani, circa 380 mq." },
    { azienda: "az7", tipo: "Chiamata", data: traGiorni(3), testo: "Individuare il decisore (direzione regionale)", daFare: true },
    { azienda: "az9", tipo: "Visita", data: traGiorni(-9), testo: "Sopralluogo: open space e tre sale riunioni." },
    { azienda: "az9", tipo: "Nota", data: traGiorni(0), testo: "Preparare l'offerta", daFare: true, automatica: true },
    { azienda: "az13", tipo: "Nota", data: traGiorni(-6), testo: "Richiesta arrivata dal modulo «Richiedi un preventivo» del sito." },
    { azienda: "az13", tipo: "Chiamata", data: traGiorni(1), testo: "Prima telefonata di qualifica", daFare: true, automatica: true },
    { azienda: "az14", tipo: "Chiamata", data: traGiorni(-4), testo: "Interessati a una pulizia settimanale; manca il consenso privacy." },
    { azienda: "az17", tipo: "Nota", data: traGiorni(-2), testo: "Richiesta dal sito, ancora da qualificare." },
    { azienda: "az17", tipo: "Chiamata", data: traGiorni(0), testo: "Chiamare per qualificare la richiesta", daFare: true },
    { azienda: "az18", tipo: "Visita", data: traGiorni(-10), testo: "Visita porta a porta: lasciata la brochure dei servizi." },
    { azienda: "az18", tipo: "Visita", data: traGiorni(7), testo: "Ripassare in agenzia", daFare: true },
  ],

  // Le quattro domande: soglie dei consigli "Cosa conviene fare?" (ipotesi da tarare con Gate)
  consigli: {
    giorniAvvisoScadenzaOfferta: 3,   // sollecitare le offerte che scadono entro 3 giorni (o già scadute)
    minimoPerditeStessoMotivo: 1,     // consigliare un rimedio quando almeno N trattative sono perse per lo stesso motivo
    rapportoCanaleCaro: 1.5,          // un canale è "caro" se il suo costo per contratto supera di 1,5 volte il migliore
  },
  // Rimedio suggerito per ogni motivo di perdita
  rimediPerdita: {
    "Prezzo": "Rivedi la tariffa o proponi una frequenza ridotta",
    "Tempi di avvio": "Proponi un avvio più rapido con un partner",
    "Fuori zona": "Filtra prima i contatti fuori zona (punteggio C)",
    "Capacità insufficiente": "Allarga la rete dei partner nelle zone sature",
    "Nessuna risposta": "Fissa sempre una data di sollecito dopo l'offerta",
  },

  // ------------------------------------------- Collegamento con sito e social
  // Ogni canale digitale ha un codice (utm_source) che si aggiunge al link del modulo:
  // così il CRM sa da dove arriva ogni richiesta.
  canaliDigitali: [
    { fonte: "Sito web", codice: "sito" },
    { fonte: "Facebook", codice: "facebook" },
    { fonte: "Instagram", codice: "instagram" },
    { fonte: "LinkedIn", codice: "linkedin" },
    { fonte: "Google Ads", codice: "google" },
  ],
  // Dove arrivano le richieste del modulo "Richiedi un preventivo" (fittizi: sostituirli con quelli di Gate)
  contattiGate: {
    whatsapp: "390000000000",
    email: "commerciale@example.com",
  },
};
