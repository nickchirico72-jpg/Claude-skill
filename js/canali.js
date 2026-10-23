/*
 * COLLEGAMENTO CON SITO E SOCIAL
 * Il valore non è essere su più social, ma seguire ogni richiesta dal canale, dalla campagna e dal contenuto
 * che l'hanno generata fino al contratto e al margine. Senza un server e senza pixel di tracciamento il CRM offre:
 *  1. i link dei moduli con i parametri utm (utm_source = canale, utm_campaign = settore pilota, utm_content = contenuto);
 *  2. il piano dei contenuti, con il link tracciato già pronto per ogni contenuto;
 *  3. l'importazione delle richieste dei moduli (testo ricevuto su WhatsApp o per email): diventano opportunità in Contatto;
 *  4. l'importazione dei contatti esportati dalle campagne (CSV di LinkedIn o Meta), che diventano aziende "Da qualificare".
 */

let contattiDaImportare = []; // anteprima dell'importazione in corso

// Indirizzo di una pagina del prototipo (modulo), nella stessa cartella del CRM
function indirizzoPagina(pagina) {
  return new URL(pagina, location.href.split("#")[0]).href;
}

// Link tracciato di un modulo: canale, campagna (settore pilota) e, se c'è, contenuto
function linkTracciato(canale, contenuto = "", pagina = "sopralluogo.html") {
  const parametri = new URLSearchParams({ utm_source: codiceCanale(canale), utm_campaign: CONFIG.campagnaPilota });
  if (contenuto) parametri.set("utm_content", contenuto);
  return indirizzoPagina(pagina) + "?" + parametri.toString();
}

// Canali digitali attivi su cui si pubblica un link (il "modulo sito" è il modulo aperto senza link tracciato)
function canaliDaCollegare() {
  return CONFIG.canali.filter((c) => c.attivo && c.tipo === "digitale" && c.canale !== "modulo sito");
}

// Canale del dizionario a partire da utm_source o da un nome di piattaforma ("linkedin", "ig", "sito"...)
function fonteDaCanale(valore, predefinita = "modulo sito") {
  const v = String(valore || "").trim().toLowerCase();
  if (!v) return predefinita;
  const sinonimi = { sito: "sito web", web: "sito web", li: "linkedin", fb: "facebook", ig: "instagram", google: "profilo-google",
    gads: "google-ads", adwords: "google-ads", whatsapp: "whatsapp-business", wa: "whatsapp-business" };
  const codice = sinonimi[v] ? codiceCanale(sinonimi[v]) : codiceCanale(v);
  const canale = CONFIG.canali.find((c) => codiceCanale(c.canale) === codice);
  return canale ? canale.canale : predefinita;
}

// Contenuti del piano: quelli di prova del database e quelli aggiunti nell'app
function contenutiPiano() {
  return righeDb("contenuti").map((c) => ({ ...c, prova: true })).concat(stato.contenuti || []);
}

