/*
 * CLIENTI
 * Anagrafica delle aziende con i loro referenti, la cronologia delle attività
 * (chiamate, email, visite, note) e le prossime azioni da fare.
 */

// =========================================================== ATTIVITÀ DA FARE

function attivitaDaFare() {
  return stato.attivita.filter((x) => x.daFare).sort((a, b) => a.data.localeCompare(b.data));
}

// Etichetta della scadenza: in ritardo, oggi, domani, giorno della settimana (entro 7 giorni) o data
function scadenza(data) {
  if (data < oggi()) return `<span class="chip chip-critico">${icona("attenzione")} In ritardo · ${formattaData(data)}</span>`;
  if (data === oggi()) return '<span class="chip chip-attenzione">Oggi</span>';
  if (data === traGiorni(1)) return '<span class="chip">Domani</span>';
  if (data <= traGiorni(7)) return `<span class="chip">${formattaGiorno(data)}</span>`;
  return `<span class="chip">${formattaData(data)}</span>`;
}

// Fase che un'attività da fare registra quando è fatta (es. il sopralluogo fissato), se l'opportunità ci deve ancora arrivare
function faseDaRegistrare(x) {
  const o = x.fase && x.opportunitaId ? trova(x.opportunitaId) : null;
  const prossima = o && !o.perso ? CONFIG.fasi[faseRaggiunta(o) + 1] : null;
  return prossima && prossima.id === x.fase ? prossima : null;
}

// Riga di un'attività da fare, con il pulsante per segnarla come fatta
function rigaDaFare(x, conAzienda) {
  const azienda = trovaAzienda(x.aziendaId);
  const ref = trovaReferente(x.referenteId) || referentiDi(x.aziendaId).find((r) => r.decisore) || referentiDi(x.aziendaId)[0];
  const fase = faseDaRegistrare(x);
  // Un sopralluogo fissato si chiude con «Sopralluogo fatto», che registra anche la fase
  const pulsante = fase
    ? `<button class="pulsante primario piccolo" type="button" data-azione="fatto-fase" data-id="${esc(x.id)}">${icona("spunta")} ${CONFIG.fasi[CONFIG.fasi.indexOf(fase) - 1].azione}</button>`
    : `<button class="pulsante secondario piccolo" type="button" data-azione="fatto" data-id="${esc(x.id)}">${icona("spunta")} Fatto</button>`;
  const testo = esc(x.tipo) + " · " + esc(x.testo) + (x.ora ? " · ore " + esc(x.ora) : "");
  return `
    <li class="da-fare">
      <div class="da-fare-testo">
        <p title="${testo}">${scadenza(x.data)} <span><strong>${esc(x.tipo)}</strong> · ${esc(x.testo)}${x.ora ? " · ore " + esc(x.ora) : ""}</span></p>
        ${conAzienda ? `<p class="nota-piccola"><a class="link" href="#cliente-${esc(azienda.id)}">${esc(azienda.ragioneSociale)}</a>${ref ? " · " + esc(ref.nome) : ""}</p>` : ""}
      </div>
      <div class="da-fare-azioni">
        ${ref ? pulsantiContatto(ref, true) : ""}
        ${pulsante}
      </div>
    </li>`;
}

// Elenco limitato a 3 righe, con «Mostra tutte (N)» / «Mostra meno» (lo stato è in elenchiAperti, app.js)
function elencoLimitato(id, righe) {
  const aperto = elenchiAperti[id];
  return {
    righe: aperto ? righe : righe.slice(0, 3),
    pulsante: righe.length > 3
      ? `<button class="pulsante-testo positivo" type="button" data-azione="mostra-tutto" data-id="${id}" aria-expanded="${aperto}">${aperto ? "Mostra meno" : "Mostra tutte (" + righe.length + ")"}</button>`
      : "",
  };
}

// Riquadro "Da fare oggi" in cima alla Pipeline: attività scadute e di oggi
function sezioneDaFare() {
  const tutte = attivitaDaFare();
  const entroOggi = tutte.filter((x) => x.data <= oggi());
  const prossime = tutte.length - entroOggi.length;
  const elenco = elencoLimitato("da-fare", entroOggi);
  const piede = elenco.pulsante + (prossime ? `<span>Nei prossimi giorni: ${prossime} attività. Le trovi nelle schede dei clienti.</span>` : "");
  return `
    <section class="riquadro da-fare-riquadro" id="da-fare" aria-label="Da fare oggi">
      <h2 class="titolo-riquadro">${icona("calendario")} Da fare oggi <span class="conteggio">${entroOggi.length}</span></h2>
      ${entroOggi.length ? `<ul class="elenco-da-fare">${elenco.righe.map((x) => rigaDaFare(x, true)).join("")}</ul>`
        : '<p class="nota-piccola">Nessuna attività in scadenza oggi.</p>'}
      ${piede ? `<p class="piede-riquadro">${piede}</p>` : ""}
    </section>`;
}

// Trattative aperte da seguire: da ricontattare con la data scaduta, senza prossima azione o ferme da troppo tempo
// I ricontatti scaduti vanno in cima
function trattativeDaSeguire() {
  return stato.opportunita.filter(trattativaAperta).map((o) => ({ o, s: statoTrattativa(o), r: ricontattoScaduto(o) }))
    .filter(({ s, r }) => r || !s.prossima || s.ferma)
    .sort((a, b) => b.r - a.r || b.s.giorniInFase - a.s.giorniInFase);
}

// Riquadro "Da seguire" accanto a "Da fare oggi"
function sezioneDaSeguire() {
  const tutte = trattativeDaSeguire();
  const elenco = elencoLimitato("da-seguire", tutte);
  return `
    <section class="riquadro da-fare-riquadro" id="da-seguire" tabindex="-1" aria-label="Da seguire">
      <h2 class="titolo-riquadro">${icona("attenzione")} Da seguire <span class="conteggio">${tutte.length}</span></h2>
      ${tutte.length ? `<ul class="elenco-da-fare">${elenco.righe.map(({ o, s }) => `
        <li class="da-fare">
          <div class="da-fare-testo">
            <p><a class="link" href="#cliente-${esc(o.aziendaId)}">${esc(nomeCliente(o))}</a>
              <span class="nota-piccola">· ${CONFIG.fasi[faseRaggiunta(o)].nome}${s.ferma ? "" : " da " + giorni(s.giorniInFase)} · ${formattaEuro(valoreAnnuo(o))}/anno</span></p>
            <p class="nota-piccola">
              ${o.ricontatto && o.ricontatto.data <= oggi() ? `<span class="chip chip-critico">Ricontattare: scaduto il ${formattaData(o.ricontatto.data)}</span>` : ""}
              ${s.ferma ? `<span class="chip chip-critico">Ferma da ${giorni(s.giorniInFase)}</span>` : ""}
              ${s.prossima ? `${scadenza(s.prossima.data)} <span>Prossima: ${esc(s.prossima.testo)}</span>`
                : '<span class="chip chip-attenzione">Nessuna prossima azione</span>'}
            </p>
          </div>
          <div class="da-fare-azioni">
            <button class="pulsante secondario piccolo" type="button" data-azione="prossima-azione" data-id="${esc(o.aziendaId)}">${icona("calendario")}
              <span class="testo-lungo">Fissa la prossima azione</span><span class="testo-corto">Fissala</span></button>
          </div>
        </li>`).join("")}</ul>`
        : '<p class="nota-piccola">Ogni trattativa aperta ha una prossima azione e nessuna è ferma.</p>'}
      ${elenco.pulsante ? `<p class="piede-riquadro">${elenco.pulsante}</p>` : ""}
    </section>`;
}

