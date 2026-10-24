/*
 * COSA FARE DOMANI
 * Sezione degli Indicatori che ragiona in avanti con i dati di oggi: quattro previsioni semplici
 * (contratti in arrivo, trattative a rischio, capacità delle squadre, nuovi contatti), ognuna con
 * il dato su cui si basa e le azioni che ne seguono. Le previsioni proiettano i tassi di oggi;
 * le azioni sono regole leggibili (soglie in config.js), ognuna con il suo "perché".
 */

// Ore che serviranno nelle zone se si firmano le offerte aperte, contro le ore libere delle squadre
function previsioneCapacita(opportunita) {
  const zone = new Map();
  opportunita.filter((o) => trattativaAperta(o) && o.storico.offerta).forEach((o) => {
    const zona = infoComune(o.comune).zona;
    const z = zone.get(zona) || { zona, ore: 0, offerte: 0, libere: 0 };
    z.ore += Number(o.ore) || 0;
    z.offerte++;
    zone.set(zona, z);
  });
  zone.forEach((z) => {
    z.libere = CONFIG.squadre.filter((s) => s.zone.includes(z.zona))
      .reduce((somma, s) => somma + Math.max(0, oreLibereSquadra(s, opportunita)), 0);
    z.mancano = Math.max(0, z.ore - z.libere);
  });
  return [...zone.values()].sort((a, b) => b.mancano - a.mancano);
}

// Azioni ordinate per priorità, ognuna con il dato da cui nasce e la previsione (blocco) a cui risponde
function consigli(opportunita = stato.opportunita) {
  const c = CONFIG.consigli;
  const elenco = [];
  const aperte = opportunita.filter(trattativaAperta);

  // 1. Offerte scadute o in scadenza: sollecitarle
  aperte.filter((o) => o.scadenzaOfferta && giorniTra(oggi(), o.scadenzaOfferta) <= c.giorniAvvisoScadenzaOfferta).forEach((o) => {
    const scaduta = o.scadenzaOfferta < oggi();
    elenco.push({ priorita: 100 + valoreAnnuo(o) / 1000, aziendaId: o.aziendaId, blocco: "contratti",
      testo: "Sollecita " + nomeCliente(o),
      perche: (scaduta ? "offerta scaduta il " : "offerta in scadenza il ") + formattaData(o.scadenzaOfferta) + " · " + formattaEuro(valoreAnnuo(o)) + "/anno" });
  });

  // 2. Trattative buone (punteggio da 70) ferme da troppo tempo o senza nulla in agenda
  aperte.forEach((o) => {
    const st = statoTrattativa(o);
    const p = calcolaPunteggio(o, opportunita);
    if (!trattativaBuona(p)) return;
    if (st.ferma) {
      elenco.push({ priorita: 80 + st.giorniInFase, aziendaId: o.aziendaId, blocco: "rischio",
        testo: "Riprendi la trattativa con " + nomeCliente(o),
        perche: "punteggio " + p.totale + ", ferma da " + giorni(st.giorniInFase) + " in «" + CONFIG.fasi[faseRaggiunta(o)].nome + "»" });
    } else if (!st.prossima) {
      elenco.push({ priorita: 70, aziendaId: o.aziendaId, blocco: "rischio",
        testo: "Fissa la prossima azione con " + nomeCliente(o),
        perche: "punteggio " + p.totale + ", nulla in agenda" });
    }
  });

  // 3. Capacità: zone dove le offerte aperte supererebbero le ore libere delle squadre
  previsioneCapacita(opportunita).filter((z) => z.mancano > 0).forEach((z) => {
    elenco.push({ priorita: 60 + z.mancano / 10, link: "#allocazione", blocco: "capacita",
      testo: "Prepara un partner in " + z.zona,
      perche: "se firmano le " + z.offerte + " offerte aperte servono " + z.ore + " ore/mese, le squadre ne hanno " + z.libere + " libere" });
  });

  // 4. Motivo di perdita prevalente
  const motivo = motiviPerdita(opportunita)[0];
  if (motivo && motivo.numero >= c.minimoPerditeStessoMotivo) {
    elenco.push({ priorita: 40, link: puo("approfondimenti") ? "#indicatori" : "#cruscotto", blocco: "rischio",
      testo: (CONFIG.rimediPerdita || {})[motivo.motivo] || "Analizza le perdite per «" + motivo.motivo + "»",
      perche: motivo.numero + " trattative perse per «" + motivo.motivo + "» (" + formattaEuro(motivo.valore) + "/anno)" });
  }

  // 5. Canale di acquisizione: spostare il budget dal più caro al più conveniente
  const canali = risultatiPerCanale(opportunita).filter((r) => r.costoAcquisizione !== null && !r.fuoriElenco);
  if (canali.length >= 2) {
    canali.sort((a, b) => a.costoAcquisizione - b.costoAcquisizione);
    const migliore = canali[0], peggiore = canali[canali.length - 1];
    if (peggiore.costoAcquisizione > migliore.costoAcquisizione * c.rapportoCanaleCaro) {
      elenco.push({ priorita: 30, link: puo("approfondimenti") ? "#indicatori" : "#cruscotto", blocco: "contatti",
        testo: "Sposta budget da «" + peggiore.fonte + "» a «" + migliore.fonte + "»",
        perche: "costo per contratto " + formattaEuro(peggiore.costoAcquisizione) + " contro " + formattaEuro(migliore.costoAcquisizione) });
    }
  }

  // Un solo consiglio per azienda: il più urgente
  const visti = new Set();
  return elenco.sort((a, b) => b.priorita - a.priorita).filter((x) => {
    if (!x.aziendaId) return true;
    if (visti.has(x.aziendaId)) return false;
    visti.add(x.aziendaId);
    return true;
  });
}

