/*
 * APPLICAZIONE
 * Le schermate Pipeline, Allocazione e Indicatori, le finestre di dialogo,
 * la gestione dei clic e il disegno della pagina. La schermata Clienti è in clienti.js,
 * il salvataggio dei dati in dati.js.
 */

let stato = carica();
let faseSelezionata = "contatto"; // fase mostrata su schermi stretti
let ultimaModificata = null;      // scheda da evidenziare dopo un'azione

// ================================================================== ICONE

const ICONE = {
  piu: '<path d="M12 5v14M5 12h14"/>',
  freccia: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  spunta: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  attenzione: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  messaggio: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  orologio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  telefono: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  email: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  indietro: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  matita: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  cerca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
};

function icona(nome) {
  return '<svg class="icona" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONE[nome] + "</svg>";
}

// ====================================================== PEZZI RIUTILIZZABILI

function intestazione({ occhiello, titolo, istruzione, azione = "" }) {
  return `
    <header class="intestazione">
      <div>
        <p class="occhiello">${occhiello}</p>
        <h1>${titolo}</h1>
        <p class="istruzione">${istruzione}</p>
      </div>
      ${azione}
    </header>`;
}

function badgePunteggio(p) {
  return `<span class="badge badge-${p.classe}" title="Punteggio di coerenza: ${p.totale} su 100">${p.classe} · ${p.totale}</span>`;
}

