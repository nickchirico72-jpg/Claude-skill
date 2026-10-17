/*
 * INDICATORI DI PERFORMANCE
 * I 5 KPI richiesti da Gate, il funnel commerciale e i risultati per settore.
 * Un'opportunità "ha raggiunto" una fase se nello storico c'è la data di quella fase.
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

function calcolaKpi(opportunita) {
  const contatti = opportunita.length;
  const qualificati = contaRaggiunte(opportunita, "qualificato");
  const sopralluoghi = contaRaggiunte(opportunita, "sopralluogo");
  const offerte = contaRaggiunte(opportunita, "offerta");
  const contratti = contaRaggiunte(opportunita, "contratto");

  const c = CONFIG.costiAcquisizione;
  const costiCommerciali = contatti * c.perContatto + sopralluoghi * c.perSopralluogo + offerte * c.perOfferta + c.fissiCampagna;

  const margine = opportunita.reduce((s, o) => s + margineAtteso(o, opportunita), 0);
  const ricavi = opportunita.reduce((s, o) => s + ricaviAttesi(o), 0);

  return {
    contatti, qualificati, sopralluoghi, offerte, contratti,
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

// Funnel: per ogni fase, quante opportunità l'hanno raggiunta e la conversione dalla fase precedente
function calcolaFunnel(opportunita) {
  return CONFIG.fasi.map((f, i) => {
    const n = contaRaggiunte(opportunita, f.id);
    const precedente = i === 0 ? n : contaRaggiunte(opportunita, CONFIG.fasi[i - 1].id);
    return { nome: f.nome, n, conversione: i === 0 ? null : rapporto(n, precedente) };
  });
}

// Risultati per settore
function risultatiPerSettore(opportunita) {
  return CONFIG.settori.map((settore) => {
    const gruppo = opportunita.filter((o) => o.settore === settore);
    const firmati = gruppo.filter((o) => o.storico.contratto);
    return {
      settore,
      pilota: settore === CONFIG.pilota.settore,
      contatti: gruppo.length,
      contratti: firmati.length,
      conversione: rapporto(firmati.length, gruppo.length),
      valoreContratti: firmati.reduce((s, o) => s + valoreAnnuo(o), 0),
      margineAtteso: gruppo.reduce((s, o) => s + margineAtteso(o, opportunita), 0),
      quotaA: rapporto(gruppo.filter((o) => calcolaPunteggio(o, opportunita).classe === "A").length, gruppo.length),
    };
  });
}
