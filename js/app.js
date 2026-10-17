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
  const inTrattativa = tutte.filter((o) => !o.perso && !o.storico.contratto);
  const classi = { A: 0, B: 0, C: 0 };
  inTrattativa.forEach((o) => classi[punteggi.get(o.id).classe]++);

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
      istruzione: "Aggiungi un contatto e fallo avanzare di fase con un clic. Il punteggio A/B/C dice quanto è coerente con capacità e margini.",
      azione: `<button class="pulsante accento" type="button" data-azione="nuovo">${icona("piu")} Nuovo contatto</button>`,
    })}

    <section class="riepilogo" aria-label="Riepilogo">
      <div><span>In trattativa</span><strong>${inTrattativa.length}</strong></div>
      <div><span>Valore annuo in trattativa</span><strong>${formattaEuro(inTrattativa.reduce((s, o) => s + valoreAnnuo(o), 0))}</strong></div>
      <div><span>Coerenza delle trattative</span><strong>
        <span class="badge badge-A">A ${classi.A}</span>
        <span class="badge badge-B">B ${classi.B}</span>
        <span class="badge badge-C">C ${classi.C}</span></strong></div>
    </section>

    ${sezioneDaFare()}

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

// Data in cui l'opportunità è entrata nella fase attuale (per ordinare le schede)
function dataFaseAttuale(o) {
  return o.perso ? o.perso.data : o.storico[CONFIG.fasi[faseRaggiunta(o)].id];
}

function schedaOpportunita(o, p) {
  const fase = faseAttuale(o);
  let fondo;
  if (fase === "perso") {
    fondo = `<p class="scheda-nota">Perso il ${formattaData(o.perso.data)} · ${esc(o.perso.motivo)}</p>`;
  } else if (fase === "contratto") {
    fondo = statoCommessa(o);
  } else {
    const azione = CONFIG.fasi[faseRaggiunta(o)].azione;
    fondo = `
      <div class="scheda-azioni">
        <button class="pulsante primario piccolo" type="button" data-azione="avanza" data-id="${o.id}">${azione} ${icona("freccia")}</button>
        <button class="pulsante-testo" type="button" data-azione="perso" data-id="${o.id}">Segna come perso</button>
      </div>`;
  }
  return `
    <article class="scheda ${o.id === ultimaModificata ? "evidenziata" : ""}" id="scheda-${o.id}">
      <div class="scheda-alto">
        <button class="scheda-nome" type="button" data-azione="dettaglio" data-id="${o.id}" title="Apri il dettaglio">${esc(nomeCliente(o))}</button>
        ${badgePunteggio(p)}
      </div>
      <p class="scheda-meta">${esc(settoreDi(o))} · ${esc(o.comune)}</p>
      <p class="scheda-meta">${esc(o.servizio)} · ${o.ore} h/mese</p>
      <p class="scheda-valore">${formattaEuro(valoreAnnuo(o))}/anno · margine ${formattaPercentuale(marginePercentuale(o, stato.opportunita))}</p>
      ${fondo}
    </article>`;
}

