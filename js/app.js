/*
 * APPLICAZIONE
 * Le trattative per fase (sotto le schede di «Oggi», oggi.js), le schermate Allocazione e Indicatori,
 * le finestre di dialogo, la gestione dei clic e il disegno della pagina. La schermata Clienti è in clienti.js,
 * il salvataggio dei dati in dati.js.
 */

let stato = carica();
let faseSelezionata = "contatto"; // fase mostrata su schermi stretti
let ultimaModificata = null;      // scheda da evidenziare dopo un'azione
let espanse = {};                 // colonne delle trattative per fase mostrate per intero (oltre le 20 schede)
let elenchiAperti = { "da-seguire": false }; // «Tutte le trattative da seguire (N)» di «Poi, se resta tempo»
let modificheApplicate = 0;       // quante modifiche sono passate da applica(): l'«Annulla» nelle schede di Oggi vale solo per l'ultima

// Stato dell'interfaccia, separato dai dati: sopravvive ai ridisegni.
// filtri = ricerca e filtri dei Clienti; bozze = testo di «Registra un'attività» per azienda;
// provenienza = schermata da cui si è arrivati (per il link «← Oggi» della scheda cliente)
// oggi = schede e righe già in pagina in «Oggi» (precedenti, precedentiRighe), pulsanti toccati (toccate) e «Poi» aperto da telefono
// indicatori = livello (direzione, commerciale, operativo, altri) e fonte dei dati (fittizi, partenza, test) della schermata Indicatori
// allocazione = zona scelta nella tendina e riquadri aperti o chiusi a mano
const interfaccia = { filtri: { testo: "", settore: "", stato: "" }, bozze: {}, provenienza: "", indicatori: { livello: ruoloUtente().vista, fonte: "fittizi" },
  allocazione: { zona: "", aperti: {} }, oggi: statoOggiVuoto() };

// Stato dell'interfaccia di «Oggi» all'apertura della schermata (si azzera cambiando schermata)
function statoOggiVuoto() {
  return { precedenti: [], precedentiRighe: [], toccate: {}, poiAperto: false, clicInAlto: false, annullaScaduto: 0 };
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
  telefono: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  email: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  indietro: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  matita: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  cerca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sole: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  documento: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8"/>',
  righello: '<path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 15.5l2-2M17.5 6.5l2-2"/>',
};

function icona(nome) {
  return '<svg class="icona" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONE[nome] + "</svg>";
}

// ====================================================== PEZZI RIUTILIZZABILI

// Intestazione di pagina; l'occhiello è facoltativo (non serve dove ripeterebbe il menu)
function intestazione({ occhiello = "", titolo, istruzione, azione = "" }) {
  return `
    <header class="intestazione">
      <div>
        ${occhiello ? `<p class="occhiello">${occhiello}</p>` : ""}
        <h1 tabindex="-1">${titolo}</h1>
        ${istruzione ? `<p class="istruzione">${istruzione}</p>` : ""}
      </div>
      ${azione}
    </header>`;
}

// Punteggio di coerenza da 0 a 100, contornato con il colore della sua fascia (da bassissimo ad altissimo)
function badgePunteggio(p, grande = false) {
  const f = fasciaPunteggio(p.totale);
  return `<span class="badge badge-punteggio fascia-${f.nome}${grande ? " badge-grande" : ""}" title="Punteggio di coerenza: ${p.totale} su 100, ${f.nome}"><span class="solo-lettori">Punteggio di coerenza </span>${p.totale}<span class="solo-lettori">, ${f.nome}</span></span>`;
}

