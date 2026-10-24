/*
 * SUPPORTO AL PREVENTIVO (schermata #preventivo-<id> di un'opportunità)
 * 1. Dati del servizio: misure del sopralluogo (mq, tipo di ambienti, frequenza) → ore al mese, modificabili.
 * 2. Il preventivo: prezzo, costo del lavoro, spese, margine e classe A/B/C, con chi eseguirà il servizio.
 * 3. Prezzi di riferimento: tariffa minima (margine minimo), tariffa obiettivo e tariffa dei contratti simili già firmati.
 * 4. Offerta per il cliente, stampabile o salvabile in PDF (senza costi né margini). Con un pacchetto standard
 *    (Base, Plus, Completo: CONFIG.preventivo.pacchetti) il prezzo nasce da mq × prezzo al mq all'anno (PASSAGGIO 4, N2).
 * Tutti i valori (rese, costi, tariffe) sono di prova, da sostituire dopo l'intervista: la schermata lo dice sempre.
 */

// Dati dell'opportunità da trattare nella schermata, con i valori scritti nel modulo (se il modulo è aperto)
function preventivoDalModulo(o, modulo) {
  if (!modulo) {
    const p = o.preventivo || {};
    return { servizio: o.servizio, ambiente: p.ambiente || "", mq: p.mq || 0, frequenza: p.frequenza || CONFIG.preventivo.frequenze[2].nome,
      ore: Number(o.ore) || 0, tariffa: tariffaOraria(o), pacchetto: p.pacchetto || "" };
  }
  return { servizio: modulo.servizio.value, ambiente: modulo.ambiente.value, mq: Math.round(Number(modulo.mq.value)) || 0,
    frequenza: modulo.frequenza.value, ore: Math.round(Number(modulo.ore.value)) || 0, tariffa: Number(modulo.tariffa.value) || 0,
    pacchetto: modulo.pacchetto.value };
}

// Pacchetto standard per nome (null se «su misura» o non più in config.js)
function trovaPacchetto(nome) {
  return CONFIG.preventivo.pacchetti.find((p) => p.nome === nome) || null;
}