// Serve una prossima azione: l'azienda ha trattative aperte e nessuna attività da fare
function serveProssimaAzione(aziendaId) {
  return opportunitaDi(aziendaId).some(trattativaAperta) && !stato.attivita.some((x) => x.daFare && x.aziendaId === aziendaId);
}

// Finestra "Qual è la prossima azione?": tipo e testo proposti dalla fase più avanzata tra le trattative aperte
function apriProssimaAzione(aziendaId) {
  const a = trovaAzienda(aziendaId);
  if (!a) return;
  const o = opportunitaDi(aziendaId).filter(trattativaAperta).sort((x, y) => faseRaggiunta(y) - faseRaggiunta(x))[0];
  const fase = CONFIG.fasi[o ? faseRaggiunta(o) : 0];
  const f = fase.followUp;
  apriFinestra(`
    <form class="modulo" id="modulo-prossima" data-azienda="${esc(a.id)}" data-id="${o ? esc(o.id) : ""}" novalidate>
      <div>
        <h2>Qual è la prossima azione?</h2>
        <p class="nota-piccola">${esc(a.ragioneSociale)}${o ? " · trattativa in «" + fase.nome + "»" : ""}. Ogni trattativa aperta ha sempre un passo fissato in agenda.</p>
      </div>
      <label>Tipo <select name="tipo">${opzioni(CONFIG.tipiAttivita, f.tipo)}</select></label>
      <label>Cosa fare <input name="testo" required autocomplete="off" value="${esc(f.testo)}"></label>
      <label>Data <input name="data" type="date" required min="${oggi()}" value="${traGiorni(f.giorni)}"></label>
      ${pulsantiRapidi([[1, "Domani"], [2, "Tra 2 giorni"], [7, "Tra una settimana"], [14, "Tra due settimane"]])}
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Nessuna</button>
        <button class="pulsante primario" type="submit">Fissa la prossima azione</button>
      </div>
    </form>`);
}

// ========================================================= CONTATTO CON UN CLIC

// Pulsanti Chiama / WhatsApp / Email per un referente (compatti = solo il canale preferito).
// Senza privacy verificata, o se non vuole proposte, restano cliccabili ma con il bordo ambra e l'avviso
function pulsantiContatto(r, compatti) {
  const numero = numeroInternazionale(r.telefono);
  const avviso = avvisoPrivacy(r);
  const pulsante = (href, testo, etichetta, nomeIcona, extra = "") => {
    const titolo = esc(etichetta + (avviso ? " · " + avviso : ""));
    return `<a class="pulsante-contatto${avviso ? " attenzione" : ""}" href="${href}"${extra} title="${titolo}" aria-label="${titolo}">${icona(nomeIcona)}<span>${testo}</span>` +
      (avviso ? `<span class="segnale-privacy">${icona("attenzione")}</span>` : "") + "</a>";
  };
  const canali = [];
  if (numero) {
    canali.push({ nome: "Telefono", html: pulsante(`tel:+${numero}`, "Chiama", "Chiama " + r.nome, "telefono") });
    canali.push({ nome: "WhatsApp", html: pulsante(`https://wa.me/${numero}`, "WhatsApp", "WhatsApp a " + r.nome, "messaggio", ' target="_blank" rel="noopener"') });
  }
  if (r.email) {
    canali.push({ nome: "Email", html: pulsante(`mailto:${esc(r.email)}`, "Email", "Email a " + r.nome, "email") });
  }
  if (compatti) {
    const preferito = canali.find((c) => c.nome === r.canale) || canali[0];
    return preferito ? preferito.html : "";
  }
  return canali.map((c) => c.html).join("");
}

// ============================================================== ELENCO CLIENTI

const STATI_AZIENDA = ["Cliente", "In trattativa", "Da qualificare", "Perso"];

// Ricerca e filtri ripresi da interfaccia.filtri (app.js): restano tornando dalla scheda di un cliente
function disegnaClienti() {
  const conteggi = { "Cliente": 0, "In trattativa": 0, "Da qualificare": 0, "Perso": 0 };
  stato.aziende.forEach((a) => conteggi[statoAzienda(a.id)]++);
  const f = interfaccia.filtri;
  return `
    <div class="pagina-clienti">
    ${intestazione({
      titolo: "Aziende e referenti",
      istruzione: "Cerca un'azienda e apri la sua scheda per chiamare i referenti, registrare un contatto e fissare la prossima azione.",
      azione: `<div class="azioni-intestazione">
        <button class="pulsante-testo positivo esporta" type="button" data-azione="esporta-csv">Esporta per Excel</button>
        <button class="pulsante-testo positivo esporta" type="button" data-azione="canali">Sito e social</button>
        <button class="pulsante accento" type="button" data-azione="nuovo">${icona("piu")} Nuovo contatto</button></div>`,
    })}

    <section class="riepilogo riepilogo-clienti" aria-label="Filtra per stato">
      ${STATI_AZIENDA.map((nome) => `
        <button class="filtro" type="button" data-azione="filtro-stato" data-id="${nome}" aria-pressed="${f.stato === nome}">
          <span>${nome}</span><strong>${conteggi[nome]}</strong></button>`).join("")}
    </section>

    <div class="filtri" id="filtri-clienti" role="search">
      <label class="campo-cerca">${icona("cerca")}
        <input type="search" id="cerca-clienti" placeholder="Azienda, referente, telefono o codice" aria-label="Cerca" value="${esc(f.testo)}">
      </label>
      <select id="filtro-settore" aria-label="Filtra per settore"><option value="">Tutti i settori</option>${opzioni(CONFIG.settori, f.settore)}</select>
      <select id="filtro-stato" aria-label="Filtra per stato"><option value="">Tutti gli stati</option>${opzioni(STATI_AZIENDA, f.stato)}</select>
    </div>

    <p class="risultati-clienti" id="risultati-clienti" aria-live="polite"></p>
    <div id="elenco-clienti" class="griglia tre">${schedeClienti(aziendeFiltrate())}</div>
    </div>`;
}

