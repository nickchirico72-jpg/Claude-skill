--- PASSAGGIO A CLAUDE CODE ---

Sprint: 1 (20-26/10/2026), da completare nello Sprint 2 se serve. Sostituisce sprint-1/passaggio-05-restyling.md.

Materiale: estrai `schermate-claude-design.zip` nella cartella del progetto. Contiene `claude-design-estratto/` con 10 schermate di riferimento disegnate in Claude Design e un LEGGIMI. Sono riferimenti visivi nel formato di Claude Design (`<x-dc>`, `{{...}}`, `DCLogic`): riproducine aspetto e comportamento nel prototipo esistente in HTML, CSS e JavaScript semplici. Non importare React né il formato di Claude Design.

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

Regole di consumo:
- Leggi solo la schermata su cui lavori, una alla volta. Non leggere tutte le schermate insieme.
- Non riscrivere il prototipo da zero: modifiche mirate.
- Dopo ogni schermata: riepilogo di 5 righe e stop. Nicolò fa /compact prima della successiva.

Passo 0 (ricognizione, nessuna modifica): elenca le schermate attuali del prototipo e a quale delle 10 corrisponde ciascuna; dove stanno colori e caratteri (variabili in :root); quanto pesa il file; quali schermate sono nuove (probabilmente Offerta da pacchetto, Nuova richiesta da nota, Squadre, Offerta da firmare). Proponi l'ordine di lavoro e aspetta l'ok di Nicolò.

Ordine consigliato: 1) divisione del file; 2) Oggi; 3) Scheda della richiesta; 4) Trattative; 5) Cruscotto; 6) Nuova richiesta da nota; 7) Offerta da pacchetto e Offerta da firmare; 8) Squadre; 9) versioni da telefono.

User story e criteri di accettazione:
1. Come Nicolò voglio il prototipo diviso in index.html, stile.css e app.js per modificare una parte senza far rileggere tutto.
   Criteri: stesso comportamento di prima; i dati in localStorage restano leggibili; il backup JSON si importa ancora.
2. Come commerciale di Gate voglio aprire il prototipo su "Oggi" con le cose da fare subito per non cercare le richieste ferme.
   Criteri: al massimo 3 schede d'azione in alto, ognuna con un solo pulsante; trattative per fase sotto.
3. Come commerciale voglio una scheda della richiesta con l'avanzamento in 4 passi e un solo pulsante principale per sapere sempre il passo successivo.
   Criteri: Richiesta › Sopralluogo › Offerta › Firma con il passo attuale evidenziato; il pulsante principale cambia con la fase; pacchetto consigliato e cronologia visibili.
4. Come commerciale voglio incollare una nota o un messaggio e trovare i campi della richiesta già proposti per registrarla in meno di un minuto.
   Criteri: estrazione a regole (nessuna IA esterna nel prototipo); la persona controlla e salva; data di annotazione registrata in automatico.
5. Come commerciale voglio generare l'offerta dal pacchetto del settore e mandarla da firmare con un link per accorciare i tempi.
   Criteri: preventivo su metri quadri e frequenza con parametri modificabili; vista del cliente senza account né password; firma simulata e dichiarata come tale.
6. Come direzione voglio vedere le squadre disponibili prima di firmare per accettare solo clienti che possiamo servire.
   Criteri: disponibilità per squadra e data; avviso se un'offerta supera la capacità.
7. Come direzione voglio un cruscotto con pochi numeri e il confronto col mese prima per capire in 10 secondi se il processo migliora.
   Criteri: tempo di prima risposta, tempo richiesta-offerta, richieste registrate entro 24 ore (soglia 80%), offerte firmate; dove si fermano le richieste; canali di provenienza.
8. Come utente voglio un'interfaccia chiara per non sbagliare.
   Criteri: conferma dopo ogni salvataggio; istruzioni quando una lista è vuota; nessuna sigla nelle etichette; pulsanti alti almeno 44 px; contrasto del testo almeno 4,5:1; funziona a 390 px e a 1280 px.

KPI collegati (dal dizionario): K3 conversione delle offerte, K9 trattative ferme, K11 clienti adatti a Gate, K12 tempo di prima risposta, K13 richiesta-offerta, K14 registrate entro 24 h, K15 quota richieste digitali, K16 offerte firmate da link.

Dati necessari: campi già presenti (date di richiesta, annotazione, risposta, offerta, esito, canale, settore, valore, margine). Nuovi solo se servono alle schermate Squadre e Offerta: squadra, disponibile da, metri quadri, frequenza. Se ne manca uno, segnalalo e non inventarlo. Solo dati fittizi.

Vincoli: nessuna chiamata di rete tranne Google Fonts; colori e caratteri del sito di Gate (Sora, Manrope); l'IA prepara, una persona approva; nessuna funzione rimossa senza dirlo.

Controllo finale: con Playwright (se non è installato, chiedi a Nicolò prima di installarlo) fai uno screenshot di ogni schermata a 1280 px e a 390 px in `design/verifica/`, da confrontare con le schermate di riferimento.

Domanda di business: il prototipo si capisce e si usa al primo colpo durante la demo da 90 secondi e con Alfredo?

--- FINE PASSAGGIO ---
