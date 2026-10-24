/*
 * PONTE CON IL GESTIONALE (PASSAGGIO 4, N5)
 * Il CRM non sostituisce il gestionale di Gate: scambia i dati con lui (o con un altro CRM) in CSV,
 * un file per tabella, con i nomi di campo del dizionario dati (gli stessi di data/gate.db) e codifica UTF-8.
 * Esporta: clienti, referenti, commerciali, opportunita, storico_fasi, offerte, canali.
 * Importa: gli stessi file; controlla tipi, valori ammessi e collegamenti, elenca le righe scartate con il motivo.
 * I dati importati SOSTITUISCONO quelli di lavoro (mai mescolati con quelli di esempio), dopo un backup automatico.
 * Stessa logica in Python: strumenti/ponte_gestionale.py (prova di andata e ritorno in generatore/controlla_dati.py).
 */

// Colonne di ogni tabella, nell'ordine del dizionario (prima le tabelle a cui le altre fanno riferimento)
const TABELLE_PONTE = {
  commerciali: ["id_commerciale", "nome", "tipo"],
  clienti: ["id_cliente", "nome", "settore", "provincia", "comune", "km_da_bari", "superficie_mq", "tipo_cliente"],
  referenti: ["id_referente", "id_cliente", "nome", "ruolo", "decisore", "email", "telefono", "base_giuridica", "modo_raccolta"],
  opportunita: ["id_opp", "id_cliente", "id_commerciale", "id_referente", "canale", "servizio", "fase", "valore_annuo", "margine_pct",
    "ore_mese_stimate", "data_contatto", "data_ultima_modifica", "data_chiusura", "motivo_perdita", "punteggio_coerenza", "classe_coerenza",
    "data_prima_risposta", "data_registrazione", "consenso_privacy", "campagna", "contenuto", "pagina_arrivo", "data_scadenza_contratto"],
  storico_fasi: ["id_evento", "id_opp", "fase", "data_ingresso"],
  offerte: ["id_offerta", "id_opp", "versione", "data_invio", "importo_annuo", "margine_pct_previsto", "esito", "data_esito", "firma_da_link", "pacchetto"],
  canali: ["canale", "tipo", "attivo", "gruppo", "nota"],
};
// Tabelle senza le quali l'import non parte
const TABELLE_OBBLIGATORIE = ["clienti", "referenti", "opportunita"];
// Colonne numeriche (le date sono quelle che iniziano con «data»)
const INTERI_PONTE = ["id_commerciale", "id_cliente", "id_referente", "id_opp", "id_evento", "id_offerta", "km_da_bari", "superficie_mq",
  "decisore", "punteggio_coerenza", "consenso_privacy", "versione", "firma_da_link", "attivo"];
const DECIMALI_PONTE = ["valore_annuo", "margine_pct", "ore_mese_stimate", "importo_annuo", "margine_pct_previsto"];

// Numero dentro un id dell'app: "c12" → 12, "az10005" → 10005, codice "GT-2026-301" → 301
function numeroId(id) {
  const m = String(id || "").match(/(\d+)$/);
  return m ? Number(m[1]) : null;
}

// ------------------------------------------------------------------- Esporta

