--- PASSAGGIO A CLAUDE CODE ---
Sprint: 1 (20-26/10/2026). Viene dopo il PASSAGGIO 3 e lo presuppone.

Contesto nuovo (che tu non hai visto):
- Il 22/10/2026 Gate ha risposto alle prime domande. Le richieste di sopralluogo arrivano tutte in modo informale, per telefono o dopo incontri sul posto, e nessuno le registra in un elenco. Gate ha un gestionale interno introdotto da pochissimo, che stanno ampliando. L'unico canale digitale è LinkedIn, ma la pagina non è operativa.
- Quindi il prototipo deve mostrare due cose: come la registrazione diventa quasi automatica, e quanto lavoro manuale toglie a Gate.
- Proposta di piattaforma interna su 5 livelli: canali del cliente (nessuna app) → cattura automatica → archivio unico → strumenti di lavoro → cruscotto. Il prototipo NON sostituisce il gestionale di Gate. È il "modello Gate" (fasi, campi, preventivo, classe A/B/C, KPI) e lo strato che sta sopra l'archivio, con scambio dati in CSV nel formato del dizionario.
- Vincoli invariati dal PASSAGGIO 3: Python con sola libreria standard, SQLite, app HTML senza server, nessun account o servizio esterno, dati fittizi dichiarati in ogni schermata. Le query di analisi le scrivo io (Nicolò); tu mi fai da tutor.
- IA: nessuna API di modelli e nessun riconoscimento vocale via web (la dettatura del browser invia l'audio a server esterni). L'assistente è simulato con regole. Va chiamato "simulazione dell'assistente" e niente si salva senza la conferma di una persona.

Passo 0, prima di modificare qualsiasi cosa:
1. Verifica se il PASSAGGIO 3 è stato applicato: blocchi A-G, in particolare tabella canali, campi data_prima_risposta, data_registrazione, firma_da_link, modulo "Richiedi un sopralluogo", preventivo e classe (E2), dashboard su tre livelli (F).
2. Se manca qualcosa del PASSAGGIO 3, dimmelo e fermati: prima chiudiamo quello.
3. Se c'è tutto, mostrami il piano per N1-N7 con i file che toccherai e le tabelle o i campi nuovi. Aspetta il mio ok.

User story (in ordine di priorità):
- N1 (US-H) Come chi risponde al telefono voglio scrivere o dettare una nota e ritrovare la richiesta già compilata, per registrarla in pochi secondi.
- N2 (US-J) Come commerciale voglio generare l'offerta da un pacchetto standard e farla firmare da link, per chiudere in pochi minuti e non in giorni.
- N3 (US-M) Come direzione voglio vedere il tempo risparmiato in ore ed euro, per capire se la piattaforma conviene.
- N4 (US-I + US-L) Come responsabile commerciale voglio la lista del lunedì, per sapere subito cosa sollecitare e quali contratti rinnovare.
- N5 (US-G) Come direzione voglio esportare e importare i dati nel formato del dizionario, per portare il modello nel nostro gestionale o in un CRM.
- N6 Come chi guarda la demo voglio vedere quali passaggi sono automatici e quali li fa una persona, per capire subito cosa cambia per Gate.
- N7 (US-K, solo se resta tempo) Come cliente di Gate voglio un report mensile chiaro, per vedere cosa è stato fatto e con quale impatto.

Criteri di accettazione:

N1. Richiesta da nota
N1.1 Nuovo pulsante "Nuova richiesta da nota" con un campo di testo. La nota si incolla, oppure si detta con la dettatura del telefono o del sistema operativo, fuori dal browser.
N1.2 Estrazione a regole, con parametri nel config: azienda (dopo "azienda", "ditta", "studio", "società" o parole in maiuscolo), comune (lista dei comuni della provincia di Bari nel config), settore (parole chiave per i 7 settori del dizionario), mq (numero seguito da "mq", "metri" o "m2"), tipo di ambienti, frequenza (giornaliera, N volte a settimana, settimanale), canale ("ci ha conosciuti tramite…", "LinkedIn", "sito", "passaparola", "ce l'ha consigliato"…), ruolo del referente, telefono ed email (espressioni regolari).
N1.3 La scheda mostra per ogni campo il valore proposto, la frase da cui viene e uno stato: "sicuro", "da controllare" (in giallo) oppure "mancante" (in rosso). Ogni campo si può correggere.
N1.4 Solo il pulsante "Conferma e registra" crea l'opportunità: fase contatto, data_contatto modificabile (di default oggi), data_registrazione = adesso, canale e, se presenti, campagna e contenuto. Subito dopo compaiono preventivo e classe A/B/C (E2 del PASSAGGIO 3).
N1.5 La scheda mostra i secondi passati tra l'apertura della nota e la conferma, e li salva (servono a N3).
N1.6 Nel config ci sono 5 note di prova, fittizie e dichiarate come tali, con il risultato atteso. Lo script di controllo verifica che su ogni nota almeno 7 campi su 9 siano estratti correttamente e stampa gli errori.

N2. Offerta da pacchetto e firma simulata
N2.1 Nel config, 3 pacchetti per il settore pilota uffici e studi professionali (Base, Plus, Completo): servizi inclusi, frequenza, prezzo al mq annuo, servizi opzionali. Etichetta "valori di prova, da sostituire dopo l'intervista".
N2.2 Dall'opportunità si sceglie il pacchetto e si genera un'offerta stampabile (stampa del browser in PDF). Contiene: intestazione testuale Gate, cliente, ambienti e mq, servizi e frequenza, prezzo annuo e mensile, validità 30 giorni, condizioni essenziali e la scritta "documento di prova, dati fittizi". Il margine non compare nell'offerta, solo nella scheda interna.
N2.3 "Segna come inviata" valorizza data_invio (serve a K13). "Simula firma da link" porta l'opportunità a contratto con firma_da_link = 1 e data_chiusura = oggi.
N2.4 Nuovo campo offerte.pacchetto TEXT. Nuovo campo opportunita.data_scadenza_contratto TEXT: per i contratti è data_chiusura + 12 mesi, anche nei dati storici del generatore.

N3. Tempo risparmiato
N3.1 Pannello nella vista Strategica. Righe: annotare una richiesta, preparare un'offerta, ricostruire le trattative da sollecitare, preparare il report per la direzione. Per ciascuna: minuti prima e dopo (parametri nel config con l'etichetta "stime, da sostituire con la fotografia di partenza"), volume mensile (calcolato dai dati: richieste e offerte del mese), ore risparmiate al mese ed euro (costo orario nel config).
N3.2 Per "annotare una richiesta", il valore "dopo" usa la media reale dei secondi registrati in N1.5, se ce ne sono almeno 3; altrimenti il parametro.
N3.3 Sotto il pannello è scritta la formula in parole. Cambiando un parametro, i totali si aggiornano.

