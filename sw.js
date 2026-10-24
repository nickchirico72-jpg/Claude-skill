/*
 * SERVICE WORKER (app installabile, pubblicata su GitHub Pages)
 * Conserva una copia dei file dell'app, così il CRM si apre anche senza rete dopo la prima visita.
 * Strategia: prima la rete (ogni aggiornamento arriva subito), la copia solo quando la rete manca.
 * I dati di lavoro non passano da qui: restano nel browser (localStorage), come sempre.
 * Un file nuovo dell'app va aggiunto a FILE: la prova «app» di prove/e2e.js lo controlla.
 */
const VERSIONE = "gate-crm-1";
const FILE = [
  "index.html",
  "sopralluogo.html",
  "modulo.html",
  "css/stile.css",
  "manifest.webmanifest",
  "icone/icona-192.png",
  "icone/icona-512.png",
  "icone/icona-maskable-512.png",
  "icone/apple-touch-icon.png",
  "js/dizionari.js",
  "js/dati-db.js",
  "js/config.js",
  "js/archivio.js",
  "js/formato.js",
  "js/dati.js",
  "js/allocazione.js",
  "js/punteggio.js",
  "js/kpi.js",
  "js/analisi.js",
  "js/clienti.js",
  "js/oggi.js",
  "js/canali.js",
  "js/assistente.js",
  "js/ponte.js",
  "js/indicatori.js",
  "js/preventivi.js",
  "js/documenti.js",
  "js/app.js",
];

// Installazione: salva la copia dei file dell'app
self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(FILE)).then(() => self.skipWaiting()));
});

// Attivazione: toglie le copie delle versioni precedenti e prende subito le pagine aperte
self.addEventListener("activate", (evento) => {
  evento.waitUntil(caches.keys()
    .then((chiavi) => Promise.all(chiavi.filter((k) => k !== VERSIONE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Richieste: prima la rete (e la copia si aggiorna); senza rete la copia salvata (per le pagine, anche senza i parametri utm)
self.addEventListener("fetch", (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== "GET") return;
  const url = new URL(richiesta.url);
  const caratteri = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== self.location.origin && !caratteri) return;
  const pagina = richiesta.mode === "navigate";
  evento.respondWith(fetch(richiesta)
    .then((risposta) => {
      if (risposta.ok || risposta.type === "opaque") {
        const copia = risposta.clone();
        caches.open(VERSIONE).then((c) => c.put(richiesta, copia));
      }
      return risposta;
    })
    .catch(() => caches.match(richiesta, { ignoreSearch: pagina })
      .then((salvata) => salvata || (pagina ? caches.match("index.html") : Response.error()))));
});
