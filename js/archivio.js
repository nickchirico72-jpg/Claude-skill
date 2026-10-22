/*
 * ARCHIVIO DEI DATI
 * L'app non parla direttamente con il browser: legge e scrive attraverso un "archivio".
 * Oggi c'è solo l'archivio locale (localStorage, un browser); quando si sceglierà l'archivio condiviso
 * (vedi docs/archivio-condiviso.md) basterà aggiungerne uno con le stesse due funzioni, leggi() e scrivi().
 * A ogni salvataggio l'archivio riceve anche l'elenco dei record cambiati: un archivio condiviso
 * salverà solo quelli, così più persone possono lavorare insieme senza sovrascriversi.
 */

// Raccolte di record con un id, confrontate a ogni salvataggio
const RACCOLTE = ["aziende", "referenti", "opportunita", "attivita", "contenuti", "richiesteReali"];

// Archivi disponibili: per ora solo quello locale
const ARCHIVI = {
  locale: {
    nome: "Questo browser",
    // Testo salvato (JSON) oppure null; un errore vuol dire salvataggio non disponibile
    leggi() {
      return localStorage.getItem(CONFIG.chiaveSalvataggio);
    },
    // Salva tutto lo stato: nel browser non serve salvare record per record
    scrivi(dati) {
      localStorage.setItem(CONFIG.chiaveSalvataggio, JSON.stringify(dati));
    },
  },
};

// Archivio scelto in config.js (se il nome non esiste, quello locale)
function archivio() {
  return ARCHIVI[CONFIG.archivio.tipo] || ARCHIVI.locale;
}

// Impostazioni che Alfredo deve poter cambiare senza programmatore (oggi in config.js): nell'archivio condiviso
// diventano tabelle (squadre, partner, servizi, preventivo) e una tabella chiave-valore per le soglie (docs/schema-archivio.md)
function impostazioniDaSalvare() {
  const c = CONFIG;
  return {
    squadre: c.squadre, partner: c.partner,
    servizi: Object.entries(c.servizi).map(([nome, s]) => ({ nome, ...s })),
    ambienti: c.preventivo.ambienti, frequenze: c.preventivo.frequenze,
    canali: c.canali, settori: c.settori, comuni: c.comuni, motiviPerdita: c.motiviPerdita,
    varie: {
      giorniAvvioServizio: c.giorniAvvioServizio, giorniValiditaOfferta: c.giorniValiditaOfferta,
      giorniContrattiDaAssegnare: c.giorniContrattiDaAssegnare, speseDirettePercentuale: c.speseDirettePercentuale,
      settimaneAlMese: c.preventivo.settimaneAlMese, mittente: c.mittente, funzioni: c.funzioni, obiettivi: c.obiettivi,
      avvisi: c.avvisi, consigli: c.consigli, rimediPerdita: c.rimediPerdita, fascePunteggio: c.punteggio.fasce,
      confermaPerPunteggioC: c.punteggio.confermaPerPunteggioC,
    },
  };
}

// Record cambiati tra due versioni dello stato: aggiunti, cambiati ed eliminati, per raccolta e id
function confrontaStati(prima, dopo) {
  const modifiche = { aggiunti: [], cambiati: [], eliminati: [] };
  RACCOLTE.forEach((raccolta) => {
    const vecchi = new Map((prima && prima[raccolta] || []).map((r) => [r.id, JSON.stringify(r)]));
    const nuovi = dopo[raccolta] || [];
    nuovi.forEach((r) => {
      if (!vecchi.has(r.id)) modifiche.aggiunti.push({ raccolta, id: r.id });
      else if (vecchi.get(r.id) !== JSON.stringify(r)) modifiche.cambiati.push({ raccolta, id: r.id });
      vecchi.delete(r.id);
    });
    vecchi.forEach((_, id) => modifiche.eliminati.push({ raccolta, id }));
  });
  return modifiche;
}

// Numero di record toccati da una modifica
function quantiRecord(modifiche) {
  return modifiche.aggiunti.length + modifiche.cambiati.length + modifiche.eliminati.length;
}

// ------------------------------------------------ Chi sta lavorando e registro delle modifiche

// Utente di questo browser (nome e ruolo); senza scelta è l'ospite della demo
function utenteAttuale() {
  try {
    const u = JSON.parse(localStorage.getItem(CONFIG.chiaveSalvataggio + "-utente"));
    if (u && typeof u.nome === "string" && CONFIG.ruoli.some((r) => r.id === u.ruolo)) return u;
  } catch (e) {
    // salvataggio non disponibile o valore non valido: si usa l'ospite
  }
  return { nome: "Ospite", ruolo: "direzione", ospite: true };
}

