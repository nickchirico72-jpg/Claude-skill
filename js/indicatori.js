/*
 * INDICATORI LUNGO IL PERCORSO DEL CLIENTE (riorganizzati il 21/10)
 * Marketing (da dove arrivano i clienti) → Fino all'offerta → Dall'offerta al contratto → Cosa fare domani (previsioni e azioni).
 * Ogni KPI viene dal catalogo (tabella kpi_catalogo, 14 KPI: K14, K16 e K17 tolti il 21/10): codice, spiegazione in parole,
 * formula, livello della piramide di Anthony, APQC e soglia. Le liste di lavoro (ferme, ricontatti, prossimi passi)
 * stanno solo nella Pipeline, per non ripeterle.
 * La fonte si sceglie in alto: dati fittizi (database di prova) oppure dati reali (fotografia di partenza, test),
 * anche importati qui da un CSV a 7 colonne; non si mescolano mai. Senza dati si scrive «nessun dato», mai zero.
 */

const LIVELLI = {
  marketing: { nome: "Marketing", chi: "Da dove arrivano i clienti", kpi: ["K15", "K4"],
    istruzione: "Quali canali e quali settori portano clienti coerenti, e quanto costano." },
  offerta: { nome: "Fino all'offerta", chi: "Dalla richiesta all'offerta", kpi: ["K12", "K1", "K2", "K13", "K9"],
    istruzione: "Quanto in fretta si risponde e quante richieste arrivano fino all'offerta." },
  contratto: { nome: "Dall'offerta al contratto", chi: "Chiusura", kpi: ["K3", "K7", "K8", "K10"],
    istruzione: "Quante offerte diventano contratti, in quanto tempo e perché si perdono le altre." },
  previsione: { nome: "Cosa fare domani", chi: "Previsioni e azioni", kpi: ["K6", "K5", "K11"],
    istruzione: "Con i dati di oggi: cosa succederà se si continua così e cosa conviene fare." },
};

const NESSUN_DATO = "nessun dato";
const COLONNE_CSV = ["data_richiesta", "data_annotazione", "canale", "settore", "data_risposta", "data_offerta", "esito"];
const ESITI_REALI = ["aperta", "contratto", "persa", "non interessante"];
let csvDaImportare = null; // anteprima dell'import del CSV in corso: { fonte, righe }

// Nome leggibile di una fonte di dati
function nomeFonte(fonte) {
  return fonte === "fittizi" ? "Dati fittizi · database di prova"
    : "Dati reali · " + (fonte === "partenza" ? "fotografia di partenza" : fonte === "test" ? "test di tre settimane" : fonte);
}

// Riga del catalogo dei KPI per codice (K1 ... K15)
function kpiCatalogo(codice) {
  return righeDb("kpi_catalogo").find((k) => k.codice === codice);
}

// Quota in percentuale, oppure «nessun dato» quando il denominatore è zero
function quota(n, d) {
  return d > 0 ? formattaPercentuale(n / d) : NESSUN_DATO;
}

// Giorni con un decimale, es. "2,1 giorni" («nessun dato» se non ci sono dati)
function formattaGiorni(n) {
  return n === null ? NESSUN_DATO : n.toLocaleString("it-IT", { maximumFractionDigits: 1 }) + (n === 1 ? " giorno" : " giorni");
}

// Tessera di un KPI del catalogo: valore, spiegazione in parole, formula con i numeri, tipo, APQC e soglia
function tesseraKpi({ codice, valore, dettaglio, calcolo, raggiunto = null }) {
  const k = kpiCatalogo(codice);
  const vuoto = valore === NESSUN_DATO;
  return `
    <article class="riquadro kpi" id="kpi-${codice}">
      <p class="kpi-etichetta"><span class="kpi-codice">${codice}</span> ${esc(k.nome)}</p>
      <p class="kpi-valore ${vuoto ? "vuoto-kpi" : ""}">${valore}</p>
      <p class="kpi-dettaglio">${dettaglio}</p>
      <p class="kpi-spiegazione">${esc(k.spiegazione)}</p>
      <details class="kpi-come">
        <summary>Come si calcola</summary>
        <p class="kpi-formula">${esc(k.formula)}${calcolo && !vuoto ? "<br><strong>" + calcolo + "</strong>" : ""}</p>
        <p class="kpi-meta">Livello ${esc(k.livello_anthony)} · ${esc(k.tipo)} · APQC ${esc(k.processo_apqc)}</p>
      </details>
      ${raggiunto === null || vuoto ? `<p class="kpi-obiettivo">Soglia: ${esc(k.soglia)}</p>`
        : `<p class="kpi-obiettivo ${raggiunto ? "ok" : "sotto"}">${icona(raggiunto ? "spunta" : "attenzione")} ${esc(k.soglia)}: ${raggiunto ? "raggiunta" : "non raggiunta"}</p>`}
    </article>`;
}

// KPI che la fonte scelta non permette di calcolare, con i dati che servirebbero
function nonCalcolabili(codici) {
  if (!codici.length) return "";
  return `
    <section class="sezione">
      <h2>Non calcolabili con questa fonte <span class="sottotitolo">servono altri dati</span></h2>
      <ul class="elenco-non-calcolabili">
        ${codici.map((c) => { const k = kpiCatalogo(c); return `<li><strong>${c} ${esc(k.nome)}</strong> · servono: ${esc(k.dati_necessari)}</li>`; }).join("")}
      </ul>
    </section>`;
}

