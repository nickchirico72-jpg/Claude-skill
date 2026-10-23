/*
 * FORMATTAZIONE DI NUMERI E DATE (all'italiana)
 */

function formattaEuro(n) {
  return Math.round(n).toLocaleString("it-IT") + " €";
}

function formattaPercentuale(x) {
  return Math.round(x * 100) + "%";
}

// Percentuale con un decimale, per i margini vicini alle soglie: 0.115 -> "11,5%"
function formattaPercentualeDecimale(x) {
  return (Math.round(x * 1000) / 10).toLocaleString("it-IT") + "%";
}

// "2026-10-17" -> "17/10/2026"; un valore in un altro formato diventa "" (così non può portare HTML)
function formattaData(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [a, m, g] = iso.split("-");
  return g + "/" + m + "/" + a;
}

// "2026-10-22" -> "gio 22/10": giorno della settimana per le date vicine
function formattaGiorno(iso) {
  if (!formattaData(iso)) return "";
  const [a, m, g] = iso.split("-").map(Number);
  return new Date(a, m - 1, g).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit" });
}

// Data AAAA-MM-GG spostata di n giorni, es. aggiungiGiorni("2026-10-30", 3) = "2026-11-02"
function aggiungiGiorni(iso, n) {
  const [a, m, g] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, g + n));
  return d.toISOString().slice(0, 10);
}

// Data AAAA-MM-GG spostata di n mesi (il 31 diventa l'ultimo giorno del mese, se serve), es. aggiungiMesi("2026-10-22", 12) = "2027-10-22"
function aggiungiMesi(iso, n) {
  const [a, m, g] = iso.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m - 1 + n + 1, 0)).getUTCDate();
  return new Date(Date.UTC(a, m - 1 + n, Math.min(g, ultimo))).toISOString().slice(0, 10);
}

// "1 giorno", "35 giorni"
function giorni(n) {
  return n === 1 ? "1 giorno" : n + " giorni";
}

// Testo accorciato a n caratteri, con i puntini se serve
function accorcia(testo, n) {
  const s = String(testo ?? "");
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

// Giorni tra due date AAAA-MM-GG, es. giorniTra("2026-10-15", "2026-10-17") = 2
function giorniTra(da, a) {
  const giorno = (iso) => {
    const [anno, mese, g] = iso.split("-").map(Number);
    return Date.UTC(anno, mese - 1, g) / 86400000;
  };
  return Math.round(giorno(a) - giorno(da));
}

// Protegge il testo prima di metterlo nella pagina.
// Regola: ogni valore che viene dai dati salvati passa da esc() quando entra nell'HTML,
// anche id e codici negli attributi; i numeri passano da Number().
// Il controllo dei tipi in strutturaValida() (dati.js) è la prima difesa, esc() la seconda.
function esc(testo) {
  return String(testo ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// "2026-10-23" -> "Venerdì 23 ottobre": la data per esteso, per l'occhiello di «Oggi»
function formattaGiornoEsteso(iso) {
  if (!formattaData(iso)) return "";
  const [a, m, g] = iso.split("-").map(Number);
  const testo = new Date(a, m - 1, g).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}

// "2026-10-26" -> "lunedì": solo il nome del giorno
function nomeGiorno(iso) {
  if (!formattaData(iso)) return "";
  const [a, m, g] = iso.split("-").map(Number);
  return new Date(a, m - 1, g).toLocaleDateString("it-IT", { weekday: "long" });
}

// Ora di adesso in formato HH:MM (quello che le attività salvano, es. "09:05")
function oraAdesso() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

// "09:05" -> "9:05": l'ora senza lo zero davanti, per i testi
function oraBreve(hhmm) {
  return String(hhmm || "").replace(/^0/, "");
}
