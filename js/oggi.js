/*
 * OGGI
 * La schermata di apertura: la data del giorno, al massimo tre schede d'azione con un solo pulsante
 * (in ordine di urgenza), poi «Poi, se resta tempo» con le trattative da seguire e, sotto, le trattative per fase (app.js).
 * Lo stato dell'interfaccia (schede chiuse in questa sessione) vive solo in memoria, in interfaccia.oggi.
 */

const SCHEDE_OGGI = 3;   // schede d'azione in alto
const RIGHE_POI = 3;     // righe di «Poi, se resta tempo» prima di «Tutte le trattative da seguire»

// ====================================================== PEZZI DELLE SCHEDE

// Referente dell'opportunità (o dell'azienda): quello collegato, altrimenti il decisore, altrimenti il primo
function referenteDi(o, aziendaId = o && o.aziendaId) {
  return (o && trovaReferente(o.referenteId)) || referentiDi(aziendaId).find((r) => r.decisore) || referentiDi(aziendaId)[0] || null;
}

// maiuscola() è in dati.js e numeroId() in ponte.js: qui si riusano, non si ridefiniscono

// Chip con icona e tono (critico, attenzione, ok oppure neutro)
function chipOggi(testo, tono = "", nomeIcona = "") {
  return `<span class="chip${tono ? " chip-" + tono : ""}">${nomeIcona ? icona(nomeIcona) : ""}${esc(testo)}</span>`;
}

// Scadenza in parole: «In ritardo di 2 giorni», «Oggi», «Ore 15:00», «Domani», «Entro lunedì», «Entro il 3/11»
function testoScadenza(data, ora = "") {
  if (data < oggi()) return { testo: "In ritardo di " + giorni(giorniTra(data, oggi())), tono: "critico", icona: "attenzione" };
  if (data === oggi()) return ora ? { testo: "Ore " + ora, tono: "", icona: "orologio" } : { testo: "Oggi", tono: "attenzione", icona: "orologio" };
  if (data === traGiorni(1)) return { testo: "Domani", tono: "attenzione", icona: "orologio" };
  if (data <= traGiorni(6)) return { testo: "Entro " + nomeGiorno(data), tono: "attenzione", icona: "orologio" };
  return { testo: "Entro il " + formattaData(data).slice(0, 5), tono: "attenzione", icona: "orologio" };
}

function chipScadenza(data, ora = "") {
  const s = testoScadenza(data, ora);
  return chipOggi(s.testo, s.tono, s.icona);
}

// «ieri», «oggi» oppure «il 19/10»
function quandoInParole(data) {
  if (data === oggi()) return "oggi";
  if (data === traGiorni(-1)) return "ieri";
  return "il " + formattaData(data).slice(0, 5);
}

// «Chiede un preventivo per pulire 220 m² di uffici, tre volte a settimana.» (dai dati della richiesta)
function descrizioneRichiesta(o) {
  const p = o.preventivo;
  if (p && p.mq > 0) return `Chiede un preventivo per ${esc(o.servizio)}: ${esc(p.ambiente.toLowerCase())}, circa ${Number(p.mq)} m², ${esc(p.frequenza)}.`;
  return `Chiede ${esc(o.servizio)}, ${Number(o.ore)} ore al mese.`;
}

// «Misure prese: 420 m², tre volte a settimana. Pacchetto: Plus.»
function descrizioneOfferta(o) {
  const p = o.preventivo;
  if (p && p.mq > 0) return `Misure prese: ${Number(p.mq)} m², ${esc(p.frequenza)}. Pacchetto: ${p.pacchetto ? esc(p.pacchetto) : "su misura"}.`;
  return `${esc(maiuscola(o.servizio))}, ${Number(o.ore)} ore al mese. Offerta su misura.`;
}

// Riga sotto il nome: referente · comune · dettaglio, con il numero del referente in coda
function sottorigaScheda(ref, comune, dettaglio) {
  const parti = [ref ? esc(ref.nome) : "", esc(comune), dettaglio].filter(Boolean);
  const numero = ref && ref.telefono ? ` · <a class="link" href="tel:+${numeroInternazionale(ref.telefono)}">${esc(ref.telefono)}</a>` : "";
  return parti.join(" · ") + numero;
}

// Riga compatta da telefono, al posto di sottoriga, descrizione e meta: referente e sintesi della richiesta
// («Davide T. · preventivo per 220 m², tre volte a settimana»)
function rigaCompatta(ref, ...parti) {
  return [ref ? esc(ref.nome) : "", ...parti].filter(Boolean).join(" · ");
}

// Sintesi della richiesta in poche parole: «preventivo per 220 m², tre volte a settimana» oppure «pulizie uffici, 110 ore al mese»
function sintesiRichiesta(o) {
  const p = o.preventivo;
  return p && p.mq > 0 ? `preventivo per ${Number(p.mq)} m², ${esc(p.frequenza)}` : `${esc(o.servizio)}, ${Number(o.ore)} ore al mese`;
}