// Riga degli avvisi in cima a «Oggi» (vuota se non c'è nulla): ogni avviso porta dove si risolve
function rigaAvvisi() {
  const avvisi = avvisiScadenze();
  if (!avvisi.length) return "";
  return `<section class="riga-avvisi" aria-label="Avvisi">${icona("attenzione")}
    ${avvisi.map((x) => `<button class="chip chip-${x.tono} avviso-chip" type="button" data-azione="${x.azione}">${x.n !== null ? `<strong>${x.n}</strong> ` : ""}${esc(x.testo)}</button>`).join("")}
  </section>`;
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

// ===================================================== TRATTATIVE PER FASE

const LIMITE_COLONNA = 20; // schede mostrate per colonna prima di «Mostra altre N»

// Ordine delle schede in una colonna: le trattative ferme da più tempo in alto;
// tra i contratti prima quelli da assegnare; tra i persi i più recenti
function ordinaColonna(id, elenco) {
  if (id === "perso") return elenco.sort((a, b) => b.perso.data.localeCompare(a.perso.data));
  if (id === "contratto") return elenco.sort((a, b) => !!a.allocazione - !!b.allocazione || b.storico.contratto.localeCompare(a.storico.contratto));
  return elenco.sort((a, b) => dataFaseAttuale(a).localeCompare(dataFaseAttuale(b)) || nomeCliente(a).localeCompare(nomeCliente(b)));
}

// Seconda riga della testata di colonna: valore annuo totale e ponderato con la probabilità della fase
function valoreColonna(id, elenco) {
  const totale = formattaEuro(elenco.reduce((s, o) => s + valoreAnnuo(o), 0));
  if (id === "perso") return totale + " persi";
  if (id === "contratto") return totale + " firmati";
  return totale + " · ponderato " + formattaEuro(elenco.reduce((s, o) => s + ricaviAttesi(o), 0));
}

// Le trattative per fase, sotto le schede di «Oggi»: selettore delle fasi (schermi stretti) e tabellone con le 5 fasi più «Perso»
function sezioneFasi() {
  const tutte = stato.opportunita;
  const punteggi = new Map(tutte.map((o) => [o.id, calcolaPunteggio(o, tutte)]));

  // Colonne: le 5 fasi più "Perso"
  const colonne = CONFIG.fasi.map((f) => ({ id: f.id, nome: f.nome, metodo: f.metodo }));
  colonne.push({ id: "perso", nome: "Perso" });
  const perColonna = (id) => ordinaColonna(id, tutte.filter((o) => faseAttuale(o) === id));

  return `
    <nav class="selettore-fasi" aria-label="Scegli la fase da vedere">
      ${colonne.map((c) => `
        <button class="fase-pulsante" type="button" data-azione="fase" data-id="${c.id}" aria-pressed="${c.id === faseSelezionata}">
          ${c.nome} <span class="conteggio">${perColonna(c.id).length}</span>
        </button>`).join("")}
    </nav>

    <div class="tabellone">
      ${colonne.map((c) => {
        const elenco = perColonna(c.id);
        // Al massimo 20 schede; la scheda appena modificata si vede sempre
        const mostrate = espanse[c.id] ? elenco : elenco.slice(0, LIMITE_COLONNA);
        const modificata = elenco.find((o) => o.id === ultimaModificata);
        if (modificata && !mostrate.includes(modificata)) mostrate.push(modificata);
        const altre = elenco.length - mostrate.length;
        return `
          <section class="colonna colonna-${c.id} ${c.id === faseSelezionata ? "attiva" : ""}" aria-label="${c.nome}">
            <header class="colonna-testa">
              <div class="colonna-titolo">
                <h2${c.metodo ? ` title="Passo del metodo Gate: ${c.metodo}"` : ""}>${c.nome}</h2>
                ${c.metodo ? `<span class="metodo">${c.metodo}</span>` : ""}
                <span class="conteggio">${elenco.length}</span>
              </div>
              <p class="colonna-valore">${valoreColonna(c.id, elenco)}</p>
            </header>
            <div class="colonna-corpo">
              ${elenco.length ? mostrate.map((o) => schedaOpportunita(o, punteggi.get(o.id))).join("")
                : `<p class="vuoto">Nessuna trattativa in questa fase.${c.id === "contatto" ? " Le nuove richieste si registrano con «Nuova richiesta», in alto." : ""}</p>`}
            </div>
            ${altre > 0 ? `<button class="pulsante secondario piccolo mostra-altre" type="button" data-azione="mostra-tutte" data-id="${c.id}">Mostra altre ${altre}</button>` : ""}
          </section>`;
      }).join("")}
    </div>`;
}

// Una riga della scheda: icona, testo su una riga sola (con i puntini se serve), eventuale pulsante in coda.
// tono: "critico", "attenzione", "ok" oppure "" (neutro); colora l'icona e la parte in grassetto
function rigaScheda(nomeIcona, html, tono = "", { titolo = "", coda = "" } = {}) {
  return `<p class="scheda-riga ${tono}"${titolo ? ` title="${esc(titolo)}"` : ""}>${icona(nomeIcona)}<span class="scheda-riga-testo">${html}</span>${coda}</p>`;
}

// Scheda compatta: nome e A/B/C, comune · ore · servizio, valore e margine, stato, azioni
function schedaOpportunita(o, p) {
  const fase = faseAttuale(o);
  const nome = esc(nomeCliente(o));
  const alto = `
    <div class="scheda-alto">
      <button class="scheda-nome" type="button" data-azione="dettaglio" data-id="${esc(o.id)}" title="Apri il dettaglio di ${nome}">${nome}</button>
      ${badgePunteggio(p)}
    </div>`;

  // I persi restano compatti: nome e motivo
  if (fase === "perso") {
    return `
      <article class="scheda scheda-persa ${o.id === ultimaModificata ? "evidenziata" : ""}" id="scheda-${esc(o.id)}">
        ${alto}
        <p class="scheda-meta">Perso il ${formattaData(o.perso.data).slice(0, 5)} · ${esc(o.perso.motivo)}</p>
      </article>`;
  }

  const meta = esc(o.comune) + " · " + Number(o.ore) + " h/mese · " + esc(o.servizio);
  const margine = marginePercentuale(o, stato.opportunita);
  const soglie = CONFIG.punteggio.margine;
  const tonoMargine = margine >= soglie.obiettivo ? "chip-ok" : margine >= soglie.minimo ? "chip-attenzione" : "chip-critico";
  const settore = settoreDi(o);
  const avvisi = [
    datiServizio(o.servizio).fuoriElenco ? '<span class="chip chip-critico">Servizio non più in elenco: usa Modifica</span>' : "",
    settore !== CONFIG.pilota.settore ? `<span class="chip" title="Settore fuori dal pilota">Fuori pilota: ${esc(CONFIG.etichetteSettori[settore] || settore)}</span>` : "",
  ].join("");

  let stati;
  let azioni;
  if (fase === "contratto") {
    stati = statoCommessa(o);
    azioni = o.allocazione ? "" : `<a class="pulsante primario piccolo" href="#allocazione">Vai all'allocazione ${icona("freccia")}</a>`;
  } else {
    // In Qualificato, prima si fissa il sopralluogo in agenda; poi si registra che è stato fatto
    const fissato = fase === "qualificato" ? sopralluogoFissato(o) : null;
    stati = rigaRicontatto(o) + infoFase(o, fissato) + rigaStatoTrattativa(o, fissato);
    const pulsante = fase === "qualificato" && !fissato
      ? `<button class="pulsante primario piccolo" type="button" data-azione="fissa-sopralluogo" data-id="${esc(o.id)}">${icona("calendario")} Fissa sopralluogo</button>`
      : fase === "sopralluogo"
        ? `<a class="pulsante primario piccolo" href="#preventivo-${esc(o.id)}" title="Prepara il preventivo e registra l'offerta">Prepara l'offerta</a>`
        : `<button class="pulsante primario piccolo" type="button" data-azione="avanza" data-id="${esc(o.id)}" title="Registra che è già avvenuto">${icona("spunta")} ${CONFIG.fasi[faseRaggiunta(o)].azione}</button>`;
    azioni = pulsante + (fase === "offerta" ? `<button class="pulsante secondario piccolo" type="button" data-azione="firma-link" data-id="${esc(o.id)}" title="Invia l'offerta da firmare con un link">Firma da link</button>` : "")
      + (o.ricontatto ? `<button class="pulsante-testo" type="button" data-azione="ricontattato" data-id="${esc(o.id)}" title="Registra che hai ricontattato il cliente">Ricontattato</button>` : "")
      + `<button class="pulsante-testo" type="button" data-azione="perso" data-id="${esc(o.id)}" title="Segna come perso">Perso</button>`;
  }

  return `
    <article class="scheda ${o.id === ultimaModificata ? "evidenziata" : ""}" id="scheda-${esc(o.id)}">
      ${alto}
      <p class="scheda-meta" title="${meta}">${meta}</p>
      ${avvisi ? `<p class="scheda-avvisi">${avvisi}</p>` : ""}
      <p class="scheda-cifre"><strong>${formattaEuro(valoreAnnuo(o))}<small>/anno</small></strong>
        <span class="chip ${tonoMargine}" title="Margine stimato">margine ${formattaPercentuale(margine)}</span></p>
      ${stati ? `<div class="scheda-stati">${stati}</div>` : ""}
      ${azioni ? `<div class="scheda-azioni${fase === "offerta" || o.ricontatto ? " con-firma" : ""}">${azioni}</div>` : ""}
    </article>`;
}

// Riga «Da ricontattare il …»: rossa quando la data è arrivata o passata
function rigaRicontatto(o) {
  if (!o.ricontatto) return "";
  const scaduto = ricontattoScaduto(o);
  return rigaScheda("calendario", `<strong>${scaduto ? "Ricontattare: scaduto il " : "Da ricontattare il "}${formattaData(o.ricontatto.data).slice(0, 5)}</strong>${o.ricontatto.nota ? " · " + esc(o.ricontatto.nota) : ""}`,
    scaduto ? "critico" : "attenzione", { titolo: "Da ricontattare il " + formattaData(o.ricontatto.data) + (o.ricontatto.nota ? " · " + o.ricontatto.nota : "") });
}

// Informazioni della fase: sopralluogo fissato (Qualificato) o validità dell'offerta (Offerta)
function infoFase(o, fissato) {
  if (fissato) {
    return rigaScheda("calendario", `Sopralluogo <strong>${formattaGiorno(fissato.data)}${fissato.ora ? " · ore " + esc(fissato.ora) : ""}</strong>`);
  }
  if (faseAttuale(o) === "offerta" && o.scadenzaOfferta) {
    const giorno = formattaData(o.scadenzaOfferta).slice(0, 5);
    return o.scadenzaOfferta < oggi()
      ? rigaScheda("attenzione", `<strong>Offerta scaduta il ${giorno}</strong>`, "critico")
      : rigaScheda("calendario", `Valida fino al <strong>${giorno}</strong>`);
  }
  return "";
}

// Quando cade la prossima azione, in breve, con il tono del colore
function quandoBreve(data) {
  if (data < oggi()) return { testo: "In ritardo", tono: "critico" };
  if (data === oggi()) return { testo: "Oggi", tono: "attenzione" };
  if (data === traGiorni(1)) return { testo: "Domani", tono: "" };
  return { testo: data <= traGiorni(7) ? formattaGiorno(data) : formattaData(data).slice(0, 5), tono: "" };
}

// Righe di stato di una trattativa aperta: ferma da troppo tempo, poi la prossima azione (o «Fissala»).
// Se la prossima azione è il sopralluogo già mostrato sopra, non si ripete
function rigaStatoTrattativa(o, fissato = null) {
  const s = statoTrattativa(o);
  const ferma = s.ferma ? rigaScheda("orologio", `<strong>Ferma da ${giorni(s.giorniInFase)}</strong>`, "critico") : "";
  if (!s.prossima) {
    // Tutta la riga è il pulsante: nelle colonne strette «Fissala» si nasconde e resta il testo sottolineato
    return ferma + `<button class="scheda-riga scheda-riga-pulsante attenzione" type="button" data-azione="prossima-azione" data-id="${esc(o.aziendaId)}" title="Fissa la prossima azione">
      ${icona("attenzione")}<span class="scheda-riga-testo"><strong>Nessuna prossima azione</strong></span><span class="fissala">Fissala</span></button>`;
  }
  if (fissato && s.prossima.id === fissato.id) return ferma;
  const q = quandoBreve(s.prossima.data);
  return ferma + rigaScheda("freccia", `<strong>${q.testo}</strong> · ${esc(s.prossima.testo)}`, q.tono,
    { titolo: "Prossima azione: " + formattaData(s.prossima.data) + " · " + s.prossima.testo });
}

// Riga di stato per i contratti: assegnato, in attesa del partner o da assegnare
function statoCommessa(o) {
  if (o.allocazione && o.allocazione.tipo === "storico") return rigaScheda("spunta", "Commessa già avviata", "ok");
  if (o.allocazione) {
    return o.allocazione.tipo === "squadra"
      ? rigaScheda("spunta", `<strong>${esc(nomeSquadra(o.allocazione.id))}</strong>`, "ok")
      : rigaScheda("spunta", `Partner: <strong>${esc(nomePartner(o.allocazione.id))}</strong>`, "ok");
  }
  const attesa = propostaInAttesa(o);
  return attesa
    ? rigaScheda("orologio", `In attesa di <strong>${esc(nomePartner(attesa.partnerId))}</strong>`, "attenzione da-assegnare", { titolo: "In attesa di risposta da " + nomePartner(attesa.partnerId) })
    : rigaScheda("orologio", "<strong>Da assegnare</strong>", "attenzione da-assegnare");
}

// ============================================================= ALLOCAZIONE

function disegnaAllocazione() {
  const tutte = stato.opportunita;
  const firmati = tutte.filter((o) => o.storico.contratto && !o.perso);
  const daAssegnare = firmati.filter((o) => !o.allocazione)
    .sort((a, b) => b.storico.contratto.localeCompare(a.storico.contratto));
  const avviate = firmati.filter((o) => o.allocazione && o.allocazione.tipo === "storico").length;
  const assegnate = firmati.filter((o) => o.allocazione && o.allocazione.tipo !== "storico");
  const conPartner = CONFIG.funzioni.partner;
  const scelta = interfaccia.allocazione;

  // Tendina delle zone: solo quelle con commesse da assegnare (se la zona scelta si svuota, si torna a tutte)
  const zone = [...new Set(daAssegnare.map((o) => infoComune(o.comune).zona))].sort();
  if (!zone.includes(scelta.zona)) scelta.zona = "";
  const visibili = daAssegnare.filter((o) => !scelta.zona || infoComune(o.comune).zona === scelta.zona);
  const quante = (z) => daAssegnare.filter((o) => infoComune(o.comune).zona === z).length;

  // Tutte le proposte inviate ai partner, dalla più recente
  const registro = tutte
    .flatMap((o) => (o.proposte || []).map((p, i) => ({ ...p, ordine: i, opp: o })))
    .sort((a, b) => b.data.localeCompare(a.data) || b.ordine - a.ordine);
  const esiti = {
    attesa: `<span class="stato attenzione">${icona("orologio")} In attesa</span>`,
    si: `<span class="stato ok">${icona("spunta")} SÌ</span>`,
    no: `<span class="stato critico">${icona("x")} NO</span>`,
  };
  const sature = CONFIG.squadre.filter((sq) => oreLibereSquadra(sq, tutte) <= 0).length;
  const idonei = CONFIG.partner.filter((pa) => requisitiPartner(pa).idoneo).length;

  return `
    ${intestazione({
      titolo: "Chi esegue il servizio",
      istruzione: conPartner ? "Apri una commessa e assegnala: prima a una squadra Gate con ore libere nella zona, altrimenti a un'impresa partner su WhatsApp."
        : "Apri una commessa e assegnala a una squadra Gate con ore libere nella zona.",
    })}

    <section class="sezione">
      <div class="testa-sezione">
        <h2>Da assegnare <span class="conteggio">${daAssegnare.length}</span></h2>
        ${zone.length > 1 ? `<label class="filtro-zona">Zona
          <select id="filtro-zona">
            <option value="">Tutte le zone (${daAssegnare.length})</option>
            ${zone.map((z) => `<option value="${esc(z)}" ${z === scelta.zona ? "selected" : ""}>${esc(z)} (${quante(z)})</option>`).join("")}
          </select></label>` : ""}
      </div>
      ${visibili.length ? visibili.map((o) => schedaCommessa(o, visibili.length === 1)).join("")
        : '<p class="vuoto">Nessuna commessa da assegnare. I contratti firmati in «Oggi» compaiono qui.</p>'}
    </section>

    ${sezioneCapacitaFutura()}

    ${richiudibile("squadre-partner", `Squadre${conPartner ? " e partner" : ""}`,
      `${quanti(CONFIG.squadre.length, "squadra", "squadre")}${sature ? `, <span class="chip chip-attenzione">${quanti(sature, "satura", "sature")}</span>` : ""}${conPartner ? " · " + quanti(idonei, "partner idoneo", "partner idonei") : ""}`, `
      <ul class="regole" aria-label="Regole">
        <li>${icona("spunta")} Prima le squadre interne con ore libere nella zona</li>
        ${conPartner ? `<li>${icona("spunta")} Solo imprese partner con DURC regolare, nessun lavoratore autonomo</li>` : ""}
        <li>${icona("spunta")} Il cliente resta di Gate: Gate firma il contratto e controlla la qualità</li>
      </ul>
      <h3 class="titolo-gruppo">Squadre interne <span class="sottotitolo">ore al mese</span></h3>
      <div class="griglia tre">${CONFIG.squadre.map(schedaSquadra).join("")}</div>
      ${conPartner ? `<h3 class="titolo-gruppo">Imprese partner <span class="sottotitolo">in ordine di priorità</span></h3>
      <div class="griglia tre">${CONFIG.partner.map(schedaPartner).join("")}</div>` : ""}`)}

    ${richiudibile("assegnate", "Commesse assegnate", `<span class="conteggio">${assegnate.length}</span>`, `
      ${avviate ? `<p class="nota-piccola">Altre ${avviate} commesse erano già avviate: le loro ore sono già nelle ore impegnate delle squadre.</p>` : ""}
      ${assegnate.length ? `
        <div class="tabella-scorrevole">
          <table class="tabella impilata">
            <thead><tr><th>Rif.</th><th>Cliente</th><th>Servizio</th><th>Comune</th><th class="num">Ore/mese</th><th>Eseguita da</th><th class="num">Margine</th></tr></thead>
            <tbody>
              ${assegnate.map((o) => {
                const interna = o.allocazione.tipo === "squadra";
                const chi = interna ? nomeSquadra(o.allocazione.id) : nomePartner(o.allocazione.id);
                return `<tr>
                  <td data-etichetta="Rif."><span class="codice">${esc(o.codice)}</span></td>
                  <td data-etichetta="Cliente"><a class="link" href="#cliente-${esc(o.aziendaId)}">${esc(nomeCliente(o))}</a></td>
                  <td data-etichetta="Servizio">${esc(o.servizio)}</td>
                  <td data-etichetta="Comune">${esc(o.comune)}</td>
                  <td class="num" data-etichetta="Ore/mese">${Number(o.ore)}</td>
                  <td data-etichetta="Eseguita da"><span>${esc(chi)}<br><span class="nota-piccola">${interna ? "Squadra interna" : "Impresa partner"}</span></span></td>
                  <td class="num" data-etichetta="Margine">${formattaPercentuale(marginePercentuale(o, tutte))}</td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>` : '<p class="vuoto">Ancora nessuna commessa assegnata.</p>'}`)}

    ${conPartner ? richiudibile("proposte", "Registro delle proposte", `<span class="conteggio">${registro.length}</span>`, registro.length ? `
        <div class="tabella-scorrevole">
          <table class="tabella impilata">
            <thead><tr><th>Data</th><th>Commessa</th><th>Partner</th><th>Esito</th></tr></thead>
            <tbody>
              ${registro.map((r) => `<tr>
                <td data-etichetta="Data">${formattaData(r.data)}</td>
                <td data-etichetta="Commessa"><span><span class="codice">${esc(r.opp.codice)}</span> · ${esc(nomeCliente(r.opp))}</span></td>
                <td data-etichetta="Partner">${esc(nomePartner(r.partnerId))}</td>
                <td data-etichetta="Esito">${esiti[r.esito]}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>` : '<p class="vuoto">Nessuna proposta inviata.</p>') : ""}

    ${richiudibile("portale", "Portale partner", '<span class="chip">evoluzione futura</span>', `
      <p class="nota-piccola">Oggi il partner risponde SÌ o NO su WhatsApp e non usa nessuna app: la tecnologia sta solo dal lato Gate.
        In futuro un portale potrebbe permettere al partner di vedere le richieste, rispondere con un clic e caricare il DURC aggiornato.</p>
      <div class="anteprima-portale" aria-hidden="true">
        <p class="commessa-codice">RICHIESTA DA GATE S.R.L.</p>
        <p><strong>Pulizia Professionale · Modugno</strong></p>
        <p class="nota-piccola">60 ore al mese · avvio tra 15 giorni</p>
        <div class="pulsanti-risposta">
          <button class="pulsante si piccolo" type="button" disabled tabindex="-1">Accetto</button>
          <button class="pulsante no piccolo" type="button" disabled tabindex="-1">Rifiuto</button>
        </div>
      </div>`)}`;
}

// Riquadro richiudibile dell'Allocazione: titolo e riassunto sempre visibili, il resto con un clic (aperto o chiuso resta com'era)
function richiudibile(id, titolo, riassunto, corpo) {
  return `
    <details class="approfondimento" id="riquadro-${id}" data-ricorda="${id}" ${interfaccia.allocazione.aperti[id] ? "open" : ""}>
      <summary><span class="titolo-richiudibile">${titolo}</span> <span class="riassunto">${riassunto}</span></summary>
      ${corpo}
    </details>`;
}

// Commessa da assegnare: una riga con il prossimo passo, che si apre con un clic (squadra interna o proposta al partner)
function schedaCommessa(o, unica) {
  const zona = infoComune(o.comune).zona;
  const squadra = squadraDisponibile(o, stato.opportunita);
  let passo, prossimo;

  if (squadra) {
    // 1. C'è una squadra interna con ore libere
    prossimo = `<span class="chip chip-ok">${esc(squadra.nome)} disponibile</span>`;
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
      prossimo = `<span class="chip chip-attenzione">In attesa di ${esc(nomePartner(attesa.partnerId))}</span>`;
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
        prossimo = `<span class="chip chip-info">Da proporre a ${esc(partner.nome)}</span>`;
        corpo = `
          <p class="passo-titolo">Partner proposto: ${esc(partner.nome)}</p>
          <p class="nota-piccola">${requisitiPartner(partner).testo} · zone: ${esc(partner.zone.join(", "))}</p>
          <blockquote class="messaggio"><span class="messaggio-titolo">Messaggio precompilato</span>${esc(testoWhatsApp(o, partner)).replace(/\n/g, "<br>")}</blockquote>
          <a class="pulsante whatsapp" href="${esc(linkWhatsApp(o, partner))}" target="_blank" rel="noopener"
             data-azione="proponi" data-id="${esc(o.id)}" data-partner="${esc(partner.id)}">${icona("messaggio")} Proponi su WhatsApp</a>`;
      } else if (rifiuti.length) {
        prossimo = '<span class="chip chip-critico">Tutti i partner hanno detto NO</span>';
        corpo = `
          <p class="passo-titolo avviso">${icona("attenzione")} Tutti i partner idonei hanno risposto NO</p>
          <p class="nota-piccola">Valuta con il cliente un rinvio dell'avvio o cerca un nuovo partner con DURC regolare in ${esc(zona)}.</p>`;
      } else {
        prossimo = '<span class="chip chip-critico">Nessun partner idoneo</span>';
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

  const aperta = interfaccia.allocazione.aperti["commessa-" + o.id] ?? (unica || o.id === ultimaModificata);
  return `
    <details class="riquadro commessa ${o.id === ultimaModificata ? "evidenziata" : ""}" id="commessa-${esc(o.id)}" data-ricorda="commessa-${esc(o.id)}" ${aperta ? "open" : ""}>
      <summary class="commessa-testa">
        <span class="commessa-nome"><span class="commessa-codice">${esc(o.codice)}</span> <strong>${esc(nomeCliente(o))}</strong></span>
        <span class="commessa-dati">${esc(o.comune)} · ${Number(o.ore)} h/mese</span>
        ${prossimo}
      </summary>
      <p class="commessa-dati commessa-dettaglio">${esc(o.servizio)} · ${esc(o.comune)} (${esc(zona)}) · firmato il ${formattaData(o.storico.contratto)} ·
        <a class="link" href="#cliente-${esc(o.aziendaId)}">scheda cliente</a></p>
      ${passo}
    </details>`;
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

// ===================================================== FINESTRE DI DIALOGO

const finestra = document.getElementById("finestra");

let finestraApertaIl = 0;      // quando si è aperta l'ultima finestra (ms)
let finestraModificata = false; // l'utente ha scritto qualcosa nel modulo della finestra
let avvisoChiusuraIl = 0;       // quando è comparso «Hai modifiche non salvate» (0 = non mostrato)
let apertaDa = null;            // pulsante che ha aperto la finestra: { azione, id }
let ultimoComando = null;       // ultimo pulsante premuto (lo imposta il gestore dei clic)

// Apre la finestra di dialogo. Il titolo è il primo h2; larga = due colonne da 900 px (modulo + punteggio)
function apriFinestra(html, { larga = false } = {}) {
  finestra.innerHTML = `<div class="finestra-contenuto">${html}</div>
    <button class="pulsante-icona chiudi-finestra" type="button" data-azione="chiudi" aria-label="Chiudi" title="Chiudi">${icona("x")}</button>`;
  finestra.classList.toggle("larga", larga);
  const titolo = finestra.querySelector("h2");
  if (titolo) {
    titolo.id = "finestra-titolo";
    // Il blocco del titolo (titolo e sottotitolo) lascia spazio alla X
    if (titolo.parentElement.tagName === "DIV" && !titolo.parentElement.classList.contains("finestra-contenuto")) titolo.parentElement.classList.add("blocco-titolo");
  }
  finestra.setAttribute("aria-labelledby", "finestra-titolo");
  finestraApertaIl = Date.now();
  finestraModificata = false;
  avvisoChiusuraIl = 0;
  // Una finestra può aprirne un'altra (es. dal dettaglio a «Modifica»): si cambia solo il contenuto
  if (!finestra.open) {
    const origine = ultimoComando && ultimoComando.isConnected ? ultimoComando : document.activeElement;
    apertaDa = origine && origine.dataset && origine.dataset.azione ? { azione: origine.dataset.azione, id: origine.dataset.id || "" } : null;
    finestra.showModal();
  }
  finestra.scrollTop = 0;
  // Il cursore va sul campo indicato con autofocus, altrimenti sul primo campo visibile, altrimenti sul titolo
  const campi = [...finestra.querySelectorAll("[autofocus], input, select, textarea")].filter((c) => c.getClientRects().length);
  const primo = campi.find((c) => c.hasAttribute("autofocus")) || campi[0];
  if (primo) primo.focus();
  else if (titolo) {
    titolo.tabIndex = -1;
    titolo.focus();
  }
}

function chiudiFinestra() {
  finestra.close();
}

// Esc su un modulo già modificato: la prima volta avvisa dentro la finestra, la seconda chiude
function fermaChiusura(evento) {
  if (!finestraModificata) return;
  // Lo stesso tasto Esc può arrivare come keydown e poi come cancel: si ferma una volta sola
  if (avvisoChiusuraIl && Date.now() - avvisoChiusuraIl > 100) return;
  evento.preventDefault();
  if (avvisoChiusuraIl) return;
  avvisoChiusuraIl = Date.now();
  const barra = finestra.querySelector(".azioni-finestra");
  if (barra) barra.insertAdjacentHTML("afterbegin",
    `<p class="avviso-chiusura" role="alert">${icona("attenzione")} Hai modifiche non salvate: premi di nuovo Esc o Annulla per chiudere</p>`);
}

finestra.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") fermaChiusura(evento);
});
finestra.addEventListener("cancel", fermaChiusura);

// Qualunque cosa scritta in un modulo della finestra la rende «modificata»
finestra.addEventListener("input", (evento) => {
  if (evento.target.form) finestraModificata = true;
});

// Tocco sullo sfondo scuro: chiude solo le finestre senza modulo (un modulo compilato non si perde per sbaglio)
finestra.addEventListener("click", (evento) => {
  if (evento.target !== finestra || finestra.querySelector("form")) return;
  const r = finestra.getBoundingClientRect();
  const fuori = evento.clientX < r.left || evento.clientX > r.right || evento.clientY < r.top || evento.clientY > r.bottom;
  if (fuori) chiudiFinestra();
});

// Alla chiusura il focus torna al pulsante che aveva aperto la finestra (ridisegnato, se serve), altrimenti al titolo
finestra.addEventListener("close", () => {
  const attivo = document.activeElement;
  if (attivo && attivo !== document.body && attivo.isConnected && !finestra.contains(attivo)) return;
  const selettore = apertaDa ? `[data-azione="${CSS.escape(apertaDa.azione)}"]` + (apertaDa.id ? `[data-id="${CSS.escape(apertaDa.id)}"]` : "") : null;
  const pulsante = selettore && [...document.querySelectorAll(selettore)].find((el) => !finestra.contains(el) && el.getClientRects().length);
  const h1 = document.querySelector("#schermata h1");
  if (pulsante) pulsante.focus();
  else if (h1) h1.focus({ preventScroll: true });
});

// Si può tornare alla fase precedente se la trattativa non è persa e la commessa non è ancora affidata
function puoTornareIndietro(o) {
  return !!o && !o.perso && faseRaggiunta(o) > 0 && !o.allocazione && !propostaInAttesa(o);
}

// ======================================================== SCHEDA DELLA TRATTATIVA (#trattativa-<id>, 24/10)

// I 4 passi dell'avanzamento (nel database restano 5 fasi: Richiesta = contatto + qualificato), ognuno fatto, adesso o da fare
function passiTrattativa(o) {
  const r = faseRaggiunta(o);
  const fissato = sopralluogoFissato(o);
  const attuale = o.perso ? -1 : r === 0 ? 0 : Math.min(r, 4);   // 0 Richiesta, 1 Sopralluogo, 2 Offerta, 3 Firmato, 4 tutti fatti
  const passi = [
    { nome: "Richiesta", data: o.storico.contatto, nota: o.storico.qualificato ? "qualificata il " + formattaData(o.storico.qualificato).slice(0, 5) : "" },
    { nome: "Sopralluogo", data: o.storico.sopralluogo || (fissato ? fissato.data : ""), nota: !o.storico.sopralluogo && fissato ? "fissato" + (fissato.ora ? " alle " + fissato.ora : "") : "" },
    { nome: "Offerta", data: o.storico.offerta, nota: o.storico.offerta && o.scadenzaOfferta && !o.storico.contratto ? "valida fino al " + formattaData(o.scadenzaOfferta).slice(0, 5) : "" },
    { nome: "Firmato", data: o.storico.contratto, nota: o.storico.contratto ? "avvio " + formattaData(dataAvvio(o)).slice(0, 5) : "" },
  ];
  const fatti = [o.storico.contatto, o.storico.sopralluogo, o.storico.offerta, o.storico.contratto];
  return passi.map((x, i) => ({ ...x, stato: o.perso ? (fatti[i] ? "fatto" : "da fare") : i < attuale ? "fatto" : i === attuale ? "adesso" : "da fare" }));
}

// Il riquadro «Prossimo passo»: titolo, una riga e un solo pulsante principale, che cambia con la fase
function prossimoPasso(o) {
  const fase = faseAttuale(o);
  const id = esc(o.id);
  if (fase === "perso") {
    return `<section class="riquadro prossimo-passo perso" aria-label="Trattativa persa">
      <h2 class="titolo-riquadro">Persa il ${formattaData(o.perso.data)}: ${esc(o.perso.motivo)}</h2>
      ${o.perso.nota ? `<p>${esc(o.perso.nota)}</p>` : ""}
      ${(CONFIG.rimediPerdita || {})[o.perso.motivo] ? `<p class="rimedio">Rimedio: ${esc(CONFIG.rimediPerdita[o.perso.motivo])}</p>` : ""}
      <button class="pulsante primario" type="button" data-azione="riapri" data-id="${id}">Riapri la trattativa</button>
    </section>`;
  }
  const fissato = fase === "qualificato" ? sopralluogoFissato(o) : null;
  let titolo, riga, pulsante, sotto = "";
  if (fase === "contatto") {
    titolo = "Qualificare la richiesta";
    riga = "Chiama il referente e verifica servizio, sede di lavoro e metri quadri.";
    pulsante = `<button class="pulsante primario" type="button" data-azione="avanza" data-id="${id}">${icona("spunta")} ${CONFIG.fasi[0].azione}</button>`;
  } else if (fase === "qualificato" && !fissato) {
    titolo = "Fissare il sopralluogo";
    riga = "Proponi giorno e ora già in questa telefonata.";
    pulsante = `<button class="pulsante primario" type="button" data-azione="fissa-sopralluogo" data-id="${id}">${icona("calendario")} Fissa il sopralluogo</button>`;
  } else if (fase === "qualificato") {
    titolo = "Sopralluogo " + formattaGiorno(fissato.data) + (fissato.ora ? " alle " + esc(fissato.ora) : "");
    riga = "Dopo il sopralluogo registra le misure: il preventivo parte da lì.";
    pulsante = `<button class="pulsante primario" type="button" data-azione="avanza" data-id="${id}">${icona("spunta")} ${CONFIG.fasi[1].azione}</button>`;
  } else if (fase === "sopralluogo") {
    titolo = "Preparare l'offerta";
    riga = "Scegli il pacchetto e la tariffa: margine e punteggio si vedono subito.";
    pulsante = `<a class="pulsante primario" href="#preventivo-${id}">${icona("documento")} Prepara l'offerta</a>`;
  } else if (fase === "offerta") {
    titolo = "Ottenere la firma";
    riga = o.scadenzaOfferta ? (o.scadenzaOfferta < oggi() ? "Offerta scaduta il " : "Offerta valida fino al ") + formattaData(o.scadenzaOfferta) + "." : "Offerta inviata.";
    pulsante = `<button class="pulsante primario" type="button" data-azione="avanza" data-id="${id}">${icona("spunta")} ${CONFIG.fasi[3].azione}</button>
      <button class="pulsante secondario" type="button" data-azione="firma-link" data-id="${id}">Firma da link</button>`;
    sotto = '<p class="nota-piccola">Se il cliente firma dal link, il contratto si segna da solo.</p>';
  } else {
    const squadra = !o.allocazione && squadraDisponibile(o, stato.opportunita);
    titolo = o.allocazione ? "Commessa assegnata" : "Assegnare la commessa";
    riga = o.allocazione ? statoCommessa(o) + `<p class="nota-piccola">Avvio del servizio: ${formattaData(dataAvvio(o))}.</p>`
      : squadra ? "C'è una squadra interna con ore libere nella zona." : "Nessuna squadra interna ha ore libere: scegli un partner.";
    pulsante = o.allocazione ? "" : squadra
      ? `<button class="pulsante primario" type="button" data-azione="assegna-squadra" data-id="${id}">Assegna a ${esc(squadra.nome)}</button>`
      : `<a class="pulsante primario" href="#allocazione">Vai all'allocazione ${icona("freccia")}</a>`;
  }
  const stati = fase === "contratto" ? "" : rigaRicontatto(o) + rigaStatoTrattativa(o, fissato);
  return `<section class="riquadro prossimo-passo" aria-label="Prossimo passo">
      <h2 class="titolo-riquadro">Prossimo passo: ${titolo}</h2>
      <div class="prossimo-riga">${riga}</div>
      ${pulsante ? `<div class="azioni-intestazione">${pulsante}</div>` : ""}
      ${sotto}
      ${stati ? `<div class="scheda-stati">${stati}</div>` : ""}
      ${trattativaAperta(o) ? `<button class="pulsante-testo" type="button" data-azione="perso" data-id="${id}">Segna come persa</button>` : ""}
    </section>`;
}

// Pagina della trattativa: avanzamento, prossimo passo, servizio, cronologia, referente, richiesta, coerenza, esecutore, correzioni
function disegnaTrattativa(id) {
  const o = trova(id);
  const a = aziendaDi(o);
  const p = calcolaPunteggio(o, stato.opportunita);
  const ref = trovaReferente(o.referenteId);
  const zona = infoComune(o.comune);
  const margine = marginePercentuale(o, stato.opportunita);
  const soglie = CONFIG.punteggio.margine;
  const tonoMargine = margine >= soglie.obiettivo ? "chip-ok" : margine >= soglie.minimo ? "chip-attenzione" : "chip-critico";
  const cronologia = attivitaDi(o.aziendaId).filter((x) => !x.daFare).sort((x, y) => y.data.localeCompare(x.data) || y.id.localeCompare(x.id, "it", { numeric: true }));
  const risposta = o.dataPrimaRisposta ? giorniTra(o.storico.contatto, o.dataPrimaRisposta) : null;
  const precedente = puoTornareIndietro(o) ? CONFIG.fasi[faseRaggiunta(o) - 1] : null;
  // Ritorno alla schermata di provenienza (come la scheda cliente); senza provenienza a «Oggi», o a Clienti per chi non ha Oggi
  const casa = schermataDelRuolo("oggi") ? "oggi" : "clienti";
  const da = ["oggi", "clienti", "allocazione", "cliente"].includes(interfaccia.provenienza) ? interfaccia.provenienza : casa;
  const ritorno = { oggi: "Oggi", clienti: "Clienti", allocazione: "Allocazione", cliente: "Scheda cliente" }[da];
  const indietro = da === "cliente" ? "#cliente-" + esc(o.aziendaId) : "#" + da;
  // Chi la eseguirebbe: squadra con ore libere contro le ore della trattativa, oppure un partner
  const squadra = CONFIG.squadre.filter((sq) => squadraCopre(sq, o)).map((sq) => ({ sq, ore: oreLibereSquadra(sq, stato.opportunita, o.id) })).sort((x, y) => y.ore - x.ore)[0];
  const esecutore = esecutorePrevisto(o, stato.opportunita);
  const passi = passiTrattativa(o);
  return `
    <div class="pagina-trattativa">
    <a class="link-indietro" href="${indietro}">${icona("indietro")} ${ritorno}</a>
    ${intestazione({ occhiello: esc(CONFIG.etichetteSettori[settoreDi(o)] || settoreDi(o)) + " · " + esc(o.comune) + " · rif. " + esc(o.codice),
      titolo: esc(nomeCliente(o)) + " " + badgePunteggio(p, true),
      istruzione: "Un passo alla volta: il pulsante blu indica sempre il prossimo." })}
    ${o.perso ? `<p class="riga-chip"><span class="chip chip-critico">Persa · ${esc(o.perso.motivo)}</span></p>` : ""}

    <ol class="avanzamento" aria-label="Avanzamento della trattativa">
      ${passi.map((x) => `<li class="passo passo-${x.stato.replace(" ", "-")}" ${x.stato === "adesso" ? 'aria-current="step"' : ""}>
        <span class="passo-segno" aria-hidden="true">${x.stato === "fatto" ? icona("spunta") : ""}</span>
        <span class="passo-nome">${x.nome}</span>
        <span class="nota-piccola">${x.stato === "da fare" && !x.data ? "da fare" : x.data ? formattaData(x.data).slice(0, 5) : x.stato}${x.nota ? " · " + esc(x.nota) : ""}</span></li>`).join("")}
    </ol>

    ${prossimoPasso(o)}

    <div class="scheda-cliente">
      <div class="colonna-scheda">
        <section class="sezione riquadro">
          <h2>Il servizio</h2>
          <p><strong>${esc(maiuscola(o.servizio))}</strong> · ${Number(o.ore)} ore al mese</p>
          <p class="riga-chip"><span class="chip">${formattaEuro(valoreAnnuo(o))} all'anno</span>
            <span class="chip ${tonoMargine}">margine stimato ${formattaPercentuale(margine)}</span></p>
          ${o.preventivo ? `<p class="nota-piccola">Preventivo: ${o.preventivo.pacchetto ? "pacchetto " + esc(o.preventivo.pacchetto) + " · " : ""}${Number(o.preventivo.mq)} mq · ${esc(o.preventivo.ambiente)} · ${esc(o.preventivo.frequenza)}</p>`
            : faseRaggiunta(o) < 3 ? '<p class="nota-piccola">Il preventivo si prepara dopo il sopralluogo.</p>' : ""}
          ${o.note ? `<h3>Note</h3><p class="nota-trattativa">${esc(o.note)}</p>` : ""}
          ${o.motivazioneC ? `<p class="nota-c">Offerta inviata con punteggio sotto 50. Motivazione: ${esc(o.motivazioneC)}</p>` : ""}
        </section>
        <section class="sezione">
          <h2>Cronologia <span class="conteggio">${cronologia.length}</span></h2>
          ${cronologia.length ? `<ol class="cronologia">${cronologia.slice(0, 8).map((x) => {
            const r = trovaReferente(x.referenteId);
            return `<li class="${x.tipo === "Pipeline" ? "automatica" : ""}">
              <p class="cronologia-testa"><span class="chip">${esc(x.tipo === "Pipeline" ? "Aggiornamento" : x.tipo)}</span> ${formattaData(x.data)}${r ? " · " + esc(r.nome) : ""}</p>
              <p>${esc(x.testo)}</p></li>`;
          }).join("")}</ol>
          ${cronologia.length > 8 ? `<a class="link" href="#cliente-${esc(o.aziendaId)}">Tutta la cronologia (${cronologia.length})</a>` : ""}`
          : '<p class="vuoto">Ancora nessuna attività registrata: registrala dalla scheda del cliente.</p>'}
        </section>
      </div>
      <div class="colonna-scheda">
        <section class="sezione riquadro">
          <h2>Referente</h2>
          ${ref && !ref.cancellato ? `<p><strong>${esc(ref.nome)}</strong>${ref.ruolo ? " · " + esc(ref.ruolo) : ""}</p>
            <div class="contatti">${pulsantiContatto(ref)}</div>
            <p class="riga-chip">${chipPrivacy(ref)}</p>
            <button class="pulsante-testo" type="button" data-azione="cancella-dati" data-id="${esc(ref.id)}">Cancella i dati personali del referente</button>`
            : `<p>${ref ? esc(ref.nome) : "Referente non indicato"}.</p><a class="link" href="#cliente-${esc(o.aziendaId)}">Aggiungilo dalla scheda del cliente</a>`}
        </section>
        <section class="sezione riquadro">
          <h2>La richiesta</h2>
          <ul class="elenco-semplice">
            <li>Canale: ${esc(o.canale || "non indicato")}${o.contenuto ? " · contenuto " + esc(o.contenuto) : ""}${o.campagna ? " · campagna " + esc(o.campagna) : ""}</li>
            <li>Sede di lavoro: ${esc(o.comune)}${zona && zona.zona ? " · " + esc(zona.zona) : ""}</li>
            <li>Richiesta del ${formattaData(o.storico.contatto)}${o.dataRegistrazione ? " · annotata il " + formattaData(o.dataRegistrazione) : ""}</li>
            <li>Prima risposta: ${risposta === null ? "non ancora" : `<span class="chip ${risposta <= CONFIG.obiettivi.primaRispostaGiorni ? "chip-ok" : "chip-attenzione"}">${formattaData(o.dataPrimaRisposta)}, dopo ${giorni(risposta)}</span>`}</li>
            <li>Firmata da link: ${o.firmaDaLink ? "sì" : "no"}</li>
          </ul>
        </section>
        <details class="riquadro approfondimento">
          <summary><span class="titolo-richiudibile">Perché la coerenza è ${p.totale}</span> <span class="riassunto">${fasciaPunteggio(p.totale).nome}</span></summary>
          ${tabellaCriteri(p)}
        </details>
        <section class="sezione riquadro">
          <h2>Chi la eseguirebbe</h2>
          <p>${o.allocazione ? statoCommessa(o) : esecutore === "squadra"
            ? `${icona("spunta")} C'è posto: ${esc(squadra.sq.nome)} ha ${squadra.ore} ore libere al mese, la trattativa ne chiede ${Number(o.ore)}.`
            : `${icona("attenzione")} Non basta: ${squadra ? `${esc(squadra.sq.nome)} ha ${Math.max(0, squadra.ore)} ore libere al mese, la trattativa ne chiede ${Number(o.ore)}` : "nessuna squadra interna copre servizio e zona"}; ${esecutore === "partner" ? "serve un partner." : "nessun partner idoneo in elenco."}`}</p>
        </section>
        <section class="sezione correzioni" aria-label="Correzioni">
          <h2>Correzioni</h2>
          <div class="azioni-intestazione">
            <button class="pulsante secondario piccolo" type="button" data-azione="modifica-opportunita" data-id="${esc(o.id)}">${icona("matita")} Modifica</button>
            ${precedente ? `<button class="pulsante secondario piccolo" type="button" data-azione="torna-indietro" data-id="${esc(o.id)}">Torna a «${precedente.nome}»</button>` : ""}
            ${trattativaAperta(o) && !o.ricontatto ? `<button class="pulsante secondario piccolo" type="button" data-azione="da-ricontattare" data-id="${esc(o.id)}">Da ricontattare</button>` : ""}
            ${!o.perso && faseRaggiunta(o) >= 2 ? `<a class="pulsante secondario piccolo" href="#preventivo-${esc(o.id)}">Preventivo</a>` : ""}
            <a class="pulsante secondario piccolo" href="#cliente-${esc(o.aziendaId)}">Apri la scheda cliente</a>
          </div>
        </section>
      </div>
    </div>
    </div>`;
}

// Modulo largo: i campi a sinistra, l'anteprima del punteggio a destra (sotto i 900 px l'anteprima va in fondo)
function colonneConAnteprima(campi) {
  return `
    <div class="modulo-due-colonne">
      <div class="modulo-campi">${campi}</div>
      <aside class="anteprima" id="anteprima-punteggio" aria-label="Anteprima del punteggio di coerenza"></aside>
    </div>`;
}

// Barra dei pulsanti con il punteggio breve: visibile sotto i 900 px, annunciato dai lettori di schermo quando cambia
function azioniConPunteggio(pulsanti) {
  return `
    <div class="azioni-finestra">
      <span id="punteggio-breve" class="punteggio-breve" aria-live="polite"></span>
      ${pulsanti}
    </div>`;
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
        <p class="nota-obbligatorio">* obbligatorio</p>
      </div>
      ${colonneConAnteprima(`
        <div class="riga-doppia">
          <label>Servizio <select name="servizio" ${assegnata ? "disabled" : ""}>${opzioni(Object.keys(CONFIG.servizi), o.servizio)}</select></label>
          <label>Sede di lavoro (comune) <select name="comune" ${assegnata ? "disabled" : ""}>${opzioniComuni(o.comune)}</select></label>
        </div>
        ${assegnata ? '<p class="nota-piccola">Commessa già assegnata: servizio e sede di lavoro non si possono cambiare.</p>' : ""}
        <div class="riga-doppia">
          <label>Ore al mese *
            <input name="ore" type="number" inputmode="numeric" min="1" step="1" required autofocus value="${Number(o.ore)}">
          </label>
          <label>Tariffa oraria (€)
            <input name="tariffa" type="number" inputmode="decimal" min="1" step="0.5" value="${Number(tariffaOraria(o))}">
          </label>
        </div>
        <label>Referente <select name="referente">${opzioniReferenti(o.aziendaId, o.referenteId)}</select></label>
        <fieldset class="gruppo">
          <legend>Canale e date della richiesta</legend>
          <div class="riga-doppia">
            <label>Canale * <select name="canale" required>${opzioniCanali(o.canale)}</select></label>
            <label>Data della richiesta * <input name="dataRichiesta" type="date" required max="${o.storico.qualificato || oggi()}" value="${esc(o.storico.contatto)}"></label>
          </div>
          <div class="riga-doppia">
            <label>Data di annotazione <input name="dataAnnotazione" type="date" max="${oggi()}" value="${esc(o.dataRegistrazione || "")}"></label>
            <label>Data della prima risposta <input name="dataRisposta" type="date" max="${oggi()}" value="${esc(o.dataPrimaRisposta || "")}"></label>
          </div>
          <label>Data dell'offerta ${o.storico.offerta ? "" : "(si registra con «Offerta inviata»)"}
            <input name="dataOfferta" type="date" max="${o.storico.contratto || oggi()}" value="${esc(o.storico.offerta || "")}" ${o.storico.offerta ? "" : "disabled"}></label>
        </fieldset>
        <label>Note sulla trattativa
          <textarea name="note" placeholder="Es. decide il titolare entro fine mese">${esc(o.note || "")}</textarea>
        </label>`)}
      ${azioniConPunteggio(`
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Salva le modifiche</button>`)}
    </form>`, { larga: true });
  const modulo = document.getElementById("modulo-opportunita");
  ricordaValori(modulo);
  aggiornaAnteprima(modulo);
}