// Le tabelle del dizionario a partire dallo stato dell'app
function tabelleDaStato() {
  const tutte = stato.opportunita;
  const vuoto = (v) => (v === "" || v === undefined ? null : v);
  // Commerciali: quelli del database più i responsabili nuovi (es. chi lavora con il CRM)
  const commerciali = righeDb("commerciali").map((c) => ({ ...c }));
  tutte.concat(stato.contratti || []).map((o) => o.responsabile).filter(Boolean).forEach((nome) => {
    if (!commerciali.some((c) => c.nome === nome)) commerciali.push({ id_commerciale: Math.max(0, ...commerciali.map((c) => c.id_commerciale)) + 1, nome, tipo: "interno" });
  });
  const idCommerciale = (nome) => (commerciali.find((c) => c.nome === nome) || {}).id_commerciale ?? null;
  const clienti = stato.aziende.map((a) => {
    const c = CONFIG.comuni.find((x) => x.nome === a.comune) || {};   // comune fuori elenco: provincia e km vuoti
    return { id_cliente: numeroId(a.id), nome: a.ragioneSociale, settore: vuoto(a.settore), provincia: c.provincia || null, comune: vuoto(a.comune),
      km_da_bari: Number.isFinite(c.km) ? c.km : null, superficie_mq: a.superficie ?? null, tipo_cliente: a.tipoCliente || "privato" };
  });
  const referenti = stato.referenti.map((r) => ({ id_referente: numeroId(r.id), id_cliente: numeroId(r.aziendaId), nome: r.nome, ruolo: vuoto(r.ruolo),
    decisore: r.decisore ? 1 : 0, email: vuoto(r.email), telefono: vuoto(r.telefono), base_giuridica: r.privacy.base, modo_raccolta: vuoto(r.privacy.raccolta) }));
  const storico = [], offerte = [];
  const opportunita = tutte.map((o) => {
    const p = calcolaPunteggio(o, tutte);
    const fase = faseAttuale(o);
    const date = Object.values(o.storico).concat(o.perso ? [o.perso.data] : []).sort();
    const id = numeroId(o.codice);
    CONFIG.fasi.forEach((f) => { if (o.storico[f.id]) storico.push({ id_evento: storico.length + 1, id_opp: id, fase: f.id, data_ingresso: o.storico[f.id] }); });
    if (o.perso) storico.push({ id_evento: storico.length + 1, id_opp: id, fase: "perso", data_ingresso: o.perso.data });
    if (o.storico.offerta) {
      const esito = o.storico.contratto && !o.perso ? "firmata" : o.perso ? (o.perso.motivo === "nessuna risposta" ? "scaduta" : "rifiutata") : "aperta";
      offerte.push({ id_offerta: offerte.length + 1, id_opp: id, versione: 1, data_invio: o.storico.offerta, importo_annuo: Math.round(valoreAnnuo(o) * 100) / 100,
        margine_pct_previsto: Math.round(marginePercentuale(o, tutte) * 1000) / 1000, esito,
        data_esito: esito === "firmata" ? o.storico.contratto : o.perso ? o.perso.data : null, firma_da_link: o.firmaDaLink ? 1 : 0,
        pacchetto: (o.preventivo && o.preventivo.pacchetto) || null });
    }
    return { id_opp: id, id_cliente: numeroId(o.aziendaId), id_commerciale: idCommerciale(o.responsabile), id_referente: o.referenteId ? numeroId(o.referenteId) : null,
      canale: vuoto(o.canale), servizio: o.servizio, fase, valore_annuo: Math.round(valoreAnnuo(o) * 100) / 100,
      margine_pct: Math.round(marginePercentuale(o, tutte) * 1000) / 1000, ore_mese_stimate: o.ore, data_contatto: o.storico.contatto,
      data_ultima_modifica: date[date.length - 1], data_chiusura: o.perso ? o.perso.data : o.storico.contratto || null, motivo_perdita: o.perso ? o.perso.motivo : null,
      punteggio_coerenza: p.totale, classe_coerenza: p.classe, data_prima_risposta: o.dataPrimaRisposta || null, data_registrazione: o.dataRegistrazione || null,
      consenso_privacy: o.consensoPrivacy ? 1 : 0, campagna: vuoto(o.campagna), contenuto: vuoto(o.contenuto), pagina_arrivo: vuoto(o.paginaArrivo),
      data_scadenza_contratto: scadenzaContratto(o) };
  });
  const canali = CONFIG.canali.map((c) => ({ canale: c.canale, tipo: c.tipo, attivo: c.attivo ? 1 : 0, gruppo: c.gruppo, nota: c.nota || null }));
  return { commerciali, clienti, referenti, opportunita, storico_fasi: storico, offerte, canali };
}

// Testo CSV di una tabella: virgola, virgolette solo se servono, celle vuote per i valori mancanti, a capo Windows
function csvPonte(nome, righe) {
  const cella = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [TABELLE_PONTE[nome].join(",")].concat(righe.map((r) => TABELLE_PONTE[nome].map((c) => cella(r[c])).join(","))).join("\r\n") + "\r\n";
}

// Scarica un CSV (o tutti, uno dopo l'altro: il browser può chiedere il permesso per più download)
function esportaPonte(nome) {
  const tabelle = tabelleDaStato();
  const nomi = nome ? [nome] : Object.keys(TABELLE_PONTE);
  nomi.forEach((n, i) => setTimeout(() => scaricaFile("gate-" + n + "-" + oggi() + ".csv", csvPonte(n, tabelle[n]), "text/csv;charset=utf-8"), i * 350));
  mostraAvviso(nome ? "File " + nome + " scaricato" : nomi.length + " file CSV in download");
}

// ------------------------------------------------------------------- Importa