// Le quattro previsioni di «Cosa fare domani»: cosa succederà se si continua come oggi, su cosa si basa, cosa fare
function previsioniDomani(opportunita = stato.opportunita) {
  const k = calcolaKpi(opportunita);
  const aperte = opportunita.filter(trattativaAperta);
  const azioni = consigli(opportunita);
  const di = (blocco) => azioni.filter((x) => x.blocco === blocco);

  // 1. Contratti in arrivo: offerte aperte × conversione storica delle offerte (K3)
  const offerte = aperte.filter((o) => o.storico.offerta);
  const valoreOfferte = offerte.reduce((s, o) => s + valoreAnnuo(o), 0);

  // 2. Trattative a rischio: ferme oltre la soglia della fase (K9), con il loro valore pesato dalla probabilità della fase
  const ferme = aperte.filter(trattativaFerma);

  // 3. Capacità: zone dove le offerte aperte, se firmate, supererebbero le ore libere delle squadre
  const scoperte = previsioneCapacita(opportunita).filter((z) => z.mancano > 0);

  // 4. Nuovi contatti: media mensile degli ultimi 90 giorni, che diventano contratti come finora (K7)
  const recenti = opportunita.filter((o) => giorniTra(o.storico.contatto, oggi()) <= 90).length;
  const alMese = recenti / 3;

  return [
    { id: "contratti", titolo: "Contratti in arrivo",
      valore: offerte.length ? "circa " + Math.round(offerte.length * k.conversioneOfferte) + " contratti" : NESSUN_DATO,
      dettaglio: offerte.length ? formattaEuro(valoreOfferte * k.conversioneOfferte) + " all'anno" : "",
      base: quanti(offerte.length, "offerta aperta", "offerte aperte") + " × " + formattaPercentuale(k.conversioneOfferte) + " delle offerte che oggi diventano contratti",
      azioni: di("contratti") },
    { id: "rischio", titolo: "Trattative a rischio",
      valore: quanti(ferme.length, "trattativa ferma", "trattative ferme"),
      dettaglio: formattaEuro(ferme.reduce((s, o) => s + ricaviAttesi(o), 0)) + " all'anno di ricavi attesi in gioco",
      base: "ferme oltre i giorni previsti per la loro fase, su " + quanti(aperte.length, "trattativa aperta", "trattative aperte"),
      azioni: di("rischio") },
    { id: "capacita", titolo: "Capacità delle squadre",
      valore: scoperte.length ? "mancano " + scoperte.reduce((s, z) => s + z.mancano, 0) + " ore/mese" : "capacità sufficiente",
      dettaglio: scoperte.length ? "in " + quanti(scoperte.length, "zona", "zone") + ": " + scoperte.map((z) => z.zona).join(", ") : "",
      base: "ore delle offerte aperte, se firmate, contro le ore libere delle squadre nella stessa zona",
      azioni: di("capacita") },
    { id: "contatti", titolo: "Nuovi contatti il prossimo mese",
      valore: recenti ? "circa " + Math.round(alMese) + " contatti" : NESSUN_DATO,
      dettaglio: recenti ? "da cui circa " + Math.round(alMese * k.winRate) + " contratti" : "",
      base: "media degli ultimi 3 mesi (" + recenti + " contatti) × " + formattaPercentuale(k.winRate) + " di trattative chiuse con un contratto",
      azioni: di("contatti") },
  ];
}