// Pulsante «Chiama <referente>» che registra la chiamata con l'ora (azione chiamata-fatta)
function pulsanteChiama(ref, o, attivita, testo) {
  return `<button class="pulsante primario largo" type="button" data-azione="chiamata-fatta"${o ? ` data-id="${esc(o.id)}"` : ""}${attivita ? ` data-attivita="${esc(attivita.id)}"` : ""} data-testo="${esc(testo)}">
    ${icona("telefono")} Chiama ${ref ? esc(ref.nome) : "il cliente"}</button>`;
}

// Promemoria da fare di un'opportunità con il testo che corrisponde (es. la chiamata di qualifica o il sollecito)
function promemoriaDi(o, regola) {
  return stato.attivita.find((x) => x.daFare && x.opportunitaId === o.id && regola.test(x.testo)) || null;
}

// Il sollecito di un'offerta è già stato registrato oggi
function sollecitataOggi(o) {
  return stato.attivita.some((x) => !x.daFare && x.opportunitaId === o.id && x.data === oggi() && /sollecit/i.test(x.testo));
}

// ============================================================ CANDIDATE

// Le cose da fare oggi, da cinque regole già nel codice: richieste senza prima risposta (K12), sopralluoghi in agenda,
// offerte da preparare dopo il sopralluogo, offerte scadute o in scadenza da sollecitare, promemoria scaduti o di oggi.
// Una sola candidata per azienda (vince il tipo più urgente, poi la scadenza più vecchia)
function coseDaFareOggi() {
  const tutte = stato.opportunita;
  const punteggio = (o) => badgePunteggio(calcolaPunteggio(o, tutte));
  const meta = (testo, o) => `${testo} · Coerenza ${punteggio(o)}`;
  const candidate = [];
  const aperte = tutte.filter(trattativaAperta);

  // 1) Rispondi: richiesta senza prima risposta oltre un giorno lavorativo (regola della Lista del lunedì, K12)
  aperte.filter((o) => !o.dataPrimaRisposta && o.storico.contatto <= oggi() && giorniLavorativi(o.storico.contatto, oggi()) > CONFIG.lunedi.giorniLavorativiRisposta).forEach((o) => {
    const ref = referenteDi(o);
    const ritardo = giorniLavorativi(o.storico.contatto, oggi()) - CONFIG.lunedi.giorniLavorativiRisposta;
    candidate.push({ chiave: "rispondi-" + o.id, tipoOrdine: 1, scadenza: o.storico.contatto, aziendaId: o.aziendaId, o, ref,
      etichetta: "Rispondi", chip: chipOggi("In ritardo di " + giorni(ritardo), "critico", "attenzione"),
      sottoriga: sottorigaScheda(ref, o.comune, esc(o.canale)), compatta: rigaCompatta(ref, sintesiRichiesta(o)), descrizione: descrizioneRichiesta(o),
      meta: meta("Arrivata " + quandoInParole(o.storico.contatto), o), frase: ref ? "la chiamata a " + ref.nome : "la risposta a " + nomeCliente(o),
      pulsante: pulsanteChiama(ref, o, promemoriaDi(o, /chiama/i), "Risposta alla richiesta") });
  });

  // 2) Sopralluogo di oggi (o passato e ancora da registrare)
  attivitaDaFare().filter((x) => x.fase === "sopralluogo" && x.data <= oggi() && x.opportunitaId).forEach((x) => {
    const o = trova(x.opportunitaId);
    if (!o || !trattativaAperta(o) || !faseDaRegistrare(x)) return;
    const ref = referenteDi(o);
    const p = o.preventivo;
    const nota = x.testo.replace(/^Sopralluogo:?\s*/, "");
    const oggiStesso = x.data === oggi();
    const numero = ref ? numeroInternazionale(ref.telefono) : "";
    const testoWa = ref ? testoWhatsAppSopralluogo(ref, x) : "";
    const pulsante = oggiStesso && numero
      ? `<a class="pulsante primario largo" href="${linkWhatsAppReferente(ref, testoWa)}" target="_blank" rel="noopener" data-azione="whatsapp-sopralluogo" data-testo="${esc(testoWa)}">${icona("messaggio")} Conferma l'arrivo su WhatsApp</a>`
      : `<button class="pulsante primario largo" type="button" data-azione="fatto-fase" data-id="${esc(x.id)}">${icona("righello")} Registra le misure</button>`;
    candidate.push({ chiave: "sopralluogo-" + x.id, tipoOrdine: 2, scadenza: x.data, aziendaId: o.aziendaId, o, ref, attivita: x,
      etichetta: oggiStesso ? "Sopralluogo di oggi" : "Sopralluogo da registrare", chip: chipScadenza(x.data, x.ora || ""),
      sottoriga: sottorigaScheda(ref, o.comune, esc(o.canale)),
      compatta: rigaCompatta(ref, esc(o.comune), p && p.mq > 0 ? `circa ${Number(p.mq)} m²` : `${esc(o.servizio)}, ${Number(o.ore)} ore al mese`),
      descrizione: (p && p.mq > 0 ? `${esc(p.ambiente)}, circa ${Number(p.mq)} m², ${esc(p.frequenza)}.` : `${esc(maiuscola(o.servizio))}, ${Number(o.ore)} ore al mese.`) + (nota ? " " + esc(maiuscola(nota)) : ""),
      meta: meta(oggiStesso ? "Oggi" + (x.ora ? " alle " + esc(x.ora) : "") : "In agenda il " + formattaData(x.data).slice(0, 5), o),
      frase: "il sopralluogo da " + nomeCliente(o), pulsante });
  });

  // 3) Offerta da inviare: trattativa in Sopralluogo senza offerta; scadenza dal promemoria o dai giorni della fase
  const faseSopralluogo = CONFIG.fasi.find((f) => f.id === "sopralluogo");
  aperte.filter((o) => faseAttuale(o) === "sopralluogo").forEach((o) => {
    const ref = referenteDi(o);
    const promemoria = promemoriaDi(o, /offerta/i);
    const scadenza = promemoria ? promemoria.data : aggiungiGiorni(o.storico.sopralluogo, faseSopralluogo.followUp.giorni);
    candidate.push({ chiave: "offerta-" + o.id, tipoOrdine: 3, scadenza, aziendaId: o.aziendaId, o, ref, attivita: promemoria,
      etichetta: "Offerta da inviare", chip: chipScadenza(scadenza),
      sottoriga: sottorigaScheda(ref, o.comune, "sopralluogo fatto " + quandoInParole(o.storico.sopralluogo)), descrizione: descrizioneOfferta(o),
      compatta: rigaCompatta(null, sintesiRichiesta(o), o.preventivo && o.preventivo.pacchetto ? "pacchetto " + esc(o.preventivo.pacchetto) : "offerta su misura"),
      meta: meta("Circa " + formattaEuro(Math.round(valoreAnnuo(o) / 100) * 100) + "/anno", o), frase: "l'offerta per " + nomeCliente(o),
      pulsante: `<a class="pulsante primario largo" href="#preventivo-${esc(o.id)}">${icona("documento")} Prepara l'offerta</a>` });
  });

  // 4) Sollecita: offerta scaduta o in scadenza entro CONFIG.avvisi.giorniOfferta, non ancora sollecitata oggi
  aperte.filter((o) => faseAttuale(o) === "offerta" && o.scadenzaOfferta && giorniTra(oggi(), o.scadenzaOfferta) <= CONFIG.avvisi.giorniOfferta && !sollecitataOggi(o)).forEach((o) => {
    const ref = referenteDi(o);
    const scaduta = o.scadenzaOfferta < oggi();
    const giorno = formattaData(o.scadenzaOfferta).slice(0, 5);
    candidate.push({ chiave: "sollecita-" + o.id, tipoOrdine: 4, scadenza: o.scadenzaOfferta, aziendaId: o.aziendaId, o, ref,
      etichetta: "Sollecita", chip: scaduta ? chipOggi("Offerta scaduta il " + giorno, "critico", "attenzione") : chipOggi(o.scadenzaOfferta === oggi() ? "Scade oggi" : "Scade " + nomeGiorno(o.scadenzaOfferta), "attenzione", "orologio"),
      sottoriga: sottorigaScheda(ref, o.comune, "offerta inviata il " + formattaData(o.storico.offerta).slice(0, 5)),
      compatta: rigaCompatta(ref, `offerta da ${formattaEuro(valoreAnnuo(o))}/anno, nessuna risposta`),
      descrizione: `Offerta da ${formattaEuro(valoreAnnuo(o))}/anno${o.preventivo && o.preventivo.pacchetto ? ", pacchetto " + esc(o.preventivo.pacchetto) : ""}. Nessuna risposta.`,
      meta: meta("Valida fino al " + giorno, o), frase: "il sollecito a " + nomeCliente(o),
      pulsante: pulsanteChiama(ref, o, promemoriaDi(o, /sollecit/i), "Sollecito dell'offerta") });
  });

  // 5) Promemoria scaduti o di oggi non coperti dai tipi 2 e 3
  const coperte = new Set(candidate.map((c) => c.attivita && c.attivita.id).filter(Boolean));
  attivitaDaFare().filter((x) => x.data <= oggi() && !coperte.has(x.id) && x.fase !== "sopralluogo" && trovaAzienda(x.aziendaId)).forEach((x) => {
    const o = (x.opportunitaId && trova(x.opportunitaId)) || opportunitaDi(x.aziendaId).filter(trattativaAperta)[0] || null;
    const ref = referenteDi(o, x.aziendaId);
    const azienda = trovaAzienda(x.aziendaId);
    const daFissare = /fissare il sopralluogo/i.test(x.testo) && o && trattativaAperta(o) && faseAttuale(o) === "qualificato" && !sopralluogoFissato(o);
    const pulsante = daFissare
      ? `<button class="pulsante primario largo" type="button" data-azione="fissa-sopralluogo" data-id="${esc(o.id)}">${icona("calendario")} Fissa il sopralluogo</button>`
      : x.tipo === "Chiamata" && ref ? pulsanteChiama(ref, o && trattativaAperta(o) ? o : null, x, x.testo)
        : `<button class="pulsante primario largo" type="button" data-azione="fatto" data-id="${esc(x.id)}">${icona("spunta")} Fatto</button>`;
    candidate.push({ chiave: "promemoria-" + x.id, tipoOrdine: 5, scadenza: x.data, aziendaId: x.aziendaId, o, ref, attivita: x,
      etichetta: daFissare ? "Sopralluogo da fissare" : x.tipo === "Chiamata" ? "Chiama" : "Da fare", chip: chipScadenza(x.data, x.ora || ""),
      nome: azienda.ragioneSociale, sottoriga: sottorigaScheda(ref, azienda.comune, esc(x.tipo)), compatta: rigaCompatta(ref, esc(x.testo)),
      descrizione: esc(x.testo) + (x.ora ? " · ore " + esc(x.ora) : ""),
      meta: o ? meta("In agenda " + quandoInParole(x.data), o) : "", frase: daFissare ? "il sopralluogo da fissare con " + azienda.ragioneSociale : x.testo.charAt(0).toLowerCase() + x.testo.slice(1) + " (" + azienda.ragioneSociale + ")",
      pulsante });
  });

  // Una candidata per azienda
  const perAzienda = new Map();
  candidate.sort((a, b) => a.tipoOrdine - b.tipoOrdine || a.scadenza.localeCompare(b.scadenza))
    .forEach((c) => { if (!perAzienda.has(c.aziendaId)) perAzienda.set(c.aziendaId, c); });
  return [...perAzienda.values()];
}

