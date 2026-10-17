/*
 * STIME ECONOMICHE E PUNTEGGIO DI COERENZA A/B/C
 * Il punteggio dice quanto un'opportunità è coerente con la capacità
 * operativa e la marginalità attesa di Gate. Pesi e soglie sono in config.js.
 */

// Tariffa oraria dell'opportunità (se non indicata, quella standard del servizio)
function tariffaOraria(opp) {
  return opp.tariffa || CONFIG.servizi[opp.servizio].tariffa;
}

// Ricavi previsti in un anno = ore al mese x 12 x tariffa oraria
function valoreAnnuo(opp) {
  return opp.ore * 12 * tariffaOraria(opp);
}

// Margine % = 1 - costo del lavoro / tariffa - spese dirette.
// Il costo del lavoro dipende da chi esegue: squadra interna o partner.
function marginePercentuale(opp, opportunita) {
  const costi = CONFIG.servizi[opp.servizio];
  const costo = esecutorePrevisto(opp, opportunita) === "squadra" ? costi.costoInterno : costi.costoPartner;
  return 1 - costo / tariffaOraria(opp) - CONFIG.speseDirettePercentuale;
}

// Calcola il punteggio: ogni criterio vale da 0 a 1 e viene moltiplicato per il suo peso
function calcolaPunteggio(opp, opportunita) {
  const p = CONFIG.punteggio;
  const comune = infoComune(opp.comune);
  const criteri = [];

  // 1. Settore pilota
  const pilota = settoreDi(opp) === CONFIG.pilota.settore;
  criteri.push({ nome: "Settore pilota", valore: pilota ? 1 : p.settoreFuoriPilota, peso: p.pesi.settore,
    nota: pilota ? "Settore del pilota" : "Fuori dal settore del pilota" });

  // 2. Distanza da Bari
  const km = comune.km;
  criteri.push({ nome: "Distanza da Bari", valore: km <= p.distanzaKm.piena ? 1 : km <= p.distanzaKm.massima ? 0.5 : 0,
    peso: p.pesi.distanza, nota: km === 0 ? "Bari città" : km + " km da Bari" });

  // 3. Capacità disponibile
  let capacita, notaCapacita;
  if (opp.allocazione) {
    const interna = opp.allocazione.tipo === "squadra";
    capacita = interna ? 1 : 0.5;
    notaCapacita = "Assegnata a " + (interna ? trovaSquadra(opp.allocazione.id).nome : trovaPartner(opp.allocazione.id).nome);
  } else {
    const squadra = squadraDisponibile(opp, opportunita);
    if (squadra) {
      capacita = 1;
      notaCapacita = squadra.nome + ": " + oreLibereSquadra(squadra, opportunita, opp.id) + " ore libere al mese";
    } else if (partnerIdonei(opp).length > 0) {
      capacita = 0.5;
      notaCapacita = "Nessuna squadra in " + comune.zona + " con " + opp.ore + " ore libere al mese: serve un partner";
    } else {
      capacita = 0;
      notaCapacita = "Nessuna squadra né partner disponibile in " + comune.zona;
    }
  }
  criteri.push({ nome: "Capacità disponibile", valore: capacita, peso: p.pesi.capacita, nota: notaCapacita });

  // 4. Margine stimato
  const margine = marginePercentuale(opp, opportunita);
  const esecutore = esecutorePrevisto(opp, opportunita);
  const chi = esecutore === "squadra" ? "squadra interna" : esecutore === "partner" ? "partner" : "costo partner (ipotesi: oggi nessun esecutore)";
  criteri.push({ nome: "Margine stimato", valore: margine >= p.margine.obiettivo ? 1 : margine >= p.margine.minimo ? 0.5 : 0,
    peso: p.pesi.margine, nota: formattaPercentuale(margine) + " con " + chi });

  // 5. Dimensione della commessa (valore annuo)
  const valore = valoreAnnuo(opp);
  const v = p.valoreAnnuo;
  const dimensione = valore >= v.idealeDa && valore <= v.idealeA ? 1
    : valore >= v.accettabileDa && valore <= v.accettabileA ? 0.5 : 0;
  criteri.push({ nome: "Dimensione commessa", valore: dimensione, peso: p.pesi.dimensione,
    nota: formattaEuro(valore) + " all'anno" });

  // 6. Decisore identificato
  const decisore = decisoreDi(opp);
  criteri.push({ nome: "Decisore identificato", valore: decisore ? 1 : 0, peso: p.pesi.decisore,
    nota: decisore ? (decisore.nome ? "Sì: " + decisore.nome : "Sì") : "Non ancora" });

  // Totale e classe
  criteri.forEach((c) => (c.punti = Math.round(c.valore * c.peso)));
  const totale = criteri.reduce((somma, c) => somma + c.punti, 0);
  const classe = totale >= p.soglie.A ? "A" : totale >= p.soglie.B ? "B" : "C";
  return { totale, classe, criteri };
}
