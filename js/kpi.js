/*
 * INDICATORI DI PERFORMANCE
 * I 5 KPI richiesti da Gate, il funnel commerciale e i risultati per settore e per canale.
 * Un'opportunità "ha raggiunto" una fase se nello storico c'è la data di quella fase.
 * Contatti = opportunità + aziende ancora senza opportunità (lead "Da qualificare").
 */

// Indice dell'ultima fase raggiunta (0 = Contatto ... 4 = Contratto)
function faseRaggiunta(opp) {
  let indice = 0;
  CONFIG.fasi.forEach((f, i) => {
    if (opp.storico[f.id]) indice = i;
  });
  return indice;
}

// Fase attuale: "perso" oppure l'id dell'ultima fase raggiunta
function faseAttuale(opp) {
  return opp.perso ? "perso" : CONFIG.fasi[faseRaggiunta(opp)].id;
}

// Data in cui l'opportunità è entrata nella fase attuale (o in cui è stata persa)
function dataFaseAttuale(o) {
  return o.perso ? o.perso.data : o.storico[CONFIG.fasi[faseRaggiunta(o)].id];
}

// Trattativa aperta: non persa e senza contratto
function trattativaAperta(o) {
  return !o.perso && !o.storico.contratto;
}

// Stato di una trattativa aperta: giorni nella fase, se è ferma e la prossima azione in agenda
// (la prima attività da fare dell'azienda, con precedenza a quelle di questa opportunità)
function statoTrattativa(o) {
  const fase = CONFIG.fasi[faseRaggiunta(o)];
  const giorniInFase = giorniTra(dataFaseAttuale(o), oggi());
  const daFare = stato.attivita.filter((x) => x.daFare && x.aziendaId === o.aziendaId).sort((a, b) => a.data.localeCompare(b.data));
  const prossima = daFare.find((x) => x.opportunitaId === o.id) || daFare[0] || null;
  return { giorniInFase, ferma: fase.giorniFerma != null && giorniInFase > fase.giorniFerma, prossima };
}

// Quante opportunità hanno raggiunto almeno la fase indicata
function contaRaggiunte(opportunita, idFase) {
  const soglia = CONFIG.fasi.findIndex((f) => f.id === idFase);
  return opportunita.filter((o) => faseRaggiunta(o) >= soglia).length;
}

// Margine atteso di un'opportunità = valore annuo x margine % x probabilità di chiusura della fase
function margineAtteso(opp, opportunita) {
  if (opp.perso) return 0;
  const fase = CONFIG.fasi[faseRaggiunta(opp)];
  return valoreAnnuo(opp) * marginePercentuale(opp, opportunita) * fase.probabilita;
}

function ricaviAttesi(opp) {
  if (opp.perso) return 0;
  return valoreAnnuo(opp) * CONFIG.fasi[faseRaggiunta(opp)].probabilita;
}

// Divisione che restituisce 0 invece di errore quando il denominatore è 0
function rapporto(a, b) {
  return b > 0 ? a / b : 0;
}

// Lead: aziende che non hanno ancora nessuna opportunità (stato "Da qualificare")
function leadSenzaOpportunita(opportunita, aziende) {
  const conOpportunita = new Set(opportunita.map((o) => o.aziendaId));
  return aziende.filter((a) => !conOpportunita.has(a.id));
}

// Previsione ponderata: valore annuo delle trattative aperte × probabilità di chiusura della loro fase
function previsionePonderata(opportunita) {
  const aperte = opportunita.filter(trattativaAperta);
  return {
    aperte: aperte.length,
    ponderata: aperte.reduce((s, o) => s + ricaviAttesi(o), 0),
    pieno: aperte.reduce((s, o) => s + valoreAnnuo(o), 0),
  };
}

function calcolaKpi(opportunita, aziende = stato.aziende) {
  const lead = leadSenzaOpportunita(opportunita, aziende).length;
  const contatti = opportunita.length + lead;
  const qualificati = contaRaggiunte(opportunita, "qualificato");
  const sopralluoghi = contaRaggiunte(opportunita, "sopralluogo");
  const offerte = contaRaggiunte(opportunita, "offerta");
  const contratti = contaRaggiunte(opportunita, "contratto");

  const c = CONFIG.costiAcquisizione;
  const costiCommerciali = contatti * c.perContatto + sopralluoghi * c.perSopralluogo + offerte * c.perOfferta + costiFissiTotali();

  const margine = opportunita.reduce((s, o) => s + margineAtteso(o, opportunita), 0);
  const ricavi = opportunita.reduce((s, o) => s + ricaviAttesi(o), 0);

  return {
    contatti, lead, qualificati, sopralluoghi, offerte, contratti,
    persi: opportunita.filter((o) => o.perso).length,
    tassoQualificati: rapporto(qualificati, contatti),
    tassoSopralluoghi: rapporto(sopralluoghi, qualificati),
    conversioneOfferte: rapporto(contratti, offerte),
    costiCommerciali,
    costoAcquisizione: rapporto(costiCommerciali, contratti),
    margineAtteso: margine,
    ricaviAttesi: ricavi,
    marginalitaMedia: rapporto(margine, ricavi),
  };
}