// Legge ricerca e filtri dalla pagina e li ricorda nell'interfaccia
function leggiFiltriClienti() {
  interfaccia.filtri = {
    testo: document.getElementById("cerca-clienti").value,
    settore: document.getElementById("filtro-settore").value,
    stato: document.getElementById("filtro-stato").value,
  };
}

// Solo le cifre di un testo: "+39 000 000 1091" -> "390000001091"
function soloCifre(testo) {
  return String(testo || "").replace(/\D/g, "");
}

// Aziende che corrispondono a ricerca e filtri. La ricerca guarda nome, comune, P.IVA, referenti (nome, ruolo, email),
// telefoni e codici delle opportunità; con almeno 3 cifre confronta solo le cifre (es. "1091" trova il telefono)
function aziendeFiltrate() {
  const { testo, settore, stato: statoScelto } = interfaccia.filtri;
  const cerca = testo.trim().toLowerCase();
  const cifre = soloCifre(cerca);
  return stato.aziende.filter((a) => {
    if (settore && a.settore !== settore) return false;
    if (statoScelto && statoAzienda(a.id) !== statoScelto) return false;
    if (!cerca) return true;
    const refs = referentiDi(a.id);
    const codici = opportunitaDi(a.id).map((o) => o.codice);
    const testi = [a.ragioneSociale, a.comune, a.piva, ...codici, ...refs.map((r) => r.nome + " " + r.ruolo + " " + r.email)].join(" ").toLowerCase();
    if (testi.includes(cerca)) return true;
    return cifre.length >= 3 && [a.piva, ...codici, ...refs.map((r) => r.telefono)].some((v) => soloCifre(v).includes(cifre));
  });
}