// Tabella dei 6 criteri del punteggio, con i punti ottenuti
function tabellaCriteri(p) {
  return `
    <table class="criteri">
      <tbody>
        ${p.criteri.map((c) => `
          <tr>
            <td>${c.nome}</td>
            <td>${esc(c.nota)}</td>
            <td class="punti">${c.punti}/${c.peso}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

// ================================================================ PIPELINE

function disegnaPipeline() {
  const tutte = stato.opportunita;
  const punteggi = new Map(tutte.map((o) => [o.id, calcolaPunteggio(o, tutte)]));
  const aperte = tutte.filter(trattativaAperta);
  const classi = { A: 0, B: 0, C: 0 };
  aperte.forEach((o) => classi[punteggi.get(o.id).classe]++);

  // Colonne: le 5 fasi più "Perso"
  const colonne = CONFIG.fasi.map((f) => ({ id: f.id, nome: f.nome, metodo: f.metodo }));
  colonne.push({ id: "perso", nome: "Perso" });
  const perColonna = (id) => tutte
    .filter((o) => faseAttuale(o) === id)
    .sort((a, b) => dataFaseAttuale(b).localeCompare(dataFaseAttuale(a)));

  return `
    ${intestazione({
      occhiello: "Pipeline commerciale",
      titolo: "Opportunità commerciali",
      istruzione: "Registra ogni passo quando è avvenuto e tieni sempre una prossima azione. Il punteggio A/B/C dice quanto è coerente con capacità e margini.",
      azione: `<button class="pulsante accento" type="button" data-azione="nuovo">${icona("piu")} Nuovo contatto</button>`,
    })}

    <section class="riepilogo" aria-label="Riepilogo">
      <div><span>In trattativa</span><strong>${aperte.length}</strong></div>
      <div><span>Valore annuo in trattativa</span><strong>${formattaEuro(aperte.reduce((s, o) => s + valoreAnnuo(o), 0))}</strong></div>
      <div><span>Coerenza delle trattative</span><strong>
        <span class="badge badge-A">A ${classi.A}</span>
        <span class="badge badge-B">B ${classi.B}</span>
        <span class="badge badge-C">C ${classi.C}</span></strong></div>
    </section>

    <div class="pannelli-pipeline">
      ${sezioneDaFare()}
      ${sezioneDaSeguire()}
    </div>

    <nav class="selettore-fasi" aria-label="Scegli la fase da vedere">
      ${colonne.map((c) => `
        <button class="fase-pulsante" type="button" data-azione="fase" data-id="${c.id}" aria-pressed="${c.id === faseSelezionata}">
          ${c.nome} <span class="conteggio">${perColonna(c.id).length}</span>
        </button>`).join("")}
    </nav>

    <div class="tabellone">
      ${colonne.map((c) => {
        const elenco = perColonna(c.id);
        return `
          <section class="colonna colonna-${c.id} ${c.id === faseSelezionata ? "attiva" : ""}" aria-label="${c.nome}">
            <header class="colonna-testa">
              <h2>${c.nome}</h2>
              ${c.metodo ? `<span class="metodo" title="Passo del metodo Gate">${c.metodo}</span>` : ""}
              <span class="conteggio">${elenco.length}</span>
            </header>
            <div class="colonna-corpo">
              ${elenco.length ? elenco.map((o) => schedaOpportunita(o, punteggi.get(o.id))).join("")
                : '<p class="vuoto">Nessuna opportunità in questa fase.</p>'}
            </div>
          </section>`;
      }).join("")}
    </div>`;
}

function schedaOpportunita(o, p) {
  const fase = faseAttuale(o);
  let fondo;
  if (fase === "perso") {
    fondo = `<p class="scheda-nota">Perso il ${formattaData(o.perso.data)} · ${esc(o.perso.motivo)}</p>`;
  } else if (fase === "contratto") {
    fondo = statoCommessa(o);
  } else {
    // In Qualificato, prima si fissa il sopralluogo in agenda; poi si registra che è stato fatto
    const fissato = fase === "qualificato" ? sopralluogoFissato(o) : null;
    const pulsante = fase === "qualificato" && !fissato
      ? `<button class="pulsante primario piccolo" type="button" data-azione="fissa-sopralluogo" data-id="${esc(o.id)}">${icona("calendario")} Fissa sopralluogo</button>`
      : `<button class="pulsante primario piccolo" type="button" data-azione="avanza" data-id="${esc(o.id)}" title="Registra che è già avvenuto">${icona("spunta")} ${CONFIG.fasi[faseRaggiunta(o)].azione}</button>`;
    fondo = `
      ${infoFase(o, fissato)}
      ${rigaStatoTrattativa(o)}
      <div class="scheda-azioni">
        ${pulsante}
        <button class="pulsante-testo" type="button" data-azione="perso" data-id="${esc(o.id)}">Segna come perso</button>
      </div>`;
  }
  return `
    <article class="scheda ${o.id === ultimaModificata ? "evidenziata" : ""}" id="scheda-${esc(o.id)}">
      <div class="scheda-alto">
        <button class="scheda-nome" type="button" data-azione="dettaglio" data-id="${esc(o.id)}" title="Apri il dettaglio">${esc(nomeCliente(o))}</button>
        ${badgePunteggio(p)}
      </div>
      <p class="scheda-meta">${esc(settoreDi(o))} · ${esc(o.comune)}</p>
      <p class="scheda-meta">${esc(o.servizio)} · ${Number(o.ore)} h/mese</p>
      <p class="scheda-valore">${formattaEuro(valoreAnnuo(o))}/anno · margine ${formattaPercentuale(marginePercentuale(o, stato.opportunita))}</p>
      ${fondo}
    </article>`;
}

// Informazioni della fase: sopralluogo fissato (Qualificato) o validità dell'offerta (Offerta)
function infoFase(o, fissato) {
  if (fissato) {
    return `<p class="scheda-info">${icona("calendario")} Sopralluogo ${formattaGiorno(fissato.data)}${fissato.ora ? " · ore " + esc(fissato.ora) : ""}</p>`;
  }
  if (faseAttuale(o) === "offerta" && o.scadenzaOfferta) {
    return o.scadenzaOfferta < oggi()
      ? `<p class="scheda-info"><span class="chip chip-critico">${icona("attenzione")} Offerta scaduta il ${formattaData(o.scadenzaOfferta).slice(0, 5)}</span></p>`
      : `<p class="scheda-info">Valida fino al ${formattaData(o.scadenzaOfferta).slice(0, 5)}</p>`;
  }
  return "";
}

// Riga di stato di una trattativa aperta: prossima azione (o «Fissala») e trattativa ferma
function rigaStatoTrattativa(o) {
  const s = statoTrattativa(o);
  const prossima = s.prossima
    ? `${scadenza(s.prossima.data)} <span class="stato-testo" title="${esc(s.prossima.testo)}">${esc(accorcia(s.prossima.testo, 40))}</span>`
    : `<span class="chip chip-attenzione">Nessuna prossima azione</span>
       <button class="pulsante-testo positivo" type="button" data-azione="prossima-azione" data-id="${esc(o.aziendaId)}">Fissala</button>`;
  return `<p class="scheda-stato-trattativa">${s.ferma ? `<span class="chip chip-critico">Ferma da ${giorni(s.giorniInFase)}</span>` : ""}${prossima}</p>`;
}

// Riga di stato per i contratti: assegnato, in attesa del partner o da assegnare
function statoCommessa(o) {
  if (o.allocazione) {
    const nome = o.allocazione.tipo === "squadra"
      ? nomeSquadra(o.allocazione.id)
      : "Partner: " + nomePartner(o.allocazione.id);
    return `<p class="scheda-stato ok">${icona("spunta")} ${esc(nome)}</p>`;
  }
  const attesa = propostaInAttesa(o);
  const testo = attesa ? "In attesa di risposta da " + nomePartner(attesa.partnerId) : "Da assegnare";
  return `
    <p class="scheda-stato ${attesa ? "attesa" : "da-fare"}">${icona("orologio")} ${esc(testo)}</p>
    <a class="pulsante primario piccolo" href="#allocazione">Vai all'allocazione ${icona("freccia")}</a>`;
}

// ============================================================= ALLOCAZIONE

function disegnaAllocazione() {
  const tutte = stato.opportunita;
  const firmati = tutte.filter((o) => o.storico.contratto && !o.perso);
  const daAssegnare = firmati.filter((o) => !o.allocazione)
    .sort((a, b) => b.storico.contratto.localeCompare(a.storico.contratto));
  const assegnate = firmati.filter((o) => o.allocazione);

  // Tutte le proposte inviate ai partner, dalla più recente
  const registro = tutte
    .flatMap((o) => (o.proposte || []).map((p, i) => ({ ...p, ordine: i, opp: o })))
    .sort((a, b) => b.data.localeCompare(a.data) || b.ordine - a.ordine);
  const esiti = {
    attesa: `<span class="stato attenzione">${icona("orologio")} In attesa</span>`,
    si: `<span class="stato ok">${icona("spunta")} SÌ</span>`,
    no: `<span class="stato critico">${icona("x")} NO</span>`,
  };

  return `
    ${intestazione({
      occhiello: "Allocazione della capacità",
      titolo: "Chi esegue il servizio",
      istruzione: "Assegna ogni contratto firmato: prima a una squadra Gate con ore libere nella zona, altrimenti proponilo a un'impresa partner su WhatsApp.",
    })}

    <ul class="regole" aria-label="Regole">
      <li>${icona("spunta")} Prima le squadre interne con ore libere nella zona</li>
      <li>${icona("spunta")} Solo imprese partner con DURC regolare, nessun lavoratore autonomo</li>
      <li>${icona("spunta")} Il cliente resta di Gate: Gate firma il contratto e controlla la qualità</li>
    </ul>

    <section class="sezione">
      <h2>Da assegnare <span class="conteggio">${daAssegnare.length}</span></h2>
      ${daAssegnare.length ? daAssegnare.map(schedaCommessa).join("")
        : '<p class="vuoto">Nessuna commessa da assegnare. I contratti firmati nella Pipeline compaiono qui.</p>'}
    </section>

    <section class="sezione">
      <h2>Commesse assegnate <span class="conteggio">${assegnate.length}</span></h2>
      ${assegnate.length ? `
        <div class="tabella-scorrevole">
          <table class="tabella">
            <thead><tr><th>Rif.</th><th>Cliente</th><th>Servizio</th><th>Comune</th><th class="num">Ore/mese</th><th>Eseguita da</th><th class="num">Margine</th></tr></thead>
            <tbody>
              ${assegnate.map((o) => {
                const interna = o.allocazione.tipo === "squadra";
                const chi = interna ? nomeSquadra(o.allocazione.id) : nomePartner(o.allocazione.id);
                return `<tr>
                  <td>${esc(o.codice)}</td><td><a class="link" href="#cliente-${esc(o.aziendaId)}">${esc(nomeCliente(o))}</a></td><td>${esc(o.servizio)}</td><td>${esc(o.comune)}</td>
                  <td class="num">${Number(o.ore)}</td>
                  <td>${esc(chi)}<br><span class="nota-piccola">${interna ? "Squadra interna" : "Impresa partner"}</span></td>
                  <td class="num">${formattaPercentuale(marginePercentuale(o, tutte))}</td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>` : '<p class="vuoto">Ancora nessuna commessa assegnata.</p>'}
    </section>

    <section class="sezione">
      <h2>Squadre interne <span class="sottotitolo">ore al mese</span></h2>
      <div class="griglia tre">${CONFIG.squadre.map(schedaSquadra).join("")}</div>
    </section>

    <section class="sezione">
      <h2>Imprese partner <span class="sottotitolo">in ordine di priorità</span></h2>
      <div class="griglia tre">${CONFIG.partner.map(schedaPartner).join("")}</div>
    </section>

    <section class="sezione">
      <h2>Registro delle proposte <span class="conteggio">${registro.length}</span></h2>
      ${registro.length ? `
        <div class="tabella-scorrevole">
          <table class="tabella">
            <thead><tr><th>Data</th><th>Commessa</th><th>Partner</th><th>Esito</th></tr></thead>
            <tbody>
              ${registro.map((r) => `<tr>
                <td>${formattaData(r.data)}</td>
                <td>${esc(r.opp.codice)} · ${esc(nomeCliente(r.opp))}</td>
                <td>${esc(nomePartner(r.partnerId))}</td>
                <td>${esiti[r.esito]}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>` : '<p class="vuoto">Nessuna proposta inviata.</p>'}
    </section>

    <section class="sezione futura" aria-label="Evoluzione futura">
      <p class="etichetta-futura">Evoluzione futura · non incluso nel pilota</p>
      <h2>Portale partner</h2>
      <p class="nota-piccola">Nel pilota il partner risponde SÌ o NO su WhatsApp e non usa nessuna app: la tecnologia sta solo dal lato Gate.
        In futuro un portale potrebbe permettere al partner di vedere le richieste, rispondere con un clic e caricare il DURC aggiornato.</p>
      <div class="anteprima-portale" aria-hidden="true">
        <p class="commessa-codice">RICHIESTA DA GATE S.R.L.</p>
        <p><strong>Pulizia Professionale · Modugno</strong></p>
        <p class="nota-piccola">60 ore al mese · avvio tra 15 giorni</p>
        <div class="pulsanti-risposta">
          <button class="pulsante si piccolo" type="button" disabled tabindex="-1">Accetto</button>
          <button class="pulsante no piccolo" type="button" disabled tabindex="-1">Rifiuto</button>
        </div>
      </div>
    </section>`;
}

// Scheda di una commessa da assegnare: squadra interna o proposta al partner
function schedaCommessa(o) {
  const zona = infoComune(o.comune).zona;
  const squadra = squadraDisponibile(o, stato.opportunita);
  let passo;

  if (squadra) {
    // 1. C'è una squadra interna con ore libere
    passo = `
      <div class="passo passo-squadra">
        <p class="passo-titolo">${icona("spunta")} Squadra interna disponibile</p>
        <p><strong>${esc(squadra.nome)}</strong> · ${esc(squadra.caposquadra)} · ${oreLibereSquadra(squadra, stato.opportunita, o.id)} ore libere al mese (ne servono ${Number(o.ore)})</p>
        <button class="pulsante primario" type="button" data-azione="assegna-squadra" data-id="${esc(o.id)}">Assegna a ${esc(squadra.nome)}</button>
      </div>`;
  } else {
    // 2. Nessuna squadra: si propone a un partner, uno alla volta
    const rifiuti = (o.proposte || []).filter((p) => p.esito === "no");
    const attesa = propostaInAttesa(o);
    let corpo;
    if (attesa) {
      // Se il partner è stato tolto da config.js si può solo registrare il NO e passare al successivo
      const partner = trovaPartner(attesa.partnerId);
      corpo = `
        <p class="passo-titolo">${icona("orologio")} In attesa di risposta da ${esc(nomePartner(attesa.partnerId))}</p>
        <p class="nota-piccola">Proposta inviata il ${formattaData(attesa.data)}. Registra qui la risposta arrivata su WhatsApp:</p>
        <div class="pulsanti-risposta">
          ${partner ? `<button class="pulsante si" type="button" data-azione="risposta-si" data-id="${esc(o.id)}">${icona("spunta")} Ha risposto SÌ</button>` : ""}
          <button class="pulsante no" type="button" data-azione="risposta-no" data-id="${esc(o.id)}">${icona("x")} Ha risposto NO</button>
        </div>
        ${partner ? `<a class="link" href="${esc(linkWhatsApp(o, partner))}" target="_blank" rel="noopener">Riapri il messaggio su WhatsApp</a>` : ""}`;
    } else {
      const partner = prossimoPartner(o);
      if (partner) {
        corpo = `
          <p class="passo-titolo">Partner proposto: ${esc(partner.nome)}</p>
          <p class="nota-piccola">${requisitiPartner(partner).testo} · zone: ${esc(partner.zone.join(", "))}</p>
          <blockquote class="messaggio"><span class="messaggio-titolo">Messaggio precompilato</span>${esc(testoWhatsApp(o, partner)).replace(/\n/g, "<br>")}</blockquote>
          <a class="pulsante whatsapp" href="${esc(linkWhatsApp(o, partner))}" target="_blank" rel="noopener"
             data-azione="proponi" data-id="${esc(o.id)}" data-partner="${esc(partner.id)}">${icona("messaggio")} Proponi su WhatsApp</a>`;
      } else if (rifiuti.length) {
        corpo = `
          <p class="passo-titolo avviso">${icona("attenzione")} Tutti i partner idonei hanno risposto NO</p>
          <p class="nota-piccola">Valuta con il cliente un rinvio dell'avvio o cerca un nuovo partner con DURC regolare in ${esc(zona)}.</p>`;
      } else {
        corpo = `
          <p class="passo-titolo avviso">${icona("attenzione")} Nessun partner idoneo in ${esc(zona)}</p>
          <p class="nota-piccola">Valuta con il cliente un rinvio dell'avvio o cerca un partner con DURC regolare in questa zona.</p>`;
      }
    }
    passo = `
      <div class="passo passo-partner">
        <p class="avviso-capacita">${icona("attenzione")} Nessuna squadra interna in ${esc(zona)} ha ${Number(o.ore)} ore libere al mese per ${esc(o.servizio.toLowerCase())}.</p>
        ${rifiuti.length ? `<ul class="rifiuti">${rifiuti.map((r) => `<li>${icona("x")} ${esc(nomePartner(r.partnerId))} ha risposto NO il ${formattaData(r.data)}</li>`).join("")}</ul>` : ""}
        ${corpo}
      </div>`;
  }

  return `
    <article class="riquadro commessa ${o.id === ultimaModificata ? "evidenziata" : ""}" id="commessa-${esc(o.id)}">
      <header class="commessa-testa">
        <div>
          <p class="commessa-codice">${esc(o.codice)}</p>
          <h3><a class="link-titolo" href="#cliente-${esc(o.aziendaId)}">${esc(nomeCliente(o))}</a></h3>
        </div>
        <p class="commessa-dati">${esc(o.servizio)} · ${esc(o.comune)} (${esc(zona)}) · ${Number(o.ore)} h/mese · firmato il ${formattaData(o.storico.contratto)}</p>
      </header>
      ${passo}
    </article>`;
}

function schedaSquadra(s) {
  const libere = oreLibereSquadra(s, stato.opportunita);
  const impegnate = s.oreCapacita - libere;
  const quota = Math.min(1, impegnate / s.oreCapacita);
  const satura = libere <= 0;
  return `
    <article class="riquadro">
      <h3>${s.nome}</h3>
      <p class="partner-dati">${s.caposquadra} · ${s.zone.join(", ")}</p>
      <p class="partner-dati">${s.servizi.join(", ")}</p>
      <div class="misuratore" role="meter" aria-label="Ore impegnate" aria-valuemin="0" aria-valuemax="${s.oreCapacita}" aria-valuenow="${impegnate}">
        <span class="${satura ? "satura" : ""}" style="width:${quota * 100}%"></span>
      </div>
      <p class="misuratore-legenda"><strong>${Math.max(0, libere)} ore libere</strong> su ${s.oreCapacita}
        ${satura ? `· <span class="stato attenzione">${icona("attenzione")} Satura</span>` : ""}</p>
    </article>`;
}

function schedaPartner(p) {
  const req = requisitiPartner(p);
  return `
    <article class="riquadro ${req.idoneo ? "" : "partner-escluso"}">
      <h3>${p.nome}</h3>
      <p class="partner-dati">${p.tipo === "impresa" ? "Impresa" : "Lavoratore autonomo"} · ${p.zone.join(", ")}</p>
      <p class="partner-dati">${p.servizi.join(", ")}</p>
      <p class="stato ${req.idoneo ? "ok" : "critico"}" style="margin-top:8px">${icona(req.idoneo ? "spunta" : "x")} ${req.testo}</p>
    </article>`;
}

// ============================================================== INDICATORI

function disegnaIndicatori() {
  const tutte = stato.opportunita;
  const k = calcolaKpi(tutte);
  const ob = CONFIG.obiettivi;
  const c = CONFIG.costiAcquisizione;
  const funnel = calcolaFunnel(tutte);
  const settori = risultatiPerSettore(tutte);
  const firmati = tutte.filter((o) => o.storico.contratto && !o.perso);
  const interne = firmati.filter((o) => o.allocazione && o.allocazione.tipo === "squadra").length;
  const aPartner = firmati.filter((o) => o.allocazione && o.allocazione.tipo === "partner").length;
  const perse = tutte.filter((o) => o.perso);
  const motivi = {};
  perse.forEach((o) => (motivi[o.perso.motivo] = (motivi[o.perso.motivo] || 0) + 1));
  const n = (x) => x.toLocaleString("it-IT");

  const efficacia = [
    tesseraKpi({
      etichetta: "Contatti qualificati",
      valore: n(k.qualificati),
      dettaglio: formattaPercentuale(k.tassoQualificati) + " dei " + k.contatti + " contatti",
      formula: `Contatti arrivati almeno a «Qualificato» ÷ contatti totali = ${k.qualificati} ÷ ${k.contatti} = ${formattaPercentuale(k.tassoQualificati)}`,
      obiettivo: "≥ " + formattaPercentuale(ob.tassoQualificati),
      raggiunto: k.tassoQualificati >= ob.tassoQualificati,
    }),
    tesseraKpi({
      etichetta: "Appuntamenti (sopralluoghi)",
      valore: n(k.sopralluoghi),
      dettaglio: formattaPercentuale(k.tassoSopralluoghi) + " dei contatti qualificati",
      formula: `Sopralluoghi fatti ÷ contatti qualificati = ${k.sopralluoghi} ÷ ${k.qualificati} = ${formattaPercentuale(k.tassoSopralluoghi)}`,
      obiettivo: "≥ " + formattaPercentuale(ob.tassoSopralluoghi),
      raggiunto: k.tassoSopralluoghi >= ob.tassoSopralluoghi,
    }),
    tesseraKpi({
      etichetta: "Conversione delle offerte",
      valore: formattaPercentuale(k.conversioneOfferte),
      dettaglio: k.contratti + " contratti su " + k.offerte + " offerte presentate",
      formula: `Contratti firmati ÷ offerte presentate (comprese quelle ancora in attesa di risposta) = ${k.contratti} ÷ ${k.offerte} = ${formattaPercentuale(k.conversioneOfferte)}`,
      obiettivo: "≥ " + formattaPercentuale(ob.conversioneOfferte),
      raggiunto: k.conversioneOfferte >= ob.conversioneOfferte,
    }),
  ];

  const efficienza = [
    tesseraKpi({
      etichetta: "Costo di acquisizione",
      valore: k.contratti ? formattaEuro(k.costoAcquisizione) : "n.d.",
      dettaglio: "per ogni contratto firmato",
      formula: `(${k.contatti} contatti × ${formattaEuro(c.perContatto)} + ${k.sopralluoghi} sopralluoghi × ${formattaEuro(c.perSopralluogo)} + ${k.offerte} offerte × ${formattaEuro(c.perOfferta)} + ${formattaEuro(costiFissiTotali())} di costi dei canali) ÷ ${k.contratti} contratti = ${formattaEuro(k.costiCommerciali)} ÷ ${k.contratti} = ${k.contratti ? formattaEuro(k.costoAcquisizione) : "n.d."}`,
      obiettivo: "≤ " + formattaEuro(ob.costoAcquisizioneMax),
      raggiunto: k.contratti > 0 && k.costoAcquisizione <= ob.costoAcquisizioneMax,
    }),
    tesseraKpi({
      etichetta: "Margine atteso",
      valore: formattaEuro(k.margineAtteso),
      dettaglio: "all'anno · marginalità media " + formattaPercentuale(k.marginalitaMedia),
      formula: `Somma di (valore annuo × margine % × probabilità di chiusura della fase) sulle opportunità non perse = ${formattaEuro(k.margineAtteso)}.<br>
        Probabilità: ${CONFIG.fasi.map((f) => f.nome + " " + formattaPercentuale(f.probabilita)).join(" · ")}.<br>
        Il margine % usa il costo della squadra interna o del partner, secondo chi esegue.`,
      obiettivo: "marginalità ≥ " + formattaPercentuale(ob.marginalitaMedia),
      raggiunto: k.marginalitaMedia >= ob.marginalitaMedia,
    }),
  ];

  const massimo = funnel[0].n || 1;

  return `
    ${intestazione({
      occhiello: "Indicatori di performance",
      titolo: "Dai contatti ai contratti",
      istruzione: "Leggi l'andamento del pilota: ogni indicatore mostra la formula e i numeri da cui nasce.",
    })}

    <section class="sezione" style="margin-top:0">
      <h2>Efficacia <span class="sottotitolo">quanto il processo porta risultati</span></h2>
      <div class="griglia tre">${efficacia.join("")}</div>
    </section>

    <section class="sezione">
      <h2>Efficienza <span class="sottotitolo">quanto costa acquisire e quanto rende</span></h2>
      <div class="griglia">${efficienza.join("")}</div>
    </section>

    <section class="sezione">
      <h2>Funnel commerciale <span class="sottotitolo">opportunità che hanno raggiunto ogni fase, perse comprese</span></h2>
      <div class="riquadro">
        <div class="funnel">
          ${funnel.map((f) => {
            const conv = f.conversione === null ? "" : formattaPercentuale(f.conversione) + " dalla fase prima";
            return `
              <div class="funnel-riga" tabindex="0" title="${f.nome}: ${f.n} opportunità${conv ? " · " + conv : ""}">
                <span class="funnel-fase">${f.nome}</span>
                <span class="funnel-barra"><span style="width:${(f.n / massimo) * 100}%"></span></span>
                <span class="funnel-numero">${f.n}</span>
                <span class="funnel-conv">${f.conversione === null ? "" : "→ " + formattaPercentuale(f.conversione)}</span>
              </div>`;
          }).join("")}
        </div>
        <p class="nota-piccola" style="margin-top:10px">
          → = conversione dalla fase precedente.
          Perse: ${perse.length}${perse.length ? " (" + Object.entries(motivi).map(([m, q]) => esc(m.toLowerCase()) + " " + q).join(", ") + ")" : ""}.
          Commesse firmate: ${firmati.length}, di cui ${interne} a squadre interne, ${aPartner} a partner, ${firmati.length - interne - aPartner} da assegnare.
        </p>
      </div>
    </section>

    <section class="sezione">
      <h2>Risultati per settore <span class="sottotitolo">settore pilota: ${CONFIG.pilota.settore.toLowerCase()}</span></h2>
      <div class="tabella-scorrevole">
        <table class="tabella">
          <thead><tr>
            <th>Settore</th><th class="num">Contatti</th><th class="num">Contratti</th><th class="num">Conversione</th>
            <th class="num">Valore annuo contratti</th><th class="num">Margine atteso</th><th class="num">Quota A</th>
          </tr></thead>
          <tbody>
            ${settori.map((s) => `<tr>
              <td>${s.settore}${s.pilota ? '<span class="chip-pilota">pilota</span>' : ""}</td>
              <td class="num">${s.contatti}</td>
              <td class="num">${s.contratti}</td>
              <td class="num">${s.contatti ? formattaPercentuale(s.conversione) : "–"}</td>
              <td class="num">${formattaEuro(s.valoreContratti)}</td>
              <td class="num">${formattaEuro(s.margineAtteso)}</td>
              <td class="num">${s.contatti ? formattaPercentuale(s.quotaA) : "–"}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <p class="nota-piccola" style="margin-top:8px">Conversione = contratti ÷ contatti del settore. Quota A = opportunità con punteggio A sul totale del settore.</p>
    </section>

    <section class="sezione">
      <h2>Risultati per canale di acquisizione <span class="sottotitolo">da dove arrivano i clienti e quanto costano</span></h2>
      <div class="tabella-scorrevole">
        <table class="tabella">
          <thead><tr>
            <th>Canale</th><th class="num">Contatti</th><th class="num">Contratti</th><th class="num">Conversione</th>
            <th class="num">Costi del canale</th><th class="num">Costo di acquisizione</th>
          </tr></thead>
          <tbody>
            ${risultatiPerCanale(tutte).map((r) => `<tr>
              <td>${r.fonte}</td>
              <td class="num">${r.contatti}</td>
              <td class="num">${r.contratti}</td>
              <td class="num">${r.contatti ? formattaPercentuale(r.conversione) : "–"}</td>
              <td class="num">${formattaEuro(r.costi)}</td>
              <td class="num">${r.costoAcquisizione === null ? "nessun contratto" : formattaEuro(r.costoAcquisizione)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <p class="nota-piccola" style="margin-top:8px">Costi del canale = contatti × ${formattaEuro(CONFIG.costiAcquisizione.perContatto)} + sopralluoghi × ${formattaEuro(CONFIG.costiAcquisizione.perSopralluogo)} + offerte × ${formattaEuro(CONFIG.costiAcquisizione.perOfferta)} + spesa fissa del canale. Il canale è la fonte indicata nella scheda cliente.</p>
    </section>`;
}

function tesseraKpi({ etichetta, valore, dettaglio, formula, obiettivo, raggiunto }) {
  return `
    <article class="riquadro kpi">
      <p class="kpi-etichetta">${etichetta}</p>
      <p class="kpi-valore">${valore}</p>
      <p class="kpi-dettaglio">${dettaglio}</p>
      <p class="kpi-formula"><span class="kpi-formula-titolo">Formula</span>${formula}</p>
      <p class="kpi-obiettivo ${raggiunto ? "ok" : "sotto"}">${icona(raggiunto ? "spunta" : "attenzione")}
        Obiettivo ${obiettivo}: ${raggiunto ? "raggiunto" : "non raggiunto"}</p>
    </article>`;
}

// ===================================================== FINESTRE DI DIALOGO

const finestra = document.getElementById("finestra");

let finestraApertaIl = 0; // quando si è aperta l'ultima finestra (ms)

function apriFinestra(html, etichetta) {
  finestra.innerHTML = `<div class="finestra-contenuto">${html}</div>`;
  finestra.setAttribute("aria-label", etichetta);
  finestraApertaIl = Date.now();
  // Una finestra può aprirne un'altra (es. dal dettaglio a «Modifica»): si cambia solo il contenuto
  if (!finestra.open) finestra.showModal();
  const primo = finestra.querySelector("input, select, textarea");
  if (primo) primo.focus();
}

function chiudiFinestra() {
  finestra.close();
}

// Si può tornare alla fase precedente se la trattativa non è persa e la commessa non è ancora affidata
function puoTornareIndietro(o) {
  return !!o && !o.perso && faseRaggiunta(o) > 0 && !o.allocazione && !propostaInAttesa(o);
}

// Dettaglio di un'opportunità, come scheda di lavoro: dati, referente, punteggio, storico e correzioni
function apriDettaglio(id) {
  const o = trova(id);
  if (!o) return;
  const p = calcolaPunteggio(o, stato.opportunita);
  const s = CONFIG.punteggio.soglie;
  const ref = trovaReferente(o.referenteId);
  const passi = CONFIG.fasi.filter((f) => o.storico[f.id]).map((f) => `<li>${f.nome}: ${formattaData(o.storico[f.id])}</li>` +
    (f.id === "offerta" && o.scadenzaOfferta ? `<li>Offerta valida fino al ${formattaData(o.scadenzaOfferta)}</li>` : "") +
    (f.id === "contratto" && o.avvio ? `<li>Avvio del servizio: ${formattaData(o.avvio)}</li>` : "")).join("");
  const precedente = puoTornareIndietro(o) ? CONFIG.fasi[faseRaggiunta(o) - 1] : null;
  apriFinestra(`
    <div class="finestra-testa"><h2>${esc(nomeCliente(o))}</h2>${badgePunteggio(p)}</div>
    <p class="nota-piccola">${esc(o.servizio)} · ${Number(o.ore)} h/mese · tariffa ${formattaEuro(tariffaOraria(o))}/ora · sede di lavoro: ${esc(o.comune)} · rif. ${esc(o.codice)}</p>
    <div class="dettaglio-referente">
      ${ref ? `<p><strong>Referente:</strong> ${esc(ref.nome)}${ref.ruolo ? " (" + esc(ref.ruolo) + ")" : ""}${ref.telefono ? " · " + esc(telefonoLeggibile(ref.telefono)) : ""}</p>
        <div class="contatti">${pulsantiContatto(ref)}</div>` : "<p><strong>Referente:</strong> non indicato</p>"}
    </div>
    ${o.note ? `<h3>Note sulla trattativa</h3><p class="nota-trattativa">${esc(o.note)}</p>` : ""}
    <h3>Punteggio di coerenza: ${p.totale} su 100 (classe ${p.classe})</h3>
    ${tabellaCriteri(p)}
    <p class="nota-piccola">Classe A da ${s.A} punti, B da ${s.B}, C sotto ${s.B}.</p>
    <h3>Storico</h3>
    <ol class="storico">${passi}${o.perso ? `<li>Perso: ${formattaData(o.perso.data)} · ${esc(o.perso.motivo)}${o.perso.nota ? " · " + esc(o.perso.nota) : ""}</li>` : ""}</ol>
    ${o.motivazioneC ? `<p class="nota-c">Offerta inviata nonostante il punteggio C. Motivazione: ${esc(o.motivazioneC)}</p>` : ""}
    <div class="azioni-finestra">
      ${precedente ? `<button class="pulsante-testo a-sinistra" type="button" data-azione="torna-indietro" data-id="${esc(o.id)}">Torna a «${precedente.nome}»</button>` : ""}
      ${o.perso ? `<button class="pulsante secondario" type="button" data-azione="riapri" data-id="${esc(o.id)}">Riapri la trattativa</button>` : ""}
      <button class="pulsante secondario" type="button" data-azione="modifica-opportunita" data-id="${esc(o.id)}">${icona("matita")} Modifica</button>
      <a class="pulsante secondario" href="#cliente-${esc(o.aziendaId)}" data-azione="chiudi">Apri la scheda cliente</a>
      <button class="pulsante primario" type="button" data-azione="chiudi">Chiudi</button>
    </div>`,
    "Dettaglio opportunità");
}

// Modifica di un'opportunità: servizio, sede, ore, tariffa, referente e note, con l'anteprima del punteggio
function apriModificaOpportunita(id) {
  const o = trova(id);
  if (!o) return;
  const assegnata = !!o.allocazione; // commessa affidata: servizio e sede di lavoro non si cambiano più
  apriFinestra(`
    <form class="modulo" id="modulo-opportunita" data-id="${esc(o.id)}" novalidate>
      <div>
        <h2>Modifica opportunità</h2>
        <p class="nota-piccola">${esc(nomeCliente(o))} · rif. ${esc(o.codice)}. Ogni modifica resta nella cronologia del cliente.</p>
      </div>
      <div class="riga-doppia">
        <label>Servizio <select name="servizio" ${assegnata ? "disabled" : ""}>${opzioni(Object.keys(CONFIG.servizi), o.servizio)}</select></label>
        <label>Sede di lavoro (comune) <select name="comune" ${assegnata ? "disabled" : ""}>${opzioniComuni(o.comune)}</select></label>
      </div>
      ${assegnata ? '<p class="nota-piccola">Commessa già assegnata: servizio e sede di lavoro non si possono cambiare.</p>' : ""}
      <div class="riga-doppia">
        <label>Ore al mese
          <input name="ore" type="number" inputmode="numeric" min="1" step="1" required value="${Number(o.ore)}">
        </label>
        <label>Tariffa oraria (€)
          <input name="tariffa" type="number" inputmode="decimal" min="1" step="0.5" value="${Number(tariffaOraria(o))}">
        </label>
      </div>
      <label>Referente <select name="referente">${opzioniReferenti(o.aziendaId, o.referenteId)}</select></label>
      <label>Note sulla trattativa
        <textarea name="note" placeholder="Es. decide il titolare entro fine mese">${esc(o.note || "")}</textarea>
      </label>
      <div class="anteprima" id="anteprima-punteggio" aria-live="polite"></div>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Salva le modifiche</button>
      </div>
    </form>`, "Modifica opportunità");
  aggiornaAnteprima(document.getElementById("modulo-opportunita"));
}

// Copia dell'opportunità con i valori scritti nel modulo (i campi disabilitati restano quelli salvati)
function leggiModificaOpportunita(modulo) {
  const o = trova(modulo.dataset.id);
  const d = new FormData(modulo);
  const servizio = d.has("servizio") ? d.get("servizio") : o.servizio;
  const tariffa = Number(d.get("tariffa"));
  return {
    ...o,
    servizio,
    comune: d.has("comune") ? d.get("comune") : o.comune,
    ore: Math.round(Number(d.get("ore"))) || 0,
    // La tariffa si salva solo se diversa da quella standard del servizio
    tariffa: tariffa > 0 && tariffa !== datiServizio(servizio).tariffa ? tariffa : null,
    referenteId: d.get("referente") || null,
    note: String(d.get("note") || "").trim(),
  };
}

// Salva le correzioni e scrive una sola riga di cronologia con i campi cambiati
function salvaModificaOpportunita(modulo) {
  const o = trova(modulo.dataset.id);
  const n = leggiModificaOpportunita(modulo);
  if (n.ore <= 0) return segnalaCampo(modulo.ore, "Inserisci le ore al mese");
  const numero = (x) => Number(x).toLocaleString("it-IT");
  const nomeRef = (id) => (trovaReferente(id) || { nome: "nessuno" }).nome;
  const cambi = [];
  if (n.servizio !== o.servizio) cambi.push("servizio " + o.servizio + " → " + n.servizio);
  if (n.comune !== o.comune) cambi.push("sede di lavoro " + o.comune + " → " + n.comune);
  if (n.ore !== o.ore) cambi.push("ore al mese " + o.ore + " → " + n.ore);
  if (tariffaOraria(n) !== tariffaOraria(o)) cambi.push("tariffa " + numero(tariffaOraria(o)) + " → " + numero(tariffaOraria(n)) + " €/ora");
  if (n.referenteId !== (o.referenteId || null)) cambi.push("referente " + nomeRef(o.referenteId) + " → " + nomeRef(n.referenteId));
  if (n.note !== (o.note || "")) cambi.push("note aggiornate");
  if (!cambi.length) return chiudiFinestra(); // nulla da salvare
  applica(() => {
    Object.assign(o, { servizio: n.servizio, comune: n.comune, ore: n.ore, tariffa: n.tariffa, referenteId: n.referenteId, note: n.note });
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: "Correzione: " + cambi.join("; ") });
  }, { messaggio: "Opportunità aggiornata", evidenzia: o.id });
}

// Opzioni di una select; il valore salvato che non è più in config.js resta, con "(non più in elenco)"
function opzioni(valori, scelto) {
  const mancante = scelto && !valori.includes(scelto)
    ? `<option value="${esc(scelto)}" selected>${esc(scelto)} (non più in elenco)</option>` : "";
  return valori.map((v) => `<option value="${esc(v)}" ${v === scelto ? "selected" : ""}>${esc(v)}</option>`).join("") + mancante;
}

// Opzioni dei comuni con la distanza da Bari, con la stessa regola per i comuni tolti da config.js
function opzioniComuni(scelto) {
  const mancante = scelto && !CONFIG.comuni.some((c) => c.nome === scelto)
    ? `<option value="${esc(scelto)}" selected>${esc(scelto)} (non più in elenco)</option>` : "";
  return CONFIG.comuni.map((c) => `<option value="${esc(c.nome)}" ${c.nome === scelto ? "selected" : ""}>${esc(c.nome)}${c.km ? " (" + c.km + " km)" : ""}</option>`).join("") + mancante;
}

// Modulo "Nuovo contatto": azienda (nuova o esistente), referente e opportunità, con anteprima del punteggio
function apriNuovoContatto(aziendaId = "") {
  const servizi = Object.keys(CONFIG.servizi);
  const aziende = [...stato.aziende].sort((x, y) => x.ragioneSociale.localeCompare(y.ragioneSociale));
  const scelta = trovaAzienda(aziendaId);
  apriFinestra(`
    <form class="modulo" id="modulo-contatto" novalidate>
      <div>
        <h2>${scelta ? "Nuova opportunità" : "Nuovo contatto"}</h2>
        <p class="nota-piccola">Scegli il cliente o creane uno nuovo, poi indica il servizio: il punteggio di coerenza si aggiorna mentre scrivi.</p>
      </div>
      <label>Azienda
        <select name="azienda" id="campo-azienda">
          <option value="">+ Nuova azienda</option>
          ${aziende.map((a) => `<option value="${esc(a.id)}" ${a.id === aziendaId ? "selected" : ""}>${esc(a.ragioneSociale)}</option>`).join("")}
        </select>
      </label>

      <fieldset class="gruppo" id="gruppo-nuova-azienda" ${scelta ? "hidden" : ""}>
        <legend>Dati della nuova azienda</legend>
        <label>Ragione sociale
          <input name="ragioneSociale" id="campo-ragione" autocomplete="off" placeholder="Es. Studio Commercialisti Omega">
        </label>
        <div class="riga-doppia">
          <label>Settore <select name="settore">${opzioni(CONFIG.settori, CONFIG.pilota.settore)}</select></label>
          <label>Fonte del contatto <select name="fonte">${opzioni(fonti(), fonti()[0])}</select></label>
        </div>
        <div class="riga-doppia">
          <label>Referente (nome e cognome) <input name="refNome" autocomplete="off" placeholder="Es. Dott.ssa Anna Verdi"></label>
          <label>Ruolo <input name="refRuolo" autocomplete="off" placeholder="Es. Socia titolare"></label>
        </div>
        <div class="riga-doppia">
          <label>Telefono <input name="refTelefono" type="tel" inputmode="tel" autocomplete="off" placeholder="Es. 333 123 4567"></label>
          <label>Email <input name="refEmail" type="email" inputmode="email" autocomplete="off" placeholder="nome@azienda.it"></label>
        </div>
        <label class="spunta"><input name="refDecisore" type="checkbox"> È il decisore</label>
        <label class="spunta"><input name="refPrivacy" type="checkbox"> Ha dato il consenso privacy per essere ricontattato</label>
      </fieldset>

      <label id="gruppo-referente" ${scelta ? "" : "hidden"}>Referente per questa opportunità
        <select name="referente">${scelta ? opzioniReferenti(scelta.id) : ""}</select>
      </label>

      <fieldset class="gruppo">
        <legend>Servizio richiesto</legend>
        <div class="riga-doppia">
          <label>Servizio <select name="servizio">${opzioni(servizi, servizi[0])}</select></label>
          <label>Sede di lavoro (comune) <select name="comune">${opzioniComuni(scelta ? scelta.comune : "Bari")}</select></label>
        </div>
        <div class="riga-doppia">
          <label>Ore al mese (stima)
            <input name="ore" type="number" inputmode="numeric" min="1" step="1" required placeholder="Es. 60">
          </label>
          <label>Tariffa oraria (€)
            <input name="tariffa" type="number" inputmode="decimal" min="1" step="0.5" value="${CONFIG.servizi[servizi[0]].tariffa}">
          </label>
        </div>
      </fieldset>
      <div class="anteprima" id="anteprima-punteggio" aria-live="polite"></div>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Salva</button>
      </div>
    </form>`, "Nuovo contatto");
  aggiornaAnteprima();
}

// Opzioni dei referenti di un'azienda: scelto quello indicato, altrimenti il decisore
function opzioniReferenti(aziendaId, scelto = null) {
  const refs = referentiDi(aziendaId);
  if (!refs.length) return '<option value="">Nessun referente registrato</option>';
  const principale = refs.find((r) => r.id === scelto) || refs.find((r) => r.decisore) || refs[0];
  return refs.map((r) => `<option value="${esc(r.id)}" ${r.id === principale.id ? "selected" : ""}>${esc(r.nome)}${r.ruolo ? " · " + esc(r.ruolo) : ""}${r.decisore ? " (decisore)" : ""}</option>`).join("");
}

// Legge il modulo: nuova azienda e nuovo referente (se servono) e l'opportunità
function leggiModulo(modulo) {
  const d = new FormData(modulo);
  const testo = (nome) => String(d.get(nome) || "").trim();
  const servizio = d.get("servizio");
  const tariffa = Number(d.get("tariffa"));
  const aziendaId = d.get("azienda");
  const nuovaAzienda = aziendaId ? null : {
    ragioneSociale: testo("ragioneSociale"),
    piva: "",
    settore: d.get("settore"),
    comune: d.get("comune"),
    fonte: d.get("fonte"),
    note: "",
    creata: oggi(),
  };
  const nuovoReferente = aziendaId || !testo("refNome") ? null : {
    nome: testo("refNome"),
    ruolo: testo("refRuolo"),
    telefono: testo("refTelefono"),
    email: testo("refEmail"),
    canale: testo("refTelefono") ? "Telefono" : "Email",
    decisore: d.get("refDecisore") === "on",
    privacy: d.get("refPrivacy") === "on",
  };
  const opp = {
    aziendaId,
    referenteId: aziendaId ? d.get("referente") || null : null,
    comune: d.get("comune"),
    servizio,
    ore: Math.round(Number(d.get("ore"))) || 0,
    // La tariffa si salva solo se diversa da quella standard del servizio
    tariffa: tariffa > 0 && tariffa !== datiServizio(servizio).tariffa ? tariffa : null,
    storico: { contatto: oggi() },
    perso: null,
    allocazione: null,
    proposte: [],
  };
  return { opp, nuovaAzienda, nuovoReferente };
}

// Anteprima del punteggio nei moduli "Nuovo contatto" e "Modifica opportunità"
function aggiornaAnteprima(modulo = document.querySelector("#modulo-contatto, #modulo-opportunita")) {
  const box = modulo && modulo.querySelector("#anteprima-punteggio");
  if (!box) return;
  let opp;
  if (modulo.id === "modulo-opportunita") {
    opp = leggiModificaOpportunita(modulo);
  } else {
    const letto = leggiModulo(modulo);
    opp = letto.opp;
    // Per l'anteprima l'azienda nuova non è ancora salvata: la si passa direttamente
    if (letto.nuovaAzienda) {
      opp._azienda = letto.nuovaAzienda;
      opp._decisore = letto.nuovoReferente && letto.nuovoReferente.decisore ? letto.nuovoReferente : null;
    }
  }
  if (opp.ore <= 0) {
    box.innerHTML = '<p class="nota-piccola">Inserisci le ore al mese per calcolare il punteggio di coerenza.</p>';
    return;
  }
  const p = calcolaPunteggio(opp, stato.opportunita);
  box.innerHTML = `
    <p class="anteprima-testa">Punteggio di coerenza ${badgePunteggio(p)}
      <span class="nota-piccola">${formattaEuro(valoreAnnuo(opp))} all'anno</span></p>
    ${tabellaCriteri(p)}`;
}

function segnalaCampo(campo, messaggio) {
  campo.setCustomValidity(messaggio);
  campo.reportValidity();
  campo.setCustomValidity("");
}

function salvaContatto(modulo) {
  const { opp, nuovaAzienda, nuovoReferente } = leggiModulo(modulo);
  if (nuovaAzienda) {
    const nome = nuovaAzienda.ragioneSociale;
    if (!nome) return segnalaCampo(modulo.ragioneSociale, "Scrivi la ragione sociale");
    const doppione = stato.aziende.find((a) => a.ragioneSociale.toLowerCase() === nome.toLowerCase());
    if (doppione) return segnalaCampo(modulo.ragioneSociale, "Esiste già un'azienda con questo nome: sceglila dall'elenco Azienda");
  }
  if (opp.ore <= 0) return segnalaCampo(modulo.ore, "Inserisci le ore al mese");

  const nome = nuovaAzienda ? nuovaAzienda.ragioneSociale : nomeCliente(opp);
  let promemoria = null;
  applica(() => {
    if (nuovaAzienda) {
      nuovaAzienda.id = nuovoId("az");
      stato.aziende.push(nuovaAzienda);
      opp.aziendaId = nuovaAzienda.id;
      if (nuovoReferente) {
        nuovoReferente.id = nuovoId("rf");
        nuovoReferente.aziendaId = nuovaAzienda.id;
        stato.referenti.push(nuovoReferente);
        opp.referenteId = nuovoReferente.id;
      }
    }
    stato.contatore += 1;
    opp.id = nuovoId("op");
    opp.codice = codiceRiferimento(stato.contatore);
    stato.opportunita.push(opp);
    registraAttivita({ aziendaId: opp.aziendaId, tipo: "Pipeline", testo: opp.servizio + ": nuovo contatto (" + opp.ore + " h/mese)" });
    promemoria = cadenza(opp, CONFIG.fasi[0], oggi());
    ultimaModificata = opp.id; // l'id nasce qui: la nuova scheda resta evidenziata nella Pipeline
  }, { messaggio: () => "Contatto creato: " + nome + testoPromemoria(promemoria), fase: "contatto", vai: "pipeline" });
}

// Pulsanti che impostano subito la data del modulo (es. «Domani», «Tra una settimana»)
function pulsantiRapidi(scelte) {
  return `<div class="pulsanti-rapidi" role="group" aria-label="Scelta rapida della data">
    ${scelte.map(([n, testo]) => `<button class="pulsante secondario piccolo" type="button" data-azione="imposta-data" data-giorni="${n}">${testo}</button>`).join("")}
  </div>`;
}

// Fissa il sopralluogo in agenda: diventa un'attività da fare collegata all'opportunità
function apriFissaSopralluogo(o) {
  apriFinestra(`
    <form class="modulo" id="modulo-sopralluogo" data-id="${esc(o.id)}" novalidate>
      <div>
        <h2>Fissa sopralluogo · ${esc(nomeCliente(o))}</h2>
        <p class="nota-piccola">Il sopralluogo entra nell'agenda del cliente e in «Da fare oggi» il giorno stabilito. Quando è fatto, premi «Sopralluogo fatto».</p>
      </div>
      <label>Data <input name="data" type="date" required min="${oggi()}" value="${traGiorni(1)}"></label>
      ${pulsantiRapidi([[1, "Domani"], [3, "Tra 3 giorni"], [7, "Tra una settimana"]])}
      <div class="riga-doppia">
        <label>Ora (facoltativa) <input name="ora" type="time"></label>
        <label>Nota (facoltativa) <input name="nota" autocomplete="off" placeholder="Es. chiedere della segreteria"></label>
      </div>
      <button class="pulsante-testo positivo a-sinistra" type="button" data-azione="registra-sopralluogo" data-id="${esc(o.id)}">Il sopralluogo è già stato fatto? Registralo</button>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Fissa sopralluogo</button>
      </div>
    </form>`, "Fissa sopralluogo");
}

function salvaSopralluogo(modulo) {
  const o = trova(modulo.dataset.id);
  const data = modulo.data.value;
  const ora = modulo.ora.value;
  const nota = modulo.nota.value.trim();
  if (!o) return chiudiFinestra();
  if (!formattaData(data)) return segnalaCampo(modulo.data, "Scegli la data del sopralluogo");
  if (data < oggi()) return segnalaCampo(modulo.data, "Scegli una data da oggi in poi. Un sopralluogo già fatto si registra con «Registralo».");
  applica(() => {
    togliPromemoriaAutomatici(o.id); // il promemoria «Fissare il sopralluogo» non serve più
    registraAttivita({ aziendaId: o.aziendaId, referenteId: o.referenteId || null, opportunitaId: o.id, fase: "sopralluogo",
      tipo: "Visita", testo: "Sopralluogo" + (nota ? ": " + nota : ""), data, daFare: true, ...(ora ? { ora } : {}) });
  }, { messaggio: "Sopralluogo fissato per " + formattaGiorno(data) + (ora ? " alle " + ora : ""), evidenzia: o.id, fase: "qualificato" });
}

// Finestra breve per registrare una fase già avvenuta, già compilata: data e dati di quella fase
function apriFase(o, fase, { data = null, attivitaId = null } = {}) {
  const minimo = dataFaseAttuale(o); // la nuova fase non può essere prima di quella attuale
  let valore = data && data <= oggi() ? data : oggi();
  if (valore < minimo) valore = minimo;
  const p = calcolaPunteggio(o, stato.opportunita);
  const azione = CONFIG.fasi[CONFIG.fasi.indexOf(fase) - 1].azione;
  const etichetta = { sopralluogo: "Data del sopralluogo", offerta: "Data di invio", contratto: "Data della firma" }[fase.id] || "Data";
  let campi = "";
  if (fase.id === "sopralluogo") {
    campi = `
      <label>Ore al mese confermate
        <input name="ore" type="number" inputmode="numeric" min="1" step="1" required value="${Number(o.ore)}">
      </label>
      <p class="confronto-punteggio" id="confronto-punteggio"></p>
      <label>Note del sopralluogo (facoltative)
        <textarea name="note" placeholder="Es. 380 mq su due piani, accesso dalle 7 alle 9"></textarea>
      </label>`;
  } else if (fase.id === "offerta") {
    // Cliente C: la conferma motivata è chiesta qui, nella stessa finestra
    const chiediC = p.classe === "C" && CONFIG.punteggio.confermaPerPunteggioC && !o.motivazioneC;
    campi = `
      <div class="riga-doppia">
        <label>Tariffa offerta (€/ora)
          <input name="tariffa" type="number" inputmode="decimal" min="1" step="0.5" required value="${Number(tariffaOraria(o)) || ""}">
        </label>
        <label>Valida fino al
          <input name="scadenza" type="date" required min="${valore}" value="${aggiungiGiorni(valore, CONFIG.giorniValiditaOfferta)}">
        </label>
      </div>
      <p class="importo-offerta" id="importo-offerta"></p>
      ${chiediC ? `
        <div class="conferma-c">
          <p><strong>Cliente fuori dai criteri del pilota: punteggio ${p.totale} su 100 (classe C).</strong> I punti deboli:</p>
          <ul class="storico">${p.criteri.filter((c) => c.valore < 1).map((c) => `<li><strong>${c.nome}</strong>: ${esc(c.nota)} (${c.punti}/${c.peso})</li>`).join("")}</ul>
          <label>Motivazione (resterà registrata)
            <textarea name="motivazione" required minlength="5" placeholder="Es. cliente strategico per entrare nel settore"></textarea>
          </label>
        </div>` : ""}`;
  } else if (fase.id === "contratto") {
    campi = `
      <label>Avvio del servizio
        <input name="avvio" type="date" required min="${valore}" value="${aggiungiGiorni(valore, CONFIG.giorniAvvioServizio)}">
      </label>
      <p class="nota-piccola">È la data concordata con il cliente: la riceve anche il partner nel messaggio WhatsApp.</p>`;
  }
  apriFinestra(`
    <form class="modulo" id="modulo-fase" data-id="${esc(o.id)}" data-fase="${esc(fase.id)}" data-attivita="${esc(attivitaId || "")}" novalidate>
      <div class="finestra-testa"><h2>${esc(azione)} · ${esc(nomeCliente(o))}</h2>${badgePunteggio(p)}</div>
      <p class="nota-piccola">Registra un passo già avvenuto: controlla data e dati, poi conferma.</p>
      <label>${etichetta}
        <input name="data" type="date" required min="${minimo}" max="${oggi()}" value="${valore}">
      </label>
      ${campi}
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">${fase.id === "contratto" ? "Conferma e vai all'allocazione" : "Conferma"}</button>
      </div>
    </form>`, azione);
  aggiornaModuloFase(document.getElementById("modulo-fase"));
}

// Calcoli che cambiano mentre si scrive: punteggio prima e dopo, importo dell'offerta, date collegate
function aggiornaModuloFase(modulo, campo = null) {
  const o = trova(modulo.dataset.id);
  if (!o) return;
  // Validità dell'offerta e avvio seguono la data, finché non si cambiano a mano
  const collegato = modulo.scadenza || modulo.avvio;
  if (collegato && campo === collegato) collegato.dataset.toccato = "1";
  if (collegato && campo === modulo.data && formattaData(modulo.data.value)) {
    collegato.min = modulo.data.value;
    if (!collegato.dataset.toccato) {
      collegato.value = aggiungiGiorni(modulo.data.value, modulo.scadenza ? CONFIG.giorniValiditaOfferta : CONFIG.giorniAvvioServizio);
    }
  }
  const confronto = modulo.querySelector("#confronto-punteggio");
  if (confronto) {
    const ore = Math.round(Number(modulo.ore.value)) || 0;
    const prima = calcolaPunteggio(o, stato.opportunita);
    const dopo = calcolaPunteggio({ ...o, ore }, stato.opportunita);
    confronto.innerHTML = ore <= 0 ? "Inserisci le ore al mese confermate."
      : `<span>Punteggio</span> ${badgePunteggio(prima)}${ore === o.ore ? "" : " → " + badgePunteggio(dopo)}
         <span class="valore-annuo">${formattaEuro(valoreAnnuo({ ...o, ore }))} all'anno</span>`;
  }
  const importo = modulo.querySelector("#importo-offerta");
  if (importo) {
    const tariffa = Number(modulo.tariffa.value) || 0;
    importo.textContent = "Importo: " + formattaEuro(o.ore * tariffa) + "/mese · " + formattaEuro(o.ore * tariffa * 12) + "/anno";
  }
}

// Conferma della finestra di fase: controlla i dati e registra la fase con la sua data
function salvaFase(modulo) {
  const o = trova(modulo.dataset.id);
  const fase = CONFIG.fasi.find((f) => f.id === modulo.dataset.fase);
  // La fase deve essere ancora la successiva (es. non già registrata da un'altra scheda)
  if (!o || !fase || o.perso || CONFIG.fasi[faseRaggiunta(o) + 1] !== fase) return chiudiFinestra();
  const data = modulo.data.value;
  const minimo = dataFaseAttuale(o);
  if (!formattaData(data)) return segnalaCampo(modulo.data, "Scegli la data");
  if (data > oggi()) return segnalaCampo(modulo.data, "Registra solo passi già avvenuti: la data non può essere nel futuro");
  if (data < minimo) return segnalaCampo(modulo.data, "La data non può essere prima del " + formattaData(minimo) + ", quando è iniziata la fase attuale");
  let ore, note, tariffa, scadenzaOfferta, motivazione, avvio;
  if (fase.id === "sopralluogo") {
    ore = Math.round(Number(modulo.ore.value)) || 0;
    note = modulo.note.value.trim();
    if (ore <= 0) return segnalaCampo(modulo.ore, "Inserisci le ore al mese confermate");
  } else if (fase.id === "offerta") {
    tariffa = Number(modulo.tariffa.value);
    scadenzaOfferta = modulo.scadenza.value;
    motivazione = modulo.motivazione ? modulo.motivazione.value.trim() : "";
    if (!(tariffa > 0)) return segnalaCampo(modulo.tariffa, "Indica la tariffa offerta");
    if (!formattaData(scadenzaOfferta) || scadenzaOfferta < data) return segnalaCampo(modulo.scadenza, "La validità deve finire dopo la data di invio");
    if (modulo.motivazione && motivazione.length < 5) return segnalaCampo(modulo.motivazione, "Scrivi una motivazione di almeno 5 caratteri");
  } else if (fase.id === "contratto") {
    avvio = modulo.avvio.value;
    if (!formattaData(avvio) || avvio < data) return segnalaCampo(modulo.avvio, "L'avvio non può essere prima della firma");
  }
  let promemoria = null;
  applica(() => {
    let dettaglio = "";
    if (fase.id === "sopralluogo") {
      if (ore !== o.ore) {
        registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", data, testo: "Ore al mese: " + o.ore + " → " + ore + " (dal sopralluogo)" });
        o.ore = ore;
      }
      // Il sopralluogo fissato in agenda si chiude con la data in cui è stato fatto
      const fissato = stato.attivita.find((x) => x.id === modulo.dataset.attivita && x.daFare) || sopralluogoFissato(o);
      if (fissato) {
        fissato.daFare = false;
        fissato.data = data;
        if (note) fissato.testo = "Sopralluogo: " + note;
      } else if (note) {
        registraAttivita({ aziendaId: o.aziendaId, referenteId: o.referenteId || null, opportunitaId: o.id, tipo: "Visita", data, testo: "Sopralluogo: " + note });
      }
    } else if (fase.id === "offerta") {
      o.tariffa = tariffa !== datiServizio(o.servizio).tariffa ? tariffa : null;
      o.scadenzaOfferta = scadenzaOfferta;
      if (motivazione) o.motivazioneC = motivazione;
      dettaglio = "tariffa " + tariffa.toLocaleString("it-IT") + " €/ora, valida fino al " + formattaData(scadenzaOfferta);
    } else if (fase.id === "contratto") {
      o.avvio = avvio;
      dettaglio = "avvio del servizio il " + formattaData(avvio);
    }
    promemoria = registraFase(o, fase, data, dettaglio);
  }, { messaggio: () => messaggioFase(o, fase, promemoria), evidenzia: o.id, fase: fase.id, vai: fase.id === "contratto" ? "allocazione" : null });
}

// Motivo della perdita: va scelto, non parte già impostato
function apriPerso(id) {
  const o = trova(id);
  if (!o) return;
  apriFinestra(`
    <form class="modulo" id="modulo-perso" data-id="${esc(o.id)}" novalidate>
      <h2>Segna come perso</h2>
      <p>${esc(nomeCliente(o))} uscirà dalla pipeline attiva, ma resterà nei conteggi degli indicatori. Se serve, potrai riaprirla dal dettaglio.</p>
      <label>Motivo
        <select name="motivo" required>
          <option value="">— Scegli il motivo —</option>
          ${CONFIG.motiviPerdita.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("")}
        </select>
      </label>
      <label>Note (facoltative)
        <textarea name="nota" placeholder="Es. ha scelto un fornitore già presente nel condominio"></textarea>
      </label>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante no" type="submit">Segna come perso</button>
      </div>
    </form>`, "Segna come perso");
}

function salvaPerso(modulo) {
  const o = trova(modulo.dataset.id);
  const motivo = modulo.motivo.value;
  const nota = modulo.nota.value.trim();
  if (!o || o.perso) return chiudiFinestra();
  if (!motivo) return segnalaCampo(modulo.motivo, "Scegli il motivo");
  applica(() => {
    o.perso = { data: oggi(), motivo, ...(nota ? { nota } : {}) };
    togliPromemoriaAutomatici(o.id); // i promemoria automatici di una trattativa persa non servono più
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: o.servizio + ": opportunità persa (" + motivo + ")" });
  }, { messaggio: "Opportunità segnata come persa: " + nomeCliente(o), evidenzia: o.id, fase: "perso" });
}

function apriRipristino() {
  apriFinestra(`
    <h2>Ripristinare i dati di esempio?</h2>
    <p>Le opportunità create e le modifiche fatte in questo browser andranno perse.</p>
    <div class="azioni-finestra">
      <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
      <button class="pulsante primario" type="button" data-azione="conferma-ripristino">Ripristina</button>
    </div>`, "Ripristino dati");
}

// =========================================================== AZIONI

// Ogni modifica passa da qui: copia per «Annulla», modifica, salvataggio, ridisegno, avviso.
// cambia() modifica lo stato; se restituisce false non succede nulla.
// messaggio può essere una funzione, quando il testo dipende dalla modifica appena fatta.
function applica(cambia, { messaggio = "", evidenzia = null, fase = null, vai = null, annullabile = true } = {}) {
  const copia = { dati: clona(stato), fase: faseSelezionata, evidenzia, schermata: location.hash };
  if (cambia() === false) return false;
  salva();
  if (finestra.open) chiudiFinestra();
  if (fase) faseSelezionata = fase;
  if (evidenzia) ultimaModificata = evidenzia;
  if (vai && vai !== (location.hash.slice(1) || "pipeline")) location.hash = vai;
  else disegna();
  mostraAvviso(typeof messaggio === "function" ? messaggio() : messaggio, annullabile ? copia : null);
  return true;
}

// Testo che descrive il promemoria creato in automatico, es. ". Promemoria: chiamata di qualifica sab 19/10"
function testoPromemoria(promemoria) {
  if (!promemoria) return "";
  return ". Promemoria: " + promemoria.testo.charAt(0).toLowerCase() + promemoria.testo.slice(1) + " " + formattaGiorno(promemoria.data);
}

// Testo dell'avviso quando un'opportunità cambia fase
function messaggioFase(o, fase, promemoria = null) {
  return (fase.id === "contratto"
    ? "Contratto firmato: ora assegna la commessa"
    : nomeCliente(o) + " passa a «" + fase.nome + "»") + testoPromemoria(promemoria);
}

// Pulsante di fase: registra un passo già avvenuto. Dopo il Contatto un solo clic; poi una finestra breve con i dati
function avanza(id) {
  const o = trova(id);
  const prossima = o && CONFIG.fasi[faseRaggiunta(o) + 1];
  if (!prossima || o.perso) return;
  if (prossima.id === "qualificato") {
    let promemoria = null;
    applica(() => { promemoria = registraFase(o, prossima, oggi()); },
      { messaggio: () => messaggioFase(o, prossima, promemoria), evidenzia: o.id, fase: prossima.id });
  } else if (prossima.id === "sopralluogo") {
    // Senza sopralluogo in agenda si fissa; con il sopralluogo fissato si registra con la sua data
    const fissato = sopralluogoFissato(o);
    if (fissato) apriFase(o, prossima, { data: fissato.data, attivitaId: fissato.id });
    else apriFissaSopralluogo(o);
  } else {
    apriFase(o, prossima);
  }
}

// Registra la fase con la data in cui è avvenuta e aggiorna i promemoria (solo lo stato: salva e ridisegna applica()).
// Restituisce il promemoria creato in automatico, oppure null.
function registraFase(o, fase, data = oggi(), dettaglio = "") {
  o.storico[fase.id] = data;
  registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", data, testo: o.servizio + ": fase «" + fase.nome + "»" + (dettaglio ? " (" + dettaglio + ")" : "") });
  return cadenza(o, fase, data);
}

// Toglie i promemoria automatici ancora da fare di un'opportunità
function togliPromemoriaAutomatici(oppId) {
  stato.attivita = stato.attivita.filter((x) => !(x.automatica && x.daFare && x.opportunitaId === oppId));
}

// Cadenza automatica: quando l'opportunità entra in una fase il vecchio promemoria automatico sparisce e,
// se l'azienda non ha altre attività da fare, se ne crea uno (data della fase + giorni, mai prima di oggi)
function cadenza(o, fase, data) {
  togliPromemoriaAutomatici(o.id);
  const f = fase.followUp;
  if (!f || stato.attivita.some((x) => x.daFare && x.aziendaId === o.aziendaId)) return null;
  const quando = aggiungiGiorni(data, f.giorni);
  const promemoria = { id: nuovoId("at"), aziendaId: o.aziendaId, referenteId: o.referenteId || null, tipo: f.tipo, testo: f.testo,
    data: quando < oggi() ? oggi() : quando, daFare: true, automatica: true, opportunitaId: o.id };
  stato.attivita.push(promemoria);
  return promemoria;
}

// Correzione: annulla la fase attuale e torna alla precedente (con «Annulla», senza altre conferme)
function tornaIndietro(id) {
  const o = trova(id);
  if (!puoTornareIndietro(o)) return;
  const attuale = CONFIG.fasi[faseRaggiunta(o)];
  const precedente = CONFIG.fasi[faseRaggiunta(o) - 1];
  applica(() => {
    delete o.storico[attuale.id];
    if (attuale.id === "offerta") o.scadenzaOfferta = null;
    if (attuale.id === "contratto") o.avvio = null;
    togliPromemoriaAutomatici(o.id); // il promemoria era della fase annullata
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: "Correzione: fase «" + attuale.nome + "» annullata, torna a «" + precedente.nome + "»" });
  }, { messaggio: nomeCliente(o) + " torna a «" + precedente.nome + "»", evidenzia: o.id, fase: precedente.id });
}

