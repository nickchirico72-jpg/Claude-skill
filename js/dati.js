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

  return { aziende, referenti, opportunita, attivita, contatore: opportunita.length, contatoreId: 1000 };
}

// Controlla che i dati (salvati nel browser o importati da un backup) siano coerenti con config.js
function datiValidi(d) {
  if (!d || ![d.aziende, d.referenti, d.opportunita, d.attivita].every(Array.isArray)) return false;
  if (typeof d.contatore !== "number" || typeof d.contatoreId !== "number") return false;
  const idAziende = new Set(d.aziende.map((a) => a.id));
  const comuneOk = (nome) => CONFIG.comuni.some((c) => c.nome === nome);
  return d.aziende.every((a) => a.id && a.ragioneSociale && CONFIG.settori.includes(a.settore) && comuneOk(a.comune)) &&
    d.referenti.every((r) => r.id && idAziende.has(r.aziendaId)) &&
    d.attivita.every((x) => x.id && idAziende.has(x.aziendaId) && x.data) &&
    d.opportunita.every((o) => o && o.id && idAziende.has(o.aziendaId) && o.storico && o.storico.contatto &&
      CONFIG.servizi[o.servizio] && comuneOk(o.comune) &&
      (!o.allocazione || (o.allocazione.tipo === "squadra" ? trovaSquadra(o.allocazione.id) : trovaPartner(o.allocazione.id))) &&
      (o.proposte || []).every((p) => trovaPartner(p.partnerId)));
}

// Legge i dati salvati nel browser; se mancano o non sono validi, usa gli esempi
function carica() {
  try {
    const salvato = JSON.parse(localStorage.getItem(CONFIG.chiaveSalvataggio));
    if (datiValidi(salvato)) return salvato;
  } catch (e) {
    // Salvataggio non disponibile (es. navigazione privata): si usano gli esempi
  }
  return datiIniziali();
}

function salva() {
  try {
    localStorage.setItem(CONFIG.chiaveSalvataggio, JSON.stringify(stato));
  } catch (e) {
    // Se il browser non permette di salvare, il prototipo funziona comunque
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

// Registra un'attività nella cronologia dell'azienda
function registraAttivita(dati) {
  stato.attivita.push({ id: nuovoId("at"), referenteId: null, daFare: false, data: oggi(), ...dati });
}

// ------------------------------------------------------ Contatto con un clic

// Numero in formato internazionale per WhatsApp (solo cifre, prefisso 39 se manca)
function numeroInternazionale(telefono) {
  const cifre = String(telefono || "").replace(/\D/g, "").replace(/^00/, "");
  if (!cifre) return "";
  return cifre.startsWith("39") && cifre.length > 10 ? cifre : "39" + cifre;
}

// "390000001011" -> "+39 000 000 1011"
function telefonoLeggibile(telefono) {
  const n = numeroInternazionale(telefono);
  if (!n) return "";
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

function esportaBackup() {
  scaricaFile("gate-crm-backup-" + oggi() + ".json", JSON.stringify(stato, null, 2), "application/json");
}

// Esporta aziende e referenti in CSV (separatore ";" per Excel in italiano)
function esportaCsvClienti() {
  const campo = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const righe = [["Ragione sociale", "P.IVA", "Settore", "Comune", "Fonte", "Stato", "Referente", "Ruolo", "Decisore", "Telefono", "Email", "Canale preferito", "Consenso privacy"]];
  stato.aziende.forEach((a) => {
    const refs = referentiDi(a.id);
    (refs.length ? refs : [{}]).forEach((r) => righe.push([
      a.ragioneSociale, a.piva, a.settore, a.comune, a.fonte, statoAzienda(a.id),
      r.nome, r.ruolo, r.nome ? (r.decisore ? "Sì" : "No") : "", r.telefono ? telefonoLeggibile(r.telefono) : "", r.email, r.canale,
      r.nome ? (r.privacy ? "Sì" : "No") : "",
    ]));
  });
  // Il carattere iniziale ﻿ fa riconoscere a Excel le lettere accentate
  scaricaFile("gate-clienti-" + oggi() + ".csv", "﻿" + righe.map((r) => r.map(campo).join(";")).join("\r\n"), "text/csv;charset=utf-8");
}