// Tessere dei KPI sui dati fittizi (stato dell'app), per codice
function tessereFittizi(k, tutte) {
  const ob = CONFIG.obiettivi;
  const p = previsionePonderata(tutte);
  const portafoglio = coerenzaPortafoglio(tutte);
  return {
    K1: () => tesseraKpi({ codice: "K1", valore: quota(k.qualificati, k.contatti), dettaglio: k.qualificati + " su " + k.contatti + " contatti",
      calcolo: `${k.qualificati} ÷ ${k.contatti}`, raggiunto: k.contatti ? k.tassoQualificati >= ob.tassoQualificati : null }),
    K2: () => tesseraKpi({ codice: "K2", valore: quota(k.sopralluoghi, k.qualificati), dettaglio: k.sopralluoghi + " sopralluoghi su " + k.qualificati + " qualificati",
      calcolo: `${k.sopralluoghi} ÷ ${k.qualificati}`, raggiunto: k.qualificati ? k.tassoSopralluoghi >= ob.tassoSopralluoghi : null }),
    K3: () => tesseraKpi({ codice: "K3", valore: quota(k.contratti, k.offerteDecise), dettaglio: k.contratti + " contratti su " + k.offerteDecise + " offerte decise",
      calcolo: `${k.contratti} ÷ ${k.offerteDecise}`, raggiunto: k.offerteDecise ? k.conversioneOfferte >= ob.conversioneOfferte : null }),
    K4: () => tesseraKpi({ codice: "K4", valore: k.contratti ? formattaEuro(k.costoAcquisizione) : NESSUN_DATO, dettaglio: "per contratto, tutti i canali (per canale qui sotto)",
      calcolo: `${formattaEuro(k.costiCommerciali)} ÷ ${k.contratti} contratti`, raggiunto: k.contratti ? k.costoAcquisizione <= ob.costoAcquisizioneMax : null }),
    K5: () => tesseraKpi({ codice: "K5", valore: k.aperte ? formattaEuro(k.margineAtteso) : NESSUN_DATO,
      dettaglio: "all'anno dalle " + k.aperte + " trattative aperte · marginalità " + quota(k.margineAtteso, k.ricaviAttesi),
      calcolo: "Probabilità: " + CONFIG.fasi.slice(0, 4).map((f) => f.nome + " " + formattaPercentuale(f.probabilita)).join(" · ") }),
    K6: () => tesseraKpi({ codice: "K6", valore: p.aperte ? formattaEuro(p.ponderata) : NESSUN_DATO,
      dettaglio: "all'anno su " + formattaEuro(p.pieno) + " di valore pieno delle " + p.aperte + " aperte" }),
    K7: () => tesseraKpi({ codice: "K7", valore: quota(k.contratti, k.contratti + k.persi), dettaglio: k.contratti + " contratti su " + (k.contratti + k.persi) + " trattative chiuse",
      calcolo: `${k.contratti} ÷ (${k.contratti} + ${k.persi})` }),
    K8: () => tesseraKpi({ codice: "K8", valore: formattaGiorni(k.durataCiclo), dettaglio: "dal primo contatto alla firma, media su " + k.contratti + " contratti" }),
    K9: () => tesseraKpi({ codice: "K9", valore: k.aperte ? String(k.ferme) : NESSUN_DATO, dettaglio: "trattative ferme su " + k.aperte + " aperte (" + quota(k.ferme, k.aperte) + ")",
      calcolo: "Soglie: " + CONFIG.fasi.slice(0, 4).map((f) => f.nome + " " + f.giorniFerma + " giorni").join(" · ") }),
    K11: () => tesseraKpi({ codice: "K11", valore: tutte.length ? quota(portafoglio.buone.n, portafoglio.totale.n) + " buone" : NESSUN_DATO,
      dettaglio: portafoglio.buone.n + " su " + portafoglio.totale.n + " opportunità con punteggio da " + CONFIG.punteggio.buona + " in su · "
        + quota(portafoglio.buone.valore, portafoglio.totale.valore) + " del valore annuo",
      calcolo: `${portafoglio.buone.n} ÷ ${portafoglio.totale.n}` }),
    K12: () => tesseraKpi({ codice: "K12", valore: formattaGiorni(k.primaRisposta), dettaglio: k.entroUnGiorno + " risposte entro un giorno su " + k.conRisposta,
      raggiunto: k.primaRisposta === null ? null : k.primaRisposta <= ob.primaRispostaGiorni }),
    K13: () => tesseraKpi({ codice: "K13", valore: formattaGiorni(k.tempoOfferta), dettaglio: "media su " + k.conOfferta + " opportunità arrivate all'offerta" }),
    K15: () => tesseraKpi({ codice: "K15", valore: quota(k.digitali, k.contatti), dettaglio: k.digitali + " richieste da canali digitali su " + k.contatti }),
  };
}

