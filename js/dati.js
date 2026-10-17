/*
 * DATI
 * Stato salvato nel browser e collegamenti tra aziende, referenti,
 * opportunità e attività. La variabile "stato" è dichiarata in app.js.
 */

function clona(x) {
  return JSON.parse(JSON.stringify(x));
}

// Canali di acquisizione (fonti dei contatti), presi dalla configurazione dei costi
function fonti() {
  return Object.keys(CONFIG.costiAcquisizione.fissiPerCanale);
}

// Codice di riferimento progressivo, es. GT-2026-017 (diventa il codice della commessa alla firma)
function codiceRiferimento(numero) {
  return "GT-" + new Date().getFullYear() + "-" + String(numero).padStart(3, "0");
}

// Costruisce lo stato iniziale a partire dai dati di esempio di config.js
function datiIniziali() {
  const aziende = [];
  const referenti = [];
  CONFIG.aziende.forEach((a) => {
    const { referenti: elenco, ...dati } = clona(a);
    aziende.push({ piva: "", note: "", creata: null, ...dati });
    elenco.forEach((r, i) => referenti.push({ id: a.id + "-r" + (i + 1), aziendaId: a.id, ...r }));
  });

  const opportunita = CONFIG.opportunita.map((esempio, i) => {
    const { azienda, ...dati } = clona(esempio);
    const refs = referenti.filter((r) => r.aziendaId === azienda);
    return {
      id: "op" + (i + 1),
      codice: codiceRiferimento(i + 1),
      aziendaId: azienda,
      referenteId: (refs.find((r) => r.decisore) || refs[0] || {}).id || null,
      tariffa: null,
      scadenzaOfferta: null,
      avvio: null,
      note: "",
      perso: null,
      allocazione: null,
      proposte: [],
      ...dati,
    };
  });

  // Data di creazione dell'azienda = primo contatto (o la prima attività)
  aziende.forEach((a) => {
    const date = opportunita.filter((o) => o.aziendaId === a.id).map((o) => o.storico.contatto)
      .concat(CONFIG.attivita.filter((x) => x.azienda === a.id).map((x) => x.data)).sort();
    a.creata = date[0] || oggi();
  });

  const attivita = CONFIG.attivita.map((x, i) => ({
    id: "at" + (i + 1),
    aziendaId: x.azienda,
    referenteId: null,
    tipo: x.tipo,
    data: x.data,
    testo: x.testo,
    daFare: !!x.daFare,
  }));

  return migra({ aziende, referenti, opportunita, attivita, contatore: opportunita.length, contatoreId: 1000, ultimoBackup: null });
}

// Porta i dati (salvati nel browser o da un backup) alla versione attuale, un passo alla volta
function migra(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return d;
  // Versione 2: i dati salvati prima che esistesse il numero di versione
  if (d.versione === undefined) d.versione = 2;
  // Versione 3: la privacy del referente da sì/no diventa base giuridica, data, modo di raccolta e opposizione
  if (d.versione === 2) {
    (Array.isArray(d.referenti) ? d.referenti : []).forEach((r) => {
      if (r && typeof r === "object") r.privacy = privacyVuota(r.privacy === true ? "Consenso" : "Da verificare");
    });
    d.versione = 3;
  }
  // Ogni intervento che cambia la struttura dei dati aggiunge qui il suo passo, per esempio:
  // if (d.versione === 3) { ...trasforma i dati...; d.versione = 4; }
  return d;
}

