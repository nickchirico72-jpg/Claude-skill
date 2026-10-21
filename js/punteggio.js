/*
 * STIME ECONOMICHE E PUNTEGGIO DI COERENZA
 * Il punteggio dice quanto un'opportunità è coerente con la capacità
 * operativa e la marginalità attesa di Gate: un valore da 0 a 100. Pesi e soglie arrivano dal database.
 * La classe A/B/C resta solo nei calcoli (K11, consigli), non si mostra nelle schermate operative.
 */

// Tariffa e costi del servizio; se il servizio non è più in config.js, valori a zero (senza bloccare nulla)
function datiServizio(nome) {
  // hasOwn: un nome come "constructor" non deve trovare le proprietà nascoste degli oggetti
  return (Object.hasOwn(CONFIG.servizi, nome) && CONFIG.servizi[nome]) || { tariffa: 0, costoInterno: 0, costoPartner: 0, fuoriElenco: true };
}

// Tariffa oraria dell'opportunità (se non indicata, quella standard del servizio)
function tariffaOraria(opp) {
  return opp.tariffa || datiServizio(opp.servizio).tariffa;
}

// Ricavi previsti in un anno = ore al mese x 12 x tariffa oraria (per le opportunità del database: il valore registrato)
function valoreAnnuo(opp) {
  return opp.valore ?? opp.ore * 12 * tariffaOraria(opp);
}

// Tipo di ambiente e frequenza del preventivo (null se non c'è o non è più in config.js)
function ambientePreventivo(opp) {
  return opp.preventivo ? CONFIG.preventivo.ambienti.find((a) => a.nome === opp.preventivo.ambiente) || null : null;
}

// Margine % = 1 - costo del lavoro / tariffa - spese dirette (quelle del tipo di ambiente, se c'è un preventivo).
// Il costo del lavoro dipende da chi esegue: squadra interna o partner. Per le opportunità del database: il margine registrato.
// Senza tariffa o con un servizio non più in elenco (costi sconosciuti) il margine vale 0.
function marginePercentuale(opp, opportunita) {
  if (opp.margine != null) return opp.margine;
  const costi = datiServizio(opp.servizio);
  const tariffa = tariffaOraria(opp);
  if (costi.fuoriElenco || !tariffa) return 0;
  const costo = esecutorePrevisto(opp, opportunita) === "squadra" ? costi.costoInterno : costi.costoPartner;
  const ambiente = ambientePreventivo(opp);
  return 1 - rapporto(costo, tariffa) - (ambiente ? ambiente.speseDirette : CONFIG.speseDirettePercentuale);
}

// Preventivo indicativo da servizio, mq, tipo di ambiente e frequenza: ore al mese, tariffa (con lo sconto per frequenza),
// prezzo annuo e margine con il costo della squadra interna. Valori di prova in config.js (preventivo)
function calcolaPreventivo({ servizio, mq, ambiente, frequenza }) {
  const c = CONFIG.preventivo;
  const amb = c.ambienti.find((a) => a.nome === ambiente);
  const freq = c.frequenze.find((f) => f.nome === frequenza);
  const costi = datiServizio(servizio);
  if (!amb || !freq || !(mq > 0) || costi.fuoriElenco) return null;
  const ore = Math.max(1, Math.round(mq / amb.resaMqOra * freq.passaggiSettimana * c.settimaneAlMese));
  const tariffa = Math.round(costi.tariffa * (1 - freq.sconto) * 2) / 2;   // arrotondata al mezzo euro
  const margine = 1 - costi.costoInterno / tariffa - amb.speseDirette;
  return { ore, tariffa, prezzoAnnuo: ore * 12 * tariffa, margine, sottoMinimo: margine < CONFIG.punteggio.margine.minimo };
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

  // 3. Capacità disponibile (per le opportunità del database: la capacità simulata dal generatore, finché non si assegna)
  let capacita, notaCapacita;
  if (opp.allocazione && opp.allocazione.tipo === "storico") {
    capacita = opp.capacitaSimulata ?? 1;
    notaCapacita = "Commessa già avviata";
  } else if (opp.allocazione) {
    const interna = opp.allocazione.tipo === "squadra";
    capacita = interna ? 1 : 0.5;
    notaCapacita = "Assegnata a " + (interna ? nomeSquadra(opp.allocazione.id) : nomePartner(opp.allocazione.id));
  } else if (opp.capacitaSimulata != null) {
    capacita = opp.capacitaSimulata;
    notaCapacita = "Capacità " + (capacita === 1 ? "piena" : capacita === 0.5 ? "con un partner" : "non disponibile");
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
  const esecutore = opp.margine != null ? null : esecutorePrevisto(opp, opportunita);
  const chi = opp.margine != null ? "dal database" : esecutore === "squadra" ? "squadra interna" : esecutore === "partner" ? "partner" : "costo partner (ipotesi: oggi nessun esecutore)";
  criteri.push({ nome: "Margine stimato", valore: margine >= p.margine.obiettivo ? 1 : margine >= p.margine.minimo ? 0.5 : 0,
    peso: p.pesi.margine, nota: formattaPercentualeDecimale(margine) + (opp.margine != null ? " (" + chi + ")" : " con " + chi) });

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

  // Totale e classe (la classe serve solo ai calcoli)
  criteri.forEach((c) => (c.punti = Math.round(c.valore * c.peso)));
  const totale = criteri.reduce((somma, c) => somma + c.punti, 0);
  const classe = totale >= p.soglie.A ? "A" : totale >= p.soglie.B ? "B" : "C";
  return { totale, classe, criteri };
}
