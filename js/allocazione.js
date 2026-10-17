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

// La squadra può eseguire questo servizio in questa zona?
function squadraCopre(squadra, opp) {
  return squadra.zone.includes(infoComune(opp.comune).zona) && squadra.servizi.includes(opp.servizio);
}

// Ore libere di una squadra = capacità - ore già impegnate - commesse assegnate dal prototipo
// - contratti firmati e non ancora assegnati che la squadra potrebbe eseguire (ore "prenotate").
// escludiId: l'opportunità che si sta valutando, che non prenota ore per sé stessa.
function oreLibereSquadra(squadra, opportunita, escludiId) {
  const occupate = opportunita
    .filter((o) => o.id !== escludiId && !o.perso)
    .filter((o) => o.allocazione
      ? o.allocazione.tipo === "squadra" && o.allocazione.id === squadra.id
      : o.storico.contratto && !propostaInAttesa(o) && squadraCopre(squadra, o))
    .reduce((somma, o) => somma + o.ore, 0);
  return squadra.oreCapacita - squadra.oreImpegnate - occupate;
}

// Prima squadra interna che copre zona e servizio e ha abbastanza ore libere
function squadraDisponibile(opp, opportunita) {
  return CONFIG.squadre.find((s) => squadraCopre(s, opp) && oreLibereSquadra(s, opportunita, opp.id) >= opp.ore);
}

// Verifica i requisiti di un partner: solo imprese, DURC regolare alla data indicata (di solito l'avvio)
function requisitiPartner(partner, data = oggi()) {
  if (partner.tipo !== "impresa") {
    return { idoneo: false, testo: "Lavoratore autonomo: non ammesso" };
  }
  if (partner.durcScadenza < data) {
    const scaduto = partner.durcScadenza < oggi();
    return { idoneo: false, testo: (scaduto ? "DURC scaduto il " : "DURC in scadenza il ") + formattaData(partner.durcScadenza) };
  }
  return { idoneo: true, testo: "DURC regolare fino al " + formattaData(partner.durcScadenza) };
}

// Partner che coprono zona e servizio, nell'ordine di priorità della configurazione
function partnerInZona(opp) {
  const zona = infoComune(opp.comune).zona;
  return CONFIG.partner.filter((p) => p.zone.includes(zona) && p.servizi.includes(opp.servizio));
}

// Partner idonei: in zona e con i requisiti validi fino all'avvio del servizio
function partnerIdonei(opp) {
  return partnerInZona(opp).filter((p) => requisitiPartner(p, dataAvvio(opp)).idoneo);
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
  const [a, m, g] = (opp.storico.contratto || oggi()).split("-").map(Number);
  const giorni = Math.round((new Date(a, m - 1, g) - new Date(new Date().toDateString())) / 86400000);
  return traGiorni(giorni + CONFIG.giorniAvvioServizio);
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
