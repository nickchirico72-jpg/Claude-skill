"""
VERSIONE IN UN SOLO FILE DEL PROTOTIPO (da condividere per email o chat)
Inserisce css/stile.css e gli script di js/ dentro index.html e scrive dist/gate-crm-prototipo.html.
Scrive anche dist/sopralluogo.html e dist/modulo.html (i moduli pubblici, autonomi): vanno condivisi insieme al CRM.
Uso: python3 strumenti/versione_unica.py
"""

import re
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent


def incorpora():
    """Sostituisce <link rel=stylesheet> e <script src> locali con il loro contenuto."""
    html = (RADICE / "index.html").read_text(encoding="utf-8")
    css = (RADICE / "css" / "stile.css").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="css/stile.css">', "<style>\n" + css + "\n</style>")
    # Solo "</script" dentro uno script chiuderebbe il tag: si scrive "<\/script" (gli altri "</", anche nelle espressioni regolari, restano)
    html = re.sub(r'<script src="(js/[^"]+)"></script>',
                  lambda m: "<script>\n" + re.sub(r"</(script)", r"<\\/\1", (RADICE / m.group(1)).read_text(encoding="utf-8"), flags=re.I) + "\n</script>", html)
    uscita = RADICE / "dist" / "gate-crm-prototipo.html"
    uscita.parent.mkdir(exist_ok=True)
    uscita.write_text(html, encoding="utf-8")
    print(f"Creato {uscita} ({uscita.stat().st_size // 1024} KB)")
    # I moduli pubblici, anch'essi in un file solo: messi accanto al CRM, i link «Apri il modulo» funzionano anche fuori da GitHub Pages
    for pagina in ("sopralluogo.html", "modulo.html"):
        testo = (RADICE / pagina).read_text(encoding="utf-8").replace('<link rel="stylesheet" href="css/stile.css">', "<style>\n" + css + "\n</style>")
        testo = re.sub(r'<script src="(js/[^"]+)"></script>',
                       lambda m: "<script>\n" + re.sub(r"</(script)", r"<\\/\1", (RADICE / m.group(1)).read_text(encoding="utf-8"), flags=re.I) + "\n</script>", testo)
        (uscita.parent / pagina).write_text(testo, encoding="utf-8")
        print(f"Creato {uscita.parent / pagina}")


if __name__ == "__main__":
    incorpora()
