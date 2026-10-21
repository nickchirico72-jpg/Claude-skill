/*
 * DATI
 * Stato salvato nel browser e collegamenti tra aziende, referenti,
 * opportunità e attività. La variabile "stato" è dichiarata in app.js.
 */

function clona(x) {
  return JSON.parse(JSON.stringify(x));
}

// Canali di acquisizione attivi (fonti dei contatti), dal dizionario unico dei canali
function fonti() {
  return CONFIG.canali.filter((c) => c.attivo).map((c) => c.canale);
}

// Dati di un canale del dizionario (tipo digitale, diretto...), o null se non c'è
function infoCanale(nome) {
  return CONFIG.canali.find((c) => c.canale === nome) || null;
}

// I 7 gruppi di canale (sito, LinkedIn, telefono, email, passaparola, portale/gara, altro), usati da filtri, dashboard e CSV
function gruppiCanali() {
  return Object.keys(CONFIG.gruppiCanali);
}

// Gruppo di un canale ("sito web" → "sito"); un canale fuori dal dizionario va in "altro"
function gruppoCanale(nome) {
  return (infoCanale(nome) || {}).gruppo || "altro";
}

// Canale del dizionario da un testo che può essere un canale o un gruppo ("sito" → "sito web"), oppure null
function canaleDaTesto(testo) {
  const v = String(testo || "").trim().toLowerCase();
  const canale = CONFIG.canali.find((c) => c.canale.toLowerCase() === v);
  if (canale) return canale.canale;
  const gruppo = gruppiCanali().find((g) => g.toLowerCase() === v);
  return gruppo ? CONFIG.gruppiCanali[gruppo] : null;
}

// Opzioni del menu dei canali attivi, raggruppati per gruppo, con la prima voce vuota (il canale è obbligatorio)
function opzioniCanali(scelto = "") {
  return '<option value="">— Scegli il canale —</option>' + gruppiCanali().map((g) => {
    const canali = fonti().filter((c) => gruppoCanale(c) === g);
    return canali.length ? `<optgroup label="${esc(maiuscola(g))}">${canali.map((c) => `<option value="${esc(c)}" ${c === scelto ? "selected" : ""}>${esc(maiuscola(c))}</option>`).join("")}</optgroup>` : "";
  }).join("");
}