// Responsabile delle trattative nuove: chi sta lavorando (vuoto per l'ospite della demo)
function responsabileAttuale() {
  const u = utenteAttuale();
  return u.ospite ? "" : u.nome;
}

// Ruolo dell'utente (nome leggibile e vista degli Indicatori che si apre per prima)
function ruoloUtente(u = utenteAttuale()) {
  return CONFIG.ruoli.find((r) => r.id === u.ruolo) || CONFIG.ruoli[0];
}

// Aggiunge una riga al registro: quando, chi, cosa e quanti record (le righe più vecchie escono oltre il limite)
function registraModifica(cosa, modifiche) {
  const u = utenteAttuale();
  stato.registro = (stato.registro || []).concat({
    quando: new Date().toISOString().slice(0, 16), chi: u.nome, ruolo: u.ruolo, cosa: String(cosa || "Modifica"),
    record: modifiche ? quantiRecord(modifiche) : 0,
  }).slice(-CONFIG.archivio.righeRegistro);
}

// Finestra «Chi sta lavorando»: nome e ruolo, ricordati solo in questo browser
function apriUtente() {
  const u = utenteAttuale();
  apriFinestra(`
    <form class="modulo" id="modulo-utente" novalidate>
      <div>
        <h2>Chi sta lavorando?</h2>
        <p class="nota-piccola">Il nome compare nel registro delle modifiche; il ruolo sceglie la vista degli Indicatori che si apre per prima.
          Con l'archivio condiviso diventerà l'accesso con password.</p>
      </div>
      <label>Nome e cognome * <input name="nome" required autocomplete="name" value="${u.ospite ? "" : esc(u.nome)}" placeholder="Es. Alfredo R."></label>
      <label>Ruolo <select name="ruolo">${CONFIG.ruoli.map((r) => `<option value="${esc(r.id)}" ${r.id === u.ruolo ? "selected" : ""}>${esc(r.nome)}</option>`).join("")}</select></label>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit">Salva</button>
      </div>
    </form>`);
}

// Salva nome e ruolo nel browser e apre gli Indicatori sulla vista del ruolo
function salvaUtente(modulo) {
  const nome = modulo.nome.value.trim();
  if (!nome) return segnalaCampo(modulo.nome, "Scrivi il tuo nome");
  const u = { nome, ruolo: modulo.ruolo.value };
  try {
    localStorage.setItem(CONFIG.chiaveSalvataggio + "-utente", JSON.stringify(u));
  } catch (e) {
    // senza salvataggio il nome vale solo finché la pagina resta aperta
  }
  interfaccia.indicatori.livello = ruoloUtente(u).vista;
  chiudiFinestra();
  disegna();
  mostraAvviso("Ora lavori come " + nome + " (" + ruoloUtente(u).nome.toLowerCase() + ")");
}

// Finestra con le ultime modifiche: chi, quando, cosa
function apriRegistro() {
  const righe = (stato.registro || []).slice().reverse().slice(0, 50);
  apriFinestra(`
    <h2>Registro delle modifiche</h2>
    <p class="nota-piccola">${righe.length === 1 ? "L'ultima modifica salvata" : "Le ultime " + righe.length + " modifiche salvate"} in ${esc(archivio().nome.toLowerCase())}: chi, quando e cosa.</p>
    ${righe.length ? `<div class="tabella-scorrevole"><table class="tabella impilata">
      <thead><tr><th>Quando</th><th>Chi</th><th>Cosa</th></tr></thead>
      <tbody>${righe.map((r) => `<tr>
        <td data-etichetta="Quando">${formattaData(r.quando.slice(0, 10))} ${esc(r.quando.slice(11, 16))}</td>
        <td data-etichetta="Chi">${esc(r.chi)}</td>
        <td data-etichetta="Cosa">${esc(r.cosa)}</td></tr>`).join("")}</tbody>
    </table></div>` : '<p class="vuoto">Ancora nessuna modifica registrata.</p>'}
    <div class="azioni-finestra"><button class="pulsante primario" type="button" data-azione="chiudi">Chiudi</button></div>`);
}

// Riga del piè di pagina: chi sta lavorando, dove sono i dati e il registro
function aggiornaRigaUtente() {
  const el = document.getElementById("riga-utente");
  if (!el) return;
  const u = utenteAttuale();
  el.innerHTML = `Lavori come <strong>${esc(u.nome)}</strong> (${esc(ruoloUtente(u).nome.toLowerCase())}) ·
    <button class="pulsante-testo positivo" type="button" data-azione="utente">${u.ospite ? "Dimmi chi sei" : "Cambia"}</button> ·
    dati in: ${esc(archivio().nome.toLowerCase())} ·
    <button class="pulsante-testo positivo" type="button" data-azione="registro">Registro delle modifiche</button>`;
}