// Correzione: riapre una trattativa segnata come persa
function riapri(id) {
  const o = trova(id);
  if (!o || !o.perso) return;
  const motivo = o.perso.motivo;
  applica(() => {
    o.perso = null;
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: "Correzione: trattativa riaperta (era persa per «" + motivo + "»)" });
  }, { messaggio: nomeCliente(o) + ": trattativa riaperta", evidenzia: o.id, fase: CONFIG.fasi[faseRaggiunta(o)].id });
}

// Assegna il contratto alla prima squadra interna con ore libere nella zona
function assegnaSquadra(id) {
  const o = trova(id);
  const squadra = o && squadraDisponibile(o, stato.opportunita);
  if (!squadra) return;
  applica(() => {
    o.allocazione = { tipo: "squadra", id: squadra.id, data: oggi() };
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: o.servizio + ": commessa assegnata a " + squadra.nome });
  }, { messaggio: "Commessa assegnata a " + squadra.nome, evidenzia: o.id });
}

// Registra la proposta "in attesa di risposta" (il link apre WhatsApp in una nuova scheda)
function proponi(id, partnerId) {
  const o = trova(id);
  if (!o || propostaInAttesa(o)) return;
  // Si registra subito dopo il clic, così il link fa in tempo ad aprire WhatsApp
  setTimeout(() => applica(() => {
    o.proposte = o.proposte || [];
    o.proposte.push({ partnerId, data: oggi(), esito: "attesa" });
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: o.servizio + ": proposta su WhatsApp al partner " + nomePartner(partnerId) });
  }, { messaggio: "Messaggio pronto su WhatsApp. Registra qui la risposta del partner.", evidenzia: o.id }), 0);
}

