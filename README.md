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

Tre schermate, nell'ordine del processo:

| Schermata | Cosa fa |
|---|---|
| **Pipeline** | Le opportunità avanzano con un clic nelle fasi Contatto → Qualificato → Sopralluogo → Offerta → Contratto (più Perso). Ogni opportunità ha un **punteggio di coerenza A/B/C** su 6 criteri: settore pilota, distanza da Bari, capacità disponibile, margine stimato, dimensione della commessa, decisore identificato. Un'opportunità C passa a Offerta solo con una motivazione scritta. |
| **Allocazione** | Ogni contratto firmato va prima a una **squadra interna** con ore libere nella zona. Se non c'è capacità, il coordinatore lo propone a un'**impresa partner** con un messaggio **WhatsApp precompilato** (link wa.me). Il partner risponde SÌ o NO senza usare nessuna app; se risponde NO, il sistema propone il partner successivo. Sono ammesse solo imprese con DURC regolare, nessun lavoratore autonomo. Il cliente resta di Gate, che firma il contratto e controlla la qualità. |
| **Indicatori** | I 5 KPI richiesti da Gate, divisi in **efficacia** (contatti qualificati, sopralluoghi, conversione delle offerte) ed **efficienza** (costo di acquisizione, margine atteso), ciascuno con la formula e i numeri. Poi il funnel commerciale e i risultati per settore. |

Il portale per i partner compare solo come anteprima, etichettata "evoluzione futura".

![Allocazione della capacità](docs/screenshot/allocazione-desktop.png)
![Indicatori di performance](docs/screenshot/indicatori-desktop.png)

<p>
  <img src="docs/screenshot/pipeline-mobile.png" alt="Pipeline da telefono" width="260">
  <img src="docs/screenshot/allocazione-mobile.png" alt="Allocazione da telefono" width="260">
</p>

## Come avviarlo

- **In locale:** scarica la cartella e apri `index.html` con un doppio clic. Non serve installare nulla.
- **Online, con GitHub Pages:** nel repository vai in *Settings → Pages*, scegli *Deploy from a branch*, seleziona il branch e la cartella `/ (root)` e salva. Dopo un minuto il sito è disponibile all'indirizzo che GitHub mostra in quella pagina.

I dati restano nel browser di chi usa il prototipo (localStorage): non c'è nessun server. Per ripartire dai dati di esempio c'è il pulsante **"Ripristina dati di esempio"** in fondo alla pagina.

## Stack

HTML, CSS e JavaScript puro, senza framework né compilazione: si apre con un doppio clic e si pubblica gratis su GitHub Pages così com'è. Chiunque nel team può leggere e spiegare ogni file senza conoscere strumenti aggiuntivi.

Colori e font riprendono il sito [gatesrl.it](https://www.gatesrl.it/): blu notte, blu petrolio e acquamarina; Sora per i titoli e Manrope per il testo.

## Struttura dei file

```
index.html          struttura della pagina e menu
css/stile.css       palette e font del sito Gate (variabili in cima al file)
js/config.js        IPOTESI E DATI DI ESEMPIO: l'unico file da modificare con i dati reali
js/formato.js       formattazione di euro, percentuali e date
js/allocazione.js   regole di allocazione: squadre, partner, DURC, messaggio WhatsApp
js/punteggio.js     stime economiche e punteggio di coerenza A/B/C
js/kpi.js           5 KPI, funnel e risultati per settore
js/app.js           schermate, finestre, clic e salvataggio nel browser
```

## Come sostituire i dati con quelli reali

Tutto si trova in `js/config.js`, con un commento per ogni voce:

- **tariffe e costi orari** per servizio (squadra interna e partner) e spese dirette;
- **probabilità di chiusura** per fase, usate per il margine atteso;
- **pesi e soglie del punteggio** A/B/C, compresa la conferma motivata per i clienti C (`confermaPerPunteggioC`);
- **costi commerciali** per il costo di acquisizione e **obiettivi** dei KPI;
- **comuni e zone**, **squadre** (ore di capacità e già impegnate), **partner** (tipo, zone, servizi, scadenza DURC, telefono);
- **testo del messaggio WhatsApp**;
- **opportunità di esempio**.

Dopo aver cambiato le opportunità di esempio, premi "Ripristina dati di esempio" per caricarle. Prima di una demo dal vivo conviene mettere come telefono di un partner il numero di un membro del team, così il messaggio WhatsApp arriva davvero.

## Progetto

Prototipo realizzato per l'**Open Challenge by Enterprise 2026**, corso di Digital Transformation, laurea magistrale LM-77, Università LUM, con Gate S.R.L. come azienda partner.