// Ore e tariffa di un pacchetto: ore dalle misure (resa e frequenza), tariffa = prezzo annuo (mq × €/mq) ÷ 12 ÷ ore
function contiPacchetto(p, mq, ambiente) {
  const prev = calcolaPreventivo({ servizio: p.servizio, mq, ambiente: ambiente || p.ambiente, frequenza: p.frequenza });
  if (!prev) return null;
  const anno = mq * p.prezzoMqAnno;
  return { ore: prev.ore, tariffa: Math.round(anno / 12 / prev.ore * 100) / 100, anno };
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
    <a class="link-indietro" href="#oggi">${icona("indietro")} Oggi</a>
    ${intestazione({
      occhiello: "Preventivo · rif. " + esc(o.codice),
      titolo: esc(nomeCliente(o)),
      istruzione: "Scegli un pacchetto o parti dalle misure, controlla margine e casi simili, poi stampa l'offerta per il cliente e segnala come inviata.",
    })}
    <p class="avviso-stima">${icona("attenzione")} È una stima: va confermata dopo il sopralluogo.</p>
    <div class="preventivo-griglia">
      <form class="modulo riquadro" id="modulo-preventivo" data-id="${esc(o.id)}" novalidate>
        <h2 class="titolo-riquadro">1. Il servizio</h2>
        <label>Pacchetto <select name="pacchetto"><option value="">Su misura</option>
          ${CONFIG.preventivo.pacchetti.map((p) => `<option value="${esc(p.nome)}" ${p.nome === v.pacchetto ? "selected" : ""}>${esc(p.nome)}: ${esc(p.frequenza)}, ${formattaEuro(p.prezzoMqAnno)} al mq all'anno</option>`).join("")}
        </select></label>
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
        <p class="nota-piccola">Cambiando misure, frequenza o pacchetto, ore e tariffa si ricalcolano; poi puoi correggerle a mano (il pacchetto diventa «su misura»).</p>
        <div class="azioni-finestra">
          <button class="pulsante secondario" type="button" data-azione="stampa-preventivo">Stampa l'offerta per il cliente</button>
          <button class="pulsante secondario" type="submit">Salva il preventivo</button>
          ${!inOfferta && !o.perso && !o.storico.contratto ? `<button class="pulsante primario" type="button" data-azione="registra-offerta" data-id="${esc(o.id)}">Segna l'offerta come inviata</button>` : ""}
        </div>
      </form>
      <div id="risultato-preventivo">${risultatoPreventivo(o, v)}</div>
    </div>`;
}

// Prima di inviare l'offerta: c'è una squadra della zona con abbastanza ore libere al mese? (US 6, PASSAGGIO 5)
function capacitaPreventivo(o, v) {
  const lavoro = { comune: o.comune, servizio: v.servizio || o.servizio };
  const zona = infoComune(o.comune).zona;
  const libere = CONFIG.squadre.filter((sq) => squadraCopre(sq, lavoro)).map((sq) => ({ sq, ore: oreLibereSquadra(sq, stato.opportunita, o.id) }))
    .sort((a, b) => b.ore - a.ore);
  const migliore = libere[0];
  if (migliore && migliore.ore >= v.ore) {
    return `<p class="nota-piccola capacita-preventivo" id="capacita-preventivo">${icona("spunta")} Capacità: ${esc(migliore.sq.nome)} ha ${migliore.ore} ore libere al mese in zona ${esc(zona)}, l'offerta ne chiede ${v.ore}.</p>`;
  }
  const quante = migliore ? Math.max(0, migliore.ore) : 0;
  return `<p class="avviso-margine capacita-preventivo" id="capacita-preventivo">${icona("attenzione")} Capacità insufficiente: ${migliore
    ? `la squadra più libera della zona ${esc(zona)} (${esc(migliore.sq.nome)}) ha ${quante} ore al mese`
    : `nessuna squadra interna copre questo servizio in zona ${esc(zona)}`}, l'offerta ne chiede ${v.ore}. Prima di inviarla verifica un partner in Allocazione o concorda una data di avvio più avanti.</p>`;
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
  const pacchetto = trovaPacchetto(v.pacchetto);
  const validaFino = o.storico.offerta && o.scadenzaOfferta ? o.scadenzaOfferta : aggiungiGiorni(oggi(), CONFIG.giorniValiditaOfferta);
  const tariffaRif = (valore, testo) => valore === null ? "" : `<button class="pulsante secondario piccolo" type="button" data-azione="usa-tariffa" data-valore="${valore}">${testo}: ${euroOra(valore)}</button>`;
  return `
    <section class="riquadro conti-preventivo">
      <h2 class="titolo-riquadro">2. Il preventivo ${badgePunteggio(c.punteggio)}</h2>
      <p class="preventivo-prezzo"><strong>${formattaEuro(c.mese)}</strong> al mese · <strong>${formattaEuro(c.anno)}</strong> all'anno</p>
      ${pacchetto ? `<p class="nota-piccola">Pacchetto ${esc(pacchetto.nome)}: ${v.mq} mq × ${formattaEuro(pacchetto.prezzoMqAnno)} al mq all'anno.</p>` : ""}
      <table class="criteri"><tbody>
        <tr><td>Ore al mese × tariffa</td><td class="punti">${v.ore} h × ${euroOra(v.tariffa)}</td></tr>
        <tr><td>Costo del lavoro (${c.esecutore === "squadra" ? "squadra interna" : "impresa partner"})</td><td class="punti">${euroOra(c.costoOrario)}</td></tr>
        <tr><td>Spese dirette${amb ? " (" + esc(amb.nome.toLowerCase()) + ")" : ""}</td><td class="punti">${formattaPercentuale(c.spese)} del prezzo</td></tr>
        <tr><td><strong>Margine</strong></td><td class="punti"><span class="chip chip-${tono}">${formattaPercentualeDecimale(c.margine)} · ${formattaEuro(c.margineAnno)}/anno</span></td></tr>
      </tbody></table>
      ${c.margine < minimo ? `<p class="avviso-margine">${icona("attenzione")} Sotto il margine minimo del ${formattaPercentuale(minimo)}: alza la tariffa almeno a ${euroOra(c.minima)}.</p>` : ""}
      ${capacitaPreventivo(o, v)}
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
    <section class="stampa-preventivo" id="stampa-preventivo" aria-label="Offerta per il cliente">
      <p class="marchio-stampa">Gate <span>S.R.L.</span></p>
      <h2>Offerta di servizio${pacchetto ? " · pacchetto " + esc(pacchetto.nome) : ""} · ${esc(nomeCliente(o))}</h2>
      <p>Rif. ${esc(o.codice)} · ${formattaData(oggi())} · sede di lavoro: ${esc(o.comune)}</p>
      <table class="tabella"><tbody>
        <tr><td>Servizio</td><td>${esc(maiuscola(v.servizio))}</td></tr>
        ${amb && v.mq ? `<tr><td>Ambienti</td><td>${esc(amb.nome)}, circa ${v.mq} mq</td></tr>` : ""}
        ${freq ? `<tr><td>Frequenza</td><td>${esc(freq.nome)}</td></tr>` : ""}
        ${pacchetto ? `<tr><td>Servizi inclusi</td><td>${pacchetto.inclusi.map(esc).join("; ")}</td></tr>
          <tr><td>Servizi opzionali (su richiesta)</td><td>${pacchetto.opzionali.map(esc).join("; ")}</td></tr>` : `<tr><td>Ore previste</td><td>${v.ore} ore al mese</td></tr>`}
        <tr><td>Prezzo</td><td><strong>${formattaEuro(c.anno)} all'anno</strong> (${formattaEuro(c.mese)} al mese), IVA esclusa</td></tr>
        <tr><td>Validità</td><td>${CONFIG.giorniValiditaOfferta} giorni, fino al ${formattaData(validaFino)}</td></tr>
      </tbody></table>
      <h3>Condizioni essenziali</h3>
      <ul class="elenco-semplice">${CONFIG.preventivo.condizioni.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <p class="nota-piccola">Per accettare: firma dal link ricevuto con questa offerta, senza registrarti.</p>
    </section>`;
}

// Ridisegna solo i risultati, così il campo in cui si scrive non perde il cursore
function aggiornaPreventivo(modulo, campo) {
  const o = trova(modulo.dataset.id);
  if (!o) return;
  const pacchetto = trovaPacchetto(modulo.pacchetto.value);
  // Pacchetto scelto: frequenza, ambienti e servizio del pacchetto; ore e tariffa dal prezzo al mq
  if (campo && campo.name === "pacchetto" && pacchetto) {
    modulo.frequenza.value = pacchetto.frequenza;
    if (!modulo.ambiente.value) modulo.ambiente.value = pacchetto.ambiente;
    if (!modulo.servizio.disabled) modulo.servizio.value = pacchetto.servizio;
  }
  // Frequenza, servizio, ore o tariffa cambiati a mano: il preventivo diventa su misura
  if (campo && pacchetto && ["frequenza", "servizio", "ore", "tariffa"].includes(campo.name)) modulo.pacchetto.value = "";
  const conPacchetto = trovaPacchetto(modulo.pacchetto.value);
  if (campo && conPacchetto && ["pacchetto", "ambiente", "mq"].includes(campo.name)) {
    const conti = contiPacchetto(conPacchetto, Number(modulo.mq.value), modulo.ambiente.value);
    if (conti) {
      modulo.ore.value = conti.ore;
      modulo.tariffa.value = conti.tariffa;
    }
  } else if (campo && ["servizio", "ambiente", "mq", "frequenza"].includes(campo.name)) {
    // Misure, frequenza o servizio cambiati: ore e tariffa tornano quelle calcolate
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
    if (amb && v.mq > 0) o.preventivo = { ambiente: amb.nome, mq: v.mq, frequenza: v.frequenza, ...(trovaPacchetto(v.pacchetto) ? { pacchetto: v.pacchetto } : {}) };
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: "Preventivo" + (trovaPacchetto(v.pacchetto) ? " (pacchetto " + v.pacchetto + ")" : "") + ": "
      + v.ore + " h/mese a " + euroOra(v.tariffa) + " = " + formattaEuro(v.ore * v.tariffa * 12) + "/anno" });
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
  // Salva il preventivo e apre la finestra «Offerta inviata» con la tariffa scelta.
  // Un'offerta da pacchetto può partire anche senza sopralluogo: le fasi saltate si registrano con la stessa data, dichiarate nella cronologia
  "registra-offerta": () => salvaPreventivo(document.getElementById("modulo-preventivo"), (o) => {
    const offerta = CONFIG.fasi.find((f) => f.id === "offerta");
    if (faseRaggiunta(o) < CONFIG.fasi.indexOf(offerta) - 1) {
      applica(() => {
        CONFIG.fasi.slice(faseRaggiunta(o) + 1, CONFIG.fasi.indexOf(offerta)).forEach((f) =>
          registraFase(o, f, oggi(), f.id === "sopralluogo" ? "sopralluogo non necessario: offerta da pacchetto standard" : "registrata con l'offerta"));
      }, { messaggio: "Fasi precedenti registrate con l'offerta", evidenzia: o.id, annullabile: false });
    }
    apriFase(o, offerta);
  }),
});

GESTORI_MODULI["modulo-preventivo"] = (modulo) => salvaPreventivo(modulo);

document.addEventListener("input", (evento) => {
  const modulo = evento.target.closest("#modulo-preventivo");
  if (modulo) aggiornaPreventivo(modulo, evento.target.tagName === "INPUT" && ["ore", "tariffa"].includes(evento.target.name) ? null : evento.target);
});