// Registra la risposta SÌ o NO del partner alla proposta in attesa
function rispostaPartner(id, esito) {
  const o = trova(id);
  const attesa = o && propostaInAttesa(o);
  if (!attesa) return;
  const partner = trovaPartner(attesa.partnerId);
  const nome = nomePartner(attesa.partnerId);
  if (esito === "si") {
    if (!partner) return; // partner tolto da config.js: si può registrare solo il NO
    // Ricontrollo dei requisiti al momento della conferma
    const req = requisitiPartner(partner, dataAvvio(o));
    if (!req.idoneo) {
      applica(() => { attesa.esito = "no"; },
        { messaggio: nome + " non è più idoneo (" + req.testo + "): proponi al partner successivo", evidenzia: o.id });
      return;
    }
    applica(() => {
      attesa.esito = "si";
      o.allocazione = { tipo: "partner", id: partner.id, data: oggi() };
      registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: o.servizio + ": commessa assegnata al partner " + nome });
    }, { messaggio: "Commessa assegnata a " + nome + " — il cliente resta di Gate", evidenzia: o.id });
  } else {
    applica(() => { attesa.esito = "no"; }, {
      // Il partner successivo si conosce solo dopo aver registrato il NO
      messaggio: () => {
        const successivo = prossimoPartner(o);
        return nome + " ha risposto NO" + (successivo ? " — ora proponi a " + successivo.nome : "");
      },
      evidenzia: o.id,
    });
  }
}

