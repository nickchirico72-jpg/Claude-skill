# Gate · Sviluppo commerciale (prototipo)

Prototipo web per **Gate S.R.L.**: porta in digitale il percorso commerciale "dai contatti ai contratti", dalla prima richiesta alla commessa affidata a chi la esegue.

> **Dati fittizi.** Clienti, partner, squadre, valori, margini, ore e numeri di telefono sono inventati a scopo dimostrativo e non sono dati reali di Gate. Il logo è provvisorio: verrà sostituito da quello ufficiale solo previo permesso di Gate.

![Pipeline commerciale](docs/screenshot/pipeline-desktop.png)

## Il problema

Oggi Gate acquisisce commesse da portali di gara, con attività "porta a porta" e tramite intermediari. La sfida proposta da Gate: **come acquisire nuovi clienti e posizionarsi come partner nella gestione delle strutture**, partendo da un settore e un territorio pilota (ipotesi: uffici e studi professionali a Bari).

Gate ha chiesto tre risultati:
- un piano commerciale pilota;
- un percorso di vendita nel CRM;
- una dashboard delle opportunità, misurata "dai contatti ai contratti".

C'è anche un vincolo: acquisire solo clienti coerenti con la capacità operativa e la marginalità attesa.

## La soluzione

Quattro schermate:

| Schermata | Cosa fa |
|---|---|
| **Pipeline** | Le opportunità avanzano con un clic nelle fasi Contatto → Qualificato → Sopralluogo → Offerta → Contratto (più Perso). Ogni opportunità ha un **punteggio di coerenza A/B/C** su 6 criteri: settore pilota, distanza da Bari, capacità disponibile, margine stimato, dimensione della commessa, decisore identificato. Un'opportunità C passa a Offerta solo con una motivazione scritta. |
| **Clienti** | L'anagrafica: aziende con i loro **referenti** (ruolo, decisore, telefono, email, canale preferito, consenso privacy), pulsanti **Chiama / WhatsApp / Email** con un clic, **cronologia delle attività** (chiamate, email, visite, note) e **prossime azioni** con data. Ogni azienda ha la sua **fonte** (sito web, porta a porta, intermediario, portale gare, eventi e LinkedIn, passaparola). Le attività in scadenza compaiono in "Da fare oggi" nella Pipeline. |
| **Allocazione** | Ogni contratto firmato va prima a una **squadra interna** con ore libere nella zona. Se non c'è capacità, il coordinatore lo propone a un'**impresa partner** con un messaggio **WhatsApp precompilato** (link wa.me). Il partner risponde SÌ o NO senza usare nessuna app; se risponde NO, il sistema propone il partner successivo. Sono ammesse solo imprese con DURC regolare, nessun lavoratore autonomo. Il cliente resta di Gate, che firma il contratto e controlla la qualità. |
| **Indicatori** | I 5 KPI richiesti da Gate, divisi in **efficacia** (contatti qualificati, sopralluoghi, conversione delle offerte) ed **efficienza** (costo di acquisizione, margine atteso), ciascuno con la formula e i numeri. Poi il funnel commerciale, i risultati per settore e i **risultati per canale di acquisizione**, cioè quale canale porta contratti e a che costo. |

Il portale per i partner compare solo come anteprima, etichettata "evoluzione futura".

![Clienti](docs/screenshot/clienti-desktop.png)
![Scheda cliente](docs/screenshot/scheda-cliente-desktop.png)
![Allocazione della capacità](docs/screenshot/allocazione-desktop.png)
![Indicatori di performance](docs/screenshot/indicatori-desktop.png)

<p>
  <img src="docs/screenshot/pipeline-mobile.png" alt="Pipeline da telefono" width="260">
  <img src="docs/screenshot/scheda-cliente-mobile.png" alt="Scheda cliente da telefono" width="260">
  <img src="docs/screenshot/allocazione-mobile.png" alt="Allocazione da telefono" width="260">
</p>

## Come avviarlo

