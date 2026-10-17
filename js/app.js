/*
 * APPLICAZIONE
 * Stato salvato nel browser, le tre schermate (Pipeline, Allocazione, Indicatori),
 * le finestre di dialogo e la gestione dei clic.
 */

// =================================================================== STATO

// Codice commessa progressivo, es. GT-2026-017
function codiceCommessa(numero) {
  return "GT-" + new Date().getFullYear() + "-" + String(numero).padStart(3, "0");
}

// Copia i dati di esempio della configurazione nello stato iniziale
function datiIniziali() {
  const opportunita = CONFIG.opportunita.map((esempio, i) => ({
    id: "op" + (i + 1),
    codice: codiceCommessa(i + 1),
    tariffa: null,
    perso: null,
    allocazione: null,
    proposte: [],
    ...JSON.parse(JSON.stringify(esempio)),
  }));
  return { opportunita, contatore: opportunita.length };
}

// Legge i dati salvati nel browser; se non ci sono, usa gli esempi
function carica() {
  try {
    const salvato = localStorage.getItem(CONFIG.chiaveSalvataggio);
    if (salvato) return JSON.parse(salvato);
  } catch (e) {
    // Salvataggio non disponibile (es. navigazione privata): si usano gli esempi
  }
  return datiIniziali();
}

function salva() {
  try {
    localStorage.setItem(CONFIG.chiaveSalvataggio, JSON.stringify(stato));
  } catch (e) {
    // Se il browser non permette di salvare, il prototipo funziona comunque
  }
}

let stato = carica();
let faseSelezionata = "contatto"; // fase mostrata su schermi stretti
let ultimaModificata = null;      // scheda da evidenziare dopo un'azione

function trova(id) {
  return stato.opportunita.find((o) => o.id === id);
}

// ================================================================== ICONE