// Legge un CSV (virgola o punto e virgola; virgolette anche su più righe) in un elenco di righe di celle
function leggiCsvPonte(testo) {
  const t = String(testo || "").replace(/^﻿/, "");
  const prima = t.split(/\r?\n/, 1)[0];
  const sep = (prima.match(/;/g) || []).length > (prima.match(/,/g) || []).length ? ";" : ",";
  const righe = [];
  let riga = [], cella = "", virgolette = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (virgolette) {
      if (c === '"' && t[i + 1] === '"') { cella += '"'; i++; }
      else if (c === '"') virgolette = false;
      else cella += c;
    } else if (c === '"') virgolette = true;
    else if (c === sep) { riga.push(cella); cella = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      riga.push(cella); cella = "";
      if (riga.some((x) => x.trim() !== "")) righe.push(riga);
      riga = [];
    } else cella += c;
  }
  if (cella !== "" || riga.length) { riga.push(cella); if (riga.some((x) => x.trim() !== "")) righe.push(riga); }
  return righe;
}

// Tabella di un file dalla sua intestazione (la tabella che ne riconosce più colonne, con tutte le chiavi)
function tabellaDiIntestazione(intestazione) {
  const colonne = intestazione.map((h) => h.trim().toLowerCase());
  const candidate = Object.entries(TABELLE_PONTE).filter(([, c]) => colonne.includes(c[0]) && c.filter((x) => x.startsWith("id_")).every((x) => colonne.includes(x)))
    .map(([nome, c]) => ({ nome, trovate: c.filter((x) => colonne.includes(x)).length }))
    .sort((a, b) => b.trovate - a.trovate);
  return candidate.length ? candidate[0].nome : null;
}

// Valore di una cella convertito nel tipo della colonna; { errore } se non è valido
function valorePonte(colonna, testo) {
  const s = String(testo ?? "").trim();
  if (s === "") return { valore: null };
  if (INTERI_PONTE.includes(colonna)) return /^-?\d+$/.test(s) ? { valore: Number(s) } : { errore: colonna + " non è un numero intero: «" + s + "»" };
  if (DECIMALI_PONTE.includes(colonna)) {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? { valore: n } : { errore: colonna + " non è un numero: «" + s + "»" };
  }
  if (colonna.startsWith("data")) return formattaData(s) && !Number.isNaN(Date.parse(s)) ? { valore: s } : { errore: colonna + " non è una data AAAA-MM-GG: «" + s + "»" };
  return { valore: s };
}