// Controlla solo struttura e tipi dei dati, mai le liste di config.js (che possono cambiare)
function strutturaValida(d) {
  const isId = (x) => typeof x === "string" && /^[\w-]+$/.test(x);
  const isData = (x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);
  const isTesto = (x) => typeof x === "string";
  const isOggetto = (x) => !!x && typeof x === "object" && !Array.isArray(x);
  if (!isOggetto(d) || d.versione !== CONFIG.versioneDati) return false;
  if (![d.aziende, d.referenti, d.opportunita, d.attivita].every(Array.isArray)) return false;
  if (!Number.isFinite(d.contatore) || !Number.isFinite(d.contatoreId)) return false;
  if (d.ultimoBackup != null && !isData(d.ultimoBackup)) return false;
  const idAziende = new Set(d.aziende.map((a) => a && a.id));
  const aziendaEsiste = (id) => isId(id) && idAziende.has(id);
  const facoltativo = (x, controllo) => x == null || controllo(x); // campi aggiunti dopo: assenti o validi
  const propostaOk = (p) => isOggetto(p) && isId(p.partnerId) && isData(p.data) && ["attesa", "si", "no"].includes(p.esito);
  return d.aziende.every((a) => isOggetto(a) && isId(a.id) && isTesto(a.ragioneSociale) && a.ragioneSociale.trim() !== "") &&
    d.referenti.every((r) => isOggetto(r) && isId(r.id) && aziendaEsiste(r.aziendaId) &&
      isOggetto(r.privacy) && isTesto(r.privacy.base) && (r.privacy.data === null || isData(r.privacy.data)) &&
      isTesto(r.privacy.raccolta) && typeof r.privacy.opposizione === "boolean" &&
      facoltativo(r.cancellato, (v) => typeof v === "boolean")) &&
    d.attivita.every((x) => isOggetto(x) && isId(x.id) && aziendaEsiste(x.aziendaId) && isData(x.data) && isTesto(x.testo) &&
      typeof x.daFare === "boolean" && (x.ora == null || x.ora === "" || (isTesto(x.ora) && /^\d{2}:\d{2}$/.test(x.ora))) &&
      facoltativo(x.opportunitaId, isId) && facoltativo(x.fase, isId) && facoltativo(x.automatica, (v) => typeof v === "boolean")) &&
    d.opportunita.every((o) => isOggetto(o) && isId(o.id) && isTesto(o.codice) && aziendaEsiste(o.aziendaId) &&
      isTesto(o.servizio) && Number.isFinite(o.ore) && o.ore >= 0 &&
      (o.tariffa == null || (Number.isFinite(o.tariffa) && o.tariffa >= 0)) &&
      isOggetto(o.storico) && isData(o.storico.contatto) && Object.values(o.storico).every(isData) &&
      facoltativo(o.scadenzaOfferta, isData) && facoltativo(o.avvio, isData) && facoltativo(o.note, isTesto) && facoltativo(o.motivazioneC, isTesto) &&
      (o.perso == null || (isOggetto(o.perso) && isData(o.perso.data) && isTesto(o.perso.motivo) && facoltativo(o.perso.nota, isTesto))) &&
      (o.allocazione == null || (isOggetto(o.allocazione) && ["squadra", "partner"].includes(o.allocazione.tipo) &&
        isId(o.allocazione.id) && isData(o.allocazione.data))) &&
      (o.proposte === undefined || (Array.isArray(o.proposte) && o.proposte.every(propostaOk))));
}

// Dati salvati che non si leggevano: messi da parte in localStorage con la chiave "-scartato"
let datiScartati = false;
let testoScartato = "";

// Legge i dati salvati nel browser; se non si leggono li mette da parte (mai cancellati) e usa gli esempi
function carica() {
  let testo = null;
  try {
    testo = localStorage.getItem(CONFIG.chiaveSalvataggio);
  } catch (e) {
    // Salvataggio non disponibile (es. navigazione privata): si usano gli esempi
  }
  if (testo === null) return datiIniziali();
  let d = null;
  try {
    d = migra(JSON.parse(testo));
  } catch (e) {
    d = null;
  }
  if (strutturaValida(d)) return d;
  datiScartati = true;
  testoScartato = testo;
  try {
    localStorage.setItem(CONFIG.chiaveSalvataggio + "-scartato", testo);
  } catch (e) {
    // Se non c'è spazio, la copia resta scaricabile da "Scarica la copia" in questa sessione
  }
  return datiIniziali();
}

// Salva lo stato nel browser; restituisce false (e avvisa una volta) se il browser non salva
let avvisoSalvataggioMostrato = false;
function salva() {
  try {
    localStorage.setItem(CONFIG.chiaveSalvataggio, JSON.stringify(stato));
    return true;
  } catch (e) {
    if (!avvisoSalvataggioMostrato) {
      avvisoSalvataggioMostrato = true;
      avvisoFisso("Questo browser non sta salvando i dati: usa subito «Salva backup».",
        '<button class="pulsante no piccolo" type="button" data-azione="esporta-backup">Salva backup</button>');
    }
    return false;
  }
}

function nuovoId(prefisso) {
  stato.contatoreId += 1;
  return prefisso + stato.contatoreId;
}

// ------------------------------------------------------------ Ricerche

function trova(id) {
  return stato.opportunita.find((o) => o.id === id);
}

function trovaAzienda(id) {
  return stato.aziende.find((a) => a.id === id);
}

function trovaReferente(id) {
  return stato.referenti.find((r) => r.id === id);
}

function referentiDi(aziendaId) {
  return stato.referenti.filter((r) => r.aziendaId === aziendaId);
}