// Tessere dei KPI sui dati reali di una fonte; i KPI non calcolabili restano fuori
function tessereReali(r) {
  const ob = CONFIG.obiettivi;
  return {
    K3: () => tesseraKpi({ codice: "K3", valore: quota(Math.round(r.conversioneOfferte * r.offerteDecise), r.offerteDecise), dettaglio: "su " + r.offerteDecise + " richieste con l'offerta decisa",
      raggiunto: r.offerteDecise ? r.conversioneOfferte >= ob.conversioneOfferte : null }),
    K7: () => tesseraKpi({ codice: "K7", valore: quota(r.contratti, r.contratti + r.perse), dettaglio: r.contratti + " contratti su " + (r.contratti + r.perse) + " richieste chiuse" }),
    K12: () => tesseraKpi({ codice: "K12", valore: formattaGiorni(r.primaRisposta), dettaglio: r.entroUnGiorno + " risposte entro un giorno su " + r.conRisposta,
      raggiunto: r.primaRisposta === null ? null : r.primaRisposta <= ob.primaRispostaGiorni }),
    K13: () => tesseraKpi({ codice: "K13", valore: formattaGiorni(r.tempoOfferta), dettaglio: "media su " + r.conOfferta + " richieste con offerta" }),
    K15: () => tesseraKpi({ codice: "K15", valore: quota(r.digitali, r.totale), dettaglio: r.digitali + " richieste da canali digitali su " + r.totale }),
  };
}

// Barra in cima: i livelli, la fonte dei dati con l'etichetta ben visibile, import ed export del CSV
function barraIndicatori(scelta, reali) {
  const fonti = ["fittizi"].concat(reali);
  const r = scelta.fonte !== "fittizi" ? kpiReali(scelta.fonte) : null;
  return `
    <nav class="livelli" aria-label="Livello decisionale">
      ${Object.entries(LIVELLI).map(([id, l]) => `
        <button class="livello-pulsante" type="button" data-azione="livello" data-id="${id}" aria-pressed="${scelta.livello === id}">
          <strong>${l.nome}</strong><span>${l.chi}</span></button>`).join("")}
    </nav>
    <div class="barra-fonte">
      ${r && r.esempio ? '<p class="chip chip-critico" role="status">Righe di esempio inventate, non dati di Gate</p>' : ""}
      <div class="azioni-fonte">
        ${fonti.length > 1 ? `<label class="scegli-fonte">Fonte dei dati
          <select id="scelta-fonte">${fonti.map((f) => `<option value="${esc(f)}" ${f === scelta.fonte ? "selected" : ""}>${esc(nomeFonte(f))}</option>`).join("")}</select>
        </label>` : ""}
        <a class="pulsante-testo positivo" href="#riepilogo">Riepilogo del mese</a>
        <button class="pulsante-testo positivo" type="button" data-azione="esporta-csv-richieste">Esporta CSV</button>
        <button class="pulsante-testo positivo" type="button" data-azione="importa-csv-reali">Importa CSV dati reali</button>
      </div>
    </div>`;
}

function disegnaIndicatori() {
  const reali = fontiReali();
  const scelta = interfaccia.indicatori;
  if (!LIVELLI[scelta.livello]) scelta.livello = "offerta";
  if (scelta.fonte !== "fittizi" && !reali.includes(scelta.fonte)) scelta.fonte = "fittizi";
  const livello = LIVELLI[scelta.livello];
  const corpo = scelta.fonte === "fittizi" ? vistaFittizi(scelta.livello) : vistaReali(scelta.livello, kpiReali(scelta.fonte));
  return `
    <div class="pagina-indicatori">
    ${intestazione({ titolo: "Indicatori · " + (livello.titolo || livello.nome), istruzione: livello.istruzione })}
    ${barraIndicatori(scelta, reali)}
    ${corpo}
    </div>`;
}

// Risultati per gruppo di canale: contatti, contratti, chiusura, punteggio medio, margine medio e costo per contratto (K4)
function risultatiPerGruppo(opportunita) {
  const perCanale = risultatiPerCanale(opportunita);
  return gruppiCanali().map((g) => {
    const canali = perCanale.filter((r) => gruppoCanale(r.fonte) === g);
    const gruppo = opportunita.filter((o) => gruppoCanale(o.canale) === g);
    const costi = canali.some((r) => r.costi !== null) ? canali.reduce((s, r) => s + (r.costi || 0), 0) : null;
    const contratti = canali.reduce((s, r) => s + r.contratti, 0);
    const chiuse = gruppo.filter((o) => o.perso || o.storico.contratto).length;
    return { gruppo: g, canali: canali.filter((r) => r.contatti).map((r) => r.fonte), contatti: gruppo.length, contratti,
      chiusura: chiuse ? contratti / chiuse : null,
      punteggioMedio: punteggioMedio(gruppo, opportunita),
      margineMedio: gruppo.length ? media(gruppo.map((o) => marginePercentuale(o, opportunita))) : null,
      costi, costoAcquisizione: costi !== null && contratti ? costi / contratti : null };
  });
}