// Controlla i file letti: tipi, valori ammessi e collegamenti tra tabelle. Restituisce tabelle valide, righe scartate e problemi gravi
function controllaPonte(file) {
  const tabelle = {}, scartate = [], problemi = [];
  // Valori ammessi per tabella e colonna (dizionari di config.js; i canali anche quelli del file canali, se c'è)
  const fasi = CONFIG.fasi.map((f) => f.id).concat("perso");
  const fileCanali = file.find((x) => x.tabella === "canali");
  const canali = CONFIG.canali.map((c) => c.canale).concat(fileCanali ? fileCanali.righe.slice(1).map((r) => (r[0] || "").trim()) : []);
  const ammessi = {
    commerciali: { tipo: ["interno", "intermediario", "esterno"] },
    clienti: { settore: CONFIG.settori, tipo_cliente: ["privato", "pubblico"] },
    referenti: { base_giuridica: CONFIG.basiGiuridiche },
    opportunita: { canale: canali, servizio: Object.keys(CONFIG.servizi), fase: fasi, motivo_perdita: CONFIG.motiviPerdita },
    storico_fasi: { fase: fasi },
    offerte: { esito: ["aperta", "firmata", "rifiutata", "scaduta"], pacchetto: CONFIG.preventivo.pacchetti.map((p) => p.nome) },
    canali: { tipo: ["digitale", "diretto", "intermediato", "gara"] },
  };
  const siNo = ["decisore", "consenso_privacy", "firma_da_link", "attivo"];
  const obbligatorie = { commerciali: ["nome"], clienti: ["nome"], referenti: ["id_cliente", "nome", "base_giuridica"], opportunita: ["id_cliente", "servizio", "fase", "data_contatto"],
    storico_fasi: ["id_opp", "fase", "data_ingresso"], offerte: ["id_opp", "data_invio"], canali: ["tipo"] };
  // Prima le tabelle a cui le altre fanno riferimento
  Object.keys(TABELLE_PONTE).forEach((nome) => {
    const f = file.find((x) => x.tabella === nome);
    if (!f) return;
    const intestazione = f.righe[0].map((h) => h.trim().toLowerCase());
    const chiave = TABELLE_PONTE[nome][0];
    const visti = new Set();
    tabelle[nome] = [];
    f.righe.slice(1).forEach((celle, i) => {
      const n = i + 2;   // numero di riga nel file (la prima è l'intestazione)
      const riga = {};
      const errori = [];
      TABELLE_PONTE[nome].forEach((c) => {
        const k = intestazione.indexOf(c);
        const v = valorePonte(c, k >= 0 ? celle[k] : "");
        if (v.errore) errori.push(v.errore);
        riga[c] = v.valore ?? null;
      });
      if (riga[chiave] === null) errori.push(chiave + " mancante");
      else if (visti.has(riga[chiave])) errori.push(chiave + " " + riga[chiave] + " ripetuto");
      (obbligatorie[nome] || []).forEach((c) => { if (riga[c] === null && !errori.some((e) => e.startsWith(c))) errori.push(c + " mancante"); });
      Object.entries(ammessi[nome] || {}).forEach(([c, valori]) => {
        if (riga[c] != null && !valori.includes(riga[c])) errori.push(c + " non ammesso: «" + riga[c] + "»");
      });
      siNo.forEach((c) => { if (riga[c] != null && ![0, 1].includes(riga[c])) errori.push(c + " deve essere 0 o 1"); });
      // Collegamenti con le tabelle già lette
      const esiste = (tab, campo, valore) => (tabelle[tab] || []).some((r) => r[campo] === valore);
      if (nome === "referenti" && riga.id_cliente !== null && !esiste("clienti", "id_cliente", riga.id_cliente)) errori.push("cliente " + riga.id_cliente + " inesistente");
      if (nome === "opportunita") {
        if (riga.id_cliente !== null && !esiste("clienti", "id_cliente", riga.id_cliente)) errori.push("cliente " + riga.id_cliente + " inesistente");
        if (riga.id_referente !== null && !esiste("referenti", "id_referente", riga.id_referente)) errori.push("referente " + riga.id_referente + " inesistente");
        if (riga.id_commerciale !== null && tabelle.commerciali && !esiste("commerciali", "id_commerciale", riga.id_commerciale)) errori.push("commerciale " + riga.id_commerciale + " inesistente");
        if (riga.fase === "perso" && !riga.motivo_perdita) errori.push("trattativa persa senza motivo");
        if (riga.margine_pct !== null && (riga.margine_pct < 0 || riga.margine_pct > 1)) errori.push("margine_pct fuori da 0-1");
      }
      if (["storico_fasi", "offerte"].includes(nome) && riga.id_opp !== null && !esiste("opportunita", "id_opp", riga.id_opp)) errori.push("opportunità " + riga.id_opp + " inesistente");
      if (errori.length) scartate.push({ tabella: nome, riga: n, motivo: errori.join("; ") });
      else {
        visti.add(riga[chiave]);
        tabelle[nome].push(riga);
      }
    });
  });
  TABELLE_OBBLIGATORIE.forEach((nome) => { if (!file.some((x) => x.tabella === nome)) problemi.push("manca il file della tabella " + nome); });
  file.filter((x) => !x.tabella).forEach((x) => problemi.push("«" + x.nome + "»: intestazione non riconosciuta"));
  return { tabelle, scartate, problemi };
}

// Stato dell'app dalle tabelle importate; senza storico_fasi le date delle fasi si ricostruiscono dall'opportunità
function statoDaPonte(t) {
  const storico = (t.storico_fasi || []).slice();
  t.opportunita.forEach((o) => {
    if (storico.some((s) => s.id_opp === o.id_opp)) return;
    storico.push({ id_opp: o.id_opp, fase: "contatto", data_ingresso: o.data_contatto });
    if (o.fase !== "contatto") storico.push({ id_opp: o.id_opp, fase: o.fase, data_ingresso: o.data_chiusura || o.data_ultima_modifica || o.data_contatto });
  });
  const nuovo = statoDaTabelle({ ...t, storico_fasi: storico, attivita: [], contratti_in_corso: [] }, oggi(), 0);
  // Le richieste reali importate dal CSV a 7 colonne restano; il registro continua
  return { ...nuovo, richiesteReali: stato.richiesteReali || [], registro: stato.registro || [] };
}

// --------------------------------------------------------------- Finestra

