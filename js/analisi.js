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
    elenco.push({ priorita: 40, link: "#indicatori", blocco: "rischio",
      testo: (CONFIG.rimediPerdita || {})[motivo.motivo] || "Analizza le perdite per «" + motivo.motivo + "»",
      perche: motivo.numero + " trattative perse per «" + motivo.motivo + "» (" + formattaEuro(motivo.valore) + "/anno)" });
  }

  // 5. Canale di acquisizione: spostare il budget dal più caro al più conveniente
  const canali = risultatiPerCanale(opportunita).filter((r) => r.costoAcquisizione !== null && !r.fuoriElenco);
  if (canali.length >= 2) {
    canali.sort((a, b) => a.costoAcquisizione - b.costoAcquisizione);
    const migliore = canali[0], peggiore = canali[canali.length - 1];
    if (peggiore.costoAcquisizione > migliore.costoAcquisizione * c.rapportoCanaleCaro) {
      elenco.push({ priorita: 30, link: "#indicatori", blocco: "contatti",
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
      base: quanti(offerte.length, "offerta aperta", "offerte aperte") + " × " + formattaPercentuale(k.conversioneOfferte) + " delle offerte che oggi diventano contratti (K3)",
      azioni: di("contratti") },
    { id: "rischio", titolo: "Trattative a rischio",
      valore: quanti(ferme.length, "trattativa ferma", "trattative ferme"),
      dettaglio: formattaEuro(ferme.reduce((s, o) => s + ricaviAttesi(o), 0)) + " all'anno di ricavi attesi in gioco",
      base: "ferme oltre i giorni previsti per la loro fase (K9), su " + quanti(aperte.length, "trattativa aperta", "trattative aperte"),
      azioni: di("rischio") },
    { id: "capacita", titolo: "Capacità delle squadre",
      valore: scoperte.length ? "mancano " + scoperte.reduce((s, z) => s + z.mancano, 0) + " ore/mese" : "capacità sufficiente",
      dettaglio: scoperte.length ? "in " + quanti(scoperte.length, "zona", "zone") + ": " + scoperte.map((z) => z.zona).join(", ") : "",
      base: "ore delle offerte aperte, se firmate, contro le ore libere delle squadre nella stessa zona",
      azioni: di("capacita") },
    { id: "contatti", titolo: "Nuovi contatti il prossimo mese",
      valore: recenti ? "circa " + Math.round(alMese) + " contatti" : NESSUN_DATO,
      dettaglio: recenti ? "da cui circa " + Math.round(alMese * k.winRate) + " contratti" : "",
      base: "media degli ultimi 3 mesi (" + recenti + " contatti) × " + formattaPercentuale(k.winRate) + " di trattative chiuse con un contratto (K7)",
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