// Una previsione: il numero atteso, su cosa si basa e le azioni (le prime tre, le altre con un clic)
function schedaPrevisione(p, quante = 3) {
  const riga = (x) => `<li>
    <a class="link-titolo" href="${x.aziendaId ? "#cliente-" + esc(x.aziendaId) : x.link}">${esc(x.testo)}</a>
    <span class="consiglio-perche">Perché: ${esc(x.perche)}</span>
  </li>`;
  return `
    <article class="riquadro previsione" id="previsione-${p.id}">
      <h3>${p.titolo}</h3>
      <p class="kpi-valore">${esc(p.valore)}</p>
      ${p.dettaglio ? `<p class="kpi-dettaglio">${esc(p.dettaglio)}</p>` : ""}
      <p class="previsione-base">Si basa su: ${esc(p.base)}</p>
      <p class="previsione-titolo-azioni">Cosa fare</p>
      ${p.azioni.length ? `<ol class="elenco-consigli">${p.azioni.slice(0, quante).map(riga).join("")}</ol>
        ${p.azioni.length > quante ? `<details class="altri-consigli"><summary>Altre ${p.azioni.length - quante}</summary>
          <ol class="elenco-consigli" start="${quante + 1}">${p.azioni.slice(quante).map(riga).join("")}</ol></details>` : ""}`
        : '<p class="nota-piccola">Nessuna azione urgente.</p>'}
    </article>`;
}

// ------------------------------------------------------------ Tempo risparmiato (N3)

// Minuti prima e dopo di un'attività: quelli cambiati nel riquadro (interfaccia), altrimenti quelli di config.js
function parametroTempo(a, quale) {
  const scelti = (interfaccia.tempi || {})[a.id] || {};
  return Number.isFinite(scelti[quale]) ? scelti[quale] : a[quale];
}

// Ore ed euro risparmiati al mese: per ogni attività (minuti prima − minuti dopo) × volte al mese ÷ 60, in euro × costo orario
function tempoRisparmiato(opportunita = stato.opportunita) {
  const t = CONFIG.tempoRisparmiato;
  const inizio = aggiungiGiorni(oggi(), -29);
  const nelMese = (fase) => opportunita.filter((o) => o.storico[fase] && o.storico[fase] >= inizio && o.storico[fase] <= oggi()).length;
  const tempi = (stato.tempiRegistrazione || []).map((x) => x.secondi);
  const veri = tempi.length >= t.minimoTempiVeri;
  const costo = Number.isFinite((interfaccia.tempi || {}).costoOrario) ? interfaccia.tempi.costoOrario : t.costoOrario;
  const righe = t.attivita.map((a) => {
    const volume = a.volume === "richieste" ? nelMese("contatto") : a.volume === "offerte" ? nelMese("offerta") : a.volume;
    const dopoVero = a.id === "richiesta" && veri;
    const prima = parametroTempo(a, "prima");
    const dopo = dopoVero ? Math.round(media(tempi) / 60 * 10) / 10 : parametroTempo(a, "dopo");
    const ore = Math.max(0, prima - dopo) * volume / 60;
    return { ...a, prima, dopo, dopoVero, volume, ore, euro: ore * costo };
  });
  const ore = righe.reduce((s, r) => s + r.ore, 0);
  return { righe, ore, euro: ore * costo, costo, tempiVeri: tempi.length };
}