// K10 come tessera con la tabella dei motivi (è una distribuzione, non un numero solo)
function tesseraK10(perdite) {
  const k = kpiCatalogo("K10");
  const totale = perdite.reduce((s, m) => s + m.numero, 0);
  return `
    <article class="riquadro kpi" id="kpi-K10">
      <p class="kpi-etichetta"><span class="kpi-codice">K10</span> ${esc(k.nome)}</p>
      <p class="kpi-spiegazione">${esc(k.spiegazione)}</p>
      ${totale ? `<table class="tabella"><tbody>${perdite.map((m) => `<tr><td>${esc(maiuscola(m.motivo))}</td>
        <td class="num">${m.numero}</td><td class="num"><strong>${quota(m.numero, totale)}</strong></td></tr>`).join("")}</tbody></table>`
        : `<p class="vuoto">${NESSUN_DATO}: nessuna trattativa persa.</p>`}
      <details class="kpi-come"><summary>Come si calcola</summary>
        <p class="kpi-formula">${esc(k.formula)}</p>
        <p class="kpi-meta">Livello ${esc(k.livello_anthony)} · ${esc(k.tipo)} · APQC ${esc(k.processo_apqc)}</p></details>
    </article>`;
}

// Vista sui dati fittizi della sezione scelta
function vistaFittizi(livello) {
  const tutte = stato.opportunita;
  const k = calcolaKpi(tutte);
  const t = tessereFittizi(k, tutte);
  const tessere = (codici) => `<div class="griglia ${codici.length > 2 ? "tre" : ""}">${codici.map((c) => t[c]()).join("")}</div>`;

  if (livello === "marketing") {
    const contenuti = risultatiPerContenuto(tutte);
    const settori = risultatiPerSettore(tutte).filter((x) => x.contatti);
    return `
      <section class="sezione">
        <h2>Canali</h2>
        ${tessere(["K15", "K4"])}
      </section>
      <section class="sezione">
        <h2>Risultati per canale <span class="sottotitolo">i 7 gruppi di canale</span></h2>
        <div class="tabella-scorrevole"><table class="tabella">
          <thead><tr><th>Canale</th><th class="num">Contatti</th><th class="num">Contratti</th><th class="num">Chiusura</th><th class="num">Punteggio medio</th><th class="num">Margine medio</th><th class="num">Costo per contratto (K4)</th></tr></thead>
          <tbody>${risultatiPerGruppo(tutte).filter((r) => r.contatti).map((r) => `<tr>
            <td><strong>${esc(maiuscola(r.gruppo))}</strong><br><span class="nota-piccola">${esc(r.canali.join(", "))}</span></td>
            <td class="num">${r.contatti}</td><td class="num">${r.contratti}</td>
            <td class="num">${r.chiusura === null ? NESSUN_DATO : formattaPercentuale(r.chiusura)}</td>
            <td class="num">${r.punteggioMedio === null ? NESSUN_DATO : badgePunteggio({ totale: r.punteggioMedio })}</td>
            <td class="num">${r.margineMedio === null ? NESSUN_DATO : formattaPercentuale(r.margineMedio)}</td>
            <td class="num">${r.costoAcquisizione === null ? NESSUN_DATO : formattaEuro(r.costoAcquisizione)}</td></tr>`).join("")}</tbody>
        </table></div>
        <p class="nota-piccola" style="margin-top:8px">Chiusura = contratti ÷ trattative chiuse. Punteggio medio = coerenza con capacità e margini, da 0 a 100. «Nessun dato» = canale senza costi registrati o senza contratti.</p>
      </section>
      <section class="sezione">
        <details class="approfondimento"><summary>Per settore</summary>
          <div class="tabella-scorrevole"><table class="tabella">
            <thead><tr><th>Settore</th><th class="num">Contatti</th><th class="num">Contratti</th><th class="num">Conversione</th><th class="num">Punteggio medio</th><th class="num">Margine atteso</th></tr></thead>
            <tbody>${settori.map((x) => `<tr>
              <td>${esc(maiuscola(x.settore))}${x.pilota ? '<span class="chip-pilota">pilota</span>' : ""}</td>
              <td class="num">${x.contatti}</td><td class="num">${x.contratti}</td><td class="num">${quota(x.contratti, x.contatti)}</td>
              <td class="num">${x.punteggioMedio === null ? NESSUN_DATO : badgePunteggio({ totale: x.punteggioMedio })}</td><td class="num">${formattaEuro(x.margineAtteso)}</td></tr>`).join("")}</tbody>
          </table></div>
        </details>
        <details class="approfondimento"><summary>Per contenuto (link tracciati)</summary>
          <div class="tabella-scorrevole"><table class="tabella">
            <thead><tr><th>Contenuto</th><th class="num">Richieste</th><th class="num">Qualificate</th><th class="num">Punteggio medio</th><th class="num">Contratti</th></tr></thead>
            <tbody>${contenuti.map((c) => `<tr>
              <td>${c.contenuto ? `<strong>${esc(c.nome)}</strong> · ${esc(c.contenuto.canale)}<br><span class="nota-piccola">${esc(c.contenuto.tema)}</span>` : esc(c.nome)}</td>
              <td class="num">${c.richieste}</td><td class="num">${c.qualificate} (${quota(c.qualificate, c.richieste)})</td>
              <td class="num">${c.punteggioMedio === null ? NESSUN_DATO : badgePunteggio({ totale: c.punteggioMedio })}</td><td class="num">${c.contratti}</td></tr>`).join("")}</tbody>
          </table></div>
          <p class="nota-piccola">Contenuti di prova senza effetti inseriti: le differenze sono casuali.</p>
        </details>
      </section>`;
  }

  if (livello === "offerta") {
    const funnel = calcolaFunnel(tutte);
    const massimo = funnel[0].n || 1;
    return `
      <section class="sezione">
        <h2>Velocità e passaggi</h2>
        ${tessere(["K12", "K1", "K2", "K13", "K9"])}
        <p class="nota-piccola">Le trattative da riprendere (ferme, da ricontattare, senza prossima azione) sono in <a class="link" href="#pipeline">Pipeline → Da seguire</a>.</p>
      </section>
      <section class="sezione">
        <h2>Funnel <span class="sottotitolo">opportunità che hanno raggiunto ogni fase, perse comprese</span></h2>
        <div class="riquadro"><div class="funnel">
          ${funnel.map((f) => {
            const conv = f.conversione === null ? "" : formattaPercentuale(f.conversione) + " della fase prima";
            return `<div class="funnel-riga" tabindex="0" title="${f.nome}: ${f.n}${conv ? " · " + conv : ""}">
              <span class="funnel-fase">${f.nome}</span><span class="funnel-barra"><span style="width:${(f.n / massimo) * 100}%"></span></span>
              <span class="funnel-numero">${f.n}</span><span class="funnel-conv">${conv}</span></div>`;
          }).join("")}
        </div></div>
      </section>`;
  }

  if (livello === "contratto") {
    return `
      <section class="sezione">
        <h2>Offerte e contratti</h2>
        ${tessere(["K3", "K7", "K8"])}
      </section>
      <section class="sezione">
        <h2>Motivi di perdita</h2>
        <div class="griglia">${tesseraK10(motiviPerdita(tutte))}</div>
      </section>`;
  }

  // Cosa fare domani: quattro previsioni con le azioni, poi gli indicatori del portafoglio
  return `
    <section class="sezione">
      <div class="griglia previsioni">${previsioniDomani(tutte).map((p) => schedaPrevisione(p)).join("")}</div>
      <p class="nota-piccola">Previsioni semplici: proiettano in avanti i tassi di oggi. Con più mesi di dati reali diventano più affidabili.</p>
    </section>
    <section class="sezione">${riquadroTempoRisparmiato()}</section>
    <section class="sezione">
      <h2>Ricavi attesi e portafoglio</h2>
      ${tessere(["K6", "K5", "K11"])}
    </section>`;
}

