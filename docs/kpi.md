# Dizionario dei KPI

Fonte unica per le query: ogni file in `sql/` cita il KPI che calcola. Copiato dal progetto di analisi (PASSAGGIO 01 del 19/10/2026); da completare quando arriverà il dizionario completo.

| Codice | KPI | Definizione | Tabelle |
|---|---|---|---|
| K1 | Contatti qualificati | opportunità entrate in "qualificato" nel periodo / nuovi contatti del periodo | storico_fasi, opportunita |
| K2 | Sopralluoghi | ingressi in "sopralluogo" / ingressi in "qualificato" | storico_fasi |
| K3 | Conversione offerte | contratti / offerte con esito nel periodo | offerte, opportunita |
| K4 | CAC | costi del canale nel periodo / nuovi contratti del canale | costi_canale, opportunita |
| K5 | Margine atteso | somma di valore_annuo × margine_pct × probabilità della fase, sulle aperte | opportunita, fasi |
| K9 | Opportunità ferme | aperte con giorni dall'ultima modifica oltre fasi.giorni_soglia | opportunita, fasi |

## Note di calcolabilità
- **K3**: "offerte con esito nel periodo" conta offerte (anche più versioni della stessa opportunità), mentre "contratti" conta opportunità. Da decidere nel progetto di analisi se il denominatore sono le offerte o le opportunità con almeno un'offerta chiusa: con le versioni multiple i due numeri differiscono.
- **K4**: un contratto si attribuisce al canale dell'opportunità; "nuovi contratti del periodo" usa data_chiusura.
- **K5**: le aperte sono le fasi diverse da contratto e perso; la probabilità è in fasi.probabilita.