// Esito di una scheda o riga toccata, letto dai dati nati dopo il clic (null se nei dati non c'è traccia, es. dopo Annulla)
function esitoFatta(c, t) {
  if (t.azione === "whatsapp-sopralluogo") return t.esito;
  const nuove = stato.attivita.filter((x) => x.aziendaId === c.aziendaId && numeroId(x.id) > t.contatore);
  const prossima = nuove.find((x) => x.daFare);
  const passo = (x) => x.testo.charAt(0).toLowerCase() + x.testo.slice(1) + " " + formattaGiorno(x.data) + (x.ora ? " alle " + oraBreve(x.ora) : "");
  if (t.azione === "chiamata-fatta") {
    // La chiamata è un'attività nuova oppure il promemoria chiuso al clic (con l'ora)
    const chiamata = nuove.find((x) => !x.daFare && x.tipo === "Chiamata") || stato.attivita.find((x) => x.id === t.promemoria && !x.daFare && x.data === oggi() && x.ora);
    if (!chiamata) return null;
    return (chiamata.ora ? "Chiamata registrata alle " + oraBreve(chiamata.ora) + "." : "Chiamata registrata.") + (prossima ? " Prossimo passo: " + passo(prossima) + "." : "");
  }
  if (t.azione === "fissa-sopralluogo") {
    const s = nuove.find((x) => x.daFare && x.fase === "sopralluogo");
    return s ? "Fissato: sopralluogo " + formattaGiorno(s.data) + (s.ora ? " alle " + oraBreve(s.ora) : "") + "." : null;
  }
  if (t.azione === "prossima-azione") return prossima ? "Fissata: " + passo(prossima) + "." : null;
  if (t.azione === "fatto-fase") return nuove.some((x) => !x.daFare && x.tipo === "Pipeline" && /Sopralluogo/.test(x.testo)) ? "Sopralluogo registrato. Ora prepara l'offerta." : null;
  if (t.azione === "fatto") {
    const x = stato.attivita.find((y) => y.id === t.attivita);
    return x && !x.daFare ? "Fatto." + (prossima ? " Prossimo passo: " + passo(prossima) + "." : "") : null;
  }
  return null;
}