N4. Lista del lunedì
N4.1 Pulsante nella vista Operativa. Quattro sezioni: richieste senza prima risposta da più di 1 giorno lavorativo (K12); trattative ferme oltre la soglia della loro fase (K9); offerte inviate senza esito da più di 14 giorni; contratti in scadenza entro 90 giorni (in evidenza quelli entro 60).
N4.2 Ogni riga mostra cliente, classe, valore annuo, giorni di ritardo, responsabile e azione suggerita (frase da regola, per esempio "Richiamare: offerta inviata 18 giorni fa"). Le righe sono ordinate per classe (A prima) e poi per valore.
N4.3 Data di riferimento modificabile (di default 2026-10-19 sui dati fittizi). La lista si può stampare o copiare come testo.
N4.4 Lo script di controllo stampa il numero di righe per sezione. Le due query SQL (K9 e richieste senza risposta) le scrivo io: per ognuna preparami l'esercizio con domanda di business, tabelle, campi e valore atteso.

N5. Ponte dati con il gestionale
N5.1 "Esporta per il gestionale": un CSV per tabella (clienti, referenti, opportunita, offerte, canali), con i nomi di campo del dizionario dati e codifica UTF-8.
N5.2 "Importa dal gestionale": legge gli stessi CSV, controlla tipi e valori ammessi, elenca le righe scartate con il motivo e non mescola i dati con quelli fittizi (stessa regola di C4 del PASSAGGIO 3).
N5.3 Prova di andata e ritorno nello script di controllo: export, poi import in un database vuoto, stessi conteggi per tabella.