// Riquadro del tempo risparmiato: minuti modificabili, volumi dai dati, totali che si aggiornano mentre si scrive
function riquadroTempoRisparmiato() {
  const r = tempoRisparmiato();
  const numero = (n, cifre = 1) => n.toLocaleString("it-IT", { maximumFractionDigits: cifre });
  return `
    <section class="riquadro tempo-risparmiato" id="tempo-risparmiato">
      <h2 class="titolo-riquadro">Tempo risparmiato al mese</h2>
      <p class="tempo-totale"><strong id="tempo-ore">${numero(r.ore)} ore</strong> · <strong id="tempo-euro">${formattaEuro(r.euro)}</strong></p>
      <div class="tabella-scorrevole"><table class="tabella impilata">
        <thead><tr><th>Attività</th><th class="num">Minuti prima</th><th class="num">Minuti dopo</th><th class="num">Volte al mese</th><th class="num">Ore risparmiate</th><th class="num">Euro</th></tr></thead>
        <tbody>${r.righe.map((x) => `<tr>
          <td data-etichetta="Attività">${esc(x.nome)}${x.nota ? `<br><span class="nota-piccola">${esc(x.nota)}</span>` : ""}</td>
          <td class="num" data-etichetta="Minuti prima"><input class="campo-tempo" type="number" min="0" step="1" inputmode="numeric" data-tempo="${esc(x.id)}" data-quale="prima" value="${x.prima}" aria-label="Minuti prima: ${esc(x.nome)}"></td>
          <td class="num" data-etichetta="Minuti dopo">${x.dopoVero ? `<span title="Media dei secondi registrati con la nota">${numero(x.dopo)}</span><br><span class="nota-piccola">media di ${r.tempiVeri} richieste vere</span>`
            : `<input class="campo-tempo" type="number" min="0" step="1" inputmode="numeric" data-tempo="${esc(x.id)}" data-quale="dopo" value="${x.dopo}" aria-label="Minuti dopo: ${esc(x.nome)}">`}</td>
          <td class="num" data-etichetta="Volte al mese">${numero(x.volume, 2)}</td>
          <td class="num" data-etichetta="Ore risparmiate" id="tempo-ore-${esc(x.id)}">${numero(x.ore)}</td>
          <td class="num" data-etichetta="Euro" id="tempo-euro-${esc(x.id)}">${formattaEuro(x.euro)}</td>
        </tr>`).join("")}</tbody>
      </table></div>
      <label class="costo-orario">Costo di un'ora di lavoro d'ufficio (€) <input class="campo-tempo" type="number" min="0" step="1" inputmode="decimal" data-tempo="costoOrario" value="${r.costo}"></label>
      <p class="nota-piccola">Come si calcola: per ogni attività, (minuti prima − minuti dopo) × volte al mese ÷ 60 = ore risparmiate; ore × costo orario = euro.
        Richieste e offerte del mese vengono dai dati (ultimi 30 giorni); i minuti sono stime da sostituire con la fotografia di partenza.
        ${r.tempiVeri >= CONFIG.tempoRisparmiato.minimoTempiVeri ? "" : `Dopo ${CONFIG.tempoRisparmiato.minimoTempiVeri} richieste registrate da nota, il «dopo» di «Annotare una richiesta» diventa la media dei tempi veri.`}</p>
    </section>`;
}

// Un minuto o il costo cambiato nel riquadro: si ricorda nell'interfaccia e si aggiornano solo i totali (il campo non perde il cursore)
function cambiaTempo(campo) {
  const valore = Number(campo.value);
  if (!Number.isFinite(valore) || valore < 0) return;
  interfaccia.tempi = interfaccia.tempi || {};
  if (campo.dataset.tempo === "costoOrario") interfaccia.tempi.costoOrario = valore;
  else interfaccia.tempi[campo.dataset.tempo] = { ...(interfaccia.tempi[campo.dataset.tempo] || {}), [campo.dataset.quale]: valore };
  const r = tempoRisparmiato();
  const numero = (n) => n.toLocaleString("it-IT", { maximumFractionDigits: 1 });
  document.getElementById("tempo-ore").textContent = numero(r.ore) + " ore";
  document.getElementById("tempo-euro").textContent = formattaEuro(r.euro);
  r.righe.forEach((x) => {
    document.getElementById("tempo-ore-" + x.id).textContent = numero(x.ore);
    document.getElementById("tempo-euro-" + x.id).textContent = formattaEuro(x.euro);
  });
}

document.addEventListener("input", (evento) => {
  if (evento.target.classList && evento.target.classList.contains("campo-tempo")) cambiaTempo(evento.target);
});