// Sceglie al massimo 3 schede: quelle già in pagina restano al loro posto (chiuse con l'esito, se i dati lo confermano),
// poi un posto riservato ai tipi 1, 2 e 3 nell'ordine, poi le altre per scadenza più vecchia
function scegliSchede(candidate) {
  const mappa = new Map(candidate.map((c) => [c.chiave, c]));
  const scelte = [];
  interfaccia.oggi.precedenti.forEach((prec) => {
    const t = interfaccia.oggi.toccate[prec.chiave];
    const esito = t ? esitoFatta(prec, t) : null;
    if (esito) scelte.push({ ...prec, fatta: true, esito, toccata: t });
    else if (mappa.has(prec.chiave)) scelte.push(mappa.get(prec.chiave));
  });
  const usate = new Set(scelte.map((c) => c.aziendaId));
  const libere = () => candidate.filter((c) => !usate.has(c.aziendaId));
  const aggiungi = (c) => { scelte.push(c); usate.add(c.aziendaId); };
  [1, 2, 3].forEach((tipo) => {
    const c = libere().filter((x) => x.tipoOrdine === tipo).sort((a, b) => a.scadenza.localeCompare(b.scadenza))[0];
    if (c && scelte.length < SCHEDE_OGGI) aggiungi(c);
  });
  libere().sort((a, b) => a.scadenza.localeCompare(b.scadenza) || a.tipoOrdine - b.tipoOrdine).forEach((c) => {
    if (scelte.length < SCHEDE_OGGI) aggiungi(c);
  });
  // Le schede nuove si ordinano: prima la richiesta senza risposta (K12) e il sopralluogo in agenda, poi per scadenza più vecchia;
  // quelle già in pagina tengono il loro posto
  const giaInPagina = scelte.filter((c) => interfaccia.oggi.precedenti.some((p) => p.chiave === c.chiave));
  const rango = (c) => Math.min(c.tipoOrdine, 3);
  const nuove = scelte.filter((c) => !giaInPagina.includes(c)).sort((a, b) => rango(a) - rango(b) || a.scadenza.localeCompare(b.scadenza) || a.tipoOrdine - b.tipoOrdine);
  return giaInPagina.concat(nuove);
}

