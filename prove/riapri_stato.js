// L'app riapre uno stato salvato (originale e riletto dal database) e confronta i KPI. Usato da prove/archivio.py.
// node prove/riapri_stato.js ORIGINALE.json RITORNO.json  →  stampa {"valido": ..., "ugualiKpi": ...}
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8765/';

// Apre l'app con lo stato nel salvataggio del browser e restituisce validità e numeri principali
async function apriCon(browser, percorso) {
  const testo = fs.readFileSync(percorso, 'utf8');
  const ctx = await browser.newContext({ locale: 'it-IT', timezoneId: 'Europe/Rome' });
  await ctx.addInitScript(`localStorage.setItem('gate-sviluppo-commerciale-v2', ${JSON.stringify(testo)});`);
  const page = await ctx.newPage();
  const errori = [];
  page.on('pageerror', (e) => errori.push(e.message));
  await page.goto(BASE + 'index.html#indicatori');
  const r = await page.evaluate(() => {
    // Numeri arrotondati a 9 decimali: le stesse somme in un ordine diverso differiscono solo all'ultima cifra
    const k = Object.fromEntries(Object.entries(calcolaKpi(stato.opportunita)).map(([c, v]) => [c, typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v]));
    return { valido: !datiScartati && strutturaValida(stato), kpi: { ...k, ricaviAttesi: Math.round(k.ricaviAttesi), margineAtteso: Math.round(k.margineAtteso),
      buone: coerenzaPortafoglio(stato.opportunita).buone.n, avvisi: avvisiScadenze().length, previsioni: previsioniDomani().map((p) => p.valore) } };
  });
  await ctx.close();
  return { ...r, errori };
}

(async () => {
  const browser = await chromium.launch({ args: ['--proxy-server=' + (process.env.HTTPS_PROXY || 'direct://'), '--proxy-bypass-list=127.0.0.1;localhost'] });
  const originale = await apriCon(browser, process.argv[2]);
  const ritorno = await apriCon(browser, process.argv[3]);
  await browser.close();
  console.log(JSON.stringify({ valido: originale.valido && ritorno.valido && !ritorno.errori.length,
    ugualiKpi: JSON.stringify(originale.kpi) === JSON.stringify(ritorno.kpi), errori: ritorno.errori.slice(0, 2),
    diversi: Object.keys(originale.kpi).filter((k) => JSON.stringify(originale.kpi[k]) !== JSON.stringify(ritorno.kpi[k]))
      .map((k) => k + ': ' + JSON.stringify(originale.kpi[k]) + ' → ' + JSON.stringify(ritorno.kpi[k])) }));
})();
