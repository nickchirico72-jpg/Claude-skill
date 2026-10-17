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

// Trattative aperte da seguire: senza prossima azione o ferme da troppo tempo, dalla più ferma
function trattativeDaSeguire() {
  return stato.opportunita.filter(trattativaAperta).map((o) => ({ o, s: statoTrattativa(o) }))
    .filter(({ s }) => !s.prossima || s.ferma)
    .sort((a, b) => b.s.giorniInFase - a.s.giorniInFase);
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
    </form>`, "Prossima azione");
}

// ========================================================= CONTATTO CON UN CLIC

// Pulsanti Chiama / WhatsApp / Email per un referente (compatti = solo il canale preferito)
function pulsantiContatto(r, compatti) {
  const numero = numeroInternazionale(r.telefono);
  const canali = [];
  if (numero) {
    canali.push({ nome: "Telefono", html: `<a class="pulsante-contatto" href="tel:+${numero}" title="Chiama ${esc(r.nome)}" aria-label="Chiama ${esc(r.nome)}">${icona("telefono")}<span>Chiama</span></a>` });
    canali.push({ nome: "WhatsApp", html: `<a class="pulsante-contatto" href="https://wa.me/${numero}" target="_blank" rel="noopener" title="Scrivi su WhatsApp a ${esc(r.nome)}" aria-label="WhatsApp a ${esc(r.nome)}">${icona("messaggio")}<span>WhatsApp</span></a>` });
  }
  if (r.email) {
    canali.push({ nome: "Email", html: `<a class="pulsante-contatto" href="mailto:${esc(r.email)}" title="Scrivi un'email a ${esc(r.nome)}" aria-label="Email a ${esc(r.nome)}">${icona("email")}<span>Email</span></a>` });
  }
  if (compatti) {
    const preferito = canali.find((c) => c.nome === r.canale) || canali[0];
    return preferito ? preferito.html : "";
  }
  return canali.map((c) => c.html).join("");
}

// ============================================================== ELENCO CLIENTI

function disegnaClienti() {
  const conteggi = { "Cliente": 0, "In trattativa": 0, "Da qualificare": 0, "Perso": 0 };
  stato.aziende.forEach((a) => conteggi[statoAzienda(a.id)]++);
  return `
    ${intestazione({
      titolo: "Aziende e referenti",
      istruzione: "Cerca un'azienda e apri la sua scheda per chiamare i referenti, registrare un contatto e fissare la prossima azione.",
      azione: `<div class="azioni-intestazione">
        <button class="pulsante secondario" type="button" data-azione="esporta-csv">Esporta per Excel</button>
        <button class="pulsante accento" type="button" data-azione="nuovo">${icona("piu")} Nuovo contatto</button></div>`,
    })}

    <section class="riepilogo" aria-label="Riepilogo clienti">
      ${Object.entries(conteggi).map(([nome, n]) => `<div><span>${nome}</span><strong>${n}</strong></div>`).join("")}
    </section>

    <div class="filtri" id="filtri-clienti" role="search">
      <label class="campo-cerca">${icona("cerca")}
        <input type="search" id="cerca-clienti" placeholder="Cerca per azienda, referente o comune" aria-label="Cerca">
      </label>
      <select id="filtro-settore" aria-label="Filtra per settore"><option value="">Tutti i settori</option>${opzioni(CONFIG.settori, "")}</select>
      <select id="filtro-stato" aria-label="Filtra per stato"><option value="">Tutti gli stati</option>${opzioni(Object.keys(conteggi), "")}</select>
    </div>

    <div id="elenco-clienti" class="griglia tre">${schedeClienti(stato.aziende)}</div>`;
}

// Ridisegna solo l'elenco, così il campo di ricerca non perde il cursore
function aggiornaElencoClienti() {
  const testo = document.getElementById("cerca-clienti").value.trim().toLowerCase();
  const settore = document.getElementById("filtro-settore").value;
  const statoScelto = document.getElementById("filtro-stato").value;
  const filtrate = stato.aziende.filter((a) => {
    const testi = [a.ragioneSociale, a.comune, a.piva, ...referentiDi(a.id).map((r) => r.nome + " " + r.email)].join(" ").toLowerCase();
    return (!testo || testi.includes(testo)) && (!settore || a.settore === settore) && (!statoScelto || statoAzienda(a.id) === statoScelto);
  });
  document.getElementById("elenco-clienti").innerHTML = schedeClienti(filtrate);
}

const CLASSI_STATO = { "Cliente": "chip-ok", "In trattativa": "chip-info", "Da qualificare": "chip-attenzione", "Perso": "" };

function chipStato(aziendaId) {
  const s = statoAzienda(aziendaId);
  return `<span class="chip ${CLASSI_STATO[s]}">${s}</span>`;
}

function schedeClienti(aziende) {
  if (!aziende.length) return '<p class="vuoto">Nessuna azienda corrisponde alla ricerca.</p>';
  return [...aziende].sort((x, y) => x.ragioneSociale.localeCompare(y.ragioneSociale)).map((a) => {
    const refs = referentiDi(a.id);
    const principale = refs.find((r) => r.decisore) || refs[0];
    const prossima = attivitaDaFare().find((x) => x.aziendaId === a.id);
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
            <div class="contatti">${pulsantiContatto(principale)}</div>
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
  const cronologia = attivitaDi(id).filter((x) => !x.daFare).sort((x, y) => y.data.localeCompare(x.data) || y.id.localeCompare(x.id));

  return `
    <a class="link-indietro" href="#clienti">${icona("indietro")} Tutti i clienti</a>
    ${intestazione({
      occhiello: esc(a.settore),
      titolo: esc(a.ragioneSociale),
      istruzione: "Registra ogni contatto con il cliente e fissa sempre la prossima azione: così nessuna trattativa resta ferma.",
      azione: `<div class="azioni-intestazione">
        <button class="pulsante secondario" type="button" data-azione="modifica-azienda" data-id="${esc(a.id)}">${icona("matita")} Modifica dati</button>
        <button class="pulsante accento" type="button" data-azione="nuova-opportunita" data-id="${esc(a.id)}">${icona("piu")} Nuova opportunità</button></div>`,
    })}
    <p class="riga-chip">${chipStato(a.id)} <span class="chip">Fonte: ${esc(a.fonte)}</span> <span class="chip">${esc(a.comune)}</span>
      ${a.piva ? `<span class="chip">P.IVA ${esc(a.piva)}</span>` : ""} <span class="chip">In archivio dal ${formattaData(a.creata)}</span></p>
    ${a.note ? `<p class="nota-piccola">${esc(a.note)}</p>` : ""}

    <div class="scheda-cliente">
      <div class="colonna-scheda">
        <section class="sezione">
          <h2>Referenti <span class="conteggio">${refs.length}</span></h2>
          <div class="griglia-referenti">
            ${refs.map((r) => `
              <article class="riquadro referente">
                <div class="scheda-alto">
                  <h3>${esc(r.nome)}</h3>
                  <button class="pulsante-icona" type="button" data-azione="modifica-referente" data-id="${esc(r.id)}" aria-label="Modifica ${esc(r.nome)}" title="Modifica">${icona("matita")}</button>
                </div>
                <p class="partner-dati">${esc(r.ruolo) || "Ruolo non indicato"}</p>
                <p class="riga-chip">
                  ${r.decisore ? '<span class="chip chip-ok">Decisore</span>' : ""}
                  ${r.privacy ? `<span class="chip chip-ok">${icona("spunta")} Consenso privacy</span>` : `<span class="chip chip-critico">${icona("attenzione")} Manca il consenso privacy</span>`}
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
              <table class="tabella">
                <thead><tr><th>Rif.</th><th>Servizio</th><th>Sede</th><th>Fase</th><th>Punteggio</th><th class="num">Valore annuo</th></tr></thead>
                <tbody>
                  ${opp.map((o) => `<tr>
                    <td><button class="link pulsante-link" type="button" data-azione="dettaglio" data-id="${esc(o.id)}">${esc(o.codice)}</button></td>
                    <td>${esc(o.servizio)}<br><span class="nota-piccola">${Number(o.ore)} h/mese</span></td>
                    <td>${esc(o.comune)}</td>
                    <td>${faseAttuale(o) === "perso" ? "Perso" : CONFIG.fasi[faseRaggiunta(o)].nome}</td>
                    <td>${badgePunteggio(calcolaPunteggio(o, stato.opportunita))}</td>
                    <td class="num">${formattaEuro(valoreAnnuo(o))}</td>
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
          <h2>Registra un'attività</h2>
          <form class="modulo riquadro" id="modulo-attivita" data-id="${esc(a.id)}">
            <div class="riga-doppia">
              <label>Tipo <select name="tipo">${opzioni(CONFIG.tipiAttivita, "Chiamata")}</select></label>
              <label>Referente
                <select name="referente"><option value="">Nessuno in particolare</option>${refs.map((r) => `<option value="${esc(r.id)}">${esc(r.nome)}</option>`).join("")}</select>
              </label>
            </div>
            <label>Cosa è successo o cosa fare
              <textarea name="testo" required placeholder="Es. Telefonata: chiede un preventivo per la pulizia settimanale"></textarea>
            </label>
            <div class="riga-doppia">
              <label>Data <input name="data" type="date" value="${oggi()}" required></label>
              <label class="spunta"><input name="daFare" type="checkbox"> È una prossima azione da fare</label>
            </div>
            <div class="azioni-finestra"><button class="pulsante primario" type="submit">Registra</button></div>
          </form>
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

// ========================================================= FINESTRE E MODULI

function apriModificaAzienda(id) {
  const a = trovaAzienda(id);
  apriFinestra(`
    <form class="modulo" id="modulo-azienda" data-id="${esc(a.id)}">
      <h2>Dati dell'azienda</h2>
      <label>Ragione sociale <input name="ragioneSociale" required value="${esc(a.ragioneSociale)}"></label>
      <div class="riga-doppia">
        <label>Partita IVA <input name="piva" inputmode="numeric" value="${esc(a.piva)}" placeholder="11 cifre"></label>
        <label>Settore <select name="settore">${opzioni(CONFIG.settori, a.settore)}</select></label>
      </div>
      <div class="riga-doppia">
        <label>Sede (comune) <select name="comune">${opzioniComuni(a.comune)}</select></label>
        <label>Fonte del contatto <select name="fonte">${opzioni(fonti(), a.fonte)}</select></label>
      </div>
      <label>Note <textarea name="note" placeholder="Es. orari di accesso, esigenze particolari">${esc(a.note)}</textarea></label>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Salva</button>
      </div>
    </form>`, "Dati dell'azienda");
}

function apriReferente(aziendaId, referenteId) {
  const r = trovaReferente(referenteId) || { nome: "", ruolo: "", telefono: "", email: "", canale: "Telefono", decisore: false, privacy: false };
  const usato = referenteId && stato.opportunita.some((o) => o.referenteId === referenteId);
  apriFinestra(`
    <form class="modulo" id="modulo-referente" data-azienda="${esc(aziendaId)}" data-id="${esc(referenteId)}">
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
      <label class="spunta"><input name="privacy" type="checkbox" ${r.privacy ? "checked" : ""}> Ha dato il consenso privacy per essere ricontattato</label>
      <div class="azioni-finestra">
        ${referenteId && !usato ? `<button class="pulsante no" type="button" data-azione="elimina-referente" data-id="${esc(referenteId)}">Elimina</button>` : ""}
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Salva</button>
      </div>
    </form>`, "Referente");
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
      </div>`, "Importazione backup");
  };
  lettore.readAsText(file);
}

// Azioni dei pulsanti (unite a quelle di app.js)
const AZIONI_CLIENTI = {
  "nuova-opportunita": (el) => apriNuovoContatto(el.dataset.id),
  "modifica-azienda": (el) => apriModificaAzienda(el.dataset.id),
  "nuovo-referente": (el) => apriReferente(el.dataset.id, null),
  "modifica-referente": (el) => apriReferente(trovaReferente(el.dataset.id).aziendaId, el.dataset.id),
  "elimina-referente": (el) => applica(() => {
    stato.referenti = stato.referenti.filter((r) => r.id !== el.dataset.id);
    stato.attivita.forEach((x) => { if (x.referenteId === el.dataset.id) x.referenteId = null; });
  }, { messaggio: "Referente eliminato" }),
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
    const nome = modulo.ragioneSociale.value.trim();
    if (!nome) return segnalaCampo(modulo.ragioneSociale, "Scrivi la ragione sociale");
    if (stato.aziende.some((x) => x.id !== a.id && x.ragioneSociale.toLowerCase() === nome.toLowerCase())) {
      return segnalaCampo(modulo.ragioneSociale, "Esiste già un'azienda con questo nome");
    }
    const piva = modulo.piva.value.replace(/\s/g, "");
    if (piva && !/^\d{11}$/.test(piva)) return segnalaCampo(modulo.piva, "La partita IVA ha 11 cifre");
    const dati = { ragioneSociale: nome, piva, settore: modulo.settore.value, comune: modulo.comune.value, fonte: modulo.fonte.value, note: modulo.note.value.trim() };
    // Una riga di cronologia con i campi cambiati, es. "Dati aggiornati: comune Bari → Modugno"
    const etichette = { ragioneSociale: "ragione sociale", piva: "partita IVA", settore: "settore", comune: "comune", fonte: "fonte" };
    const cambi = Object.entries(etichette).filter(([k]) => (a[k] || "") !== dati[k])
      .map(([k, nome]) => nome + " " + (a[k] || "—") + " → " + (dati[k] || "—"));
    if ((a.note || "") !== dati.note) cambi.push("note aggiornate");
    if (!cambi.length) return chiudiFinestra(); // nulla da salvare
    applica(() => {
      Object.assign(a, dati);
      registraAttivita({ aziendaId: a.id, tipo: "Pipeline", testo: "Dati aggiornati: " + cambi.join("; ") });
    }, { messaggio: "Dati dell'azienda aggiornati" });
  },
  "modulo-referente": (modulo) => {
    const nome = modulo.nome.value.trim();
    if (!nome) return segnalaCampo(modulo.nome, "Scrivi nome e cognome");
    if (modulo.email.value && !modulo.email.checkValidity()) return segnalaCampo(modulo.email, "Controlla l'indirizzo email");
    const dati = {
      nome,
      ruolo: modulo.ruolo.value.trim(),
      telefono: numeroInternazionale(modulo.telefono.value),
      email: modulo.email.value.trim(),
      canale: modulo.canale.value,
      decisore: modulo.decisore.checked,
      privacy: modulo.privacy.checked,
    };
    const esistente = trovaReferente(modulo.dataset.id);
    // Cronologia: i campi cambiati; di telefono ed email solo che sono cambiati, senza i numeri
    const cambi = [];
    if (esistente) {
      const siNo = (v) => (v ? "sì" : "no");
      if (esistente.nome !== dati.nome) cambi.push("nome aggiornato");
      if ((esistente.ruolo || "") !== dati.ruolo) cambi.push("ruolo " + (esistente.ruolo || "—") + " → " + (dati.ruolo || "—"));
      if (numeroInternazionale(esistente.telefono) !== dati.telefono) cambi.push("telefono aggiornato");
      if ((esistente.email || "") !== dati.email) cambi.push("email aggiornata");
      if (esistente.canale !== dati.canale) cambi.push("canale preferito " + (esistente.canale || "—") + " → " + dati.canale);
      if (!!esistente.decisore !== dati.decisore) cambi.push("decisore " + siNo(esistente.decisore) + " → " + siNo(dati.decisore));
      if (!!esistente.privacy !== dati.privacy) cambi.push("consenso privacy " + siNo(esistente.privacy) + " → " + siNo(dati.privacy));
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
    const testo = modulo.testo.value.trim();
    if (!testo) return segnalaCampo(modulo.testo, "Scrivi cosa è successo o cosa fare");
    if (!modulo.data.value) return segnalaCampo(modulo.data, "Scegli una data");
    const dati = {
      aziendaId: modulo.dataset.id,
      referenteId: modulo.referente.value || null,
      tipo: modulo.tipo.value,
      data: modulo.data.value,
      testo,
      daFare: modulo.daFare.checked,
    };
    applica(() => registraAttivita(dati), { messaggio: dati.daFare ? "Prossima azione fissata" : "Attività registrata" });
  },
  "modulo-prossima": (modulo) => {
    const testo = modulo.testo.value.trim();
    const data = modulo.data.value;
    if (!testo) return segnalaCampo(modulo.testo, "Scrivi cosa fare");
    if (!formattaData(data)) return segnalaCampo(modulo.data, "Scegli una data");
    if (data < oggi()) return segnalaCampo(modulo.data, "La prossima azione va fissata da oggi in poi");
    const o = trova(modulo.dataset.id);
    applica(() => registraAttivita({ aziendaId: modulo.dataset.azienda, referenteId: o ? o.referenteId || null : null,
      ...(o ? { opportunitaId: o.id } : {}), tipo: modulo.tipo.value, testo, data, daFare: true }),
    { messaggio: "Prossima azione fissata: " + accorcia(testo, 40) + " " + formattaGiorno(data), evidenzia: o ? o.id : null });
  },
};
