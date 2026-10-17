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
  chiaveSalvataggio: "gate-sviluppo-commerciale-v1",

  // ---------------------------------------------------------------- Pilota
  pilota: {
    settore: "Uffici e studi professionali",
    territorio: "Bari e provincia",
  },

  // Chi firma i messaggi WhatsApp ai partner
  mittente: "l'Ufficio commerciale di Gate S.R.L.",

  // Giorni tra la firma del contratto e l'avvio del servizio
  giorniAvvioServizio: 15,

  // ------------------------------------------------- Fasi della pipeline
  // probabilita = probabilità di chiusura (ipotesi), usata per il margine atteso
  // metodo = passo corrispondente del metodo Gate ("Come lavoriamo" sul sito)
  fasi: [
    { id: "contatto",    nome: "Contatto",    probabilita: 0.05, azione: "Qualifica" },
    { id: "qualificato", nome: "Qualificato", probabilita: 0.15, azione: "Registra sopralluogo" },
    { id: "sopralluogo", nome: "Sopralluogo", probabilita: 0.35, azione: "Invia offerta", metodo: "Analisi" },
    { id: "offerta",     nome: "Offerta",     probabilita: 0.55, azione: "Contratto firmato", metodo: "Proposta" },
    { id: "contratto",   nome: "Contratto",   probabilita: 1.0,  metodo: "Esecuzione" },
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
    fissiCampagna: 1500,      // € di campagna del pilota (materiali, eventi, LinkedIn)
  },

  // ------------------------------------------------- Obiettivi dei KPI
  obiettivi: {
    tassoQualificati: 0.60,        // contatti qualificati / contatti
    tassoSopralluoghi: 0.50,       // sopralluoghi / qualificati
    conversioneOfferte: 0.35,      // contratti / offerte
    costoAcquisizioneMax: 1500,    // € per contratto
    marginalitaMedia: 0.18,        // margine / ricavi previsti
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

  // Opportunità commerciali.
  // storico: fasi raggiunte con la data. Le opportunità perse hanno anche "perso".
  // allocazione: a chi è stata affidata la commessa (solo per i contratti).
  opportunita: [
    { cliente: "Studio Legale Alfa", settore: "Uffici e studi professionali", comune: "Bari",
      servizio: "Pulizia Professionale", ore: 48, decisore: true, referente: "Avv. titolare",
      storico: { contatto: traGiorni(-82), qualificato: traGiorni(-78), sopralluogo: traGiorni(-70), offerta: traGiorni(-62), contratto: traGiorni(-41) },
      allocazione: { tipo: "squadra", id: "sq1", data: traGiorni(-40) } },
    { cliente: "Studio Notarile Kappa", settore: "Uffici e studi professionali", comune: "Bitonto",
      servizio: "Pulizia Professionale", ore: 36, decisore: true, referente: "Segreteria dello studio",
      storico: { contatto: traGiorni(-75), qualificato: traGiorni(-71), sopralluogo: traGiorni(-60), offerta: traGiorni(-52), contratto: traGiorni(-30) },
      allocazione: { tipo: "partner", id: "pa2", data: traGiorni(-28) },
      proposte: [{ partnerId: "pa2", data: traGiorni(-29), esito: "si" }] },
    { cliente: "Studio Associato Beta", settore: "Uffici e studi professionali", comune: "Bari",
      servizio: "Pulizia Professionale", ore: 32, decisore: true, referente: "Socio amministratore",
      storico: { contatto: traGiorni(-50), qualificato: traGiorni(-47), sopralluogo: traGiorni(-40), offerta: traGiorni(-33), contratto: traGiorni(-3) } },
    { cliente: "Centro Uffici Gamma", settore: "Uffici e studi professionali", comune: "Modugno",
      servizio: "Pulizia Professionale", ore: 120, decisore: true, referente: "Facility manager",
      storico: { contatto: traGiorni(-44), qualificato: traGiorni(-41), sopralluogo: traGiorni(-30), offerta: traGiorni(-20) } },
    { cliente: "Poliambulatorio Zeta", settore: "Sanità privata", comune: "Bari",
      servizio: "Pulizia Professionale", ore: 90, decisore: true, referente: "Direttore sanitario",
      storico: { contatto: traGiorni(-58), qualificato: traGiorni(-55), sopralluogo: traGiorni(-45), offerta: traGiorni(-35) } },
    { cliente: "Studio Dentistico Lambda", settore: "Sanità privata", comune: "Bari",
      servizio: "Pulizia Professionale", ore: 16, decisore: true, referente: "Titolare",
      storico: { contatto: traGiorni(-66), qualificato: traGiorni(-63), sopralluogo: traGiorni(-57), offerta: traGiorni(-50) },
      perso: { data: traGiorni(-36), motivo: "Prezzo" } },
    { cliente: "Agenzia Delta Assicurazioni", settore: "Uffici e studi professionali", comune: "Bari",
      servizio: "Pulizia Professionale", ore: 24, decisore: false, referente: "Responsabile di sede",
      storico: { contatto: traGiorni(-30), qualificato: traGiorni(-26), sopralluogo: traGiorni(-12) } },
    { cliente: "Magazzino Omicron", settore: "GDO e logistica", comune: "Modugno",
      servizio: "Logistica", ore: 160, decisore: true, referente: "Responsabile logistica",
      storico: { contatto: traGiorni(-34), qualificato: traGiorni(-30), sopralluogo: traGiorni(-15) } },
    { cliente: "Coworking Iota", settore: "Uffici e studi professionali", comune: "Bari",
      servizio: "Pulizia Professionale", ore: 40, decisore: true, referente: "Community manager",
      storico: { contatto: traGiorni(-25), qualificato: traGiorni(-21), sopralluogo: traGiorni(-9) } },
    { cliente: "Studio Tecnico Epsilon", settore: "Uffici e studi professionali", comune: "Triggiano",
      servizio: "Pulizia Professionale", ore: 20, decisore: true, referente: "Ing. titolare",
      storico: { contatto: traGiorni(-18), qualificato: traGiorni(-14) } },
    { cliente: "Officine Theta", settore: "Industria", comune: "Molfetta",
      servizio: "Manutenzioni", ore: 40, decisore: false, referente: "Ufficio acquisti",
      storico: { contatto: traGiorni(-22), qualificato: traGiorni(-16) } },
    { cliente: "Ente di Formazione Mu", settore: "Enti pubblici", comune: "Bari",
      servizio: "Giardinaggio", ore: 30, decisore: false, referente: "Ufficio economato",
      storico: { contatto: traGiorni(-48), qualificato: traGiorni(-44) },
      perso: { data: traGiorni(-31), motivo: "Tempi di avvio" } },
    { cliente: "Studio Commercialisti Nu", settore: "Uffici e studi professionali", comune: "Casamassima",
      servizio: "Pulizia Professionale", ore: 28, decisore: true, referente: "Dott. titolare",
      storico: { contatto: traGiorni(-6) } },
    { cliente: "Studio Architetti Pi", settore: "Uffici e studi professionali", comune: "Bari",
      servizio: "Pulizia Professionale", ore: 12, decisore: false, referente: "Segreteria",
      storico: { contatto: traGiorni(-4) } },
    { cliente: "Supermercato Eta", settore: "GDO e logistica", comune: "Altamura",
      servizio: "Pest Control", ore: 6, decisore: true, referente: "Direttore di punto vendita",
      storico: { contatto: traGiorni(-9) } },
    { cliente: "Laboratorio Sigma", settore: "Industria", comune: "Gioia del Colle",
      servizio: "Pulizia Professionale", ore: 70, decisore: false, referente: "Ufficio acquisti",
      storico: { contatto: traGiorni(-40) },
      perso: { data: traGiorni(-33), motivo: "Fuori zona" } },
  ],
};