// Schede ancora aperte (0-3): il pallino del menu e la riga sotto il titolo
function restanoOggi() {
  return scegliSchede(coseDaFareOggi()).filter((c) => !c.fatta).length;
}

// ================================================================ SCHEDE

// Il nome della scheda: apre il dettaglio dell'opportunità, oppure la scheda cliente se è solo un promemoria
function nomeScheda(c) {
  return c.o
    ? `<button class="scheda-oggi-nome" type="button" data-azione="dettaglio" data-id="${esc(c.o.id)}">${esc(nomeCliente(c.o))}</button>`
    : `<a class="scheda-oggi-nome" href="#cliente-${esc(c.aziendaId)}">${esc(c.nome)}</a>`;
}

// «Annulla» dentro la scheda: solo per la scheda chiusa per ultima, finché quella è l'ultima modifica e l'avviso in basso è ancora visibile
// (si confronta il contatore delle modifiche applicate, app.js, con quello letto al clic: il registro no, perché è tagliato a 300 righe;
// la copia per l'Annulla arriva subito dopo il disegno, con l'avviso in basso, quindi qui si guarda annullaScaduto, segnato da nascondiAvviso)
function pulsanteAnnullaOggi(c) {
  const t = c.toccata;
  const annullabile = t.azione === "whatsapp-sopralluogo" || (modificheApplicate === t.applicate + 1 && interfaccia.oggi.annullaScaduto !== modificheApplicate);
  return annullabile ? `<button class="pulsante-testo positivo" type="button" data-azione="annulla-oggi" data-chiave="${esc(c.chiave)}">Annulla</button>` : "";
}

// Una scheda d'azione: etichetta numerata, chip, nome, sottoriga, descrizione, riga meta e un solo pulsante (o l'esito)
function schedaAzione(c, numero) {
  return `
    <article class="scheda-oggi${c.fatta ? " fatta" : ""}" data-azienda="${esc(c.aziendaId)}" data-chiave="${esc(c.chiave)}" aria-label="${numero} · ${esc(c.etichetta)}">
      <div class="scheda-oggi-alto">
        <p class="scheda-oggi-etichetta">${numero} · ${esc(c.etichetta)}</p>
        ${c.chip}
      </div>
      <div class="scheda-oggi-titolo">
        <h2>${nomeScheda(c)}</h2>
        <p class="scheda-oggi-sottoriga">${c.sottoriga}</p>
        <p class="scheda-oggi-compatta">${c.compatta}</p>
      </div>
      <p class="scheda-oggi-descrizione">${c.descrizione}</p>
      <p class="scheda-oggi-meta">${c.meta || ""}</p>
      <div class="scheda-oggi-azioni">
        ${c.fatta ? `<p class="stato-fatto" role="status">${icona("spunta")}<span>${esc(c.esito)}</span></p>${pulsanteAnnullaOggi(c)}` : c.pulsante}
      </div>
    </article>`;
}

// Riga sotto il titolo: cambia con le cose rimaste
function rigaOggi(schede) {
  const aperte = schede.filter((c) => !c.fatta);
  if (!schede.length) return "Oggi non ci sono cose urgenti.";
  if (aperte.length === schede.length) return ["", "Una cosa da fare.", "Due cose da fare, in ordine di urgenza.", "Tre cose da fare, in ordine di urgenza."][aperte.length];
  if (aperte.length === 2) return "Restano due cose da fare.";
  if (aperte.length === 1) return "Resta una cosa da fare: " + esc(aperte[0].frase) + ".";
  return "Tutto fatto per oggi.";
}

