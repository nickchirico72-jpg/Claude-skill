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
      for (const [nome, indirizzo] of [['oggi', 'index.html#oggi'], ['clienti', 'index.html#clienti'], ['scheda-cliente', 'index.html#cliente-c1'],
        ['allocazione', 'index.html#allocazione'], ['indicatori', 'index.html#indicatori'], ['riepilogo', 'index.html#riepilogo'], ['lunedi', 'index.html#lunedi'], ['come-funziona', 'index.html#come-funziona'], ['direzione', 'index.html#direzione'], ['documenti', 'index.html#documenti'], ['sopralluogo', 'sopralluogo.html'], ['modulo', 'modulo.html']]) {
        await page.goto(BASE + indirizzo);
        await page.waitForTimeout(400);
        verifica(`${dispositivo} ${nome}: nessuno scorrimento orizzontale`, !(await scorreOrizzontale(page)));
        if (process.env.FOTO) await page.screenshot({ path: path.join(SHOT, `${nome}-${sigla}.png`) });
      }
      // #pipeline resta un indirizzo valido (alias di Oggi) e l'indirizzo vuoto apre Oggi
      await page.goto(BASE + 'index.html#pipeline');
      await page.waitForTimeout(300);
      verifica(`${dispositivo}: #pipeline apre Oggi senza riscrivere l'indirizzo`, await page.isVisible('.pagina-oggi') && !!(await page.$('[data-vai=oggi][aria-current=page]')) && await page.evaluate(() => location.hash) === '#pipeline');
      await page.goto(BASE + 'index.html');
      await page.waitForTimeout(300);
      verifica(`${dispositivo}: senza indirizzo si apre Oggi`, (await page.textContent('#schermata h1')).trim() === 'Oggi');
      await page.goto(BASE + 'index.html#constructor');   // una proprietà nascosta degli oggetti non è una schermata
      await page.waitForTimeout(300);
      verifica(`${dispositivo}: #constructor apre Oggi senza errori`, (await page.textContent('#schermata h1')).trim() === 'Oggi' && errori.length === 0, errori.join(' | '));
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
    verifica('import: la scheda è in Oggi, tra le trattative per fase, con il punteggio', await page.isVisible(`#scheda-${id} .badge`));

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
    await page.goto(BASE + 'index.html#documenti');
    await clic(page, '[data-azione=importa-csv-reali]');
    await page.setInputFiles('#modulo-csv-reali [name=file]', { name: 'prova.csv', mimeType: 'text/csv', buffer: Buffer.from(
      'data_richiesta;data_annotazione;canale;settore;data_risposta;data_offerta;esito\n2026-09-01;2026-09-02;sito;uffici e commercio;2026-09-03;2026-09-10;contratto\n2026-09-05;;telefono;sanità;;;aperta\n') });
    await page.selectOption('#modulo-csv-reali [name=fonte]', 'test');
    await clic(page, '#modulo-csv-reali [type=submit]');
    await clic(page, '#pulsante-csv-reali');
    await page.goto(BASE + 'index.html#oggi');
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
    await page.goto(BASE + 'index.html#clienti');
    await clic(page, '.pagina-clienti [data-azione=nuovo]');
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

  // Migliorie del 21/10: Clienti a righe con «Mostra le altre», riepilogo del mese, avvisi in Oggi
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
    await page.goto(BASE + 'index.html#oggi');
    const avvisi = await page.$$eval('.riga-avvisi .avviso-chip', (el) => el.map((e) => e.dataset.azione));
    verifica('avvisi: commesse da assegnare e DURC (le offerte scadute sono una scheda «Sollecita»)', ['vai-allocazione', 'vai-partner'].every((x) => avvisi.includes(x)) && !avvisi.includes('vai-domani'), avvisi.join(','));
    verifica('offerta scaduta: scheda o riga «Sollecita» in Oggi', /Sollecita/.test(await page.textContent('.pagina-oggi')));
    await clic(page, '.riga-avvisi [data-azione=vai-partner]');
    await page.waitForSelector('#riquadro-squadre-partner[open]');
    verifica('avviso DURC: apre Allocazione con squadre e partner in vista', page.url().endsWith('#allocazione'));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // N1 (PASSAGGIO 4): richiesta da nota. Le 5 note di prova: almeno 7 campi su 9 per nota; poi il flusso dalla nota alla conferma
  async nota() {
    const { ctx, page, errori } = await apri('telefono');
    await page.goto(BASE + 'index.html#oggi');
    const esiti = await page.evaluate(() => CONFIG.assistente.noteDiProva.map((n) => controllaNota(n)));
    esiti.forEach((e, i) => verifica(`nota di prova ${i + 1}: ${e.corretti}/9 campi corretti`, e.corretti >= 7, e.errori.join('; ')));
    const prima = await page.evaluate(() => stato.opportunita.length);
    await clic(page, '.pagina-oggi [data-azione=nota]');   // «Nuova richiesta» apre direttamente la nota
    await page.selectOption('#modulo-nota [name=esempio]', '0');
    await page.waitForSelector('.campo-nota');
    const stati = await page.$$eval('.campo-nota[data-stato]', (el) => el.map((e) => e.dataset.stato));
    verifica('scheda: ogni campo con stato e frase da cui viene', stati.length === 13 && stati.includes('sicuro') && (await page.$$('.frase-nota')).length >= 9, stati.join(','));
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
    verifica('dopo l\'offerta si torna a Oggi con la scheda in vista tra le fasi', await page.evaluate(() => location.hash) === '#oggi' && await page.isVisible(`#scheda-${r.id}`));
    await clic(page, `#scheda-${r.id} [data-azione=firma-link]`);
    await clic(page, '[data-azione=conferma-firma]');
    const firmata = await page.evaluate((i) => { const o = trova(i); return { fase: faseAttuale(o), link: o.firmaDaLink, chiusura: o.storico.contratto, scadenza: o.scadenzaContratto, oggi: oggi() }; }, r.id);
    verifica('firma da link: contratto, firma_da_link, chiusura oggi e scadenza a 12 mesi', firmata.fase === 'contratto' && firmata.link && firmata.chiusura === firmata.oggi
      && firmata.scadenza === firmata.oggi.replace(/^\d{4}/, (a) => String(Number(a) + 1)), JSON.stringify(firmata));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // US-R2 (PASSAGGIO 5): schermata Oggi. Al massimo 3 schede d'azione con un solo pulsante, poi «Poi, se resta tempo», poi le fasi
  async oggi() {
    for (const dispositivo of ['desktop', 'telefono']) {
      const { ctx, page, errori } = await apri(dispositivo);
      await page.goto(BASE + 'index.html#oggi');
      await page.waitForTimeout(400);
      // Giornata libera: niente richieste senza risposta, sopralluoghi, offerte da preparare o scadute, promemoria scaduti
      const svuotaUrgenze = async () => {
        await page.evaluate(() => {
          stato.attivita.forEach((x) => { if (x.daFare && x.data <= oggi()) { x.daFare = false; } });
          stato.opportunita.filter(trattativaAperta).forEach((o) => {
            if (!o.dataPrimaRisposta) o.dataPrimaRisposta = oggi();
            if (faseAttuale(o) === 'sopralluogo') { o.storico.offerta = oggi(); o.scadenzaOfferta = traGiorni(30); }
            if (o.scadenzaOfferta && o.scadenzaOfferta < traGiorni(7)) o.scadenzaOfferta = traGiorni(30);
          });
          salva(); location.hash = '#documenti';
        });
        await page.waitForTimeout(300);
        await page.goto(BASE + 'index.html#oggi');
        await page.waitForTimeout(400);
        const libera = await page.evaluate(() => ({ riquadro: !!document.querySelector('.giornata-libera'), badge: document.getElementById('conteggio-oggi').hidden,
          istruzione: document.querySelector('.istruzione').textContent.trim(), testo: document.querySelector('.giornata-libera').textContent }));
        verifica(`${dispositivo} giornata libera: «Niente di urgente oggi», pallino nascosto, riga del titolo`, libera.riquadro && libera.badge && libera.istruzione === 'Oggi non ci sono cose urgenti.' && /Niente di urgente oggi/.test(libera.testo), JSON.stringify(libera));
        if (await page.$('.giornata-libera [data-azione=scorri]')) {
          await clic(page, '.giornata-libera [data-azione=scorri]');
          verifica(`${dispositivo} «Apri le trattative da seguire»: focus su «Poi, se resta tempo» e righe visibili`, await page.evaluate(() => document.activeElement && document.activeElement.id === 'da-seguire')
            && await page.isVisible('#da-seguire .poi-testa') && await page.isVisible('#da-seguire .poi-riga'));
        }
      };
      const info = await page.evaluate(() => ({
        titolo: document.title, occhiello: document.querySelector('.pagina-oggi .occhiello').textContent.trim(),
        schede: [...document.querySelectorAll('.scheda-oggi')].map((s) => ({ etichetta: s.querySelector('.scheda-oggi-etichetta').textContent.trim(),
          pulsanti: [...s.querySelectorAll('.scheda-oggi-azioni .pulsante')].filter((b) => b.getBoundingClientRect().height > 0).map((b) => ({ azione: b.dataset.azione || b.getAttribute('href'), alto: b.getBoundingClientRect().height })),
          idScheda: s.id, descrizione: getComputedStyle(s.querySelector('.scheda-oggi-descrizione')).display })),
        badge: document.getElementById('conteggio-oggi').hidden ? null : document.getElementById('conteggio-oggi').textContent,
        istruzione: document.querySelector('.istruzione').textContent.trim(), fasi: document.querySelectorAll('.tabellone .colonna').length,
        titoloFasi: document.querySelector('.titolo-fasi .conteggio').textContent.trim(),
        righe: [...document.querySelectorAll('#da-seguire .poi-riga')].map((r) => ({ motivo: !!r.querySelector('.poi-motivo'), pulsanti: r.querySelectorAll('.poi-azione .pulsante').length })),
        tutte: (document.querySelector('#da-seguire .tutte-poi') || {}).textContent || '',
        poiElenco: getComputedStyle(document.querySelector('#da-seguire .poi-elenco')).display, apriPoi: getComputedStyle(document.querySelector('.apri-poi')).display,
        nota: !!document.querySelector('.pagina-oggi [data-azione=nota]'),
      }));
      verifica(`${dispositivo} oggi: titolo, data per esteso e pulsante «Nuova richiesta»`, info.titolo === 'Oggi · Gate' && /^[A-ZÀ-Ü][a-zì]+ \d{1,2} [a-z]+$/.test(info.occhiello) && info.nota, info.occhiello);
      verifica(`${dispositivo} oggi: da 1 a 3 schede numerate in ordine, ognuna con un solo pulsante alto almeno 44 px`, info.schede.length >= 1 && info.schede.length <= 3
        && info.schede.every((s, i) => s.etichetta.startsWith((i + 1) + ' ·') && s.pulsanti.length === 1 && s.pulsanti[0].alto >= 44 && !s.idScheda), JSON.stringify(info.schede));
      // Ogni etichetta ha il suo pulsante: non basta che l'azione sia una di quelle note
      const ATTESE = { Rispondi: /^chiamata-fatta$/, Sollecita: /^chiamata-fatta$/, 'Sopralluogo di oggi': /^(whatsapp-sopralluogo|fatto-fase)$/, 'Sopralluogo da registrare': /^fatto-fase$/,
        'Offerta da inviare': /^#preventivo-/, 'Sopralluogo da fissare': /^fissa-sopralluogo$/, Chiama: /^chiamata-fatta$/, 'Da fare': /^fatto$/ };
      const coerente = (s) => { const nome = s.etichetta.replace(/^\d · /, ''); return !!ATTESE[nome] && ATTESE[nome].test(s.pulsanti[0].azione); };
      verifica(`${dispositivo} oggi: ogni pulsante porta dove deve (Rispondi e Sollecita → chiamata, Sopralluogo → WhatsApp o misure, Offerta → preventivo, promemoria)`,
        info.schede.every(coerente), JSON.stringify(info.schede.map((s) => [s.etichetta, s.pulsanti[0].azione])));
      verifica(`${dispositivo} oggi: pallino del menu = schede aperte, riga sotto il titolo`, info.badge && info.badge.startsWith(String(info.schede.length)) && /Tre cose da fare|Due cose da fare|Una cosa da fare/.test(info.istruzione), info.badge + ' / ' + info.istruzione);
      verifica(`${dispositivo} oggi: «Poi, se resta tempo» con al massimo 3 righe, motivo e un solo pulsante per riga; «Tutte le trattative da seguire (N)»`,
        info.righe.length >= 1 && info.righe.length <= 3 && info.righe.every((r) => r.motivo && r.pulsanti === 1) && /Tutte le trattative da seguire \(\d+\)/.test(info.tutte), JSON.stringify(info.righe) + ' ' + info.tutte);
      verifica(`${dispositivo} oggi: sotto, le trattative per fase (6 colonne, conteggio delle aperte)`, info.fasi === 6 && /\d+ aperte/.test(info.titoloFasi), info.titoloFasi);
      if (dispositivo === 'telefono') {
        const compatte = await page.evaluate(() => [...document.querySelectorAll('.scheda-oggi')].map((s) => ({ compatta: getComputedStyle(s.querySelector('.scheda-oggi-compatta')).display, testo: s.querySelector('.scheda-oggi-compatta').textContent.trim(),
          colore: getComputedStyle(s.querySelector('.scheda-oggi-compatta')).color, sottoriga: getComputedStyle(s.querySelector('.scheda-oggi-sottoriga')).display, nome: Math.round(s.querySelector('.scheda-oggi-nome').getBoundingClientRect().height) })));
        verifica('telefono oggi: schede compatte, «Poi» ridotto al link che apre la sezione', info.schede.every((s) => s.descrizione === 'none') && info.poiElenco === 'none' && info.apriPoi !== 'none'
          && /Poi: \d+ trattativ/.test(await page.textContent('.apri-poi')));
        verifica('telefono oggi: una riga nel colore del testo con referente e sintesi della richiesta al posto della sottoriga; nome alto 44 px',
          compatte.every((c) => c.compatta === 'block' && c.testo.length > 3 && c.colore === 'rgb(13, 26, 38)' && c.sottoriga === 'none' && c.nome >= 44), JSON.stringify(compatte));
        await clic(page, '.apri-poi');
        verifica('telefono oggi: il link apre le righe', await page.isVisible('.poi.aperta .poi-riga'));
        verifica('telefono oggi: nessuno scorrimento orizzontale', !(await scorreOrizzontale(page)));   // lo screenshot da telefono lo fa la prova «schermate»
        await svuotaUrgenze();
      } else {
        // Bersagli da 44 px nelle parti nuove (nomi delle schede e delle righe, chip degli avvisi, numero del referente) e nella finestra
        const alti = await page.evaluate(() => {
          const h = (el) => Math.round(el.getBoundingClientRect().height);
          return { nomi: [...document.querySelectorAll('.scheda-oggi-nome, #da-seguire .poi-nome .link, .scheda-oggi-sottoriga .link, .avviso-chip')].map(h) };
        });
        await page.evaluate(() => apriProssimaAzione(stato.opportunita.filter(trattativaAperta)[0].aziendaId));
        await page.waitForTimeout(PAUSA);
        alti.finestra = await page.evaluate(() => [...document.querySelectorAll('dialog .pulsante.piccolo, dialog .chiudi-finestra')].map((el) => Math.round(el.getBoundingClientRect().height)));
        await clic(page, 'dialog [data-azione=chiudi]');
        verifica('desktop oggi: nomi, chip degli avvisi, numeri e pulsanti della finestra alti almeno 44 px', alti.nomi.length > 0 && alti.nomi.every((n) => n >= 44) && alti.finestra.length >= 5 && alti.finestra.every((n) => n >= 44), JSON.stringify(alti));

        // Scenario «sollecito e misure»: un'offerta scaduta con il promemoria del sollecito aperto, una seconda offerta scaduta (va in «Poi»),
        // un sopralluogo di ieri da registrare e una sola offerta da preparare
        const sc = await page.evaluate(() => {
          stato.attivita.forEach((x) => { if (x.daFare && x.data <= oggi()) x.daFare = false; });
          stato.opportunita.filter(trattativaAperta).forEach((o) => { if (!o.dataPrimaRisposta) o.dataPrimaRisposta = oggi(); });
          const conTelefono = (o) => referentiDi(o.aziendaId).some((r) => r.telefono);
          const [daPreparare, ...altreDaPreparare] = stato.opportunita.filter((o) => trattativaAperta(o) && faseAttuale(o) === 'sopralluogo');
          altreDaPreparare.forEach((o) => { o.storico.offerta = oggi(); o.scadenzaOfferta = traGiorni(30); });
          const offerte = stato.opportunita.filter((o) => trattativaAperta(o) && faseAttuale(o) === 'offerta' && conTelefono(o) && o.aziendaId !== daPreparare.aziendaId);
          offerte.forEach((o) => { o.scadenzaOfferta = traGiorni(30); });
          const [scaduta, seconda] = offerte;
          scaduta.scadenzaOfferta = traGiorni(-2); seconda.scadenzaOfferta = traGiorni(-1);
          registraAttivita({ aziendaId: scaduta.aziendaId, referenteId: referentiDi(scaduta.aziendaId).find((r) => r.telefono).id, opportunitaId: scaduta.id, tipo: 'Email', testo: 'Sollecitare l\'offerta', data: traGiorni(-1), daFare: true });
          const visita = stato.opportunita.find((o) => trattativaAperta(o) && faseAttuale(o) === 'qualificato' && !sopralluogoFissato(o) && ![scaduta.aziendaId, seconda.aziendaId, daPreparare.aziendaId].includes(o.aziendaId));
          registraAttivita({ aziendaId: visita.aziendaId, opportunitaId: visita.id, fase: 'sopralluogo', tipo: 'Visita', testo: 'Sopralluogo', data: traGiorni(-1), ora: '10:00', daFare: true });
          salva(); location.hash = '#clienti';
          return { scaduta: scaduta.id, aziendaScaduta: scaduta.aziendaId, seconda: seconda.aziendaId, visita: visita.id, daPreparare: daPreparare.id, attivitaPrima: stato.attivita.filter((x) => x.aziendaId === scaduta.aziendaId).length };
        });
        await page.waitForTimeout(300);
        await page.goto(BASE + 'index.html#oggi');
        await page.waitForTimeout(400);
        const schedeB = await page.evaluate(() => [...document.querySelectorAll('.scheda-oggi')].map((s) => ({ etichetta: s.querySelector('.scheda-oggi-etichetta').textContent.trim(), chip: s.querySelector('.scheda-oggi-alto .chip').textContent.trim(),
          pulsanti: [...s.querySelectorAll('.scheda-oggi-azioni .pulsante')].map((b) => ({ azione: b.dataset.azione || b.getAttribute('href'), testo: b.textContent.trim() })), azienda: s.dataset.azienda })));
        const perNome = (nome) => schedeB.find((s) => s.etichetta.endsWith(nome));
        verifica('scenario sollecito: «Sopralluogo da registrare» (Registra le misure), «Offerta da inviare» (Prepara l\'offerta) e «Sollecita» (Chiama …), ognuna con il pulsante giusto',
          schedeB.length === 3 && schedeB.every(coerente) && perNome('Sopralluogo da registrare') && /Registra le misure/.test(perNome('Sopralluogo da registrare').pulsanti[0].testo)
          && perNome('Offerta da inviare') && perNome('Sollecita') && /^Chiama /.test(perNome('Sollecita').pulsanti[0].testo) && /Offerta scaduta il/.test(perNome('Sollecita').chip), JSON.stringify(schedeB));
        // La seconda offerta scaduta sta tra le prime 3 righe di «Poi» con «Sollecita», senza aprire tutto
        const poiB = await page.evaluate((sc) => { const r = document.querySelector(`#da-seguire .poi-riga[data-azienda="${sc.seconda}"]`);
          return { aperto: document.querySelector('#da-seguire [data-azione=mostra-tutto]').getAttribute('aria-expanded'), righe: document.querySelectorAll('#da-seguire .poi-riga').length,
            motivo: r ? r.querySelector('.poi-motivo').textContent.trim() : '', pulsante: r ? r.querySelector('.poi-azione .pulsante').textContent.trim() : '' }; }, sc);
        verifica('«Poi»: la seconda offerta scaduta è tra le prime 3 righe con «Offerta scaduta il …» e «Sollecita»', poiB.aperto !== 'true' && poiB.righe <= 3 && /Offerta scaduta il \d\d\/\d\d, nessuna risposta/.test(poiB.motivo) && poiB.pulsante === 'Sollecita', JSON.stringify(poiB));
        // «Registra le misure» apre la finestra della fase Sopralluogo con la data di ieri
        const indiceVisita = schedeB.findIndex((s) => s.etichetta.endsWith('Sopralluogo da registrare')) + 1;
        await clic(page, `.scheda-oggi:nth-child(${indiceVisita}) [data-azione=fatto-fase]`);
        verifica('«Registra le misure» apre la finestra della fase Sopralluogo con la data del sopralluogo', await page.isVisible('#modulo-fase[data-fase=sopralluogo]') && await page.inputValue('#modulo-fase [name=data]') === await page.evaluate(() => traGiorni(-1)));
        await clic(page, 'dialog [data-azione=chiudi]');
        // «Chiama …» del sollecito: una sola riga di cronologia (il promemoria chiuso con l'ora), prima risposta, Annulla nella scheda
        const indiceSollecita = schedeB.findIndex((s) => s.etichetta.endsWith('Sollecita')) + 1;
        await clic(page, `.scheda-oggi:nth-child(${indiceSollecita}) [data-azione=chiamata-fatta]`);
        if (await page.isVisible('#modulo-prossima')) await clic(page, '#modulo-prossima [data-azione=chiudi]');
        const sollecito = await page.evaluate((sc) => {
          const oggiFatte = stato.attivita.filter((x) => x.aziendaId === sc.aziendaScaduta && !x.daFare && x.data === oggi() && x.tipo === 'Chiamata');
          return { chiamate: oggiFatte.map((x) => x.testo + ' ' + (x.ora || '')), totale: stato.attivita.filter((x) => x.aziendaId === sc.aziendaScaduta).length, prima: sc.attivitaPrima,
            stato: (document.querySelector(`.scheda-oggi[data-azienda="${sc.aziendaScaduta}"] .stato-fatto`) || {}).textContent || '', annulla: !!document.querySelector('.scheda-oggi [data-azione=annulla-oggi]'),
            badge: document.getElementById('conteggio-oggi').textContent, istruzione: document.querySelector('.istruzione').textContent };
        }, sc);
        verifica('Sollecita → «Chiama …»: il promemoria si chiude con l\'ora, nessuna seconda attività, riquadro verde con l\'ora, pallino a 2, Annulla nella scheda',
          sollecito.chiamate.length === 1 && /^Sollecitare .* \d{2}:\d{2}$/.test(sollecito.chiamate[0]) && sollecito.totale === sollecito.prima && /Chiamata registrata alle \d{1,2}:\d{2}/.test(sollecito.stato)
          && sollecito.annulla && sollecito.badge.startsWith('2') && /Restano due cose/.test(sollecito.istruzione), JSON.stringify(sollecito));
        // Quando l'avviso in basso sparisce (qui subito, come dopo gli 8 secondi) sparisce anche l'Annulla della scheda; l'esito verde resta
        await page.evaluate(() => nascondiAvviso());
        await page.waitForTimeout(300);
        const dopoAvviso = await page.evaluate(() => ({ annulla: !!document.querySelector('.scheda-oggi [data-azione=annulla-oggi]'), fatta: !!document.querySelector('.scheda-oggi.fatta .stato-fatto'), avviso: document.getElementById('avviso').classList.contains('visibile') }));
        verifica('sparito l\'avviso in basso, sparisce anche l\'Annulla nella scheda e l\'esito verde resta', !dopoAvviso.annulla && dopoAvviso.fatta && !dopoAvviso.avviso, JSON.stringify(dopoAvviso));
        // Dal tabellone «È qualificato»: la scheda passa in Qualificato, scorre in vista e prende il focus (il clic non è partito dall'alto)
        const idContatto = await page.evaluate(() => { const o = stato.opportunita.find((x) => trattativaAperta(x) && faseAttuale(x) === 'contatto' && document.getElementById('scheda-' + x.id)); document.getElementById('scheda-' + o.id).scrollIntoView(); return o.id; });
        await clic(page, `#scheda-${idContatto} [data-azione=avanza]`);
        const qualificata = await page.evaluate((id) => { const el = document.getElementById('scheda-' + id); const r = el.getBoundingClientRect(); return { fase: faseAttuale(trova(id)), inVista: r.top >= 0 && r.bottom <= innerHeight, focus: el.contains(document.activeElement) }; }, idContatto);
        verifica('cambio di fase dal tabellone: la scheda modificata scorre in vista con il focus', qualificata.fase === 'qualificato' && qualificata.inVista && qualificata.focus, JSON.stringify(qualificata));
        // Riga di «Poi»: dopo la finestra l'esito verde resta in riga e il pallino non cambia
        await page.goto(BASE + 'index.html#oggi');
        await page.waitForTimeout(400);
        const badgePrima = await page.textContent('#conteggio-oggi');
        const riga = await page.$('#da-seguire .poi-riga [data-azione=prossima-azione], #da-seguire .poi-riga [data-azione=fissa-sopralluogo]');
        verifica('riga di «Poi» con «Fissa la prossima azione» o «Fissa il sopralluogo» tra le prime 3', !!riga);
        const azione = await riga.getAttribute('data-azione');
        await riga.click();
        await page.waitForTimeout(PAUSA);
        await clic(page, azione === 'prossima-azione' ? '#modulo-prossima [type=submit]' : '#modulo-sopralluogo [type=submit]');
        verifica('riga di «Poi»: esito verde in riga, pallino invariato, pagina ferma in alto', /Fissat/.test(await page.textContent('#da-seguire .poi-esito[role=status]')) && (await page.textContent('#conteggio-oggi')) === badgePrima && (await page.evaluate(() => scrollY)) < 400);
        await clic(page, '#da-seguire [data-azione=mostra-tutto]');
        const n = Number((await page.textContent('#da-seguire .tutte-poi')).match(/\((\d+)\)/) ? info.tutte.match(/\((\d+)\)/)[1] : 0);
        verifica('«Tutte le trattative da seguire (N)» apre tutte le righe', (await page.$$('#da-seguire .poi-riga')).length >= 3 && await page.getAttribute('#da-seguire [data-azione=mostra-tutto]', 'aria-expanded') === 'true', String(n));
        // «Prepara l'offerta» porta alla schermata Preventivo della trattativa
        await page.goto(BASE + 'index.html#oggi');
        await page.waitForTimeout(400);
        await clic(page, '.scheda-oggi a[href^="#preventivo-"]');
        verifica('«Prepara l\'offerta» apre la schermata Preventivo della trattativa', (await page.evaluate(() => location.hash)) === '#preventivo-' + sc.daPreparare && await page.isVisible('#schermata h1'), await page.evaluate(() => location.hash));
        await page.goto(BASE + 'index.html#oggi');
        await page.waitForTimeout(400);
        verifica('desktop oggi: nessuno scorrimento orizzontale', !(await scorreOrizzontale(page)));

        // Le tre schede del riferimento: due richieste senza risposta da 5 giorni (almeno 3 lavorativi, qualunque sia il giorno della prova)
        // e un sopralluogo fissato per oggi alle 15:00; più un promemoria di oggi per un'azienda senza trattative aperte
        const ids = await page.evaluate(() => {
          stato.attivita.forEach((x) => { if (x.daFare && x.fase === 'sopralluogo' && x.data < oggi()) x.daFare = false; });   // il sopralluogo di ieri dello scenario precedente
          const sola = (o) => opportunitaDi(o.aziendaId).filter(trattativaAperta).length === 1;   // una candidata per azienda: niente altre trattative
          const [richiesta, seconda] = stato.opportunita.filter((o) => trattativaAperta(o) && faseAttuale(o) === 'contatto' && sola(o));
          richiesta.dataPrimaRisposta = null; richiesta.storico.contatto = traGiorni(-5);
          seconda.dataPrimaRisposta = null; seconda.storico.contatto = traGiorni(-5);
          const visita = stato.opportunita.find((o) => trattativaAperta(o) && faseAttuale(o) === 'qualificato' && !sopralluogoFissato(o) && referentiDi(o.aziendaId).some((r) => r.telefono) && ![richiesta.aziendaId, seconda.aziendaId].includes(o.aziendaId));
          registraAttivita({ aziendaId: visita.aziendaId, referenteId: referentiDi(visita.aziendaId).find((r) => r.telefono).id, opportunitaId: visita.id, fase: 'sopralluogo', tipo: 'Visita', testo: 'Sopralluogo', data: oggi(), ora: '15:00', daFare: true });
          const chiusa = stato.aziende.find((a) => opportunitaDi(a.id).length && !opportunitaDi(a.id).some(trattativaAperta));
          registraAttivita({ aziendaId: chiusa.id, tipo: 'Chiamata', testo: 'Chiamare per il rinnovo del contratto', data: oggi(), daFare: true });
          salva(); location.hash = '#clienti';
          return { richiesta: richiesta.id, seconda: seconda.aziendaId, chiusa: chiusa.id };
        });
        await page.waitForTimeout(300);
        await page.goto(BASE + 'index.html#oggi');
        await page.waitForTimeout(400);
        if (await page.getAttribute('#da-seguire [data-azione=mostra-tutto]', 'aria-expanded') === 'true') await clic(page, '#da-seguire [data-azione=mostra-tutto]');   // «Mostra meno»
        const schedeA = await page.evaluate(() => [...document.querySelectorAll('.scheda-oggi')].map((s) => ({ etichetta: s.querySelector('.scheda-oggi-etichetta').textContent.trim(), pulsanti: [...s.querySelectorAll('.scheda-oggi-azioni .pulsante')].map((b) => ({ azione: b.dataset.azione || b.getAttribute('href') })) })));
        const etichette = schedeA.map((s) => s.etichetta);
        verifica('richiesta senza risposta e sopralluogo di oggi: «1 · Rispondi», «2 · Sopralluogo di oggi», poi la terza con il suo pulsante', etichette[0] === '1 · Rispondi' && etichette[1] === '2 · Sopralluogo di oggi' && etichette.length === 3 && schedeA.every(coerente), etichette.join(' | '));
        // La seconda richiesta senza risposta e il promemoria di oggi stanno tra le prime 3 righe di «Poi», senza aprire tutto
        const poi = await page.evaluate((ids) => ({
          aperto: document.querySelector('#da-seguire [data-azione=mostra-tutto]').getAttribute('aria-expanded'), righe: document.querySelectorAll('#da-seguire .poi-riga').length,
          seconda: (document.querySelector(`#da-seguire .poi-riga[data-azienda="${ids.seconda}"] .poi-motivo`) || {}).textContent || '',
          secondaPulsante: !!document.querySelector(`#da-seguire .poi-riga[data-azienda="${ids.seconda}"] [data-azione=chiamata-fatta]`),
          chiusa: (document.querySelector(`#da-seguire .poi-riga[data-azienda="${ids.chiusa}"]`) || {}).textContent || '',
          chiusaFase: !!document.querySelector(`#da-seguire .poi-riga[data-azienda="${ids.chiusa}"] .poi-nome .chip`),
        }), ids);
        verifica('la seconda richiesta senza risposta sta tra le prime 3 righe di «Poi» con il motivo e «Chiama»', poi.aperto !== 'true' && poi.righe <= 3 && /Senza risposta da \d+ giorni lavorativi/.test(poi.seconda) && poi.secondaPulsante, JSON.stringify(poi));
        // Il promemoria di oggi viene dopo le cose già scadute (offerte scadute, promemoria in ritardo): si aprono tutte le righe
        await clic(page, '#da-seguire [data-azione=mostra-tutto]');
        const chiusa = await page.evaluate((ids) => ({ testo: (document.querySelector(`#da-seguire .poi-riga[data-azienda="${ids.chiusa}"]`) || {}).textContent || '', fase: !!document.querySelector(`#da-seguire .poi-riga[data-azienda="${ids.chiusa}"] .poi-nome .chip`),
          posizione: [...document.querySelectorAll('#da-seguire .poi-riga')].findIndex((r) => r.dataset.azienda === ids.chiusa) + 1, scadute: [...document.querySelectorAll('#da-seguire .poi-motivo')].filter((m) => /scadut|ritardo|Senza risposta/i.test(m.textContent)).length }), ids);
        verifica('promemoria di un\'azienda senza trattative aperte: riga di «Poi» con il nome, senza fase né valore, subito dopo le cose scadute, nessun errore', /rinnovo del contratto/.test(chiusa.testo) && !chiusa.fase && chiusa.posizione > 0 && chiusa.posizione <= chiusa.scadute + 1 && errori.length === 0, JSON.stringify(chiusa) + ' | ' + errori.join(' | '));
        await clic(page, '#da-seguire [data-azione=mostra-tutto]');   // «Mostra meno»
        verifica('chip in parole: «In ritardo di N giorni» e «Ore 15:00»', /In ritardo di \d+ giorn/.test(await page.textContent('.scheda-oggi:nth-child(1) .chip')) && /Ore 15:00/.test(await page.textContent('.scheda-oggi:nth-child(2) .chip')));
        const wa = await page.getAttribute('.scheda-oggi a[data-azione=whatsapp-sopralluogo]', 'href');
        verifica('«Conferma l\'arrivo su WhatsApp»: link wa.me con il messaggio già scritto', /^https:\/\/wa\.me\/\d+\?text=Buongiorno/.test(wa) && /sopralluogo%20di%20oggi%20alle%2015%3A00/.test(wa), wa);
        await clic(page, '.scheda-oggi a[data-azione=whatsapp-sopralluogo]');
        verifica('WhatsApp: riquadro «Lo invii tu», niente salvato, pallino sceso a 2', /Lo invii tu/.test(await page.textContent('.scheda-oggi:nth-child(2) .stato-fatto')) && (await page.textContent('#conteggio-oggi')).startsWith('2'));
        await clic(page, '.scheda-oggi:nth-child(2) [data-azione=annulla-oggi]');
        verifica('Annulla toglie il segno di WhatsApp', !!(await page.$('.scheda-oggi a[data-azione=whatsapp-sopralluogo]')) && (await page.textContent('#conteggio-oggi')).startsWith('3'));
        await clic(page, '.scheda-oggi:nth-child(1) [data-azione=chiamata-fatta]');
        if (await page.isVisible('#modulo-prossima')) await clic(page, '#modulo-prossima [data-azione=chiudi]');   // «Nessuna»: la chiamata resta registrata
        const rispondi = await page.evaluate((ids) => ({ stato: (document.querySelector('.scheda-oggi:nth-child(1) .stato-fatto') || {}).textContent || '', annulla: !!document.querySelector('.scheda-oggi:nth-child(1) [data-azione=annulla-oggi]'),
          risposta: !!trova(ids.richiesta).dataPrimaRisposta, istruzione: document.querySelector('.istruzione').textContent,
          chiamate: stato.attivita.filter((x) => x.aziendaId === trova(ids.richiesta).aziendaId && !x.daFare && x.data === oggi() && x.tipo === 'Chiamata' && x.ora).length }), ids);
        verifica('Rispondi: chiamata registrata con l\'ora, una sola (prima risposta, K12), riquadro verde con «Annulla» nella scheda', /Chiamata registrata alle/.test(rispondi.stato) && rispondi.annulla && rispondi.risposta && rispondi.chiamate === 1 && /Restano due cose/.test(rispondi.istruzione), JSON.stringify(rispondi));
        await clic(page, '.scheda-oggi:nth-child(1) [data-azione=annulla-oggi]');
        verifica('Annulla nella scheda: la chiamata è annullata e il pulsante torna', !!(await page.$('.scheda-oggi:nth-child(1) [data-azione=chiamata-fatta]')) && !(await page.evaluate((ids) => trova(ids.richiesta).dataPrimaRisposta, ids)));
        if (process.env.FOTO) { await page.reload(); await page.waitForTimeout(600); await page.screenshot({ path: path.join(SHOT, 'oggi-desktop.png') }); }
        await svuotaUrgenze();
      }
      verifica(`${dispositivo} oggi: zero errori`, errori.length === 0, errori.join(' | '));
      await ctx.close();
    }
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
    await page.goto(BASE + 'index.html#lunedi');   // dalla schermata Documenti (e da Come funziona)
    await page.waitForTimeout(300);
    const conta = (rif) => page.evaluate((r) => Object.fromEntries(listaLunedi(r).map((s) => [s.id, s.righe.length]).concat([['evidenza', listaLunedi(r)[3].righe.filter((x) => x.evidenza).length]])), rif);
    const oggiApp = await conta(await page.evaluate(() => oggi()));
    verifica('al 19/10 del database: risposta 0, ferme 6, offerte 11, rinnovi 12 (8 entro 60 giorni)', JSON.stringify(oggiApp) === JSON.stringify({ risposta: 0, ferme: 6, offerte: 11, rinnovi: 12, evidenza: 8 }), JSON.stringify(oggiApp));
    // Al 13/10 vero del database: con i dati non spostati a oggi, così i giorni lavorativi non dipendono dal giorno in cui gira la prova
    const al13 = await page.evaluate(() => {
      const attuale = stato;
      const tabelle = Object.fromEntries(['clienti', 'referenti', 'commerciali', 'opportunita', 'storico_fasi', 'offerte', 'attivita', 'contratti_in_corso'].map((n) => [n, righeDb(n)]));
      stato = statoDaTabelle(tabelle, DATI_DB.dataRiferimento, 0);
      const r = Object.fromEntries(listaLunedi('2026-10-13').map((s) => [s.id, s.righe.length]));
      stato = attuale;
      return r;
    });
    verifica('al 13/10 del database: risposta 6, ferme 20, offerte 12, rinnovi 9', al13.risposta === 6 && al13.ferme === 20 && al13.offerte === 12 && al13.rinnovi === 9, JSON.stringify(al13));
    const r6 = await page.evaluate(() => aggiungiGiorni(oggi(), -6));
    await page.fill('#data-lunedi', r6);
    await page.dispatchEvent('#data-lunedi', 'change');
    await page.waitForTimeout(200);
    const a6 = await conta(r6);
    verifica('la pagina segue la data scelta (sei giorni fa)', a6.ferme === 20 && (await page.$$('#lunedi-risposta tbody tr')).length === a6.risposta, JSON.stringify(a6));
    const righe = await page.$$eval('#lunedi-ferme tbody tr', (tr) => tr.map((r) => r.textContent));
    verifica('ogni riga: cliente, punteggio, valore, giorni, responsabile e azione suggerita', righe.length > 0 && /Riprendere: ferma da/.test(righe[0]) && /Commerciale|Intermediario|da assegnare/.test(righe[0]));
    const testo = await page.evaluate(() => testoLunedi());
    verifica('copia come testo: titolo, sezioni e righe', /^LISTA DEL LUNEDÌ/.test(testo) && /4\. CONTRATTI DA RINNOVARE/.test(testo) && testo.split('\n').length > 30);
    await page.emulateMedia({ media: 'print' });
    verifica('stampa: solo il foglio', await page.$eval('#foglio-lunedi', (el) => getComputedStyle(el).visibility) === 'visible' && await page.$eval('.data-lunedi', (el) => getComputedStyle(el).display) === 'none');
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Direzione (essenziale per l'amministratore) e Documenti (file raccolti in una schermata, senza doppioni)
  async direzioneDocumenti() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#direzione');
    const numeri = await page.$$eval('.direzione-numeri .riepilogo-numero', (el) => el.length);
    const decisioni = await page.$$eval('.decisioni li', (el) => el.length);
    const daAssegnare = await page.evaluate(() => stato.opportunita.filter((o) => o.storico.contratto && !o.perso && !o.allocazione).length);
    verifica('direzione: 4 numeri e da 1 a 4 decisioni', numeri === 4 && decisioni >= 1 && decisioni <= 4, numeri + ' numeri, ' + decisioni + ' decisioni');
    verifica('direzione: commesse da assegnare uguali al contatore dell\'Allocazione', (await page.textContent('.direzione-numeri .riepilogo-numero:nth-child(4) strong')).trim() === String(daAssegnare));
    await page.goto(BASE + 'index.html#indicatori');
    verifica('indicatori: niente pulsanti di file (sono in Documenti)', !(await page.$('.pagina-indicatori [data-azione=importa-csv-reali], .pagina-indicatori [href="#riepilogo"]')));
    await page.goto(BASE + 'index.html#clienti');
    verifica('clienti: niente pulsante del gestionale (è in Documenti)', !(await page.$('.pagina-clienti [data-azione=ponte]')));
    verifica('piè di pagina: niente carica backup e ripristina', !(await page.$('.pie [data-azione=importa-backup], .pie [data-azione=ripristina]')));
    await page.goto(BASE + 'index.html#documenti');
    const righe = await page.$$eval('.documento', (el) => el.map((d) => d.id.replace('documento-', '')));
    verifica('documenti: report, gestionale, Excel, CSV reali, backup, dati di esempio', righe.join() === 'riepilogo,lunedi,gestionale,clienti,richieste,backup,esempio', righe.join());
    const [backup] = await Promise.all([page.waitForEvent('download'), clic(page, '#documento-backup [data-azione=esporta-backup]')]);
    verifica('backup da Documenti: file scaricato, data aggiornata qui e nel piè di pagina', /backup/.test(backup.suggestedFilename())
      && (await page.textContent('#documento-backup .quando-backup')) === 'oggi' && !(await page.$('#stato-backup [data-azione=esporta-backup]')));
    await clic(page, '#documento-riepilogo a');
    verifica('riepilogo: voce di menu Documenti attiva', (await page.getAttribute('[data-vai=documenti]', 'aria-current')) === 'page');
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // N5 (PASSAGGIO 4): ponte con il gestionale. Export dei 7 CSV, import con controlli, sostituzione dopo il backup
  async ponte() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#documenti');
    const scaricati = [];
    page.on('download', (d) => scaricati.push(d));
    await clic(page, '#documento-gestionale [data-azione=esporta-ponte]:not([data-id])');
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
    await clic(page, '#documento-gestionale [data-azione=ponte]');
    fs.writeFileSync(sbagliato, fs.readFileSync(path.join(cartella, 'opportunita.csv'), 'utf8') + '9999,8888,,,LinkedIn,cleaning e hospitality,trattativa,,,,2026-10-01,,,,,,,,,,,,\r\n');
    await page.setInputFiles('#modulo-ponte [name=file]', percorsi.filter((x) => !x.endsWith('opportunita.csv')).concat(sbagliato));
    await clic(page, '#modulo-ponte [type=submit]');
    await page.waitForSelector('#anteprima-ponte table');
    const anteprima = await page.textContent('#anteprima-ponte');
    verifica('import: righe valide per tabella e riga scartata con il motivo', /Righe scartate/.test(anteprima) && /fase non ammesso/.test(anteprima) && /cliente 8888 inesistente/.test(anteprima), anteprima.slice(0, 200));
    await page.evaluate(() => { stato.opportunita[0].note = 'modifica da non perdere: finisce nel backup'; salva(); });
    const [backup] = await Promise.all([page.waitForEvent('download'), clic(page, '#pulsante-ponte')]);
    const dopo = await page.evaluate(() => ({ opp: stato.opportunita.length, az: stato.aziende.length, hash: location.hash, valido: strutturaValida(stato) }));
    verifica('sostituzione: prima il backup dei dati attuali, poi i dati del gestionale', /backup/.test(backup.suggestedFilename()) && dopo.opp === 300 && dopo.az === 120 && dopo.valido && dopo.hash === '#oggi', JSON.stringify(dopo));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // N6 (PASSAGGIO 4): Come funziona e demo guidata, cronometrata: nota → conferma → preventivo e punteggio → pacchetto → offerta → firma → chi esegue → indicatori → tempo risparmiato
  async demoGuidata() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#oggi');
    await clic(page, '.pie a[href="#come-funziona"]');
    const livelli = await page.$$eval('.livello-piattaforma', (el) => el.map((l) => ({ passi: l.querySelectorAll('.passi-piattaforma li').length, link: l.querySelectorAll('a, button').length })));
    const etichette = await page.$$eval('.passi-piattaforma .chip', (el) => [...new Set(el.map((e) => e.textContent))]);
    verifica('come funziona: 5 livelli, ognuno con i suoi passaggi e i collegamenti', livelli.length === 5 && livelli.every((l) => l.passi > 0 && l.link > 0), JSON.stringify(livelli));
    verifica('ogni passaggio ha la sua etichetta (automatico, l\'assistente propone, persona)', etichette.length === 3, etichette.join(' | '));
    if (process.env.FOTO) await page.screenshot({ path: path.join(SHOT, 'come-funziona-desktop.png'), fullPage: true });
    const contrattiPrima = await page.evaluate(() => calcolaKpi(stato.opportunita).contratti);
    const inizio = Date.now();
    await clic(page, '.demo-guidata [data-azione=nota]');
    await page.selectOption('#modulo-nota [name=esempio]', '0');
    await page.waitForSelector('.campo-nota');
    if (process.env.FOTO) await page.screenshot({ path: path.join(SHOT, 'nota-desktop.png') });
    await clic(page, '#conferma-nota');
    const id = await page.evaluate(() => location.hash.replace('#preventivo-', ''));
    await page.selectOption('#modulo-preventivo [name=pacchetto]', 'Plus');
    if (process.env.FOTO) await page.screenshot({ path: path.join(SHOT, 'offerta-pacchetto-desktop.png'), fullPage: true });
    await clic(page, '[data-azione=registra-offerta]');
    await clic(page, '#modulo-fase [type=submit]');
    await clic(page, `#scheda-${id} [data-azione=firma-link]`);
    await clic(page, '[data-azione=conferma-firma]');
    if (await page.$(`#commessa-${id} [data-azione=assegna-squadra]`)) await clic(page, `#commessa-${id} [data-azione=assegna-squadra]`);
    else {
      await clic(page, `#commessa-${id} [data-azione=proponi]`);
      await clic(page, `#commessa-${id} [data-azione=risposta-si]`);
    }
    const assegnata = await page.evaluate((i) => !!trova(i).allocazione, id);
    await page.goto(BASE + 'index.html#indicatori');
    await clic(page, '[data-azione=livello][data-id=contratto]');
    const contrattiDopo = await page.evaluate(() => calcolaKpi(stato.opportunita).contratti);
    await clic(page, '[data-azione=livello][data-id=previsione]');
    await page.waitForSelector('#tempo-risparmiato');
    const secondi = (Date.now() - inizio) / 1000;
    verifica('demo guidata: un contratto in più, commessa assegnata, tempo risparmiato in vista', contrattiDopo === contrattiPrima + 1 && assegnata, contrattiPrima + ' → ' + contrattiDopo);
    verifica('demo guidata in meno di 90 secondi (con le pause del test)', secondi < 90, secondi.toFixed(1) + ' s');
    console.log(`  ..   durata della demo guidata: ${secondi.toFixed(1)} s`);
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Dati della versione 3 salvati nel browser: migrati senza errori, con l'avviso per passare ai dati del database
  async migrazione() {
    const vecchi = fs.readFileSync(path.join(__dirname, 'backup-v3.json'), 'utf8');
    const { ctx, page, errori } = await apri('desktop', { initScript: `if (!sessionStorage.getItem('fatto')) { localStorage.setItem('gate-sviluppo-commerciale-v2', ${JSON.stringify(vecchi)}); sessionStorage.setItem('fatto', '1'); }` });
    await page.goto(BASE + 'index.html#oggi');
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
    await page.goto(BASE + 'index.html#clienti');
    const prima = await page.evaluate(() => stato.opportunita.length);
    await clic(page, '.pagina-clienti [data-azione=nuovo]');
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
    await page.goto(BASE + 'index.html#documenti');
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
    verifica('trattative invariate: le righe reali non entrano tra le opportunità', (await page.evaluate(() => stato.opportunita.length)) === 300);
    verifica('dopo l\'import si apre la schermata Indicatori', await page.evaluate(() => location.hash === '#indicatori'));
    await page.goto(BASE + 'index.html#documenti');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-azione=esporta-csv-richieste]')]);
    const testo = fs.readFileSync(await download.path(), 'utf8');
    verifica('export CSV a 7 colonne', testo.split('\r\n')[0].replace(/\uFEFF|"/g, '') === 'data_richiesta;data_annotazione;canale;settore;data_risposta;data_offerta;esito' && testo.split('\r\n').length === 13);
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Modifica 3: «Da ricontattare» bloccato senza data, promemoria quando la data è scaduta; stima su 200 mq x 3 volte
  async ricontatto() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#oggi');
    // Una trattativa la cui azienda non ha una scheda d'azione in alto (le righe di «Poi» le escludono)
    const id = await page.evaluate(() => stato.opportunita.find((o) => trattativaAperta(o) && !trattativaFerma(o) && !document.querySelector('.scheda-oggi[data-azienda="' + o.aziendaId + '"]')).id);
    await page.evaluate((i) => apriDettaglio(i), id);
    await clic(page, '[data-azione=da-ricontattare]');
    await clic(page, '#modulo-ricontatto [type=submit]');
    verifica('senza data non diventa «Da ricontattare»', !(await page.evaluate((i) => !!trova(i).ricontatto, id)) && await page.isVisible('#modulo-ricontatto'));
    await clic(page, '#modulo-ricontatto [data-giorni="7"]');
    await clic(page, '#modulo-ricontatto [type=submit]');
    verifica('con la data diventa «Da ricontattare»', await page.evaluate((i) => !!trova(i).ricontatto, id));
    // La data arriva: si simula spostando indietro il ricontatto
    await page.evaluate((i) => { trova(i).ricontatto.data = traGiorni(-1); salva(); disegna(); }, id);
    if (await page.getAttribute('#da-seguire [data-azione=mostra-tutto]', 'aria-expanded') !== 'true') await clic(page, '#da-seguire [data-azione=mostra-tutto]');   // dopo le cose di oggi
    verifica('ricontatto scaduto in «Poi, se resta tempo» e sulla scheda', /Ricontattare: scaduto/.test(await page.textContent('#da-seguire')) && /scaduto/.test(await page.textContent('#scheda-' + id)));
    await clic(page, `#scheda-${id} [data-azione=ricontattato]`);
    verifica('«Ricontattato» toglie l\'etichetta', !(await page.evaluate((i) => !!trova(i).ricontatto, id)));
    await page.goto(BASE + 'index.html#clienti');
    await clic(page, '.pagina-clienti [data-azione=nuovo]');
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
    await page.goto(BASE + 'index.html#oggi');
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
    await page.goto(BASE + 'index.html#oggi');
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
    await page.goto(BASE + 'index.html#oggi');
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

  // Avviso di capacità nel preventivo: ore dell'offerta contro le ore libere della squadra più libera della zona
  async capacita() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#oggi');
    const id = await page.evaluate(() => stato.opportunita.find((o) => trattativaAperta(o) && CONFIG.squadre.some((s) => squadraCopre(s, o) && oreLibereSquadra(s, stato.opportunita, o.id) > 10)).id);
    await page.goto(BASE + 'index.html#preventivo-' + id);
    await page.fill('#modulo-preventivo [name=ore]', '9999');
    await page.waitForTimeout(300);
    verifica('capacità: offerta oltre le ore libere → avviso', /Capacità insufficiente/.test(await page.textContent('#capacita-preventivo')));
    await page.fill('#modulo-preventivo [name=ore]', '1');
    await page.waitForTimeout(300);
    verifica('capacità: offerta piccola → squadra con ore libere', /^\s*Capacità: .+ ore libere al mese/.test(await page.textContent('#capacita-preventivo')));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Nota scritta a mano (non di esempio): i campi si propongono da soli e «Conferma e registra» compare
  async notaScritta() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#oggi');
    await page.evaluate(() => apriNota());
    await page.fill('#modulo-nota [name=nota]', 'Ha chiamato la titolare dello Studio Verdi di Bari: uffici di 150 mq, pulizia 2 volte a settimana, ci ha trovati su LinkedIn, 333 123 4567');
    await page.waitForSelector('#conferma-nota:not([hidden])', { timeout: 3000 });
    const lum = await page.evaluate(() => { const c = estraiNota('Ha chiamato il reparto tecnico-amministrativo della LUM (casamssima) fissando una commessa per 300 ore al mese per pulizie degli ambienti universitari');
      return [c.azienda.valore, c.comune.valore, c.ore.valore, c.servizio.valore, c.settore.stato].join(' | '); });
    verifica('nota con sigla, comune sbagliato e ore: LUM, Casamassima, 300 ore, pulizie (settore da controllare)', lum === 'LUM | Casamassima | 300 | cleaning e hospitality | controllare', lum);
    verifica('nota scritta: campi proposti senza premere «Leggi la nota»', (await page.$$('#campi-nota .campo-nota')).length > 5);
    await clic(page, '#conferma-nota');
    verifica('nota scritta: si registra e apre il preventivo', await page.evaluate(() => location.hash.startsWith('#preventivo-')));
    await page.goto(BASE + 'index.html#oggi');
    // Più servizi nella stessa nota: una trattativa per ciascuno, stessa azienda
    await page.evaluate(() => apriNota());
    await page.fill('#modulo-nota [name=nota]', "Ha chiamato la segreteria dell'azienda Delta Servizi di Bari: pulizie degli uffici e manutenzione del verde, 333 765 4321");
    await page.waitForSelector('[name=altroServizio]', { timeout: 3000 });
    const primaN = await page.evaluate(() => stato.opportunita.length);
    await clic(page, '#conferma-nota');
    const dopoN = await page.evaluate(() => { const nuove = stato.opportunita.slice(-2); return { n: stato.opportunita.length, stessa: nuove[0].aziendaId === nuove[1].aziendaId, servizi: nuove.map((o) => o.servizio).sort().join(',') }; });
    verifica('nota con due servizi: due trattative per la stessa azienda', dopoN.n === primaN + 2 && dopoN.stessa && dopoN.servizi === 'cleaning e hospitality,servizi alle strutture', JSON.stringify(dopoN));
    verifica('zero errori', errori.length === 0, errori.join(' | '));
    await ctx.close();
  },

  // Clienti: su schermo largo elenco e scheda affiancati, da telefono solo la scheda
  async clientiAffiancati() {
    const { ctx, page, errori } = await apri();
    await page.goto(BASE + 'index.html#cliente-c1');
    verifica('schermo largo: elenco accanto alla scheda, cliente aperto evidenziato', await page.isVisible('#cerca-laterale') && !!(await page.$('.riga-laterale[aria-current="true"][href="#cliente-c1"]')));
    await page.click('.riga-laterale:not([aria-current]) >> nth=0');
    verifica('un clic su un altro cliente apre la sua scheda', await page.evaluate(() => location.hash.startsWith('#cliente-') && location.hash !== '#cliente-c1'));
    await page.fill('#cerca-laterale', 'zzzz');
    verifica('ricerca senza risultati: istruzione', /Nessun cliente trovato/.test(await page.textContent('#righe-laterali')));
    await ctx.close();
    const tel = await apri('telefono');
    await tel.page.goto(BASE + 'index.html#cliente-c1');
    verifica('telefono: solo la scheda, senza elenco e senza scorrimento orizzontale', !(await tel.page.isVisible('#cerca-laterale')) && !(await scorreOrizzontale(tel.page)));
    verifica('zero errori', errori.length === 0 && tel.errori.length === 0, errori.concat(tel.errori).join(' | '));
    await tel.ctx.close();
  },

  // Il file unico da condividere (dist/) si apre da solo e disegna la prima schermata, senza errori
  async fileUnico() {
    require('child_process').execSync('python3 strumenti/versione_unica.py', { cwd: REPO });
    const { ctx, page, errori } = await apri();
    await page.goto('file://' + path.join(REPO, 'dist', 'gate-crm-prototipo.html'));
    await page.waitForTimeout(800);
    const testo = (await page.textContent('#schermata')).trim();
    verifica('file unico: la prima schermata si disegna', testo.length > 100, testo.slice(0, 60));
    verifica('file unico: zero errori', errori.length === 0, errori.join(' | '));
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
