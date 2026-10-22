-- Archivio condiviso del CRM Gate (MySQL 8 / MariaDB 10.5+). Generato da strumenti/archivio.py: non modificarlo a mano.
-- Ogni dato dell'app ha qui la sua colonna; vedi docs/schema-archivio.md.
SET NAMES utf8mb4;

-- Settori dei clienti
CREATE TABLE settori (
  settore VARCHAR(255) PRIMARY KEY,
  ordine INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comuni con provincia, distanza da Bari e zona operativa
CREATE TABLE comuni (
  comune VARCHAR(255) PRIMARY KEY,
  provincia VARCHAR(8) NOT NULL,
  km_da_bari INT NOT NULL CHECK (km_da_bari >= 0),
  zona VARCHAR(255) NOT NULL,
  ordine INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Canali di acquisizione e loro gruppo
CREATE TABLE canali (
  canale VARCHAR(255) PRIMARY KEY,
  tipo VARCHAR(255) NOT NULL,
  attivo TINYINT(1) NOT NULL CHECK (attivo IN (0, 1)),
  gruppo VARCHAR(255) NOT NULL,
  nota VARCHAR(255),
  ordine INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Motivi per cui si perde una trattativa
CREATE TABLE motivi_perdita (
  motivo VARCHAR(255) PRIMARY KEY,
  ordine INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Servizi con tariffa e costi orari
CREATE TABLE servizi (
  servizio VARCHAR(255) PRIMARY KEY,
  tariffa DOUBLE NOT NULL CHECK (tariffa > 0),
  costo_interno DOUBLE CHECK (costo_interno >= 0),
  costo_partner DOUBLE CHECK (costo_partner >= 0),
  ordine INT NOT NULL,
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Squadre interne di Gate
CREATE TABLE squadre (
  id VARCHAR(64) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  caposquadra VARCHAR(255),
  ore_capacita INT NOT NULL CHECK (ore_capacita >= 0),
  ore_impegnate INT NOT NULL CHECK (ore_impegnate >= 0),
  ordine INT NOT NULL,
  attiva TINYINT(1) NOT NULL CHECK (attiva IN (0, 1)),
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Zone coperte da ogni squadra
CREATE TABLE squadre_zone (
  id_squadra VARCHAR(64) NOT NULL,
  zona VARCHAR(255) NOT NULL,
  PRIMARY KEY (id_squadra, zona),
  FOREIGN KEY (id_squadra) REFERENCES squadre(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Servizi svolti da ogni squadra
CREATE TABLE squadre_servizi (
  id_squadra VARCHAR(64) NOT NULL,
  servizio VARCHAR(255) NOT NULL,
  PRIMARY KEY (id_squadra, servizio),
  FOREIGN KEY (id_squadra) REFERENCES squadre(id) ON DELETE CASCADE,
  FOREIGN KEY (servizio) REFERENCES servizi(servizio) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Imprese partner in ordine di priorità
CREATE TABLE partner (
  id VARCHAR(64) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(16) NOT NULL CHECK (tipo IN ('impresa', 'autonomo')),
  referente VARCHAR(255),
  telefono VARCHAR(32),
  durc_scadenza DATE,
  ordine INT NOT NULL,
  attivo TINYINT(1) NOT NULL CHECK (attivo IN (0, 1)),
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Zone coperte da ogni partner
CREATE TABLE partner_zone (
  id_partner VARCHAR(64) NOT NULL,
  zona VARCHAR(255) NOT NULL,
  PRIMARY KEY (id_partner, zona),
  FOREIGN KEY (id_partner) REFERENCES partner(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Servizi svolti da ogni partner
CREATE TABLE partner_servizi (
  id_partner VARCHAR(64) NOT NULL,
  servizio VARCHAR(255) NOT NULL,
  PRIMARY KEY (id_partner, servizio),
  FOREIGN KEY (id_partner) REFERENCES partner(id) ON DELETE CASCADE,
  FOREIGN KEY (servizio) REFERENCES servizi(servizio) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tipi di ambiente del preventivo: resa in mq all'ora e spese dirette
CREATE TABLE ambienti_preventivo (
  ambiente VARCHAR(255) PRIMARY KEY,
  resa_mq_ora DOUBLE NOT NULL CHECK (resa_mq_ora > 0),
  spese_dirette DOUBLE NOT NULL CHECK (spese_dirette BETWEEN 0 AND 1),
  ordine INT NOT NULL,
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Frequenze del preventivo: passaggi a settimana e sconto
CREATE TABLE frequenze_preventivo (
  frequenza VARCHAR(255) PRIMARY KEY,
  passaggi_settimana INT NOT NULL CHECK (passaggi_settimana BETWEEN 1 AND 7),
  sconto DOUBLE NOT NULL CHECK (sconto BETWEEN 0 AND 1),
  ordine INT NOT NULL,
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Soglie e valori singoli (giorni, obiettivi, avvisi...): valore in JSON
CREATE TABLE impostazioni (
  chiave VARCHAR(64) PRIMARY KEY,
  valore TEXT NOT NULL CHECK (JSON_VALID(valore)),
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chi usa il CRM: nome, email per l'accesso, ruolo
CREATE TABLE utenti (
  id VARCHAR(64) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  ruolo VARCHAR(16) NOT NULL CHECK (ruolo IN ('direzione', 'commerciale', 'ufficio')),
  attivo TINYINT(1) NOT NULL CHECK (attivo IN (0, 1)),
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Aziende clienti o potenziali
CREATE TABLE aziende (
  id VARCHAR(64) PRIMARY KEY,
  ragione_sociale VARCHAR(255) NOT NULL CHECK (TRIM(ragione_sociale) <> ''),
  partita_iva VARCHAR(32),
  settore VARCHAR(255),
  comune VARCHAR(255),
  fonte VARCHAR(255),
  note TEXT,
  creata_il DATE,
  superficie_mq DOUBLE CHECK (superficie_mq >= 0),
  tipo_cliente VARCHAR(255),
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Persone di riferimento delle aziende, con la privacy
CREATE TABLE referenti (
  id VARCHAR(64) PRIMARY KEY,
  id_azienda VARCHAR(64) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  ruolo VARCHAR(255),
  telefono VARCHAR(32),
  email VARCHAR(255),
  canale_preferito VARCHAR(16),
  decisore TINYINT(1) CHECK (decisore IN (0, 1)),
  privacy_base VARCHAR(255) NOT NULL,
  privacy_data DATE,
  privacy_raccolta VARCHAR(255) NOT NULL,
  privacy_opposizione TINYINT(1) NOT NULL CHECK (privacy_opposizione IN (0, 1)),
  cancellato TINYINT(1) CHECK (cancellato IN (0, 1)),
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255),
  FOREIGN KEY (id_azienda) REFERENCES aziende(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trattative: una per servizio richiesto
CREATE TABLE opportunita (
  id VARCHAR(64) PRIMARY KEY,
  codice VARCHAR(32) NOT NULL UNIQUE,
  id_azienda VARCHAR(64) NOT NULL,
  id_referente VARCHAR(64),
  canale VARCHAR(255),
  comune VARCHAR(255),
  servizio VARCHAR(255) NOT NULL,
  ore_mese DOUBLE NOT NULL CHECK (ore_mese >= 0),
  valore_annuo DOUBLE,
  margine DOUBLE,
  capacita_simulata DOUBLE,
  tariffa DOUBLE CHECK (tariffa >= 0),
  note TEXT,
  scadenza_offerta DATE,
  data_avvio DATE,
  riaperta_il DATE,
  motivazione_c TEXT,
  data_prima_risposta DATE,
  data_registrazione DATE,
  consenso_privacy TINYINT(1) CHECK (consenso_privacy IN (0, 1)),
  campagna VARCHAR(255),
  contenuto VARCHAR(255),
  pagina_arrivo VARCHAR(255),
  firma_da_link TINYINT(1) CHECK (firma_da_link IN (0, 1)),
  perso_il DATE,
  motivo_perdita VARCHAR(255),
  nota_perdita TEXT,
  responsabile VARCHAR(255),
  data_scadenza_contratto DATE,
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255),
  FOREIGN KEY (id_azienda) REFERENCES aziende(id),
  FOREIGN KEY (id_referente) REFERENCES referenti(id),
  CHECK ((perso_il IS NULL) = (motivo_perdita IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data in cui ogni trattativa è entrata in ogni fase
CREATE TABLE fasi_opportunita (
  id_opportunita VARCHAR(64) NOT NULL,
  fase VARCHAR(16) NOT NULL CHECK (fase IN ('contatto', 'qualificato', 'sopralluogo', 'offerta', 'contratto')),
  data DATE NOT NULL,
  PRIMARY KEY (id_opportunita, fase),
  FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Misure del preventivo di una trattativa
CREATE TABLE preventivi (
  id_opportunita VARCHAR(64) PRIMARY KEY,
  ambiente VARCHAR(255) NOT NULL,
  mq DOUBLE NOT NULL CHECK (mq >= 0),
  frequenza VARCHAR(255) NOT NULL,
  pacchetto VARCHAR(255),
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255),
  FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trattative da ricontattare in una data
CREATE TABLE ricontatti (
  id_opportunita VARCHAR(64) PRIMARY KEY,
  data DATE NOT NULL,
  nota TEXT NOT NULL,
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255),
  FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chi esegue la commessa firmata: squadra, partner o già avviata (storico)
CREATE TABLE allocazioni (
  id_opportunita VARCHAR(64) PRIMARY KEY,
  tipo VARCHAR(16) NOT NULL CHECK (tipo IN ('storico', 'squadra', 'partner')),
  id_squadra VARCHAR(64),
  id_partner VARCHAR(64),
  data DATE NOT NULL,
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255),
  FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE CASCADE,
  FOREIGN KEY (id_squadra) REFERENCES squadre(id),
  FOREIGN KEY (id_partner) REFERENCES partner(id),
  CHECK ((tipo = 'squadra') = (id_squadra IS NOT NULL) AND (tipo = 'partner') = (id_partner IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Proposte inviate ai partner su WhatsApp e loro risposta
CREATE TABLE proposte_partner (
  id_opportunita VARCHAR(64) NOT NULL,
  ordine INT NOT NULL,
  id_partner VARCHAR(64) NOT NULL,
  data DATE NOT NULL,
  esito VARCHAR(8) NOT NULL CHECK (esito IN ('attesa', 'si', 'no')),
  in_attesa VARCHAR(64) AS (IF(esito = 'attesa', id_opportunita, NULL)) STORED UNIQUE,
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255),
  PRIMARY KEY (id_opportunita, ordine),
  FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE CASCADE,
  FOREIGN KEY (id_partner) REFERENCES partner(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attività svolte e da fare (chiamate, email, visite, promemoria)
CREATE TABLE attivita (
  id VARCHAR(64) PRIMARY KEY,
  id_azienda VARCHAR(64) NOT NULL,
  id_referente VARCHAR(64),
  id_opportunita VARCHAR(64),
  da_fare TINYINT(1) NOT NULL CHECK (da_fare IN (0, 1)),
  automatica TINYINT(1) CHECK (automatica IN (0, 1)),
  tipo VARCHAR(32) NOT NULL,
  data DATE NOT NULL,
  ora VARCHAR(5) CHECK (ora = '' OR ora REGEXP '^[0-9]{2}:[0-9]{2}$'),
  testo TEXT NOT NULL,
  fase VARCHAR(16),
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255),
  FOREIGN KEY (id_azienda) REFERENCES aziende(id),
  FOREIGN KEY (id_referente) REFERENCES referenti(id),
  FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contratti già in corso dei clienti storici (firmati prima della pipeline): lista dei rinnovi
CREATE TABLE contratti_in_corso (
  id VARCHAR(64) PRIMARY KEY,
  id_azienda VARCHAR(64) NOT NULL,
  servizio VARCHAR(255) NOT NULL,
  valore_annuo DOUBLE NOT NULL CHECK (valore_annuo >= 0),
  ore_mese DOUBLE CHECK (ore_mese >= 0),
  data_firma DATE NOT NULL,
  data_scadenza_contratto DATE NOT NULL,
  responsabile VARCHAR(255),
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255),
  FOREIGN KEY (id_azienda) REFERENCES aziende(id),
  CHECK (data_scadenza_contratto > data_firma)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Secondi impiegati a registrare una richiesta da nota (tempo risparmiato)
CREATE TABLE tempi_registrazione (
  id VARCHAR(64) PRIMARY KEY,
  id_opportunita VARCHAR(64),
  secondi INT NOT NULL CHECK (secondi >= 0),
  data DATE NOT NULL,
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255),
  FOREIGN KEY (id_opportunita) REFERENCES opportunita(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contenuti del piano editoriale aggiunti nel CRM (link tracciati)
CREATE TABLE contenuti (
  id VARCHAR(64) PRIMARY KEY,
  data_pubblicazione DATE NOT NULL,
  canale VARCHAR(255) NOT NULL,
  tema VARCHAR(255) NOT NULL,
  settore VARCHAR(255) NOT NULL,
  formato VARCHAR(255) NOT NULL,
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Richieste vere importate dal CSV a 7 colonne
CREATE TABLE richieste_reali (
  id INT PRIMARY KEY,
  fonte VARCHAR(16) NOT NULL CHECK (fonte IN ('partenza', 'test')),
  data_richiesta DATE NOT NULL,
  data_registrazione DATE,
  canale VARCHAR(255) NOT NULL,
  settore VARCHAR(255) NOT NULL,
  data_risposta DATE,
  data_offerta DATE,
  esito VARCHAR(255) NOT NULL,
  voto_facilita INT CHECK (voto_facilita BETWEEN 1 AND 5),
  note TEXT,
  aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  aggiornato_da VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registro delle modifiche: chi, quando, cosa
CREATE TABLE registro (
  id INT PRIMARY KEY,
  quando DATETIME NOT NULL,
  chi VARCHAR(255) NOT NULL,
  ruolo VARCHAR(16),
  cosa TEXT NOT NULL,
  record INT CHECK (record >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Versione dei dati e contatori per i nuovi id
CREATE TABLE archivio_info (
  chiave VARCHAR(64) PRIMARY KEY,
  valore VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_opportunita_perso_il ON opportunita (perso_il);
CREATE INDEX idx_opportunita_scadenza_offerta ON opportunita (scadenza_offerta);
CREATE INDEX idx_fasi_opportunita_data ON fasi_opportunita (data);
CREATE INDEX idx_attivita_data ON attivita (data);
CREATE INDEX idx_aziende_ragione_sociale ON aziende (ragione_sociale);
CREATE INDEX idx_referenti_telefono ON referenti (telefono);
CREATE INDEX idx_partner_durc_scadenza ON partner (durc_scadenza);