function opportunitaDi(aziendaId) {
  return stato.opportunita.filter((o) => o.aziendaId === aziendaId);
}

function attivitaDi(aziendaId) {
  return stato.attivita.filter((x) => x.aziendaId === aziendaId);
}

// Sopralluogo fissato in agenda per un'opportunità: la prima attività da fare collegata alla fase Sopralluogo
function sopralluogoFissato(o) {
  return stato.attivita.filter((x) => x.daFare && x.opportunitaId === o.id && x.fase === "sopralluogo")
    .sort((a, b) => a.data.localeCompare(b.data))[0] || null;
}

// Azienda di un'opportunità (_azienda serve per l'anteprima di un'azienda non ancora salvata)
function aziendaDi(o) {
  return o._azienda || trovaAzienda(o.aziendaId);
}

function nomeCliente(o) {
  const a = aziendaDi(o);
  return a ? a.ragioneSociale : "Cliente non trovato";
}

function settoreDi(o) {
  const a = aziendaDi(o);
  return a ? a.settore : "";
}

// Il decisore è identificato se almeno un referente dell'azienda è segnato come decisore
function decisoreDi(o) {
  if (o._decisore !== undefined) return o._decisore;
  return referentiDi(o.aziendaId).find((r) => r.decisore) || null;
}

// Stato commerciale di un'azienda, ricavato dalle sue opportunità
function statoAzienda(aziendaId) {
  const opp = opportunitaDi(aziendaId);
  if (opp.some((o) => o.storico.contratto && !o.perso)) return "Cliente";
  if (opp.some((o) => !o.perso)) return "In trattativa";
  if (opp.length) return "Perso";
  return "Da qualificare";
}

// ------------------------------------------------------------------- Privacy

// Privacy di un referente: base giuridica, data, come sono stati raccolti i dati, opposizione alle proposte
function privacyVuota(base = "Da verificare", data = null) {
  return { base, data, raccolta: "", opposizione: false };
}

// Si può contattare per proposte commerciali: base giuridica verificata e nessuna opposizione
function privacyOk(r) {
  return !!r && !!r.privacy && r.privacy.base !== "Da verificare" && !r.privacy.opposizione;
}

// Perché i pulsanti di contatto mostrano l'avviso ("" se è tutto in regola)
function avvisoPrivacy(r) {
  if (privacyOk(r)) return "";
  return r.privacy && r.privacy.opposizione ? "Non vuole proposte commerciali" : "Privacy da verificare";
}

// ------------------------------------------------------------------ Doppioni

