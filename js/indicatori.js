/*
 * INDICATORI SU TRE LIVELLI (piramide di Anthony)
 * Operativo (ufficio e commerciali), Tattico (responsabile commerciale), Strategico (direzione).
 * Ogni KPI viene dal catalogo (tabella kpi_catalogo): nome, formula, tipo, processo APQC e soglia.
 * La fonte si sceglie in alto: dati fittizi (database di prova) oppure dati reali (fotografia di partenza, test),
 * che non si mescolano mai. Ogni sezione dice a quale delle quattro domande risponde.
 */

const LIVELLI = {
  operativo: { nome: "Operativo", chi: "Ufficio e commerciali", kpi: ["K9", "K12", "K14"],
    istruzione: "Cosa fare oggi: rispondi subito alle richieste nuove e riprendi le trattative ferme." },
  tattico: { nome: "Tattico", chi: "Responsabile commerciale", kpi: ["K1", "K2", "K3", "K7", "K4", "K6", "K8", "K13", "K16"],
    istruzione: "Come lavora il processo: dove si perdono i contatti, quanto costano i canali, quali contenuti portano richieste." },
  strategico: { nome: "Strategico", chi: "Direzione", kpi: ["K5", "K10", "K11", "K15", "K17"],
    istruzione: "Dove conviene andare: quali canali portano clienti coerenti e margine, non solo contatti." },
};

// Nome leggibile di una fonte di dati
function nomeFonte(fonte) {
  return fonte === "fittizi" ? "Dati fittizi · database di prova"
    : "Dati reali · " + (fonte === "partenza" ? "fotografia di partenza" : fonte === "test" ? "test di tre settimane" : fonte);
}

// Riga del catalogo dei KPI per codice (K1 ... K17)
function kpiCatalogo(codice) {
  return righeDb("kpi_catalogo").find((k) => k.codice === codice);
}

// Giorni con un decimale, es. "2,1 giorni" (n.d. se non ci sono dati)
function formattaGiorni(n) {
  return n === null ? "n.d." : n.toLocaleString("it-IT", { maximumFractionDigits: 1 }) + (n === 1 ? " giorno" : " giorni");
}

