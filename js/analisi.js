/*
 * LE QUATTRO DOMANDE DELL'ANALISI
 * Ogni sezione del CRM dice a quale domanda risponde:
 *  descrittiva  – Cosa è successo?
 *  diagnostica  – Perché è successo?
 *  predittiva   – Cosa succederà?
 *  prescrittiva – Cosa conviene fare?
 * I consigli sono regole leggibili (soglie in config.js), ognuna con il suo "perché".
 */

const DOMANDE = {
  descrittiva: { testo: "Cosa è successo?", numero: 1 },
  diagnostica: { testo: "Perché è successo?", numero: 2 },
  predittiva: { testo: "Cosa succederà?", numero: 3 },
  prescrittiva: { testo: "Cosa conviene fare?", numero: 4 },
};

// Etichetta della domanda a cui risponde una sezione
function domanda(tipo) {
  const d = DOMANDE[tipo];
  return `<span class="domanda domanda-${tipo}" title="Analisi ${tipo}">${d.numero} · ${d.testo}</span>`;
}

// Legenda delle quattro domande, con i collegamenti alle sezioni (id passati da chi la usa)
function legendaDomande(ancore) {
  return `<nav class="legenda-domande" aria-label="Le quattro domande dell'analisi">
    ${Object.keys(DOMANDE).map((t) => ancore[t]
      ? `<a href="#${ancore[t]}" data-azione="scorri" data-id="${ancore[t]}">${domanda(t)}</a>` : domanda(t)).join("")}
  </nav>`;
}

// PREDITTIVA: ore che serviranno nelle zone se si firmano le offerte aperte, contro le ore libere delle squadre
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

// PRESCRITTIVA: consigli ordinati per priorità, ognuno con il dato da cui nasce
function consigli(opportunita = stato.opportunita) {
  const c = CONFIG.consigli;
  const elenco = [];
  const aperte = opportunita.filter(trattativaAperta);

  // 1. Offerte scadute o in scadenza: sollecitarle
  aperte.filter((o) => o.scadenzaOfferta && giorniTra(oggi(), o.scadenzaOfferta) <= c.giorniAvvisoScadenzaOfferta).forEach((o) => {
    const scaduta = o.scadenzaOfferta < oggi();
    elenco.push({ priorita: 100 + valoreAnnuo(o) / 1000, aziendaId: o.aziendaId,
      testo: "Sollecita " + nomeCliente(o),
      perche: (scaduta ? "offerta scaduta il " : "offerta in scadenza il ") + formattaData(o.scadenzaOfferta) + " · " + formattaEuro(valoreAnnuo(o)) + "/anno" });
  });

  // 2. Trattative A o B ferme da troppo tempo: riprenderle
  aperte.forEach((o) => {
    const st = statoTrattativa(o);
    const classe = calcolaPunteggio(o, opportunita).classe;
    if (st.ferma && classe !== "C") {
      elenco.push({ priorita: 80 + st.giorniInFase, aziendaId: o.aziendaId,
        testo: "Riprendi la trattativa con " + nomeCliente(o),
        perche: "classe " + classe + ", ferma da " + giorni(st.giorniInFase) + " in «" + CONFIG.fasi[faseRaggiunta(o)].nome + "»" });
    } else if (!st.prossima && classe === "A") {
      elenco.push({ priorita: 70, aziendaId: o.aziendaId,
        testo: "Fissa la prossima azione con " + nomeCliente(o),
        perche: "trattativa di classe A senza nulla in agenda" });
    }
  });

  // 3. Capacità: zone dove le offerte aperte supererebbero le ore libere delle squadre
  previsioneCapacita(opportunita).filter((z) => z.mancano > 0).forEach((z) => {
    elenco.push({ priorita: 60 + z.mancano / 10, link: "#allocazione",
      testo: "Prepara un partner in " + z.zona,
      perche: "se firmano le " + z.offerte + " offerte aperte servono " + z.ore + " ore/mese, le squadre ne hanno " + z.libere + " libere" });
  });

  // 4. Motivo di perdita prevalente
  const motivo = motiviPerdita(opportunita)[0];
  if (motivo && motivo.numero >= c.minimoPerditeStessoMotivo) {
    elenco.push({ priorita: 40, link: "#indicatori",
      testo: (CONFIG.rimediPerdita || {})[motivo.motivo] || "Analizza le perdite per «" + motivo.motivo + "»",
      perche: motivo.numero + " trattative perse per «" + motivo.motivo + "» (" + formattaEuro(motivo.valore) + "/anno)" });
  }

  // 5. Canale di acquisizione: spostare il budget dal più caro al più conveniente
  const canali = risultatiPerCanale(opportunita).filter((r) => r.costoAcquisizione !== null && !r.fuoriElenco);
  if (canali.length >= 2) {
    canali.sort((a, b) => a.costoAcquisizione - b.costoAcquisizione);
    const migliore = canali[0], peggiore = canali[canali.length - 1];
    if (peggiore.costoAcquisizione > migliore.costoAcquisizione * c.rapportoCanaleCaro) {
      elenco.push({ priorita: 30, link: "#indicatori",
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

// Riquadro "Cosa conviene fare?" con i primi consigli
function sezioneConsigli(quanti = 3) {
  const tutti = consigli();
  const mostrati = tutti.slice(0, quanti);
  return `
    <section class="riquadro consigli" aria-label="Cosa conviene fare">
      <h2 class="titolo-riquadro">${domanda("prescrittiva")}</h2>
      ${mostrati.length ? `<ol class="elenco-consigli">
        ${mostrati.map((x) => `<li>
          <a class="link-titolo" href="${x.aziendaId ? "#cliente-" + esc(x.aziendaId) : x.link}" title="${esc(x.testo)}">${esc(x.testo)}</a>
          <span class="consiglio-perche" title="${esc(x.perche)}">Perché: ${esc(x.perche)}</span>
        </li>`).join("")}
      </ol>` : '<p class="nota-piccola">Nessuna azione urgente: le trattative sono seguite e la capacità basta.</p>'}
      ${tutti.length > quanti ? `<p class="nota-piccola">Altri ${tutti.length - quanti} consigli in Indicatori → «Previsione e portafoglio».</p>` : ""}
    </section>`;
}