// ------------------------------------------------------------ Lista del lunedì (N4)

// Giorni lavorativi (dal lunedì al venerdì, festività escluse) dopo «da» fino ad «a» compreso
function giorniLavorativi(da, a) {
  let n = 0;
  for (let d = aggiungiGiorni(da, 1); d <= a; d = aggiungiGiorni(d, 1)) {
    const giorno = new Date(d + "T12:00:00Z").getUTCDay();
    if (giorno !== 0 && giorno !== 6) n++;
  }
  return n;
}

// Fase di un'opportunità a una data: l'ultima registrata fino a quel giorno (indice in CONFIG.fasi)
function faseAl(o, rif) {
  let indice = 0;
  CONFIG.fasi.forEach((f, i) => { if (o.storico[f.id] && o.storico[f.id] <= rif) indice = i; });
  return indice;
}

// Le quattro sezioni della lista alla data di riferimento (fotografia a quel giorno); ogni trattativa compare in una sola sezione
function listaLunedi(rif = oggi(), opportunita = stato.opportunita) {
  const c = CONFIG.lunedi;
  // Aperta a quella data: richiesta già arrivata, né persa né firmata entro quel giorno
  const aperta = (o) => o.storico.contatto <= rif && !(o.perso && o.perso.data <= rif) && !(o.storico.contratto && o.storico.contratto <= rif);
  const inizioFase = (o) => {
    const data = o.storico[CONFIG.fasi[faseAl(o, rif)].id];
    return o.riaperta && o.riaperta > data && o.riaperta <= rif ? o.riaperta : data;
  };
  const riga = (o, giorni, azione) => ({ id: o.id, aziendaId: o.aziendaId, cliente: nomeCliente(o), punteggio: calcolaPunteggio(o, opportunita),
    valore: valoreAnnuo(o), giorni, responsabile: o.responsabile || "", azione });
  // Prima le trattative buone (punteggio da 70), poi per valore annuo
  const ordina = (righe) => righe.sort((x, y) => (y.punteggio && trattativaBuona(y.punteggio)) - (x.punteggio && trattativaBuona(x.punteggio)) || y.valore - x.valore);

  const senzaRisposta = opportunita.filter((o) => aperta(o) && (!o.dataPrimaRisposta || o.dataPrimaRisposta >= rif)
    && giorniLavorativi(o.storico.contatto, rif) > c.giorniLavorativiRisposta)
    .map((o) => riga(o, giorniLavorativi(o.storico.contatto, rif), "Richiamare oggi: richiesta del " + formattaData(o.storico.contatto) + " senza risposta"));
  const giaElencate = new Set(senzaRisposta.map((r) => r.id));
  const offerte = opportunita.filter((o) => aperta(o) && !giaElencate.has(o.id) && CONFIG.fasi[faseAl(o, rif)].id === "offerta"
    && giorniTra(o.storico.offerta, rif) > c.giorniOffertaSenzaEsito)
    .map((o) => riga(o, giorniTra(o.storico.offerta, rif), "Richiamare: offerta inviata " + giorni(giorniTra(o.storico.offerta, rif)) + " fa"));
  offerte.forEach((r) => giaElencate.add(r.id));
  const ferme = opportunita.filter((o) => aperta(o) && !giaElencate.has(o.id) && giorniTra(inizioFase(o), rif) > CONFIG.fasi[faseAl(o, rif)].giorniFerma)
    .map((o) => {
      const fase = CONFIG.fasi[faseAl(o, rif)];
      return riga(o, giorniTra(inizioFase(o), rif), "Riprendere: ferma da " + giorni(giorniTra(inizioFase(o), rif)) + " in «" + fase.nome + "» (soglia " + fase.giorniFerma + ")");
    });
  // Contratti in scadenza: quelli in corso dei clienti storici e quelli firmati nella pipeline
  const limite = aggiungiGiorni(rif, c.giorniScadenzaContratti);
  const contratti = (stato.contratti || []).filter((x) => x.firma <= rif).map((x) => ({ id: x.id, aziendaId: x.aziendaId, cliente: (trovaAzienda(x.aziendaId) || {}).ragioneSociale || "",
    punteggio: null, valore: x.valore, scadenza: x.scadenza, responsabile: x.responsabile || "" }))
    .concat(opportunita.filter((o) => scadenzaContratto(o) && o.storico.contratto <= rif).map((o) => ({ id: o.id, aziendaId: o.aziendaId, cliente: nomeCliente(o),
      punteggio: calcolaPunteggio(o, opportunita), valore: valoreAnnuo(o), scadenza: scadenzaContratto(o), responsabile: o.responsabile || "" })))
    .filter((x) => x.scadenza >= rif && x.scadenza <= limite)
    .map((x) => {
      const mancano = giorniTra(rif, x.scadenza);
      const evidenza = mancano <= c.giorniScadenzaEvidenza;
      return { ...x, giorni: mancano, evidenza, azione: (evidenza ? "Proporre subito il rinnovo" : "Preparare il rinnovo") + ": scade il " + formattaData(x.scadenza) };
    })
    .sort((x, y) => y.evidenza - x.evidenza || y.valore - x.valore);   // prima quelli entro 60 giorni, poi per valore
  return [
    { id: "risposta", titolo: "Richieste senza prima risposta", spiegazione: "da più di " + quanti(c.giorniLavorativiRisposta, "giorno lavorativo", "giorni lavorativi") + "; giorni = giorni lavorativi di attesa", righe: ordina(senzaRisposta) },
    { id: "ferme", titolo: "Trattative ferme", spiegazione: "oltre i giorni previsti per la loro fase; giorni = giorni nella fase", righe: ordina(ferme) },
    { id: "offerte", titolo: "Offerte senza esito", spiegazione: "inviate da più di " + c.giorniOffertaSenzaEsito + " giorni; giorni = giorni dall'invio", righe: ordina(offerte) },
    { id: "rinnovi", titolo: "Contratti da rinnovare", spiegazione: "in scadenza entro " + c.giorniScadenzaContratti + " giorni, in evidenza entro " + c.giorniScadenzaEvidenza + "; giorni = giorni alla scadenza", righe: contratti },
  ];
}

