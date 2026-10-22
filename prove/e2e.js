// Prove end-to-end del prototipo Gate (Playwright, Chromium).
// Uso, dalla cartella del progetto:
//   python3 -m http.server 8765 --bind 127.0.0.1 &
//   NODE_PATH=$(npm root -g) node prove/e2e.js            (tutte le prove)
//   NODE_PATH=$(npm root -g) node prove/e2e.js demo       (solo le prove il cui nome contiene "demo")
// Ogni prova parte da un contesto nuovo (localStorage vuoto) e raccoglie errori di pagina, errori in console
// e finestre native (alert, confirm e prompt sono vietati).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8765/';
const REPO = path.join(__dirname, '..');
const SHOT = process.env.SHOT || path.join(REPO, 'docs', 'screenshot');
const DISPOSITIVI = {
  desktop: { viewport: { width: 1440, height: 900 } },
  telefono: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const PAUSA = 700; // più dei 600 ms della protezione dal doppio clic
const filtro = process.argv[2] || '';
let browser;
const esiti = [];

function verifica(nome, condizione, dettaglio = '') {
  esiti.push({ nome, ok: !!condizione });
  console.log((condizione ? '  OK   ' : '  FAIL ') + nome + (dettaglio !== '' ? ' — ' + String(dettaglio).replace(/\s+/g, ' ') : ''));
}

// Nuovo contesto con raccolta degli errori; WhatsApp risponde con una pagina finta
async function apri(dispositivo = 'desktop', { initScript, config } = {}) {
  const ctx = await browser.newContext({ locale: 'it-IT', timezoneId: 'Europe/Rome', ...DISPOSITIVI[dispositivo] });
  await ctx.route('https://wa.me/**', (r) => r.fulfill({ contentType: 'text/html', body: '<p>WhatsApp (finto)</p>' }));
  if (initScript) await ctx.addInitScript(`try { ${initScript} } catch (e) {}`);
  if (config) await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'application/javascript; charset=utf-8',
    body: config(fs.readFileSync(path.join(REPO, 'js/config.js'), 'utf8')) }));
  const page = await ctx.newPage();
  const errori = [];
  const osserva = (p) => {
    p.on('pageerror', (e) => errori.push('pageerror: ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errori.push('console: ' + m.text()); });
    p.on('dialog', (d) => { errori.push('finestra nativa vietata: ' + d.type()); d.dismiss(); });
  };
  osserva(page);
  ctx.on('page', osserva);
  return { ctx, page, errori };
}

const scorreOrizzontale = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const clic = async (page, selettore) => { await page.click(selettore); await page.waitForTimeout(PAUSA); };

const PROVE = {
  // Tutte le schermate a 1440x900 e 390x844: nessun errore, nessuno scorrimento orizzontale; screenshot per il README
  async schermate() {
    for (const dispositivo of ['desktop', 'telefono']) {
      const { ctx, page, errori } = await apri(dispositivo);
      const sigla = dispositivo === 'desktop' ? 'desktop' : 'mobile';
      for (const [nome, indirizzo] of [['pipeline', 'index.html#pipeline'], ['clienti', 'index.html#clienti'], ['scheda-cliente', 'index.html#cliente-c1'],
        ['allocazione', 'index.html#allocazione'], ['indicatori', 'index.html#indicatori'], ['riepilogo', 'index.html#riepilogo'], ['lunedi', 'index.html#lunedi'], ['sopralluogo', 'sopralluogo.html'], ['modulo', 'modulo.html']]) {
        await page.goto(BASE + indirizzo);
        await page.waitForTimeout(400);
        verifica(`${dispositivo} ${nome}: nessuno scorrimento orizzontale`, !(await scorreOrizzontale(page)));
        if (process.env.FOTO) await page.screenshot({ path: path.join(SHOT, `${nome}-${sigla}.png`) });
      }
      await page.goto(BASE + 'index.html#indicatori');
      for (const livello of ['marketing', 'offerta', 'contratto', 'previsione']) {
        await clic(page, `[data-azione=livello][data-id=${livello}]`);
        verifica(`${dispositivo} indicatori ${livello}: nessuno scorrimento orizzontale`, !(await scorreOrizzontale(page)));
        if (process.env.FOTO) await page.screenshot({ path: path.join(SHOT, `indicatori-${livello}-${sigla}.png`), fullPage: dispositivo === 'desktop' });
      }
      verifica(`${dispositivo}: zero errori`, errori.length === 0, errori.join(' | '));
      await ctx.close();
    }
  },

  // App e database: stessi numeri delle query SQL (valori di generatore/controlla_dati.py)
  async database() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#indicatori');
    const r = await page.evaluate(() => {
      const k = calcolaKpi(stato.opportunita);
      const c = coerenzaPortafoglio(stato.opportunita);
      const diversi = stato.opportunita.filter((o) => {
        const db = righeDb('opportunita').find((x) => 'op' + x.id_opp === o.id);
        return calcolaPunteggio(o, stato.opportunita).totale !== db.punteggio_coerenza;
      }).length;
      return { opp: stato.opportunita.length, aperte: k.aperte, ferme: k.ferme, contratti: k.contratti, k12: k.primaRisposta, k15: k.quotaDigitali, buone: c.buone.n, diversi };
    });
    const db = await page.evaluate(() => {
      const o = righeDb('opportunita');
      return { opp: o.length, aperte: o.filter((x) => !['contratto', 'perso'].includes(x.fase)).length, contratti: o.filter((x) => x.fase === 'contratto').length,
        buone: o.filter((x) => x.punteggio_coerenza >= 70).length };
    });
    verifica('stesse opportunità, aperte e contratti del database', r.opp === db.opp && r.aperte === db.aperte && r.contratti === db.contratti, JSON.stringify(r));
    verifica('punteggio dell\'app uguale a quello del database per ogni opportunità; stesse trattative buone (K11)', r.diversi === 0 && r.buone === db.buone, r.diversi + ' diversi, buone ' + r.buone + '/' + db.buone);
    // Stato iniziale (dati del database) per la prova dell'archivio: le viste v0 devono ridare gate.db
    fs.mkdirSync(path.join(__dirname, 'archivio'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'archivio', 'stato-iniziale.json'), JSON.stringify(await page.evaluate(() => datiIniziali())));
    verifica('aperte tra 70 e 90 e ferme tra 10% e 15%', r.aperte >= 70 && r.aperte <= 90 && r.ferme / r.aperte >= 0.1 && r.ferme / r.aperte <= 0.15, r.ferme + '/' + r.aperte);
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // F3: richiesta dal modulo → preventivo e classe → pipeline → offerta firmata da link → indicatori aggiornati (meno di 90 secondi)
  async demo() {
    const inizio = Date.now();
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'sopralluogo.html?utm_source=linkedin&utm_campaign=uffici-e-commercio&utm_content=prova-03');
    await page.fill('[name=azienda]', 'Studio Demo Andromeda');
    await page.selectOption('[name=comune]', 'Modugno');
    await page.fill('[name=mq]', '400');
    await page.fill('[name=nome]', 'Dott.ssa Demo Verdi');
    await page.fill('[name=telefono]', '333 000 0000');
    await page.check('[name=privacy]');
    await page.click('[data-invio=whatsapp]');
    await page.waitForTimeout(400);
    const messaggio = await page.textContent('#testo-richiesta');
    verifica('modulo: il messaggio porta canale, campagna e contenuto', /Canale: linkedin/.test(messaggio) && /Campagna: uffici-e-commercio/.test(messaggio) && /Contenuto: prova-03/.test(messaggio));

    await page.goto(BASE + 'index.html#clienti');
    await clic(page, '.pagina-clienti [data-azione=canali]');
    await page.fill('#modulo-importa-canali textarea[name=testo]', messaggio);
    await clic(page, '#modulo-importa-canali [type=submit]');
    await clic(page, '#pulsante-importa');
    const id = await page.evaluate(() => stato.opportunita[stato.opportunita.length - 1].id);
    const nuova = await page.evaluate((i) => { const o = trova(i); return { canale: o.canale, contenuto: o.contenuto, reg: o.dataRegistrazione, prev: !!o.preventivo, fase: faseAttuale(o), classe: calcolaPunteggio(o, stato.opportunita).classe }; }, id);
    verifica('import: opportunità in Contatto con canale, contenuto, registrazione di oggi e preventivo', nuova.fase === 'contatto' && nuova.canale === 'LinkedIn' && nuova.contenuto === 'prova-03' && nuova.reg && nuova.prev, JSON.stringify(nuova));
    verifica('import: la scheda è in Pipeline con la classe', await page.isVisible(`#scheda-${id} .badge`));

    await clic(page, `#scheda-${id} [data-azione=avanza]`);                       // È qualificato
    await clic(page, `#scheda-${id} [data-azione=fissa-sopralluogo]`);
    await clic(page, '[data-azione=registra-sopralluogo]');
    await clic(page, '#modulo-fase [type=submit]');                                // Sopralluogo fatto
    await clic(page, `#scheda-${id} a[href="#preventivo-${id}"]`);                // Prepara l'offerta
    await clic(page, '[data-azione=registra-offerta]');                           // dal preventivo all'offerta
    if (await page.isVisible('#modulo-fase [name=motivazione]')) await page.fill('#modulo-fase [name=motivazione]', 'Prova della demo');
    await clic(page, '#modulo-fase [type=submit]');
    await clic(page, `#scheda-${id} [data-azione=firma-link]`);
    if (process.env.FOTO) await page.screenshot({ path: path.join(SHOT, 'firma-da-link-desktop.png') });
    await clic(page, '[data-azione=conferma-firma]');
    const firmata = await page.evaluate((i) => ({ fase: faseAttuale(trova(i)), link: trova(i).firmaDaLink, hash: location.hash }), id);
    verifica('firma da link: contratto registrato e si va all\'Allocazione', firmata.fase === 'contratto' && firmata.link && firmata.hash === '#allocazione', JSON.stringify(firmata));

    // Allocazione: in Area Nord la squadra è satura, si propone ai partner: NO e poi SÌ
    await clic(page, `#commessa-${id} [data-azione=proponi]`);
    await clic(page, `#commessa-${id} [data-azione=risposta-no]`);
    await clic(page, `#commessa-${id} [data-azione=proponi]`);
    await clic(page, `#commessa-${id} [data-azione=risposta-si]`);
    const allocazione = await page.evaluate((i) => trova(i).allocazione, id);
    verifica('allocazione: primo partner NO, secondo SÌ', allocazione && allocazione.tipo === 'partner' && allocazione.id === 'pa2', JSON.stringify(allocazione));

    await page.goto(BASE + 'index.html#indicatori');
    await clic(page, '[data-azione=livello][data-id=contratto]');
    verifica('indicatori: K3 conta il nuovo contratto (30 contratti)', /30 contratti/.test(await page.textContent('#kpi-K3')));
    const secondi = (Date.now() - inizio) / 1000;
    verifica('flusso della demo in meno di 90 secondi (con le pause del test)', secondi < 90, secondi.toFixed(1) + ' s');

    // Altri tipi di dato per la prova dell'archivio (prove/archivio.py): utente, contenuto, righe CSV reali, ricontatto
    await clic(page, '[data-azione=utente]');
    await page.fill('#modulo-utente [name=nome]', 'Alfredo R.');
    await page.selectOption('#modulo-utente [name=ruolo]', 'commerciale');
    await clic(page, '#modulo-utente [type=submit]');
    await page.goto(BASE + 'index.html#clienti');
    await clic(page, '.pagina-clienti [data-azione=canali]');
    await page.fill('#modulo-contenuto [name=tema]', 'Prova: pulizia degli studi legali');
    await clic(page, '#modulo-contenuto [type=submit]');
    await clic(page, '[data-azione=chiudi]');
    await page.goto(BASE + 'index.html#indicatori');
    await clic(page, '[data-azione=importa-csv-reali]');
    await page.setInputFiles('#modulo-csv-reali [name=file]', { name: 'prova.csv', mimeType: 'text/csv', buffer: Buffer.from(
      'data_richiesta;data_annotazione;canale;settore;data_risposta;data_offerta;esito\n2026-09-01;2026-09-02;sito;uffici e commercio;2026-09-03;2026-09-10;contratto\n2026-09-05;;telefono;sanità;;;aperta\n') });
    await page.selectOption('#modulo-csv-reali [name=fonte]', 'test');
    await clic(page, '#modulo-csv-reali [type=submit]');
    await clic(page, '#pulsante-csv-reali');
    await page.goto(BASE + 'index.html#pipeline');
    const daRicontattare = await page.evaluate(() => stato.opportunita.find((o) => trattativaAperta(o) && !trattativaFerma(o)).id);
    await page.evaluate((i) => apriDettaglio(i), daRicontattare);
    await clic(page, '[data-azione=da-ricontattare]');
    await clic(page, '#modulo-ricontatto [data-giorni="7"]');
    await clic(page, '#modulo-ricontatto [type=submit]');
    const dati = await page.evaluate(() => ({ stato, impostazioni: impostazioniDaSalvare() }));
    verifica('stato completo per l\'archivio: utente nel registro, contenuto, righe reali, ricontatto, preventivo, partner',
      dati.stato.registro.some((r) => r.chi === 'Alfredo R.') && dati.stato.contenuti.length === 1 && dati.stato.richiesteReali.length === 2
      && dati.stato.opportunita.some((o) => o.ricontatto) && dati.stato.opportunita.some((o) => o.preventivo && o.proposte.length === 2));
    fs.mkdirSync(path.join(__dirname, 'archivio'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'archivio', 'stato-demo.json'), JSON.stringify(dati.stato));
    fs.writeFileSync(path.join(__dirname, 'archivio', 'impostazioni.json'), JSON.stringify(dati.impostazioni));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // E2: preventivo indicativo e avviso sotto il margine minimo
  async preventivo() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#pipeline');
    await clic(page, '[data-azione=nuovo]');
    await page.fill('[name=ragioneSociale]', 'Ambulatorio Prova Preventivo');
    await page.selectOption('#modulo-contatto [name=canale]', 'telefono');
    await page.selectOption('[name=ambiente]', 'Ambulatori e studi medici');
    await page.fill('[name=mq]', '300');
    await page.selectOption('[name=frequenza]', '5 volte a settimana');
    await page.waitForTimeout(200);
    const ore = await page.inputValue('[name=ore]');
    const anteprima = await page.textContent('#anteprima-punteggio');
    if (process.env.FOTO) await page.screenshot({ path: path.join(SHOT, 'preventivo-desktop.png') });
    verifica('preventivo: ore calcolate da mq, ambiente e frequenza', ore === String(Math.round(300 / 90 * 5 * 4.33)), ore);
    verifica('preventivo: avviso sotto il margine minimo e contributi dei criteri', /sotto il minimo/.test(anteprima) && /Margine stimato/.test(anteprima) && /\/20/.test(anteprima));
    await page.selectOption('[name=frequenza]', '2 volte a settimana');
    await page.selectOption('[name=ambiente]', 'Uffici e studi');
    await page.waitForTimeout(200);
    verifica('preventivo: nessun avviso con un margine sufficiente', !/sotto il minimo/.test(await page.textContent('#anteprima-punteggio')));
    await clic(page, '#modulo-contatto [type=submit]');
    const o = await page.evaluate(() => { const x = stato.opportunita[stato.opportunita.length - 1]; return { prev: x.preventivo, reg: x.dataRegistrazione === oggi(), canale: x.canale }; });
    verifica('preventivo: salvato con l\'opportunità, registrazione di oggi', o.prev && o.prev.mq === 300 && o.reg && o.canale, JSON.stringify(o));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // F2: selettore della fonte e dati reali mai mescolati
  async fonti() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#indicatori');
    verifica('fonte iniziale: dati fittizi', (await page.$eval('#scelta-fonte', (s) => s.value)) === 'fittizi');
    await page.selectOption('#scelta-fonte', 'test');
    await page.waitForTimeout(300);
    verifica('fonte test: dati reali scelti, con l\'avviso di righe di esempio', (await page.$eval('#scelta-fonte', (s) => s.value)) === 'test' && /Righe di esempio/.test(await page.textContent('.barra-fonte')));
    await clic(page, '[data-azione=livello][data-id=offerta]');
    verifica('fonte test: K12 prima risposta ricalcolata sui dati reali (0,5 giorni)', /0,5 giorni/.test(await page.textContent('#kpi-K12')));
    verifica('K14, K16 e K17 non compaiono più', !(await page.$('#kpi-K14, #kpi-K16, #kpi-K17')));
    verifica('fonte test: elenco dei KPI non calcolabili', /Non calcolabili/.test(await page.textContent('#schermata')));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Opzione partner spenta: l'Allocazione verifica solo le squadre interne
  async partnerSpenti() {
    const { ctx, page, errori } = await apri('desktop', { config: (t) => t.replace('partner: true,', 'partner: false,') });
    await page.goto(BASE + 'index.html#allocazione');
    const testo = await page.textContent('#schermata');
    verifica('partner spenti: niente imprese partner né WhatsApp', !/Imprese partner/.test(testo) && !(await page.$('[data-azione=proponi]')));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Allocazione: commesse chiuse in righe, la tendina filtra per zona, i riquadri restano come li lascia l'utente
  async allocazioneZone() {
    const { ctx, page, errori } = await apri('telefono');
    await page.goto(BASE + 'index.html#allocazione');
    const tutte = await page.$$eval('details.commessa', (el) => el.length);
    const zona = await page.$eval('#filtro-zona', (s) => s.options[1].value);
    await page.selectOption('#filtro-zona', zona);
    const dopo = await page.$$eval('details.commessa', (el) => el.length);
    verifica('zona: la tendina riduce le commesse', dopo > 0 && dopo < tutte, tutte + ' → ' + dopo);
    await page.click('#riquadro-squadre-partner summary');
    await page.waitForFunction(() => interfaccia.allocazione.aperti['squadre-partner']);   // l'evento toggle arriva subito dopo il clic
    await page.selectOption('#filtro-zona', '');
    verifica('riquadro «Squadre e partner» resta aperto dopo il ridisegno', await page.$eval('#riquadro-squadre-partner', (d) => d.open));
    verifica('nessun riferimento al prototipo', !/prototip/i.test(await page.textContent('body')));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Migliorie del 21/10: Clienti a righe con «Mostra le altre», riepilogo del mese, avvisi in Pipeline
  async migliorie() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#clienti');
    const righe = await page.$$eval('.riga-cliente', (el) => el.length);
    await clic(page, '[data-azione=mostra-clienti]');
    const tutte = await page.$$eval('.riga-cliente', (el) => el.length);
    verifica('clienti: prime 30 righe, poi tutte con «Mostra le altre»', righe === 30 && tutte === await page.evaluate(() => stato.aziende.length), righe + ' → ' + tutte);
    verifica('clienti: ogni riga ha i pulsanti di contatto', (await page.$$('.riga-cliente .contatti-tutti a')).length > 0);
    await page.goto(BASE + 'index.html#riepilogo');
    const numeri = await page.$$eval('#foglio-riepilogo .riepilogo-numero', (el) => el.length);
    const azioni = await page.$$eval('#foglio-riepilogo .riepilogo-azioni tr', (el) => el.length);
    verifica('riepilogo del mese: 6 numeri del mese, 4 di oggi, 4 previsioni', numeri === 10 && azioni === 4, numeri + ' numeri, ' + azioni + ' righe');
    await page.emulateMedia({ media: 'print' });
    verifica('riepilogo: in stampa si vede solo il foglio', await page.$eval('.barra-laterale', (el) => getComputedStyle(el).visibility) === 'hidden'
      && await page.$eval('#foglio-riepilogo', (el) => getComputedStyle(el).visibility) === 'visible');
    await page.emulateMedia({ media: 'screen' });
    await page.goto(BASE + 'index.html#pipeline');
    const avvisi = await page.$$eval('.riga-avvisi .avviso-chip', (el) => el.map((e) => e.dataset.azione));
    verifica('avvisi: offerte, commesse da assegnare e DURC', ['vai-domani', 'vai-allocazione', 'vai-partner'].every((x) => avvisi.includes(x)), avvisi.join(','));
    await clic(page, '.riga-avvisi [data-azione=vai-partner]');
    await page.waitForSelector('#riquadro-squadre-partner[open]');
    verifica('avviso DURC: apre Allocazione con squadre e partner in vista', page.url().endsWith('#allocazione'));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // N1 (PASSAGGIO 4): richiesta da nota. Le 5 note di prova: almeno 7 campi su 9 per nota; poi il flusso dalla nota alla conferma
  async nota() {
    const { ctx, page, errori } = await apri('telefono');
    await page.goto(BASE + 'index.html#pipeline');
    const esiti = await page.evaluate(() => CONFIG.assistente.noteDiProva.map((n) => controllaNota(n)));
    esiti.forEach((e, i) => verifica(`nota di prova ${i + 1}: ${e.corretti}/9 campi corretti`, e.corretti >= 7, e.errori.join('; ')));
    const prima = await page.evaluate(() => stato.opportunita.length);
    await clic(page, '[data-azione=nuovo]');
    await clic(page, '[data-azione=nota]');
    await page.selectOption('#modulo-nota [name=esempio]', '0');
    await page.waitForSelector('.campo-nota');
    const stati = await page.$$eval('.campo-nota[data-stato]', (el) => el.map((e) => e.dataset.stato));
    verifica('scheda: ogni campo con stato e frase da cui viene', stati.length === 12 && stati.includes('sicuro') && (await page.$$('.frase-nota')).length >= 9, stati.join(','));
    verifica('niente si salva prima della conferma', (await page.evaluate(() => stato.opportunita.length)) === prima);
    await page.fill('#modulo-nota [name=nome]', 'Dott.ssa Laura Bianchi');
    verifica('un campo corretto a mano diventa «corretto da te»', /corretto da te/.test(await page.textContent('#stato-nome')));
    if (process.env.FOTO) await page.screenshot({ path: path.join(SHOT, 'nota-mobile.png'), fullPage: true });
    await page.waitForTimeout(1100);
    await clic(page, '#conferma-nota');
    const r = await page.evaluate(() => {
      const o = stato.opportunita[stato.opportunita.length - 1];
      const t = stato.tempiRegistrazione[stato.tempiRegistrazione.length - 1];
      return { n: stato.opportunita.length, azienda: nomeCliente(o), canale: o.canale, fase: faseAttuale(o), reg: o.dataRegistrazione, prev: o.preventivo,
        punteggio: calcolaPunteggio(o, stato.opportunita).totale, secondi: t && t.secondi, tempoDi: t && t.opportunitaId === o.id, hash: location.hash, id: o.id };
    });
    verifica('conferma: opportunità in Contatto con canale, registrazione di oggi, preventivo e punteggio', r.n === prima + 1 && r.azienda === 'Studio Legale Ferri'
      && r.canale === 'LinkedIn' && r.fase === 'contatto' && r.reg && r.prev && r.prev.mq === 350 && r.punteggio > 0, JSON.stringify(r));
    verifica('secondi della registrazione salvati', r.tempoDi && r.secondi >= 1, r.secondi + ' s');
    verifica('dopo la conferma si apre il preventivo', r.hash === '#preventivo-' + r.id, r.hash);

    // N2: offerta da pacchetto, stampabile senza margine, segnata come inviata e firmata da link
    await page.selectOption('#modulo-preventivo [name=pacchetto]', 'Plus');
    await page.waitForTimeout(200);
    const conti = await page.evaluate(() => { const m = document.getElementById('modulo-preventivo'); return { ore: Number(m.ore.value), tariffa: Number(m.tariffa.value), frequenza: m.frequenza.value }; });
    verifica('pacchetto Plus: frequenza del pacchetto e prezzo = mq × €/mq all\'anno', conti.frequenza === '3 volte a settimana' && Math.abs(conti.ore * conti.tariffa * 12 - 350 * 23) < conti.ore * 12 * 0.01, JSON.stringify(conti));
    const offerta = await page.textContent('#stampa-preventivo');
    verifica('offerta stampabile: pacchetto, servizi inclusi, prezzo, validità, condizioni e nessun margine',
      /pacchetto Plus/.test(offerta) && /Servizi inclusi/.test(offerta) && /all'anno/.test(offerta) && /fino al/.test(offerta) && /Condizioni essenziali/.test(offerta) && !/[Mm]argine/.test(offerta));
    await clic(page, '[data-azione=registra-offerta]');
    await clic(page, '#modulo-fase [type=submit]');
    const inviata = await page.evaluate((i) => { const o = trova(i); return { fase: faseAttuale(o), offerta: o.storico.offerta, scadenza: o.scadenzaOfferta, pacchetto: o.preventivo.pacchetto,
      sopralluogo: stato.attivita.some((x) => x.opportunitaId === i || x.aziendaId === o.aziendaId && /sopralluogo non necessario/.test(x.testo)) }; }, r.id);
    verifica('«Segna l\'offerta come inviata»: data di invio, validità, pacchetto; fasi saltate dichiarate', inviata.fase === 'offerta' && inviata.offerta && inviata.scadenza && inviata.pacchetto === 'Plus' && inviata.sopralluogo, JSON.stringify(inviata));
    verifica('dopo l\'offerta si torna alla Pipeline con la scheda in vista', await page.evaluate(() => location.hash) === '#pipeline' && await page.isVisible(`#scheda-${r.id}`));
    await clic(page, `#scheda-${r.id} [data-azione=firma-link]`);
    await clic(page, '[data-azione=conferma-firma]');
    const firmata = await page.evaluate((i) => { const o = trova(i); return { fase: faseAttuale(o), link: o.firmaDaLink, chiusura: o.storico.contratto, scadenza: o.scadenzaContratto, oggi: oggi() }; }, r.id);
    verifica('firma da link: contratto, firma_da_link, chiusura oggi e scadenza a 12 mesi', firmata.fase === 'contratto' && firmata.link && firmata.chiusura === firmata.oggi
      && firmata.scadenza === firmata.oggi.replace(/^\d{4}/, (a) => String(Number(a) + 1)), JSON.stringify(firmata));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // N3 (PASSAGGIO 4): tempo risparmiato. I totali si aggiornano cambiando un parametro; con 3 tempi veri il «dopo» è la loro media
  async tempoRisparmiato() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#indicatori');
    await clic(page, '[data-azione=livello][data-id=previsione]');
    const prima = await page.evaluate(() => tempoRisparmiato());
    verifica('quattro attività con volumi dai dati (richieste e offerte del mese)', prima.righe.length === 4 && prima.righe[0].volume > 0 && prima.righe[1].volume > 0,
      prima.righe.map((r) => r.id + ' ' + r.volume).join(', '));
    console.log(`  ..   tempo risparmiato con i parametri di partenza: ${prima.ore.toFixed(1)} ore, ${Math.round(prima.euro)} € al mese`);
    await page.fill('[data-tempo=offerta][data-quale=prima]', '120');
    const testo = await page.textContent('#tempo-ore');
    verifica('cambiando un parametro il totale si aggiorna', Number(testo.replace(/[^\d,]/g, '').replace(',', '.')) > prima.ore, testo);
    await page.evaluate(() => { stato.tempiRegistrazione = [30, 42, 48].map((s, i) => ({ id: 'tr' + i, secondi: s, data: oggi() })); disegna(); });
    const veri = await page.evaluate(() => tempoRisparmiato().righe[0]);
    verifica('con 3 richieste da nota il «dopo» è la media vera (40 s = 0,7 min)', veri.dopoVero && veri.dopo === 0.7, JSON.stringify(veri));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // N4 (PASSAGGIO 4): lista del lunedì, uguale al database (controlla_dati.py) a oggi e al 13/10 del database
  async lunedi() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#pipeline');
    await clic(page, '#da-seguire .link-lunedi');
    const conta = (rif) => page.evaluate((r) => Object.fromEntries(listaLunedi(r).map((s) => [s.id, s.righe.length]).concat([['evidenza', listaLunedi(r)[3].righe.filter((x) => x.evidenza).length]])), rif);
    const oggiApp = await conta(await page.evaluate(() => oggi()));
    verifica('al 19/10 del database: risposta 0, ferme 6, offerte 11, rinnovi 12 (8 entro 60 giorni)', JSON.stringify(oggiApp) === JSON.stringify({ risposta: 0, ferme: 6, offerte: 11, rinnovi: 12, evidenza: 8 }), JSON.stringify(oggiApp));
    const r13 = await page.evaluate(() => aggiungiGiorni(oggi(), -6));
    await page.fill('#data-lunedi', r13);
    await page.dispatchEvent('#data-lunedi', 'change');
    await page.waitForTimeout(200);
    const al13 = await conta(r13);
    verifica('al 13/10 del database: risposta 6, ferme 20, offerte 12, rinnovi 9; la pagina segue la data scelta', al13.risposta === 6 && al13.ferme === 20 && al13.offerte === 12 && al13.rinnovi === 9
      && (await page.$$('#lunedi-risposta tbody tr')).length === 6, JSON.stringify(al13));
    const righe = await page.$$eval('#lunedi-ferme tbody tr', (tr) => tr.map((r) => r.textContent));
    verifica('ogni riga: cliente, punteggio, valore, giorni, responsabile e azione suggerita', righe.length > 0 && /Riprendere: ferma da/.test(righe[0]) && /Commerciale|Intermediario|da assegnare/.test(righe[0]));
    const testo = await page.evaluate(() => testoLunedi());
    verifica('copia come testo: titolo, sezioni e righe', /^LISTA DEL LUNEDÌ/.test(testo) && /4\. CONTRATTI DA RINNOVARE/.test(testo) && testo.split('\n').length > 30);
    await page.emulateMedia({ media: 'print' });
    verifica('stampa: solo il foglio', await page.$eval('#foglio-lunedi', (el) => getComputedStyle(el).visibility) === 'visible' && await page.$eval('.data-lunedi', (el) => getComputedStyle(el).display) === 'none');
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // N5 (PASSAGGIO 4): ponte con il gestionale. Export dei 7 CSV, import con controlli, sostituzione dopo il backup
  async ponte() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#clienti');
    await clic(page, '.pagina-clienti [data-azione=ponte]');
    const scaricati = [];
    page.on('download', (d) => scaricati.push(d));
    await clic(page, '#modulo-ponte [data-azione=esporta-ponte]:not([data-id])');
    await page.waitForTimeout(3000);
    const cartella = path.join(__dirname, 'archivio', 'ponte');
    fs.mkdirSync(cartella, { recursive: true });
    const percorsi = [];
    for (const d of scaricati) {
      const nome = d.suggestedFilename().replace(/^gate-/, '').replace(/-\d{4}-\d{2}-\d{2}/, '');
      await d.saveAs(path.join(cartella, nome));
      percorsi.push(path.join(cartella, nome));
    }
    const intestazione = fs.readFileSync(path.join(cartella, 'opportunita.csv'), 'utf8').split('\r\n')[0];
    verifica('export: 7 CSV con i nomi del dizionario', scaricati.length === 7 && /^id_opp,id_cliente,id_commerciale,id_referente,canale/.test(intestazione), scaricati.map((d) => d.suggestedFilename()).join(', '));
    // File con una riga sbagliata: viene scartata con il motivo, le altre passano
    const sbagliato = path.join(cartella, '..', 'opportunita-con-errore.csv');
    fs.writeFileSync(sbagliato, fs.readFileSync(path.join(cartella, 'opportunita.csv'), 'utf8') + '9999,8888,,,LinkedIn,cleaning e hospitality,trattativa,,,,2026-10-01,,,,,,,,,,,,\r\n');
    await page.setInputFiles('#modulo-ponte [name=file]', percorsi.filter((x) => !x.endsWith('opportunita.csv')).concat(sbagliato));
    await clic(page, '#modulo-ponte [type=submit]');
    await page.waitForSelector('#anteprima-ponte table');
    const anteprima = await page.textContent('#anteprima-ponte');
    verifica('import: righe valide per tabella e riga scartata con il motivo', /Righe scartate/.test(anteprima) && /fase non ammesso/.test(anteprima) && /cliente 8888 inesistente/.test(anteprima), anteprima.slice(0, 200));
    await page.evaluate(() => { stato.opportunita[0].note = 'modifica da non perdere: finisce nel backup'; salva(); });
    const [backup] = await Promise.all([page.waitForEvent('download'), clic(page, '#pulsante-ponte')]);
    const dopo = await page.evaluate(() => ({ opp: stato.opportunita.length, az: stato.aziende.length, hash: location.hash, valido: strutturaValida(stato) }));
    verifica('sostituzione: prima il backup dei dati attuali, poi i dati del gestionale', /backup/.test(backup.suggestedFilename()) && dopo.opp === 300 && dopo.az === 120 && dopo.valido && dopo.hash === '#pipeline', JSON.stringify(dopo));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Dati della versione 3 salvati nel browser: migrati senza errori, con l'avviso per passare ai dati del database
  async migrazione() {
    const vecchi = fs.readFileSync(path.join(__dirname, 'backup-v3.json'), 'utf8');
    const { ctx, page, errori } = await apri('desktop', { initScript: `if (!sessionStorage.getItem('fatto')) { localStorage.setItem('gate-sviluppo-commerciale-v2', ${JSON.stringify(vecchi)}); sessionStorage.setItem('fatto', '1'); }` });
    await page.goto(BASE + 'index.html#pipeline');
    const prima = await page.evaluate(() => ({ n: stato.opportunita.length, servizio: stato.opportunita[0].servizio, canale: stato.opportunita[0].canale, versione: stato.versione }));
    verifica('migrazione v3 → v4: dizionari tradotti e canale per opportunità', prima.versione === 4 && prima.servizio === 'cleaning e hospitality' && prima.canale, JSON.stringify(prima));
    verifica('migrazione: avviso «Usa i nuovi dati»', await page.isVisible('#avviso-fisso [data-azione=ripristina]'));
    await clic(page, '#avviso-fisso [data-azione=ripristina]');
    await clic(page, '[data-azione=conferma-ripristino]');
    verifica('ripristino: dati del database (300 opportunità)', (await page.evaluate(() => stato.opportunita.length)) === 300);
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Modifica 1: canale e data della richiesta obbligatori, date di annotazione e prima risposta
  async canale() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#pipeline');
    const prima = await page.evaluate(() => stato.opportunita.length);
    await clic(page, '[data-azione=nuovo]');
    await page.fill('[name=ragioneSociale]', 'Studio Prova Canale');
    await page.fill('[name=ore]', '20');
    await clic(page, '#modulo-contatto [type=submit]');
    verifica('senza canale non si salva', (await page.evaluate(() => stato.opportunita.length)) === prima && await page.isVisible('#modulo-contatto'));
    await page.selectOption('#modulo-contatto [name=canale]', 'email');
    await page.fill('[name=dataRichiesta]', '');
    await clic(page, '#modulo-contatto [type=submit]');
    verifica('senza data della richiesta non si salva', (await page.evaluate(() => stato.opportunita.length)) === prima);
    const ieri = await page.evaluate(() => traGiorni(-1));
    await page.fill('[name=dataRichiesta]', ieri);
    await page.click('#altre-date summary');
    await page.fill('[name=dataRisposta]', ieri);
    await clic(page, '#modulo-contatto [type=submit]');
    const o = await page.evaluate(() => { const x = stato.opportunita[stato.opportunita.length - 1]; return { c: x.canale, r: x.storico.contatto, a: x.dataRegistrazione, p: x.dataPrimaRisposta, oggi: oggi() }; });
    verifica('salvata con canale, data richiesta, annotazione di oggi e prima risposta', o.c === 'email' && o.r === ieri && o.a === o.oggi && o.p === ieri, JSON.stringify(o));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Modifica 1: import di un CSV a 7 colonne con 12 righe, elenco a parte, KPI ricalcolati; export
  async csv() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#indicatori');
    await clic(page, '[data-azione=importa-csv-reali]');
    const righe = ['data_richiesta;data_annotazione;canale;settore;data_risposta;data_offerta;esito'];
    for (let i = 1; i <= 12; i++) righe.push(`2026-09-${String(i).padStart(2, '0')};2026-09-${String(i).padStart(2, '0')};${i % 2 ? 'sito' : 'telefono'};uffici e commercio;2026-09-${String(i + 1).padStart(2, '0')};;${i % 3 ? 'aperta' : 'contratto'}`);
    await page.setInputFiles('#modulo-csv-reali [name=file]', { name: 'prova.csv', mimeType: 'text/csv', buffer: Buffer.from(righe.join('\n')) });
    await page.selectOption('#modulo-csv-reali [name=fonte]', 'test');
    await clic(page, '#modulo-csv-reali [type=submit]');
    verifica('controllo del file: 12 righe valide', /12 righe valide/.test(await page.textContent('#anteprima-csv-reali')));
    await clic(page, '#pulsante-csv-reali');
    await clic(page, '[data-azione=livello][data-id=offerta]');
    verifica('le 12 righe sono nell\'elenco delle richieste', (await page.$$('#elenco-reali tbody tr')).length === 12);
    verifica('K12 ricalcolato dal CSV: 1 giorno', /^1 giorno$/.test((await page.textContent('#kpi-K12 .kpi-valore')).trim()));
    verifica('K13 senza date di offerta: «nessun dato», non zero', (await page.textContent('#kpi-K13 .kpi-valore')).trim() === 'nessun dato');
    verifica('pipeline invariata: le righe reali non entrano tra le opportunità', (await page.evaluate(() => stato.opportunita.length)) === 300);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-azione=esporta-csv-richieste]')]);
    const testo = fs.readFileSync(await download.path(), 'utf8');
    verifica('export CSV a 7 colonne', testo.split('\r\n')[0].replace(/\uFEFF|"/g, '') === 'data_richiesta;data_annotazione;canale;settore;data_risposta;data_offerta;esito' && testo.split('\r\n').length === 13);
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Modifica 3: «Da ricontattare» bloccato senza data, promemoria quando la data è scaduta; stima su 200 mq x 3 volte
  async ricontatto() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#pipeline');
    const id = await page.evaluate(() => stato.opportunita.find((o) => trattativaAperta(o) && !trattativaFerma(o)).id);
    await page.evaluate((i) => apriDettaglio(i), id);
    await clic(page, '[data-azione=da-ricontattare]');
    await clic(page, '#modulo-ricontatto [type=submit]');
    verifica('senza data non diventa «Da ricontattare»', !(await page.evaluate((i) => !!trova(i).ricontatto, id)) && await page.isVisible('#modulo-ricontatto'));
    await clic(page, '#modulo-ricontatto [data-giorni="7"]');
    await clic(page, '#modulo-ricontatto [type=submit]');
    verifica('con la data diventa «Da ricontattare»', await page.evaluate((i) => !!trova(i).ricontatto, id));
    // La data arriva: si simula spostando indietro il ricontatto
    await page.evaluate((i) => { trova(i).ricontatto.data = traGiorni(-1); salva(); disegna(); }, id);
    verifica('ricontatto scaduto in «Da seguire» e sulla scheda', /Ricontattare: scaduto/.test(await page.textContent('#da-seguire')) && /scaduto/.test(await page.textContent('#scheda-' + id)));
    await clic(page, `#scheda-${id} [data-azione=ricontattato]`);
    verifica('«Ricontattato» toglie l\'etichetta', !(await page.evaluate((i) => !!trova(i).ricontatto, id)));
    await clic(page, '[data-azione=nuovo]');
    await page.selectOption('[name=ambiente]', 'Uffici e studi');
    await page.fill('[name=mq]', '200');
    await page.selectOption('[name=frequenza]', '3 volte a settimana');
    await page.waitForTimeout(200);
    const stima = await page.textContent('#anteprima-punteggio');
    verifica('200 mq x 3 volte a settimana: stima con ore, prezzo e «stima»', await page.inputValue('[name=ore]') === String(Math.round(200 / 150 * 3 * 4.33)) && /Preventivo indicativo/.test(stima) && /stima/i.test(stima), stima.slice(0, 120));
    await page.fill('[name=tariffa]', '30');
    await page.waitForTimeout(200);
    verifica('la tariffa si cambia e la stima si aggiorna', /30 €\/ora/.test(await page.textContent('#anteprima-punteggio')));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Modifica 4: livelli Direzione, Commerciale, Operativo/adozione con i codici K e la riga in parole
  async livelli() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#indicatori');
    const attesi = { marketing: ['K15', 'K4'], offerta: ['K12', 'K1', 'K2', 'K13', 'K9'], contratto: ['K3', 'K7', 'K8', 'K10'], previsione: ['K6', 'K5', 'K11'] };
    for (const [livello, codici] of Object.entries(attesi)) {
      await clic(page, `[data-azione=livello][data-id=${livello}]`);
      const presenti = await page.$$eval('.kpi[id^=kpi-]', (els) => els.map((e) => e.id.slice(4)));
      const spiegati = await page.$$eval('.kpi[id^=kpi-] .kpi-spiegazione', (els) => els.filter((e) => e.textContent.trim().length > 20).length);
      verifica(`${livello}: ${codici.join(', ')} con la spiegazione in parole`, codici.every((c) => presenti.includes(c)) && spiegati === presenti.length, presenti.join(','));
    }
    // «Cosa fare domani» (l'ultima sezione aperta): quattro previsioni, ognuna con la base del calcolo e le azioni
    const previsioni = await page.$$eval('.previsione', (els) => els.map((e) => ({ base: !!e.querySelector('.previsione-base'), azioni: e.querySelectorAll('.elenco-consigli li').length })));
    verifica('cosa fare domani: 4 previsioni con base e azioni', previsioni.length === 4 && previsioni.every((x) => x.base) && previsioni.some((x) => x.azioni > 0), JSON.stringify(previsioni));
    verifica('niente etichette delle quattro domande', !(await page.$('.domanda')) && !/Cosa è successo\?/.test(await page.textContent('#schermata')));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Archivio: record cambiati a ogni salvataggio, utente e ruolo, registro delle modifiche, Annulla
  async archivio() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#pipeline');
    // Si intercetta la scrittura dell'archivio per vedere quali record arrivano
    await page.evaluate(() => { const s = ARCHIVI.locale.scrivi; window.ultime = null; ARCHIVI.locale.scrivi = (d, m) => { window.ultime = m; s(d, m); }; });
    await clic(page, '#riga-utente [data-azione=utente]');
    await page.fill('#modulo-utente [name=nome]', 'Alfredo Prova');
    await page.selectOption('#modulo-utente [name=ruolo]', 'commerciale');
    await clic(page, '#modulo-utente [type=submit]');
    verifica('utente e ruolo nel piè di pagina', /Alfredo Prova/.test(await page.textContent('#riga-utente')) && /commerciale/.test(await page.textContent('#riga-utente')));
    await page.goto(BASE + 'index.html#indicatori');
    verifica('il ruolo commerciale apre la vista «Fino all\'offerta»', /Fino all'offerta/.test(await page.textContent('h1')));
    await page.evaluate(() => { const s = ARCHIVI.locale.scrivi; ARCHIVI.locale.scrivi = (d, m) => { window.ultime = m; s(d, m); }; });
    const id = await page.evaluate(() => stato.opportunita.find((o) => trattativaAperta(o) && faseRaggiunta(o) === 0).id);
    await page.goto(BASE + 'index.html#pipeline');
    await page.evaluate(() => { const s = ARCHIVI.locale.scrivi; ARCHIVI.locale.scrivi = (d, m) => { window.ultime = m; s(d, m); }; });
    await clic(page, `#scheda-${id} [data-azione=avanza]`);
    const m = await page.evaluate(() => window.ultime);
    verifica('un passo di fase manda all\'archivio solo i record toccati', m && m.cambiati.some((x) => x.raccolta === 'opportunita') && m.cambiati.length + m.aggiunti.length <= 6 && m.eliminati.length <= 1, JSON.stringify(m));
    const riga = await page.evaluate(() => stato.registro[stato.registro.length - 1]);
    verifica('registro: chi, quando e cosa', riga && riga.chi === 'Alfredo Prova' && /passa a «Qualificato»/.test(riga.cosa) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(riga.quando), JSON.stringify(riga));
    await page.click('#avviso [data-azione=annulla]');
    await page.waitForTimeout(400);
    verifica('Annulla torna indietro e resta nel registro', (await page.evaluate((i) => faseRaggiunta(trova(i)), id)) === 0 && /Annullata/.test(await page.evaluate(() => stato.registro[stato.registro.length - 1].cosa)));
    await clic(page, '#riga-utente [data-azione=registro]');
    verifica('finestra del registro con le modifiche', (await page.$$('#finestra tbody tr')).length >= 2);
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Supporto al preventivo: misure del sopralluogo, conti, prezzi di riferimento, salvataggio, offerta
  async preventivoSchermata() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#pipeline');
    const id = await page.evaluate(() => stato.opportunita.find((o) => faseAttuale(o) === 'qualificato' && o.servizio === 'cleaning e hospitality').id);
    // Sopralluogo fatto: le misure ricalcolano le ore
    await page.evaluate((i) => apriFase(trova(i), CONFIG.fasi.find((f) => f.id === 'sopralluogo')), id);
    await page.selectOption('#modulo-fase [name=ambiente]', 'Uffici e studi');
    await page.fill('#modulo-fase [name=mq]', '200');
    await page.selectOption('#modulo-fase [name=frequenza]', '3 volte a settimana');
    await page.waitForTimeout(200);
    verifica('sopralluogo: 200 mq x 3 volte ricalcolano le ore (17)', await page.inputValue('#modulo-fase [name=ore]') === '17');
    await clic(page, '#modulo-fase [type=submit]');
    verifica('sopralluogo: le misure restano nel preventivo', await page.evaluate((i) => trova(i).preventivo && trova(i).preventivo.mq === 200, id));
    await clic(page, `#scheda-${id} a[href="#preventivo-${id}"]`);
    verifica('schermata Preventivo con le misure del sopralluogo', /Preventivo/.test(await page.title()) && await page.inputValue('#modulo-preventivo [name=mq]') === '200');
    await clic(page, '[data-azione=usa-tariffa]');
    const testo = await page.textContent('#risultato-preventivo');
    verifica('tariffa minima: margine al 12% e prezzi di riferimento', /12,\d%|12%/.test(testo) && /Mediana dei contratti/.test(testo) && /stima|prova/i.test(await page.textContent('#schermata')), testo.slice(0, 160));
    await page.fill('#modulo-preventivo [name=tariffa]', '15');
    await page.waitForTimeout(200);
    verifica('tariffa troppo bassa: avviso sotto il margine minimo', /Sotto il margine minimo/.test(await page.textContent('#risultato-preventivo')));
    await page.fill('#modulo-preventivo [name=tariffa]', '26');
    await clic(page, '[data-azione=registra-offerta]');
    verifica('dal preventivo all\'offerta: la finestra propone la tariffa scelta', await page.inputValue('#modulo-fase [name=tariffa]') === '26');
    await clic(page, '#modulo-fase [type=submit]');
    const o = await page.evaluate((i) => ({ fase: faseAttuale(trova(i)), tariffa: tariffaOraria(trova(i)), valore: valoreAnnuo(trova(i)) }), id);
    verifica('offerta registrata con il valore del preventivo', o.fase === 'offerta' && o.tariffa === 26 && o.valore === 17 * 26 * 12, JSON.stringify(o));
    verifica('il riepilogo per il cliente non mostra costi né margini', await page.evaluate(() => {
      location.hash = 'preventivo-' + stato.opportunita.find((x) => faseAttuale(x) === 'offerta').id; disegna();
      const t = document.getElementById('stampa-preventivo').textContent; return /IVA esclusa/.test(t) && !/[Mm]argine|Costo/.test(t);
    }));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // E4: piano dei contenuti con link tracciati e aggiunta di un contenuto
  async contenuti() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#clienti');
    await clic(page, '.pagina-clienti [data-azione=canali]');
    if (process.env.FOTO) await page.screenshot({ path: path.join(SHOT, 'sito-e-social-desktop.png') });
    const link = await page.inputValue('#link-contenuto-prova-01');
    verifica('piano dei contenuti: link con utm_source, utm_campaign e utm_content', /utm_source=linkedin/.test(link) && /utm_campaign=uffici-e-commercio/.test(link) && /utm_content=prova-01/.test(link), link);
    verifica('canali spenti non proposti nei link', !(await page.$('#link-facebook')) && !(await page.$('#link-google-ads')));
    await page.fill('#modulo-contenuto [name=tema]', 'Prova: pulizia degli studi legali');
    await clic(page, '#modulo-contenuto [type=submit]');
    verifica('contenuto aggiunto al piano con il suo link', (await page.$$('[id^=link-contenuto-app-]')).length === 1);
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },
};

(async () => {
  browser = await chromium.launch({ args: ['--proxy-server=' + (process.env.HTTPS_PROXY || 'direct://'), '--proxy-bypass-list=127.0.0.1;localhost'] });
  for (const [nome, prova] of Object.entries(PROVE)) {
    if (filtro && !nome.toLowerCase().includes(filtro.toLowerCase())) continue;
    console.log('\n' + nome);
    try { await prova(); } catch (e) { verifica(nome + ' (eccezione)', false, e.message.split('\n')[0]); }
  }
  await browser.close();
  const falliti = esiti.filter((e) => !e.ok).length;
  console.log(`\n${esiti.length - falliti}/${esiti.length} verifiche superate`);
  process.exit(falliti ? 1 : 0);
})();