// Copia dell'opportunità con i valori scritti nel modulo (i campi disabilitati restano quelli salvati)
function leggiModificaOpportunita(modulo) {
  const o = trova(modulo.dataset.id);
  if (!o) return null; // eliminata in un'altra scheda
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
    canale: d.get("canale"),
    dataRichiesta: d.get("dataRichiesta"),
    dataRegistrazione: d.get("dataAnnotazione") || null,
    dataPrimaRisposta: d.get("dataRisposta") || null,
    dataOfferta: d.has("dataOfferta") ? d.get("dataOfferta") : o.storico.offerta,
  };
}

// Salva solo i campi cambiati in questo modulo e scrive una sola riga di cronologia con le correzioni
function salvaModificaOpportunita(modulo) {
  const o = trova(modulo.dataset.id);
  if (!o) return datoNonPiuPresente("Questa opportunità è stata eliminata in un'altra scheda: modifiche non salvate");
  const letto = leggiModificaOpportunita(modulo);
  const cambiati = campiCambiati(modulo);
  // Campo del modulo → dato dell'opportunità; i campi non toccati restano come sono salvati ora
  const n = { ...o };
  Object.entries({ servizio: "servizio", comune: "comune", ore: "ore", tariffa: "tariffa", referente: "referenteId", note: "note",
    canale: "canale", dataRichiesta: "dataRichiesta", dataAnnotazione: "dataRegistrazione", dataRisposta: "dataPrimaRisposta", dataOfferta: "dataOfferta" })
    .forEach(([campo, chiave]) => { if (cambiati.has(campo)) n[chiave] = letto[chiave]; });
  if (n.ore <= 0) return segnalaCampo(modulo.ore, "Inserisci le ore al mese");
  // Canale e date: stesse regole del nuovo contatto; la data dell'offerta resta tra il sopralluogo e la firma
  const richiesta = n.dataRichiesta ?? o.storico.contatto;
  const errore = erroreDateRichiesta(modulo, n.canale, { richiesta, annotazione: n.dataRegistrazione || richiesta, risposta: n.dataPrimaRisposta });
  if (errore) return segnalaCampo(...errore);
  if (o.storico.qualificato && richiesta > o.storico.qualificato) return segnalaCampo(modulo.dataRichiesta, "La richiesta non può essere dopo la qualifica (" + formattaData(o.storico.qualificato) + ")");
  const offerta = n.dataOfferta ?? o.storico.offerta;
  if (o.storico.offerta && (!formattaData(offerta) || offerta < o.storico.sopralluogo || (o.storico.contratto && offerta > o.storico.contratto))) {
    return segnalaCampo(modulo.dataOfferta, "La data dell'offerta va tra il sopralluogo e la firma");
  }
  const numero = (x) => Number(x).toLocaleString("it-IT");
  const nomeRef = (id) => (trovaReferente(id) || { nome: "nessuno" }).nome;
  const cambi = [];
  if (n.servizio !== o.servizio) cambi.push("servizio " + o.servizio + " → " + n.servizio);
  if (n.comune !== o.comune) cambi.push("sede di lavoro " + o.comune + " → " + n.comune);
  if (n.ore !== o.ore) cambi.push("ore al mese " + o.ore + " → " + n.ore);
  if (tariffaOraria(n) !== tariffaOraria(o)) cambi.push("tariffa " + numero(tariffaOraria(o)) + " → " + numero(tariffaOraria(n)) + " €/ora");
  if ((n.referenteId || null) !== (o.referenteId || null)) cambi.push("referente " + nomeRef(o.referenteId) + " → " + nomeRef(n.referenteId));
  if ((n.note || "") !== (o.note || "")) cambi.push("note aggiornate");
  if (n.canale !== o.canale) cambi.push("canale " + (o.canale || "—") + " → " + n.canale);
  if (richiesta !== o.storico.contatto) cambi.push("data della richiesta " + formattaData(o.storico.contatto) + " → " + formattaData(richiesta));
  if ((n.dataRegistrazione || null) !== (o.dataRegistrazione || null)) cambi.push("data di annotazione " + (formattaData(o.dataRegistrazione) || "—") + " → " + (formattaData(n.dataRegistrazione) || "—"));
  if ((n.dataPrimaRisposta || null) !== (o.dataPrimaRisposta || null)) cambi.push("prima risposta " + (formattaData(o.dataPrimaRisposta) || "—") + " → " + (formattaData(n.dataPrimaRisposta) || "—"));
  if (o.storico.offerta && offerta !== o.storico.offerta) cambi.push("data dell'offerta " + formattaData(o.storico.offerta) + " → " + formattaData(offerta));
  if (!cambi.length) return chiudiFinestra(); // nulla da salvare
  applica(() => {
    // Servizio, sede, ore o tariffa cambiati: valore, margine e capacità si stimano con le regole dell'app
    if (n.servizio !== o.servizio || n.comune !== o.comune || n.ore !== o.ore || tariffaOraria(n) !== tariffaOraria(o)) {
      Object.assign(o, { valore: null, margine: null, capacitaSimulata: null });
    }
    Object.assign(o, { servizio: n.servizio, comune: n.comune, ore: n.ore, tariffa: n.tariffa ?? null, referenteId: n.referenteId || null, note: n.note || "",
      canale: n.canale, dataRegistrazione: n.dataRegistrazione || null, dataPrimaRisposta: n.dataPrimaRisposta || null });
    o.storico.contatto = richiesta;
    if (o.storico.offerta) o.storico.offerta = offerta;
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: "Correzione: " + cambi.join("; ") });
  }, { messaggio: "Opportunità aggiornata", evidenzia: o.id });
}