const ICONE = {
  piu: '<path d="M12 5v14M5 12h14"/>',
  freccia: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  spunta: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  attenzione: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  messaggio: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  orologio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
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
        <button class="scheda-nome" type="button" data-azione="dettaglio" data-id="${o.id}" title="Apri il dettaglio">${esc(o.cliente)}</button>
        ${badgePunteggio(p)}
      </div>
      <p class="scheda-meta">${esc(o.settore)} · ${esc(o.comune)}</p>
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
                  <td>${o.codice}</td><td>${esc(o.cliente)}</td><td>${esc(o.servizio)}</td><td>${esc(o.comune)}</td>
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
                <td>${r.opp.codice} · ${esc(r.opp.cliente)}</td>
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
        <p><strong>Pulizia professionale · Modugno</strong></p>
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
        <p><strong>${squadra.nome}</strong> · ${squadra.caposquadra} · ${oreLibereSquadra(squadra, stato.opportunita)} ore libere al mese (ne servono ${o.ore})</p>
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
      } else {
        corpo = `
          <p class="passo-titolo avviso">${icona("attenzione")} Nessun partner idoneo disponibile</p>
          <p class="nota-piccola">Valuta con il cliente un rinvio dell'avvio, oppure aggiungi in config.js un partner con DURC regolare per ${zona}.</p>`;
      }
    }
    passo = `
      <div class="passo passo-partner">
        <p class="avviso-capacita">${icona("attenzione")} Nessuna squadra interna con ore libere in ${zona} per ${o.servizio.toLowerCase()}.</p>
        ${rifiuti.length ? `<ul class="rifiuti">${rifiuti.map((r) => `<li>${icona("x")} ${trovaPartner(r.partnerId).nome} ha risposto NO il ${formattaData(r.data)}</li>`).join("")}</ul>` : ""}
        ${corpo}
      </div>`;
  }

  return `
    <article class="riquadro commessa ${o.id === ultimaModificata ? "evidenziata" : ""}" id="commessa-${o.id}">
      <header class="commessa-testa">
        <div>
          <p class="commessa-codice">${o.codice}</p>
          <h3>${esc(o.cliente)}</h3>
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
      formula: `Contratti firmati ÷ offerte presentate = ${k.contratti} ÷ ${k.offerte} = ${formattaPercentuale(k.conversioneOfferte)}`,
      obiettivo: "≥ " + formattaPercentuale(ob.conversioneOfferte),
      raggiunto: k.conversioneOfferte >= ob.conversioneOfferte,
    }),
  ];

  const efficienza = [
    tesseraKpi({
      etichetta: "Costo di acquisizione",
      valore: k.contratti ? formattaEuro(k.costoAcquisizione) : "n.d.",
      dettaglio: "per ogni contratto firmato",
      formula: `(${k.contatti} contatti × ${formattaEuro(c.perContatto)} + ${k.sopralluoghi} sopralluoghi × ${formattaEuro(c.perSopralluogo)} + ${k.offerte} offerte × ${formattaEuro(c.perOfferta)} + ${formattaEuro(c.fissiCampagna)} di campagna) ÷ ${k.contratti} contratti = ${formattaEuro(k.costiCommerciali)} ÷ ${k.contratti} = ${k.contratti ? formattaEuro(k.costoAcquisizione) : "n.d."}`,
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
  const passi = CONFIG.fasi.filter((f) => o.storico[f.id])
    .map((f) => `<li>${f.nome}: ${formattaData(o.storico[f.id])}</li>`).join("");
  apriFinestra(`
    <div class="finestra-testa"><h2>${esc(o.cliente)}</h2>${badgePunteggio(p)}</div>
    <p class="nota-piccola">${esc(o.settore)} · ${esc(o.comune)} · ${esc(o.servizio)} · ${o.ore} h/mese · tariffa ${formattaEuro(tariffaOraria(o))}/ora · rif. ${o.codice}<br>
      Referente: ${esc(o.referente) || "non indicato"}</p>
    <h3>Punteggio di coerenza: ${p.totale} su 100 (classe ${p.classe})</h3>
    ${tabellaCriteri(p)}
    <p class="nota-piccola">Classe A da ${s.A} punti, B da ${s.B}, C sotto ${s.B}. Pesi e soglie sono nel file config.js.</p>
    <h3>Storico</h3>
    <ol class="storico">${passi}${o.perso ? `<li>Perso: ${formattaData(o.perso.data)} · ${esc(o.perso.motivo)}</li>` : ""}</ol>
    ${o.motivazioneC ? `<p class="nota-c">Offerta inviata nonostante il punteggio C. Motivazione: ${esc(o.motivazioneC)}</p>` : ""}
    <div class="azioni-finestra"><button class="pulsante primario" type="button" data-azione="chiudi">Chiudi</button></div>`,
    "Dettaglio opportunità");
}

// Modulo "Nuovo contatto" con anteprima del punteggio
function apriNuovoContatto() {
  const servizi = Object.keys(CONFIG.servizi);
  const opzioni = (valori, scelto) => valori.map((v) => `<option value="${esc(v)}" ${v === scelto ? "selected" : ""}>${esc(v)}</option>`).join("");
  apriFinestra(`
    <form class="modulo" id="modulo-contatto" novalidate>
      <div>
        <h2>Nuovo contatto</h2>
        <p class="nota-piccola">Compila i dati essenziali: il punteggio di coerenza si aggiorna mentre scrivi.</p>
      </div>
      <label>Ragione sociale del cliente
        <input name="cliente" required autocomplete="off" placeholder="Es. Studio Commercialisti Omega">
      </label>
      <div class="riga-doppia">
        <label>Settore
          <select name="settore">${opzioni(CONFIG.settori, CONFIG.pilota.settore)}</select>
        </label>
        <label>Comune
          <select name="comune">${CONFIG.comuni.map((c) => `<option value="${esc(c.nome)}">${esc(c.nome)}${c.km ? " (" + c.km + " km)" : ""}</option>`).join("")}</select>
        </label>
      </div>
      <div class="riga-doppia">
        <label>Servizio richiesto
          <select name="servizio">${opzioni(servizi, servizi[0])}</select>
        </label>
        <label>Ore al mese (stima)
          <input name="ore" type="number" inputmode="numeric" min="1" step="1" required placeholder="Es. 60">
        </label>
      </div>
      <div class="riga-doppia">
        <label>Tariffa oraria (€)
          <input name="tariffa" type="number" inputmode="decimal" min="1" step="0.5" value="${CONFIG.servizi[servizi[0]].tariffa}">
        </label>
        <label>Referente
          <input name="referente" autocomplete="off" placeholder="Nome e ruolo">
        </label>
      </div>
      <label class="spunta"><input name="decisore" type="checkbox"> Decisore identificato</label>
      <div class="anteprima" id="anteprima-punteggio" aria-live="polite"></div>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Salva contatto</button>
      </div>
    </form>`, "Nuovo contatto");
  aggiornaAnteprima();
}

// Legge il modulo e restituisce un'opportunità (non ancora salvata)
function leggiModulo(modulo) {
  const d = new FormData(modulo);
  const servizio = d.get("servizio");
  const tariffa = Number(d.get("tariffa"));
  return {
    cliente: String(d.get("cliente")).trim(),
    settore: d.get("settore"),
    comune: d.get("comune"),
    servizio,
    ore: Math.round(Number(d.get("ore"))) || 0,
    // La tariffa si salva solo se diversa da quella standard del servizio
    tariffa: tariffa > 0 && tariffa !== CONFIG.servizi[servizio].tariffa ? tariffa : null,
    decisore: d.get("decisore") === "on",
    referente: String(d.get("referente")).trim(),
    storico: { contatto: oggi() },
    perso: null,
    allocazione: null,
    proposte: [],
  };
}

function aggiornaAnteprima() {
  const modulo = document.getElementById("modulo-contatto");
  const box = document.getElementById("anteprima-punteggio");
  if (!modulo || !box) return;
  const o = leggiModulo(modulo);
  if (o.ore <= 0) {
    box.innerHTML = '<p class="nota-piccola">Inserisci le ore al mese per calcolare il punteggio di coerenza.</p>';
    return;
  }
  const p = calcolaPunteggio(o, stato.opportunita);
  box.innerHTML = `
    <p class="anteprima-testa">Punteggio di coerenza ${badgePunteggio(p)}
      <span class="nota-piccola">${formattaEuro(valoreAnnuo(o))} all'anno</span></p>
    ${tabellaCriteri(p)}`;
}

function salvaContatto(modulo) {
  const o = leggiModulo(modulo);
  if (!o.cliente || o.ore <= 0) {
    const campo = !o.cliente ? modulo.cliente : modulo.ore;
    campo.setCustomValidity(!o.cliente ? "Scrivi la ragione sociale" : "Inserisci le ore al mese");
    campo.reportValidity();
    campo.setCustomValidity("");
    return;
  }
  stato.contatore += 1;
  o.id = "op" + Date.now();
  o.codice = codiceCommessa(stato.contatore);
  stato.opportunita.push(o);
  salva();
  chiudiFinestra();
  faseSelezionata = "contatto";
  ultimaModificata = o.id;
  disegna();
  mostraAvviso("Contatto creato: " + o.cliente);
}

// Conferma motivata per inviare un'offerta a un cliente C
function apriConfermaC(o) {
  const p = calcolaPunteggio(o, stato.opportunita);
  const deboli = p.criteri.filter((c) => c.valore < 1);
  apriFinestra(`
    <form class="modulo" id="modulo-conferma-c" data-id="${o.id}">
      <div class="finestra-testa"><h2>Cliente fuori dai criteri del pilota</h2>${badgePunteggio(p)}</div>
      <p>${esc(o.cliente)} ha un punteggio di coerenza ${p.totale} su 100 (classe C). I punti deboli:</p>
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
      <p>${esc(o.cliente)} uscirà dalla pipeline attiva, ma resterà nei conteggi degli indicatori.</p>
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
  salva();
  faseSelezionata = fase.id;
  ultimaModificata = o.id;
  disegna();
  mostraAvviso(fase.id === "contratto"
    ? "Contratto firmato. Ora assegna la commessa in Allocazione."
    : o.cliente + " passa a «" + fase.nome + "»");
}