// Riquadro «Niente di urgente oggi» al posto delle schede
function giornataLibera(righe) {
  return `
    <section class="giornata-libera" aria-label="Niente di urgente oggi">
      <span class="cerchio-ok">${icona("spunta")}</span>
      <h2>Niente di urgente oggi</h2>
      <p>Nessuna richiesta senza risposta, nessun sopralluogo in agenda, nessuna offerta da inviare.</p>
      ${righe.length
        ? `<a class="pulsante primario" href="#da-seguire" data-azione="scorri" data-id="da-seguire" data-apri="poi">Apri le trattative da seguire</a>`
        : "<p>Nessuna trattativa da seguire: le trattative per fase sono qui sotto.</p>"}
    </section>`;
}

// ===================================================== POI, SE RESTA TEMPO

// Righe di «Poi, se resta tempo»: trattative da seguire, richieste senza risposta, promemoria scaduti e offerte scadute non entrati nelle schede.
// Una riga per azienda, escluse le aziende con una scheda in pagina. Ordine: prima le cose scadute o di oggi rimaste fuori dalle schede
// (per scadenza, così stanno nelle prime 3 righe), poi i ricontatti scaduti, poi le trattative ferme da più tempo, in fondo le cose con una scadenza futura
function righePoi(schede, candidate) {
  const inScheda = new Set(schede.map((c) => c.aziendaId));
  const righe = new Map();
  const aggiungi = (r) => { if (!inScheda.has(r.aziendaId) && !righe.has(r.aziendaId)) righe.set(r.aziendaId, r); };
  // Candidate rimaste fuori dalle schede (richieste senza risposta, promemoria, sollecito, offerta da preparare...)
  candidate.forEach((c) => aggiungi({ chiave: "poi-" + c.chiave, aziendaId: c.aziendaId, o: c.o, ricontatto: false, rango: c.scadenza <= oggi() ? 0 : 3, ordine: c.scadenza + " " + c.tipoOrdine, candidata: c }));
  trattativeDaSeguire().forEach(({ o, s, r }) => aggiungi({ chiave: "poi-" + o.id, aziendaId: o.aziendaId, o, s, ricontatto: r, rango: r ? 1 : 2, ordine: aggiungiGiorni(oggi(), -s.giorniInFase) }));
  return [...righe.values()].sort((a, b) => a.rango - b.rango || a.ordine.localeCompare(b.ordine)).map((r) => ({ ...r, ...motivoEPulsante(r) }));
}

// Motivo in una frase e un solo pulsante, secondo la situazione della trattativa
function motivoEPulsante(r) {
  const o = r.o;
  const c = r.candidata;
  const bottone = (testo, azione, id) => `<button class="pulsante secondario" type="button" data-azione="${azione}" data-id="${esc(id)}">${testo}</button>`;
  if (r.ricontatto) return { motivo: "Ricontattare: scaduto il " + formattaData(o.ricontatto.data), pulsante: bottone("Fissa la prossima azione", "prossima-azione", o.aziendaId) };
  if (c && c.tipoOrdine === 1) return { motivo: "Senza risposta da " + giorniLavorativi(o.storico.contatto, oggi()) + " giorni lavorativi", pulsante: c.pulsante.replace('class="pulsante primario largo"', 'class="pulsante secondario"') };
  if (c && c.tipoOrdine === 2) return { motivo: (c.attivita.data === oggi() ? "Sopralluogo oggi" : "Sopralluogo da registrare dal " + formattaData(c.attivita.data).slice(0, 5)) + (c.attivita.ora ? " alle " + c.attivita.ora : ""),
    pulsante: bottone("Sopralluogo fatto", "fatto-fase", c.attivita.id) };
  if (c && c.tipoOrdine === 3) return { motivo: "Offerta da preparare: sopralluogo fatto " + quandoInParole(o.storico.sopralluogo), pulsante: `<a class="pulsante secondario" href="#preventivo-${esc(o.id)}">Prepara l'offerta</a>` };
  if (c && c.tipoOrdine === 4) return { motivo: o.scadenzaOfferta < oggi() ? "Offerta scaduta il " + formattaData(o.scadenzaOfferta).slice(0, 5) + ", nessuna risposta" : "Offerta in scadenza il " + formattaData(o.scadenzaOfferta).slice(0, 5),
    pulsante: c.pulsante.replace('class="pulsante primario largo"', 'class="pulsante secondario"').replace(/Chiama [^<]*</, "Sollecita<") };
  if (c && c.tipoOrdine === 5) {
    const x = c.attivita;
    const quando = x.data < oggi() ? "In ritardo dal " + formattaData(x.data).slice(0, 5) : "Oggi";
    return { motivo: quando + ": " + x.testo, pulsante: c.pulsante.replace('class="pulsante primario largo"', 'class="pulsante secondario"') };
  }
  const s = r.s;
  if (faseAttuale(o) === "qualificato" && !sopralluogoFissato(o)) return { motivo: "Sopralluogo da fissare da " + giorni(s.giorniInFase), pulsante: bottone("Fissa il sopralluogo", "fissa-sopralluogo", o.id) };
  if (s.ferma && !s.prossima) return { motivo: "Ferma da " + giorni(s.giorniInFase) + ", senza prossima azione", pulsante: bottone("Fissa la prossima azione", "prossima-azione", o.aziendaId) };
  if (s.ferma) return { motivo: "Ferma da " + giorni(s.giorniInFase), pulsante: bottone("Fissa la prossima azione", "prossima-azione", o.aziendaId) };
  return { motivo: "Nessuna prossima azione", pulsante: bottone("Fissa la prossima azione", "prossima-azione", o.aziendaId) };
}