// Finestra "Collega sito e social": link dei moduli, piano dei contenuti e importazione delle richieste
function apriCanali() {
  const risultati = new Map(risultatiPerContenuto(stato.opportunita).map((r) => [r.nome, r]));
  const contenuti = contenutiPiano();
  apriFinestra(`
    <h2>Collega sito e social</h2>
    <p class="nota-piccola">Ogni richiesta porta con sé canale, campagna e contenuto: così vedi quali contenuti portano clienti coerenti (punteggio alto, margine sopra soglia), non solo contatti. Niente pixel di tracciamento: solo parametri nei link.</p>

    <h3>1. Link del modulo «Richiedi un sopralluogo» per canale</h3>
    <ul class="elenco-link">
      ${canaliDaCollegare().map((c) => `<li>
        <strong>${esc(c.canale)}</strong>
        <input type="text" readonly value="${esc(linkTracciato(c.canale))}" aria-label="Link per ${esc(c.canale)}" id="link-${esc(codiceCanale(c.canale))}">
        <button class="pulsante secondario piccolo" type="button" data-azione="copia-link" data-id="link-${esc(codiceCanale(c.canale))}">Copia</button>
      </li>`).join("")}
    </ul>
    <p class="nota-piccola">Canali da confermare con Gate (spenti): ${esc(CONFIG.canali.filter((c) => !c.attivo).map((c) => c.canale).join(", "))}.
      <a class="link" href="sopralluogo.html" target="_blank" rel="noopener">Apri «Richiedi un sopralluogo»</a> ·
      <a class="link" href="modulo.html" target="_blank" rel="noopener">Apri «Richiedi un preventivo»</a></p>

    <h3>2. Piano dei contenuti</h3>
    <div class="tabella-scorrevole"><table class="tabella">
      <thead><tr><th>Contenuto</th><th>Canale</th><th class="num">Richieste</th><th class="num">Punteggio medio</th><th>Link tracciato</th></tr></thead>
      <tbody>${contenuti.map((c) => {
        const r = risultati.get(c.id);
        const id = "link-contenuto-" + esc(c.id);
        return `<tr>
          <td><strong>${esc(c.id)}</strong>${c.prova ? ' <span class="chip">di prova</span>' : ""}<br><span class="nota-piccola">${formattaData(c.data_pubblicazione)} · ${esc(c.formato)} · ${esc(c.tema)}</span></td>
          <td>${esc(c.canale)}</td>
          <td class="num">${r ? r.richieste : 0}</td><td class="num">${r && r.punteggioMedio !== null ? badgePunteggio({ totale: r.punteggioMedio }) : NESSUN_DATO}</td>
          <td><input type="text" readonly value="${esc(linkTracciato(c.canale, c.id))}" id="${id}" aria-label="Link tracciato di ${esc(c.id)}">
            <button class="pulsante secondario piccolo" type="button" data-azione="copia-link" data-id="${id}">Copia</button></td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>
    <form class="modulo riga-contenuto" id="modulo-contenuto">
      <label>Data <input name="data" type="date" required value="${oggi()}"></label>
      <label>Canale <select name="canale">${opzioni(canaliDaCollegare().map((c) => c.canale), "LinkedIn")}</select></label>
      <label>Formato <select name="formato">${opzioni(["post", "articolo", "caso di studio", "pagina"], "post")}</select></label>
      <label class="largo">Tema <input name="tema" required autocomplete="off" placeholder="Es. Pulizia degli studi legali: il nostro metodo"></label>
      <button class="pulsante secondario" type="submit">Aggiungi al piano</button>
    </form>

    <h3>3. Importa le richieste ricevute</h3>
    <form class="modulo" id="modulo-importa-canali">
      <label>Richieste dei moduli (incolla uno o più messaggi arrivati su WhatsApp o per email)
        <textarea name="testo" placeholder="Richiesta di sopralluogo – Gate S.R.L.&#10;Azienda: ...&#10;Referente: ..."></textarea>
      </label>
      <div class="riga-doppia">
        <label>Oppure un file CSV delle campagne <input name="file" type="file" accept=".csv,text/csv"></label>
        <label>Canale, se il file non lo indica <select name="canale">${opzioni(canaliDaCollegare().map((c) => c.canale), "LinkedIn")}</select></label>
      </div>
      <div id="anteprima-importa"></div>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Chiudi</button>
        <button class="pulsante secondario" type="submit">Controlla le richieste</button>
        <button class="pulsante primario" type="button" data-azione="importa-contatti" id="pulsante-importa" hidden>Importa</button>
      </div>
    </form>`, { larga: true });
}

// Aggiunge un contenuto al piano: l'id diventa utm_content (es. "app-1003")
function aggiungiContenuto(modulo) {
  const tema = modulo.tema.value.trim();
  if (!tema) return segnalaCampo(modulo.tema, "Scrivi il tema del contenuto");
  if (!formattaData(modulo.data.value)) return segnalaCampo(modulo.data, "Scegli la data di pubblicazione");
  applica(() => {
    stato.contenuti = stato.contenuti || [];
    stato.contenuti.push({ id: "app-" + (stato.contatoreId + 1), data_pubblicazione: modulo.data.value, canale: modulo.canale.value,
      tema, settore: CONFIG.pilota.settore, formato: modulo.formato.value });
    stato.contatoreId += 1;
  }, { messaggio: "Contenuto aggiunto al piano: copia il suo link tracciato" });
  apriCanali();
}

// Legge i messaggi dei moduli: blocchi «Richiesta di sopralluogo» o «Richiesta di preventivo» con righe "Chiave: valore"
function analizzaRichieste(testo) {
  return String(testo || "").split(/(?=Richiesta di (?:preventivo|sopralluogo))/i).map((blocco) => {
    const campi = {};
    blocco.split(/\r?\n/).forEach((riga) => {
      const m = riga.match(/^\s*([^:]{2,30}):\s*(.*)$/);
      if (m) campi[m[1].trim().toLowerCase()] = m[2].trim();
    });
    if (!campi.azienda) return null;
    const settore = CONFIG.settori.find((s) => s.toLowerCase() === String(campi.settore || "").toLowerCase());
    return {
      tipo: /Richiesta di sopralluogo/i.test(blocco) ? "sopralluogo" : "preventivo",
      azienda: campi.azienda, nome: campi.referente || "", ruolo: campi.ruolo || "", telefono: campi.telefono || "",
      email: campi.email || "", comune: campi.comune || "", settore: settore || "", servizio: campi.servizio || "",
      ore: campi["ore al mese"] || "", ambiente: campi["tipo di ambienti"] || "", mq: Number(String(campi["metri quadri"] || "").replace(/\D/g, "")) || 0,
      frequenza: campi.frequenza || "", messaggio: campi.messaggio || "",
      fonte: fonteDaCanale(campi.canale), campagna: campi.campagna || "", contenuto: campi.contenuto || "", pagina: campi.pagina || "",
      consenso: /^s[iì]/i.test(campi["consenso privacy"] || ""),
    };
  }).filter(Boolean);
}

// Divide una riga CSV rispettando le virgolette
function dividiRigaCsv(riga, sep) {
  const celle = [];
  let cella = "", virgolette = false;
  for (let i = 0; i < riga.length; i++) {
    const c = riga[i];
    if (c === '"' && riga[i + 1] === '"' && virgolette) { cella += '"'; i++; }
    else if (c === '"') virgolette = !virgolette;
    else if (c === sep && !virgolette) { celle.push(cella); cella = ""; }
    else cella += c;
  }
  celle.push(cella);
  return celle.map((x) => x.trim());
}

// Legge il CSV delle campagne (LinkedIn Lead Gen, Meta Lead Ads o un elenco simile)
function analizzaCsvCampagne(testo, fontePredefinita) {
  const righe = String(testo || "").replace(/^﻿/, "").split(/\r?\n/).filter((r) => r.trim());
  if (righe.length < 2) return [];
  const sep = [",", ";", "\t"].sort((a, b) => righe[0].split(b).length - righe[0].split(a).length)[0];
  const intestazioni = dividiRigaCsv(righe[0], sep).map((h) => h.toLowerCase().replace(/^"|"$/g, ""));
  // Prima colonna presente tra i nomi possibili
  const colonna = (...nomi) => intestazioni.findIndex((h) => nomi.includes(h));
  const col = {
    azienda: colonna("company_name", "company", "azienda", "ragione sociale", "nome azienda"),
    nome: colonna("full_name", "nome e cognome", "name", "nome"),
    nomeProprio: colonna("first_name", "nome proprio"),
    cognome: colonna("last_name", "cognome"),
    ruolo: colonna("job_title", "ruolo"),
    telefono: colonna("phone_number", "phone", "telefono"),
    email: colonna("email", "e-mail"),
    comune: colonna("city", "comune", "città", "citta"),
    piattaforma: colonna("platform", "piattaforma", "canale", "source"),
    campagna: colonna("campaign_name", "campagna", "utm_campaign"),
  };
  return righe.slice(1).map((riga) => {
    const c = dividiRigaCsv(riga, sep);
    const v = (i) => (i >= 0 ? c[i] || "" : "");
    const nome = v(col.nome) || [v(col.nomeProprio), v(col.cognome)].filter(Boolean).join(" ");
    const azienda = v(col.azienda) || (nome ? "Contatto di " + nome : "");
    if (!azienda) return null;
    return { tipo: "campagna", azienda, nome, ruolo: v(col.ruolo), telefono: v(col.telefono), email: v(col.email), comune: v(col.comune),
      settore: "", servizio: "", ore: "", ambiente: "", mq: 0, frequenza: "", messaggio: "",
      fonte: fonteDaCanale(v(col.piattaforma), fontePredefinita), campagna: v(col.campagna), contenuto: "", pagina: "", consenso: true };
  }).filter(Boolean);
}

// Mostra l'anteprima: ogni richiesta con canale, contenuto e l'eventuale doppione (escluso in automatico)
function mostraAnteprimaImportazione(contatti) {
  contattiDaImportare = contatti.map((x) => {
    const doppioni = possibiliDoppioni({ ragioneSociale: x.azienda, telefono: x.telefono, email: x.email });
    return { ...x, doppione: doppioni.length ? doppioni[0].azienda.ragioneSociale + " (" + doppioni[0].motivi.join(", ") + ")" : "" };
  });
  const nuovi = contattiDaImportare.filter((x) => !x.doppione).length;
  document.getElementById("anteprima-importa").innerHTML = contattiDaImportare.length ? `
    <div class="tabella-scorrevole"><table class="tabella">
      <thead><tr><th>Azienda</th><th>Richiesta</th><th>Canale e contenuto</th><th>Esito</th></tr></thead>
      <tbody>${contattiDaImportare.map((x) => `<tr>
        <td>${esc(x.azienda)}<br><span class="nota-piccola">${esc(x.nome)}</span></td>
        <td>${esc(x.tipo)}${x.mq ? " · " + Number(x.mq) + " mq" : ""}</td>
        <td>${esc(x.fonte)}${x.contenuto ? " · " + esc(x.contenuto) : ""}</td>
        <td>${x.doppione ? `<span class="chip chip-attenzione">Già presente: ${esc(x.doppione)}</span>` : '<span class="chip chip-ok">Nuova</span>'}</td>
      </tr>`).join("")}</tbody>
    </table></div>
    <p class="nota-piccola">${nuovi} nuove richieste da importare; quelle già presenti non vengono duplicate.</p>`
    : '<p class="vuoto">Nessuna richiesta riconosciuta: controlla il testo o il file.</p>';
  const pulsante = document.getElementById("pulsante-importa");
  pulsante.hidden = nuovi === 0;
  pulsante.textContent = "Importa " + nuovi + (nuovi === 1 ? " richiesta" : " richieste");
}

// Opportunità in Contatto da una richiesta del modulo, con preventivo indicativo, canale, campagna e contenuto
function opportunitaDaRichiesta(x, aziendaId, referenteId, comune) {
  const servizio = Object.hasOwn(CONFIG.servizi, x.servizio) ? x.servizio : x.tipo === "sopralluogo" ? Object.keys(CONFIG.servizi)[0] : null;
  if (!servizio) return null;   // preventivo con servizio «Da definire»: resta un contatto da qualificare
  const ambiente = CONFIG.preventivo.ambienti.find((a) => a.nome.toLowerCase() === x.ambiente.toLowerCase());
  const frequenza = CONFIG.preventivo.frequenze.find((f) => f.nome.toLowerCase() === x.frequenza.toLowerCase()) || CONFIG.preventivo.frequenze[0];
  const prev = ambiente && x.mq ? calcolaPreventivo({ servizio, mq: x.mq, ambiente: ambiente.nome, frequenza: frequenza.nome }) : null;
  stato.contatore += 1;
  return {
    id: nuovoId("op"), codice: codiceRiferimento(stato.contatore), aziendaId, referenteId, canale: x.fonte, comune, servizio,
    ore: prev ? prev.ore : Math.round(Number(x.ore)) || 20,
    tariffa: prev && prev.tariffa !== datiServizio(servizio).tariffa ? prev.tariffa : null,
    ...(prev ? { preventivo: { ambiente: ambiente.nome, mq: x.mq, frequenza: frequenza.nome } } : {}),
    storico: { contatto: oggi() }, dataRegistrazione: oggi(), consensoPrivacy: !!x.consenso,
    campagna: x.campagna, contenuto: x.contenuto, paginaArrivo: x.pagina || (DIZIONARI.pagineContenuti || {})[x.contenuto] || "",
    perso: null, allocazione: null, proposte: [], note: "", responsabile: responsabileAttuale(),
  };
}

// Crea le aziende con referente; le richieste dei moduli diventano opportunità in Contatto con la chiamata di qualifica
function importaContatti() {
  const nuovi = contattiDaImportare.filter((x) => !x.doppione);
  if (!nuovi.length) return;
  let opportunita = 0;
  applica(() => {
    nuovi.forEach((x) => {
      const comune = CONFIG.comuni.find((c) => c.nome.toLowerCase() === String(x.comune).toLowerCase());
      const azienda = { id: nuovoId("az"), ragioneSociale: x.azienda, piva: "", settore: x.settore || CONFIG.pilota.settore,
        comune: comune ? comune.nome : "Bari", fonte: x.fonte, note: "", creata: oggi() };
      stato.aziende.push(azienda);
      let referenteId = null;
      if (x.nome) {
        referenteId = nuovoId("rf");
        const privacy = x.consenso ? { ...privacyVuota("consenso", oggi()), raccolta: "modulo del sito" } : privacyVuota();
        stato.referenti.push({ id: referenteId, aziendaId: azienda.id, nome: x.nome, ruolo: x.ruolo,
          telefono: telefonoDaSalvare(x.telefono), email: x.email, canale: x.telefono ? "Telefono" : "Email", decisore: false, privacy });
      }
      const richiesta = [x.ambiente, x.mq ? x.mq + " mq" : "", x.frequenza, x.servizio && x.servizio !== "Da definire" ? x.servizio : "",
        x.ore ? "circa " + x.ore + " ore al mese" : "", x.comune && !comune ? "comune indicato: " + x.comune : "", x.messaggio].filter(Boolean).join(" · ");
      registraAttivita({ aziendaId: azienda.id, referenteId, tipo: "Nota",
        testo: "Richiesta di " + x.tipo + " arrivata da " + x.fonte + (x.contenuto ? " (contenuto " + x.contenuto + ")" : "") + (richiesta ? ": " + richiesta : "") });
      const opp = x.tipo === "campagna" ? null : opportunitaDaRichiesta(x, azienda.id, referenteId, azienda.comune);
      if (opp) {
        stato.opportunita.push(opp);
        cadenza(opp, CONFIG.fasi[0], oggi());   // promemoria: chiamata di qualifica
        ultimaModificata = opp.id;
        opportunita++;
      } else {
        registraAttivita({ aziendaId: azienda.id, referenteId, tipo: "Chiamata", testo: "Chiamare per qualificare la richiesta", data: traGiorni(1), daFare: true });
      }
    });
  }, {
    messaggio: () => nuovi.length + (nuovi.length === 1 ? " richiesta importata" : " richieste importate") +
      (opportunita ? ": " + opportunita + " in «Oggi», fase Contatto, con preventivo e punteggio" : ": le trovi in Clienti come «Da qualificare»"),
    vai: () => (opportunita ? "oggi" : "clienti"), fase: "contatto",
  });
}

// Copia un link negli appunti (se il browser non lo permette, lo seleziona)
function copiaLink(id) {
  const campo = document.getElementById(id);
  campo.select();
  if (navigator.clipboard) navigator.clipboard.writeText(campo.value).then(() => mostraAvviso("Link copiato"), () => {});
}

// Azioni e moduli (uniti a quelli di app.js)
Object.assign(AZIONI_CLIENTI, {
  canali: () => apriCanali(),
  "copia-link": (el) => copiaLink(el.dataset.id),
  "importa-contatti": () => importaContatti(),
});

GESTORI_MODULI["modulo-contenuto"] = aggiungiContenuto;
GESTORI_MODULI["modulo-importa-canali"] = (modulo) => {
  const file = modulo.file.files[0];
  const daTesto = analizzaRichieste(modulo.testo.value);
  if (!file) return mostraAnteprimaImportazione(daTesto);
  const lettore = new FileReader();
  lettore.onload = () => mostraAnteprimaImportazione(daTesto.concat(analizzaCsvCampagne(lettore.result, modulo.canale.value)));
  lettore.readAsText(file);
};