// Riga di stato per i contratti: assegnato, in attesa del partner o da assegnare
function statoCommessa(o) {
  if (o.allocazione) {
    const nome = o.allocazione.tipo === "squadra"
      ? trovaSquadra(o.allocazione.id).nome
      : "Partner: " + trovaPartner(o.allocazione.id).nome;
    return `<p class="scheda-stato ok">${icona("spunta")} ${nome}</p>`;
  }
  const attesa = propostaInAttesa(o);
  const testo = attesa ? "In attesa di risposta da " + trovaPartner(attesa.partnerId).nome : "Da assegnare";
  return `
    <p class="scheda-stato ${attesa ? "attesa" : "da-fare"}">${icona("orologio")} ${testo}</p>
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
                const chi = interna ? trovaSquadra(o.allocazione.id).nome : trovaPartner(o.allocazione.id).nome;
                return `<tr>
                  <td>${o.codice}</td><td><a class="link" href="#cliente-${o.aziendaId}">${esc(nomeCliente(o))}</a></td><td>${esc(o.servizio)}</td><td>${esc(o.comune)}</td>
                  <td class="num">${o.ore}</td>
                  <td>${chi}<br><span class="nota-piccola">${interna ? "Squadra interna" : "Impresa partner"}</span></td>
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
                <td>${r.opp.codice} · ${esc(nomeCliente(r.opp))}</td>
                <td>${trovaPartner(r.partnerId).nome}</td>
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
        <p><strong>${squadra.nome}</strong> · ${squadra.caposquadra} · ${oreLibereSquadra(squadra, stato.opportunita, o.id)} ore libere al mese (ne servono ${o.ore})</p>
        <button class="pulsante primario" type="button" data-azione="assegna-squadra" data-id="${o.id}">Assegna a ${squadra.nome}</button>
      </div>`;
  } else {
    // 2. Nessuna squadra: si propone a un partner, uno alla volta
    const rifiuti = (o.proposte || []).filter((p) => p.esito === "no");
    const attesa = propostaInAttesa(o);
    let corpo;
    if (attesa) {
      const partner = trovaPartner(attesa.partnerId);
      corpo = `
        <p class="passo-titolo">${icona("orologio")} In attesa di risposta da ${partner.nome}</p>
        <p class="nota-piccola">Proposta inviata il ${formattaData(attesa.data)}. Registra qui la risposta arrivata su WhatsApp:</p>
        <div class="pulsanti-risposta">
          <button class="pulsante si" type="button" data-azione="risposta-si" data-id="${o.id}">${icona("spunta")} Ha risposto SÌ</button>
          <button class="pulsante no" type="button" data-azione="risposta-no" data-id="${o.id}">${icona("x")} Ha risposto NO</button>
        </div>
        <a class="link" href="${linkWhatsApp(o, partner)}" target="_blank" rel="noopener">Riapri il messaggio su WhatsApp</a>`;
    } else {
      const partner = prossimoPartner(o);
      if (partner) {
        corpo = `
          <p class="passo-titolo">Partner proposto: ${partner.nome}</p>
          <p class="nota-piccola">${requisitiPartner(partner).testo} · zone: ${partner.zone.join(", ")}</p>
          <blockquote class="messaggio"><span class="messaggio-titolo">Messaggio precompilato</span>${esc(testoWhatsApp(o, partner)).replace(/\n/g, "<br>")}</blockquote>
          <a class="pulsante whatsapp" href="${linkWhatsApp(o, partner)}" target="_blank" rel="noopener"
             data-azione="proponi" data-id="${o.id}" data-partner="${partner.id}">${icona("messaggio")} Proponi su WhatsApp</a>`;
      } else if (rifiuti.length) {
        corpo = `
          <p class="passo-titolo avviso">${icona("attenzione")} Tutti i partner idonei hanno risposto NO</p>
          <p class="nota-piccola">Valuta con il cliente un rinvio dell'avvio o cerca un nuovo partner con DURC regolare in ${zona}.</p>`;
      } else {
        corpo = `
          <p class="passo-titolo avviso">${icona("attenzione")} Nessun partner idoneo in ${zona}</p>
          <p class="nota-piccola">Valuta con il cliente un rinvio dell'avvio o cerca un partner con DURC regolare in questa zona.</p>`;
      }
    }
    passo = `
      <div class="passo passo-partner">
        <p class="avviso-capacita">${icona("attenzione")} Nessuna squadra interna in ${zona} ha ${o.ore} ore libere al mese per ${o.servizio.toLowerCase()}.</p>
        ${rifiuti.length ? `<ul class="rifiuti">${rifiuti.map((r) => `<li>${icona("x")} ${trovaPartner(r.partnerId).nome} ha risposto NO il ${formattaData(r.data)}</li>`).join("")}</ul>` : ""}
        ${corpo}
      </div>`;
  }

  return `
    <article class="riquadro commessa ${o.id === ultimaModificata ? "evidenziata" : ""}" id="commessa-${o.id}">
      <header class="commessa-testa">
        <div>
          <p class="commessa-codice">${o.codice}</p>
          <h3><a class="link-titolo" href="#cliente-${o.aziendaId}">${esc(nomeCliente(o))}</a></h3>
        </div>
        <p class="commessa-dati">${esc(o.servizio)} · ${esc(o.comune)} (${zona}) · ${o.ore} h/mese · firmato il ${formattaData(o.storico.contratto)}</p>
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
          Perse: ${perse.length}${perse.length ? " (" + Object.entries(motivi).map(([m, q]) => m.toLowerCase() + " " + q).join(", ") + ")" : ""}.
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

function apriFinestra(html, etichetta) {
  finestra.innerHTML = `<div class="finestra-contenuto">${html}</div>`;
  finestra.setAttribute("aria-label", etichetta);
  finestra.showModal();
  const primo = finestra.querySelector("input, select, textarea");
  if (primo) primo.focus();
}

function chiudiFinestra() {
  finestra.close();
}

// Dettaglio di un'opportunità: perché ha quel punteggio e storico delle fasi
function apriDettaglio(id) {
  const o = trova(id);
  const p = calcolaPunteggio(o, stato.opportunita);
  const s = CONFIG.punteggio.soglie;
  const ref = trovaReferente(o.referenteId);
  const passi = CONFIG.fasi.filter((f) => o.storico[f.id])
    .map((f) => `<li>${f.nome}: ${formattaData(o.storico[f.id])}</li>`).join("");
  apriFinestra(`
    <div class="finestra-testa"><h2>${esc(nomeCliente(o))}</h2>${badgePunteggio(p)}</div>
    <p class="nota-piccola">${esc(o.servizio)} · ${o.ore} h/mese · tariffa ${formattaEuro(tariffaOraria(o))}/ora · sede di lavoro: ${esc(o.comune)} · rif. ${o.codice}<br>
      Referente: ${ref ? esc(ref.nome) + (ref.ruolo ? " (" + esc(ref.ruolo) + ")" : "") : "non indicato"}</p>
    <h3>Punteggio di coerenza: ${p.totale} su 100 (classe ${p.classe})</h3>
    ${tabellaCriteri(p)}
    <p class="nota-piccola">Classe A da ${s.A} punti, B da ${s.B}, C sotto ${s.B}.</p>
    <h3>Storico</h3>
    <ol class="storico">${passi}${o.perso ? `<li>Perso: ${formattaData(o.perso.data)} · ${esc(o.perso.motivo)}</li>` : ""}</ol>
    ${o.motivazioneC ? `<p class="nota-c">Offerta inviata nonostante il punteggio C. Motivazione: ${esc(o.motivazioneC)}</p>` : ""}
    <div class="azioni-finestra">
      <a class="pulsante secondario" href="#cliente-${o.aziendaId}" data-azione="chiudi">Apri la scheda cliente</a>
      <button class="pulsante primario" type="button" data-azione="chiudi">Chiudi</button>
    </div>`,
    "Dettaglio opportunità");
}

const opzioni = (valori, scelto) =>
  valori.map((v) => `<option value="${esc(v)}" ${v === scelto ? "selected" : ""}>${esc(v)}</option>`).join("");

const opzioniComuni = (scelto) =>
  CONFIG.comuni.map((c) => `<option value="${esc(c.nome)}" ${c.nome === scelto ? "selected" : ""}>${esc(c.nome)}${c.km ? " (" + c.km + " km)" : ""}</option>`).join("");

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
          ${aziende.map((a) => `<option value="${a.id}" ${a.id === aziendaId ? "selected" : ""}>${esc(a.ragioneSociale)}</option>`).join("")}
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

function opzioniReferenti(aziendaId) {
  const refs = referentiDi(aziendaId);
  if (!refs.length) return '<option value="">Nessun referente registrato</option>';
  const principale = refs.find((r) => r.decisore) || refs[0];
  return refs.map((r) => `<option value="${r.id}" ${r.id === principale.id ? "selected" : ""}>${esc(r.nome)}${r.ruolo ? " · " + esc(r.ruolo) : ""}${r.decisore ? " (decisore)" : ""}</option>`).join("");
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
    tariffa: tariffa > 0 && tariffa !== CONFIG.servizi[servizio].tariffa ? tariffa : null,
    storico: { contatto: oggi() },
    perso: null,
    allocazione: null,
    proposte: [],
  };
  return { opp, nuovaAzienda, nuovoReferente };
}

function aggiornaAnteprima() {
  const modulo = document.getElementById("modulo-contatto");
  const box = document.getElementById("anteprima-punteggio");
  if (!modulo || !box) return;
  const { opp, nuovaAzienda, nuovoReferente } = leggiModulo(modulo);
  if (opp.ore <= 0) {
    box.innerHTML = '<p class="nota-piccola">Inserisci le ore al mese per calcolare il punteggio di coerenza.</p>';
    return;
  }
  // Per l'anteprima l'azienda nuova non è ancora salvata: la si passa direttamente
  if (nuovaAzienda) {
    opp._azienda = nuovaAzienda;
    opp._decisore = nuovoReferente && nuovoReferente.decisore ? nuovoReferente : null;
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
  salva();
  chiudiFinestra();
  faseSelezionata = "contatto";
  ultimaModificata = opp.id;
  if (schermataAttuale().nome !== "pipeline") location.hash = "pipeline";
  else disegna();
  mostraAvviso("Contatto creato: " + nomeCliente(opp));
}

// Conferma motivata per inviare un'offerta a un cliente C
function apriConfermaC(o) {
  const p = calcolaPunteggio(o, stato.opportunita);
  const deboli = p.criteri.filter((c) => c.valore < 1);
  apriFinestra(`
    <form class="modulo" id="modulo-conferma-c" data-id="${o.id}">
      <div class="finestra-testa"><h2>Cliente fuori dai criteri del pilota</h2>${badgePunteggio(p)}</div>
      <p>${esc(nomeCliente(o))} ha un punteggio di coerenza ${p.totale} su 100 (classe C). I punti deboli:</p>
      <ul class="storico">${deboli.map((c) => `<li><strong>${c.nome}</strong>: ${esc(c.nota)} (${c.punti}/${c.peso})</li>`).join("")}</ul>
      <label>Per inviare comunque l'offerta, scrivi la motivazione (resterà registrata)
        <textarea name="motivazione" required minlength="5" placeholder="Es. cliente strategico per entrare nel settore"></textarea>
      </label>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Invia comunque l'offerta</button>
      </div>
    </form>`, "Conferma per punteggio C");
}

// Motivo della perdita
function apriPerso(id) {
  const o = trova(id);
  apriFinestra(`
    <form class="modulo" id="modulo-perso" data-id="${o.id}">
      <h2>Segna come perso</h2>
      <p>${esc(nomeCliente(o))} uscirà dalla pipeline attiva, ma resterà nei conteggi degli indicatori.</p>
      <label>Motivo
        <select name="motivo">${CONFIG.motiviPerdita.map((m) => `<option>${esc(m)}</option>`).join("")}</select>
      </label>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Segna come perso</button>
      </div>
    </form>`, "Segna come perso");
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

// Porta l'opportunità alla fase successiva
function avanza(id) {
  const o = trova(id);
  const prossima = CONFIG.fasi[faseRaggiunta(o) + 1];
  if (!prossima || o.perso) return;
  const p = calcolaPunteggio(o, stato.opportunita);
  if (prossima.id === "offerta" && p.classe === "C" && CONFIG.punteggio.confermaPerPunteggioC && !o.motivazioneC) {
    apriConfermaC(o);
    return;
  }
  registraFase(o, prossima);
}

function registraFase(o, fase) {
  o.storico[fase.id] = oggi();
  registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: o.servizio + ": fase «" + fase.nome + "»" });
  salva();
  faseSelezionata = fase.id;
  ultimaModificata = o.id;
  disegna();
  mostraAvviso(fase.id === "contratto"
    ? "Contratto firmato. Ora assegna la commessa in Allocazione."
    : nomeCliente(o) + " passa a «" + fase.nome + "»");
}

function assegnaSquadra(id) {
  const o = trova(id);
  const squadra = squadraDisponibile(o, stato.opportunita);
  if (!squadra) return;
  o.allocazione = { tipo: "squadra", id: squadra.id, data: oggi() };
  registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: o.servizio + ": commessa assegnata a " + squadra.nome });
  salva();
  disegna();
  mostraAvviso("Commessa assegnata a " + squadra.nome);
}

// Registra la proposta "in attesa di risposta" (il link apre WhatsApp in una nuova scheda)
function proponi(id, partnerId) {
  const o = trova(id);
  if (!propostaInAttesa(o)) {
    o.proposte = o.proposte || [];
    o.proposte.push({ partnerId, data: oggi(), esito: "attesa" });
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: o.servizio + ": proposta su WhatsApp al partner " + trovaPartner(partnerId).nome });
  }
  salva();
  ultimaModificata = o.id;
  // Si ridisegna subito dopo, così il link fa in tempo ad aprire WhatsApp
  setTimeout(disegna, 0);
  mostraAvviso("Messaggio pronto su WhatsApp. Registra qui la risposta del partner.");
}

function rispostaPartner(id, esito) {
  const o = trova(id);
  const attesa = propostaInAttesa(o);
  if (!attesa) return;
  attesa.esito = esito;
  const partner = trovaPartner(attesa.partnerId);
  if (esito === "si") {
    // Ricontrollo dei requisiti al momento della conferma
    const req = requisitiPartner(partner, dataAvvio(o));
    if (!req.idoneo) {
      attesa.esito = "no";
      mostraAvviso(partner.nome + " non è più idoneo (" + req.testo + "): proponi al partner successivo");
    } else {
      o.allocazione = { tipo: "partner", id: partner.id, data: oggi() };
      registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: o.servizio + ": commessa assegnata al partner " + partner.nome });
      mostraAvviso("Commessa assegnata a " + partner.nome + " — il cliente resta di Gate");
    }
  } else {
    const successivo = prossimoPartner(o);
    mostraAvviso(partner.nome + " ha risposto NO" + (successivo ? " — ora proponi a " + successivo.nome : ""));
  }
  salva();
  ultimaModificata = o.id;
  disegna();
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
  "esporta-backup": () => esportaBackup(),
  "esporta-csv": () => esportaCsvClienti(),
  "importa-backup": () => document.getElementById("file-backup").click(),
  ...AZIONI_CLIENTI,
  "conferma-ripristino": () => {
    stato = datiIniziali();
    salva();
    faseSelezionata = "contatto";
    chiudiFinestra();
    disegna();
    mostraAvviso("Dati di esempio ripristinati");
  },
};

document.addEventListener("click", (evento) => {
  const el = evento.target.closest("[data-azione]");
  if (el && AZIONI[el.dataset.azione]) AZIONI[el.dataset.azione](el, evento);
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
  if (modulo.id === "modulo-contatto") {
    salvaContatto(modulo);
  } else if (modulo.id === "modulo-conferma-c") {
    const testo = modulo.motivazione.value.trim();
    if (testo.length < 5) {
      modulo.motivazione.setCustomValidity("Scrivi una motivazione di almeno 5 caratteri");
      modulo.motivazione.reportValidity();
      modulo.motivazione.setCustomValidity("");
      return;
    }
    const o = trova(modulo.dataset.id);
    o.motivazioneC = testo;
    chiudiFinestra();
    registraFase(o, CONFIG.fasi.find((f) => f.id === "offerta"));
  } else if (GESTORI_MODULI[modulo.id]) {
    // Moduli della schermata Clienti (clienti.js)
    GESTORI_MODULI[modulo.id](modulo);
  } else if (modulo.id === "modulo-perso") {
    const o = trova(modulo.dataset.id);
    o.perso = { data: oggi(), motivo: modulo.motivo.value };
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: o.servizio + ": opportunità persa (" + o.perso.motivo + ")" });
    salva();
    chiudiFinestra();
    faseSelezionata = "perso";
    ultimaModificata = o.id;
    disegna();
    mostraAvviso("Opportunità segnata come persa: " + nomeCliente(o));
  }
});

// Anteprima del punteggio mentre si compila il modulo; ricerca nell'elenco clienti
document.addEventListener("input", (evento) => {
  if (evento.target.closest("#modulo-contatto")) aggiornaAnteprima();
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
  if (!campo.form || campo.form.id !== "modulo-contatto") return;
  // Cambiando servizio, la tariffa torna quella standard del nuovo servizio
  if (campo.name === "servizio") campo.form.tariffa.value = CONFIG.servizi[campo.value].tariffa;
  // Scegliendo un'azienda esistente si nascondono i campi della nuova azienda
  if (campo.name === "azienda") {
    const azienda = trovaAzienda(campo.value);
    document.getElementById("gruppo-nuova-azienda").hidden = !!azienda;
    document.getElementById("gruppo-referente").hidden = !azienda;
    campo.form.referente.innerHTML = azienda ? opzioniReferenti(azienda.id) : "";
    if (azienda) campo.form.comune.value = azienda.comune;
  }
  aggiornaAnteprima();
});

// ========================================================= AVVISI E DISEGNO

let timerAvviso;
function mostraAvviso(testo) {
  const el = document.getElementById("avviso");
  el.textContent = testo;
  el.classList.add("visibile");
  clearTimeout(timerAvviso);
  timerAvviso = setTimeout(() => el.classList.remove("visibile"), 4000);
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
  document.getElementById("schermata").innerHTML = SCHERMATE[nome](parametro);

  // Voce di menu attiva
  document.querySelectorAll("[data-vai]").forEach((a) => {
    if (a.dataset.vai === menu) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  // Numero di attività in scadenza accanto alla voce "Clienti"
  const scadute = attivitaDaFare().filter((x) => x.data <= oggi()).length;
  const conteggioClienti = document.getElementById("conteggio-clienti");
  conteggioClienti.textContent = scadute;
  conteggioClienti.hidden = scadute === 0;
  conteggioClienti.setAttribute("aria-label", scadute + " attività da fare entro oggi");

  // Numero di commesse da assegnare accanto alla voce "Allocazione"
  const daAssegnare = stato.opportunita.filter((o) => o.storico.contratto && !o.perso && !o.allocazione).length;
  const conteggio = document.getElementById("conteggio-allocazione");
  conteggio.textContent = daAssegnare;
  conteggio.hidden = daAssegnare === 0;
  conteggio.setAttribute("aria-label", daAssegnare + " commesse da assegnare");

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
  document.getElementById("avviso").classList.remove("visibile");
  disegna();
  window.scrollTo(0, 0);
});

disegna();