// ------------------------------------------------------------ Come funziona (N6)

// I 5 livelli della piattaforma: ogni passaggio dice chi lo fa e porta alla schermata in cui avviene
const LIVELLI_PIATTAFORMA = [
  { titolo: "Canali del cliente", sotto: "nessuna app per il cliente", passi: [
    ["Il cliente chiama, scrive, incontra Gate o compila il modulo del sito", "persona", "sopralluogo.html", "Apri il modulo"],
    ["Ogni link di LinkedIn e del sito porta canale, campagna e contenuto", "automatico", "#canali", "Sito e social"]] },
  { titolo: "Cattura automatica", sotto: "la richiesta entra nel CRM", passi: [
    ["La nota della telefonata diventa una richiesta compilata", "propone", "#nota", "Da una nota"],
    ["Le richieste dei moduli e delle campagne si importano dopo l'anteprima", "propone", "#canali", "Sito e social"],
    ["Data di registrazione e tempo impiegato si salvano da soli", "automatico", null, null]] },
  { titolo: "Archivio unico", sotto: "clienti, referenti, trattative", passi: [
    ["Cliente, referente e trattativa nascono insieme, senza doppioni", "automatico", "#clienti", "Clienti"],
    ["Privacy: base giuridica e consenso di ogni referente", "persona", "#clienti", "Clienti"],
    ["Scambio con il gestionale in CSV, con i controlli prima di sostituire i dati", "propone", "#documenti", "Documenti"]] },
  { titolo: "Strumenti di lavoro", sotto: "dalla richiesta alla commessa", passi: [
    ["Ogni trattativa ha la sua scheda: a che punto è e un solo pulsante per il passo successivo", "automatico", "#oggi", "Oggi"],
    ["Preventivo indicativo, punteggio di coerenza e avviso se le squadre non hanno ore libere", "automatico", "#oggi", "Oggi"],
    ["Offerta da pacchetto: prezzo e margine calcolati, la persona sceglie e invia", "propone", "#oggi", "Oggi"],
    ["Firma da link: contratto, data di chiusura e scadenza registrati", "automatico", "#oggi", "Oggi"],
    ["Chi esegue: la squadra con ore libere è proposta, il partner risponde su WhatsApp", "propone", "#allocazione", "Allocazione"],
    ["Promemoria, avvisi e lista del lunedì", "automatico", "#lunedi", "Lista del lunedì"]] },
  { titolo: "Cruscotto", sotto: "per decidere", passi: [
    ["Quattro numeri, decisioni della settimana, dove e perché si perdono i clienti", "automatico", "#cruscotto", "Cruscotto"],
    ["Cosa fare domani: previsioni e azioni proposte, la direzione decide", "propone", "#indicatori-domani", "Cosa fare domani"],
    ["Tempo risparmiato e riepilogo del mese", "automatico", "#riepilogo", "Riepilogo del mese"]] },
];