// Opzioni di una select; il valore salvato che non è più in config.js resta, con "(non più in elenco)"
function opzioni(valori, scelto) {
  const mancante = scelto && !valori.includes(scelto)
    ? `<option value="${esc(scelto)}" selected>${esc(scelto)} (non più in elenco)</option>` : "";
  // L'etichetta ha la maiuscola ("Uffici e commercio"), il valore resta quello del database
  return valori.map((v) => `<option value="${esc(v)}" ${v === scelto ? "selected" : ""}>${esc(maiuscola(v))}</option>`).join("") + mancante;
}

// Opzioni dei comuni con la distanza da Bari, con la stessa regola per i comuni tolti da config.js
function opzioniComuni(scelto) {
  const mancante = scelto && !CONFIG.comuni.some((c) => c.nome === scelto)
    ? `<option value="${esc(scelto)}" selected>${esc(scelto)} (non più in elenco)</option>` : "";
  return CONFIG.comuni.map((c) => `<option value="${esc(c.nome)}" ${c.nome === scelto ? "selected" : ""}>${esc(c.nome)}${c.km ? " (" + c.km + " km)" : ""}</option>`).join("") + mancante;
}

// Modulo "Nuovo contatto": azienda (nuova o esistente), referente e opportunità, con anteprima del punteggio.
// Per una nuova azienda si può salvare anche solo il contatto, con «Servizio ancora da capire»
function apriNuovoContatto(aziendaId = "") {
  const servizi = Object.keys(CONFIG.servizi);
  const aziende = [...stato.aziende].sort((x, y) => x.ragioneSociale.localeCompare(y.ragioneSociale));
  const scelta = trovaAzienda(aziendaId);
  apriFinestra(`
    <form class="modulo" id="modulo-contatto" novalidate>
      <div>
        <h2>${scelta ? "Nuova opportunità" : "Nuovo contatto"}</h2>
        ${scelta ? "" : `<button class="pulsante accento piccolo da-nota" type="button" data-azione="nota">${icona("matita")} Da una nota: i campi si compilano da soli</button>`}
        <p class="nota-piccola">Scegli il cliente o creane uno nuovo, poi indica il servizio: il punteggio di coerenza si aggiorna mentre scrivi.</p>
        <p class="nota-obbligatorio">* obbligatorio</p>
      </div>
      ${colonneConAnteprima(`
        <label>Azienda
          <select name="azienda" id="campo-azienda">
            <option value="">+ Nuova azienda</option>
            ${aziende.map((a) => `<option value="${esc(a.id)}" ${a.id === aziendaId ? "selected" : ""}>${esc(a.ragioneSociale)}</option>`).join("")}
          </select>
        </label>

        <fieldset class="gruppo">
          <legend>La richiesta</legend>
          <div class="riga-doppia">
            <label>Canale della richiesta *
              <select name="canale" required aria-describedby="suggerimento-canale">${opzioniCanali(scelta && fonti().includes(scelta.fonte) ? scelta.fonte : "")}</select>
              <span class="suggerimento" id="suggerimento-canale">Chiedi: come ci ha conosciuto?</span>
            </label>
            <label>Data della richiesta * <input name="dataRichiesta" type="date" required max="${oggi()}" value="${oggi()}"></label>
          </div>
          <details class="altre-date" id="altre-date">
            <summary>Annotazione e prima risposta <span class="nota-piccola">· annotata oggi</span></summary>
            <div class="riga-doppia">
              <label>Data di annotazione * <input name="dataAnnotazione" type="date" required max="${oggi()}" value="${oggi()}"></label>
              <label>Data della prima risposta (facoltativa) <input name="dataRisposta" type="date" max="${oggi()}"></label>
            </div>
          </details>
        </fieldset>

        <fieldset class="gruppo" id="gruppo-nuova-azienda" ${scelta ? "hidden" : ""}>
          <legend>Dati della nuova azienda</legend>
          <div class="riga-doppia">
            <label>Ragione sociale *
              <input name="ragioneSociale" id="campo-ragione" required autocomplete="off" placeholder="Es. Studio Commercialisti Omega" ${scelta ? "" : "autofocus"}>
            </label>
            <label>Partita IVA (facoltativa)
              <input name="piva" inputmode="numeric" autocomplete="off" placeholder="11 cifre">
            </label>
          </div>
          <div id="avviso-doppione" class="avviso-doppione" role="status" hidden></div>
          <label>Settore <select name="settore">${opzioni(CONFIG.settori, CONFIG.pilota.settore)}</select></label>
          <div class="riga-doppia">
            <label>Referente (nome e cognome) <input name="refNome" autocomplete="off" placeholder="Es. Dott.ssa Anna Verdi"></label>
            <label>Ruolo <input name="refRuolo" autocomplete="off" placeholder="Es. Socia titolare"></label>
          </div>
          <div class="riga-doppia">
            <label>Telefono <input name="refTelefono" type="tel" inputmode="tel" autocomplete="off" placeholder="Es. 333 123 4567"></label>
            <label>Email <input name="refEmail" type="email" inputmode="email" autocomplete="off" placeholder="nome@azienda.it"></label>
          </div>
          <div class="riga-doppia">
            <label>Base giuridica (privacy) <select name="refBase">${opzioni(CONFIG.basiGiuridiche, CONFIG.basiGiuridiche[0])}</select></label>
            <label class="spunta"><input name="refDecisore" type="checkbox"> È il decisore</label>
          </div>
        </fieldset>

        <label id="gruppo-referente" ${scelta ? "" : "hidden"}>Referente per questa opportunità
          <select name="referente">${scelta ? opzioniReferenti(scelta.id) : ""}</select>
        </label>

        <fieldset class="gruppo">
          <legend>Servizio richiesto</legend>
          <label class="spunta" id="campo-da-capire" ${scelta ? "hidden" : ""}><input name="daCapire" type="checkbox"> Servizio ancora da capire (salva solo il contatto)</label>
          <div class="riga-doppia">
            <label data-servizio>Servizio <select name="servizio">${opzioni(servizi, servizi[0])}</select></label>
            <label>Sede di lavoro (comune) <select name="comune">${opzioniComuni(scelta ? scelta.comune : "Bari")}</select></label>
          </div>
          <p class="nota-piccola" data-servizio>Preventivo indicativo: tipo di ambienti, metri quadri e frequenza calcolano ore, prezzo e margine.</p>
          <div class="riga-doppia" data-servizio>
            <label>Tipo di ambienti <select name="ambiente"><option value="">— Senza preventivo —</option>${opzioni(CONFIG.preventivo.ambienti.map((a) => a.nome), "")}</select></label>
            <label>Metri quadri indicativi <input name="mq" type="number" inputmode="numeric" min="1" step="10" placeholder="Es. 300"></label>
          </div>
          <div class="riga-doppia" data-servizio>
            <label>Frequenza <select name="frequenza">${opzioni(CONFIG.preventivo.frequenze.map((f) => f.nome), CONFIG.preventivo.frequenze[2].nome)}</select></label>
            <label>Ore al mese (stima) *
              <input name="ore" type="number" inputmode="numeric" min="1" step="1" required placeholder="Es. 60" ${scelta ? "autofocus" : ""}>
            </label>
          </div>
          <div class="riga-doppia" data-servizio>
            <label>Tariffa oraria (€)
              <input name="tariffa" type="number" inputmode="decimal" min="1" step="0.5" value="${CONFIG.servizi[servizi[0]].tariffa}">
            </label>
          </div>
        </fieldset>
        <label>Cosa ha chiesto (facoltativo)
          <textarea name="richiesta" placeholder="Es. pulizia degli uffici tre volte a settimana, dopo le 18"></textarea>
        </label>`)}
      ${azioniConPunteggio(`
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Salva</button>`)}
    </form>`, { larga: true });
  aggiornaAnteprima(document.getElementById("modulo-contatto"));
}