N6. Vista "Come funziona"
N6.1 Una pagina con i 5 livelli della piattaforma. Ogni livello ha un link alla schermata in cui avviene.
N6.2 Ogni passaggio ha un'etichetta: "automatico", "l'assistente propone, la persona conferma" oppure "persona".
N6.3 La demo guidata si aggiorna e deve stare sotto i 90 secondi: nota → conferma → preventivo e classe → offerta da pacchetto → firma simulata → dashboard aggiornata → pannello del tempo risparmiato.

N7. Report mensile al cliente (opzionale)
N7.1 Per un contratto attivo, un PDF stampabile con: servizi svolti nel mese, segnalazioni ricevute e chiuse, 3 indicatori ESG di prova (per esempio prodotti a basso impatto e ore di formazione), un commento da approvare e la scritta "dati fittizi".

KPI o ipotesi collegati (dal dizionario):
- K12 Tempo di prima risposta = giorni medi tra data_contatto e data_prima_risposta. Soglia: entro 1 giorno lavorativo. (N4)
- K13 Tempo dalla richiesta all'offerta = giorni medi tra data_contatto e data_invio della prima versione dell'offerta. (N2)
- K14 Richieste registrate entro 24 ore = richieste con data_registrazione entro 1 giorno da data_contatto / richieste con data_registrazione. Soglia: almeno 80%. (N1)
- K9 Opportunità ferme = aperte con giorni dall'ultima modifica oltre fasi.giorni_soglia. (N4)
- K16 Offerte firmate da link = contratti con firma_da_link = 1 / contratti. (N2)
- K11 Coerenza del portafoglio = quota di opportunità e di valore in classe A, B, C. (N1, N4)
- Indicatore nuovo, non è un KPI di Gate: ore risparmiate al mese = somma per attività di (minuti prima - minuti dopo) × volume mensile / 60; in euro × costo orario. Sono sempre stime dichiarate. (N3)

Dati necessari:
- Tabelle attuali e campi del PASSAGGIO 3.
- Campi nuovi: offerte.pacchetto, opportunita.data_scadenza_contratto, tempi_registrazione(id, id_opportunita, secondi, data).
- Config: regole di estrazione e note di prova (N1), pacchetti (N2), parametri dei tempi e costo orario (N3), soglie della lista del lunedì (N4).

Domanda di business a cui la query deve rispondere:
Quali trattative e richieste vanno sollecitate questa settimana, in ordine di valore, e quante ore al mese toglie la piattaforma al lavoro manuale di Gate? (Le query della lista del lunedì le scrivo io, prima sui dati fittizi.)

Consegna:
- README aggiornato: cosa fanno N1-N7 e a quali slide servono (TO-BE, soluzione e piattaforma, demo).
- Alla fine scrivimi un blocco "--- RITORNO DA CLAUDE CODE ---" con: cosa hai cambiato; criteri verificati e non verificati; numeri chiave (risultati dell'estrazione sulle 5 note, righe della lista del lunedì per sezione, ore ed euro risparmiati con i parametri di default, durata della demo guidata); screenshot pronti per le slide; dubbi aperti.
--- FINE PASSAGGIO ---