let ponteInAttesa = null;   // dati controllati, in attesa della conferma

// Finestra «Carica dal gestionale»: controlla i CSV del gestionale prima di sostituire i dati (lo scarico è in Documenti)
function apriPonte() {
  ponteInAttesa = null;
  apriFinestra(`
    <form class="modulo" id="modulo-ponte" novalidate>
      <div>
        <h2>Carica dal gestionale</h2>
        <p class="nota-piccola">Un file CSV per tabella, con i nomi di campo del dizionario dati (UTF-8), dal gestionale di Gate o da un altro CRM.</p>
      </div>
      <label>File CSV del gestionale (anche più file insieme) <input type="file" name="file" accept=".csv,text/csv" multiple></label>
      <p class="nota-piccola">Servono almeno clienti, referenti e opportunita. I dati importati sostituiscono quelli di lavoro: prima si scarica un backup.</p>
      <div id="anteprima-ponte" aria-live="polite"></div>
      <div class="azioni-finestra">
        <button class="pulsante secondario" type="button" data-azione="chiudi">Chiudi</button>
        <button class="pulsante secondario" type="submit">Controlla i file</button>
        <button class="pulsante primario" type="button" data-azione="conferma-ponte" id="pulsante-ponte" hidden>Sostituisci i dati</button>
      </div>
    </form>`, { larga: true });
}

// Legge i file scelti e mostra cosa si importerebbe e cosa viene scartato (e perché)
function analizzaPonte(modulo) {
  const scelti = [...modulo.file.files];
  if (!scelti.length) return segnalaCampo(modulo.file, "Scegli i file CSV");
  Promise.all(scelti.map((f) => f.text().then((testo) => {
    const righe = leggiCsvPonte(testo);
    return { nome: f.name, righe, tabella: righe.length ? tabellaDiIntestazione(righe[0]) : null };
  }))).then((file) => {
    const esito = controllaPonte(file);
    const box = document.getElementById("anteprima-ponte");
    const valido = !esito.problemi.length && TABELLE_OBBLIGATORIE.every((n) => (esito.tabelle[n] || []).length);
    box.innerHTML = `
      <table class="tabella"><thead><tr><th>Tabella</th><th class="num">Righe valide</th><th class="num">Scartate</th></tr></thead>
        <tbody>${Object.keys(TABELLE_PONTE).filter((n) => esito.tabelle[n]).map((n) => `<tr><td>${n}</td><td class="num">${esito.tabelle[n].length}</td>
          <td class="num">${esito.scartate.filter((s) => s.tabella === n).length}</td></tr>`).join("")}</tbody></table>
      ${esito.problemi.map((p) => `<p class="avviso-margine">${icona("attenzione")} ${esc(p)}</p>`).join("")}
      ${esito.scartate.length ? `<details class="approfondimento" open><summary>Righe scartate <span class="conteggio">${esito.scartate.length}</span></summary>
        <ul class="elenco-semplice">${esito.scartate.slice(0, 40).map((s) => `<li>${esc(s.tabella)}, riga ${s.riga}: ${esc(s.motivo)}</li>`).join("")}
        ${esito.scartate.length > 40 ? `<li>… e altre ${esito.scartate.length - 40}</li>` : ""}</ul></details>` : ""}`;
    ponteInAttesa = valido ? esito.tabelle : null;
    const pulsante = document.getElementById("pulsante-ponte");
    pulsante.hidden = !valido;
    pulsante.textContent = "Sostituisci i dati: " + (valido ? quanti(esito.tabelle.opportunita.length, "opportunità", "opportunità") : "");
  });
}

// Conferma: scarica il backup dei dati attuali e li sostituisce con quelli del gestionale (si può annullare)
function confermaPonte() {
  if (!ponteInAttesa) return;
  const tabelle = ponteInAttesa;
  esportaBackup();
  applica(() => {
    stato = statoDaPonte(tabelle);
  }, { messaggio: "Dati del gestionale importati: " + tabelle.clienti.length + " clienti, " + tabelle.opportunita.length + " opportunità (backup dei dati precedenti scaricato)",
    vai: "oggi", fase: "contatto", permesso: "delicate" });
  ponteInAttesa = null;
}

Object.assign(AZIONI_CLIENTI, {
  ponte: () => apriPonte(),
  "esporta-ponte": (el) => esportaPonte(el.dataset.id || null),
  "conferma-ponte": () => confermaPonte(),
});
GESTORI_MODULI["modulo-ponte"] = analizzaPonte;
