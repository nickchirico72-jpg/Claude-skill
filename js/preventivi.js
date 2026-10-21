/*
 * SUPPORTO AL PREVENTIVO (schermata #preventivo-<id> di un'opportunità)
 * 1. Dati del servizio: misure del sopralluogo (mq, tipo di ambienti, frequenza) → ore al mese, modificabili.
 * 2. Il preventivo: prezzo, costo del lavoro, spese, margine e classe A/B/C, con chi eseguirà il servizio.
 * 3. Prezzi di riferimento: tariffa minima (margine minimo), tariffa obiettivo e tariffa dei contratti simili già firmati.
 * 4. Riepilogo per il cliente, stampabile o salvabile in PDF (senza costi né margini).
 * Tutti i valori (rese, costi, tariffe) sono di prova, da sostituire dopo l'intervista: la schermata lo dice sempre.
 */

// Dati dell'opportunità da trattare nella schermata, con i valori scritti nel modulo (se il modulo è aperto)
function preventivoDalModulo(o, modulo) {
  if (!modulo) {
    const p = o.preventivo || {};
    return { servizio: o.servizio, ambiente: p.ambiente || "", mq: p.mq || 0, frequenza: p.frequenza || CONFIG.preventivo.frequenze[2].nome,
      ore: Number(o.ore) || 0, tariffa: tariffaOraria(o) };
  }
  return { servizio: modulo.servizio.value, ambiente: modulo.ambiente.value, mq: Math.round(Number(modulo.mq.value)) || 0,
    frequenza: modulo.frequenza.value, ore: Math.round(Number(modulo.ore.value)) || 0, tariffa: Number(modulo.tariffa.value) || 0 };
}

// Conti del preventivo: prezzo, costo del lavoro (squadra o partner), spese dirette e margine
function contiPreventivo(o, v) {
  const costi = datiServizio(v.servizio);
  const amb = CONFIG.preventivo.ambienti.find((a) => a.nome === v.ambiente);
  const prova = { ...o, servizio: v.servizio, ore: v.ore, tariffa: v.tariffa, valore: null, margine: null, capacitaSimulata: null,
    preventivo: amb ? { ambiente: amb.nome, mq: v.mq, frequenza: v.frequenza } : null };
  const esecutore = o.allocazione && o.allocazione.tipo !== "storico" ? o.allocazione.tipo : esecutorePrevisto(prova, stato.opportunita) || "partner";
  const costoOrario = esecutore === "squadra" ? costi.costoInterno : costi.costoPartner;
  const spese = amb ? amb.speseDirette : CONFIG.speseDirettePercentuale;
  const mese = v.ore * v.tariffa;
  const margine = v.tariffa > 0 ? 1 - costoOrario / v.tariffa - spese : 0;
  // Tariffa che dà un certo margine, arrotondata al mezzo euro in su
  const tariffaPer = (m) => Math.ceil(costoOrario / (1 - m - spese) * 2) / 2;
  return { prova, esecutore, costoOrario, spese, mese, anno: mese * 12, margine, margineAnno: mese * 12 * margine,
    minima: tariffaPer(CONFIG.punteggio.margine.minimo), obiettivo: tariffaPer(CONFIG.punteggio.margine.obiettivo),
    punteggio: calcolaPunteggio(prova, stato.opportunita) };
}

// Contratti e trattative perse dopo l'offerta, per lo stesso servizio (e lo stesso settore, se sono abbastanza)
function casiSimili(o, servizio) {
  const decise = stato.opportunita.filter((x) => x.id !== o.id && x.servizio === servizio && x.storico.offerta && (x.perso || x.storico.contratto) && x.ore > 0);
  const stessoSettore = decise.filter((x) => settoreDi(x) === settoreDi(o));
  const casi = stessoSettore.length >= 8 ? stessoSettore : decise;
  const tariffa = (x) => valoreAnnuo(x) / (x.ore * 12);
  const mediana = (valori) => {
    if (!valori.length) return null;
    const v = [...valori].sort((a, b) => a - b);
    return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  };
  const vinte = casi.filter((x) => x.storico.contratto && !x.perso);
  const perse = casi.filter((x) => x.perso);
  return {
    ambito: casi === stessoSettore ? servizio + ", settore " + settoreDi(o) : servizio + ", tutti i settori",
    totale: casi.length, vinte: vinte.length, persePrezzo: perse.filter((x) => x.perso.motivo === "prezzo").length,
    tariffaVinte: mediana(vinte.map(tariffa)), tariffaPerse: mediana(perse.map(tariffa)),
    margineVinte: vinte.length ? media(vinte.map((x) => marginePercentuale(x, stato.opportunita))) : null,
  };
}