// Elenco delle azioni attivate dai pulsanti con data-azione
const AZIONI = {
  nuovo: () => apriNuovoContatto(),
  dettaglio: (el) => apriDettaglio(el.dataset.id),
  avanza: (el) => avanza(el.dataset.id),
  perso: (el) => apriPerso(el.dataset.id),
  fase: (el) => {
    faseSelezionata = el.dataset.id;
    disegna();
  },
  chiudi: () => chiudiFinestra(),
  "assegna-squadra": (el) => assegnaSquadra(el.dataset.id),
  proponi: (el) => proponi(el.dataset.id, el.dataset.partner),
  "risposta-si": (el) => rispostaPartner(el.dataset.id, "si"),
  "risposta-no": (el) => rispostaPartner(el.dataset.id, "no"),
  ripristina: () => apriRipristino(),
  "esporta-backup": () => {
    esportaBackup();
    aggiornaStatoBackup();
    mostraAvviso("Backup scaricato: conservalo in una cartella sicura");
  },
  "esporta-csv": () => esportaCsvClienti(),
  "importa-backup": () => document.getElementById("file-backup").click(),
  "scarica-scartati": () => scaricaDatiScartati(),
  "chiudi-avviso-fisso": (el) => chiudiAvvisoFisso(el),
  "fissa-sopralluogo": (el) => { const o = trova(el.dataset.id); if (o) apriFissaSopralluogo(o); },
  "registra-sopralluogo": (el) => {
    const o = trova(el.dataset.id);
    if (o) apriFase(o, CONFIG.fasi.find((f) => f.id === "sopralluogo"));
  },
  // Pulsanti rapidi della data: «Domani», «Tra una settimana»...
  "imposta-data": (el) => {
    const modulo = el.closest("form");
    modulo.data.value = traGiorni(Number(el.dataset.giorni));
    modulo.querySelectorAll("[data-azione=imposta-data]").forEach((b) => b.setAttribute("aria-pressed", b === el));
  },
  "modifica-opportunita": (el) => apriModificaOpportunita(el.dataset.id),
  "torna-indietro": (el) => tornaIndietro(el.dataset.id),
  riapri: (el) => riapri(el.dataset.id),
  ...AZIONI_CLIENTI,
  "conferma-ripristino": () => applica(() => {
    stato = datiIniziali();
  }, { messaggio: "Dati di esempio ripristinati", fase: "contatto" }),
  // Riporta i dati a prima dell'ultima modifica (un solo passo indietro)
  annulla: () => {
    if (!copiaPerAnnulla) return;
    const copia = copiaPerAnnulla;
    stato = copia.dati;
    faseSelezionata = copia.fase;
    ultimaModificata = copia.evidenzia;
    salva();
    if (finestra.open) chiudiFinestra();
    // Si torna alla schermata in cui era partita l'azione (es. dall'Allocazione alla Pipeline)
    if (copia.schermata !== location.hash) location.hash = copia.schermata;
    else disegna();
    mostraAvviso("Azione annullata");
  },
};