// Tessera di un KPI del catalogo: valore, dettaglio, formula con i numeri, tipo, processo APQC e soglia
// (l'etichetta della domanda compare solo se è diversa da «Cosa è successo?», già nel titolo della sezione)
function tesseraKpi({ codice, valore, dettaglio, calcolo, raggiunto = null, tipoDomanda = "descrittiva" }) {
  const k = kpiCatalogo(codice);
  return `
    <article class="riquadro kpi" id="kpi-${codice}">
      <p class="kpi-etichetta"><span class="kpi-codice">${codice}</span> ${esc(k.nome)} ${tipoDomanda === "descrittiva" ? "" : domanda(tipoDomanda)}</p>
      <p class="kpi-valore">${valore}</p>
      <p class="kpi-dettaglio">${dettaglio}</p>
      <p class="kpi-formula"><span class="kpi-formula-titolo">Formula</span>${esc(k.formula)}${calcolo ? "<br><strong>" + calcolo + "</strong>" : ""}</p>
      <p class="kpi-meta">${esc(k.tipo)} · APQC ${esc(k.processo_apqc)}</p>
      ${raggiunto === null ? `<p class="kpi-obiettivo">Soglia: ${esc(k.soglia)}</p>`
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
  const pct = formattaPercentuale;
  const p = previsionePonderata(tutte);
  return {
    K1: () => tesseraKpi({ codice: "K1", valore: pct(k.tassoQualificati), dettaglio: k.qualificati + " su " + k.contatti + " contatti" + (k.lead ? " (più " + k.lead + " aziende ancora senza opportunità)" : ""),
      calcolo: `${k.qualificati} ÷ ${k.contatti} = ${pct(k.tassoQualificati)}`, raggiunto: k.tassoQualificati >= ob.tassoQualificati }),
    K2: () => tesseraKpi({ codice: "K2", valore: pct(k.tassoSopralluoghi), dettaglio: k.sopralluoghi + " sopralluoghi su " + k.qualificati + " qualificati",
      calcolo: `${k.sopralluoghi} ÷ ${k.qualificati} = ${pct(k.tassoSopralluoghi)}`, raggiunto: k.tassoSopralluoghi >= ob.tassoSopralluoghi }),
    K3: () => tesseraKpi({ codice: "K3", valore: pct(k.conversioneOfferte), dettaglio: k.contratti + " contratti su " + k.offerteDecise + " offerte decise",
      calcolo: `${k.contratti} ÷ ${k.offerteDecise} = ${pct(k.conversioneOfferte)}`, raggiunto: k.conversioneOfferte >= ob.conversioneOfferte }),
    K4: () => tesseraKpi({ codice: "K4", valore: k.contratti ? formattaEuro(k.costoAcquisizione) : "n.d.", dettaglio: "per contratto, tutti i canali (dettaglio per canale qui sotto)",
      calcolo: `${formattaEuro(k.costiCommerciali)} ÷ ${k.contratti} contratti`, raggiunto: k.contratti > 0 && k.costoAcquisizione <= ob.costoAcquisizioneMax }),
    K5: () => tesseraKpi({ codice: "K5", tipoDomanda: "predittiva", valore: formattaEuro(k.margineAtteso), dettaglio: "all'anno dalle " + k.aperte + " trattative aperte · marginalità " + pct(k.marginalitaMedia),
      calcolo: "Probabilità: " + CONFIG.fasi.slice(0, 4).map((f) => f.nome + " " + pct(f.probabilita)).join(" · ") }),
    K6: () => tesseraKpi({ codice: "K6", tipoDomanda: "predittiva", valore: formattaEuro(p.ponderata), dettaglio: "all'anno su " + formattaEuro(p.pieno) + " di valore pieno delle aperte" }),
    K7: () => tesseraKpi({ codice: "K7", valore: pct(k.winRate), dettaglio: k.contratti + " contratti su " + (k.contratti + k.persi) + " trattative chiuse",
      calcolo: `${k.contratti} ÷ (${k.contratti} + ${k.persi}) = ${pct(k.winRate)}` }),
    K8: () => tesseraKpi({ codice: "K8", valore: formattaGiorni(k.durataCiclo), dettaglio: "dal primo contatto alla firma, media su " + k.contratti + " contratti" }),
    K9: () => tesseraKpi({ codice: "K9", valore: String(k.ferme), dettaglio: "trattative ferme su " + k.aperte + " aperte (" + pct(rapporto(k.ferme, k.aperte)) + ")",
      calcolo: "Soglie: " + CONFIG.fasi.slice(0, 4).map((f) => f.nome + " " + f.giorniFerma + " giorni").join(" · ") }),
    K12: () => tesseraKpi({ codice: "K12", valore: formattaGiorni(k.primaRisposta), dettaglio: k.entroUnGiorno + " risposte entro un giorno su " + k.conRisposta,
      raggiunto: k.primaRisposta !== null && k.primaRisposta <= ob.primaRispostaGiorni }),
    K13: () => tesseraKpi({ codice: "K13", valore: formattaGiorni(k.tempoOfferta), dettaglio: "media su " + k.conOfferta + " opportunità arrivate all'offerta" }),
    K14: () => tesseraKpi({ codice: "K14", valore: k.registrate ? pct(rapporto(k.registrateEntro24, k.registrate)) : "n.d.",
      dettaglio: k.registrate ? k.registrateEntro24 + " su " + k.registrate + " richieste registrate" : "nei dati storici la registrazione non c'è: conta le richieste dal modulo",
      raggiunto: k.registrate ? rapporto(k.registrateEntro24, k.registrate) >= ob.registrateEntro24 : null }),
    K15: () => tesseraKpi({ codice: "K15", valore: pct(k.quotaDigitali), dettaglio: k.digitali + " richieste da canali digitali su " + k.contatti }),
    K16: () => tesseraKpi({ codice: "K16", valore: pct(rapporto(k.firmateDaLink, k.contratti)), dettaglio: k.firmateDaLink + " contratti firmati da link su " + k.contratti }),
  };
}

// Tessere dei KPI sui dati reali di una fonte; i KPI non calcolabili restano fuori
function tessereReali(r) {
  const pct = formattaPercentuale;
  const ob = CONFIG.obiettivi;
  return {
    K3: () => tesseraKpi({ codice: "K3", valore: r.offerteDecise ? pct(r.conversioneOfferte) : "n.d.", dettaglio: "su " + r.offerteDecise + " richieste con l'offerta decisa",
      raggiunto: r.offerteDecise ? r.conversioneOfferte >= ob.conversioneOfferte : null }),
    K7: () => tesseraKpi({ codice: "K7", valore: r.contratti + r.perse ? pct(r.winRate) : "n.d.", dettaglio: r.contratti + " contratti su " + (r.contratti + r.perse) + " richieste chiuse" }),
    K12: () => tesseraKpi({ codice: "K12", valore: formattaGiorni(r.primaRisposta), dettaglio: r.entroUnGiorno + " risposte entro un giorno su " + r.conRisposta,
      raggiunto: r.primaRisposta === null ? null : r.primaRisposta <= ob.primaRispostaGiorni }),
    K13: () => tesseraKpi({ codice: "K13", valore: formattaGiorni(r.tempoOfferta), dettaglio: "media su " + r.conOfferta + " richieste con offerta" }),
    K14: () => tesseraKpi({ codice: "K14", valore: r.registrate ? pct(rapporto(r.registrateEntro24, r.registrate)) : "n.d.", dettaglio: r.registrateEntro24 + " su " + r.registrate + " richieste registrate",
      raggiunto: r.registrate ? rapporto(r.registrateEntro24, r.registrate) >= ob.registrateEntro24 : null }),
    K15: () => tesseraKpi({ codice: "K15", valore: pct(r.quotaDigitali), dettaglio: r.digitali + " richieste da canali digitali su " + r.totale }),
    K17: () => tesseraKpi({ codice: "K17", valore: r.facilita === null ? "n.d." : r.facilita.toLocaleString("it-IT", { maximumFractionDigits: 1 }) + " su 5",
      dettaglio: r.voti + " voti di facilità", raggiunto: r.facilita === null ? null : r.facilita >= ob.facilita }),
  };
}

// Barra in cima: i tre livelli e la fonte dei dati, con l'etichetta ben visibile
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
      ${fonti.length > 1 ? `<label class="scegli-fonte">Fonte dei dati
        <select id="scelta-fonte">${fonti.map((f) => `<option value="${esc(f)}" ${f === scelta.fonte ? "selected" : ""}>${esc(nomeFonte(f))}</option>`).join("")}</select>
      </label>` : '<p class="nota-piccola">I dati reali compariranno qui dopo l\'import della fotografia di partenza.</p>'}
    </div>`;
}