// Una riga di «Poi»: nome con la fase, comune e valore, motivo (o esito) e un pulsante.
// Senza trattativa aperta (promemoria di un cliente, es. il rinnovo) resta il nome dell'azienda con il comune
function rigaPoi(r) {
  const o = r.o;
  const azienda = trovaAzienda(r.aziendaId) || { ragioneSociale: "", comune: "" };
  const fase = o ? CONFIG.fasi[faseRaggiunta(o)] : null;
  return `
    <li class="poi-riga${r.fatta ? " fatta" : ""}" data-azienda="${esc(r.aziendaId)}" data-chiave="${esc(r.chiave)}">
      <div class="poi-nome">
        <p><a class="link" href="#cliente-${esc(r.aziendaId)}">${esc(o ? nomeCliente(o) : azienda.ragioneSociale)}</a>${fase ? ` <span class="chip">${fase.nome}</span>` : ""}</p>
        <p class="poi-luogo">${o ? `${esc(o.comune)} · circa ${formattaEuro(Math.round(valoreAnnuo(o) / 100) * 100)}/anno` : esc(azienda.comune)}</p>
      </div>
      ${r.fatta
        ? `<p class="poi-esito" role="status">${icona("spunta")}<span>${esc(r.esito)}</span></p>`
        : `<p class="poi-motivo">${icona("orologio")}<span>${esc(r.motivo)}</span></p><div class="poi-azione">${r.pulsante}</div>`}
    </li>`;
}

// Le righe mostrate: quelle chiuse in pagina restano al loro posto con l'esito (se i dati lo confermano),
// poi le altre in ordine di urgenza, fino a 3 (o tutte)
function righeMostrate(righe) {
  const scelte = [];
  interfaccia.oggi.precedentiRighe.forEach((prec) => {
    const t = interfaccia.oggi.toccate[prec.chiave];
    const esito = t ? esitoFatta(prec, t) : null;
    if (esito) scelte.push({ ...prec, fatta: true, esito });
  });
  const presenti = new Set(scelte.map((r) => r.aziendaId));
  const altre = righe.filter((r) => !presenti.has(r.aziendaId));
  const totale = scelte.length + altre.length;
  const limite = elenchiAperti["da-seguire"] ? totale : Math.max(RIGHE_POI, scelte.length);
  return { righe: scelte.concat(altre).slice(0, limite), totale };
}

// Sezione «Poi, se resta tempo» (id da-seguire: ci arrivano i link di Direzione e Indicatori)
function sezionePoi(righe) {
  const { righe: mostrate, totale } = righeMostrate(righe);
  const aperto = elenchiAperti["da-seguire"];
  return `
    <section class="poi${interfaccia.oggi.poiAperto ? " aperta" : ""}" id="da-seguire" tabindex="-1" aria-labelledby="titolo-poi">
      <button class="pulsante-testo positivo apri-poi" type="button" data-azione="apri-poi" aria-expanded="${interfaccia.oggi.poiAperto}">
        ${totale ? "Poi: " + quanti(totale, "trattativa da seguire", "trattative da seguire") : "Poi: nessuna trattativa da seguire"}</button>
      <div class="poi-testa">
        <div>
          <h2 id="titolo-poi">Poi, se resta tempo</h2>
          <p class="poi-sotto">Trattative ferme, in ritardo o senza una prossima azione. Fissa una data: così nessuna si perde.</p>
        </div>
        ${totale > RIGHE_POI ? `<button class="pulsante-testo positivo tutte-poi" type="button" data-azione="mostra-tutto" data-id="da-seguire" aria-expanded="${aperto}">${aperto ? "Mostra meno" : "Tutte le trattative da seguire (" + totale + ")"}</button>` : ""}
      </div>
      ${mostrate.length ? `<ul class="poi-elenco">${mostrate.map(rigaPoi).join("")}</ul>`
        : '<p class="vuoto">Ogni trattativa aperta ha una prossima azione e nessuna è ferma.</p>'}
    </section>`;
}

// ================================================================ PAGINA

