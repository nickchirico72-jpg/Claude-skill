/*
 * ALLOCAZIONE DELLA CAPACITÀ
 * Regole:
 *  1. ogni contratto va prima a una squadra interna con ore libere nella zona;
 *  2. se non c'è capacità, si propone a un'impresa partner (DURC regolare,
 *     nessun lavoratore autonomo) con un messaggio WhatsApp precompilato;
 *  3. se il partner risponde NO, si propone il partner successivo.
 * Il cliente resta di Gate: Gate firma il contratto e controlla la qualità.
 */

// Data di oggi nel formato AAAA-MM-GG
function oggi() {
  return traGiorni(0);
}

// Dati del comune (distanza e zona) presi dalla configurazione
function infoComune(nome) {
  return CONFIG.comuni.find((c) => c.nome === nome) || { nome, km: 999, zona: "Fuori area" };
}

function trovaSquadra(id) {
  return CONFIG.squadre.find((s) => s.id === id);
}

function trovaPartner(id) {
  return CONFIG.partner.find((p) => p.id === id);
}

// Ore libere di una squadra = capacità - ore già impegnate - commesse assegnate dal prototipo
function oreLibereSquadra(squadra, opportunita) {
  const assegnate = opportunita
    .filter((o) => o.allocazione && o.allocazione.tipo === "squadra" && o.allocazione.id === squadra.id)
    .reduce((somma, o) => somma + o.ore, 0);
  return squadra.oreCapacita - squadra.oreImpegnate - assegnate;
}

// Prima squadra interna che copre zona e servizio e ha abbastanza ore libere
function squadraDisponibile(opp, opportunita) {
  const zona = infoComune(opp.comune).zona;
  return CONFIG.squadre.find(
    (s) => s.zone.includes(zona) && s.servizi.includes(opp.servizio) && oreLibereSquadra(s, opportunita) >= opp.ore
  );
}

// Verifica i requisiti di un partner: solo imprese, DURC regolare (non scaduto)
function requisitiPartner(partner) {
  if (partner.tipo !== "impresa") {
    return { idoneo: false, testo: "Lavoratore autonomo: non ammesso" };
  }
  if (partner.durcScadenza < oggi()) {
    return { idoneo: false, testo: "DURC scaduto il " + formattaData(partner.durcScadenza) };
  }
  return { idoneo: true, testo: "DURC regolare fino al " + formattaData(partner.durcScadenza) };
}

// Partner idonei per zona e servizio, nell'ordine di priorità della configurazione
function partnerIdonei(opp) {
  const zona = infoComune(opp.comune).zona;
  return CONFIG.partner.filter(
    (p) => requisitiPartner(p).idoneo && p.zone.includes(zona) && p.servizi.includes(opp.servizio)
  );
}

// Primo partner idoneo che non ha già risposto NO per questa commessa
function prossimoPartner(opp) {
  const rifiuti = (opp.proposte || []).filter((p) => p.esito === "no").map((p) => p.partnerId);
  return partnerIdonei(opp).find((p) => !rifiuti.includes(p.id));
}

// Proposta inviata e ancora senza risposta (al massimo una alla volta)
function propostaInAttesa(opp) {
  return (opp.proposte || []).find((p) => p.esito === "attesa");
}

// Chi eseguirà il servizio: quello assegnato, altrimenti quello che il sistema proporrebbe
function esecutorePrevisto(opp, opportunita) {
  if (opp.allocazione) return opp.allocazione.tipo;
  if (squadraDisponibile(opp, opportunita)) return "squadra";
  if (partnerIdonei(opp).length > 0) return "partner";
  return null;
}

// Data di avvio del servizio: firma del contratto + giorni configurati
function dataAvvio(opp) {
  const firma = new Date(opp.storico.contratto || oggi());
  firma.setDate(firma.getDate() + CONFIG.giorniAvvioServizio);
  return firma.toISOString().slice(0, 10);
}

// Testo del messaggio WhatsApp con i segnaposto sostituiti
function testoWhatsApp(opp, partner) {
  const valori = {
    referente: partner.referente,
    mittente: CONFIG.mittente,
    servizio: opp.servizio.toLowerCase(),
    comune: opp.comune,
    ore: opp.ore,
    avvio: formattaData(dataAvvio(opp)),
    codice: opp.codice,
  };
  return CONFIG.messaggioWhatsApp.replace(/\{(\w+)\}/g, (_, chiave) => valori[chiave]);
}

// Link wa.me: apre WhatsApp con il messaggio già scritto
function linkWhatsApp(opp, partner) {
  return "https://wa.me/" + partner.telefono + "?text=" + encodeURIComponent(testoWhatsApp(opp, partner));
}