const ETICHETTE_PASSI = {
  automatico: { testo: "automatico", classe: "chip-ok" },
  propone: { testo: "l'assistente propone, la persona conferma", classe: "chip-info" },
  persona: { testo: "persona", classe: "" },
};

// Passi della demo guidata (sotto i 90 secondi)
const DEMO_GUIDATA = [
  ["Nota della telefonata", "Oggi → «Nuova richiesta» → esempio 1 → «Conferma e registra»"],
  ["Preventivo e punteggio", "si apre da solo dopo la conferma"],
  ["Offerta da pacchetto", "pacchetto Plus → «Segna l'offerta come inviata» → Salva: si apre la scheda della trattativa"],
  ["Firma da link", "nella scheda, prossimo passo «Ottenere la firma» → «Firma da link» → «Il cliente ha firmato»"],
  ["Chi esegue", "si apre l'Allocazione: squadra interna o partner"],
  ["Cruscotto aggiornato", "«Contratti firmati»: un contratto in più"],
  ["Tempo risparmiato", "in fondo al Cruscotto: ore ed euro al mese"],
];

// Pagina «Come funziona»: i 5 livelli, chi fa cosa e la demo guidata
function disegnaComeFunziona() {
  const link = (dove, testo) => {
    if (!dove) return "";
    if (dove === "#nota") return `<button class="pulsante-testo positivo" type="button" data-azione="nota">${esc(testo)}</button>`;
    if (dove === "#canali") return `<button class="pulsante-testo positivo" type="button" data-azione="canali">${esc(testo)}</button>`;
    if (dove === "#indicatori-domani") return `<button class="pulsante-testo positivo" type="button" data-azione="vai-domani">${esc(testo)}</button>`;
    return `<a class="link" href="${dove}"${dove.endsWith(".html") ? ' target="_blank" rel="noopener"' : ""}>${esc(testo)}</a>`;
  };
  return `
    ${intestazione({ titolo: "Come funziona", istruzione: "La piattaforma su cinque livelli: per ogni passaggio, chi lo fa. Ogni livello porta alla schermata in cui avviene." })}
    <p class="legenda-passi">${Object.values(ETICHETTE_PASSI).map((e) => `<span class="chip ${e.classe}">${e.testo}</span>`).join(" ")}</p>
    <ol class="livelli-piattaforma">
      ${LIVELLI_PIATTAFORMA.map((l, i) => `
        <li class="riquadro livello-piattaforma" id="livello-${i + 1}">
          <h2 class="titolo-riquadro"><span class="numero-livello">${i + 1}</span> ${esc(l.titolo)} <span class="sottotitolo">${esc(l.sotto)}</span></h2>
          <ul class="passi-piattaforma">${l.passi.map(([testo, chi, dove, etichetta]) => `
            <li><span class="chip ${ETICHETTE_PASSI[chi].classe}">${ETICHETTE_PASSI[chi].testo}</span> <span>${esc(testo)}</span> ${link(dove, etichetta)}</li>`).join("")}
          </ul>
        </li>`).join("")}
    </ol>
    <section class="riquadro demo-guidata">
      <h2 class="titolo-riquadro">Demo guidata, meno di 90 secondi</h2>
      <ol class="elenco-consigli">${DEMO_GUIDATA.map(([passo, come]) => `<li><strong>${esc(passo)}</strong> <span class="consiglio-perche">${esc(come)}</span></li>`).join("")}</ol>
      <button class="pulsante primario" type="button" data-azione="nota">Inizia dalla nota</button>
    </section>
    <p class="nota-piccola">Il CRM non sostituisce il gestionale di Gate: tiene il modello commerciale (fasi, campi, preventivo, punteggio, KPI) e scambia i dati con il gestionale in CSV.</p>`;
}
