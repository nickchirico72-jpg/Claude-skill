/*
 * CLIENTI
 * Anagrafica delle aziende con i loro referenti, la cronologia delle attività
 * (chiamate, email, visite, note) e le prossime azioni da fare.
 */

// =========================================================== ATTIVITÀ DA FARE

function attivitaDaFare() {
  return stato.attivita.filter((x) => x.daFare).sort((a, b) => a.data.localeCompare(b.data));
}

// Etichetta della scadenza: in ritardo, oggi, domani o data
function scadenza(data) {
  if (data < oggi()) return `<span class="chip chip-critico">${icona("attenzione")} In ritardo · ${formattaData(data)}</span>`;
  if (data === oggi()) return '<span class="chip chip-attenzione">Oggi</span>';
  if (data === traGiorni(1)) return '<span class="chip">Domani</span>';
  return `<span class="chip">${formattaData(data)}</span>`;
}

// Riga di un'attività da fare, con il pulsante per segnarla come fatta
function rigaDaFare(x, conAzienda) {
  const azienda = trovaAzienda(x.aziendaId);
  const ref = trovaReferente(x.referenteId) || referentiDi(x.aziendaId).find((r) => r.decisore) || referentiDi(x.aziendaId)[0];
  return `
    <li class="da-fare">
      <div class="da-fare-testo">
        <p>${scadenza(x.data)} <strong>${esc(x.tipo)}</strong> · ${esc(x.testo)}</p>
        ${conAzienda ? `<p class="nota-piccola"><a class="link" href="#cliente-${azienda.id}">${esc(azienda.ragioneSociale)}</a>${ref ? " · " + esc(ref.nome) : ""}</p>` : ""}
      </div>
      <div class="da-fare-azioni">
        ${ref ? pulsantiContatto(ref, true) : ""}
        <button class="pulsante secondario piccolo" type="button" data-azione="fatto" data-id="${x.id}">${icona("spunta")} Fatto</button>
      </div>
    </li>`;
}

// Riquadro "Da fare" in cima alla Pipeline: attività scadute e di oggi
function sezioneDaFare() {
  const tutte = attivitaDaFare();
  const entroOggi = tutte.filter((x) => x.data <= oggi());
  const prossime = tutte.length - entroOggi.length;
  return `
    <section class="riquadro da-fare-riquadro" aria-label="Da fare oggi">
      <h2 class="titolo-riquadro">${icona("calendario")} Da fare oggi <span class="conteggio">${entroOggi.length}</span></h2>
      ${entroOggi.length ? `<ul class="elenco-da-fare">${entroOggi.map((x) => rigaDaFare(x, true)).join("")}</ul>`
        : '<p class="nota-piccola">Nessuna attività in scadenza oggi.</p>'}
      ${prossime ? `<p class="nota-piccola">Nei prossimi giorni: ${prossime} attività. Le trovi nelle schede dei clienti.</p>` : ""}
    </section>`;
}

// ========================================================= CONTATTO CON UN CLIC