// Ridisegna solo l'elenco (e i pulsanti-filtro), così il campo di ricerca non perde il cursore
function aggiornaElencoClienti() {
  const elenco = document.getElementById("elenco-clienti");
  if (!elenco) return; // nel frattempo si è cambiata schermata
  const filtrate = aziendeFiltrate();
  elenco.innerHTML = schedeClienti(filtrate);
  document.querySelectorAll("[data-azione=filtro-stato]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.id === interfaccia.filtri.stato));
  document.getElementById("filtro-stato").value = interfaccia.filtri.stato;
  // Il lettore di schermo annuncia quante aziende sono rimaste
  const filtriAttivi = Object.values(interfaccia.filtri).some((v) => v.trim());
  document.getElementById("risultati-clienti").textContent = filtriAttivi ? quanti(filtrate.length, "azienda trovata", "aziende trovate") : "";
}

const CLASSI_STATO = { "Cliente": "chip-ok", "In trattativa": "chip-info", "Da qualificare": "chip-attenzione", "Perso": "" };

function chipStato(aziendaId) {
  const s = statoAzienda(aziendaId);
  return `<span class="chip ${CLASSI_STATO[s]}">${s}</span>`;
}

// Schede dell'elenco: prima le aziende con un'attività scaduta o di oggi, poi quelle con una prossima azione
// (per data), poi le altre in ordine alfabetico. Le prossime azioni si calcolano una volta sola
function schedeClienti(aziende) {
  if (!aziende.length) {
    return `<div class="vuoto">Nessuna azienda trovata.
      <button class="pulsante secondario piccolo" type="button" data-azione="cancella-filtri">Cancella i filtri</button></div>`;
  }
  const prossime = new Map();
  attivitaDaFare().forEach((x) => { if (!prossime.has(x.aziendaId)) prossime.set(x.aziendaId, x); });
  // 0 = scaduta o di oggi, 1 = prossima azione futura, 2 = nessuna
  const gruppo = (a) => (!prossime.has(a.id) ? 2 : prossime.get(a.id).data <= oggi() ? 0 : 1);
  const ordinate = [...aziende].sort((x, y) => gruppo(x) - gruppo(y)
    || (gruppo(x) < 2 ? prossime.get(x.id).data.localeCompare(prossime.get(y.id).data) : 0)
    || x.ragioneSociale.localeCompare(y.ragioneSociale));
  return ordinate.map((a) => {
    const refs = referentiDi(a.id);
    const principale = refs.find((r) => r.decisore && !r.cancellato) || refs.find((r) => !r.cancellato);
    const prossima = prossime.get(a.id);
    const aperte = opportunitaDi(a.id).filter((o) => !o.perso);
    return `
      <article class="riquadro cliente">
        <div class="scheda-alto">
          <a class="link-titolo" href="#cliente-${esc(a.id)}">${esc(a.ragioneSociale)}</a>
          ${chipStato(a.id)}
        </div>
        <p class="partner-dati">${esc(a.settore)} · ${esc(a.comune)} · fonte: ${esc(a.fonte)}</p>
        ${principale ? `
          <div class="cliente-referente">
            <p><strong>${esc(principale.nome)}</strong>${principale.ruolo ? " · " + esc(principale.ruolo) : ""}${principale.decisore ? ' <span class="chip chip-ok">decisore</span>' : ""}</p>
            ${principale.telefono ? `<p class="cliente-telefono">${icona("telefono")} ${esc(telefonoLeggibile(principale.telefono))}</p>` : ""}
            <div class="contatti contatti-tutti">${pulsantiContatto(principale)}</div>
            <div class="contatti contatti-compatti">${pulsantiContatto(principale, true)}</div>
          </div>` : '<p class="nota-piccola">Nessun referente registrato.</p>'}
        <p class="nota-piccola">${aperte.length} opportunità ${aperte.length === 1 ? "attiva" : "attive"}${aperte.length ? " · " + formattaEuro(aperte.reduce((s, o) => s + valoreAnnuo(o), 0)) + "/anno" : ""}</p>
        ${prossima ? `<p class="cliente-prossima">${scadenza(prossima.data)} ${esc(prossima.testo)}</p>` : ""}
      </article>`;
  }).join("");
}

// ============================================================== SCHEDA CLIENTE

function disegnaSchedaCliente(id) {
  const a = trovaAzienda(id);
  const refs = referentiDi(id);
  const opp = opportunitaDi(id);
  const daFare = attivitaDaFare().filter((x) => x.aziendaId === id);
  const cronologia = attivitaDi(id).filter((x) => !x.daFare).sort((x, y) => y.data.localeCompare(x.data) || y.id.localeCompare(x.id, "it", { numeric: true }));
  // Ritorno: alla Pipeline o all'Allocazione se si arriva da lì, altrimenti all'elenco (con i filtri di prima)
  const ritorno = { pipeline: "Pipeline", allocazione: "Allocazione" }[interfaccia.provenienza];

  return `
    ${ritorno ? `<a class="link-indietro" href="#${interfaccia.provenienza}">${icona("indietro")} ${ritorno}</a>`
      : `<a class="link-indietro" href="#clienti">${icona("indietro")} Tutti i clienti</a>`}
    ${intestazione({
      occhiello: esc(a.settore),
      titolo: esc(a.ragioneSociale),
      istruzione: "Registra ogni contatto con il cliente e fissa sempre la prossima azione: così nessuna trattativa resta ferma.",
      azione: `<div class="azioni-intestazione">
        <button class="pulsante secondario" type="button" data-azione="modifica-azienda" data-id="${esc(a.id)}">${icona("matita")} Modifica dati</button>
        <button class="pulsante accento" type="button" data-azione="nuova-opportunita" data-id="${esc(a.id)}">${icona("piu")}
          ${statoAzienda(a.id) === "Da qualificare" ? "Qualifica: crea l'opportunità" : "Nuova opportunità"}</button></div>`,
    })}
    <p class="riga-chip">${chipStato(a.id)} <span class="chip">Fonte: ${esc(a.fonte)}</span> <span class="chip">${esc(a.comune)}</span>
      ${a.piva ? `<span class="chip">P.IVA ${esc(a.piva)}</span>` : ""} <span class="chip">In archivio dal ${formattaData(a.creata)}</span></p>
    ${a.note ? `<p class="nota-piccola">${esc(a.note)}</p>` : ""}

    <div class="scheda-cliente">
      <div class="colonna-scheda">
        <section class="sezione">
          <h2>Referenti <span class="conteggio">${refs.length}</span></h2>
          <div class="griglia-referenti">
            ${refs.map((r) => r.cancellato ? `
              <article class="riquadro referente">
                <h3>${esc(r.nome)}</h3>
                <p class="riga-chip">${r.decisore ? '<span class="chip chip-ok">Decisore</span>' : ""}<span class="chip">Dati personali cancellati su richiesta</span></p>
              </article>` : `
              <article class="riquadro referente">
                <div class="scheda-alto">
                  <h3>${esc(r.nome)}</h3>
                  <button class="pulsante-icona" type="button" data-azione="modifica-referente" data-id="${esc(r.id)}" aria-label="Modifica ${esc(r.nome)}" title="Modifica">${icona("matita")}</button>
                </div>
                <p class="partner-dati">${esc(r.ruolo) || "Ruolo non indicato"}</p>
                <p class="riga-chip">
                  ${r.decisore ? '<span class="chip chip-ok">Decisore</span>' : ""}
                  ${chipPrivacy(r)}
                  ${r.canale ? `<span class="chip">Preferisce: ${esc(r.canale)}</span>` : ""}
                </p>
                <p class="partner-dati">${r.telefono ? esc(telefonoLeggibile(r.telefono)) : "Telefono non indicato"}<br>${r.email ? esc(r.email) : "Email non indicata"}</p>
                <div class="contatti">${pulsantiContatto(r)}</div>
              </article>`).join("")}
            <button class="riquadro aggiungi" type="button" data-azione="nuovo-referente" data-id="${esc(a.id)}">${icona("piu")} Aggiungi referente</button>
          </div>
        </section>

        <section class="sezione">
          <h2>Opportunità <span class="conteggio">${opp.length}</span></h2>
          ${opp.length ? `
            <div class="tabella-scorrevole">
              <table class="tabella impilata">
                <thead><tr><th>Rif.</th><th>Servizio</th><th>Sede</th><th>Fase</th><th>Punteggio</th><th class="num">Valore annuo</th></tr></thead>
                <tbody>
                  ${opp.map((o) => `<tr>
                    <td data-etichetta="Rif."><button class="link pulsante-link codice" type="button" data-azione="dettaglio" data-id="${esc(o.id)}">${esc(o.codice)}</button></td>
                    <td data-etichetta="Servizio"><span>${esc(o.servizio)}<br><span class="nota-piccola">${Number(o.ore)} h/mese</span></span></td>
                    <td data-etichetta="Sede">${esc(o.comune)}</td>
                    <td data-etichetta="Fase">${faseAttuale(o) === "perso" ? "Perso" : CONFIG.fasi[faseRaggiunta(o)].nome}</td>
                    <td data-etichetta="Punteggio">${badgePunteggio(calcolaPunteggio(o, stato.opportunita))}</td>
                    <td class="num" data-etichetta="Valore annuo">${formattaEuro(valoreAnnuo(o))}</td>
                  </tr>`).join("")}
                </tbody>
              </table>
            </div>` : '<p class="vuoto">Nessuna opportunità. Usa "Nuova opportunità" quando il cliente chiede un servizio.</p>'}
        </section>
      </div>

      <div class="colonna-scheda">
        <section class="sezione">
          <h2>Da fare <span class="conteggio">${daFare.length}</span></h2>
          ${daFare.length ? `<ul class="elenco-da-fare">${daFare.map((x) => rigaDaFare(x, false)).join("")}</ul>`
            : '<p class="vuoto">Nessuna prossima azione: fissane una qui sotto.</p>'}
        </section>

        <section class="sezione">
          <h2 id="titolo-attivita">Registra un'attività</h2>
          ${moduloAttivita(a, refs)}
        </section>

        <section class="sezione">
          <h2>Cronologia <span class="conteggio">${cronologia.length}</span></h2>
          ${cronologia.length ? `<ol class="cronologia">
            ${cronologia.map((x) => {
              const ref = trovaReferente(x.referenteId);
              return `<li class="${x.tipo === "Pipeline" ? "automatica" : ""}">
                <p class="cronologia-testa"><span class="chip">${esc(x.tipo === "Pipeline" ? "Aggiornamento" : x.tipo)}</span> ${formattaData(x.data)}${ref ? " · " + esc(ref.nome) : ""}</p>
                <p>${esc(x.testo)}</p>
              </li>`;
            }).join("")}
          </ol>` : '<p class="vuoto">Ancora nessuna attività registrata.</p>'}
        </section>
      </div>
    </div>`;
}

// Modulo «Registra un'attività»: «È già successo» oppure «Da fare» (prossima azione).
// I valori vengono dalla bozza (interfaccia.bozze), così il testo non si perde quando la pagina si ridisegna
function moduloAttivita(a, refs) {
  const attivi = refs.filter((r) => !r.cancellato);
  // Referente proposto: l'unico, se ce n'è uno solo, altrimenti il decisore
  const proposto = attivi.length === 1 ? attivi[0] : attivi.find((r) => r.decisore);
  const b = interfaccia.bozze[a.id] || { tipo: "Chiamata", referente: proposto ? proposto.id : "", testo: "", quando: "fatto", data: oggi() };
  const daFare = b.quando === "daFare";
  return `
    <form class="modulo riquadro" id="modulo-attivita" data-id="${esc(a.id)}" aria-labelledby="titolo-attivita">
      <fieldset class="scelta-doppia">
        <legend class="solo-lettori">Che cosa registri</legend>
        <label><input type="radio" name="quando" value="fatto" ${daFare ? "" : "checked"}> È già successo</label>
        <label><input type="radio" name="quando" value="daFare" ${daFare ? "checked" : ""}> Da fare</label>
      </fieldset>
      <div class="riga-doppia">
        <label>Tipo <select name="tipo">${opzioni(CONFIG.tipiAttivita, b.tipo)}</select></label>
        <label>Referente
          <select name="referente"><option value="">Nessuno in particolare</option>${attivi.map((r) => `<option value="${esc(r.id)}" ${r.id === b.referente ? "selected" : ""}>${esc(r.nome)}</option>`).join("")}</select>
        </label>
      </div>
      <label>${daFare ? "Cosa fare" : "Cosa è successo"}
        <textarea name="testo" required placeholder="${daFare ? "Es. Richiamare per fissare il sopralluogo" : "Es. Telefonata: chiede un preventivo per la pulizia settimanale"}">${esc(b.testo)}</textarea>
      </label>
      <label>Data <input name="data" type="date" value="${esc(b.data)}" required ${daFare ? `min="${oggi()}"` : `max="${oggi()}"`}></label>
      <div class="azioni-finestra"><button class="pulsante primario" type="submit">${daFare ? "Fissa la prossima azione" : "Registra"}</button></div>
    </form>`;
}

// Ricorda i campi del modulo attività finché non si registra (bozza per azienda)
function salvaBozzaAttivita(modulo) {
  interfaccia.bozze[modulo.dataset.id] = {
    tipo: modulo.tipo.value,
    referente: modulo.referente.value,
    testo: modulo.testo.value,
    quando: modulo.quando.value,
    data: modulo.data.value,
  };
}

// «È già successo» / «Da fare»: cambia la data (oggi o domani), le etichette e il pulsante
function cambiaQuandoAttivita(modulo, campo) {
  if (campo.name !== "quando") return salvaBozzaAttivita(modulo);
  const daFare = campo.value === "daFare";
  modulo.data.value = daFare ? traGiorni(1) : oggi();
  modulo.data.min = daFare ? oggi() : "";
  modulo.data.max = daFare ? "" : oggi();
  modulo.testo.closest("label").firstChild.textContent = daFare ? "Cosa fare\n" : "Cosa è successo\n";
  modulo.testo.placeholder = daFare ? "Es. Richiamare per fissare il sopralluogo" : "Es. Telefonata: chiede un preventivo per la pulizia settimanale";
  modulo.querySelector("[type=submit]").textContent = daFare ? "Fissa la prossima azione" : "Registra";
  salvaBozzaAttivita(modulo);
}

// Chip della privacy del referente: in regola (con la data), da verificare, oppure da non contattare
function chipPrivacy(r) {
  const p = r.privacy;
  if (p.opposizione) return `<span class="chip chip-critico">${icona("x")} Non contattare per proposte</span>`;
  if (p.base === CONFIG.basiGiuridiche[0]) return `<span class="chip chip-attenzione">${icona("attenzione")} Privacy da verificare</span>`;
  return `<span class="chip chip-ok">${icona("spunta")} Privacy: ${esc(p.base)}${p.data ? " del " + formattaData(p.data) : ""}</span>`;
}

// ========================================================= FINESTRE E MODULI

function apriModificaAzienda(id) {
  const a = trovaAzienda(id);
  apriFinestra(`
    <form class="modulo" id="modulo-azienda" data-id="${esc(a.id)}" novalidate>
      <h2>Dati dell'azienda</h2>
      <label>Ragione sociale <input name="ragioneSociale" required value="${esc(a.ragioneSociale)}"></label>
      <div class="riga-doppia">
        <label>Partita IVA (facoltativa) <input name="piva" inputmode="numeric" value="${esc(a.piva)}" placeholder="11 cifre"></label>
        <label>Settore <select name="settore">${opzioni(CONFIG.settori, a.settore)}</select></label>
      </div>
      <div class="riga-doppia">
        <label>Sede (comune) <select name="comune">${opzioniComuni(a.comune)}</select></label>
        <label>Fonte del contatto <select name="fonte">${opzioni(fonti(), a.fonte)}</select></label>
      </div>
      <label>Note <textarea name="note" placeholder="Es. orari di accesso, esigenze particolari">${esc(a.note)}</textarea></label>
      <div class="azioni-finestra">
        <button class="pulsante no a-sinistra" type="button" data-azione="chiedi-elimina-azienda" data-id="${esc(a.id)}">Elimina azienda</button>
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Salva</button>
      </div>
    </form>`);
  ricordaValori(document.getElementById("modulo-azienda"));
}

function apriReferente(aziendaId, referenteId) {
  const r = trovaReferente(referenteId) || { nome: "", ruolo: "", telefono: "", email: "", canale: "Telefono", decisore: false, privacy: privacyVuota() };
  const p = r.privacy;
  apriFinestra(`
    <form class="modulo" id="modulo-referente" data-azienda="${esc(aziendaId)}" data-id="${esc(referenteId)}" novalidate>
      <h2>${referenteId ? "Modifica referente" : "Nuovo referente"}</h2>
      <div class="riga-doppia">
        <label>Nome e cognome <input name="nome" required value="${esc(r.nome)}"></label>
        <label>Ruolo <input name="ruolo" value="${esc(r.ruolo)}" placeholder="Es. Responsabile amministrativo"></label>
      </div>
      <div class="riga-doppia">
        <label>Telefono <input name="telefono" type="tel" inputmode="tel" value="${esc(r.telefono ? telefonoLeggibile(r.telefono) : "")}"></label>
        <label>Email <input name="email" type="email" inputmode="email" value="${esc(r.email)}"></label>
      </div>
      <label>Canale preferito <select name="canale">${opzioni(CONFIG.canaliPreferiti, r.canale)}</select></label>
      <label class="spunta"><input name="decisore" type="checkbox" ${r.decisore ? "checked" : ""}> È il decisore</label>
      <fieldset class="gruppo">
        <legend>Privacy</legend>
        <div class="riga-doppia">
          <label>Base giuridica <select name="base">${opzioni(CONFIG.basiGiuridiche, p.base)}</select></label>
          <label>Data <input name="dataPrivacy" type="date" max="${oggi()}" value="${esc(p.data || "")}"></label>
        </div>
        <label>Come è stato raccolto
          <select name="raccolta"><option value="">— Non indicato —</option>${opzioni(CONFIG.modiRaccolta, p.raccolta)}</select>
        </label>
        <label class="spunta"><input name="opposizione" type="checkbox" ${p.opposizione ? "checked" : ""}> Non vuole ricevere proposte commerciali</label>
        <p class="nota-piccola">La base giuridica corretta va confermata con il consulente privacy di Gate.</p>
      </fieldset>
      <div class="azioni-finestra">
        ${referenteId ? `<button class="pulsante no a-sinistra" type="button" data-azione="chiedi-cancella-dati" data-id="${esc(referenteId)}">Cancella i dati personali</button>` : ""}
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Salva</button>
      </div>
    </form>`);
  ricordaValori(document.getElementById("modulo-referente"));
}

// Conferma prima di cancellare i dati personali di un referente (diritto alla cancellazione)
function apriCancellaDati(referenteId) {
  const r = trovaReferente(referenteId);
  if (!r) return;
  apriFinestra(`
    <h2>Cancellare i dati personali di ${esc(r.nome)}?</h2>
    <p>Nome, telefono ed email saranno cancellati. Se il referente è collegato a un'opportunità, resta come «Referente cancellato».
      Ricorda di cancellare anche i backup salvati prima di oggi.</p>
    <div class="azioni-finestra">
      <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
      <button class="pulsante no" type="button" data-azione="cancella-dati" data-id="${esc(r.id)}">Cancella i dati personali</button>
    </div>`);
}

// Cancella i dati personali: il referente sparisce, oppure resta anonimo se un'opportunità lo usa.
// Il nome sparisce anche dai testi della cronologia, dalle note dell'azienda e da quelle delle trattative
function cancellaDatiPersonali(referenteId) {
  const r = trovaReferente(referenteId);
  if (!r) return chiudiFinestra();
  const collegato = stato.opportunita.some((o) => o.referenteId === r.id);
  // Il nome si toglie anche dai testi, purché non sia così corto da cambiare altre parole
  const nome = r.nome.trim().length >= 3 ? r.nome.trim() : "";
  applica(() => {
    if (collegato) {
      // Il ruolo di decisore resta, così il punteggio delle trattative non cambia
      Object.assign(r, { nome: "Referente cancellato", ruolo: "", telefono: "", email: "", canale: "", privacy: privacyVuota(), cancellato: true });
    } else {
      stato.referenti = stato.referenti.filter((x) => x.id !== r.id);
    }
    // Il nome sparisce da ogni testo libero: cronologia, note dell'azienda, note e motivazioni delle trattative
    const togliNome = (testo) => (nome && testo ? testo.split(nome).join("[referente cancellato]") : testo);
    stato.attivita.forEach((x) => {
      if (x.referenteId === r.id) x.referenteId = null;
      x.testo = togliNome(x.testo);
    });
    stato.aziende.forEach((a) => { a.note = togliNome(a.note); });
    stato.opportunita.forEach((o) => {
      o.note = togliNome(o.note);
      o.motivazioneC = togliNome(o.motivazioneC);
      if (o.perso) o.perso.nota = togliNome(o.perso.nota);
    });
    registraAttivita({ aziendaId: r.aziendaId, tipo: "Pipeline", testo: "Dati personali di un referente cancellati su richiesta il " + formattaData(oggi()) });
  }, { messaggio: "Dati personali cancellati" });
}

// "1 referente", "2 referenti"
function quanti(n, singolare, plurale) {
  return n + " " + (n === 1 ? singolare : plurale);
}

// Conferma prima di eliminare un'azienda, con il riepilogo di cosa sparisce. Un cliente con contratto non si elimina
function apriEliminaAzienda(aziendaId) {
  const a = trovaAzienda(aziendaId);
  if (!a) return;
  const opp = opportunitaDi(a.id);
  if (opp.some((o) => o.storico.contratto)) {
    apriFinestra(`
      <h2>${esc(a.ragioneSociale)} non si può eliminare</h2>
      <p>Questa azienda ha un contratto: puoi cancellare i dati personali dei referenti, non l'azienda.</p>
      <div class="azioni-finestra">
        <button class="pulsante primario" type="button" data-azione="chiudi">Ho capito</button>
      </div>`);
    return;
  }
  apriFinestra(`
    <h2>Eliminare ${esc(a.ragioneSociale)}?</h2>
    <p>Saranno cancellati ${quanti(referentiDi(a.id).length, "referente", "referenti")}, ${quanti(opp.length, "opportunità", "opportunità")}
      e ${quanti(attivitaDi(a.id).length, "attività", "attività")}; gli indicatori non conteranno più questa azienda.</p>
    <p class="nota-piccola">Ricorda di cancellare anche i backup salvati prima di oggi, se l'azienda ha chiesto la cancellazione.</p>
    <div class="azioni-finestra">
      <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
      <button class="pulsante no" type="button" data-azione="elimina-azienda" data-id="${esc(a.id)}">Elimina l'azienda</button>
    </div>`);
}

// Elimina l'azienda con referenti, opportunità e attività; si torna all'elenco Clienti (con «Annulla»)
function eliminaAzienda(aziendaId) {
  const a = trovaAzienda(aziendaId);
  if (!a || opportunitaDi(a.id).some((o) => o.storico.contratto)) return chiudiFinestra();
  applica(() => {
    stato.aziende = stato.aziende.filter((x) => x.id !== a.id);
    stato.referenti = stato.referenti.filter((x) => x.aziendaId !== a.id);
    stato.opportunita = stato.opportunita.filter((x) => x.aziendaId !== a.id);
    stato.attivita = stato.attivita.filter((x) => x.aziendaId !== a.id);
  }, { messaggio: "Azienda eliminata: " + a.ragioneSociale, vai: "clienti" });
}

// Backup scelto dall'utente: si controlla e si chiede conferma prima di sostituire i dati
let backupInAttesa = null;
function importaBackup(file) {
  const lettore = new FileReader();
  lettore.onload = () => {
    let dati = null;
    try {
      dati = migra(JSON.parse(lettore.result));
    } catch (e) {
      dati = null;
    }
    if (!strutturaValida(dati)) {
      mostraAvviso("Il file scelto non è un backup valido di questo prototipo");
      return;
    }
    backupInAttesa = dati;
    apriFinestra(`
      <h2>Importare il backup?</h2>
      <p>Il backup contiene ${dati.aziende.length} aziende, ${dati.opportunita.length} opportunità e ${dati.attivita.length} attività.
        I dati attuali in questo browser saranno sostituiti.</p>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="button" data-azione="conferma-importa">Importa</button>
      </div>`);
  };
  lettore.readAsText(file);
}

// Azioni dei pulsanti (unite a quelle di app.js)
const AZIONI_CLIENTI = {
  "nuova-opportunita": (el) => apriNuovoContatto(el.dataset.id),
  "modifica-azienda": (el) => apriModificaAzienda(el.dataset.id),
  "nuovo-referente": (el) => apriReferente(el.dataset.id, null),
  "modifica-referente": (el) => apriReferente(trovaReferente(el.dataset.id).aziendaId, el.dataset.id),
  "chiedi-cancella-dati": (el) => apriCancellaDati(el.dataset.id),
  "cancella-dati": (el) => cancellaDatiPersonali(el.dataset.id),
  "chiedi-elimina-azienda": (el) => apriEliminaAzienda(el.dataset.id),
  "elimina-azienda": (el) => eliminaAzienda(el.dataset.id),
  fatto: (el) => {
    const x = stato.attivita.find((y) => y.id === el.dataset.id);
    if (!x || !x.daFare) return;
    const fatta = applica(() => {
      x.daFare = false;
      x.data = oggi();
    }, { messaggio: "Attività segnata come fatta: " + x.testo });
    // Nessuna trattativa resta senza un passo in agenda
    if (fatta && serveProssimaAzione(x.aziendaId)) apriProssimaAzione(x.aziendaId);
  },
  // Sopralluogo fissato: «Sopralluogo fatto» apre la finestra della fase con la data in agenda
  "fatto-fase": (el) => {
    const x = stato.attivita.find((y) => y.id === el.dataset.id);
    const fase = x && x.daFare ? faseDaRegistrare(x) : null;
    if (fase) apriFase(trova(x.opportunitaId), fase, { data: x.data, attivitaId: x.id });
  },
  "prossima-azione": (el) => apriProssimaAzione(el.dataset.id),
  // Riquadri del riepilogo Clienti: il primo clic filtra per quello stato, il secondo toglie il filtro
  "filtro-stato": (el) => {
    interfaccia.filtri.stato = interfaccia.filtri.stato === el.dataset.id ? "" : el.dataset.id;
    aggiornaElencoClienti();
  },
  "cancella-filtri": () => {
    interfaccia.filtri = { testo: "", settore: "", stato: "" };
    disegna();
    document.getElementById("cerca-clienti").focus();
  },
  "conferma-importa": () => applica(() => {
    if (!backupInAttesa) return false;
    stato = backupInAttesa;
    backupInAttesa = null;
  }, { messaggio: "Backup importato", fase: "contatto" }),
};

// Invio dei moduli (chiamati da app.js)
const GESTORI_MODULI = {
  "modulo-azienda": (modulo) => {
    const a = trovaAzienda(modulo.dataset.id);
    if (!a) return datoNonPiuPresente("Questa azienda è stata eliminata in un'altra scheda: modifiche non salvate");
    // Solo i campi cambiati in questo modulo: gli altri restano come sono salvati ora (anche da un'altra scheda)
    const cambiati = campiCambiati(modulo);
    const letti = { ragioneSociale: modulo.ragioneSociale.value.trim(), piva: modulo.piva.value.replace(/\s/g, ""),
      settore: modulo.settore.value, comune: modulo.comune.value, fonte: modulo.fonte.value, note: modulo.note.value.trim() };
    const dati = Object.fromEntries(Object.entries(letti).filter(([k]) => cambiati.has(k)));
    const nome = dati.ragioneSociale ?? a.ragioneSociale;
    const piva = dati.piva ?? (a.piva || "");
    if (!nome) return segnalaCampo(modulo.ragioneSociale, "Scrivi la ragione sociale");
    // Stesso nome (anche scritto diverso, es. con «Srl») o stessa partita IVA di un'altra azienda
    const errore = controllaAzienda({ ragioneSociale: nome, piva }, a.id);
    if (errore) return segnalaCampo(modulo[errore.campo], errore.testo);
    // Una riga di cronologia con i campi cambiati, es. "Dati aggiornati: comune Bari → Modugno"
    const etichette = { ragioneSociale: "ragione sociale", piva: "partita IVA", settore: "settore", comune: "comune", fonte: "fonte" };
    const cambi = Object.entries(etichette).filter(([k]) => k in dati && (a[k] || "") !== dati[k])
      .map(([k, nome]) => nome + " " + (a[k] || "—") + " → " + (dati[k] || "—"));
    if ("note" in dati && (a.note || "") !== dati.note) cambi.push("note aggiornate");
    if (!cambi.length) return chiudiFinestra(); // nulla da salvare
    applica(() => {
      Object.assign(a, dati);
      registraAttivita({ aziendaId: a.id, tipo: "Pipeline", testo: "Dati aggiornati: " + cambi.join("; ") });
    }, { messaggio: "Dati dell'azienda aggiornati" });
  },
  "modulo-referente": (modulo) => {
    const esistente = trovaReferente(modulo.dataset.id);
    // Referente o azienda cancellati in un'altra scheda: non si ricreano (dati personali cancellati restano cancellati)
    if (!trovaAzienda(modulo.dataset.azienda)) return datoNonPiuPresente("Questa azienda è stata eliminata in un'altra scheda: referente non salvato");
    if (modulo.dataset.id && !esistente) return datoNonPiuPresente("Questo referente è stato cancellato in un'altra scheda: modifiche non salvate");
    const nome = modulo.nome.value.trim();
    if (!nome) return segnalaCampo(modulo.nome, "Scrivi nome e cognome");
    if (modulo.email.value && !modulo.email.checkValidity()) return segnalaCampo(modulo.email, "Controlla l'indirizzo email");
    const dataPrivacy = modulo.dataPrivacy.value;
    if (dataPrivacy && (!formattaData(dataPrivacy) || dataPrivacy > oggi())) return segnalaCampo(modulo.dataPrivacy, "La data della privacy non può essere nel futuro");
    const letti = {
      nome,
      ruolo: modulo.ruolo.value.trim(),
      telefono: telefonoDaSalvare(modulo.telefono.value),
      email: modulo.email.value.trim(),
      canale: modulo.canale.value,
      decisore: modulo.decisore.checked,
      privacy: { base: modulo.base.value, data: dataPrivacy || null, raccolta: modulo.raccolta.value, opposizione: modulo.opposizione.checked },
    };
    // Per un referente esistente si prendono solo i campi cambiati in questo modulo; gli altri restano come sono salvati ora
    const cambiati = campiCambiati(modulo);
    const prendi = (campo, nuovo, attuale) => (!esistente || cambiati.has(campo) ? nuovo : attuale);
    const dati = !esistente ? letti : {
      nome: prendi("nome", letti.nome, esistente.nome),
      ruolo: prendi("ruolo", letti.ruolo, esistente.ruolo || ""),
      telefono: prendi("telefono", letti.telefono, esistente.telefono || ""),
      email: prendi("email", letti.email, esistente.email || ""),
      canale: prendi("canale", letti.canale, esistente.canale),
      decisore: prendi("decisore", letti.decisore, !!esistente.decisore),
      privacy: {
        base: prendi("base", letti.privacy.base, esistente.privacy.base),
        data: prendi("dataPrivacy", letti.privacy.data, esistente.privacy.data),
        raccolta: prendi("raccolta", letti.privacy.raccolta, esistente.privacy.raccolta),
        opposizione: prendi("opposizione", letti.privacy.opposizione, esistente.privacy.opposizione),
      },
    };
    // Cronologia: i campi cambiati; di telefono ed email solo che sono cambiati, senza i numeri
    const cambi = [];
    if (esistente) {
      const siNo = (v) => (v ? "sì" : "no");
      if (esistente.nome !== dati.nome) cambi.push("nome aggiornato");
      if ((esistente.ruolo || "") !== dati.ruolo) cambi.push("ruolo " + (esistente.ruolo || "—") + " → " + (dati.ruolo || "—"));
      if (numeroInternazionale(esistente.telefono) !== numeroInternazionale(dati.telefono)) cambi.push("telefono aggiornato");
      if ((esistente.email || "") !== dati.email) cambi.push("email aggiornata");
      if (esistente.canale !== dati.canale) cambi.push("canale preferito " + (esistente.canale || "—") + " → " + dati.canale);
      if (!!esistente.decisore !== dati.decisore) cambi.push("decisore " + siNo(esistente.decisore) + " → " + siNo(dati.decisore));
      const prima = esistente.privacy;
      if (prima.base !== dati.privacy.base) cambi.push("base giuridica " + prima.base + " → " + dati.privacy.base);
      if (prima.data !== dati.privacy.data) cambi.push("data privacy " + (formattaData(prima.data) || "—") + " → " + (formattaData(dati.privacy.data) || "—"));
      if (prima.raccolta !== dati.privacy.raccolta) cambi.push("raccolta " + (prima.raccolta || "—") + " → " + (dati.privacy.raccolta || "—"));
      if (prima.opposizione !== dati.privacy.opposizione) cambi.push("non vuole proposte " + siNo(prima.opposizione) + " → " + siNo(dati.privacy.opposizione));
      if (!cambi.length) return chiudiFinestra(); // nulla da salvare
    }
    applica(() => {
      if (esistente) {
        Object.assign(esistente, dati);
        registraAttivita({ aziendaId: esistente.aziendaId, tipo: "Pipeline", testo: "Dati aggiornati: referente " + dati.nome + ": " + cambi.join("; ") });
      } else {
        stato.referenti.push({ id: nuovoId("rf"), aziendaId: modulo.dataset.azienda, ...dati });
      }
    }, { messaggio: esistente ? "Referente aggiornato" : "Referente aggiunto: " + nome });
  },
  "modulo-attivita": (modulo) => {
    if (!trovaAzienda(modulo.dataset.id)) return datoNonPiuPresente("Questa azienda è stata eliminata in un'altra scheda: attività non registrata");
    const daFare = modulo.quando.value === "daFare";
    const testo = modulo.testo.value.trim();
    const data = modulo.data.value;
    if (!testo) return segnalaCampo(modulo.testo, daFare ? "Scrivi cosa fare" : "Scrivi cosa è successo");
    if (!formattaData(data)) return segnalaCampo(modulo.data, "Scegli una data");
    if (daFare && data < oggi()) return segnalaCampo(modulo.data, "La prossima azione va fissata da oggi in poi");
    if (!daFare && data > oggi()) return segnalaCampo(modulo.data, "Un'attività già successa non può avere una data futura");
    const dati = { aziendaId: modulo.dataset.id, referenteId: modulo.referente.value || null, tipo: modulo.tipo.value, data, testo, daFare };
    applica(() => {
      delete interfaccia.bozze[dati.aziendaId]; // dopo «Registra» la bozza si svuota
      registraAttivita(dati);
    }, { messaggio: daFare ? "Prossima azione fissata: " + accorcia(testo, 40) + " " + formattaGiorno(data) : "Attività registrata" });
  },
  "modulo-prossima": (modulo) => {
    const testo = modulo.testo.value.trim();
    const data = modulo.data.value;
    if (!testo) return segnalaCampo(modulo.testo, "Scrivi cosa fare");
    if (!formattaData(data)) return segnalaCampo(modulo.data, "Scegli una data");
    if (data < oggi()) return segnalaCampo(modulo.data, "La prossima azione va fissata da oggi in poi");
    const o = trova(modulo.dataset.id);
    if (!trovaAzienda(modulo.dataset.azienda) || (modulo.dataset.id && !o)) {
      return datoNonPiuPresente("Questa trattativa è stata eliminata in un'altra scheda: prossima azione non fissata");
    }
    applica(() => registraAttivita({ aziendaId: modulo.dataset.azienda, referenteId: o ? o.referenteId || null : null,
      ...(o ? { opportunitaId: o.id } : {}), tipo: modulo.tipo.value, testo, data, daFare: true }),
    { messaggio: "Prossima azione fissata: " + accorcia(testo, 40) + " " + formattaGiorno(data), evidenzia: o ? o.id : null });
  },
};