- **In locale:** scarica la cartella e apri `index.html` con un doppio clic. Non serve installare nulla.
- **Online, con GitHub Pages:** nel repository vai in *Settings → Pages*, scegli *Deploy from a branch*, seleziona il branch e la cartella `/ (root)` e salva. Dopo un minuto il sito è disponibile all'indirizzo che GitHub mostra in quella pagina.

I dati restano nel browser di chi usa il prototipo (localStorage): non c'è nessun server. In fondo alla pagina ci sono tre pulsanti:
- **Salva backup**: scarica tutti i dati in un file `.json`;
- **Carica backup**: ripristina i dati da quel file, anche su un altro computer;
- **Ripristina dati di esempio**: riparte dai dati fittizi.

Nella schermata Clienti, **Esporta per Excel** scarica aziende e referenti in un file CSV.

## Gate può usarlo davvero?

Sì, per il pilota e da una persona alla volta. Il coordinatore commerciale può registrare clienti, referenti, attività e trattative reali, salvare il backup ogni sera e passarlo a un collega, ed esportare l'elenco per Excel.

Il prototipo però non condivide i dati tra più utenti: ogni browser ha la sua copia. Per un uso da parte di tutto l'ufficio servono due passi successivi:
1. **un archivio condiviso online** con accesso tramite login (per esempio un database gestito) al posto del salvataggio nel browser;
2. **il collegamento al gestionale di Gate**, così che un contratto firmato diventi direttamente una commessa nelle sezioni Contratti e Pianificazione Personale.

Prima di inserire dati personali reali va verificato con Gate il rispetto del GDPR: informativa, consenso e luogo dove sono conservati i dati.

## Stack

HTML, CSS e JavaScript puro, senza framework né compilazione: si apre con un doppio clic e si pubblica gratis su GitHub Pages così com'è. Chiunque nel team può leggere e spiegare ogni file senza conoscere strumenti aggiuntivi.

Colori e font riprendono il sito [gatesrl.it](https://www.gatesrl.it/): blu notte, blu petrolio e acquamarina; Sora per i titoli e Manrope per il testo.

## Struttura dei file

```
index.html          struttura della pagina e menu
css/stile.css       palette e font del sito Gate (variabili in cima al file)
js/config.js        IPOTESI E DATI DI ESEMPIO: l'unico file da modificare con i dati reali
js/formato.js       formattazione di euro, percentuali e date
js/dati.js          salvataggio nel browser, collegamenti tra aziende/referenti/opportunità, backup ed esportazione
js/allocazione.js   regole di allocazione: squadre, partner, DURC, messaggio WhatsApp
js/punteggio.js     stime economiche e punteggio di coerenza A/B/C
js/kpi.js           5 KPI, funnel e risultati per settore
js/clienti.js       schermata Clienti: elenco, scheda cliente, referenti, attività, "Da fare"
js/app.js           schermate Pipeline, Allocazione e Indicatori, finestre e clic
```

## Come sostituire i dati con quelli reali

Tutto si trova in `js/config.js`, con un commento per ogni voce:

- **tariffe e costi orari** per servizio (squadra interna e partner) e spese dirette;
- **probabilità di chiusura** per fase, usate per il margine atteso;
- **pesi e soglie del punteggio** A/B/C, compresa la conferma motivata per i clienti C (`confermaPerPunteggioC`);
- **costi commerciali** per il costo di acquisizione e **obiettivi** dei KPI;
- **comuni e zone**, **squadre** (ore di capacità e già impegnate), **partner** (tipo, zone, servizi, scadenza DURC, telefono);
- **testo del messaggio WhatsApp**;
- **aziende con i referenti**, **opportunità** e **attività** di esempio;
- **canali di acquisizione** con la loro spesa e i **tipi di attività**.

Dopo aver cambiato le opportunità di esempio, premi "Ripristina dati di esempio" per caricarle. Prima di una demo dal vivo conviene mettere come telefono di un partner il numero di un membro del team, così il messaggio WhatsApp arriva davvero.

## Progetto

Prototipo realizzato per l'**Open Challenge by Enterprise 2026**, corso di Digital Transformation, laurea magistrale LM-77, Università LUM, con Gate S.R.L. come azienda partner.