// Sceglie l'azienda nel modulo «Nuovo contatto» (dall'elenco o da «Usa questa azienda»)
function scegliAzienda(modulo, id) {
  const azienda = trovaAzienda(id);
  modulo.azienda.value = azienda ? azienda.id : "";
  modulo.querySelector("#gruppo-nuova-azienda").hidden = !!azienda;
  modulo.querySelector("#gruppo-referente").hidden = !azienda;
  modulo.querySelector("#campo-da-capire").hidden = !!azienda;
  if (azienda) modulo.daCapire.checked = false;
  modulo.referente.innerHTML = azienda ? opzioniReferenti(azienda.id) : "";
  if (azienda) modulo.comune.value = azienda.comune;
  if (azienda && fonti().includes(azienda.fonte)) modulo.canale.value = azienda.fonte;
  aggiornaServizioDaCapire(modulo);
  aggiornaAvvisoDoppione(modulo);
  aggiornaAnteprima(modulo);
}

// «Servizio ancora da capire»: nasconde servizio, ore, tariffa e punteggio
function aggiornaServizioDaCapire(modulo) {
  const daCapire = modulo.daCapire.checked && !modulo.azienda.value;
  modulo.querySelectorAll("[data-servizio]").forEach((el) => (el.hidden = daCapire));
  modulo.querySelector(".modulo-due-colonne").classList.toggle("senza-anteprima", daCapire);
  modulo.querySelector("#anteprima-punteggio").hidden = daCapire;
  modulo.querySelector("#punteggio-breve").hidden = daCapire;
}

// Riquadro «Forse esiste già»: aziende con lo stesso nome, partita IVA, telefono o email
function aggiornaAvvisoDoppione(modulo) {
  const box = modulo.querySelector("#avviso-doppione");
  if (!box) return;
  const d = new FormData(modulo);
  const trovati = d.get("azienda") ? [] : possibiliDoppioni({
    ragioneSociale: d.get("ragioneSociale"), piva: d.get("piva"), telefono: d.get("refTelefono"), email: d.get("refEmail"),
  });
  const html = trovati.slice(0, 3).map(({ azienda, motivi }) => `
    <p>${icona("attenzione")} <span><strong>Forse esiste già:</strong> ${esc(azienda.ragioneSociale)} · ${esc(azienda.comune)} (${motivi.join(", ")})</span>
      <button class="pulsante secondario piccolo" type="button" data-azione="usa-azienda" data-id="${esc(azienda.id)}">Usa questa azienda</button></p>`).join("");
  // Si riscrive solo se cambia, così il lettore di schermo non lo ripete a ogni lettera
  const chiave = trovati.map(({ azienda, motivi }) => azienda.id + ":" + motivi.join()).join("|");
  if (box.dataset.chiave !== chiave) {
    box.dataset.chiave = chiave;
    box.innerHTML = html;
  }
  box.hidden = !trovati.length;
}

// Opzioni dei referenti di un'azienda: scelto quello indicato, altrimenti il decisore
function opzioniReferenti(aziendaId, scelto = null) {
  const refs = referentiDi(aziendaId);
  if (!refs.length) return '<option value="">Nessun referente registrato</option>';
  const principale = refs.find((r) => r.id === scelto) || refs.find((r) => r.decisore) || refs[0];
  return refs.map((r) => `<option value="${esc(r.id)}" ${r.id === principale.id ? "selected" : ""}>${esc(r.nome)}${r.ruolo ? " · " + esc(r.ruolo) : ""}${r.decisore ? " (decisore)" : ""}</option>`).join("");
}

// Legge il modulo: nuova azienda e nuovo referente (se servono), l'opportunità (null se il servizio è da capire)
// e la richiesta del cliente
function leggiModulo(modulo) {
  const d = new FormData(modulo);
  const testo = (nome) => String(d.get(nome) || "").trim();
  const servizio = d.get("servizio");
  const tariffa = Number(d.get("tariffa"));
  const aziendaId = d.get("azienda");
  const daCapire = !aziendaId && d.get("daCapire") === "on";
  const nuovaAzienda = aziendaId ? null : {
    ragioneSociale: testo("ragioneSociale"),
    piva: testo("piva").replace(/\s/g, ""),
    settore: d.get("settore"),
    comune: d.get("comune"),
    fonte: d.get("canale"),
    note: "",
    creata: oggi(),
  };
  const base = d.get("refBase") || CONFIG.basiGiuridiche[0];
  const nuovoReferente = aziendaId || !testo("refNome") ? null : {
    nome: testo("refNome"),
    ruolo: testo("refRuolo"),
    telefono: telefonoDaSalvare(testo("refTelefono")),
    email: testo("refEmail"),
    canale: testo("refTelefono") ? "Telefono" : "Email",
    decisore: d.get("refDecisore") === "on",
    privacy: privacyVuota(base, base === CONFIG.basiGiuridiche[0] ? null : oggi()),
  };
  const mq = Math.round(Number(d.get("mq"))) || 0;
  const opp = daCapire ? null : {
    aziendaId,
    referenteId: aziendaId ? d.get("referente") || null : null,
    canale: d.get("canale"),
    comune: d.get("comune"),
    servizio,
    ore: Math.round(Number(d.get("ore"))) || 0,
    // La tariffa si salva solo se diversa da quella standard del servizio
    tariffa: tariffa > 0 && tariffa !== datiServizio(servizio).tariffa ? tariffa : null,
    ...(d.get("ambiente") && mq > 0 ? { preventivo: { ambiente: d.get("ambiente"), mq, frequenza: d.get("frequenza") } } : {}),
    storico: { contatto: d.get("dataRichiesta") },
    dataRegistrazione: d.get("dataAnnotazione"),   // quando la richiesta è stata annotata nel CRM
    ...(d.get("dataRisposta") ? { dataPrimaRisposta: d.get("dataRisposta") } : {}),
    consensoPrivacy: base === "consenso",
    campagna: "", contenuto: "", paginaArrivo: "",
    responsabile: responsabileAttuale(),
    perso: null,
    allocazione: null,
    proposte: [],
  };
  return { opp, nuovaAzienda, nuovoReferente, richiesta: testo("richiesta"),
    canale: d.get("canale"), date: { richiesta: d.get("dataRichiesta"), annotazione: d.get("dataAnnotazione"), risposta: d.get("dataRisposta") } };
}

// Opportunità con i valori scritti nel modulo aperto, per l'anteprima del punteggio (null se non c'è)
function opportunitaDelModulo(modulo) {
  if (modulo.id === "modulo-opportunita") return leggiModificaOpportunita(modulo);
  if (modulo.id === "modulo-fase") return trova(modulo.dataset.id) ? { ...trova(modulo.dataset.id), ore: Math.round(Number(modulo.ore.value)) || 0 } : null;
  const letto = leggiModulo(modulo);
  const opp = letto.opp;
  // Per l'anteprima l'azienda nuova non è ancora salvata: la si passa direttamente
  if (opp && letto.nuovaAzienda) {
    opp._azienda = letto.nuovaAzienda;
    opp._decisore = letto.nuovoReferente && letto.nuovoReferente.decisore ? letto.nuovoReferente : null;
  }
  return opp;
}

// Anteprima del punteggio nei moduli "Nuovo contatto", "Modifica opportunità" e "Sopralluogo fatto"
function aggiornaAnteprima(modulo = document.querySelector("#modulo-contatto, #modulo-opportunita, #modulo-fase")) {
  const box = modulo && modulo.querySelector("#anteprima-punteggio");
  if (!box) return;
  const opp = opportunitaDelModulo(modulo);
  if (!opp) return;
  if (opp.ore <= 0) {
    box.innerHTML = '<p class="anteprima-titolo">Punteggio di coerenza</p><p class="nota-piccola">Inserisci le ore al mese per calcolare il punteggio.</p>';
    aggiornaPunteggioBreve(modulo, null);
    return;
  }
  const p = calcolaPunteggio(opp, stato.opportunita);
  box.innerHTML = riquadroPreventivo(opp) + `
    <p class="anteprima-titolo">Punteggio di coerenza</p>
    <p class="anteprima-testa">${badgePunteggio(p, true)}
      <span>su 100 · <strong>${formattaEuro(valoreAnnuo(opp))}</strong> all'anno</span></p>
    ${tabellaCriteri(p)}`;
  aggiornaPunteggioBreve(modulo, p);
}

