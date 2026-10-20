/*
 * INDICATORI A TRE LIVELLI (modifica 4 del 20/10)
 * Direzione, Commerciale, Operativo/adozione, più «Altri indicatori» per tutto il resto del catalogo.
 * Ogni KPI viene dal catalogo (tabella kpi_catalogo): codice K1-K17, formula, spiegazione in parole, APQC e soglia.
 * La fonte si sceglie in alto: dati fittizi (database di prova) oppure dati reali (fotografia di partenza, test),
 * anche importati qui da un CSV a 7 colonne; non si mescolano mai. Senza dati si scrive «nessun dato», mai zero.
 * Ogni sezione dice a quale delle quattro domande risponde.
 */

const LIVELLI = {
  direzione: { nome: "Direzione", chi: "Risultati e costi", kpi: ["K1", "K3", "K6", "K4"],
    istruzione: "Il pilota in quattro numeri: contatti qualificati, offerte firmate, fatturato atteso e costo per canale." },
  commerciale: { nome: "Commerciale", chi: "Trattative da seguire", kpi: ["K9"],
    istruzione: "Cosa fare oggi: riprendi le trattative ferme, richiama chi è da ricontattare, segui i prossimi passi." },
  operativo: { nome: "Operativo", titolo: "Operativo e adozione", chi: "Tempi e adozione", kpi: ["K12", "K13", "K14", "K15", "K16"],
    istruzione: "Quanto in fretta si risponde e quanto si usano i nuovi strumenti: modulo, annotazione, canali digitali, firma da link." },
  altri: { nome: "Altri indicatori", chi: "Approfondimenti", kpi: ["K2", "K5", "K7", "K8", "K10", "K11", "K17"],
    istruzione: "Gli altri indicatori del catalogo: funnel, margine, motivi di perdita, canali e contenuti." },
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

// Riga del catalogo dei KPI per codice (K1 ... K17)
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
// (l'etichetta della domanda compare solo se è diversa da «Cosa è successo?», già nel titolo della sezione)
function tesseraKpi({ codice, valore, dettaglio, calcolo, raggiunto = null, tipoDomanda = "descrittiva" }) {
  const k = kpiCatalogo(codice);
  const vuoto = valore === NESSUN_DATO;
  return `
    <article class="riquadro kpi" id="kpi-${codice}">
      <p class="kpi-etichetta"><span class="kpi-codice">${codice}</span> ${esc(k.nome)} ${tipoDomanda === "descrittiva" ? "" : domanda(tipoDomanda)}</p>
      <p class="kpi-valore ${vuoto ? "vuoto-kpi" : ""}">${valore}</p>
      <p class="kpi-dettaglio">${dettaglio}</p>
      <p class="kpi-spiegazione">${esc(k.spiegazione)}</p>
      <details class="kpi-come">
        <summary>Come si calcola</summary>
        <p class="kpi-formula">${esc(k.formula)}${calcolo && !vuoto ? "<br><strong>" + calcolo + "</strong>" : ""}</p>
        <p class="kpi-meta">${esc(k.tipo)} · APQC ${esc(k.processo_apqc)}</p>
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
  const classi = coerenzaPortafoglio(tutte);
  const totaleValore = Object.values(classi).reduce((s, c) => s + c.valore, 0);
  return {
    K1: () => tesseraKpi({ codice: "K1", valore: quota(k.qualificati, k.contatti), dettaglio: k.qualificati + " su " + k.contatti + " contatti",
      calcolo: `${k.qualificati} ÷ ${k.contatti}`, raggiunto: k.contatti ? k.tassoQualificati >= ob.tassoQualificati : null }),
    K2: () => tesseraKpi({ codice: "K2", valore: quota(k.sopralluoghi, k.qualificati), dettaglio: k.sopralluoghi + " sopralluoghi su " + k.qualificati + " qualificati",
      calcolo: `${k.sopralluoghi} ÷ ${k.qualificati}`, raggiunto: k.qualificati ? k.tassoSopralluoghi >= ob.tassoSopralluoghi : null }),
    K3: () => tesseraKpi({ codice: "K3", valore: quota(k.contratti, k.offerteDecise), dettaglio: k.contratti + " contratti su " + k.offerteDecise + " offerte decise",
      calcolo: `${k.contratti} ÷ ${k.offerteDecise}`, raggiunto: k.offerteDecise ? k.conversioneOfferte >= ob.conversioneOfferte : null }),
    K4: () => tesseraKpi({ codice: "K4", valore: k.contratti ? formattaEuro(k.costoAcquisizione) : NESSUN_DATO, dettaglio: "per contratto, tutti i canali (per canale qui sotto)",
      calcolo: `${formattaEuro(k.costiCommerciali)} ÷ ${k.contratti} contratti`, raggiunto: k.contratti ? k.costoAcquisizione <= ob.costoAcquisizioneMax : null }),
    K5: () => tesseraKpi({ codice: "K5", tipoDomanda: "predittiva", valore: k.aperte ? formattaEuro(k.margineAtteso) : NESSUN_DATO,
      dettaglio: "all'anno dalle " + k.aperte + " trattative aperte · marginalità " + quota(k.margineAtteso, k.ricaviAttesi),
      calcolo: "Probabilità: " + CONFIG.fasi.slice(0, 4).map((f) => f.nome + " " + formattaPercentuale(f.probabilita)).join(" · ") }),
    K6: () => tesseraKpi({ codice: "K6", tipoDomanda: "predittiva", valore: p.aperte ? formattaEuro(p.ponderata) : NESSUN_DATO,
      dettaglio: "all'anno su " + formattaEuro(p.pieno) + " di valore pieno delle " + p.aperte + " aperte" }),
    K7: () => tesseraKpi({ codice: "K7", valore: quota(k.contratti, k.contratti + k.persi), dettaglio: k.contratti + " contratti su " + (k.contratti + k.persi) + " trattative chiuse",
      calcolo: `${k.contratti} ÷ (${k.contratti} + ${k.persi})` }),
    K8: () => tesseraKpi({ codice: "K8", valore: formattaGiorni(k.durataCiclo), dettaglio: "dal primo contatto alla firma, media su " + k.contratti + " contratti" }),
    K9: () => tesseraKpi({ codice: "K9", valore: k.aperte ? String(k.ferme) : NESSUN_DATO, dettaglio: "trattative ferme su " + k.aperte + " aperte (" + quota(k.ferme, k.aperte) + ")",
      calcolo: "Soglie: " + CONFIG.fasi.slice(0, 4).map((f) => f.nome + " " + f.giorniFerma + " giorni").join(" · ") }),
    K11: () => tesseraKpi({ codice: "K11", valore: tutte.length ? quota(classi.A.n, tutte.length) + " in A" : NESSUN_DATO,
      dettaglio: ["A", "B", "C"].map((c) => c + " " + classi[c].n).join(" · ") + " opportunità",
      calcolo: "Valore: " + ["A", "B", "C"].map((c) => c + " " + quota(classi[c].valore, totaleValore)).join(" · ") }),
    K12: () => tesseraKpi({ codice: "K12", valore: formattaGiorni(k.primaRisposta), dettaglio: k.entroUnGiorno + " risposte entro un giorno su " + k.conRisposta,
      raggiunto: k.primaRisposta === null ? null : k.primaRisposta <= ob.primaRispostaGiorni }),
    K13: () => tesseraKpi({ codice: "K13", valore: formattaGiorni(k.tempoOfferta), dettaglio: "media su " + k.conOfferta + " opportunità arrivate all'offerta" }),
    K14: () => tesseraKpi({ codice: "K14", valore: quota(k.registrateEntro24, k.registrate),
      dettaglio: k.registrate ? k.registrateEntro24 + " su " + k.registrate + " richieste annotate" : "nei dati storici l'annotazione non c'è: contano le richieste nuove",
      raggiunto: k.registrate ? k.registrateEntro24 / k.registrate >= ob.registrateEntro24 : null }),
    K15: () => tesseraKpi({ codice: "K15", valore: quota(k.digitali, k.contatti), dettaglio: k.digitali + " richieste da canali digitali su " + k.contatti }),
    K16: () => tesseraKpi({ codice: "K16", valore: quota(k.firmateDaLink, k.contratti), dettaglio: k.firmateDaLink + " contratti firmati da link su " + k.contratti }),
    K17: () => tesseraKpi({ codice: "K17", valore: NESSUN_DATO, dettaglio: "si misura solo sui dati reali: scegli la fonte «test» in alto" }),
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
    K14: () => tesseraKpi({ codice: "K14", valore: quota(r.registrateEntro24, r.registrate), dettaglio: r.registrateEntro24 + " su " + r.registrate + " richieste annotate",
      raggiunto: r.registrate ? r.registrateEntro24 / r.registrate >= ob.registrateEntro24 : null }),
    K15: () => tesseraKpi({ codice: "K15", valore: quota(r.digitali, r.totale), dettaglio: r.digitali + " richieste da canali digitali su " + r.totale }),
    K17: () => tesseraKpi({ codice: "K17", valore: r.facilita === null ? NESSUN_DATO : r.facilita.toLocaleString("it-IT", { maximumFractionDigits: 1 }) + " su 5",
      dettaglio: r.voti + " voti di facilità", raggiunto: r.facilita === null ? null : r.facilita >= ob.facilita }),
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
      <p class="etichetta-fonte ${scelta.fonte === "fittizi" ? "" : "reali"}" role="status">${icona("attenzione")} ${esc(nomeFonte(scelta.fonte))}
        ${r && r.esempio ? '<span class="chip chip-critico">Righe di esempio inventate, non dati di Gate</span>' : ""}</p>
      <div class="azioni-fonte">
        ${fonti.length > 1 ? `<label class="scegli-fonte">Fonte dei dati
          <select id="scelta-fonte">${fonti.map((f) => `<option value="${esc(f)}" ${f === scelta.fonte ? "selected" : ""}>${esc(nomeFonte(f))}</option>`).join("")}</select>
        </label>` : ""}
        <button class="pulsante-testo positivo" type="button" data-azione="esporta-csv-richieste">Esporta CSV</button>
        <button class="pulsante-testo positivo" type="button" data-azione="importa-csv-reali">Importa CSV dati reali</button>
      </div>
    </div>`;
}

function disegnaIndicatori() {
  const reali = fontiReali();
  const scelta = interfaccia.indicatori;
  if (!LIVELLI[scelta.livello]) scelta.livello = "direzione";
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

// Costo di acquisizione per gruppo di canale (K4): costi del database e contratti dei canali di ogni gruppo
function risultatiPerGruppo(opportunita) {
  const perCanale = risultatiPerCanale(opportunita);
  return gruppiCanali().map((g) => {
    const canali = perCanale.filter((r) => gruppoCanale(r.fonte) === g);
    const costi = canali.some((r) => r.costi !== null) ? canali.reduce((s, r) => s + (r.costi || 0), 0) : null;
    const contratti = canali.reduce((s, r) => s + r.contratti, 0);
    return { gruppo: g, canali: canali.map((r) => r.fonte), contatti: canali.reduce((s, r) => s + r.contatti, 0), contratti, costi,
      costoAcquisizione: costi !== null && contratti ? costi / contratti : null };
  });
}

// Vista sui dati fittizi del livello scelto
function vistaFittizi(livello) {
  const tutte = stato.opportunita;
  const k = calcolaKpi(tutte);
  const t = tessereFittizi(k, tutte);
  const tessere = (codici) => `<div class="griglia ${codici.length > 2 ? "tre" : ""}">${codici.map((c) => t[c]()).join("")}</div>`;
  const riga = (o, testo) => `<li><a class="link" href="#cliente-${esc(o.aziendaId)}">${esc(nomeCliente(o))}</a> <span class="nota-piccola">· ${testo}</span></li>`;

  if (livello === "direzione") {
    return `
      <section class="sezione" id="domanda-descrittiva">
        <h2>${domanda("descrittiva")} Risultati del pilota</h2>
        ${tessere(["K1", "K3", "K6", "K4"])}
      </section>
      <section class="sezione" id="domanda-diagnostica">
        <h2>${domanda("diagnostica")} K4 Costo di acquisizione per canale <span class="sottotitolo">i 7 gruppi di canale</span></h2>
        <div class="tabella-scorrevole"><table class="tabella">
          <thead><tr><th>Canale</th><th class="num">Contatti</th><th class="num">Contratti</th><th class="num">Costi</th><th class="num">Costo per contratto</th></tr></thead>
          <tbody>${risultatiPerGruppo(tutte).map((r) => `<tr>
            <td><strong>${esc(r.gruppo)}</strong><br><span class="nota-piccola">${esc(r.canali.join(", ") || "nessun canale attivo")}</span></td>
            <td class="num">${r.contatti}</td><td class="num">${r.contratti}</td>
            <td class="num">${r.costi === null ? NESSUN_DATO : formattaEuro(r.costi)}</td>
            <td class="num">${r.costoAcquisizione === null ? NESSUN_DATO : formattaEuro(r.costoAcquisizione)}</td></tr>`).join("")}</tbody>
        </table></div>
        <p class="nota-piccola" style="margin-top:8px">Costi del canale ÷ contratti del canale. «Nessun dato» = canale senza costi registrati o senza contratti. Costi: tabella costi_canale del database.</p>
      </section>`;
  }

  if (livello === "commerciale") {
    const ferme = tutte.filter(trattativaFerma).sort((a, b) => dataFaseAttuale(a).localeCompare(dataFaseAttuale(b)));
    const ricontatti = tutte.filter(ricontattoScaduto).sort((a, b) => a.ricontatto.data.localeCompare(b.ricontatto.data));
    const prossimi = attivitaDaFare().slice(0, 8);
    return `
      <section class="sezione" id="domanda-descrittiva">
        <h2>${domanda("descrittiva")} Trattative da riprendere</h2>
        <div class="griglia tre">
          ${t.K9()}
          <div class="riquadro"><h3>Le più ferme</h3>
            ${ferme.length ? `<ul class="elenco-semplice">${ferme.slice(0, 6).map((o) => riga(o, "in «" + CONFIG.fasi[faseRaggiunta(o)].nome + "» da " + giorni(giorniTra(dataFaseAttuale(o), oggi())))).join("")}</ul>`
              : `<p class="vuoto">${NESSUN_DATO}: nessuna trattativa ferma.</p>`}</div>
          <div class="riquadro" id="ricontatti-scaduti"><h3>Da ricontattare, data scaduta <span class="conteggio">${ricontatti.length}</span></h3>
            ${ricontatti.length ? `<ul class="elenco-semplice">${ricontatti.map((o) => riga(o, "dal " + formattaData(o.ricontatto.data) + (o.ricontatto.nota ? " · " + esc(o.ricontatto.nota) : ""))).join("")}</ul>`
              : `<p class="vuoto">${NESSUN_DATO}: nessun ricontatto scaduto. Si segna dal dettaglio di un'opportunità, con «Da ricontattare».</p>`}</div>
        </div>
      </section>
      <section class="sezione" id="domanda-prescrittiva">
        <h2>${domanda("prescrittiva")} Prossimi passi</h2>
        <div class="griglia">
          <div class="riquadro"><h3>In agenda <span class="conteggio">${attivitaDaFare().length}</span></h3>
            ${prossimi.length ? `<ul class="elenco-passi">${prossimi.map((x) => `<li>${scadenza(x.data)} <span><a class="link" href="#cliente-${esc(x.aziendaId)}">${esc((trovaAzienda(x.aziendaId) || {}).ragioneSociale)}</a>
              · ${esc(x.testo)}</span></li>`).join("")}</ul>` : `<p class="vuoto">${NESSUN_DATO}: nessuna attività in agenda.</p>`}</div>
          ${sezioneConsigli(3)}
        </div>
      </section>`;
  }

  if (livello === "operativo") {
    return `
      <section class="sezione" id="domanda-descrittiva">
        <h2>${domanda("descrittiva")} Tempi di risposta</h2>
        ${tessere(["K12", "K13"])}
      </section>
      <section class="sezione">
        <h2>${domanda("descrittiva")} Adozione dei nuovi strumenti</h2>
        ${tessere(["K14", "K15", "K16"])}
      </section>`;
  }

  // Altri indicatori
  const funnel = calcolaFunnel(tutte);
  const massimo = funnel[0].n || 1;
  const canali = risultatiPerCanale(tutte).filter((r) => r.contatti);
  const perdite = motiviPerdita(tutte);
  const totalePerse = perdite.reduce((s, m) => s + m.numero, 0);
  const contenuti = risultatiPerContenuto(tutte);
  const settori = risultatiPerSettore(tutte);
  return `
    <section class="sezione" id="domanda-descrittiva">
      <h2>${domanda("descrittiva")} Altri KPI del catalogo</h2>
      ${tessere(["K2", "K7", "K8", "K5", "K11", "K17"])}
    </section>
    <section class="sezione">
      <h2>${domanda("descrittiva")} Funnel commerciale <span class="sottotitolo">opportunità che hanno raggiunto ogni fase, perse comprese</span></h2>
      <div class="riquadro"><div class="funnel">
        ${funnel.map((f) => {
          const conv = f.conversione === null ? "" : formattaPercentuale(f.conversione) + " della fase prima";
          return `<div class="funnel-riga" tabindex="0" title="${f.nome}: ${f.n}${conv ? " · " + conv : ""}">
            <span class="funnel-fase">${f.nome}</span><span class="funnel-barra"><span style="width:${(f.n / massimo) * 100}%"></span></span>
            <span class="funnel-numero">${f.n}</span><span class="funnel-conv">${conv}</span></div>`;
        }).join("")}
      </div></div>
    </section>
    <section class="sezione" id="domanda-diagnostica">
      <h2>${domanda("diagnostica")} Quali canali portano clienti coerenti <span class="sottotitolo">canale × classe A/B/C e margine</span></h2>
      <div class="tabella-scorrevole"><table class="tabella matrice">
        <thead><tr><th>Canale</th><th>Gruppo</th><th class="num">Contatti</th><th class="num">A</th><th class="num">B</th><th class="num">C</th><th class="num">Quota A</th><th class="num">Margine medio</th><th class="num">Margine atteso (aperte)</th><th class="num">Contratti</th></tr></thead>
        <tbody>${canali.sort((a, b) => b.quotaA - a.quotaA).map((r) => `<tr>
          <td>${esc(r.fonte)}</td><td>${esc(gruppoCanale(r.fonte))}</td><td class="num">${r.contatti}</td>
          ${["A", "B", "C"].map((c) => `<td class="num cella-${c}">${r.classi[c]}</td>`).join("")}
          <td class="num"><strong>${formattaPercentuale(r.quotaA)}</strong></td>
          <td class="num">${r.margineMedio === null ? NESSUN_DATO : formattaPercentuale(r.margineMedio)}</td>
          <td class="num">${formattaEuro(r.margineAtteso)}</td><td class="num">${r.contratti}</td></tr>`).join("")}</tbody>
      </table></div>
    </section>
    <section class="sezione">
      <h2>${domanda("diagnostica")} K10 Perché perdiamo <span class="sottotitolo">${quanti(totalePerse, "trattativa persa", "trattative perse")}</span></h2>
      <p class="kpi-spiegazione">${esc(kpiCatalogo("K10").spiegazione)}</p>
      ${perdite.length ? `<div class="tabella-scorrevole"><table class="tabella">
        <thead><tr><th>Motivo</th><th class="num">Trattative</th><th class="num">Quota</th><th class="num">Valore annuo perso</th></tr></thead>
        <tbody>${perdite.map((m) => `<tr><td>${esc(m.motivo)}</td><td class="num">${m.numero}</td>
          <td class="num">${quota(m.numero, totalePerse)}</td><td class="num">${formattaEuro(m.valore)}</td></tr>`).join("")}</tbody>
      </table></div>` : `<p class="vuoto">${NESSUN_DATO}: nessuna trattativa persa.</p>`}
    </section>
    <section class="sezione">
      <h2>${domanda("diagnostica")} Richieste qualificate per contenuto <span class="sottotitolo">link tracciati con utm_content</span></h2>
      <div class="tabella-scorrevole"><table class="tabella">
        <thead><tr><th>Contenuto</th><th>Canale e formato</th><th class="num">Richieste</th><th class="num">Qualificate</th><th class="num">Classe A</th><th class="num">Contratti</th></tr></thead>
        <tbody>${contenuti.map((c) => `<tr>
          <td>${c.contenuto ? `<strong>${esc(c.nome)}</strong><br><span class="nota-piccola">${esc(c.contenuto.tema)}</span>` : esc(c.nome)}</td>
          <td>${c.contenuto ? esc(c.contenuto.canale) + " · " + esc(c.contenuto.formato) : "–"}</td>
          <td class="num">${c.richieste}</td><td class="num">${c.qualificate} (${quota(c.qualificate, c.richieste)})</td>
          <td class="num">${c.classeA}</td><td class="num">${c.contratti}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="nota-piccola" style="margin-top:8px">Contenuti di prova: nel database nessun contenuto ha un effetto inserito apposta, quindi le differenze sono casuali.</p>
    </section>
    <section class="sezione">
      <h2>${domanda("diagnostica")} Risultati per settore <span class="sottotitolo">settore pilota: ${esc(CONFIG.pilota.settore)}</span></h2>
      <div class="tabella-scorrevole"><table class="tabella">
        <thead><tr><th>Settore</th><th class="num">Contatti</th><th class="num">Contratti</th><th class="num">Conversione</th><th class="num">Valore annuo contratti</th><th class="num">Margine atteso</th><th class="num">Quota A</th></tr></thead>
        <tbody>${settori.filter((s) => s.contatti).map((s) => `<tr>
          <td>${esc(s.settore)}${s.fuoriElenco ? " (non più in elenco)" : ""}${s.pilota ? '<span class="chip-pilota">pilota</span>' : ""}</td>
          <td class="num">${s.contatti}</td><td class="num">${s.contratti}</td><td class="num">${quota(s.contratti, s.contatti)}</td>
          <td class="num">${formattaEuro(s.valoreContratti)}</td><td class="num">${formattaEuro(s.margineAtteso)}</td>
          <td class="num">${s.quotaA === null ? NESSUN_DATO : formattaPercentuale(s.quotaA)}</td></tr>`).join("")}</tbody>
      </table></div>
    </section>
    ${sezioniPrevisioneEConsigli()}`;
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
      ${conteggio(valore).map(([v, n]) => `<tr><td>${esc(v)}</td><td class="num">${n}</td></tr>`).join("")}
    </tbody></table></div>`;
  return `
    <section class="sezione" id="domanda-descrittiva">
      <h2>${domanda("descrittiva")} ${quanti(r.totale, "richiesta registrata", "richieste registrate")}</h2>
      ${si.length ? `<div class="griglia tre">${si.map((c) => t[c]()).join("")}</div>` : `<p class="vuoto">${NESSUN_DATO}: nessun KPI di questo livello si calcola con le 7 colonne del CSV.</p>`}
    </section>
    ${nonCalcolabili(no)}
    <section class="sezione" id="domanda-diagnostica">
      <h2>${domanda("diagnostica")} Da dove arrivano e come finiscono</h2>
      <div class="griglia tre">${tabella("Per canale", (x) => gruppoCanale(x.canale))}${tabella("Per esito", (x) => x.esito)}${tabella("Per settore", (x) => x.settore)}</div>
    </section>
    <section class="sezione">
      <h2>Elenco delle richieste <span class="conteggio">${r.totale}</span></h2>
      <div class="tabella-scorrevole"><table class="tabella impilata" id="elenco-reali">
        <thead><tr><th>Richiesta</th><th>Annotazione</th><th>Canale</th><th>Settore</th><th>Prima risposta</th><th>Offerta</th><th>Esito</th></tr></thead>
        <tbody>${r.righe.map((x) => `<tr>
          <td data-etichetta="Richiesta">${formattaData(x.data_richiesta)}</td><td data-etichetta="Annotazione">${formattaData(x.data_registrazione) || "–"}</td>
          <td data-etichetta="Canale">${esc(x.canale)}</td><td data-etichetta="Settore">${esc(x.settore)}</td>
          <td data-etichetta="Prima risposta">${formattaData(x.data_risposta) || "–"}</td><td data-etichetta="Offerta">${formattaData(x.data_offerta) || "–"}</td>
          <td data-etichetta="Esito">${esc(x.esito)}</td></tr>`).join("")}</tbody>
      </table></div>
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

// Azioni della schermata: livello, CSV (stato dell'interfaccia o dati reali importati)
Object.assign(AZIONI_CLIENTI, {
  livello: (el) => {
    interfaccia.indicatori.livello = el.dataset.id;
    disegna();
  },
  "esporta-csv-richieste": () => esportaCsvRichieste(),
  "importa-csv-reali": () => apriImportaCsvReali(),
  "conferma-csv-reali": () => confermaCsvReali(),
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
