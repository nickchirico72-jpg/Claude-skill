/*
 * INDICATORI DI PERFORMANCE
 * I KPI del catalogo (tabella kpi_catalogo: stesse formule delle query SQL), il funnel,
 * i risultati per settore, per canale, per contenuto e il punteggio medio per canale.
 * Un'opportunità "ha raggiunto" una fase se nello storico c'è la data di quella fase.
 * Le aziende ancora senza opportunità (lead "Da qualificare") si contano a parte, come nel database.
 * I dati reali (tabella richieste_reali) si calcolano con kpiReali(): non si mescolano mai con quelli fittizi.
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
// (la prima attività da fare dell'azienda, con precedenza a quelle di questa opportunità).
// Una trattativa riaperta conta i giorni dalla riapertura
function statoTrattativa(o) {
  const fase = CONFIG.fasi[faseRaggiunta(o)];
  const inizio = o.riaperta && o.riaperta > dataFaseAttuale(o) ? o.riaperta : dataFaseAttuale(o);
  const giorniInFase = giorniTra(inizio, oggi());
  const daFare = stato.attivita.filter((x) => x.daFare && x.aziendaId === o.aziendaId).sort((a, b) => a.data.localeCompare(b.data));
  const prossima = daFare.find((x) => x.opportunitaId === o.id) || daFare[0] || null;
  return { giorniInFase, ferma: fase.giorniFerma != null && giorniInFase > fase.giorniFerma, prossima };
}

// Quante opportunità hanno raggiunto almeno la fase indicata
function contaRaggiunte(opportunita, idFase) {
  const soglia = CONFIG.fasi.findIndex((f) => f.id === idFase);
  return opportunita.filter((o) => faseRaggiunta(o) >= soglia).length;
}

// Margine atteso di un'opportunità aperta = valore annuo x margine % x probabilità di chiusura della fase (K5)
function margineAtteso(opp, opportunita) {
  if (!trattativaAperta(opp)) return 0;
  const fase = CONFIG.fasi[faseRaggiunta(opp)];
  return valoreAnnuo(opp) * marginePercentuale(opp, opportunita) * fase.probabilita;
}

// Ricavi attesi di un'opportunità aperta = valore annuo x probabilità della fase (K6)
function ricaviAttesi(opp) {
  if (!trattativaAperta(opp)) return 0;
  return valoreAnnuo(opp) * CONFIG.fasi[faseRaggiunta(opp)].probabilita;
}

// Divisione che restituisce 0 invece di errore quando il denominatore è 0
function rapporto(a, b) {
  return b > 0 ? a / b : 0;
}

// Media dei numeri di un elenco (null se l'elenco è vuoto)
function media(numeri) {
  return numeri.length ? numeri.reduce((s, n) => s + n, 0) / numeri.length : null;
}

// Lead: aziende che non hanno ancora nessuna opportunità (stato "Da qualificare")
function leadSenzaOpportunita(opportunita, aziende) {
  const conOpportunita = new Set(opportunita.map((o) => o.aziendaId));
  return aziende.filter((a) => !conOpportunita.has(a.id));
}

// Previsione ponderata (K6): valore annuo delle trattative aperte × probabilità di chiusura della loro fase
function previsionePonderata(opportunita) {
  const aperte = opportunita.filter(trattativaAperta);
  return {
    aperte: aperte.length,
    ponderata: aperte.reduce((s, o) => s + ricaviAttesi(o), 0),
    pieno: aperte.reduce((s, o) => s + valoreAnnuo(o), 0),
  };
}

// Scadenza del contratto di un'opportunità firmata: quella salvata, altrimenti firma + durata in mesi (dati salvati prima del PASSAGGIO 4)
function scadenzaContratto(o) {
  if (!o.storico.contratto || o.perso) return null;
  return o.scadenzaContratto || aggiungiMesi(o.storico.contratto, CONFIG.durataContrattoMesi);
}

// Trattativa «Da ricontattare» con la data già arrivata: promemoria in Pipeline e nella vista Commerciale
function ricontattoScaduto(o) {
  return trattativaAperta(o) && !!o.ricontatto && o.ricontatto.data <= oggi();
}

// Trattativa aperta ferma oltre la soglia della sua fase (K9)
function trattativaFerma(o) {
  if (!trattativaAperta(o)) return false;
  const fase = CONFIG.fasi[faseRaggiunta(o)];
  return giorniTra(dataFaseAttuale(o), oggi()) > fase.giorniFerma;
}

// Costi dei canali (tabella costi_canale del database), totali per canale
function costiPerCanale() {
  const costi = {};
  righeDb("costi_canale").forEach((r) => (costi[r.canale] = (costi[r.canale] || 0) + r.costo));
  return costi;
}

// Somma dei costi di tutti i canali
function costiFissiTotali() {
  return Object.values(costiPerCanale()).reduce((s, v) => s + v, 0);
}

// Tutti i KPI del catalogo calcolabili sui dati fittizi (stato dell'app), con i numeri che servono alle formule
function calcolaKpi(opportunita, aziende = stato.aziende) {
  const lead = leadSenzaOpportunita(opportunita, aziende).length;
  const n = opportunita.length;
  const qualificati = contaRaggiunte(opportunita, "qualificato");
  const sopralluoghi = contaRaggiunte(opportunita, "sopralluogo");
  const offerte = contaRaggiunte(opportunita, "offerta");
  const contrattiOpp = opportunita.filter((o) => o.storico.contratto && !o.perso);
  const contratti = contrattiOpp.length;
  const perse = opportunita.filter((o) => o.perso).length;
  // K3: opportunità con l'offerta decisa (firmate + perse dopo essere arrivate in offerta)
  const offerteDecise = opportunita.filter((o) => o.storico.offerta && (o.perso || o.storico.contratto)).length;
  const aperte = opportunita.filter(trattativaAperta);
  const costiCommerciali = costiFissiTotali();
  const margine = opportunita.reduce((s, o) => s + margineAtteso(o, opportunita), 0);
  const ricavi = opportunita.reduce((s, o) => s + ricaviAttesi(o), 0);
  const conRisposta = opportunita.filter((o) => o.dataPrimaRisposta);
  const conOfferta = opportunita.filter((o) => o.storico.offerta);
  const digitali = opportunita.filter((o) => (infoCanale(o.canale) || {}).tipo === "digitale").length;

  return {
    contatti: n, lead, qualificati, sopralluoghi, offerte, offerteDecise, contratti, persi: perse,
    tassoQualificati: rapporto(qualificati, n),                                // K1
    tassoSopralluoghi: rapporto(sopralluoghi, qualificati),                    // K2
    conversioneOfferte: rapporto(contratti, offerteDecise),                    // K3
    costiCommerciali,
    costoAcquisizione: rapporto(costiCommerciali, contratti),                  // K4 (tutti i canali)
    margineAtteso: margine,                                                    // K5
    ricaviAttesi: ricavi,                                                      // K6
    marginalitaMedia: rapporto(margine, ricavi),
    winRate: rapporto(contratti, contratti + perse),                           // K7
    durataCiclo: media(contrattiOpp.map((o) => giorniTra(o.storico.contatto, o.storico.contratto))),   // K8
    aperte: aperte.length,
    ferme: aperte.filter(trattativaFerma).length,                              // K9
    primaRisposta: media(conRisposta.map((o) => giorniTra(o.storico.contatto, o.dataPrimaRisposta))),  // K12
    conRisposta: conRisposta.length,
    entroUnGiorno: conRisposta.filter((o) => giorniTra(o.storico.contatto, o.dataPrimaRisposta) <= 1).length,
    tempoOfferta: media(conOfferta.map((o) => giorniTra(o.storico.contatto, o.storico.offerta))),      // K13
    conOfferta: conOfferta.length,
    digitali, quotaDigitali: rapporto(digitali, n),                            // K15
  };
}

// Righe reali di una fonte: quelle importate da CSV nel browser, se ci sono, altrimenti quelle del database
function righeReali(fonte) {
  const importate = (stato.richiesteReali || []).filter((r) => r.fonte === fonte);
  return importate.length ? importate : righeDb("richieste_reali").filter((r) => r.fonte === fonte);
}

// I KPI del catalogo calcolabili su una fonte di dati reali (fotografia di partenza o test)
function kpiReali(fonte) {
  const righe = righeReali(fonte);
  const giorniDa = (r, campo) => giorniTra(r.data_richiesta, r[campo]);
  const conRisposta = righe.filter((r) => r.data_risposta);
  const conOfferta = righe.filter((r) => r.data_offerta);
  const decise = conOfferta.filter((r) => ["contratto", "persa"].includes(r.esito));
  const contratti = righe.filter((r) => r.esito === "contratto").length;
  const perse = righe.filter((r) => r.esito === "persa").length;
  const digitali = righe.filter((r) => (infoCanale(r.canale) || {}).tipo === "digitale").length;
  return {
    righe, totale: righe.length, contratti, perse, esempio: righe.length > 0 && righe.every((r) => /^ESEMPIO/i.test(r.note || "")),
    conversioneOfferte: rapporto(decise.filter((r) => r.esito === "contratto").length, decise.length), offerteDecise: decise.length,   // K3
    winRate: rapporto(contratti, contratti + perse),                                                   // K7
    primaRisposta: media(conRisposta.map((r) => giorniDa(r, "data_risposta"))), conRisposta: conRisposta.length,   // K12
    entroUnGiorno: conRisposta.filter((r) => giorniDa(r, "data_risposta") <= 1).length,
    tempoOfferta: media(conOfferta.map((r) => giorniDa(r, "data_offerta"))), conOfferta: conOfferta.length,        // K13
    digitali, quotaDigitali: rapporto(digitali, righe.length),                                         // K15
  };
}

// Fonti dei dati reali presenti nel database (partenza, test)
function fontiReali() {
  return [...new Set(righeDb("richieste_reali").concat(stato.richiesteReali || []).map((r) => r.fonte))].sort();
}

// I 5 obiettivi del pilota: valore, obiettivo e se è raggiunto (l'id è anche la chiave di CONFIG.suggerimenti)
function obiettiviPilota(k) {
  const ob = CONFIG.obiettivi;
  return [
    { id: "tassoQualificati", nome: "K1 Contatti qualificati", valore: formattaPercentuale(k.tassoQualificati),
      obiettivo: "≥ " + formattaPercentuale(ob.tassoQualificati), raggiunto: k.tassoQualificati >= ob.tassoQualificati },
    { id: "tassoSopralluoghi", nome: "K2 Sopralluoghi", valore: formattaPercentuale(k.tassoSopralluoghi),
      obiettivo: "≥ " + formattaPercentuale(ob.tassoSopralluoghi), raggiunto: k.tassoSopralluoghi >= ob.tassoSopralluoghi },
    { id: "conversioneOfferte", nome: "K3 Conversione offerte", valore: formattaPercentuale(k.conversioneOfferte),
      obiettivo: "≥ " + formattaPercentuale(ob.conversioneOfferte), raggiunto: k.conversioneOfferte >= ob.conversioneOfferte },
    { id: "costoAcquisizioneMax", nome: "K4 Costo di acquisizione", valore: k.contratti ? formattaEuro(k.costoAcquisizione) : "n.d.",
      obiettivo: "≤ " + formattaEuro(ob.costoAcquisizioneMax), raggiunto: k.contratti > 0 && k.costoAcquisizione <= ob.costoAcquisizioneMax },
    { id: "marginalitaMedia", nome: "Marginalità media delle trattative aperte", valore: formattaPercentuale(k.marginalitaMedia),
      obiettivo: "≥ " + formattaPercentuale(ob.marginalitaMedia), raggiunto: k.marginalitaMedia >= ob.marginalitaMedia },
  ];
}

// Funnel: per ogni fase, quante opportunità l'hanno raggiunta e la conversione dalla fase precedente
function calcolaFunnel(opportunita) {
  const raggiunte = CONFIG.fasi.map((f) => contaRaggiunte(opportunita, f.id));
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

// Valori dell'elenco di config.js, più quelli salvati nei dati ma non più in elenco (in fondo)
function elencoConSalvati(elenco, salvati) {
  const altri = [...new Set(salvati)].filter((v) => v && !elenco.includes(v)).sort((a, b) => String(a).localeCompare(String(b), "it"));
  return elenco.concat(altri);
}

// Risultati per settore (contatti = opportunità del settore, come nel database).
// Un settore tolto dal dizionario ma ancora nei dati resta, con fuoriElenco = true (così i totali tornano)
function risultatiPerSettore(opportunita) {
  const settori = elencoConSalvati(CONFIG.settori, opportunita.map(settoreDi));
  return settori.map((settore) => {
    const gruppo = opportunita.filter((o) => settoreDi(o) === settore);
    const firmati = gruppo.filter((o) => o.storico.contratto && !o.perso);
    const contatti = gruppo.length;
    return {
      settore,
      fuoriElenco: !CONFIG.settori.includes(settore),
      pilota: settore === CONFIG.pilota.settore,
      contatti,
      contratti: firmati.length,
      conversione: rapporto(firmati.length, contatti),
      valoreContratti: firmati.reduce((s, o) => s + valoreAnnuo(o), 0),
      margineAtteso: gruppo.reduce((s, o) => s + margineAtteso(o, opportunita), 0),
      punteggioMedio: punteggioMedio(gruppo, opportunita),
    };
  });
}

// Risultati per canale di acquisizione (canale dell'opportunità, come nel database): quale canale porta contratti,
// clienti coerenti (punteggio medio) e margine, e a che costo (K4 = costi del canale ÷ contratti del canale).
// I canali spenti compaiono solo se hanno dati; un canale fuori dal dizionario resta, con fuoriElenco = true
function risultatiPerCanale(opportunita) {
  const costi = costiPerCanale();
  const canali = elencoConSalvati(fonti(), opportunita.map((o) => o.canale)).filter((c) => fonti().includes(c) || opportunita.some((o) => o.canale === c));
  return canali.map((fonte) => {
    const gruppo = opportunita.filter((o) => o.canale === fonte);
    const contratti = gruppo.filter((o) => o.storico.contratto && !o.perso).length;
    const chiuse = gruppo.filter((o) => o.perso || o.storico.contratto).length;
    const costo = Object.hasOwn(costi, fonte) ? costi[fonte] : null;
    return {
      fonte,
      tipo: (infoCanale(fonte) || {}).tipo || "",
      fuoriElenco: !infoCanale(fonte),
      contatti: gruppo.length,
      contratti,
      conversione: rapporto(contratti, chiuse),
      punteggioMedio: punteggioMedio(gruppo, opportunita),
      margineMedio: gruppo.length ? media(gruppo.map((o) => marginePercentuale(o, opportunita))) : null,
      margineAtteso: gruppo.reduce((s, o) => s + margineAtteso(o, opportunita), 0),
      costi: costo,
      costoAcquisizione: costo !== null && contratti ? costo / contratti : null,
    };
  });
}

// Punteggio di coerenza medio di un gruppo di opportunità, arrotondato (null se il gruppo è vuoto)
function punteggioMedio(gruppo, opportunita) {
  return gruppo.length ? Math.round(media(gruppo.map((o) => calcolaPunteggio(o, opportunita).totale))) : null;
}

// Richieste qualificate per contenuto (utm_content): quali contenuti portano richieste coerenti, non solo contatti
function risultatiPerContenuto(opportunita) {
  const riga = (nome, gruppo, extra = {}) => ({
    nome, ...extra,
    richieste: gruppo.length,
    qualificate: contaRaggiunte(gruppo, "qualificato"),
    punteggioMedio: punteggioMedio(gruppo, opportunita),
    contratti: gruppo.filter((o) => o.storico.contratto && !o.perso).length,
  });
  const contenuti = righeDb("contenuti").map((c) => riga(c.id, opportunita.filter((o) => o.contenuto === c.id), { contenuto: c }));
  const senza = opportunita.filter((o) => !o.contenuto && ["sito web", "LinkedIn"].includes(o.canale));
  return contenuti.concat(riga("Senza contenuto (sito web e LinkedIn)", senza));
}

// Coerenza del portafoglio (K11): opportunità e valore annuo buoni (punteggio da CONFIG.punteggio.buona in su) sul totale
function coerenzaPortafoglio(opportunita) {
  const r = { buone: { n: 0, valore: 0 }, totale: { n: opportunita.length, valore: 0 } };
  opportunita.forEach((o) => {
    r.totale.valore += valoreAnnuo(o);
    if (trattativaBuona(calcolaPunteggio(o, opportunita))) {
      r.buone.n++;
      r.buone.valore += valoreAnnuo(o);
    }
  });
  return r;
}
