/*
 * RICHIESTA DA NOTA (PASSAGGIO 4, N1)
 * Chi risponde al telefono scrive una nota libera, oppure la detta con il microfono della tastiera del telefono
 * o del computer (la dettatura avviene fuori dal browser: nessun audio passa dal CRM).
 * L'assistente propone i campi con regole leggibili (CONFIG.assistente): per ogni campo il valore, la frase da cui
 * viene e uno stato (sicuro, da controllare, mancante). Niente intelligenza artificiale e niente si salva da solo:
 * l'opportunità nasce solo con «Conferma e registra». I secondi tra l'apertura della nota e la conferma si salvano (N3).
 */

const STATI_CAMPO = {
  sicuro: { testo: "sicuro", classe: "chip-ok" },
  controllare: { testo: "da controllare", classe: "chip-attenzione" },
  mancante: { testo: "mancante", classe: "chip-critico" },
  corretto: { testo: "corretto da te", classe: "chip-info" },
};

// Campi della scheda: nome, etichetta, tipo (gli ultimi due non sono tra i 9 campi della prova N1.6)
const CAMPI_NOTA = [
  ["azienda", "Azienda *", "testo"], ["comune", "Comune", "comuni"], ["settore", "Settore", "settori"], ["mq", "Metri quadri", "numero"],
  ["ambiente", "Tipo di ambienti", "ambienti"], ["frequenza", "Frequenza", "frequenze"], ["canale", "Canale *", "canali"],
  ["ruolo", "Ruolo del referente", "testo"], ["telefono", "Telefono", "testo"], ["email", "Email", "testo"],
  ["nome", "Nome del referente", "testo"], ["servizio", "Servizio *", "servizi"], ["ore", "Ore al mese", "numero"],
];

// Espressione regolare di una parola chiave: parola intera, oppure inizio di parola se finisce con *
function regolaParola(parola) {
  const inizio = parola.endsWith("*");
  const testo = (inizio ? parola.slice(0, -1) : parola).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(?<![\\p{L}\\d])" + testo + (inizio ? "" : "(?![\\p{L}\\d])"), "giu");
}

// Tutte le occorrenze delle parole chiave nel testo: [{ parola, indice, fine }]
function trovaParole(testo, parole) {
  return parole.flatMap((p) => [...testo.matchAll(regolaParola(p))].map((m) => ({ parola: p, indice: m.index, fine: m.index + m[0].length })));
}

// Brano della nota attorno alla posizione indicata, dentro la sua frase (per mostrare da dove viene un valore)
function fraseDi(testo, indice) {
  const fini = [...testo.matchAll(/[.!?]+\s+(?=[A-ZÀ-Ý])|\n+/g)].map((m) => m.index + m[0].length);
  const inizio = Math.max(0, ...fini.filter((f) => f <= indice), indice - 25);
  const fine = Math.min(testo.length, ...fini.filter((f) => f > indice), indice + 55);
  const brano = testo.slice(inizio, fine).trim().replace(/^\S*\s/, (x) => (inizio > 0 && inizio === indice - 25 ? "" : x)).replace(/\s\S*$/, (x) => (fine === indice + 55 ? "" : x));
  return (inizio === indice - 25 && inizio > 0 ? "…" : "") + brano + (fine === indice + 55 && fine < testo.length ? "…" : "");
}

// Campo proposto: valore, frase da cui viene e stato
function campo(valore, testo, indice, stato) {
  return valore === "" || valore == null ? { valore: "", frase: "", stato: "mancante" } : { valore, frase: fraseDi(testo, indice), stato };
}

// Parole con l'iniziale maiuscola che seguono una posizione (il nome dell'azienda); si fermano a «di», «a», virgole e punti
function paroleNome(testo, da) {
  const parole = [];
  let resto = testo.slice(da);
  for (;;) {
    const m = resto.match(/^\s+([^\s,;:()]+)/);
    if (!m || !/^([A-ZÀ-Ý0-9]|&$)/.test(m[1])) break;
    const parola = m[1].length > 1 && /\.$/.test(m[1]) && !/\..*\./.test(m[1]) ? m[1].slice(0, -1) : m[1];
    parole.push(parola);
    if (parola !== m[1]) break;   // il punto chiude il nome
    resto = resto.slice(m[0].length);
  }
  return parole;
}