// Azioni che modificano i dati: un secondo clic ravvicinato viene ignorato
const MODIFICANO_DATI = new Set(["avanza", "fatto", "fatto-fase", "assegna-squadra", "proponi", "risposta-si", "risposta-no",
  "elimina-referente", "cancella-dati", "elimina-azienda", "torna-indietro", "riapri", "conferma-ripristino", "conferma-importa", "annulla"]);
let ultimoClicModifica = 0;

// Doppio clic su un pulsante che apre una finestra: il secondo clic non deve premere un pulsante della finestra appena aperta
finestra.addEventListener("click", (evento) => {
  if (evento.detail > 1 && Date.now() - finestraApertaIl < 800) {
    evento.preventDefault();
    evento.stopPropagation();
  }
}, true);

document.addEventListener("click", (evento) => {
  const el = evento.target.closest("[data-azione]");
  if (!el || !AZIONI[el.dataset.azione]) return;
  // Dopo una modifica, il secondo clic di un doppio clic non apre nemmeno altro (es. il dettaglio della scheda spostata)
  if (evento.detail > 1 && Date.now() - ultimoClicModifica < 600) {
    evento.preventDefault();
    return;
  }
  if (MODIFICANO_DATI.has(el.dataset.azione)) {
    // Il secondo clic cadrebbe sul pulsante che ha preso il posto di questo
    if (evento.detail > 1 || Date.now() - ultimoClicModifica < 600) {
      evento.preventDefault();
      return;
    }
    ultimoClicModifica = Date.now();
  }
  AZIONI[el.dataset.azione](el, evento);
});