// Codice del canale nei link tracciati (utm_source): "sito web" → "sito-web", "LinkedIn" → "linkedin"
function codiceCanale(nome) {
  return String(nome).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Codice di riferimento progressivo, es. GT-2026-017 (diventa il codice della commessa alla firma)
function codiceRiferimento(numero) {
  return "GT-" + new Date().getFullYear() + "-" + String(numero).padStart(3, "0");
}

// Righe di una tabella di js/dati-db.js come oggetti { colonna: valore }
function righeDb(nome) {
  const t = DATI_DB[nome];
  return t.righe.map((r) => Object.fromEntries(t.colonne.map((c, i) => [c, r[i]])));
}

// Prima lettera maiuscola, per i tipi di attività del database ("chiamata" → "Chiamata")
function maiuscola(testo) {
  const s = String(testo ?? "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Costruisce lo stato iniziale dal database di prova (js/dati-db.js): stessi clienti, opportunità e attività delle query SQL.
// Le date si spostano in avanti in modo che la data di riferimento del database (19/10/2026) sia oggi: la demo resta attuale.
function datiIniziali() {
  const spostamento = giorniTra(DATI_DB.dataRiferimento, oggi());
  const data = (d) => (d ? aggiungiGiorni(d, spostamento) : null);
  const clienti = righeDb("clienti");
  const opp = righeDb("opportunita");
  const storicoDb = righeDb("storico_fasi");
  const offerteDb = righeDb("offerte");

  // Fonte dell'azienda = canale della sua prima opportunità
  const primaOpp = new Map();
  [...opp].sort((a, b) => a.data_contatto.localeCompare(b.data_contatto)).forEach((o) => {
    if (!primaOpp.has(o.id_cliente)) primaOpp.set(o.id_cliente, o);
  });
  const aziende = clienti.map((c) => ({
    id: "c" + c.id_cliente, ragioneSociale: c.nome, piva: "", settore: c.settore, comune: c.comune,
    fonte: primaOpp.has(c.id_cliente) ? primaOpp.get(c.id_cliente).canale : "contatto diretto",
    note: "", creata: data(primaOpp.has(c.id_cliente) ? primaOpp.get(c.id_cliente).data_contatto : DATI_DB.dataRiferimento),
    superficie: c.superficie_mq, tipoCliente: c.tipo_cliente,
  }));
  const creata = Object.fromEntries(aziende.map((a) => [a.id, a.creata]));

  const referenti = righeDb("referenti").map((r) => ({
    id: "r" + r.id_referente, aziendaId: "c" + r.id_cliente, nome: r.nome, ruolo: r.ruolo || "",
    telefono: telefonoDaSalvare(r.telefono || ""), email: r.email || "", canale: r.telefono ? "Telefono" : "Email", decisore: !!r.decisore,
    privacy: { base: r.base_giuridica, data: r.base_giuridica === CONFIG.basiGiuridiche[0] ? null : creata["c" + r.id_cliente],
      raccolta: r.modo_raccolta || "", opposizione: false },
  }));

  // Contratti recenti: ancora da assegnare; gli altri già avviati prima del prototipo
  const limite = aggiungiGiorni(DATI_DB.dataRiferimento, -CONFIG.giorniContrattiDaAssegnare);
  const opportunita = opp.map((o) => {
    const storico = {};
    let perso = null;
    storicoDb.filter((e) => e.id_opp === o.id_opp).forEach((e) => {
      if (e.fase === "perso") perso = { data: data(e.data_ingresso), motivo: o.motivo_perdita };
      else storico[e.fase] = data(e.data_ingresso);
    });
    const offerte = offerteDb.filter((f) => f.id_opp === o.id_opp).sort((a, b) => b.versione - a.versione);
    const tariffa = (CONFIG.servizi[o.servizio] || {}).tariffa || 1;
    return {
      id: "op" + o.id_opp, codice: codiceRiferimento(o.id_opp), aziendaId: "c" + o.id_cliente, referenteId: "r" + o.id_referente,
      canale: o.canale, comune: (clienti.find((c) => c.id_cliente === o.id_cliente) || {}).comune || "Bari", servizio: o.servizio,
      ore: o.ore_mese_stimate ?? Math.round(o.valore_annuo / 12 / tariffa),
      // Valori del database: restano finché non si cambiano servizio, sede, ore o tariffa nell'app
      valore: o.valore_annuo, margine: o.margine_pct, capacitaSimulata: o.capacita_simulata,
      tariffa: null, note: "", perso, storico, proposte: [],
      scadenzaOfferta: !perso && !storico.contratto && offerte.length ? aggiungiGiorni(data(offerte[0].data_invio), CONFIG.giorniValiditaOfferta) : null,
      avvio: storico.contratto ? aggiungiGiorni(storico.contratto, CONFIG.giorniAvvioServizio) : null,
      allocazione: storico.contratto && o.data_chiusura < limite ? { tipo: "storico", data: storico.contratto } : null,
      dataPrimaRisposta: data(o.data_prima_risposta), dataRegistrazione: data(o.data_registrazione), consensoPrivacy: !!o.consenso_privacy,
      campagna: o.campagna || "", contenuto: o.contenuto || "", paginaArrivo: o.pagina_arrivo || "",
      firmaDaLink: offerte.some((f) => f.firma_da_link === 1),
    };
  });

  // Attività svolte (dal database) e promemoria delle trattative aperte non ferme (creati dall'app: il database registra solo il passato)
  const perOpp = Object.fromEntries(opportunita.map((o) => [o.id, o]));
  const attivita = righeDb("attivita").map((x) => {
    const o = perOpp["op" + x.id_opp];
    return { id: "at" + x.id_attivita, aziendaId: o.aziendaId, referenteId: o.referenteId, opportunitaId: o.id, daFare: false,
      tipo: x.tipo === "sopralluogo" ? "Visita" : maiuscola(x.tipo), data: data(x.data),
      testo: x.tipo === "sopralluogo" ? "Sopralluogo svolto" : maiuscola(x.esito) };
  });
  let n = 0;
  opportunita.filter((o) => !o.perso && !o.storico.contratto).forEach((o, i) => {
    const fase = CONFIG.fasi[faseRaggiunta(o)];
    if (giorniTra(o.storico[fase.id], oggi()) > fase.giorniFerma) return; // le ferme restano senza prossima azione: finiscono in «Da seguire»
    let quando = aggiungiGiorni(o.storico[fase.id], fase.followUp.giorni);
    if (quando < oggi() && i % 6 !== 0) quando = traGiorni(1 + (i % 6)); // pochi promemoria restano in ritardo, gli altri nei prossimi giorni
    attivita.push({ id: "pr" + (++n), aziendaId: o.aziendaId, referenteId: o.referenteId, opportunitaId: o.id, daFare: true,
      automatica: true, tipo: fase.followUp.tipo, data: quando, testo: fase.followUp.testo });
  });

  return { versione: CONFIG.versioneDati, aziende, referenti, opportunita, attivita, contenuti: [], richiesteReali: [], registro: [], contatore: opp.length, contatoreId: 10000, ultimoBackup: null };
}

// Dati salvati prima della versione 4 (esempi di config.js): c'è un avviso per passare ai dati del database
let datiDiVersionePrecedente = false;

// Valori della versione 3 tradotti nei dizionari del database
const DIZIONARI_V3 = {
  servizio: { "Pulizia Professionale": "cleaning e hospitality", "Pest Control": "servizi alle strutture", "Manutenzioni": "servizi alle strutture",
    "Giardinaggio": "servizi alle strutture", "Logistica": "logistica e retail" },
  settore: { "Uffici e studi professionali": "uffici e commercio", "Sanità privata": "sanità", "GDO e logistica": "GDO",
    "Industria": "industria", "Enti pubblici": "enti pubblici" },
  fonte: { "Sito web": "sito web", "Porta a porta": "porta a porta", "Intermediario": "intermediario", "Portale gare": "portale gare",
    "Eventi e LinkedIn": "LinkedIn", "Passaparola": "passaparola", "Contatto diretto": "contatto diretto" },
  base: { "Da verificare": "da verificare", "Consenso": "consenso", "Legittimo interesse (B2B)": "legittimo interesse B2B", "Contratto in corso": "contratto in corso" },
  raccolta: { "A voce": "a voce", "Modulo del sito": "modulo del sito", "Email": "email", "Biglietto da visita": "biglietto da visita" },
};

// Porta i dati (salvati nel browser o da un backup) alla versione attuale, un passo alla volta
function migra(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return d;
  // Versione 2: i dati salvati prima che esistesse il numero di versione
  if (d.versione === undefined) d.versione = 2;
  // Versione 3: la privacy del referente da sì/no diventa base giuridica, data, modo di raccolta e opposizione
  if (d.versione === 2) {
    (Array.isArray(d.referenti) ? d.referenti : []).forEach((r) => {
      if (r && typeof r === "object") r.privacy = { base: r.privacy === true ? "Consenso" : "Da verificare", data: null, raccolta: "", opposizione: false };
    });
    d.versione = 3;
  }
  // Versione 4: dizionari unici con il database (servizi, settori, canali, privacy, motivi) e canale per opportunità
  if (d.versione === 3) {
    const traduci = (tipo, v) => DIZIONARI_V3[tipo][v] || v;
    const elenco = (x) => (Array.isArray(x) ? x.filter((y) => y && typeof y === "object") : []);
    elenco(d.aziende).forEach((a) => { a.settore = traduci("settore", a.settore); a.fonte = traduci("fonte", a.fonte); });
    elenco(d.referenti).forEach((r) => {
      if (r.privacy && typeof r.privacy === "object") {
        r.privacy.base = traduci("base", r.privacy.base);
        r.privacy.raccolta = traduci("raccolta", r.privacy.raccolta);
      }
    });
    const fonte = Object.fromEntries(elenco(d.aziende).map((a) => [a.id, a.fonte]));
    elenco(d.opportunita).forEach((o) => {
      o.servizio = traduci("servizio", o.servizio);
      o.canale = fonte[o.aziendaId] || "contatto diretto";
      if (o.perso && typeof o.perso.motivo === "string") o.perso.motivo = o.perso.motivo.toLowerCase();
    });
    d.versione = 4;
    datiDiVersionePrecedente = true;
  }
  // Ogni intervento che cambia la struttura dei dati aggiunge qui il suo passo, per esempio:
  // if (d.versione === 4) { ...trasforma i dati...; d.versione = 5; }
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
  // Richieste reali importate da CSV nel browser (facoltative): mai mescolate con le opportunità
  if (d.richiesteReali !== undefined && !(Array.isArray(d.richiesteReali) && d.richiesteReali.every((r) => r && typeof r === "object" &&
    ["partenza", "test"].includes(r.fonte) && /^\d{4}-\d{2}-\d{2}$/.test(r.data_richiesta) && ["canale", "settore", "esito"].every((k) => typeof r[k] === "string") &&
    ["data_registrazione", "data_risposta", "data_offerta"].every((k) => r[k] === null || /^\d{4}-\d{2}-\d{2}$/.test(r[k]))))) return false;
  // Registro delle modifiche (facoltativo): quando, chi e cosa
  if (d.registro !== undefined && !(Array.isArray(d.registro) && d.registro.every((r) => r && typeof r === "object" &&
    ["quando", "chi", "cosa"].every((k) => typeof r[k] === "string")))) return false;
  // Contenuti aggiunti nell'app al piano editoriale (facoltativi)
  if (d.contenuti !== undefined && !(Array.isArray(d.contenuti) && d.contenuti.every((c) => c && typeof c === "object" &&
    /^[\w-]+$/.test(c.id) && /^\d{4}-\d{2}-\d{2}$/.test(c.data_pubblicazione) && ["canale", "tema", "settore", "formato"].every((k) => typeof c[k] === "string")))) return false;
  // Contatori interi e non negativi: da contatoreId nascono i nuovi id (es. "at1001")
  if (![d.contatore, d.contatoreId].every((n) => Number.isSafeInteger(n) && n >= 0)) return false;
  if (d.ultimoBackup != null && !isData(d.ultimoBackup)) return false;
  const idAziende = new Set(d.aziende.map((a) => a && a.id));
  const aziendaEsiste = (id) => isId(id) && idAziende.has(id);
  const facoltativo = (x, controllo) => x == null || controllo(x); // campi aggiunti dopo: assenti o validi
  const testoFacoltativo = (x) => facoltativo(x, isTesto);
  const propostaOk = (p) => isOggetto(p) && isId(p.partnerId) && isData(p.data) && ["attesa", "si", "no"].includes(p.esito);
  return d.aziende.every((a) => isOggetto(a) && isId(a.id) && isTesto(a.ragioneSociale) && a.ragioneSociale.trim() !== "" &&
      ["settore", "comune", "fonte", "piva", "note", "tipoCliente"].every((k) => testoFacoltativo(a[k])) &&
      facoltativo(a.superficie, Number.isFinite)) &&
    d.referenti.every((r) => isOggetto(r) && isId(r.id) && aziendaEsiste(r.aziendaId) && isTesto(r.nome) &&
      ["ruolo", "telefono", "email", "canale"].every((k) => testoFacoltativo(r[k])) && facoltativo(r.decisore, (v) => typeof v === "boolean") &&
      isOggetto(r.privacy) && isTesto(r.privacy.base) && (r.privacy.data === null || isData(r.privacy.data)) &&
      isTesto(r.privacy.raccolta) && typeof r.privacy.opposizione === "boolean" &&
      facoltativo(r.cancellato, (v) => typeof v === "boolean")) &&
    d.attivita.every((x) => isOggetto(x) && isId(x.id) && aziendaEsiste(x.aziendaId) && isData(x.data) && isTesto(x.testo) && isTesto(x.tipo) &&
      facoltativo(x.referenteId, isId) &&
      typeof x.daFare === "boolean" && (x.ora == null || x.ora === "" || (isTesto(x.ora) && /^\d{2}:\d{2}$/.test(x.ora))) &&
      facoltativo(x.opportunitaId, isId) && facoltativo(x.fase, isId) && facoltativo(x.automatica, (v) => typeof v === "boolean")) &&
    d.opportunita.every((o) => isOggetto(o) && isId(o.id) && isTesto(o.codice) && aziendaEsiste(o.aziendaId) &&
      isTesto(o.servizio) && testoFacoltativo(o.comune) && facoltativo(o.referenteId, isId) && Number.isFinite(o.ore) && o.ore >= 0 &&
      ["canale", "campagna", "contenuto", "paginaArrivo"].every((k) => testoFacoltativo(o[k])) &&
      ["valore", "margine", "capacitaSimulata"].every((k) => facoltativo(o[k], Number.isFinite)) &&
      ["dataPrimaRisposta", "dataRegistrazione"].every((k) => facoltativo(o[k], isData)) &&
      ["consensoPrivacy", "firmaDaLink"].every((k) => facoltativo(o[k], (v) => typeof v === "boolean")) &&
      facoltativo(o.preventivo, (v) => isOggetto(v) && isTesto(v.ambiente) && isTesto(v.frequenza) && Number.isFinite(v.mq)) &&
      facoltativo(o.ricontatto, (v) => isOggetto(v) && isData(v.data) && isTesto(v.nota)) &&
      (o.tariffa == null || (Number.isFinite(o.tariffa) && o.tariffa >= 0)) &&
      isOggetto(o.storico) && isData(o.storico.contatto) && Object.values(o.storico).every(isData) &&
      facoltativo(o.scadenzaOfferta, isData) && facoltativo(o.avvio, isData) && facoltativo(o.riaperta, isData) && facoltativo(o.note, isTesto) && facoltativo(o.motivazioneC, isTesto) &&
      (o.perso == null || (isOggetto(o.perso) && isData(o.perso.data) && isTesto(o.perso.motivo) && facoltativo(o.perso.nota, isTesto))) &&
      (o.allocazione == null || (isOggetto(o.allocazione) && isData(o.allocazione.data) &&
        (o.allocazione.tipo === "storico" || (["squadra", "partner"].includes(o.allocazione.tipo) && isId(o.allocazione.id))))) &&
      (o.proposte === undefined || (Array.isArray(o.proposte) && o.proposte.every(propostaOk))));
}

// Dati salvati che non si leggevano: messi da parte in localStorage con la chiave "-scartato"
let datiScartati = false;
let testoScartato = "";

// Legge i dati salvati nel browser; se non si leggono li mette da parte (mai cancellati) e usa gli esempi
function carica() {
  let testo = null;
  try {
    testo = archivio().leggi();
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
// modifiche = record cambiati (confrontaStati): l'archivio condiviso salverà solo quelli
function salva(modifiche = null) {
  try {
    archivio().scrivi(stato, modifiche);
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
function privacyVuota(base = CONFIG.basiGiuridiche[0], data = null) {
  return { base, data, raccolta: "", opposizione: false };
}

// Si può contattare per proposte commerciali: base giuridica verificata e nessuna opposizione
function privacyOk(r) {
  return !!r && !!r.privacy && r.privacy.base !== CONFIG.basiGiuridiche[0] && !r.privacy.opposizione;
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

// Registra un'attività nella cronologia dell'azienda; un contatto svolto è la prima risposta di Gate (K12) delle trattative che non l'hanno ancora
function registraAttivita(dati) {
  const x = { id: nuovoId("at"), referenteId: null, daFare: false, data: oggi(), ...dati };
  stato.attivita.push(x);
  if (!x.daFare && ["Chiamata", "Email", "WhatsApp", "Visita"].includes(x.tipo)) {
    opportunitaDi(x.aziendaId).filter((o) => !o.dataPrimaRisposta && x.data >= o.storico.contatto).forEach((o) => (o.dataPrimaRisposta = x.data));
  }
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

// Telefono per il CSV con spazi, così Excel lo legge come testo: "0039 000 000 1011", estero "0044 2079460958"
function telefonoPerCsv(telefono) {
  const n = numeroInternazionale(telefono);
  if (!n) return "";
  if (n.startsWith("39")) return telefonoLeggibile(n).replace("+", "00");
  return "00" + n.slice(0, 2) + " " + n.slice(2);
}

// Esporta aziende e referenti in CSV (separatore ";" per Excel in italiano).
// Telefoni con spazi e partita IVA con il prefisso IT: Excel li legge come testo e non perde gli zeri iniziali.
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
      a.ragioneSociale, a.piva ? "IT" + a.piva : "", a.settore, a.comune, a.fonte, statoAzienda(a.id),
      r.nome, r.ruolo, r.nome ? (r.decisore ? "Sì" : "No") : "", telefonoPerCsv(r.telefono), r.email, r.canale,
      r.privacy ? r.privacy.base : "", r.privacy ? formattaData(r.privacy.data) : "", r.privacy ? (r.privacy.opposizione ? "Sì" : "No") : "",
    ]));
  });
  // Il carattere iniziale ﻿ fa riconoscere a Excel le lettere accentate
  scaricaFile("gate-clienti-" + oggi() + ".csv", "﻿" + righe.map((r) => r.map(campo).join(";")).join("\r\n"), "text/csv;charset=utf-8");
}