// I 5 obiettivi del pilota: valore, obiettivo e se è raggiunto (l'id è anche la chiave di CONFIG.suggerimenti)
function obiettiviPilota(k) {
  const ob = CONFIG.obiettivi;
  return [
    { id: "tassoQualificati", nome: "Contatti qualificati", valore: formattaPercentuale(k.tassoQualificati),
      obiettivo: "≥ " + formattaPercentuale(ob.tassoQualificati), raggiunto: k.tassoQualificati >= ob.tassoQualificati },
    { id: "tassoSopralluoghi", nome: "Appuntamenti (sopralluoghi)", valore: formattaPercentuale(k.tassoSopralluoghi),
      obiettivo: "≥ " + formattaPercentuale(ob.tassoSopralluoghi), raggiunto: k.tassoSopralluoghi >= ob.tassoSopralluoghi },
    { id: "conversioneOfferte", nome: "Conversione delle offerte", valore: formattaPercentuale(k.conversioneOfferte),
      obiettivo: "≥ " + formattaPercentuale(ob.conversioneOfferte), raggiunto: k.conversioneOfferte >= ob.conversioneOfferte },
    { id: "costoAcquisizioneMax", nome: "Costo di acquisizione", valore: k.contratti ? formattaEuro(k.costoAcquisizione) : "n.d.",
      obiettivo: "≤ " + formattaEuro(ob.costoAcquisizioneMax), raggiunto: k.contratti > 0 && k.costoAcquisizione <= ob.costoAcquisizioneMax },
    { id: "marginalitaMedia", nome: "Marginalità media", valore: formattaPercentuale(k.marginalitaMedia),
      obiettivo: "≥ " + formattaPercentuale(ob.marginalitaMedia), raggiunto: k.marginalitaMedia >= ob.marginalitaMedia },
  ];
}

// Funnel: per ogni fase, quanti contatti l'hanno raggiunta e la conversione dalla fase precedente.
// La prima riga «Contatto» conta anche i lead ancora senza opportunità
function calcolaFunnel(opportunita, aziende = stato.aziende) {
  const lead = leadSenzaOpportunita(opportunita, aziende).length;
  const raggiunte = CONFIG.fasi.map((f, i) => contaRaggiunte(opportunita, f.id) + (i === 0 ? lead : 0));
  return CONFIG.fasi.map((f, i) => ({ nome: f.nome, n: raggiunte[i], conversione: i === 0 ? null : rapporto(raggiunte[i], raggiunte[i - 1]) }));
}

// Perché perdiamo: per ogni motivo, quante trattative e quanto valore annuo, dal motivo più frequente
function motiviPerdita(opportunita) {
  const motivi = new Map();
  opportunita.filter((o) => o.perso).forEach((o) => {
    const m = motivi.get(o.perso.motivo) || { motivo: o.perso.motivo, numero: 0, valore: 0 };
    m.numero++;
    m.valore += valoreAnnuo(o);
    motivi.set(o.perso.motivo, m);
  });
  return [...motivi.values()].sort((a, b) => b.numero - a.numero || b.valore - a.valore);
}

// Risultati per settore: i contatti sono le opportunità più i lead del settore
function risultatiPerSettore(opportunita, aziende = stato.aziende) {
  const lead = leadSenzaOpportunita(opportunita, aziende);
  return CONFIG.settori.map((settore) => {
    const gruppo = opportunita.filter((o) => settoreDi(o) === settore);
    const firmati = gruppo.filter((o) => o.storico.contratto);
    const contatti = gruppo.length + lead.filter((a) => a.settore === settore).length;
    return {
      settore,
      pilota: settore === CONFIG.pilota.settore,
      contatti,
      contratti: firmati.length,
      conversione: rapporto(firmati.length, contatti),
      valoreContratti: firmati.reduce((s, o) => s + valoreAnnuo(o), 0),
      margineAtteso: gruppo.reduce((s, o) => s + margineAtteso(o, opportunita), 0),
      quotaA: gruppo.length ? rapporto(gruppo.filter((o) => calcolaPunteggio(o, opportunita).classe === "A").length, gruppo.length) : null,
    };
  });
}

// Somma dei costi fissi di tutti i canali di acquisizione
function costiFissiTotali() {
  return Object.values(CONFIG.costiAcquisizione.fissiPerCanale).reduce((s, v) => s + v, 0);
}

// Risultati per canale di acquisizione (fonte dell'azienda): quale canale porta contratti e a che costo.
// I contatti sono le opportunità più i lead del canale; anche i lead pagano il costo per contatto
function risultatiPerCanale(opportunita, aziende = stato.aziende) {
  const c = CONFIG.costiAcquisizione;
  const lead = leadSenzaOpportunita(opportunita, aziende);
  return fonti().map((fonte) => {
    const gruppo = opportunita.filter((o) => (aziendaDi(o) || {}).fonte === fonte);
    const contatti = gruppo.length + lead.filter((a) => a.fonte === fonte).length;
    const conta = (id) => contaRaggiunte(gruppo, id);
    const contratti = conta("contratto");
    const costi = contatti * c.perContatto + conta("sopralluogo") * c.perSopralluogo + conta("offerta") * c.perOfferta + c.fissiPerCanale[fonte];
    return {
      fonte,
      contatti,
      contratti,
      conversione: rapporto(contratti, contatti),
      costi,
      costoAcquisizione: contratti ? costi / contratti : null,
    };
  });
}