// Riquadro del preventivo indicativo nell'anteprima: ore, prezzo annuo, margine e avviso sotto il margine minimo
function riquadroPreventivo(opp) {
  if (!opp.preventivo) return "";
  const margine = marginePercentuale(opp, stato.opportunita);
  const minimo = CONFIG.punteggio.margine.minimo;
  return `
    <div class="preventivo">
      <p class="anteprima-titolo">Preventivo indicativo</p>
      <p><strong>${Number(opp.ore)} h/mese</strong> · ${formattaEuro(tariffaOraria(opp))}/ora · <strong>${formattaEuro(valoreAnnuo(opp))}/anno</strong></p>
      <p>Margine stimato <strong>${formattaPercentualeDecimale(margine)}</strong></p>
      ${margine < minimo ? `<p class="avviso-margine">${icona("attenzione")} Margine sotto il minimo del ${formattaPercentuale(minimo)}: rivedi tariffa o frequenza</p>` : ""}
      <p class="nota-piccola">È una stima, non un'offerta: va confermata dopo il sopralluogo.</p>
    </div>`;
}

// Applica il preventivo al modulo «Nuovo contatto»: ore e tariffa calcolate da servizio, mq, ambiente e frequenza
function applicaPreventivo(modulo) {
  const prev = calcolaPreventivo({ servizio: modulo.servizio.value, mq: Number(modulo.mq.value), ambiente: modulo.ambiente.value, frequenza: modulo.frequenza.value });
  if (!prev) return;
  modulo.ore.value = prev.ore;
  modulo.tariffa.value = prev.tariffa;
}

// «Punteggio 65» nella barra dei pulsanti; il lettore di schermo lo sente solo quando cambia
function aggiornaPunteggioBreve(modulo, p) {
  const breve = modulo.querySelector("#punteggio-breve");
  if (!breve) return;
  const chiave = p ? String(p.totale) : "";
  if (breve.dataset.chiave === chiave) return;
  breve.dataset.chiave = chiave;
  breve.innerHTML = p ? `<span aria-hidden="true">Punteggio ${badgePunteggio(p)}</span>
    <span class="solo-lettori">Punteggio ${p.totale} su 100</span>` : "";
}

function segnalaCampo(campo, messaggio) {
  const chiuso = campo.closest("details:not([open])");
  if (chiuso) chiuso.open = true;   // un campo in un riquadro chiuso si mostra prima di segnalarlo
  campo.setCustomValidity(messaggio);
  campo.reportValidity();
  campo.setCustomValidity("");
}

// Il dato del modulo non c'è più (es. cancellato in un'altra scheda): la finestra si chiude e si spiega perché
function datoNonPiuPresente(testo) {
  chiudiFinestra();
  mostraAvviso(testo);
}

// Valori dei campi di un modulo per nome (le caselle di spunta valgono true o false)
function valoriCampi(modulo) {
  const valori = {};
  [...modulo.elements].forEach((c) => {
    if (!c.name || (c.type === "radio" && !c.checked)) return;
    valori[c.name] = c.type === "checkbox" ? c.checked : c.value;
  });
  return valori;
}

// Ricorda i valori del modulo appena aperto, per salvare poi solo i campi cambiati
function ricordaValori(modulo) {
  modulo.dataset.iniziali = JSON.stringify(valoriCampi(modulo));
}

// Nomi dei campi cambiati dall'apertura: gli altri restano come sono salvati (anche se un'altra scheda li ha cambiati)
function campiCambiati(modulo) {
  const prima = JSON.parse(modulo.dataset.iniziali || "{}");
  const ora = valoriCampi(modulo);
  return new Set(Object.keys(ora).filter((nome) => ora[nome] !== prima[nome]));
}

// Controlla canale e date della richiesta: restituisce [campo, messaggio] del primo errore, oppure null
function erroreDateRichiesta(modulo, canale, date) {
  if (!canale) return [modulo.canale, "Scegli il canale della richiesta"];
  if (!formattaData(date.richiesta) || date.richiesta > oggi()) return [modulo.dataRichiesta, "Indica la data della richiesta (non nel futuro)"];
  if (!formattaData(date.annotazione) || date.annotazione > oggi()) return [modulo.dataAnnotazione, "Indica la data di annotazione (non nel futuro)"];
  if (date.annotazione < date.richiesta) return [modulo.dataAnnotazione, "La richiesta non si annota prima di quando è arrivata"];
  if (date.risposta && (date.risposta < date.richiesta || date.risposta > oggi())) return [modulo.dataRisposta, "La prima risposta va tra la richiesta e oggi"];
  return null;
}

function salvaContatto(modulo) {
  const { opp, nuovaAzienda, nuovoReferente, richiesta, canale, date } = leggiModulo(modulo);
  const errore = erroreDateRichiesta(modulo, canale, date);
  if (errore) return segnalaCampo(...errore);
  if (nuovaAzienda) {
    if (!nuovaAzienda.ragioneSociale) return segnalaCampo(modulo.ragioneSociale, "Scrivi la ragione sociale");
    // Stesso nome o stessa partita IVA di un'azienda già in archivio: si blocca
    const errore = controllaAzienda(nuovaAzienda);
    if (errore) return segnalaCampo(modulo[errore.campo], errore.testo + ": sceglila dall'elenco Azienda");
    if (modulo.refEmail.value.trim() && !modulo.refEmail.checkValidity()) return segnalaCampo(modulo.refEmail, "Controlla l'indirizzo email");
  }
  if (opp && opp.ore <= 0) return segnalaCampo(modulo.ore, "Inserisci le ore al mese");

  const nome = nuovaAzienda ? nuovaAzienda.ragioneSociale : nomeCliente(opp);
  const chiamata = traGiorni(2);
  let promemoria = null;
  let aziendaId = opp ? opp.aziendaId : null;
  applica(() => {
    let referenteId = opp ? opp.referenteId : null;
    if (nuovaAzienda) {
      nuovaAzienda.id = nuovoId("az");
      stato.aziende.push(nuovaAzienda);
      aziendaId = nuovaAzienda.id;
      if (nuovoReferente) {
        nuovoReferente.id = nuovoId("rf");
        nuovoReferente.aziendaId = nuovaAzienda.id;
        stato.referenti.push(nuovoReferente);
        referenteId = nuovoReferente.id;
      }
    }
    // «Cosa ha chiesto» resta come nota nella cronologia del cliente
    if (richiesta) registraAttivita({ aziendaId, referenteId, tipo: "Nota", testo: richiesta });
    if (!opp) {
      // Contatto senza servizio: l'azienda resta «Da qualificare», con la chiamata di qualifica in agenda
      registraAttivita({ aziendaId, referenteId, tipo: "Chiamata", testo: "Chiamare per qualificare la richiesta", data: chiamata, daFare: true });
      return;
    }
    opp.aziendaId = aziendaId;
    opp.referenteId = referenteId;
    stato.contatore += 1;
    opp.id = nuovoId("op");
    opp.codice = codiceRiferimento(stato.contatore);
    stato.opportunita.push(opp);
    registraAttivita({ aziendaId: opp.aziendaId, tipo: "Pipeline", testo: opp.servizio + ": nuovo contatto (" + opp.ore + " h/mese)" });
    promemoria = cadenza(opp, CONFIG.fasi[0], opp.storico.contatto);
    ultimaModificata = opp.id; // l'id nasce qui: la nuova scheda resta evidenziata tra le trattative per fase
  }, opp
    ? { messaggio: () => "Contatto creato: " + nome + testoPromemoria(promemoria), fase: "contatto", vai: "oggi" }
    : { messaggio: "Contatto salvato. Prossima azione: chiamata di qualifica " + formattaGiorno(chiamata), vai: () => "cliente-" + aziendaId });
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
        <p class="nota-piccola">Il sopralluogo entra nell'agenda del cliente e tra le schede di «Oggi» il giorno stabilito. Quando è fatto, premi «Sopralluogo fatto».</p>
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
    </form>`);
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
    const misure = o.preventivo || {};
    campi = `
      <p class="nota-piccola">Misure prese al sopralluogo: ricalcolano le ore (poi puoi correggerle).</p>
      <div class="riga-doppia">
        <label>Tipo di ambienti <select name="ambiente"><option value="">— Senza misure —</option>${opzioni(CONFIG.preventivo.ambienti.map((a) => a.nome), misure.ambiente || "")}</select></label>
        <label>Metri quadri misurati <input name="mq" type="number" inputmode="numeric" min="1" step="10" value="${misure.mq || ""}"></label>
      </div>
      <label>Frequenza <select name="frequenza">${opzioni(CONFIG.preventivo.frequenze.map((f) => f.nome), misure.frequenza || CONFIG.preventivo.frequenze[2].nome)}</select></label>
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
          <p><strong>Cliente fuori dai criteri del pilota: punteggio ${p.totale} su 100.</strong> I punti deboli:</p>
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
  // Sopralluogo fatto: finestra larga con l'anteprima del punteggio, perché le ore confermate lo cambiano
  const conAnteprima = fase.id === "sopralluogo";
  const corpo = `
    <label>${etichetta}
      <input name="data" type="date" required min="${minimo}" max="${oggi()}" value="${valore}">
    </label>
    ${campi}`;
  const pulsanti = `
    <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
    <button class="pulsante primario" type="submit">${fase.id === "contratto" ? "Conferma e vai all'allocazione" : "Conferma"}</button>`;
  apriFinestra(`
    <form class="modulo" id="modulo-fase" data-id="${esc(o.id)}" data-fase="${esc(fase.id)}" data-attivita="${esc(attivitaId || "")}" novalidate>
      <div class="finestra-testa"><h2>${esc(azione)} · ${esc(nomeCliente(o))}</h2>${badgePunteggio(p)}</div>
      <p class="nota-piccola">Registra un passo già avvenuto: controlla data e dati, poi conferma.</p>
      ${conAnteprima ? colonneConAnteprima(corpo) + azioniConPunteggio(pulsanti) : corpo + `<div class="azioni-finestra">${pulsanti}</div>`}
    </form>`, { larga: conAnteprima });
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
  // Sopralluogo: misure, tipo di ambienti o frequenza cambiati → ore ricalcolate
  if (modulo.mq && campo && ["mq", "ambiente", "frequenza"].includes(campo.name)) {
    const prev = calcolaPreventivo({ servizio: o.servizio, mq: Number(modulo.mq.value), ambiente: modulo.ambiente.value, frequenza: modulo.frequenza.value });
    if (prev) modulo.ore.value = prev.ore;
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
  aggiornaAnteprima(modulo);
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
  let ore, note, tariffa, scadenzaOfferta, motivazione, avvio, misure;
  if (fase.id === "sopralluogo") {
    ore = Math.round(Number(modulo.ore.value)) || 0;
    note = modulo.note.value.trim();
    misure = modulo.ambiente.value && Number(modulo.mq.value) > 0
      ? { ambiente: modulo.ambiente.value, mq: Math.round(Number(modulo.mq.value)), frequenza: modulo.frequenza.value } : null;
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
        Object.assign(o, { ore, valore: null, capacitaSimulata: null });
      }
      if (misure) o.preventivo = misure;   // le misure del sopralluogo diventano la base del preventivo
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
      if (tariffa !== tariffaOraria(o)) o.valore = null;   // nuova tariffa: il valore si ricalcola da ore e tariffa
      o.tariffa = tariffa !== datiServizio(o.servizio).tariffa ? tariffa : null;
      o.scadenzaOfferta = scadenzaOfferta;
      if (motivazione) o.motivazioneC = motivazione;
      dettaglio = "tariffa " + tariffa.toLocaleString("it-IT") + " €/ora, valida fino al " + formattaData(scadenzaOfferta);
    } else if (fase.id === "contratto") {
      o.avvio = avvio;
      o.scadenzaContratto = aggiungiMesi(data, CONFIG.durataContrattoMesi);
      dettaglio = "avvio del servizio il " + formattaData(avvio);
    }
    promemoria = registraFase(o, fase, data, dettaglio);
  }, { messaggio: () => messaggioFase(o, fase, promemoria), evidenzia: o.id, fase: fase.id,
    // Dopo la firma si va all'allocazione; dopo l'offerta registrata dal preventivo, alla scheda della trattativa (prossimo passo: la firma)
    vai: fase.id === "contratto" ? "allocazione" : location.hash.startsWith("#preventivo-") ? "trattativa-" + o.id : null });
}

// «Da ricontattare»: etichetta sulla fase attuale con la data (obbligatoria) in cui richiamare il cliente
function apriRicontatto(id) {
  const o = trova(id);
  if (!o || !trattativaAperta(o)) return;
  apriFinestra(`
    <form class="modulo" id="modulo-ricontatto" data-id="${esc(o.id)}" novalidate>
      <div>
        <h2>Da ricontattare · ${esc(nomeCliente(o))}</h2>
        <p class="nota-piccola">La trattativa resta in «${CONFIG.fasi[faseRaggiunta(o)].nome}». Quando la data arriva compare in «Poi, se resta tempo» in «Oggi».</p>
      </div>
      <label>Data del ricontatto * <input name="data" type="date" required min="${oggi()}"></label>
      ${pulsantiRapidi([[7, "Tra una settimana"], [14, "Tra due settimane"], [30, "Tra un mese"]])}
      <label>Motivo (facoltativo) <input name="nota" autocomplete="off" placeholder="Es. decide dopo la riunione dei soci"></label>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Segna da ricontattare</button>
      </div>
    </form>`);
}

// Senza data non si passa a «Da ricontattare»
function salvaRicontatto(modulo) {
  const o = trova(modulo.dataset.id);
  if (!o || !trattativaAperta(o)) return chiudiFinestra();
  const data = modulo.data.value;
  const nota = modulo.nota.value.trim();
  if (!formattaData(data)) return segnalaCampo(modulo.data, "Indica la data del ricontatto: senza data la trattativa non diventa «Da ricontattare»");
  if (data < oggi()) return segnalaCampo(modulo.data, "Scegli una data da oggi in poi");
  applica(() => {
    o.ricontatto = { data, nota };
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: o.servizio + ": da ricontattare il " + formattaData(data) + (nota ? " (" + nota + ")" : "") });
  }, { messaggio: nomeCliente(o) + ": da ricontattare il " + formattaData(data), evidenzia: o.id });
}

// Ricontatto fatto: l'etichetta sparisce e resta una chiamata nella cronologia
function ricontattato(id) {
  const o = trova(id);
  if (!o || !o.ricontatto) return;
  applica(() => {
    delete o.ricontatto;
    registraAttivita({ aziendaId: o.aziendaId, referenteId: o.referenteId || null, tipo: "Chiamata", testo: "Cliente ricontattato" });
  }, { messaggio: nomeCliente(o) + ": ricontatto registrato. Fissa la prossima azione", evidenzia: o.id });
}