// Pulsanti Chiama / WhatsApp / Email per un referente (compatti = solo il canale preferito)
function pulsantiContatto(r, compatti) {
  const numero = numeroInternazionale(r.telefono);
  const canali = [];
  if (numero) {
    canali.push({ nome: "Telefono", html: `<a class="pulsante-contatto" href="tel:+${numero}" title="Chiama ${esc(r.nome)}">${icona("telefono")}<span>Chiama</span></a>` });
    canali.push({ nome: "WhatsApp", html: `<a class="pulsante-contatto" href="https://wa.me/${numero}" target="_blank" rel="noopener" title="Scrivi su WhatsApp a ${esc(r.nome)}">${icona("messaggio")}<span>WhatsApp</span></a>` });
  }
  if (r.email) {
    canali.push({ nome: "Email", html: `<a class="pulsante-contatto" href="mailto:${esc(r.email)}" title="Scrivi un'email a ${esc(r.nome)}">${icona("email")}<span>Email</span></a>` });
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
      occhiello: "Clienti",
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
          <a class="link-titolo" href="#cliente-${a.id}">${esc(a.ragioneSociale)}</a>
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
        <button class="pulsante secondario" type="button" data-azione="modifica-azienda" data-id="${a.id}">${icona("matita")} Modifica dati</button>
        <button class="pulsante accento" type="button" data-azione="nuova-opportunita" data-id="${a.id}">${icona("piu")} Nuova opportunità</button></div>`,
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
                  <button class="pulsante-icona" type="button" data-azione="modifica-referente" data-id="${r.id}" aria-label="Modifica ${esc(r.nome)}" title="Modifica">${icona("matita")}</button>
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
            <button class="riquadro aggiungi" type="button" data-azione="nuovo-referente" data-id="${a.id}">${icona("piu")} Aggiungi referente</button>
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
                    <td><button class="link pulsante-link" type="button" data-azione="dettaglio" data-id="${o.id}">${o.codice}</button></td>
                    <td>${esc(o.servizio)}<br><span class="nota-piccola">${o.ore} h/mese</span></td>
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
          <form class="modulo riquadro" id="modulo-attivita" data-id="${a.id}">
            <div class="riga-doppia">
              <label>Tipo <select name="tipo">${opzioni(CONFIG.tipiAttivita, "Chiamata")}</select></label>
              <label>Referente
                <select name="referente"><option value="">Nessuno in particolare</option>${refs.map((r) => `<option value="${r.id}">${esc(r.nome)}</option>`).join("")}</select>
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
    <form class="modulo" id="modulo-azienda" data-id="${a.id}">
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
    <form class="modulo" id="modulo-referente" data-azienda="${aziendaId}" data-id="${referenteId || ""}">
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
        ${referenteId && !usato ? `<button class="pulsante no" type="button" data-azione="elimina-referente" data-id="${referenteId}">Elimina</button>` : ""}
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
      dati = JSON.parse(lettore.result);
    } catch (e) {
      dati = null;
    }
    if (!datiValidi(dati)) {
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
  "elimina-referente": (el) => {
    stato.referenti = stato.referenti.filter((r) => r.id !== el.dataset.id);
    stato.attivita.forEach((x) => { if (x.referenteId === el.dataset.id) x.referenteId = null; });
    salva();
    chiudiFinestra();
    disegna();
    mostraAvviso("Referente eliminato");
  },
  fatto: (el) => {
    const x = stato.attivita.find((y) => y.id === el.dataset.id);
    x.daFare = false;
    x.data = oggi();
    salva();
    disegna();
    mostraAvviso("Attività segnata come fatta: " + x.testo);
  },
  "conferma-importa": () => {
    stato = backupInAttesa;
    backupInAttesa = null;
    salva();
    chiudiFinestra();
    disegna();
    mostraAvviso("Backup importato");
  },
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
    Object.assign(a, { ragioneSociale: nome, piva, settore: modulo.settore.value, comune: modulo.comune.value, fonte: modulo.fonte.value, note: modulo.note.value.trim() });
    salva();
    chiudiFinestra();
    disegna();
    mostraAvviso("Dati dell'azienda aggiornati");
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
    if (esistente) Object.assign(esistente, dati);
    else stato.referenti.push({ id: nuovoId("rf"), aziendaId: modulo.dataset.azienda, ...dati });
    salva();
    chiudiFinestra();
    disegna();
    mostraAvviso(esistente ? "Referente aggiornato" : "Referente aggiunto: " + nome);
  },
  "modulo-attivita": (modulo) => {
    const testo = modulo.testo.value.trim();
    if (!testo) return segnalaCampo(modulo.testo, "Scrivi cosa è successo o cosa fare");
    if (!modulo.data.value) return segnalaCampo(modulo.data, "Scegli una data");
    registraAttivita({
      aziendaId: modulo.dataset.id,
      referenteId: modulo.referente.value || null,
      tipo: modulo.tipo.value,
      data: modulo.data.value,
      testo,
      daFare: modulo.daFare.checked,
    });
    salva();
    disegna();
    mostraAvviso(modulo.daFare.checked ? "Prossima azione fissata" : "Attività registrata");
  },
};
