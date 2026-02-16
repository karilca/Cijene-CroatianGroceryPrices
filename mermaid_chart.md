flowchart TB
%% --- Trgovine ---
subgraph SRC[Trgovine]
  direction TB
  konzum[Konzum]:::src
  spar[Spar]:::src
  lidl[Lidl]:::src
  kaufland[Kaufland]:::src
  plodine[Plodine]:::src
  eurospin[Eurospin]:::src
end

%% --- Docker Compose okruženje ---
subgraph DC[Docker Compose okruženje]
  direction TB

  subgraph CR[Crawler servis]
    direction TB
    extract["Ekstrakcija podataka po<br/>trgovini"]:::crawl
    norm["Normalizacija i generiranje<br/>CSV/ZIP izlaza"]:::crawl
    extract --> norm
  end

  subgraph ST[Pohrana podataka]
    direction TB
    fs["Datotečni sustav: CSV/ZIP<br/>datoteke"]:::storage
    db[(PostgreSQL 17 baza)]:::db
  end

  norm --> fs

  subgraph ETL[ETL procesi - CLI]
    direction TB
    uvoz["Uvoz podataka (import)"]:::etl
    ciscenje["Obogaćivanje (enrich)"]:::etl
    statistika["Statistička obrada (stats)"]:::etl
    uvoz --> statistika
  end

  fs --> uvoz
  fs --> ciscenje
  uvoz --> db
  ciscenje --> db
  statistika --> db

  subgraph API["API servis - FastAPI"]
    direction TB
    v0["v0: ZIP arhive"]:::api
    v1["v1: lanci/proizvodi/trgovine"]:::api
    auth["Bearer autentifikacija"]:::api
    v1 --> auth
  end

  db --> v1
  fs --> v0
end

%% --- Scheduler izvan Compose ---
sched{{"Planirano pokretanje<br/>(cron/daily-crawl.sh)"}}:::sched
sched --> CR

%% --- Frontend ---
subgraph FE["Frontend - React/Vite"]
  direction TB
  ui["Korisničko sučelje"]:::front
  client["API klijent (statički Bearer token)"]:::front
  ui --> client
end

client -- "REST API pozivi" --> API

%% --- Povezivanja: crawler -> trgovine (HTTP zahtjev) ---
extract -- "HTTP zahtjevi" --> konzum
extract -- "HTTP zahtjevi" --> spar
extract -- "HTTP zahtjevi" --> lidl
extract -- "HTTP zahtjevi" --> kaufland
extract -- "HTTP zahtjevi" --> plodine
extract -- "HTTP zahtjevi" --> eurospin

%% --- Stilovi ---
classDef src fill:#f6b6b6,stroke:#b03a3a,stroke-width:2px,color:#111;
classDef crawl fill:#bfe0ff,stroke:#2b6cb0,stroke-width:2px,color:#111;
classDef storage fill:#e6e6e6,stroke:#666,stroke-width:1.5px,color:#111;
classDef etl fill:#ffe6a6,stroke:#b08900,stroke-width:2px,color:#111;
classDef api fill:#d7f2d7,stroke:#2f855a,stroke-width:2px,color:#111;
classDef front fill:#f3b3c1,stroke:#b03a3a,stroke-width:2px,color:#111;
classDef db fill:#b9e6e6,stroke:#2c7a7b,stroke-width:2px,color:#111;
classDef sched fill:#ffd6cc,stroke:#b45309,stroke-width:2px,color:#111;