// Firma da link (simulata): il cliente apre il link, legge l'offerta e firma senza app, account né password
function apriFirmaLink(id) {
  const o = trova(id);
  if (!o || faseAttuale(o) !== "offerta") return;
  apriFinestra(`
    <h2>Firma da link · ${esc(nomeCliente(o))}</h2>
    <p>Il cliente riceve l'offerta per email o WhatsApp con un link: la legge e la firma dal telefono, senza registrarsi.
      La tecnologia nuova sta tutta dal lato di Gate.</p>
    <div class="riquadro firma-anteprima">
      <p class="commessa-codice">OFFERTA ${esc(o.codice)} · LINK DI FIRMA ${badgePunteggio(calcolaPunteggio(o, stato.opportunita))}</p>
      <p><strong>${esc(o.servizio)} · ${esc(o.comune)}</strong></p>
      <p class="nota-piccola">${Number(o.ore)} ore al mese · ${formattaEuro(valoreAnnuo(o))} all'anno${o.scadenzaOfferta ? " · valida fino al " + formattaData(o.scadenzaOfferta) : ""}</p>
    </div>
    <p class="nota-piccola">La firma si registra con la data di oggi.</p>
    <div class="azioni-finestra">
      <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
      <button class="pulsante primario" type="button" data-azione="conferma-firma" data-id="${esc(o.id)}">${icona("spunta")} Il cliente ha firmato</button>
    </div>`);
}

// Registra il contratto firmato da link: data di oggi, avvio proposto, firma da link
function confermaFirma(id) {
  const o = trova(id);
  const contratto = CONFIG.fasi.find((f) => f.id === "contratto");
  if (!o || faseAttuale(o) !== "offerta") return chiudiFinestra();
  let promemoria = null;
  applica(() => {
    o.firmaDaLink = true;
    o.avvio = aggiungiGiorni(oggi(), CONFIG.giorniAvvioServizio);
    o.scadenzaContratto = aggiungiMesi(oggi(), CONFIG.durataContrattoMesi);
    promemoria = registraFase(o, contratto, oggi(), "firmata da link, avvio il " + formattaData(o.avvio));
  }, { messaggio: () => "Offerta firmata da link: " + messaggioFase(o, contratto, promemoria), evidenzia: o.id, fase: "contratto", vai: "allocazione" });
}

// Motivo della perdita: va scelto, non parte già impostato
function apriPerso(id) {
  const o = trova(id);
  if (!o) return;
  apriFinestra(`
    <form class="modulo" id="modulo-perso" data-id="${esc(o.id)}" novalidate>
      <h2>Segna come perso</h2>
      <p>${esc(nomeCliente(o))} uscirà dalle trattative aperte, ma resterà nei conteggi degli indicatori. Se serve, potrai riaprirla dal dettaglio.</p>
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
    </form>`);
}

