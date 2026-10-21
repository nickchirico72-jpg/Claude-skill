/*
 * DIZIONARI CONDIVISI TRA DATABASE E APP (canali, settori, servizi, comuni, fasi, punteggio)
 * File generato da generatore/genera_dati.py a partire da generatore/parametri.py: NON modificarlo a mano.
 */
const DIZIONARI_DB = {
 "canali": [
  {
   "canale": "sito web",
   "tipo": "digitale",
   "attivo": true,
   "gruppo": "sito",
   "nota": "sito gatesrl.it (confermato)"
  },
  {
   "canale": "modulo sito",
   "tipo": "digitale",
   "attivo": true,
   "gruppo": "sito",
   "nota": "modulo «Richiedi un sopralluogo» aperto senza link tracciato"
  },
  {
   "canale": "profilo Google",
   "tipo": "digitale",
   "attivo": true,
   "gruppo": "sito",
   "nota": "scheda dell'azienda su Google"
  },
  {
   "canale": "LinkedIn",
   "tipo": "digitale",
   "attivo": true,
   "gruppo": "LinkedIn",
   "nota": "pagina aziendale e profili dei commerciali (confermato)"
  },
  {
   "canale": "WhatsApp Business",
   "tipo": "digitale",
   "attivo": true,
   "gruppo": "telefono",
   "nota": "richieste arrivate direttamente su WhatsApp"
  },
  {
   "canale": "telefono",
   "tipo": "diretto",
   "attivo": true,
   "gruppo": "telefono",
   "nota": "telefonata ricevuta dal cliente"
  },
  {
   "canale": "email",
   "tipo": "diretto",
   "attivo": true,
   "gruppo": "email",
   "nota": "email ricevuta dal cliente"
  },
  {
   "canale": "passaparola",
   "tipo": "diretto",
   "attivo": true,
   "gruppo": "passaparola",
   "nota": "segnalazione di un cliente o di un conoscente"
  },
  {
   "canale": "intermediario",
   "tipo": "intermediato",
   "attivo": true,
   "gruppo": "altro",
   "nota": "agente o intermediario con provvigione"
  },
  {
   "canale": "porta a porta",
   "tipo": "diretto",
   "attivo": true,
   "gruppo": "altro",
   "nota": "visita commerciale senza appuntamento"
  },
  {
   "canale": "portale gare",
   "tipo": "gara",
   "attivo": true,
   "gruppo": "portale/gara",
   "nota": "gare e richieste di offerta su portali"
  },
  {
   "canale": "contatto diretto",
   "tipo": "diretto",
   "attivo": true,
   "gruppo": "altro",
   "nota": "incontro o contatto senza un canale preciso"
  },
  {
   "canale": "Facebook",
   "tipo": "digitale",
   "attivo": false,
   "gruppo": "altro",
   "nota": "da confermare con Gate"
  },
  {
   "canale": "Instagram",
   "tipo": "digitale",
   "attivo": false,
   "gruppo": "altro",
   "nota": "da confermare con Gate"
  },
  {
   "canale": "Google Ads",
   "tipo": "digitale",
   "attivo": false,
   "gruppo": "altro",
   "nota": "da confermare con Gate"
  }
 ],
 "gruppiCanali": {
  "sito": "sito web",
  "LinkedIn": "LinkedIn",
  "telefono": "telefono",
  "email": "email",
  "passaparola": "passaparola",
  "portale/gara": "portale gare",
  "altro": "contatto diretto"
 },
 "settori": [
  "uffici e commercio",
  "GDO",
  "industria",
  "ricettivo",
  "sanità",
  "trasporti",
  "enti pubblici"
 ],
 "settorePilota": "uffici e commercio",
 "servizi": [
  {
   "nome": "cleaning e hospitality",
   "tariffa": 22,
   "margineMedio": 0.19
  },
  {
   "nome": "logistica e retail",
   "tariffa": 21,
   "margineMedio": 0.14
  },
  {
   "nome": "servizi alle strutture",
   "tariffa": 30,
   "margineMedio": 0.22
  }
 ],
 "comuni": [
  {
   "nome": "Bari",
   "provincia": "BA",
   "km": 0,
   "zona": "Bari città"
  },
  {
   "nome": "Modugno",
   "provincia": "BA",
   "km": 11,
   "zona": "Area Nord"
  },
  {
   "nome": "Triggiano",
   "provincia": "BA",
   "km": 10,
   "zona": "Area Sud-Est"
  },
  {
   "nome": "Capurso",
   "provincia": "BA",
   "km": 12,
   "zona": "Area Sud-Est"
  },
  {
   "nome": "Valenzano",
   "provincia": "BA",
   "km": 13,
   "zona": "Area Sud-Est"
  },
  {
   "nome": "Noicattaro",
   "provincia": "BA",
   "km": 17,
   "zona": "Area Sud-Est"
  },
  {
   "nome": "Bitonto",
   "provincia": "BA",
   "km": 19,
   "zona": "Area Nord"
  },
  {
   "nome": "Casamassima",
   "provincia": "BA",
   "km": 20,
   "zona": "Area Sud-Est"
  },
  {
   "nome": "Giovinazzo",
   "provincia": "BA",
   "km": 21,
   "zona": "Area Nord"
  },
  {
   "nome": "Mola di Bari",
   "provincia": "BA",
   "km": 22,
   "zona": "Area Sud-Est"
  },
  {
   "nome": "Molfetta",
   "provincia": "BA",
   "km": 29,
   "zona": "Area Nord"
  },
  {
   "nome": "Conversano",
   "provincia": "BA",
   "km": 31,
   "zona": "Area Sud-Est"
  },
  {
   "nome": "Gioia del Colle",
   "provincia": "BA",
   "km": 41,
   "zona": "Murgia"
  },
  {
   "nome": "Monopoli",
   "provincia": "BA",
   "km": 44,
   "zona": "Area Sud-Est"
  },
  {
   "nome": "Altamura",
   "provincia": "BA",
   "km": 46,
   "zona": "Murgia"
  },
  {
   "nome": "Bisceglie",
   "provincia": "BT",
   "km": 37,
   "zona": "BAT"
  },
  {
   "nome": "Trani",
   "provincia": "BT",
   "km": 45,
   "zona": "BAT"
  },
  {
   "nome": "Andria",
   "provincia": "BT",
   "km": 57,
   "zona": "BAT"
  },
  {
   "nome": "Barletta",
   "provincia": "BT",
   "km": 58,
   "zona": "BAT"
  },
  {
   "nome": "Fasano",
   "provincia": "BR",
   "km": 60,
   "zona": "Brindisi e provincia"
  },
  {
   "nome": "Ostuni",
   "provincia": "BR",
   "km": 82,
   "zona": "Brindisi e provincia"
  },
  {
   "nome": "Brindisi",
   "provincia": "BR",
   "km": 114,
   "zona": "Brindisi e provincia"
  },
  {
   "nome": "Cerignola",
   "provincia": "FG",
   "km": 96,
   "zona": "Foggia e provincia"
  },
  {
   "nome": "Foggia",
   "provincia": "FG",
   "km": 132,
   "zona": "Foggia e provincia"
  },
  {
   "nome": "San Severo",
   "provincia": "FG",
   "km": 160,
   "zona": "Foggia e provincia"
  },
  {
   "nome": "Lecce",
   "provincia": "LE",
   "km": 152,
   "zona": "Lecce e provincia"
  },
  {
   "nome": "Nardò",
   "provincia": "LE",
   "km": 175,
   "zona": "Lecce e provincia"
  },
  {
   "nome": "Martina Franca",
   "provincia": "TA",
   "km": 74,
   "zona": "Taranto e provincia"
  },
  {
   "nome": "Massafra",
   "provincia": "TA",
   "km": 76,
   "zona": "Taranto e provincia"
  },
  {
   "nome": "Taranto",
   "provincia": "TA",
   "km": 94,
   "zona": "Taranto e provincia"
  }
 ],
 "fasi": [
  {
   "id": "contatto",
   "probabilita": 0.05,
   "giorniFerma": 7
  },
  {
   "id": "qualificato",
   "probabilita": 0.15,
   "giorniFerma": 14
  },
  {
   "id": "sopralluogo",
   "probabilita": 0.35,
   "giorniFerma": 14
  },
  {
   "id": "offerta",
   "probabilita": 0.55,
   "giorniFerma": 21
  },
  {
   "id": "contratto",
   "probabilita": 1.0,
   "giorniFerma": null
  }
 ],
 "motiviPerdita": [
  "prezzo",
  "tempi di avvio",
  "fuori zona",
  "capacità insufficiente",
  "nessuna risposta",
  "altro"
 ],
 "basiGiuridiche": [
  "da verificare",
  "consenso",
  "legittimo interesse B2B",
  "contratto in corso"
 ],
 "modiRaccolta": [
  "a voce",
  "modulo del sito",
  "email",
  "biglietto da visita"
 ],
 "campagnaPilota": "uffici-e-commercio",
 "punteggio": {
  "pesi": {
   "settore": 20,
   "distanza": 15,
   "capacita": 20,
   "margine": 20,
   "dimensione": 10,
   "decisore": 15
  },
  "soglie": {
   "A": 75,
   "B": 50
  },
  "settoreFuoriPilota": 0.3,
  "buona": 70,
  "distanzaKm": {
   "piena": 15,
   "massima": 35
  },
  "margine": {
   "obiettivo": 0.2,
   "minimo": 0.12
  },
  "valoreAnnuo": {
   "idealeDa": 6000,
   "idealeA": 60000,
   "accettabileDa": 3000,
   "accettabileA": 100000
  }
 },
 "pagineContenuti": {
  "prova-01": "/richiedi-un-sopralluogo",
  "prova-02": "/uffici-e-studi",
  "prova-03": "/richiedi-un-sopralluogo",
  "prova-04": "/blog/costo-pulizia-uffici"
 }
};
