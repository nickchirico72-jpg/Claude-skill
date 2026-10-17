/*
 * COLLEGAMENTO CON SITO E SOCIAL
 * Senza un server i contatti non arrivano da soli: il CRM offre
 *  1. i link tracciati del modulo "Richiedi un preventivo" (modulo.html), uno per canale;
 *  2. l'importazione delle richieste del modulo (testo ricevuto su WhatsApp o per email);
 *  3. l'importazione dei contatti esportati dalle campagne (CSV di Facebook, Instagram, LinkedIn).
 * Ogni contatto importato diventa un'azienda "Da qualificare" con la fonte giusta e una chiamata da fare.
 */

let contattiDaImportare = []; // anteprima dell'importazione in corso

// Indirizzo del modulo, nella stessa cartella del CRM
function indirizzoModulo() {
  return new URL("modulo.html", location.href.split("#")[0]).href;
}

function linkTracciato(codice) {
  return indirizzoModulo() + "?utm_source=" + encodeURIComponent(codice);
}

// Fonte del CRM a partire da un codice o da un nome di piattaforma ("ig", "instagram", "Facebook"...)
function fonteDaCanale(valore, predefinita = "Sito web") {
  const v = String(valore || "").trim().toLowerCase();
  if (!v) return predefinita;
  const sinonimi = { fb: "facebook", ig: "instagram", li: "linkedin", sito: "sito", web: "sito", google: "google", adwords: "google" };
  const codice = sinonimi[v] || v;
  const canale = CONFIG.canaliDigitali.find((c) => c.codice === codice || c.fonte.toLowerCase() === v);
  return canale ? canale.fonte : predefinita;
}

// Finestra "Canali e modulo": link da pubblicare e importazione dei contatti
function apriCanali() {
  apriFinestra(`
    <h2>Collega sito e social</h2>
    <p class="nota-piccola">1. Pubblica il modulo con il link del canale: sul sito, nella bio di Instagram, nei post e nelle campagne.
      2. Le richieste ti arrivano su WhatsApp o per email: incollale qui sotto, oppure carica il file esportato dalle campagne. Il CRM crea i contatti con la fonte giusta.</p>
    <h3>Link del modulo per ogni canale</h3>
    <ul class="elenco-link">
      ${CONFIG.canaliDigitali.map((c) => `<li>
        <strong>${esc(c.fonte)}</strong>
        <input type="text" readonly value="${esc(linkTracciato(c.codice))}" aria-label="Link per ${esc(c.fonte)}" id="link-${esc(c.codice)}">
        <button class="pulsante secondario piccolo" type="button" data-azione="copia-link" data-id="link-${esc(c.codice)}">Copia</button>
      </li>`).join("")}
    </ul>
    <p><a class="link" href="modulo.html" target="_blank" rel="noopener">Apri il modulo "Richiedi un preventivo"</a></p>

    <h3>Importa contatti</h3>
    <form class="modulo" id="modulo-importa-canali">
      <label>Richieste ricevute dal modulo (incolla uno o più messaggi)
        <textarea name="testo" placeholder="Richiesta di preventivo – Gate S.R.L.&#10;Azienda: ...&#10;Referente: ..."></textarea>
      </label>
      <div class="riga-doppia">
        <label>Oppure un file CSV delle campagne <input name="file" type="file" accept=".csv,text/csv"></label>
        <label>Canale, se il file non lo indica <select name="canale">${opzioni(CONFIG.canaliDigitali.map((c) => c.fonte), "Facebook")}</select></label>
      </div>
      <div id="anteprima-importa"></div>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Chiudi</button>
        <button class="pulsante secondario" type="submit">Controlla i contatti</button>
        <button class="pulsante primario" type="button" data-azione="importa-contatti" id="pulsante-importa" hidden>Importa</button>
      </div>
    </form>`, { larga: true });
}