// Nome confrontabile: "Studio Legale Alfa S.r.l." e "studio legale alfa" diventano uguali
function normalizzaNome(s) {
  return String(s || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")         // accenti tolti
    .replace(/[^a-z0-9]+/g, " ")                                // punteggiatura tolta
    .replace(/\b(s r l s|s r l|srls|srl|s n c|snc|s a s|sas|s p a|spa|soc coop|coop)\b/g, " ") // forme societarie
    .replace(/\s+/g, " ").trim();
}

// Aziende già in archivio che potrebbero essere la stessa: stesso nome, partita IVA, telefono o email di un referente.
// Restituisce [{ azienda, motivi: ["stesso nome", ...] }]
function possibiliDoppioni({ ragioneSociale = "", piva = "", telefono = "", email = "" }, escludiAziendaId = null) {
  const nome = normalizzaNome(ragioneSociale);
  const partitaIva = String(piva).replace(/\s/g, "");
  const numero = numeroInternazionale(telefono);
  const posta = String(email).trim().toLowerCase();
  const trovati = [];
  stato.aziende.filter((a) => a.id !== escludiAziendaId).forEach((a) => {
    const refs = referentiDi(a.id);
    const motivi = [];
    if (nome && normalizzaNome(a.ragioneSociale) === nome) motivi.push("stesso nome");
    if (partitaIva && a.piva === partitaIva) motivi.push("stessa partita IVA");
    if (numero && refs.some((r) => r.telefono && numeroInternazionale(r.telefono) === numero)) motivi.push("stesso telefono");
    if (posta && refs.some((r) => (r.email || "").toLowerCase() === posta)) motivi.push("stessa email");
    if (motivi.length) trovati.push({ azienda: a, motivi });
  });
  return trovati;
}

// Controlla nome e partita IVA di un'azienda nuova o modificata: restituisce { campo, testo } se c'è un problema, altrimenti null
function controllaAzienda({ ragioneSociale, piva }, escludiAziendaId = null) {
  if (piva && !/^\d{11}$/.test(piva)) return { campo: "piva", testo: "La partita IVA ha 11 cifre" };
  const altre = stato.aziende.filter((a) => a.id !== escludiAziendaId);
  const stessaPiva = piva && altre.find((a) => a.piva === piva);
  if (stessaPiva) return { campo: "piva", testo: "Questa partita IVA è già di " + stessaPiva.ragioneSociale };
  const nome = normalizzaNome(ragioneSociale);
  const stessoNome = nome && altre.find((a) => normalizzaNome(a.ragioneSociale) === nome);
  if (stessoNome) return { campo: "ragioneSociale", testo: "Esiste già " + stessoNome.ragioneSociale };
  return null;
}

// Registra un'attività nella cronologia dell'azienda
function registraAttivita(dati) {
  stato.attivita.push({ id: nuovoId("at"), referenteId: null, daFare: false, data: oggi(), ...dati });
}

// ------------------------------------------------------ Contatto con un clic

// Numero in formato internazionale per WhatsApp (solo cifre).
// Un numero scritto con + o 00 tiene il suo prefisso ("+44 20 7946 0958" -> "442079460958"); agli altri si aggiunge il 39
function numeroInternazionale(telefono) {
  const estero = /^\s*(\+|00)/.test(String(telefono || ""));
  const cifre = String(telefono || "").replace(/\D/g, "").replace(/^00/, "");
  if (!cifre) return "";
  if (estero) return cifre;
  return cifre.startsWith("39") && cifre.length > 10 ? cifre : "39" + cifre;
}

// Numero da salvare: con il + davanti, così un prefisso estero resta riconoscibile ("+442079460958")
function telefonoDaSalvare(telefono) {
  const n = numeroInternazionale(telefono);
  return n ? "+" + n : "";
}

// "390000001011" -> "+39 000 000 1011"; un numero estero resta "+442079460958"
function telefonoLeggibile(telefono) {
  const n = numeroInternazionale(telefono);
  if (!n) return "";
  if (!n.startsWith("39")) return "+" + n;
  return "+" + n.slice(0, 2) + " " + n.slice(2, 5) + " " + n.slice(5, 8) + " " + n.slice(8);
}

// ---------------------------------------------------- Backup ed esportazione

// Fa scaricare un file generato nel browser
function scaricaFile(nome, contenuto, tipo) {
  const url = URL.createObjectURL(new Blob([contenuto], { type: tipo }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Scarica tutti i dati in un file .json e ricorda la data dell'ultimo backup
function esportaBackup() {
  stato.ultimoBackup = oggi();
  salva();
  scaricaFile("gate-crm-backup-" + oggi() + ".json", JSON.stringify(stato, null, 2), "application/json");
}

// Scarica i dati salvati che non si leggevano, per farli recuperare a mano
function scaricaDatiScartati() {
  scaricaFile("gate-crm-dati-da-recuperare-" + oggi() + ".json", testoScartato, "application/json");
}

// Esporta aziende e referenti in CSV (separatore ";" per Excel in italiano).
// Il telefono esce come "0039 000 000 1011": Excel lo legge come testo e non come formula.
function esportaCsvClienti() {
  // Un testo che inizia con = + - @ sarebbe letto da Excel come formula: l'apostrofo lo lascia testo
  const campo = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const righe = [["Ragione sociale", "P.IVA", "Settore", "Comune", "Fonte", "Stato", "Referente", "Ruolo", "Decisore", "Telefono", "Email", "Canale preferito",
    "Base giuridica", "Data privacy", "Non vuole proposte"]];
  stato.aziende.forEach((a) => {
    const refs = referentiDi(a.id);
    (refs.length ? refs : [{}]).forEach((r) => righe.push([
      a.ragioneSociale, a.piva, a.settore, a.comune, a.fonte, statoAzienda(a.id),
      r.nome, r.ruolo, r.nome ? (r.decisore ? "Sì" : "No") : "", r.telefono ? telefonoLeggibile(r.telefono).replace("+", "00") : "", r.email, r.canale,
      r.privacy ? r.privacy.base : "", r.privacy ? formattaData(r.privacy.data) : "", r.privacy ? (r.privacy.opposizione ? "Sì" : "No") : "",
    ]));
  });
  // Il carattere iniziale ﻿ fa riconoscere a Excel le lettere accentate
  scaricaFile("gate-clienti-" + oggi() + ".csv", "﻿" + righe.map((r) => r.map(campo).join(";")).join("\r\n"), "text/csv;charset=utf-8");
}