function salvaPerso(modulo) {
  const o = trova(modulo.dataset.id);
  const motivo = modulo.motivo.value;
  const nota = modulo.nota.value.trim();
  if (!o || o.perso) return chiudiFinestra();
  if (!motivo) return segnalaCampo(modulo.motivo, "Scegli il motivo");
  applica(() => {
    o.perso = { data: oggi(), motivo, ...(nota ? { nota } : {}) };
    delete o.ricontatto;
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
    </div>`);
}

// =========================================================== AZIONI

// Ogni modifica passa da qui: copia per «Annulla», modifica, salvataggio, ridisegno, avviso.
// cambia() modifica lo stato; se restituisce false non succede nulla.
// messaggio e vai possono essere funzioni, quando dipendono dalla modifica appena fatta.
function applica(cambia, { messaggio = "", evidenzia = null, fase = null, vai = null, annullabile = true, permesso = "modifica" } = {}) {
  // Il ruolo di chi lavora può fare questa modifica? (permessi in CONFIG.ruoli)
  if (!puo(permesso)) {
    if (finestra.open) chiudiFinestra();
    mostraAvviso("Il ruolo " + ruoloUtente().nome + " può consultare ma non fare questa modifica");
    return false;
  }
  const copia = { dati: clona(stato), fase: faseSelezionata, evidenzia, schermata: location.hash };
  if (cambia() === false) return false;
  // Ultima difesa: dati che non si rileggerebbero (es. collegati a un'azienda eliminata in un'altra scheda) non si salvano
  if (!strutturaValida(stato)) {
    stato = copia.dati;
    if (finestra.open) chiudiFinestra();
    disegna();
    mostraAvviso("Modifica non salvata: i dati sono cambiati in un'altra scheda. Controlla e riprova");
    return false;
  }
  // Record cambiati e riga del registro (chi, quando, cosa); l'archivio riceve l'elenco dei cambiamenti
  const modifiche = confrontaStati(copia.dati, stato);
  const testo = typeof messaggio === "function" ? messaggio() : messaggio;
  registraModifica(testo, modifiche);
  salva(modifiche);
  modificheApplicate += 1;
  if (finestra.open) chiudiFinestra();
  if (fase) faseSelezionata = fase;
  if (evidenzia) ultimaModificata = evidenzia;
  if (typeof vai === "function") vai = vai(); // la schermata può dipendere dalla modifica (es. la scheda di un'azienda nuova)
  if (vai && vai !== normalizzaSchermata(location.hash.slice(1))) location.hash = vai;
  else disegna();
  mostraAvviso(testo, annullabile ? copia : null);
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
  delete o.ricontatto;   // la trattativa si è mossa: il ricontatto non serve più
  if (!o.dataPrimaRisposta) o.dataPrimaRisposta = data;   // qualificare la richiesta vuol dire averle già risposto (K12)
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
  let promemoria = null;
  applica(() => {
    delete o.storico[attuale.id];
    if (attuale.id === "offerta") o.scadenzaOfferta = null;
    if (attuale.id === "contratto") o.avvio = o.scadenzaContratto = null;
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: "Correzione: fase «" + attuale.nome + "» annullata, torna a «" + precedente.nome + "»" });
    // Il promemoria della fase annullata sparisce e torna quello della fase precedente (dalla sua data, mai prima di oggi)
    promemoria = cadenza(o, precedente, o.storico[precedente.id]);
  }, { messaggio: () => nomeCliente(o) + " torna a «" + precedente.nome + "»" + testoPromemoria(promemoria), evidenzia: o.id, fase: precedente.id });
}

// Correzione: riapre una trattativa segnata come persa
function riapri(id) {
  const o = trova(id);
  if (!o || !o.perso) return;
  const motivo = o.perso.motivo;
  const fase = CONFIG.fasi[faseRaggiunta(o)];
  let promemoria = null;
  applica(() => {
    o.perso = null;
    o.riaperta = oggi(); // i giorni «fermi» si contano da oggi, non dalla vecchia data della fase
    registraAttivita({ aziendaId: o.aziendaId, tipo: "Pipeline", testo: "Correzione: trattativa riaperta (era persa per «" + motivo + "»)" });
    // Nessuna trattativa aperta senza prossima azione: torna il promemoria della sua fase
    promemoria = cadenza(o, fase, oggi());
  }, { messaggio: () => nomeCliente(o) + ": trattativa riaperta" + testoPromemoria(promemoria), evidenzia: o.id, fase: fase.id });
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
  dettaglio: (el) => { location.hash = "trattativa-" + el.dataset.id; },   // la scheda della trattativa è una pagina intera
  avanza: (el) => avanza(el.dataset.id),
  perso: (el) => apriPerso(el.dataset.id),
  fase: (el) => {
    faseSelezionata = el.dataset.id;
    disegna();
  },
  // Avvisi di «Oggi» e consigli: portano dove si risolvono
  "vai-domani": () => {   // dai consigli e da «Come funziona»: gli Indicatori per chi li ha, altrimenti il Cruscotto
    interfaccia.indicatori.livello = "previsione";
    interfaccia.indicatori.fonte = "fittizi";
    location.hash = puo("approfondimenti") ? "#indicatori" : "#cruscotto";
  },
  "vai-allocazione": () => {
    location.hash = "#allocazione";
  },
  "vai-partner": () => {
    interfaccia.allocazione.aperti["squadre-partner"] = true;
    location.hash = "#allocazione";
  },
  // «Mostra altre N» in fondo a una colonna delle trattative per fase
  "mostra-tutte": (el) => {
    espanse[el.dataset.id] = true;
    disegna();
  },
  // «Tutte le trattative da seguire (N)» / «Mostra meno» in «Poi, se resta tempo»
  "mostra-tutto": (el) => {
    elenchiAperti[el.dataset.id] = !elenchiAperti[el.dataset.id];
    disegna();
    const pulsante = document.querySelector(`[data-azione="mostra-tutto"][data-id="${el.dataset.id}"]`);
    if (pulsante) pulsante.focus({ preventScroll: true });
  },
  // Collegamento a una sezione della stessa schermata (es. «Poi, se resta tempo» dalla giornata libera);
  // data-apri="poi": da telefono la sezione «Poi» è chiusa e va aperta prima di scorrerci
  scorri: (el, evento) => {
    evento.preventDefault();
    if (el.dataset.apri === "poi" && !interfaccia.oggi.poiAperto) {
      interfaccia.oggi.poiAperto = true;
      disegna();
    }
    const meta = document.getElementById(el.dataset.id);
    if (meta) {
      meta.scrollIntoView({ block: "start", behavior: comeScorrere() });
      meta.focus({ preventScroll: true });
    }
  },
  chiudi: () => chiudiFinestra(),
  // «Usa questa azienda» nel riquadro «Forse esiste già»
  "usa-azienda": (el) => {
    const modulo = el.closest("form");
    scegliAzienda(modulo, el.dataset.id);
    modulo.ore.focus();
  },
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
  "firma-link": (el) => apriFirmaLink(el.dataset.id),
  utente: () => apriUtente(),
  registro: () => apriRegistro(),
  "da-ricontattare": (el) => apriRicontatto(el.dataset.id),
  ricontattato: (el) => ricontattato(el.dataset.id),
  "conferma-firma": (el) => confermaFirma(el.dataset.id),
  "torna-indietro": (el) => tornaIndietro(el.dataset.id),
  riapri: (el) => riapri(el.dataset.id),
  ...AZIONI_CLIENTI,
  ...AZIONI_OGGI,
  "conferma-ripristino": () => applica(() => {
    stato = datiIniziali();
  }, { messaggio: "Dati di esempio ripristinati", fase: "contatto", permesso: "delicate" }),
  "entra-ospite": () => entraOspite(),
  // Riporta i dati a prima dell'ultima modifica (un solo passo indietro)
  annulla: () => {
    if (!copiaPerAnnulla) return;
    const copia = copiaPerAnnulla;
    const prima = stato;
    stato = copia.dati;
    faseSelezionata = copia.fase;
    ultimaModificata = copia.evidenzia;
    const modifiche = confrontaStati(prima, stato);
    stato.registro = prima.registro;   // il registro non torna indietro: resta traccia anche della modifica annullata
    registraModifica("Annullata l'ultima modifica", modifiche);
    salva(modifiche);
    if (finestra.open) chiudiFinestra();
    // Si torna alla schermata in cui era partita l'azione (es. dall'Allocazione a «Oggi»)
    if (copia.schermata !== location.hash) location.hash = copia.schermata;
    else disegna();
    mostraAvviso("Azione annullata");
  },
};

// Azioni che modificano i dati: un secondo clic ravvicinato viene ignorato
// Azioni che modificano i dati o aprono una finestra per modificarli: nascoste ai ruoli in sola consultazione
const SOLO_CON_MODIFICA = new Set(["nuovo", "nota", "nuova-opportunita", "modifica-azienda", "modifica-opportunita", "modifica-referente", "nuovo-referente",
  "fissa-sopralluogo", "registra-sopralluogo", "perso", "firma-link", "da-ricontattare", "prossima-azione", "registra-offerta", "usa-tariffa", "chiedi-cancella-dati",
  "chiedi-elimina-azienda", "fase", "scorri", "avanza", "fatto", "fatto-fase", "chiamata-fatta", "assegna-squadra", "proponi", "risposta-si", "risposta-no",
  "cancella-dati", "elimina-azienda", "torna-indietro", "riapri", "ricontattato", "whatsapp-sopralluogo", "importa-contatti"]);

const MODIFICANO_DATI = new Set(['importa-contatti', "avanza", "fatto", "fatto-fase", "chiamata-fatta", "assegna-squadra", "proponi", "risposta-si", "risposta-no",
  "cancella-dati", "elimina-azienda", "torna-indietro", "riapri", "conferma-ripristino", "conferma-importa", "conferma-firma", "ricontattato", "registra-offerta", "annulla"]);
let ultimoClicModifica = 0;
let ultimoInvio = 0; // quando è stato inviato l'ultimo modulo (ms)

// Doppio tocco su «Salva»: il secondo tocco, a finestra già chiusa, cadrebbe sul menu o sulla pagina sotto.
// Per 600 ms dopo l'invio di un modulo che ha chiuso la finestra, un clic fuori dalla finestra non fa nulla
// (se il modulo ha un errore la finestra resta aperta e non si blocca niente)
document.addEventListener("click", (evento) => {
  if (Date.now() - ultimoInvio < 600 && !finestra.contains(evento.target)) {
    evento.preventDefault();
    evento.stopPropagation();
  }
}, true);

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
  ultimoComando = el; // la finestra che si apre ricorda chi l'ha aperta, per ridargli il focus
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
    "modulo-ricontatto": salvaRicontatto,
    "modulo-utente": salvaUtente,
    ...GESTORI_MODULI, // moduli della schermata Clienti (clienti.js)
  };
  if (gestori[modulo.id]) gestori[modulo.id](modulo);
  if (!finestra.open) ultimoInvio = Date.now(); // salvato e chiuso: il secondo tocco di un doppio tocco va ignorato
});

// Anteprima del punteggio mentre si compila il modulo; ricerca nell'elenco clienti; bozza dell'attività
let timerRicerca;
document.addEventListener("input", (evento) => {
  const modulo = evento.target.closest("#modulo-contatto, #modulo-opportunita");
  if (modulo && modulo.id === "modulo-contatto" && evento.target.name === "mq") applicaPreventivo(modulo);
  if (modulo) aggiornaAnteprima(modulo);
  if (["ragioneSociale", "piva", "refTelefono", "refEmail"].includes(evento.target.name) && evento.target.closest("#modulo-contatto")) {
    aggiornaAvvisoDoppione(evento.target.form);
  }
  if (evento.target.closest("#modulo-fase")) aggiornaModuloFase(evento.target.form, evento.target);
  // Ricerca e filtri dei Clienti: si ricordano nell'interfaccia e l'elenco si ridisegna dopo 150 ms
  if (evento.target.closest("#filtri-clienti")) {
    leggiFiltriClienti();
    clearTimeout(timerRicerca);
    timerRicerca = setTimeout(aggiornaElencoClienti, 150);
  }
  if (evento.target.closest("#modulo-attivita")) salvaBozzaAttivita(evento.target.form);
});

// Riquadri dell'Allocazione aperti o chiusi a mano: restano così dopo ogni ridisegno
document.addEventListener("toggle", (evento) => {
  const id = evento.target.dataset && evento.target.dataset.ricorda;
  if (id) interfaccia.allocazione.aperti[id] = evento.target.open;
}, true);

// Importazione di un backup scelto dall'utente
document.getElementById("file-backup").addEventListener("change", (evento) => {
  const file = evento.target.files[0];
  evento.target.value = "";
  if (file) importaBackup(file);
});

document.addEventListener("change", (evento) => {
  const campo = evento.target;
  if (campo.id === "filtro-zona") {
    interfaccia.allocazione.zona = campo.value;
    disegna();
    return document.getElementById("filtro-zona")?.focus();
  }
  if (campo.closest("#filtri-clienti")) return; // già gestito dall'evento input
  if (campo.form && campo.form.id === "modulo-attivita") return cambiaQuandoAttivita(campo.form, campo);
  if (campo.form && campo.form.id === "modulo-fase") return aggiornaModuloFase(campo.form, campo);
  // Privacy del referente: scegliendo una base giuridica la data diventa oggi, se non era già scritta
  if (campo.form && campo.form.id === "modulo-referente" && campo.name === "base") {
    if (campo.value !== CONFIG.basiGiuridiche[0] && !campo.form.dataPrivacy.value) campo.form.dataPrivacy.value = oggi();
    return;
  }
  if (!campo.form || !["modulo-contatto", "modulo-opportunita"].includes(campo.form.id)) return;
  // Cambiando servizio, la tariffa torna quella standard del nuovo servizio
  if (campo.name === "servizio") campo.form.tariffa.value = datiServizio(campo.value).tariffa;
  if (["servizio", "ambiente", "frequenza"].includes(campo.name) && campo.form.id === "modulo-contatto") applicaPreventivo(campo.form);
  // Scegliendo un'azienda esistente si nascondono i campi della nuova azienda
  if (campo.name === "azienda") return scegliAzienda(campo.form, campo.value);
  if (campo.name === "daCapire") aggiornaServizioDaCapire(campo.form);
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

// Nasconde l'avviso; da quel momento l'ultima modifica non si può più annullare.
// In «Oggi» l'«Annulla» dentro la scheda chiusa vale quanto quello dell'avviso: sparisce con lui (ridisegno)
function nascondiAvviso(ridisegna = true) {
  document.getElementById("avviso").classList.remove("visibile");
  const avevaCopia = !!copiaPerAnnulla;
  copiaPerAnnulla = null;
  if (avevaCopia && ridisegna && document.querySelector(".pagina-oggi [data-azione=annulla-oggi]")) {
    interfaccia.oggi.annullaScaduto = modificheApplicate;
    disegna();
  }
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

// Quando è stato fatto l'ultimo backup ("mai", "oggi", "3 giorni fa") e se è ora di farne uno (mai o da oltre 7 giorni)
function quandoUltimoBackup() {
  const giorni = stato.ultimoBackup ? giorniTra(stato.ultimoBackup, oggi()) : null;
  return { quando: giorni === null ? "mai" : giorni <= 0 ? "oggi" : giorni === 1 ? "ieri" : giorni + " giorni fa", daFare: giorni === null || giorni > 7 };
}

// Promemoria nel piè di pagina (con il pulsante solo quando serve) e data in Documenti
function aggiornaStatoBackup() {
  const { quando, daFare } = quandoUltimoBackup();
  document.getElementById("stato-backup").innerHTML = "Ultimo backup: " + quando +
    (daFare ? ' <button class="pulsante secondario piccolo" type="button" data-azione="esporta-backup">Salva backup</button>' : "");
  document.querySelectorAll(".quando-backup").forEach((el) => { el.textContent = quando; });
}

const SCHERMATE = {
  oggi: disegnaOggi,             // schermata di apertura: le cose da fare oggi e le trattative per fase (oggi.js)
  clienti: disegnaClienti,
  cliente: disegnaClienteAffiancato, // scheda di un'azienda: #cliente-<id>, con l'elenco accanto su schermo largo
  preventivo: disegnaPreventivo, // preventivo di un'opportunità: #preventivo-<id>
  allocazione: disegnaAllocazione,
  indicatori: disegnaIndicatori,
  documenti: disegnaDocumenti,
  cruscotto: disegnaCruscotto,
  trattativa: disegnaTrattativa,   // scheda di una trattativa: #trattativa-<id>   // quattro numeri, decisioni, dove e perché si perdono i clienti, canali, controllo del processo
  accesso: disegnaAccesso,       // chi sta lavorando: nome e ruolo (al primo uso in questo browser)   // report da stampare, gestionale, Excel, CSV dei dati reali, backup
  riepilogo: disegnaRiepilogo,   // riepilogo del mese da stampare: #riepilogo
  lunedi: disegnaLunedi,         // lista del lunedì da stampare o copiare: #lunedi
  "come-funziona": disegnaComeFunziona,   // i 5 livelli della piattaforma e la demo guidata
};

// Nome della schermata nel titolo della scheda del browser, es. "Clienti · Gate"
const TITOLI = { oggi: "Oggi", clienti: "Clienti", allocazione: "Allocazione", cruscotto: "Cruscotto", indicatori: "Indicatori", documenti: "Documenti", accesso: "Accesso" };

// Indirizzi vecchi che restano validi: #pipeline è la schermata «Oggi»
const ALIAS_SCHERMATE = { pipeline: "oggi", direzione: "cruscotto" };

// Nome della schermata da un hash: alias risolti, vuoto o sconosciuto = «Oggi» (la schermata di apertura)
function normalizzaSchermata(hash) {
  // hasOwn: un indirizzo come #constructor non deve trovare le proprietà nascoste degli oggetti
  return (Object.hasOwn(ALIAS_SCHERMATE, hash) ? ALIAS_SCHERMATE[hash] : hash) || "oggi";
}

// Scorrimento morbido, oppure immediato per chi ha chiesto meno animazioni al sistema
function comeScorrere() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

// Legge la schermata dall'indirizzo: #oggi (o #pipeline), #clienti, #cliente-az3 ...
function schermataAttuale() {
  if (utenteAttuale().daScegliere) return { nome: "accesso", menu: "" };
  if (!location.hash.slice(1)) return { nome: ruoloUtente().casa, menu: ruoloUtente().casa };   // senza indirizzo: l'apertura del ruolo
  const scelta = schermataIndirizzo();
  // Una schermata fuori dal ruolo porta alla schermata di apertura del ruolo
  return schermataDelRuolo(scelta.menu) && (scelta.nome !== "indicatori" || puo("approfondimenti"))
    ? scelta : { nome: ruoloUtente().casa, menu: ruoloUtente().casa };
}

// Schermata, parametro e voce di menu dall'indirizzo
function schermataIndirizzo() {
  const hash = normalizzaSchermata(location.hash.slice(1));
  if (hash === "indicatori") return { nome: "indicatori", menu: "cruscotto" };
  if (hash.startsWith("cliente-") && trovaAzienda(hash.slice(8))) return { nome: "cliente", parametro: hash.slice(8), menu: "clienti" };
  if (hash.startsWith("preventivo-") && trova(hash.slice(11))) return { nome: "preventivo", parametro: hash.slice(11), menu: "oggi" };
  // Scheda della trattativa: sotto «Oggi», o sotto Clienti per i ruoli che non hanno Oggi (consultazione)
  if (hash.startsWith("trattativa-") && trova(hash.slice(11))) return { nome: "trattativa", parametro: hash.slice(11), menu: schermataDelRuolo("oggi") ? "oggi" : "clienti" };
  if (hash === "riepilogo") return { nome: "riepilogo", menu: "documenti" };
  if (hash === "lunedi") return { nome: "lunedi", menu: "documenti" };
  if (hash === "come-funziona") return { nome: "come-funziona", menu: "" };
  // hasOwn: un indirizzo come #constructor non deve trovare le proprietà nascoste degli oggetti
  return Object.hasOwn(TITOLI, hash) ? { nome: hash, menu: hash } : { nome: "oggi", menu: "oggi" };
}

// Contatore del menu: il numero si vede, il lettore di schermo legge la frase intera (es. ", 4 attività da fare entro oggi")
function aggiornaContatore(id, n, testo) {
  const el = document.getElementById(id);
  el.innerHTML = `<span aria-hidden="true">${n}</span><span class="solo-lettori">, ${n} ${testo}</span>`;
  el.hidden = n === 0;
}

// Ridisegna la schermata attuale a partire dallo stato.
// Restituisce true se ha messo il focus sulla scheda appena modificata
function disegna() {
  const { nome, parametro, menu } = schermataAttuale();
  // Portato all'apertura del ruolo (indirizzo fuori dal ruolo): l'indirizzo si allinea senza aggiungere un passo alla cronologia
  if (nome === ruoloUtente().casa && location.hash.slice(1) && normalizzaSchermata(location.hash.slice(1)) !== nome) history.replaceState(null, "", "#" + nome);
  const titolo = nome === "trattativa" ? nomeCliente(trova(parametro)) : nome === "cliente" ? trovaAzienda(parametro).ragioneSociale : nome === "preventivo" ? "Preventivo " + nomeCliente(trova(parametro))
    : nome === "riepilogo" ? "Riepilogo del mese" : nome === "lunedi" ? "Lista del lunedì" : nome === "come-funziona" ? "Come funziona" : TITOLI[nome];
  document.title = titolo + " · Gate";
  let focusSulla = false;
  let html;
  try {
    html = SCHERMATE[nome](parametro);
  } catch (errore) {
    // Un dato imprevisto non lascia la pagina bianca: si spiega cosa fare
    console.error(errore);
    html = '<p class="vuoto">Questa schermata non si può mostrare: alcuni dati non sono validi. In «Documenti» salva un backup e poi ripristina i dati di esempio.</p>';
  }
  document.getElementById("schermata").innerHTML = html;

  // Voce di menu attiva
  // Ruolo in sola consultazione: niente pulsanti di modifica né il modulo «Registra un'attività»
  if (!puo("modifica")) {
    document.querySelectorAll("#schermata [data-azione]").forEach((el) => { if (SOLO_CON_MODIFICA.has(el.dataset.azione)) el.hidden = true; });
    document.querySelectorAll("#schermata #modulo-attivita, #schermata #titolo-attivita").forEach((el) => { el.hidden = true; });
  }
  // Voci del ruolo, nel suo ordine (le altre si nascondono); nella schermata di accesso il menu non serve
  const voci = nome === "accesso" ? [] : ruoloUtente().schermate;
  document.querySelectorAll("[data-vai]").forEach((a) => {
    if (a.dataset.vai === menu) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
    a.hidden = !voci.includes(a.dataset.vai);
    a.style.order = voci.indexOf(a.dataset.vai);
  });

  // Schede d'azione ancora aperte (0-3) accanto alla voce "Oggi"
  const restano = restanoOggi();
  aggiornaContatore("conteggio-oggi", restano, restano === 1 ? "cosa da fare oggi" : "cose da fare oggi");

  // Numero di commesse da assegnare accanto alla voce "Allocazione"
  const daAssegnare = stato.opportunita.filter((o) => o.storico.contratto && !o.perso && !o.allocazione).length;
  aggiornaContatore("conteggio-allocazione", daAssegnare, daAssegnare === 1 ? "commessa da assegnare" : "commesse da assegnare");

  aggiornaStatoBackup();
  aggiornaRigaUtente();

  // Porta in vista la scheda appena modificata; in «Oggi» no, se il clic è partito da una scheda d'azione o da una riga in alto (oggi.js)
  const inAlto = interfaccia.oggi.clicInAlto;
  interfaccia.oggi.clicInAlto = false;
  if (ultimaModificata) {
    const el = document.getElementById("scheda-" + ultimaModificata) || document.getElementById("commessa-" + ultimaModificata);
    if (el && !inAlto) {
      el.scrollIntoView({ block: "center", behavior: comeScorrere() });
      // Il focus resta sulla scheda modificata (utile da tastiera e con lettore di schermo)
      const comando = el.querySelector("button, a");
      if (comando && !finestra.open) {
        comando.focus({ preventScroll: true });
        focusSulla = true;
      }
    }
    ultimaModificata = null;
  }
  return focusSulla;
}

window.addEventListener("hashchange", (evento) => {
  // Schermata di provenienza (es. "oggi"): la scheda cliente offre «← Oggi» per tornarci
  interfaccia.provenienza = normalizzaSchermata((evento.oldURL.split("#")[1] || "").split("-")[0]);
  interfaccia.oggi = statoOggiVuoto(); // le schede chiuse in «Oggi» si ricordano solo finché si resta lì
  // L'avviso appena comparso (es. "Contatto creato" salvato da Clienti) resta visibile sulla nuova schermata
  if (Date.now() - avvisoMostratoIl > 1000) nascondiAvviso(false);   // disegna() arriva subito sotto
  window.scrollTo(0, 0);
  // Il focus va al titolo della nuova schermata (il lettore di schermo la annuncia), salvo una scheda appena modificata
  if (!disegna() && !finestra.open) {
    const h1 = document.querySelector("#schermata h1");
    if (h1) h1.focus({ preventScroll: true });
  }
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

if (datiDiVersionePrecedente) {
  avvisoFisso("Sono disponibili i nuovi dati di prova, uguali a quelli del database SQL. I tuoi dati salvati restano finché non scegli di sostituirli.",
    '<button class="pulsante primario piccolo" type="button" data-azione="ripristina">Usa i nuovi dati</button>');
}

if (datiScartati) {
  avvisoFisso("I dati salvati in questo browser non si leggono: li abbiamo messi da parte.",
    '<button class="pulsante no piccolo" type="button" data-azione="scarica-scartati">Scarica la copia</button>');
}

disegna();

// ============================================ DOMANDE PREDITTIVA E PRESCRITTIVA

// Allocazione: ore che serviranno se si firmano le offerte aperte
function sezioneCapacitaFutura() {
  const zone = previsioneCapacita(stato.opportunita);
  if (!zone.length) return "";
  const scoperte = zone.filter((z) => zonaConSquadre(z) && z.mancano);
  return richiudibile("capacita", `Capacità se si firmano le offerte aperte`,
    scoperte.length ? `<span class="chip chip-critico">mancano ore in ${quanti(scoperte.length, "zona", "zone")}</span>` : '<span class="chip chip-ok">capacità sufficiente</span>', `
      <ul class="elenco-capacita">
        ${zone.filter(zonaConSquadre).map((z) => `<li class="${z.mancano ? "manca" : ""}">
          <strong>${esc(z.zona)}</strong>: servono ${z.ore} ore/mese, le squadre ne hanno ${z.libere} libere
          ${z.mancano ? `<span class="chip chip-critico">mancano ${z.mancano} ore: servirà un partner</span>` : '<span class="chip chip-ok">capacità sufficiente</span>'}
        </li>`).join("")}
      </ul>
      ${rigaZoneSenzaSquadre(zone)}`);
}

// Zona coperta da almeno una squadra interna
function zonaConSquadre(z) {
  return CONFIG.squadre.some((s) => s.zone.includes(z.zona));
}

// Le zone senza squadre in una sola riga: lì serve comunque un partner
function rigaZoneSenzaSquadre(zone) {
  const fuori = zone.filter((z) => !zonaConSquadre(z));
  if (!fuori.length) return "";
  return `<p class="nota-piccola">Fuori dalle zone delle squadre: ${fuori.reduce((s, z) => s + z.ore, 0)} ore/mese in ${quanti(fuori.length, "zona", "zone")}
    (${esc(fuori.map((z) => z.zona).join(", "))}): servono partner.</p>`;
}

