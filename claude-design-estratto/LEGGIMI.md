# Schermate di Claude Design pronte per Claude Code

Estratte il 23/10/2026 dall'esportazione di Claude Design "Gate gestionale commerciale" (1,7 MB). Ho tolto il motore di Claude Design (React e runtime, uguale in ogni pagina) e le dichiarazioni dei font. Restano 10 file leggibili da 8 a 31 KB, 181 KB in tutto.

Sono riferimenti visivi, non codice da copiare: usano il formato di Claude Design (`<x-dc>`, `{{...}}`, `class Component extends DCLogic`). Claude Code deve riprodurne l'aspetto e il comportamento dentro il prototipo esistente, che è in HTML, CSS e JavaScript semplici.

| File | Schermata |
| --- | --- |
| 01-oggi-gate | Oggi (portatile) |
| 02-scheda-della-richiesta-centro-uffici-tau | Scheda della richiesta |
| 03-offerta-da-pacchetto-centro-uffici-tau | Offerta da pacchetto |
| 04-nuova-richiesta-da-nota-gate | Nuova richiesta da nota |
| 05-trattative-gate | Trattative per fase |
| 06-squadre-gate | Squadre e capacità |
| 07-cruscotto-della-direzione-gate | Cruscotto della direzione |
| 08-oggi-da-telefono-gate | Oggi (telefono) |
| 09-nuova-richiesta-da-telefono-gate | Nuova richiesta (telefono) |
| 10-offerta-da-firmare-gate | Offerta da firmare (vista del cliente, da link) |

## Istruzione per Claude Code (da incollare)

> Nella cartella `claude-design-estratto/` ci sono 10 schermate di riferimento. Leggi solo la schermata su cui lavori, una alla volta. Riproducine aspetto e comportamento nel prototipo esistente, senza importare il formato di Claude Design né React. Prima fai la ricognizione (passo 0 del PASSAGGIO 5) e aspetta il mio ok. Dopo ogni schermata: riepilogo di 5 righe e stop.