// Azienda: dopo «azienda», «ditta», «società» oppure un prefisso che fa parte del nome («Studio Legale», «Hotel»...)
function estraiAzienda(testo, a) {
  const candidati = [];
  const visti = new Set();
  [...a.prefissi].sort((x, y) => y.length - x.length).forEach((prefisso) => {
    trovaParole(testo, [prefisso]).forEach((t) => {
      if ([...visti].some((v) => t.indice >= v[0] && t.indice < v[1])) return;   // già dentro un prefisso più lungo
      const parole = paroleNome(testo, t.fine);
      if (!parole.length) return;
      visti.add([t.indice, t.fine]);
      candidati.push({ valore: prefisso + " " + parole.join(" "), indice: t.indice });
    });
  });
  trovaParole(testo, a.introducono).forEach((t) => {
    const parole = paroleNome(testo, t.fine);
    if (parole.length) candidati.push({ valore: parole.join(" "), indice: t.indice });
  });
  if (candidati.length) {
    const primo = candidati.sort((x, y) => x.indice - y.indice)[0];
    return campo(primo.valore, testo, primo.indice, "sicuro");
  }
  // Poi: un nome dopo «della», «del», «presso», «per conto di» (anche una sigla come «LUM»), se non è un comune
  const dopo = [...testo.matchAll(/(?<![\p{L}])(?:dell[ao]|dell'|del|presso(?:\s+la|\s+il|\s+lo)?|per conto (?:di|della|del))\s*(?=[A-ZÀ-Ý])/gu)]
    .map((m) => ({ parole: paroleNome(testo, m.index + m[0].length - 1), indice: m.index }))
    .filter((x) => x.parole.length && !CONFIG.comuni.some((c) => c.nome === x.parole.join(" ")));
  if (dopo.length) return campo(dopo[0].parole.join(" "), testo, dopo[0].indice, "controllare");
  // Ultima possibilità: due parole maiuscole di seguito a metà frase (da controllare: potrebbe essere una persona)
  const m = testo.match(/(?<=[a-zà-ÿ,]\s)([A-ZÀ-Ý][\p{L}'&]+\s+[A-ZÀ-Ý][\p{L}'&]+)/u);
  return m ? campo(m[1], testo, m.index, "controllare") : campo("", testo, 0);
}

// Valore con più parole chiave trovate (settore, tipo di ambienti); se ne vincono più d'uno, «da controllare»
function estraiPerParole(testo, gruppi) {
  const conteggi = Object.entries(gruppi).map(([valore, parole]) => ({ valore, trovate: trovaParole(testo, parole) })).filter((g) => g.trovate.length);
  if (!conteggi.length) return campo("", testo, 0);
  conteggi.sort((x, y) => y.trovate.length - x.trovate.length || Math.min(...x.trovate.map((t) => t.indice)) - Math.min(...y.trovate.map((t) => t.indice)));
  const primo = conteggi[0];
  return campo(primo.valore, testo, Math.min(...primo.trovate.map((t) => t.indice)), conteggi.length === 1 ? "sicuro" : "controllare");
}

// Comune: dalla lista dei comuni (il nome più lungo vince: «Mola di Bari» non è «Bari»)
function estraiComune(testo) {
  const trovati = [];
  [...CONFIG.comuni].sort((x, y) => y.nome.length - x.nome.length).forEach((c) => {
    trovaParole(testo, [c.nome]).forEach((t) => {
      if (!trovati.some((x) => t.indice < x.fine && t.fine > x.indice)) trovati.push({ ...t, nome: c.nome });
    });
  });
  if (!trovati.length) return comuneSimile(testo);
  const primo = trovati.sort((x, y) => x.indice - y.indice)[0];
  return campo(primo.nome, testo, primo.indice, new Set(trovati.map((t) => t.nome)).size === 1 ? "sicuro" : "controllare");
}

// Lettere da cambiare per passare da una parola all'altra (distanza di Levenshtein)
function distanza(a, b) {
  let riga = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const nuova = [i];
    for (let j = 1; j <= b.length; j++) nuova[j] = Math.min(riga[j] + 1, nuova[j - 1] + 1, riga[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    riga = nuova;
  }
  return riga[b.length];
}

// Comune scritto con un errore di battitura («casamssima»): 1 lettera sbagliata fino a 7 lettere, 2 oltre (da controllare)
function comuneSimile(testo) {
  const parole = [...testo.matchAll(/[\p{L}']+/gu)];
  for (const c of CONFIG.comuni) {
    const n = c.nome.split(/\s+/).length;
    for (let i = 0; i + n <= parole.length; i++) {
      const gruppo = parole.slice(i, i + n).map((m) => m[0]).join(" ").toLowerCase();
      const d = distanza(gruppo, c.nome.toLowerCase());
      if (d > 0 && gruppo.length >= 5 && d <= (c.nome.length > 7 ? 2 : 1)) return campo(c.nome, testo, parole[i].index, "controllare");
    }
  }
  return campo("", testo, 0);
}

// Ore al mese: «300 ore al mese», «40 ore mensili»
function estraiOre(testo) {
  const m = testo.match(/(\d{1,4})\s*ore\s*(?:(?:al|a|per|ogni)\s+mese|mensili)/i);
  return m ? campo(Number(m[1]), testo, m.index, "sicuro") : campo("", testo, 0);
}

// Metri quadri: numero seguito da «mq», «m2» o «metri» (anche «1.200 metri quadri»)
function estraiMq(testo) {
  const m = testo.match(/(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?)\s*(?:mq|m2|m²|metri)(?![\p{L}\d])/iu);
  return m ? campo(Number(m[1].replace(/\./g, "").replace(",", ".")), testo, m.index, "sicuro") : campo("", testo, 0);
}

// Frequenza: «N volte a settimana», «settimanale», «tutti i giorni» (da controllare), «a giorni alterni» (da controllare)
function estraiFrequenza(testo, a) {
  const numeri = { una: 1, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6 };
  const nome = (n) => (n === 1 ? "1 volta a settimana" : n + " volte a settimana");
  let m = testo.match(/(\d|una|uno|due|tre|quattro|cinque|sei)\s+volt[ae]\s+(?:a|alla|per|in|ogni)\s+settimana/i);
  if (m) {
    const n = Number(m[1]) || numeri[m[1].toLowerCase()];
    if (CONFIG.preventivo.frequenze.some((f) => f.nome === nome(n))) return campo(nome(n), testo, m.index, "sicuro");
  }
  if ((m = testo.match(/settimanal|ogni settimana/i))) return campo(nome(1), testo, m.index, "sicuro");
  if ((m = testo.match(/tutti i giorni|ogni giorno|giornalier|quotidian/i))) return campo(a.frequenzaGiornaliera, testo, m.index, "controllare");
  if ((m = testo.match(/giorni alterni/i))) return campo(a.frequenzaGiorniAlterni, testo, m.index, "controllare");
  return campo("", testo, 0);
}

// Canale: prima la frase «ci ha conosciuti tramite…», poi le parole chiave, infine «ha chiamato» (telefono, da controllare)
function estraiCanale(testo, a) {
  const canaleIn = (parte) => a.canali.find(([, parole]) => trovaParole(parte, parole).length);
  const frase = testo.match(/(?:conosc\p{L}*|trovat[oiae]|sentito\s+parlare\s+di\s+noi|arrivat[oiae])\s+(?:tramite|attraverso|grazie\s+a|da|su|sul|sulla|via|con)\s+([^.;\n]{1,60})/iu);
  if (frase && canaleIn(frase[1])) return campo(canaleIn(frase[1])[0], testo, frase.index, "sicuro");
  const trovati = a.canali.map(([canale, parole]) => ({ canale, trovate: trovaParole(testo, parole) })).filter((c) => c.trovate.length);
  if (trovati.length) return campo(trovati[0].canale, testo, trovati[0].trovate[0].indice, trovati.length === 1 ? "sicuro" : "controllare");
  const telefono = trovaParole(testo, a.canaleTelefono);
  return telefono.length ? campo("telefono", testo, telefono[0].indice, "controllare") : campo("", testo, 0);
}

// Ruolo del referente: il primo ruolo della lista citato nella nota (a parità di posizione il più lungo)
function estraiRuolo(testo, a) {
  const trovati = trovaParole(testo, a.ruoli).sort((x, y) => x.indice - y.indice || (y.fine - y.indice) - (x.fine - x.indice));
  return trovati.length ? { ...campo(trovati[0].parola, testo, trovati[0].indice, "sicuro"), fine: trovati[0].fine } : campo("", testo, 0);
}

// Nome del referente: dopo un titolo («dott.ssa»), dopo «Referente:» o subito dopo il ruolo («il direttore, Giorgio Lamanna»)
function estraiNome(testo, a, ruolo) {
  const nomeProprio = "([A-ZÀ-Ý][\\p{L}']+(?:\\s+[A-ZÀ-Ý][\\p{L}']+)?)";
  for (const titolo of a.titoli) {
    const m = testo.match(new RegExp("(?<![\\p{L}])" + titolo.replace(/\./g, "\\.") + "\\s+" + nomeProprio, "iu"));
    if (m && /^[A-ZÀ-Ý]/.test(m[1])) return campo(maiuscola(titolo) + " " + m[1], testo, m.index, "sicuro");
  }
  let m = testo.match(new RegExp("referente:?\\s+" + nomeProprio, "iu"));
  if (m && /^[A-ZÀ-Ý]/.test(m[1])) return campo(m[1], testo, m.index, "sicuro");
  if (ruolo.fine && (m = testo.slice(ruolo.fine).match(new RegExp("^\\s*,?\\s*" + nomeProprio, "u")))) return campo(m[1], testo, ruolo.fine, "controllare");
  return campo("", testo, 0);
}

// Tutti i campi proposti per una nota
function estraiNota(testo) {
  const a = CONFIG.assistente;
  const t = String(testo || "");
  const telefono = t.match(/(?:\+39[\s.]?)?(?:3\d{2}|0\d{1,3})(?:[\s./-]?\d){6,8}(?!\d)/);
  const email = t.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
  const settore = estraiPerParole(t, a.settori);
  const ruolo = estraiRuolo(t, a);
  const servizio = a.servizioPerSettore[settore.valore];
  const servizioNota = estraiPerParole(t, a.servizi);
  return {
    azienda: estraiAzienda(t, a), comune: estraiComune(t), settore, mq: estraiMq(t), ambiente: estraiPerParole(t, a.ambienti),
    frequenza: estraiFrequenza(t, a), canale: estraiCanale(t, a), ruolo: { valore: ruolo.valore, frase: ruolo.frase, stato: ruolo.stato },
    telefono: telefono ? campo(telefono[0].trim(), t, telefono.index, "sicuro") : campo("", t, 0),
    email: email ? campo(email[0], t, email.index, "sicuro") : campo("", t, 0),
    nome: estraiNome(t, a, ruolo),
    servizio: servizioNota.valore ? servizioNota : servizio ? { valore: servizio, frase: "proposto dal settore", stato: "controllare" } : campo("", t, 0),
    ore: estraiOre(t),
    // Tutti i servizi citati: se sono più di uno, alla conferma nasce una trattativa per ciascuno
    serviziTrovati: Object.entries(a.servizi).filter(([, parole]) => trovaParole(t, parole).length).map(([nome]) => nome),
  };
}

// Confronto con il risultato atteso di una nota di prova: 9 campi (telefono ed email contano insieme come «recapiti»)
function controllaNota(nota) {
  const c = estraiNota(nota.testo);
  const cifre = (x) => String(x || "").replace(/\D/g, "");
  const prove = {
    azienda: c.azienda.valore === nota.atteso.azienda, comune: c.comune.valore === nota.atteso.comune, settore: c.settore.valore === nota.atteso.settore,
    mq: c.mq.valore === nota.atteso.mq, ambiente: c.ambiente.valore === nota.atteso.ambiente, frequenza: c.frequenza.valore === nota.atteso.frequenza,
    canale: c.canale.valore === nota.atteso.canale, ruolo: c.ruolo.valore === nota.atteso.ruolo,
    recapiti: cifre(c.telefono.valore) === nota.atteso.telefono && c.email.valore === nota.atteso.email,
  };
  const errori = Object.keys(prove).filter((k) => !prove[k]).map((k) => k + ": «" + (k === "recapiti" ? c.telefono.valore + " " + c.email.valore : c[k].valore) + "»");
  return { corretti: Object.values(prove).filter(Boolean).length, totale: 9, errori };
}

// ------------------------------------------------------------ Scheda della nota

let notaAperta = null;   // { inizio (ms), timer }: il cronometro parte all'apertura della nota

// Apre la finestra «Nuova richiesta da nota» e fa partire il cronometro
function apriNota() {
  if (notaAperta) clearInterval(notaAperta.timer);
  notaAperta = { inizio: Date.now(), timer: setInterval(aggiornaCronometro, 1000) };
  apriFinestra(`
    <form class="modulo" id="modulo-nota" novalidate>
      <div>
        <h2>Nuova richiesta da nota</h2>
        <p class="nota-piccola">Scrivi la nota della telefonata o dell'incontro, oppure dettala con il microfono della tastiera del telefono o del computer.
          Mentre scrivi, l'assistente propone i campi con regole: tu controlli, correggi e confermi.</p>
      </div>
      <label>Nota *
        <textarea name="nota" rows="5" required placeholder="Es. Ha chiamato la titolare dello Studio Rossi di Bari: uffici di 200 mq, pulizia 2 volte a settimana, ci ha conosciuti tramite LinkedIn, 333 000 0000"></textarea>
      </label>
      <div class="azioni-nota">
        <label class="esempio-nota">Oppure prova un esempio
          <select name="esempio"><option value="">Scegli una nota di esempio</option>
            ${CONFIG.assistente.noteDiProva.map((n, i) => `<option value="${i}">Esempio ${i + 1}: ${esc(accorcia(n.testo, 48))}</option>`).join("")}
          </select>
        </label>
        <button class="pulsante secondario" type="button" data-azione="leggi-nota">Leggi la nota</button>
        <button class="pulsante-testo positivo" type="button" data-azione="nuovo">Preferisci il modulo completo? Nuovo contatto</button>
      </div>
      <div id="campi-nota" aria-live="polite"></div>
      <div class="azioni-finestra">
        <span class="cronometro" id="cronometro-nota" title="Secondi dall'apertura della nota">0 s</span>
        <button class="pulsante secondario" type="button" data-azione="chiudi">Annulla</button>
        <button class="pulsante primario" type="submit" id="conferma-nota" hidden>Conferma e registra</button>
      </div>
    </form>`, { larga: true });
}

// Secondi passati dall'apertura della nota
function secondiNota() {
  return notaAperta ? Math.round((Date.now() - notaAperta.inizio) / 1000) : 0;
}

// Aggiorna il cronometro; si ferma da solo quando la finestra è chiusa
function aggiornaCronometro() {
  const el = document.getElementById("cronometro-nota");
  if (!el) {
    if (notaAperta) clearInterval(notaAperta.timer);
    return;
  }
  el.textContent = secondiNota() + " s";
}

// Opzioni di un elenco a discesa, con il valore proposto selezionato (vuota se manca)
function opzioniNota(tipo, valore) {
  if (tipo === "canali") return '<option value="">Scegli il canale</option>' + opzioniCanali(valore);
  const elenchi = { comuni: CONFIG.comuni.map((c) => c.nome), settori: CONFIG.settori, ambienti: CONFIG.preventivo.ambienti.map((a) => a.nome),
    frequenze: CONFIG.preventivo.frequenze.map((f) => f.nome), servizi: Object.keys(CONFIG.servizi) };
  return '<option value="">—</option>' + elenchi[tipo].map((v) => `<option value="${esc(v)}" ${v === valore ? "selected" : ""}>${esc(maiuscola(v))}</option>`).join("");
}

// Legge la nota e mostra i campi proposti, ognuno con la frase da cui viene e il suo stato
function leggiNota() {
  const modulo = document.getElementById("modulo-nota");
  const testo = modulo.nota.value.trim();
  if (!testo) return segnalaCampo(modulo.nota, "Scrivi o detta la nota");
  const campi = estraiNota(testo);
  const conteggio = (s) => CAMPI_NOTA.filter(([k]) => campi[k].stato === s).length;
  const doppioni = possibiliDoppioni({ ragioneSociale: campi.azienda.valore, telefono: campi.telefono.valore, email: campi.email.valore });
  document.getElementById("campi-nota").innerHTML = `
    <p class="riepilogo-nota"><strong>Proposta dell'assistente:</strong> ${quanti(conteggio("sicuro"), "campo sicuro", "campi sicuri")}
      <span class="chip chip-attenzione">${conteggio("controllare")} da controllare</span>
      <span class="chip chip-critico">${quanti(conteggio("mancante"), "mancante", "mancanti")}</span></p>
    ${doppioni.length ? `<p class="avviso-doppione">${icona("attenzione")} Già presente: <strong>${esc(doppioni[0].azienda.ragioneSociale)}</strong>
      (${esc(doppioni[0].motivi.join(", "))}). La richiesta verrà aggiunta a questa azienda.</p>` : ""}
    <div class="campi-nota">
      ${CAMPI_NOTA.map(([k, etichetta, tipo]) => {
        const c = campi[k];
        const s = STATI_CAMPO[c.stato];
        const controllo = tipo === "testo" ? `<input name="${k}" value="${esc(c.valore)}" data-campo-nota autocomplete="off">`
          : tipo === "numero" ? `<input name="${k}" type="number" min="0" inputmode="numeric" value="${esc(c.valore)}" data-campo-nota>`
          : `<select name="${k}" data-campo-nota>${opzioniNota(tipo, c.valore)}</select>`;
        return `<div class="campo-nota" data-stato="${c.stato}">
          <label>${etichetta} ${controllo}</label>
          <p class="stato-campo"><span class="chip ${s.classe}" id="stato-${k}">${s.testo}</span>${c.frase ? ` <span class="frase-nota">da «${esc(c.frase)}»</span>` : ""}</p>
        </div>`;
      }).join("")}
      ${campi.serviziTrovati.length > 1 ? `<fieldset class="campo-nota altri-servizi"><legend>La nota chiede più servizi: alla conferma nasce una trattativa per ciascuno</legend>
        ${campi.serviziTrovati.map((x) => `<label class="spunta"><input type="checkbox" name="altroServizio" value="${esc(x)}" checked> ${esc(maiuscola(x))}</label>`).join("")}</fieldset>` : ""}
      <div class="campo-nota"><label>Data della richiesta * <input name="dataRichiesta" type="date" required max="${oggi()}" value="${oggi()}"></label>
        <p class="stato-campo"><span class="frase-nota">oggi, se la richiesta è arrivata oggi</span></p></div>
    </div>`;
  document.getElementById("conferma-nota").hidden = false;
}

// Un campo corretto a mano diventa «corretto da te»
function correggiCampoNota(campo) {
  const chip = document.getElementById("stato-" + campo.name);
  if (!chip) return;
  chip.className = "chip " + STATI_CAMPO.corretto.classe;
  chip.textContent = STATI_CAMPO.corretto.testo;
  campo.closest(".campo-nota").dataset.stato = "corretto";
}

// «Conferma e registra»: crea azienda (o usa quella già presente), referente e opportunità in Contatto con preventivo e punteggio
function registraDaNota(modulo) {
  const v = (k) => (modulo[k] ? modulo[k].value.trim() : "");
  if (!v("azienda")) return segnalaCampo(modulo.azienda, "Scrivi il nome dell'azienda");
  if (!v("canale")) return segnalaCampo(modulo.canale, "Scegli il canale della richiesta");
  if (!v("servizio")) return segnalaCampo(modulo.servizio, "Scegli il servizio");
  if (!formattaData(v("dataRichiesta")) || v("dataRichiesta") > oggi()) return segnalaCampo(modulo.dataRichiesta, "Indica la data della richiesta (non nel futuro)");
  const secondi = secondiNota();
  const doppioni = possibiliDoppioni({ ragioneSociale: v("azienda"), telefono: v("telefono"), email: v("email") });
  let opp = null;
  // Altri servizi spuntati (diversi da quello principale): una trattativa in più per ciascuno
  const altri = [...modulo.querySelectorAll("[name=altroServizio]:checked")].map((c) => c.value).filter((x) => x !== v("servizio") && Object.hasOwn(CONFIG.servizi, x));
  applica(() => {
    let azienda = doppioni.length ? doppioni[0].azienda : null;
    if (!azienda) {
      azienda = { id: nuovoId("az"), ragioneSociale: v("azienda"), piva: "", settore: v("settore") || CONFIG.pilota.settore,
        comune: v("comune") || "Bari", fonte: v("canale"), note: "", creata: oggi() };
      stato.aziende.push(azienda);
    }
    // Referente: quello già registrato con lo stesso telefono o la stessa email, altrimenti uno nuovo
    const cifre = (x) => String(x || "").replace(/\D/g, "");
    let referente = referentiDi(azienda.id).find((r) => (v("telefono") && cifre(r.telefono).endsWith(cifre(v("telefono")).slice(-9)))
      || (v("email") && r.email.toLowerCase() === v("email").toLowerCase()));
    if (!referente && (v("nome") || v("telefono") || v("email"))) {
      referente = { id: nuovoId("rf"), aziendaId: azienda.id, nome: v("nome") || maiuscola(v("ruolo") || "referente"), ruolo: v("ruolo"),
        telefono: telefonoDaSalvare(v("telefono")), email: v("email"), canale: v("telefono") ? "Telefono" : "Email",
        decisore: /titolare|direttor|amministrator|socio|presidente|proprietari/i.test(v("ruolo")), privacy: privacyVuota() };
      stato.referenti.push(referente);
    }
    opp = opportunitaDaRichiesta({ tipo: "nota", servizio: v("servizio"), ambiente: v("ambiente"), mq: Number(v("mq")) || 0, frequenza: v("frequenza"),
      fonte: v("canale"), campagna: "", contenuto: "", pagina: "", consenso: false, ore: "" }, azienda.id, referente ? referente.id : null, v("comune") || azienda.comune);
    if (Number(v("ore")) > 0) opp.ore = Math.round(Number(v("ore")));   // ore dette nella nota: prevalgono sulla stima da mq e frequenza
    opp.storico.contatto = v("dataRichiesta");   // la richiesta può essere arrivata prima di oggi; annotata oggi
    stato.opportunita.push(opp);
    registraAttivita({ aziendaId: azienda.id, referenteId: referente ? referente.id : null, opportunitaId: opp.id, tipo: "Nota",
      data: v("dataRichiesta"), testo: "Nota della richiesta: " + modulo.nota.value.trim() });
    cadenza(opp, CONFIG.fasi[0], oggi());   // promemoria: chiamata di qualifica
    altri.forEach((servizio) => {
      const altra = opportunitaDaRichiesta({ tipo: "nota", servizio, ambiente: v("ambiente"), mq: Number(v("mq")) || 0, frequenza: v("frequenza"),
        fonte: v("canale"), campagna: "", contenuto: "", pagina: "", consenso: false, ore: "" }, azienda.id, referente ? referente.id : null, v("comune") || azienda.comune);
      altra.storico.contatto = v("dataRichiesta");
      stato.opportunita.push(altra);
      cadenza(altra, CONFIG.fasi[0], oggi());
    });
    stato.tempiRegistrazione = (stato.tempiRegistrazione || []).concat({ id: nuovoId("tr"), opportunitaId: opp.id, secondi, data: oggi() });
    ultimaModificata = opp.id;
  }, { messaggio: () => "Richiesta registrata in " + secondi + " secondi: preventivo e punteggio pronti"
    + (altri.length ? " (più " + quanti(altri.length, "trattativa", "trattative") + " per gli altri servizi)" : ""), vai: () => "preventivo-" + opp.id, fase: "contatto" });
  if (notaAperta) clearInterval(notaAperta.timer);
  notaAperta = null;
}

// Azioni, modulo e campi della scheda (uniti a quelli di app.js)
Object.assign(AZIONI_CLIENTI, {
  nota: () => apriNota(),
  "leggi-nota": () => leggiNota(),
});
GESTORI_MODULI["modulo-nota"] = registraDaNota;

document.addEventListener("change", (evento) => {
  const campo = evento.target;
  if (!campo.closest || !campo.closest("#modulo-nota")) return;
  if (campo.name === "esempio" && campo.value !== "") {
    campo.form.nota.value = CONFIG.assistente.noteDiProva[Number(campo.value)].testo;
    leggiNota();
  } else if (campo.dataset.campoNota !== undefined) correggiCampoNota(campo);
});
// Nota scritta a mano: si legge da sola poco dopo l'ultima battuta, come le note di esempio
let timerNota = null;
function letturaAutomaticaNota() {
  const modulo = document.getElementById("modulo-nota");
  if (!modulo || modulo.querySelector('.campo-nota[data-stato="corretto"]')) return; // non sovrascrive i campi corretti a mano
  if (modulo.nota.value.trim()) return leggiNota();
  document.getElementById("campi-nota").innerHTML = "";
  document.getElementById("conferma-nota").hidden = true;
}

document.addEventListener("input", (evento) => {
  if (evento.target.name === "nota" && evento.target.closest && evento.target.closest("#modulo-nota")) {
    clearTimeout(timerNota);
    timerNota = setTimeout(letturaAutomaticaNota, 700);
    return;
  }
  if (evento.target.dataset && evento.target.dataset.campoNota !== undefined && evento.target.closest("#modulo-nota")) correggiCampoNota(evento.target);
});