// Anche il clic con la rotellina sul link WhatsApp registra la proposta
document.addEventListener("auxclick", (evento) => {
  const el = evento.target.closest('[data-azione="proponi"]');
  if (el && evento.button === 1) AZIONI.proponi(el);
});

// Invio dei moduli nelle finestre
document.addEventListener("submit", (evento) => {
  const modulo = evento.target;
  evento.preventDefault();
  const gestori = {
    "modulo-contatto": salvaContatto,
    "modulo-fase": salvaFase,
    "modulo-sopralluogo": salvaSopralluogo,
    "modulo-opportunita": salvaModificaOpportunita,
    "modulo-perso": salvaPerso,
    ...GESTORI_MODULI, // moduli della schermata Clienti (clienti.js)
  };
  if (gestori[modulo.id]) gestori[modulo.id](modulo);
});

// Anteprima del punteggio mentre si compila il modulo; ricerca nell'elenco clienti
document.addEventListener("input", (evento) => {
  const modulo = evento.target.closest("#modulo-contatto, #modulo-opportunita");
  if (modulo) aggiornaAnteprima(modulo);
  if (evento.target.closest("#modulo-fase")) aggiornaModuloFase(evento.target.form, evento.target);
  if (evento.target.closest("#filtri-clienti")) aggiornaElencoClienti();
});