function disegnaOggi() {
  const candidate = coseDaFareOggi();
  const schede = scegliSchede(candidate);
  const righe = righePoi(schede, candidate);
  const aperte = stato.opportunita.filter(trattativaAperta).length;
  const html = `
    <div class="pagina-oggi">
    ${intestazione({
      occhiello: formattaGiornoEsteso(oggi()),
      titolo: "Oggi",
      istruzione: rigaOggi(schede),
      azione: `<button class="pulsante accento largo" type="button" data-azione="nota" title="Incolla la nota della telefonata: i campi si compilano da soli">${icona("piu")} Nuova richiesta</button>`,
    })}
    ${rigaAvvisi()}
    ${schede.length
      ? `<section class="schede-oggi" aria-label="Le cose da fare oggi">${schede.map((c, i) => schedaAzione(c, i + 1)).join("")}</section>`
      : giornataLibera(righe)}
    ${sezionePoi(righe)}
    <h2 class="titolo-fasi">Trattative per fase <span class="conteggio">${aperte} aperte</span></h2>
    ${sezioneFasi()}
    </div>`;
  // Ciò che è in pagina adesso: al prossimo disegno resta al suo posto, chiuso con l'esito se è stato fatto
  interfaccia.oggi.precedenti = schede;
  interfaccia.oggi.precedentiRighe = righeMostrate(righe).righe;
  return html;
}

// Un clic su un pulsante di scheda o riga: si ricorda la chiave e il punto dei dati, per mostrare l'esito al ridisegno.
// clicInAlto dice a disegna() (app.js) di non scorrere alla scheda modificata nelle fasi sotto: solo se il clic è partito da una scheda o riga in alto
document.addEventListener("click", (evento) => {
  const el = evento.target.closest(".pagina-oggi [data-azione]");
  if (!el) return;
  const contenitore = el.closest("[data-chiave]");
  interfaccia.oggi.clicInAlto = !!contenitore;
  if (!contenitore || ["dettaglio", "annulla-oggi"].includes(el.dataset.azione)) return;
  interfaccia.oggi.toccate[contenitore.dataset.chiave] = { azione: el.dataset.azione, contatore: stato.contatoreId, applicate: modificheApplicate,
    attivita: el.dataset.id || "", promemoria: el.dataset.attivita || "", esito: el.dataset.azione === "whatsapp-sopralluogo" ? "Messaggio pronto in WhatsApp: «" + el.dataset.testo + "». Lo invii tu." : "" };
}, true);

// Azioni della schermata Oggi (unite ad AZIONI in app.js)
const AZIONI_OGGI = {
  // «Chiama …»: una sola riga di cronologia. Se c'è il promemoria lo chiude con data e ora (è lui la chiamata, col suo testo),
  // altrimenti registra la chiamata; in entrambi i casi segna la prima risposta (K12).
  // Se l'azienda resta senza passi in agenda si apre «Qual è la prossima azione?»
  "chiamata-fatta": (el) => {
    const o = trova(el.dataset.id);
    const x = stato.attivita.find((y) => y.id === el.dataset.attivita);
    const aziendaId = o ? o.aziendaId : x ? x.aziendaId : null;
    if (!aziendaId) return;
    const promemoria = x && x.daFare ? x : null;
    const testo = promemoria ? promemoria.testo : el.dataset.testo || "Chiamata";
    const ora = oraAdesso();
    const messaggio = "Chiamata registrata alle " + oraBreve(ora) + ": " + testo;
    const fatta = applica(() => {
      if (promemoria) {
        Object.assign(promemoria, { daFare: false, data: oggi(), ora, tipo: "Chiamata" });
        segnaPrimaRisposta(promemoria);
      } else {
        registraAttivita({ aziendaId, referenteId: (o && o.referenteId) || (x && x.referenteId) || null, ...(o ? { opportunitaId: o.id } : {}),
          tipo: "Chiamata", data: oggi(), ora, testo });
      }
    }, { messaggio });
    if (fatta && serveProssimaAzione(aziendaId)) {
      // La finestra coprirebbe l'avviso in basso: alla chiusura senza salvare lo si ripropone, con il suo «Annulla»
      const copia = copiaPerAnnulla;
      finestra.addEventListener("close", () => { if (copiaPerAnnulla === copia) mostraAvviso(messaggio, copia); }, { once: true });
      apriProssimaAzione(aziendaId);
    }
  },
  // Il link WhatsApp si apre da solo: qui si segna solo che il messaggio è pronto (nessun dato cambia)
  "whatsapp-sopralluogo": () => {
    disegna();
  },
  // «Annulla» nella scheda: toglie il segno di WhatsApp, oppure un passo indietro come l'Annulla dell'avviso
  "annulla-oggi": (el) => {
    const t = interfaccia.oggi.toccate[el.dataset.chiave];
    delete interfaccia.oggi.toccate[el.dataset.chiave];
    if (t && t.azione !== "whatsapp-sopralluogo" && copiaPerAnnulla) return AZIONI.annulla();
    disegna();
    if (t && t.azione !== "whatsapp-sopralluogo") mostraAvviso("Non si può più annullare: correggi dalla scheda del cliente");
  },
  // Su telefono «Poi: N trattative da seguire» apre e chiude la sezione
  "apri-poi": () => {
    interfaccia.oggi.poiAperto = !interfaccia.oggi.poiAperto;
    disegna();
    const pulsante = document.querySelector(".apri-poi");
    if (pulsante) pulsante.focus({ preventScroll: true });
  },
};