// Euro all'ora con i decimali, es. "21,50 €/ora"
function euroOra(n) {
  return n === null ? NESSUN_DATO : n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €/ora";
}

// Schermata del preventivo di un'opportunità
function disegnaPreventivo(id) {
  const o = trova(id);
  const v = preventivoDalModulo(o, null);
  const inOfferta = !!o.storico.offerta;
  return `
    <a class="link-indietro" href="#pipeline">${icona("indietro")} Pipeline</a>
    ${intestazione({
      occhiello: "Preventivo · rif. " + esc(o.codice),
      titolo: esc(nomeCliente(o)),
      istruzione: "Parti dalle misure del sopralluogo, scegli la tariffa guardando costi e casi simili, poi registra l'offerta o stampa il riepilogo per il cliente.",
    })}
    <p class="avviso-stima">${icona("attenzione")} È una stima: va confermata dopo il sopralluogo.</p>
    <div class="preventivo-griglia">
      <form class="modulo riquadro" id="modulo-preventivo" data-id="${esc(o.id)}" novalidate>
        <h2 class="titolo-riquadro">1. Il servizio</h2>
        <div class="riga-doppia">
          <label>Servizio <select name="servizio" ${o.allocazione ? "disabled" : ""}>${opzioni(Object.keys(CONFIG.servizi), v.servizio)}</select></label>
          <label>Tipo di ambienti <select name="ambiente"><option value="">— Senza misure —</option>${opzioni(CONFIG.preventivo.ambienti.map((a) => a.nome), v.ambiente)}</select></label>
        </div>
        <div class="riga-doppia">
          <label>Metri quadri <input name="mq" type="number" inputmode="numeric" min="1" step="10" value="${v.mq || ""}" placeholder="Es. 300"></label>
          <label>Frequenza <select name="frequenza">${opzioni(CONFIG.preventivo.frequenze.map((f) => f.nome), v.frequenza)}</select></label>
        </div>
        <div class="riga-doppia">
          <label>Ore al mese * <input name="ore" type="number" inputmode="numeric" min="1" step="1" required value="${v.ore || ""}"></label>
          <label>Tariffa (€/ora) * <input name="tariffa" type="number" inputmode="decimal" min="1" step="0.5" required value="${v.tariffa || ""}"></label>
        </div>
        <p class="nota-piccola">Cambiando misure o frequenza, ore e tariffa si ricalcolano; poi puoi correggerle a mano.</p>
        <div class="azioni-finestra">
          <button class="pulsante secondario" type="button" data-azione="stampa-preventivo">Stampa per il cliente</button>
          <button class="pulsante secondario" type="submit">Salva il preventivo</button>
          ${!inOfferta && !o.perso && faseRaggiunta(o) >= 2 ? `<button class="pulsante primario" type="button" data-azione="registra-offerta" data-id="${esc(o.id)}">Registra l'offerta inviata</button>` : ""}
        </div>
      </form>
      <div id="risultato-preventivo">${risultatoPreventivo(o, v)}</div>
    </div>`;
}

// Pannelli che cambiano mentre si scrive: conti, prezzi di riferimento, classe, riepilogo da stampare
function risultatoPreventivo(o, v) {
  if (!(v.ore > 0) || !(v.tariffa > 0)) return '<div class="riquadro"><p class="vuoto">Inserisci ore al mese e tariffa per vedere il preventivo.</p></div>';
  const c = contiPreventivo(o, v);
  const s = casiSimili(o, v.servizio);
  const minimo = CONFIG.punteggio.margine.minimo;
  const tono = c.margine >= CONFIG.punteggio.margine.obiettivo ? "ok" : c.margine >= minimo ? "attenzione" : "critico";
  const amb = CONFIG.preventivo.ambienti.find((a) => a.nome === v.ambiente);
  const freq = CONFIG.preventivo.frequenze.find((f) => f.nome === v.frequenza);
  const tariffaRif = (valore, testo) => valore === null ? "" : `<button class="pulsante secondario piccolo" type="button" data-azione="usa-tariffa" data-valore="${valore}">${testo}: ${euroOra(valore)}</button>`;
  return `
    <section class="riquadro conti-preventivo">
      <h2 class="titolo-riquadro">2. Il preventivo ${badgePunteggio(c.punteggio)}</h2>
      <p class="preventivo-prezzo"><strong>${formattaEuro(c.mese)}</strong> al mese · <strong>${formattaEuro(c.anno)}</strong> all'anno</p>
      <table class="criteri"><tbody>
        <tr><td>Ore al mese × tariffa</td><td class="punti">${v.ore} h × ${euroOra(v.tariffa)}</td></tr>
        <tr><td>Costo del lavoro (${c.esecutore === "squadra" ? "squadra interna" : "impresa partner"})</td><td class="punti">${euroOra(c.costoOrario)}</td></tr>
        <tr><td>Spese dirette${amb ? " (" + esc(amb.nome.toLowerCase()) + ")" : ""}</td><td class="punti">${formattaPercentuale(c.spese)} del prezzo</td></tr>
        <tr><td><strong>Margine</strong></td><td class="punti"><span class="chip chip-${tono}">${formattaPercentualeDecimale(c.margine)} · ${formattaEuro(c.margineAnno)}/anno</span></td></tr>
      </tbody></table>
      ${c.margine < minimo ? `<p class="avviso-margine">${icona("attenzione")} Sotto il margine minimo del ${formattaPercentuale(minimo)}: alza la tariffa almeno a ${euroOra(c.minima)}.</p>` : ""}
      <details class="kpi-come"><summary>Come si calcola il punteggio</summary>${tabellaCriteri(c.punteggio)}</details>
    </section>
    <section class="riquadro">
      <h2 class="titolo-riquadro">3. Prezzi di riferimento</h2>
      <p class="nota-piccola">Un clic applica la tariffa. Minima e obiettivo nascono dai costi; la mediana viene dai contratti già firmati (${esc(s.ambito)}).</p>
      <div class="pulsanti-rapidi">
        ${tariffaRif(c.minima, "Minima, margine " + formattaPercentuale(minimo))}
        ${tariffaRif(c.obiettivo, "Obiettivo, margine " + formattaPercentuale(CONFIG.punteggio.margine.obiettivo))}
        ${tariffaRif(s.tariffaVinte === null ? null : Math.round(s.tariffaVinte * 2) / 2, "Mediana dei contratti")}
      </div>
      <p class="nota-piccola">${s.totale ? `Casi simili: ${s.totale} offerte decise, ${s.vinte} vinte (${quota(s.vinte, s.totale)}); ${s.persePrezzo} perse per il prezzo.
        Tariffa mediana: vinte ${euroOra(s.tariffaVinte)}, perse ${euroOra(s.tariffaPerse)}. Il confronto diventa più affidabile con più offerte decise.`
        : NESSUN_DATO + ": ancora nessuna offerta decisa per questo servizio."}</p>
    </section>
    <section class="stampa-preventivo" id="stampa-preventivo" aria-label="Riepilogo per il cliente">
      <p class="marchio-stampa">Gate <span>S.R.L.</span></p>
      <h2>Proposta di servizio · ${esc(nomeCliente(o))}</h2>
      <p>Rif. ${esc(o.codice)} · ${formattaData(oggi())} · sede di lavoro: ${esc(o.comune)}</p>
      <table class="tabella"><tbody>
        <tr><td>Servizio</td><td>${esc(maiuscola(v.servizio))}</td></tr>
        ${amb && v.mq ? `<tr><td>Ambienti</td><td>${esc(amb.nome)}, circa ${v.mq} mq</td></tr>` : ""}
        ${freq ? `<tr><td>Frequenza</td><td>${esc(freq.nome)}</td></tr>` : ""}
        <tr><td>Ore previste</td><td>${v.ore} ore al mese</td></tr>
        <tr><td>Importo</td><td>${formattaEuro(c.mese)} al mese (${formattaEuro(c.anno)} all'anno), IVA esclusa</td></tr>
        <tr><td>Validità</td><td>${CONFIG.giorniValiditaOfferta} giorni dalla data</td></tr>
      </tbody></table>
      <p class="nota-piccola">Preventivo indicativo, da confermare dopo il sopralluogo.</p>
    </section>`;
}

// Ridisegna solo i risultati, così il campo in cui si scrive non perde il cursore
function aggiornaPreventivo(modulo, campo) {
  const o = trova(modulo.dataset.id);
  if (!o) return;
  // Misure, frequenza o servizio cambiati: ore e tariffa tornano quelle calcolate
  if (campo && ["servizio", "ambiente", "mq", "frequenza"].includes(campo.name)) {
    const prev = calcolaPreventivo({ servizio: modulo.servizio.value, mq: Number(modulo.mq.value), ambiente: modulo.ambiente.value, frequenza: modulo.frequenza.value });
    if (prev) {
      modulo.ore.value = prev.ore;
      modulo.tariffa.value = prev.tariffa;
    } else if (campo.name === "servizio") {
      modulo.tariffa.value = datiServizio(modulo.servizio.value).tariffa;
    }
  }
  document.getElementById("risultato-preventivo").innerHTML = risultatoPreventivo(o, preventivoDalModulo(o, modulo));
}

// Salva servizio, misure, ore e tariffa nell'opportunità (valore e margine si ricalcolano dalle regole dell'app)
function salvaPreventivo(modulo, poi = null) {
  const o = trova(modulo.dataset.id);
  if (!o) return;
  const v = preventivoDalModulo(o, modulo);
  if (!(v.ore > 0)) return segnalaCampo(modulo.ore, "Inserisci le ore al mese");
  if (!(v.tariffa > 0)) return segnalaCampo(modulo.tariffa, "Inserisci la tariffa");
  const amb = CONFIG.preventivo.ambienti.find((a) => a.nome === v.ambiente);
  applica(() => {
    Object.assign(o, { servizio: o.allocazione ? o.servizio : v.servizio, ore: v.ore,
      tariffa: v.tariffa !== datiServizio(v.servizio).tariffa ? v.tariffa : null, valore: null, margine: null, capacitaSimulata: null });
    if (amb && v.mq > 0) o.preventivo = { ambiente: amb.nome, mq: v.mq, frequenza: v.frequenza };
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: "Preventivo: " + v.ore + " h/mese a " + euroOra(v.tariffa) + " = " + formattaEuro(v.ore * v.tariffa * 12) + "/anno" });
  }, { messaggio: "Preventivo salvato: " + formattaEuro(v.ore * v.tariffa * 12) + " all'anno", evidenzia: o.id });
  if (poi) poi(o);
}

// Azioni della schermata
Object.assign(AZIONI_CLIENTI, {
  // Prezzo di riferimento applicato con un clic
  "usa-tariffa": (el) => {
    const modulo = document.getElementById("modulo-preventivo");
    modulo.tariffa.value = el.dataset.valore;
    aggiornaPreventivo(modulo, modulo.tariffa);
  },
  // Riepilogo per il cliente: la stampa mostra solo quello (si può salvare in PDF)
  "stampa-preventivo": () => window.print(),
  // Salva il preventivo e apre la finestra «Offerta inviata» con la tariffa scelta
  "registra-offerta": () => salvaPreventivo(document.getElementById("modulo-preventivo"),
    (o) => apriFase(o, CONFIG.fasi.find((f) => f.id === "offerta"))),
});

GESTORI_MODULI["modulo-preventivo"] = (modulo) => salvaPreventivo(modulo);

document.addEventListener("input", (evento) => {
  const modulo = evento.target.closest("#modulo-preventivo");
  if (modulo) aggiornaPreventivo(modulo, evento.target.tagName === "INPUT" && ["ore", "tariffa"].includes(evento.target.name) ? null : evento.target);
});