// Importazione di un backup scelto dall'utente
document.getElementById("file-backup").addEventListener("change", (evento) => {
  const file = evento.target.files[0];
  evento.target.value = "";
  if (file) importaBackup(file);
});

document.addEventListener("change", (evento) => {
  const campo = evento.target;
  if (campo.closest("#filtri-clienti")) return aggiornaElencoClienti();
  if (campo.form && campo.form.id === "modulo-fase") return aggiornaModuloFase(campo.form, campo);
  if (!campo.form || !["modulo-contatto", "modulo-opportunita"].includes(campo.form.id)) return;
  // Cambiando servizio, la tariffa torna quella standard del nuovo servizio
  if (campo.name === "servizio") campo.form.tariffa.value = datiServizio(campo.value).tariffa;
  // Scegliendo un'azienda esistente si nascondono i campi della nuova azienda
  if (campo.name === "azienda") {
    const azienda = trovaAzienda(campo.value);
    document.getElementById("gruppo-nuova-azienda").hidden = !!azienda;
    document.getElementById("gruppo-referente").hidden = !azienda;
    campo.form.referente.innerHTML = azienda ? opzioniReferenti(azienda.id) : "";
    if (azienda) campo.form.comune.value = azienda.comune;
  }
  aggiornaAnteprima(campo.form);
});

// ========================================================= AVVISI E DISEGNO

let timerAvviso;
let avvisoMostratoIl = 0;     // quando è comparso l'ultimo avviso (ms)
let copiaPerAnnulla = null;   // dati di prima dell'ultima modifica, finché l'avviso con «Annulla» è visibile

// Messaggio in basso: con una copia dei dati offre «Annulla» e resta 8 secondi, altrimenti 4
function mostraAvviso(testo, copia = null) {
  const el = document.getElementById("avviso");
  copiaPerAnnulla = copia;
  el.innerHTML = `<span>${esc(testo)}</span>` + (copia ? '<button type="button" data-azione="annulla">Annulla</button>' : "");
  el.classList.add("visibile");
  avvisoMostratoIl = Date.now();
  clearTimeout(timerAvviso);
  timerAvviso = setTimeout(nascondiAvviso, copia ? 8000 : 4000);
}

// Nasconde l'avviso; da quel momento l'ultima modifica non si può più annullare
function nascondiAvviso() {
  document.getElementById("avviso").classList.remove("visibile");
  copiaPerAnnulla = null;
}

// Avviso che resta in cima alla pagina finché non lo si chiude (dati non letti o non salvati)
function avvisoFisso(testo, pulsanteHtml = "") {
  const el = document.getElementById("avviso-fisso");
  el.insertAdjacentHTML("beforeend", `
    <div class="avviso-fisso-riga">
      ${icona("attenzione")}
      <p>${esc(testo)}</p>
      ${pulsanteHtml}
      <button class="pulsante-icona" type="button" data-azione="chiudi-avviso-fisso" aria-label="Chiudi l'avviso" title="Chiudi">${icona("x")}</button>
    </div>`);
  el.hidden = false;
}

function chiudiAvvisoFisso(pulsante) {
  const el = document.getElementById("avviso-fisso");
  pulsante.closest(".avviso-fisso-riga").remove();
  el.hidden = !el.children.length;
}

// Promemoria nel piè di pagina: quando è stato fatto l'ultimo backup
function aggiornaStatoBackup() {
  const giorni = stato.ultimoBackup ? giorniTra(stato.ultimoBackup, oggi()) : null;
  const quando = giorni === null ? "mai" : giorni <= 0 ? "oggi" : giorni === 1 ? "ieri" : giorni + " giorni fa";
  document.getElementById("stato-backup").innerHTML = "Ultimo backup: " + quando +
    (giorni === null || giorni > 7 ? ' <span class="chip chip-attenzione">Fai un backup</span>' : "");
}

const SCHERMATE = {
  pipeline: disegnaPipeline,
  clienti: disegnaClienti,
  cliente: disegnaSchedaCliente, // scheda di un'azienda: #cliente-<id>
  allocazione: disegnaAllocazione,
  indicatori: disegnaIndicatori,
};

// Legge la schermata dall'indirizzo: #pipeline, #clienti, #cliente-az3 ...
function schermataAttuale() {
  const hash = location.hash.slice(1);
  if (hash.startsWith("cliente-") && trovaAzienda(hash.slice(8))) return { nome: "cliente", parametro: hash.slice(8), menu: "clienti" };
  return SCHERMATE[hash] && hash !== "cliente" ? { nome: hash, menu: hash } : { nome: "pipeline", menu: "pipeline" };
}

// Ridisegna la schermata attuale a partire dallo stato
function disegna() {
  const { nome, parametro, menu } = schermataAttuale();
  let html;
  try {
    html = SCHERMATE[nome](parametro);
  } catch (errore) {
    // Un dato imprevisto non lascia la pagina bianca: si spiega cosa fare
    console.error(errore);
    html = '<p class="vuoto">Questa schermata non si può mostrare: alcuni dati non sono validi. Usa «Salva backup» e poi «Ripristina dati di esempio».</p>';
  }
  document.getElementById("schermata").innerHTML = html;

  // Voce di menu attiva
  document.querySelectorAll("[data-vai]").forEach((a) => {
    if (a.dataset.vai === menu) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  // Numero di attività da fare entro oggi accanto alla voce "Pipeline", dove c'è l'elenco "Da fare oggi"
  const scadute = attivitaDaFare().filter((x) => x.data <= oggi()).length;
  const conteggioPipeline = document.getElementById("conteggio-pipeline");
  conteggioPipeline.textContent = scadute;
  conteggioPipeline.hidden = scadute === 0;
  conteggioPipeline.setAttribute("aria-label", scadute + " attività da fare entro oggi");

  // Numero di commesse da assegnare accanto alla voce "Allocazione"
  const daAssegnare = stato.opportunita.filter((o) => o.storico.contratto && !o.perso && !o.allocazione).length;
  const conteggio = document.getElementById("conteggio-allocazione");
  conteggio.textContent = daAssegnare;
  conteggio.hidden = daAssegnare === 0;
  conteggio.setAttribute("aria-label", daAssegnare + " commesse da assegnare");

  aggiornaStatoBackup();

  // Porta in vista la scheda appena modificata
  if (ultimaModificata) {
    const el = document.getElementById("scheda-" + ultimaModificata) || document.getElementById("commessa-" + ultimaModificata);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      // Il focus resta sulla scheda modificata (utile da tastiera e con lettore di schermo)
      const comando = el.querySelector("button, a");
      if (comando && !finestra.open) comando.focus({ preventScroll: true });
    }
    ultimaModificata = null;
  }
}

window.addEventListener("hashchange", () => {
  // L'avviso appena comparso (es. "Contatto creato" salvato da Clienti) resta visibile sulla nuova schermata
  if (Date.now() - avvisoMostratoIl > 1000) nascondiAvviso();
  window.scrollTo(0, 0);
  disegna();
});

// Due schede aperte insieme: quando l'altra salva, questa riprende i suoi dati (le finestre aperte restano)
window.addEventListener("storage", (evento) => {
  if (evento.key !== CONFIG.chiaveSalvataggio || !evento.newValue) return;
  let nuovo = null;
  try {
    nuovo = migra(JSON.parse(evento.newValue));
  } catch (e) {
    return;
  }
  if (!strutturaValida(nuovo)) return;
  stato = nuovo;
  disegna();
  // La copia per «Annulla» di questa scheda cancellerebbe il lavoro dell'altra: l'avviso la toglie
  mostraAvviso("Dati aggiornati da un'altra scheda");
});

// Chiede al browser di non cancellare i dati del sito (es. Safari dopo 7 giorni senza visite)
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

if (datiScartati) {
  avvisoFisso("I dati salvati in questo browser non si leggono: li abbiamo messi da parte.",
    '<button class="pulsante no piccolo" type="button" data-azione="scarica-scartati">Scarica la copia</button>');
}

disegna();