// Legge i messaggi del modulo: blocchi di righe "Chiave: valore"
function analizzaRichieste(testo) {
  return String(testo || "").split(/Richiesta di preventivo/i).map((blocco) => {
    const campi = {};
    blocco.split(/\r?\n/).forEach((riga) => {
      const m = riga.match(/^\s*([^:]{2,30}):\s*(.*)$/);
      if (m) campi[m[1].trim().toLowerCase()] = m[2].trim();
    });
    if (!campi.azienda) return null;
    return {
      azienda: campi.azienda, nome: campi.referente || "", ruolo: campi.ruolo || "", telefono: campi.telefono || "",
      email: campi.email || "", comune: campi.comune || "", servizio: campi.servizio || "", ore: campi["ore al mese"] || "",
      messaggio: campi.messaggio || "", fonte: fonteDaCanale(campi.canale), consenso: /^s[iì]/i.test(campi["consenso privacy"] || ""),
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

// Legge il CSV delle campagne (Meta Lead Ads, LinkedIn Lead Gen o un elenco simile)
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
  };
  return righe.slice(1).map((riga) => {
    const c = dividiRigaCsv(riga, sep);
    const v = (i) => (i >= 0 ? c[i] || "" : "");
    const nome = v(col.nome) || [v(col.nomeProprio), v(col.cognome)].filter(Boolean).join(" ");
    const azienda = v(col.azienda) || (nome ? "Contatto di " + nome : "");
    if (!azienda) return null;
    return { azienda, nome, ruolo: v(col.ruolo), telefono: v(col.telefono), email: v(col.email), comune: v(col.comune),
      servizio: "", ore: "", messaggio: "", fonte: fonteDaCanale(v(col.piattaforma), fontePredefinita), consenso: true };
  }).filter(Boolean);
}

// Mostra l'anteprima: ogni contatto con la sua fonte e l'eventuale doppione (escluso in automatico)
function mostraAnteprimaImportazione(contatti) {
  contattiDaImportare = contatti.map((x) => {
    const doppioni = possibiliDoppioni({ ragioneSociale: x.azienda, telefono: x.telefono, email: x.email });
    return { ...x, doppione: doppioni.length ? doppioni[0].azienda.ragioneSociale + " (" + doppioni[0].motivi.join(", ") + ")" : "" };
  });
  const nuovi = contattiDaImportare.filter((x) => !x.doppione).length;
  document.getElementById("anteprima-importa").innerHTML = contattiDaImportare.length ? `
    <div class="tabella-scorrevole"><table class="tabella">
      <thead><tr><th>Azienda</th><th>Referente</th><th>Canale</th><th>Esito</th></tr></thead>
      <tbody>${contattiDaImportare.map((x) => `<tr>
        <td>${esc(x.azienda)}</td><td>${esc(x.nome)}</td><td>${esc(x.fonte)}</td>
        <td>${x.doppione ? `<span class="chip chip-attenzione">Già presente: ${esc(x.doppione)}</span>` : '<span class="chip chip-ok">Nuovo</span>'}</td>
      </tr>`).join("")}</tbody>
    </table></div>
    <p class="nota-piccola">${nuovi} nuovi contatti da importare; quelli già presenti non vengono duplicati.</p>`
    : '<p class="vuoto">Nessun contatto riconosciuto: controlla il testo o il file.</p>';
  const pulsante = document.getElementById("pulsante-importa");
  pulsante.hidden = nuovi === 0;
  pulsante.textContent = "Importa " + nuovi + (nuovi === 1 ? " contatto" : " contatti");
}

// Crea aziende "Da qualificare" con referente, nota della richiesta e chiamata di qualifica
function importaContatti() {
  const nuovi = contattiDaImportare.filter((x) => !x.doppione);
  if (!nuovi.length) return;
  applica(() => {
    nuovi.forEach((x) => {
      const comune = CONFIG.comuni.find((c) => c.nome.toLowerCase() === String(x.comune).toLowerCase());
      const azienda = { id: nuovoId("az"), ragioneSociale: x.azienda, piva: "", settore: CONFIG.pilota.settore,
        comune: comune ? comune.nome : "Bari", fonte: x.fonte, note: "", creata: oggi() };
      stato.aziende.push(azienda);
      let referenteId = null;
      if (x.nome) {
        referenteId = nuovoId("rf");
        const privacy = x.consenso ? { ...privacyVuota("Consenso", oggi()), raccolta: "Modulo del sito" } : privacyVuota();
        stato.referenti.push({ id: referenteId, aziendaId: azienda.id, nome: x.nome, ruolo: x.ruolo,
          telefono: telefonoDaSalvare(x.telefono), email: x.email, canale: x.telefono ? "Telefono" : "Email", decisore: false, privacy });
      }
      const richiesta = [x.servizio && x.servizio !== "Da definire" ? x.servizio : "", x.ore ? "circa " + x.ore + " ore al mese" : "",
        x.comune && !comune ? "comune indicato: " + x.comune : "", x.messaggio].filter(Boolean).join(" · ");
      registraAttivita({ aziendaId: azienda.id, referenteId, tipo: "Nota", testo: "Richiesta arrivata da " + x.fonte + (richiesta ? ": " + richiesta : "") });
      registraAttivita({ aziendaId: azienda.id, referenteId, tipo: "Chiamata", testo: "Chiamare per qualificare la richiesta", data: traGiorni(1), daFare: true });
    });
  }, { messaggio: nuovi.length + (nuovi.length === 1 ? " contatto importato" : " contatti importati") + ": li trovi in Clienti come «Da qualificare»", vai: "clienti" });
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

GESTORI_MODULI["modulo-importa-canali"] = (modulo) => {
  const file = modulo.file.files[0];
  const daTesto = analizzaRichieste(modulo.testo.value);
  if (!file) return mostraAnteprimaImportazione(daTesto);
  const lettore = new FileReader();
  lettore.onload = () => mostraAnteprimaImportazione(daTesto.concat(analizzaCsvCampagne(lettore.result, modulo.canale.value)));
  lettore.readAsText(file);
};
