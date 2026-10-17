/*
 * FORMATTAZIONE DI NUMERI E DATE (all'italiana)
 */

function formattaEuro(n) {
  return Math.round(n).toLocaleString("it-IT") + " €";
}

function formattaPercentuale(x) {
  return Math.round(x * 100) + "%";
}

// "2026-10-17" -> "17/10/2026"; un valore in un altro formato diventa "" (così non può portare HTML)
function formattaData(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [a, m, g] = iso.split("-");
  return g + "/" + m + "/" + a;
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