function assegnaSquadra(id) {
  const o = trova(id);
  const squadra = squadraDisponibile(o, stato.opportunita);
  if (!squadra) return;
  o.allocazione = { tipo: "squadra", id: squadra.id, data: oggi() };
  salva();
  disegna();
  mostraAvviso("Commessa assegnata a " + squadra.nome);
}

// Apre WhatsApp e registra la proposta "in attesa di risposta"
function proponi(id, partnerId, link) {
  const o = trova(id);
  window.open(link, "_blank", "noopener");
  if (!propostaInAttesa(o)) {
    o.proposte = o.proposte || [];
    o.proposte.push({ partnerId, data: oggi(), esito: "attesa" });
  }
  salva();
  ultimaModificata = o.id;
  disegna();
  mostraAvviso("Messaggio pronto su WhatsApp. Registra qui la risposta del partner.");
}

function rispostaPartner(id, esito) {
  const o = trova(id);
  const attesa = propostaInAttesa(o);
  if (!attesa) return;
  attesa.esito = esito;
  const partner = trovaPartner(attesa.partnerId);
  if (esito === "si") {
    o.allocazione = { tipo: "partner", id: partner.id, data: oggi() };
    mostraAvviso("Commessa assegnata a " + partner.nome + ". Il cliente resta di Gate.");
  } else {
    const successivo = prossimoPartner(o);
    mostraAvviso(partner.nome + " ha risposto NO." + (successivo ? " Proponi a " + successivo.nome + "." : ""));
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
  proponi: (el, evento) => {
    evento.preventDefault();
    proponi(el.dataset.id, el.dataset.partner, el.href);
  },
  "risposta-si": (el) => rispostaPartner(el.dataset.id, "si"),
  "risposta-no": (el) => rispostaPartner(el.dataset.id, "no"),
  ripristina: () => apriRipristino(),
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

// Invio dei moduli nelle finestre
document.addEventListener("submit", (evento) => {
  const modulo = evento.target;
  evento.preventDefault();
  if (modulo.id === "modulo-contatto") {
    salvaContatto(modulo);
  } else if (modulo.id === "modulo-conferma-c") {
    const testo = modulo.motivazione.value.trim();
    if (testo.length < 5) {
      modulo.motivazione.reportValidity();
      return;
    }
    const o = trova(modulo.dataset.id);
    o.motivazioneC = testo;
    chiudiFinestra();
    registraFase(o, CONFIG.fasi.find((f) => f.id === "offerta"));
  } else if (modulo.id === "modulo-perso") {
    const o = trova(modulo.dataset.id);
    o.perso = { data: oggi(), motivo: modulo.motivo.value };
    salva();
    chiudiFinestra();
    faseSelezionata = "perso";
    ultimaModificata = o.id;
    disegna();
    mostraAvviso(o.cliente + " segnato come perso");
  }
});

// Anteprima del punteggio mentre si compila il modulo
document.addEventListener("input", (evento) => {
  if (evento.target.closest("#modulo-contatto")) aggiornaAnteprima();
});

// Cambiando servizio, la tariffa torna quella standard del nuovo servizio
document.addEventListener("change", (evento) => {
  const campo = evento.target;
  if (campo.name === "servizio" && campo.form && campo.form.id === "modulo-contatto") {
    campo.form.tariffa.value = CONFIG.servizi[campo.value].tariffa;
    aggiornaAnteprima();
  }
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
  allocazione: disegnaAllocazione,
  indicatori: disegnaIndicatori,
};

function schermataAttuale() {
  const nome = location.hash.slice(1);
  return SCHERMATE[nome] ? nome : "pipeline";
}

// Ridisegna la schermata attuale a partire dallo stato
function disegna() {
  const nome = schermataAttuale();
  document.getElementById("schermata").innerHTML = SCHERMATE[nome]();

  // Voce di menu attiva
  document.querySelectorAll("[data-vai]").forEach((a) => {
    if (a.dataset.vai === nome) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  // Numero di commesse da assegnare accanto alla voce "Allocazione"
  const daAssegnare = stato.opportunita.filter((o) => o.storico.contratto && !o.perso && !o.allocazione).length;
  const conteggio = document.getElementById("conteggio-allocazione");
  conteggio.textContent = daAssegnare;
  conteggio.hidden = daAssegnare === 0;
  conteggio.setAttribute("aria-label", daAssegnare + " commesse da assegnare");

  // Porta in vista la scheda appena modificata
  if (ultimaModificata) {
    const el = document.getElementById("scheda-" + ultimaModificata) || document.getElementById("commessa-" + ultimaModificata);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    ultimaModificata = null;
  }
}

window.addEventListener("hashchange", () => {
  disegna();
  window.scrollTo(0, 0);
});

disegna();
