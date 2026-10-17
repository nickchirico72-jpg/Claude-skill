/*
 * FORMATTAZIONE DI NUMERI E DATE (all'italiana)
 */

function formattaEuro(n) {
  return Math.round(n).toLocaleString("it-IT") + " €";
}

function formattaPercentuale(x) {
  return Math.round(x * 100) + "%";
}

// "2026-10-17" -> "17/10/2026"
function formattaData(iso) {
  if (!iso) return "";
  const [a, m, g] = iso.split("-");
  return g + "/" + m + "/" + a;
}

// Protegge il testo inserito dall'utente prima di metterlo nella pagina
function esc(testo) {
  return String(testo ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