// Vista sui dati reali: solo i KPI che la fonte permette di calcolare, mai mescolati con i fittizi, e l'elenco delle richieste
function vistaReali(livello, r) {
  const t = tessereReali(r);
  const codici = LIVELLI[livello].kpi;
  const si = codici.filter((c) => t[c]);
  const no = codici.filter((c) => !t[c]);
  const conteggio = (valore) => {
    const m = new Map();
    r.righe.forEach((x) => m.set(valore(x), (m.get(valore(x)) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const tabella = (titolo, valore) => `
    <div class="riquadro"><h3>${titolo}</h3><table class="tabella"><tbody>
      ${conteggio(valore).map(([v, n]) => `<tr><td>${esc(maiuscola(v))}</td><td class="num">${n}</td></tr>`).join("")}
    </tbody></table></div>`;
  return `
    <section class="sezione">
      <h2>${quanti(r.totale, "richiesta registrata", "richieste registrate")}</h2>
      ${si.length ? `<div class="griglia tre">${si.map((c) => t[c]()).join("")}</div>` : `<p class="vuoto">${NESSUN_DATO}: nessun KPI di questa sezione si calcola con le 7 colonne del CSV.</p>`}
    </section>
    ${nonCalcolabili(no)}
    <section class="sezione">
      <h2>Per canale, esito e settore</h2>
      <div class="griglia tre">${tabella("Per canale", (x) => gruppoCanale(x.canale))}${tabella("Per esito", (x) => x.esito)}${tabella("Per settore", (x) => x.settore)}</div>
    </section>
    <section class="sezione">
      <details class="approfondimento"><summary>Elenco delle richieste <span class="conteggio">${r.totale}</span></summary>
      <div class="tabella-scorrevole"><table class="tabella impilata" id="elenco-reali">
        <thead><tr><th>Richiesta</th><th>Annotazione</th><th>Canale</th><th>Settore</th><th>Prima risposta</th><th>Offerta</th><th>Esito</th></tr></thead>
        <tbody>${r.righe.map((x) => `<tr>
          <td data-etichetta="Richiesta">${formattaData(x.data_richiesta)}</td><td data-etichetta="Annotazione">${formattaData(x.data_registrazione) || "–"}</td>
          <td data-etichetta="Canale">${esc(x.canale)}</td><td data-etichetta="Settore">${esc(x.settore)}</td>
          <td data-etichetta="Prima risposta">${formattaData(x.data_risposta) || "–"}</td><td data-etichetta="Offerta">${formattaData(x.data_offerta) || "–"}</td>
          <td data-etichetta="Esito">${esc(x.esito)}</td></tr>`).join("")}</tbody>
      </table></div>
      </details>
    </section>`;
}

// ------------------------------------------------------------ CSV a 7 colonne

// Righe da esportare: le opportunità (dati fittizi) o le richieste reali della fonte scelta, con le 7 colonne
function righeDaEsportare(fonte) {
  if (fonte !== "fittizi") {
    return righeReali(fonte).map((r) => [r.data_richiesta, r.data_registrazione, r.canale, r.settore, r.data_risposta, r.data_offerta, r.esito]);
  }
  return stato.opportunita.map((o) => [o.storico.contatto, o.dataRegistrazione, o.canale, settoreDi(o), o.dataPrimaRisposta, o.storico.offerta,
    o.perso ? "persa" : o.storico.contratto ? "contratto" : "aperta"]);
}

// Scarica il CSV a 7 colonne della fonte scelta (separatore ";" per Excel in italiano)
function esportaCsvRichieste() {
  const fonte = interfaccia.indicatori.fonte;
  const righe = [COLONNE_CSV].concat(righeDaEsportare(fonte)).map((r) => r.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(";"));
  scaricaFile("gate-richieste-" + (fonte === "fittizi" ? "fittizie" : fonte) + "-" + oggi() + ".csv", "﻿" + righe.join("\r\n"), "text/csv;charset=utf-8");
}

// Data del CSV in AAAA-MM-GG (accetta anche GG/MM/AAAA); "" se vuota, null se non valida
function dataCsv(testo) {
  const v = String(testo || "").trim();
  if (!v) return "";
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = m ? m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0") : v;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [a, me, g] = iso.split("-").map(Number);
  const d = new Date(a, me - 1, g);
  return d.getMonth() === me - 1 && d.getDate() === g ? iso : null;
}

// Controlla le righe del CSV: le stesse regole di generatore/importa_richieste.py. Restituisce { buone, scartate }
function analizzaCsvReali(testo, fontePredefinita) {
  const righe = String(testo || "").replace(/^﻿/, "").split(/\r?\n/).filter((r) => r.trim() && !r.trim().startsWith("#"));
  if (righe.length < 2) return { errore: "Il file non ha righe di dati." };
  const sep = righe[0].split(";").length >= righe[0].split(",").length ? ";" : ",";
  const sinonimi = { "data annotazione": "data_annotazione", data_registrazione: "data_annotazione", "data richiesta": "data_richiesta",
    "data risposta": "data_risposta", "data offerta": "data_offerta", data_prima_risposta: "data_risposta" };
  const testa = dividiRigaCsv(righe[0], sep).map((h) => { const x = h.toLowerCase().replace(/^"|"$/g, "").trim(); return sinonimi[x] || x; });
  const mancanti = COLONNE_CSV.filter((c) => !testa.includes(c));
  if (mancanti.length) return { errore: "Colonne mancanti: " + mancanti.join(", ") + ". Servono: " + COLONNE_CSV.join(", ") + "." };
  const buone = [], scartate = [];
  righe.slice(1).forEach((riga, i) => {
    const celle = dividiRigaCsv(riga, sep);
    const v = (c) => (celle[testa.indexOf(c)] || "").replace(/^"|"$/g, "").trim();
    const r = { fonte: (v("fonte") || fontePredefinita).toLowerCase(), note: v("note") || null };
    for (const c of ["data_richiesta", "data_annotazione", "data_risposta", "data_offerta"]) {
      const d = dataCsv(v(c));
      if (d === null) return scartate.push({ n: i + 1, motivo: "data non valida in " + c + ": «" + v(c) + "»" });
      r[c === "data_annotazione" ? "data_registrazione" : c] = d || null;
    }
    if (!r.data_richiesta) return scartate.push({ n: i + 1, motivo: "manca la data della richiesta" });
    const date = ["data_registrazione", "data_risposta", "data_offerta"].filter((c) => r[c]);
    if (r.data_richiesta > oggi() || date.some((c) => r[c] > oggi())) return scartate.push({ n: i + 1, motivo: "data nel futuro" });
    if (date.some((c) => r[c] < r.data_richiesta)) return scartate.push({ n: i + 1, motivo: "una data è prima della richiesta" });
    r.canale = canaleDaTesto(v("canale"));
    if (!r.canale) return scartate.push({ n: i + 1, motivo: "canale non ammesso: «" + v("canale") + "» (un canale o un gruppo: " + gruppiCanali().join(", ") + ")" });
    r.settore = CONFIG.settori.find((s) => s.toLowerCase() === v("settore").toLowerCase());
    if (!r.settore) return scartate.push({ n: i + 1, motivo: "settore non ammesso: «" + v("settore") + "»" });
    r.esito = v("esito").toLowerCase();
    if (!ESITI_REALI.includes(r.esito)) return scartate.push({ n: i + 1, motivo: "esito non ammesso: «" + v("esito") + "» (" + ESITI_REALI.join(", ") + ")" });
    if (!["partenza", "test"].includes(r.fonte)) return scartate.push({ n: i + 1, motivo: "fonte non ammessa: «" + r.fonte + "» (partenza o test)" });
    const voto = Number(v("voto_facilita"));
    r.voto_facilita = voto >= 1 && voto <= 5 ? Math.round(voto) : null;
    buone.push(r);
  });
  return { buone, scartate };
}

// Finestra dell'import: fonte, file, anteprima con righe buone e scartate
function apriImportaCsvReali() {
  csvDaImportare = null;
  apriFinestra(`
    <form class="modulo" id="modulo-csv-reali" novalidate>
      <div>
        <h2>Importa il CSV dei dati reali</h2>
        <p class="nota-piccola">7 colonne: ${COLONNE_CSV.join(", ")}. Date AAAA-MM-GG o GG/MM/AAAA; il canale può essere un canale o un gruppo
          (${esc(gruppiCanali().join(", "))}). Le righe restano in un elenco a parte: non entrano nella Pipeline e non si mescolano con i dati fittizi.</p>
      </div>
      <div class="riga-doppia">
        <label>Fonte delle righe <select name="fonte">${opzioni(["partenza", "test"], "partenza")}</select></label>
        <label>File CSV * <input name="file" type="file" accept=".csv,text/csv" required></label>
      </div>
      <div id="anteprima-csv-reali"></div>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Chiudi</button>
        <button class="pulsante secondario" type="submit">Controlla il file</button>
        <button class="pulsante primario" type="button" data-azione="conferma-csv-reali" id="pulsante-csv-reali" hidden>Importa</button>
      </div>
    </form>`);
}

// Mostra l'esito del controllo del file prima di importare
function mostraAnteprimaCsvReali(esito, fonte) {
  const box = document.getElementById("anteprima-csv-reali");
  const pulsante = document.getElementById("pulsante-csv-reali");
  if (esito.errore) {
    box.innerHTML = `<p class="vuoto">${esc(esito.errore)}</p>`;
    pulsante.hidden = true;
    return;
  }
  csvDaImportare = { fonte, righe: esito.buone };
  box.innerHTML = `<p><strong>${esito.buone.length} righe valide</strong>${esito.scartate.length ? ", " + esito.scartate.length + " scartate:" : "."}</p>
    ${esito.scartate.length ? `<ul class="elenco-semplice">${esito.scartate.map((x) => `<li>riga ${x.n}: ${esc(x.motivo)}</li>`).join("")}</ul>` : ""}
    <p class="nota-piccola">Le righe valide sostituiscono quelle già importate per le stesse fonti.</p>`;
  pulsante.hidden = esito.buone.length === 0;
  pulsante.textContent = "Importa " + esito.buone.length + " righe";
}

// Salva le righe valide (si può annullare) e mostra la fonte importata negli Indicatori
function confermaCsvReali() {
  if (!csvDaImportare || !csvDaImportare.righe.length) return;
  const { righe } = csvDaImportare;
  const fonti = [...new Set(righe.map((r) => r.fonte))];
  applica(() => {
    stato.richiesteReali = (stato.richiesteReali || []).filter((r) => !fonti.includes(r.fonte)).concat(righe);
    interfaccia.indicatori.fonte = fonti[0];
  }, { messaggio: righe.length + " richieste reali importate (" + fonti.join(", ") + ")" });
  csvDaImportare = null;
}

// ============================================================ RIEPILOGO DEL MESE

// Numeri di un periodo [da, a]: contatti, offerte, contratti e loro valore, perse, prima risposta media
function numeriPeriodo(opportunita, da, a) {
  const dentro = (d) => !!d && d >= da && d <= a;
  const contatti = opportunita.filter((o) => dentro(o.storico.contatto));
  const firmati = opportunita.filter((o) => dentro(o.storico.contratto) && !o.perso);
  const risposte = contatti.filter((o) => o.dataPrimaRisposta);
  return {
    contatti: contatti.length,
    offerte: opportunita.filter((o) => dentro(o.storico.offerta)).length,
    contratti: firmati.length,
    valore: firmati.reduce((s, o) => s + valoreAnnuo(o), 0),
    perse: opportunita.filter((o) => o.perso && dentro(o.perso.data)).length,
    risposta: media(risposte.map((o) => giorniTra(o.storico.contatto, o.dataPrimaRisposta))),
  };
}

// Confronto con il mese prima, in parole: «+12% sul mese prima», «come il mese prima»
function confronto(ora, prima, meglioSeMeno = false) {
  if (ora === null || prima === null) return "";
  if (!prima) return ora ? "il mese prima: 0" : "come il mese prima";
  const delta = (ora - prima) / prima;
  if (Math.abs(delta) < 0.005) return "come il mese prima";
  const bene = meglioSeMeno ? delta < 0 : delta > 0;
  return `<span class="${bene ? "meglio" : "peggio"}">${delta > 0 ? "▲ +" : "▼ "}${formattaPercentuale(delta)}</span> sul mese prima`;
}

// Pagina A4 per la direzione: ultimi 30 giorni contro i 30 precedenti, situazione di oggi, cosa fare domani
function disegnaRiepilogo() {
  const tutte = stato.opportunita;
  const fine = oggi(), inizio = aggiungiGiorni(fine, -29);
  const ora = numeriPeriodo(tutte, inizio, fine);
  const prima = numeriPeriodo(tutte, aggiungiGiorni(fine, -59), aggiungiGiorni(fine, -30));
  const k = calcolaKpi(tutte);
  const p = previsionePonderata(tutte);
  const portafoglio = coerenzaPortafoglio(tutte);
  const daAssegnare = tutte.filter((o) => o.storico.contratto && !o.perso && !o.allocazione).length;
  const motivo = motiviPerdita(tutte.filter((o) => o.perso && o.perso.data >= inizio))[0];
  const numero = (etichetta, valore, nota) => `<div class="riepilogo-numero"><span>${etichetta}</span><strong>${valore}</strong><small>${nota}</small></div>`;
  return `
    ${intestazione({ titolo: "Riepilogo del mese", istruzione: "Una pagina per la direzione con i numeri degli ultimi 30 giorni: stampala o salvala in PDF.",
      azione: `<div class="azioni-intestazione"><a class="pulsante-testo positivo esporta" href="#indicatori">Torna agli Indicatori</a>
        <button class="pulsante primario" type="button" data-azione="stampa-riepilogo">Stampa o salva in PDF</button></div>` })}
    <article class="foglio" id="foglio-riepilogo" aria-label="Riepilogo del mese">
      <header class="foglio-testa">
        <p class="marchio-stampa">Gate <span>S.R.L.</span></p>
        <div><h2>Riepilogo commerciale</h2><p>dal ${formattaData(inizio)} al ${formattaData(fine)}</p></div>
      </header>

      <h3>Il mese</h3>
      <div class="riepilogo-numeri">
        ${numero("Nuovi contatti", ora.contatti, confronto(ora.contatti, prima.contatti))}
        ${numero("Offerte inviate", ora.offerte, confronto(ora.offerte, prima.offerte))}
        ${numero("Contratti firmati", ora.contratti, confronto(ora.contratti, prima.contratti))}
        ${numero("Valore dei contratti", formattaEuro(ora.valore), "all'anno · " + confronto(ora.valore, prima.valore))}
        ${numero("Trattative perse", ora.perse, (motivo ? "soprattutto «" + esc(motivo.motivo) + "» · " : "") + confronto(ora.perse, prima.perse, true))}
        ${numero("Prima risposta", formattaGiorni(ora.risposta), "media (K12) · " + confronto(ora.risposta, prima.risposta, true))}
      </div>

      <h3>Oggi</h3>
      <div class="riepilogo-numeri quattro">
        ${numero("Trattative aperte", p.aperte, k.ferme + " ferme (K9)")}
        ${numero("Ricavi attesi", formattaEuro(p.ponderata), "all'anno, pesati per fase (K6)")}
        ${numero("Trattative buone", quota(portafoglio.buone.n, portafoglio.totale.n), "punteggio da " + CONFIG.punteggio.buona + " in su (K11)")}
        ${numero("Commesse da assegnare", daAssegnare, "contratti firmati senza squadra o partner")}
      </div>
      <p class="riepilogo-tempo">Tempo risparmiato con il CRM, stima: <strong>${tempoRisparmiato().ore.toLocaleString("it-IT", { maximumFractionDigits: 1 })} ore</strong>
        e <strong>${formattaEuro(tempoRisparmiato().euro)}</strong> al mese.</p>

      <h3>Cosa fare domani</h3>
      <table class="tabella riepilogo-azioni"><tbody>
        ${previsioniDomani(tutte).map((x) => `<tr>
          <td><strong>${esc(x.titolo)}</strong><br>${esc(x.valore)}${x.dettaglio ? " · " + esc(x.dettaglio) : ""}</td>
          <td>${x.azioni.length ? esc(x.azioni[0].testo) + (x.azioni.length > 1 ? ` <span class="nota-piccola">e altre ${x.azioni.length - 1}</span>` : "") : "Nessuna azione urgente"}</td>
        </tr>`).join("")}
      </tbody></table>
      <p class="foglio-piede">Mese = ultimi 30 giorni, confrontati con i 30 precedenti · ${esc(nomeFonte("fittizi"))} · stampato il ${formattaData(oggi())}</p>
    </article>`;
}

// Azioni della schermata: livello, CSV (stato dell'interfaccia o dati reali importati)
Object.assign(AZIONI_CLIENTI, {
  livello: (el) => {
    interfaccia.indicatori.livello = el.dataset.id;
    disegna();
  },
  "esporta-csv-richieste": () => esportaCsvRichieste(),
  "importa-csv-reali": () => apriImportaCsvReali(),
  "conferma-csv-reali": () => confermaCsvReali(),
  "stampa-riepilogo": () => window.print(),
});

GESTORI_MODULI["modulo-csv-reali"] = (modulo) => {
  const file = modulo.file.files[0];
  if (!file) return segnalaCampo(modulo.file, "Scegli il file CSV");
  const fonte = modulo.fonte.value;
  const lettore = new FileReader();
  lettore.onload = () => mostraAnteprimaCsvReali(analizzaCsvReali(lettore.result, fonte), fonte);
  lettore.readAsText(file);
};

document.addEventListener("change", (evento) => {
  if (evento.target.id !== "scelta-fonte") return;
  interfaccia.indicatori.fonte = evento.target.value;
  disegna();
  const campo = document.getElementById("scelta-fonte");
  if (campo) campo.focus();
});