function disegnaIndicatori() {
  const reali = fontiReali();
  const scelta = interfaccia.indicatori;
  if (scelta.fonte !== "fittizi" && !reali.includes(scelta.fonte)) scelta.fonte = "fittizi";
  const livello = LIVELLI[scelta.livello];
  const corpo = scelta.fonte === "fittizi" ? vistaFittizi(scelta.livello) : vistaReali(scelta.livello, kpiReali(scelta.fonte));
  return `
    <div class="pagina-indicatori">
    ${intestazione({ titolo: "Indicatori · " + livello.nome, istruzione: livello.istruzione })}
    ${barraIndicatori(scelta, reali)}
    ${legendaDomande({ descrittiva: "domanda-descrittiva", diagnostica: "domanda-diagnostica", predittiva: "domanda-predittiva", prescrittiva: "domanda-prescrittiva" })}
    ${corpo}
    </div>`;
}

// Vista sui dati fittizi del livello scelto
function vistaFittizi(livello) {
  const tutte = stato.opportunita;
  const k = calcolaKpi(tutte);
  const t = tessereFittizi(k, tutte);
  const tessere = (codici) => `<div class="griglia tre">${codici.map((c) => t[c]()).join("")}</div>`;

  if (livello === "operativo") {
    const nuove = tutte.filter((o) => trattativaAperta(o) && faseRaggiunta(o) === 0)
      .sort((a, b) => a.storico.contatto.localeCompare(b.storico.contatto));
    const ferme = tutte.filter(trattativaFerma).sort((a, b) => dataFaseAttuale(a).localeCompare(dataFaseAttuale(b)));
    const riga = (o, testo) => `<li><a class="link" href="#cliente-${esc(o.aziendaId)}">${esc(nomeCliente(o))}</a>
      <span class="nota-piccola">· ${esc(o.canale)} · ${testo}</span></li>`;
    return `
      <section class="sezione" id="domanda-descrittiva">
        <h2>${domanda("descrittiva")} Indicatori del giorno</h2>
        ${tessere(LIVELLI.operativo.kpi)}
      </section>
      <section class="sezione">
        <h2 id="domanda-diagnostica">${domanda("diagnostica")} Richieste da gestire</h2>
        <div class="griglia due">
          <div class="riquadro"><h3>Nuove richieste <span class="conteggio">${nuove.length}</span></h3>
            ${nuove.length ? `<ul class="elenco-semplice">${nuove.slice(0, 8).map((o) => riga(o, "arrivata il " + formattaData(o.storico.contatto) +
              (o.dataPrimaRisposta ? "" : ' · <span class="chip chip-attenzione">senza risposta</span>'))).join("")}</ul>` : '<p class="vuoto">Nessuna richiesta nuova.</p>'}
          </div>
          <div class="riquadro"><h3>Trattative ferme (K9) <span class="conteggio">${ferme.length}</span></h3>
            ${ferme.length ? `<ul class="elenco-semplice">${ferme.slice(0, 8).map((o) => riga(o, "in «" + CONFIG.fasi[faseRaggiunta(o)].nome + "» da " + giorni(giorniTra(dataFaseAttuale(o), oggi())))).join("")}</ul>`
              : '<p class="vuoto">Nessuna trattativa ferma.</p>'}
          </div>
        </div>
        <p class="nota-piccola"><a class="link" href="#pipeline">Apri la Pipeline</a> per «Da fare oggi» e «Da seguire».</p>
      </section>
      <section class="sezione" id="domanda-prescrittiva">${sezioneConsigli(5)}</section>`;
  }

  if (livello === "tattico") {
    const obiettivi = obiettiviPilota(k);
    const raggiunti = obiettivi.filter((o) => o.raggiunto).length;
    const funnel = calcolaFunnel(tutte);
    const massimo = funnel[0].n || 1;
    const contenuti = risultatiPerContenuto(tutte);
    return `
      <section class="riquadro sintesi" aria-labelledby="titolo-sintesi">
        <h2 id="titolo-sintesi" class="titolo-riquadro">Il pilota in sintesi ${domanda("descrittiva")}</h2>
        <p class="sintesi-numero ${raggiunti === obiettivi.length ? "ok" : ""}">Obiettivi raggiunti: <strong>${raggiunti} su ${obiettivi.length}</strong></p>
        ${raggiunti < obiettivi.length ? `<ul class="sintesi-elenco">
          ${obiettivi.filter((o) => !o.raggiunto).map((o) => `
            <li>${icona("attenzione")}<span><strong>${o.nome}: ${o.valore}</strong> (obiettivo ${o.obiettivo})<br>
              <span class="sintesi-suggerimento">${esc((CONFIG.suggerimenti || {})[o.id] || "")}</span></span></li>`).join("")}
        </ul>` : '<p class="nota-piccola">Tutti gli obiettivi del pilota sono raggiunti.</p>'}
      </section>
      <section class="sezione" id="domanda-descrittiva">
        <h2>${domanda("descrittiva")} Efficacia <span class="sottotitolo">quanto il processo porta risultati</span></h2>
        ${tessere(["K1", "K2", "K3", "K7"])}
      </section>
      <section class="sezione">
        <h2>${domanda("descrittiva")} Efficienza e adozione <span class="sottotitolo">tempi, costi e uso dei nuovi strumenti</span></h2>
        ${tessere(["K4", "K8", "K13", "K16"])}
      </section>
      <section class="sezione" id="domanda-predittiva">
        <h2>${domanda("predittiva")} Pipeline ponderata</h2>
        ${tessere(["K6"])}
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
        <h2>${domanda("diagnostica")} Conversione e costo per canale <span class="sottotitolo">K4 per canale</span></h2>
        <div class="tabella-scorrevole"><table class="tabella">
          <thead><tr><th>Canale</th><th>Tipo</th><th class="num">Contatti</th><th class="num">Contratti</th><th class="num">Chiusura</th><th class="num">Costi</th><th class="num">Costo per contratto</th></tr></thead>
          <tbody>${risultatiPerCanale(tutte).map((r) => `<tr>
            <td>${esc(r.fonte)}${r.fuoriElenco ? " (non più in elenco)" : ""}</td><td>${esc(r.tipo)}</td>
            <td class="num">${r.contatti}</td><td class="num">${r.contratti}</td>
            <td class="num">${r.contatti ? formattaPercentuale(r.conversione) : "–"}</td>
            <td class="num">${r.costi === null ? "non registrati" : formattaEuro(r.costi)}</td>
            <td class="num">${r.costoAcquisizione === null ? "–" : formattaEuro(r.costoAcquisizione)}</td></tr>`).join("")}</tbody>
        </table></div>
        <p class="nota-piccola" style="margin-top:8px">Chiusura = contratti ÷ trattative chiuse del canale. Costi = tabella costi_canale del database (gennaio-ottobre).</p>
      </section>
      <section class="sezione">
        <h2>${domanda("diagnostica")} Richieste qualificate per contenuto <span class="sottotitolo">link tracciati con utm_content</span></h2>
        <div class="tabella-scorrevole"><table class="tabella">
          <thead><tr><th>Contenuto</th><th>Canale e formato</th><th class="num">Richieste</th><th class="num">Qualificate</th><th class="num">Classe A</th><th class="num">Contratti</th></tr></thead>
          <tbody>${contenuti.map((c) => `<tr>
            <td>${c.contenuto ? `<strong>${esc(c.nome)}</strong><br><span class="nota-piccola">${esc(c.contenuto.tema)}</span>` : esc(c.nome)}</td>
            <td>${c.contenuto ? esc(c.contenuto.canale) + " · " + esc(c.contenuto.formato) : "–"}</td>
            <td class="num">${c.richieste}</td><td class="num">${c.qualificate}${c.richieste ? " (" + formattaPercentuale(rapporto(c.qualificate, c.richieste)) + ")" : ""}</td>
            <td class="num">${c.classeA}</td><td class="num">${c.contratti}</td></tr>`).join("")}</tbody>
        </table></div>
        <p class="nota-piccola" style="margin-top:8px">Contenuti di prova: nel database nessun contenuto ha un effetto inserito apposta, quindi le differenze sono casuali.</p>
      </section>`;
  }

  // Strategico
  const canali = risultatiPerCanale(tutte).filter((r) => r.contatti);
  const classi = coerenzaPortafoglio(tutte);
  const totaleValore = Object.values(classi).reduce((s, c) => s + c.valore, 0);
  const perdite = motiviPerdita(tutte);
  const totalePerse = perdite.reduce((s, m) => s + m.numero, 0);
  const settori = risultatiPerSettore(tutte);
  return `
    <section class="sezione" id="domanda-descrittiva">
      <h2>${domanda("descrittiva")} Portafoglio e canali</h2>
      <div class="griglia tre">
        ${t.K5()}
        ${tesseraKpi({ codice: "K11", valore: formattaPercentuale(rapporto(classi.A.n, tutte.length)) + " in A",
          dettaglio: ["A", "B", "C"].map((c) => c + " " + classi[c].n).join(" · ") + " opportunità",
          calcolo: "Valore: " + ["A", "B", "C"].map((c) => c + " " + formattaPercentuale(rapporto(classi[c].valore, totaleValore))).join(" · ") })}
        ${t.K15()}
      </div>
      <p class="nota-piccola">K17 Facilità percepita: si misura solo sui dati reali (voti dei clienti nel test). Sceglila in «Fonte dei dati».</p>
    </section>
    <section class="sezione" id="domanda-diagnostica">
      <h2>${domanda("diagnostica")} Quali canali portano clienti coerenti <span class="sottotitolo">canale × classe A/B/C e margine</span></h2>
      <div class="tabella-scorrevole"><table class="tabella matrice">
        <thead><tr><th>Canale</th><th class="num">Contatti</th><th class="num">A</th><th class="num">B</th><th class="num">C</th><th class="num">Quota A</th><th class="num">Margine medio</th><th class="num">Margine atteso (aperte)</th><th class="num">Contratti</th></tr></thead>
        <tbody>${canali.sort((a, b) => b.quotaA - a.quotaA).map((r) => `<tr>
          <td>${esc(r.fonte)}</td><td class="num">${r.contatti}</td>
          ${["A", "B", "C"].map((c) => `<td class="num cella-${c}">${r.classi[c]}</td>`).join("")}
          <td class="num"><strong>${formattaPercentuale(r.quotaA)}</strong></td>
          <td class="num">${r.margineMedio === null ? "–" : formattaPercentuale(r.margineMedio)}</td>
          <td class="num">${formattaEuro(r.margineAtteso)}</td><td class="num">${r.contratti}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="nota-piccola" style="margin-top:8px">Ordinati per quota di classe A. Margine atteso = K5 delle trattative aperte del canale.</p>
    </section>
    <section class="sezione">
      <h2>${domanda("diagnostica")} K10 Perché perdiamo <span class="sottotitolo">${quanti(totalePerse, "trattativa persa", "trattative perse")}</span></h2>
      ${perdite.length ? `<div class="tabella-scorrevole"><table class="tabella">
        <thead><tr><th>Motivo</th><th class="num">Trattative</th><th class="num">Quota</th><th class="num">Valore annuo perso</th></tr></thead>
        <tbody>${perdite.map((m) => `<tr><td>${esc(m.motivo)}</td><td class="num">${m.numero}</td>
          <td class="num">${formattaPercentuale(rapporto(m.numero, totalePerse))}</td><td class="num">${formattaEuro(m.valore)}</td></tr>`).join("")}</tbody>
      </table></div>` : '<p class="vuoto">Nessuna trattativa persa.</p>'}
    </section>
    <section class="sezione">
      <h2>${domanda("diagnostica")} Risultati per settore <span class="sottotitolo">settore pilota: ${esc(CONFIG.pilota.settore)}</span></h2>
      <div class="tabella-scorrevole"><table class="tabella">
        <thead><tr><th>Settore</th><th class="num">Contatti</th><th class="num">Contratti</th><th class="num">Conversione</th><th class="num">Valore annuo contratti</th><th class="num">Margine atteso</th><th class="num">Quota A</th></tr></thead>
        <tbody>${settori.filter((s) => s.contatti).map((s) => `<tr>
          <td>${esc(s.settore)}${s.fuoriElenco ? " (non più in elenco)" : ""}${s.pilota ? '<span class="chip-pilota">pilota</span>' : ""}</td>
          <td class="num">${s.contatti}</td><td class="num">${s.contratti}</td><td class="num">${formattaPercentuale(s.conversione)}</td>
          <td class="num">${formattaEuro(s.valoreContratti)}</td><td class="num">${formattaEuro(s.margineAtteso)}</td>
          <td class="num">${s.quotaA === null ? "–" : formattaPercentuale(s.quotaA)}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="nota-piccola" style="margin-top:8px">Conversione = contratti ÷ opportunità del settore.</p>
    </section>
    ${sezioniPrevisioneEConsigli()}`;
}

// Vista sui dati reali: solo i KPI che la fonte permette di calcolare, mai mescolati con i fittizi
function vistaReali(livello, r) {
  const t = tessereReali(r);
  const codici = LIVELLI[livello].kpi;
  const si = codici.filter((c) => t[c]);
  const no = codici.filter((c) => !t[c]);
  const conteggio = (campo) => {
    const m = new Map();
    r.righe.forEach((x) => m.set(x[campo], (m.get(x[campo]) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const tabella = (titolo, campo) => `
    <div class="riquadro"><h3>${titolo}</h3><table class="tabella"><tbody>
      ${conteggio(campo).map(([v, n]) => `<tr><td>${esc(v)}</td><td class="num">${n}</td></tr>`).join("")}
    </tbody></table></div>`;
  return `
    <section class="sezione" id="domanda-descrittiva">
      <h2>${domanda("descrittiva")} ${r.totale} richieste registrate</h2>
      ${si.length ? `<div class="griglia tre">${si.map((c) => t[c]()).join("")}</div>` : '<p class="vuoto">Nessun KPI di questo livello si calcola con questa fonte.</p>'}
    </section>
    <section class="sezione" id="domanda-diagnostica">
      <h2>${domanda("diagnostica")} Da dove arrivano e come finiscono</h2>
      <div class="griglia tre">${tabella("Per canale", "canale")}${tabella("Per esito", "esito")}${tabella("Per settore", "settore")}</div>
    </section>
    ${nonCalcolabili(no)}`;
}

// Azioni della schermata: livello e fonte (stato dell'interfaccia, non dei dati)
Object.assign(AZIONI_CLIENTI, {
  livello: (el) => {
    interfaccia.indicatori.livello = el.dataset.id;
    disegna();
  },
});

document.addEventListener("change", (evento) => {
  if (evento.target.id !== "scelta-fonte") return;
  interfaccia.indicatori.fonte = evento.target.value;
  disegna();
  const campo = document.getElementById("scelta-fonte");
  if (campo) campo.focus();
});
