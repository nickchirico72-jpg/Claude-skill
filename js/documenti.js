/*
 * DOCUMENTI
 * Una schermata sola per i file: report da stampare, scambio con il gestionale ed Excel, CSV dei dati reali, backup.
 * Le azioni sono quelle di sempre (ponte.js, indicatori.js, dati.js): qui sono solo raccolte, senza doppioni nelle altre schermate.
 */

// Una riga: cosa è, a cosa serve, i pulsanti
function rigaDocumento(id, titolo, spiegazione, azioni, sotto = "") {
  return `
    <li class="documento" id="documento-${id}">
      <div class="documento-testo"><strong>${titolo}</strong><p class="nota-piccola">${spiegazione}</p></div>
      <div class="azioni-documento">${azioni}</div>
      ${sotto ? `<div class="documento-sotto">${sotto}</div>` : ""}
    </li>`;
}

// Un gruppo di righe con il suo titolo
function gruppoDocumenti(titolo, righe) {
  return `<section class="riquadro gruppo-documenti" aria-label="${titolo}">
      <h2 class="titolo-riquadro">${titolo}</h2>
      <ul class="elenco-documenti">${righe.join("")}</ul>
    </section>`;
}

// Schermata Documenti: tre gruppi (da stampare, gestionale ed Excel, backup)
function disegnaDocumenti() {
  const tabelle = Object.keys(TABELLE_PONTE);
  return `
    <div class="pagina-documenti">
    ${intestazione({ titolo: "Documenti", istruzione: "Stampa i report, scambia i file con il gestionale ed Excel, salva o carica un backup." })}
    ${gruppoDocumenti("Da stampare", [
      rigaDocumento("riepilogo", "Riepilogo del mese", "Una pagina per la direzione con i numeri degli ultimi 30 giorni.",
        '<a class="pulsante secondario piccolo" href="#riepilogo">Apri</a>'),
      rigaDocumento("lunedi", "Lista del lunedì", "Chi sollecitare questa settimana e quali contratti rinnovare.",
        '<a class="pulsante secondario piccolo" href="#lunedi">Apri</a>'),
    ])}
    ${gruppoDocumenti("Gestionale ed Excel", [
      rigaDocumento("gestionale", "Dati per il gestionale", `Un file CSV per tabella (${tabelle.length} file), con i nomi del dizionario dati. ${puo("delicate") ? "Caricandoli, sostituiscono i dati di lavoro dopo un backup." : "Caricarli è un'operazione dell'amministratore unico."}`,
        `<button class="pulsante secondario piccolo" type="button" data-azione="esporta-ponte">Scarica</button>
         ${puo("delicate") ? '<button class="pulsante secondario piccolo" type="button" data-azione="ponte">Carica</button>' : ""}`,
        `<details class="approfondimento"><summary><span class="titolo-richiudibile">Una tabella alla volta</span></summary>
          <p>${tabelle.map((n) => `<button class="pulsante-testo positivo" type="button" data-azione="esporta-ponte" data-id="${n}">${n}</button>`).join(" ")}</p></details>`),
      rigaDocumento("clienti", "Clienti e referenti", "Un elenco da aprire in Excel, un referente per riga.",
        '<button class="pulsante secondario piccolo" type="button" data-azione="esporta-csv">Scarica</button>'),
      rigaDocumento("richieste", "Richieste per gli Indicatori", "CSV a 7 colonne: scarica le richieste mostrate negli Indicatori o carica quelle vere di Gate, che restano separate dalle trattative.",
        `<button class="pulsante secondario piccolo" type="button" data-azione="esporta-csv-richieste">Scarica</button>
         ${puo("datiReali") ? '<button class="pulsante secondario piccolo" type="button" data-azione="importa-csv-reali">Carica dati reali</button>' : ""}`),
    ])}
    ${gruppoDocumenti("Backup", [
      rigaDocumento("backup", "Backup di tutti i dati", `I dati restano in questo browser: il backup li conserva o li passa a un collega. Ultimo backup: <span class="quando-backup">${quandoUltimoBackup().quando}</span>.`,
        `<button class="pulsante primario piccolo" type="button" data-azione="esporta-backup">Salva backup</button>
         ${puo("delicate") ? '<button class="pulsante secondario piccolo" type="button" data-azione="importa-backup">Carica backup</button>' : ""}`),
      ...(puo("delicate") ? [rigaDocumento("esempio", "Dati di esempio", "Cancella i dati di lavoro e riparte da quelli di esempio: prima chiede conferma.",
        '<button class="pulsante secondario piccolo" type="button" data-azione="ripristina">Ripristina</button>')] : []),
    ])}
    </div>`;
}
