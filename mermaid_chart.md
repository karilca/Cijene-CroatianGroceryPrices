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
  metro[Metro]:::src
  ntl[NTL]:::src
  ribola[Ribola]:::src
  studenac[Studenac]:::src
  tommy[Tommy]:::src
  vrutak[Vrutak]:::src
  zabac[Zabac]:::src
end

%% --- Docker Compose okruzenje ---
subgraph DC[Docker Compose okruzenje]
  direction TB

  subgraph CR[Crawler servis]
    direction TB
    extract["Ekstrakcija podataka po<br/>trgovini"]:::crawl
    norm["Normalizacija i generiranje<br/>CSV/ZIP izlaza"]:::crawl
    extract --> norm
  end

  subgraph ST[Pohrana podataka]
    direction TB
    fs["Datotecni sustav: CSV/ZIP<br/>datoteke"]:::storage
    db[(PostgreSQL 17 baza)]:::db
    redis[(Redis cache)]:::db
  end

  norm --> fs

  subgraph ETL[ETL procesi - CLI]
    direction TB
    uvoz["Uvoz podataka (import)"]:::etl
    ciscenje["Obogacivanje (enrich)"]:::etl
    statistika["Statisticka obrada (stats)"]:::etl
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
    cart["Optimizacija kosarice"]:::api
    auth["Supabase JWT autentifikacija"]:::api
    v1 --> auth
    cart --> auth
  end

  db --> v1
  db --> cart
  redis -.-> cart
  fs --> v0
end

%% --- Scheduler izvan Compose ---
sched{{"Planirano pokretanje<br/>(cron/daily-crawl.sh)"}}:::sched
sched --> CR

%% --- Frontend ---
subgraph FE["Frontend - React/Vite"]
  direction TB
  ui["Korisnicko sucelje"]:::front
  client["API klijent (Supabase Bearer token)"]:::front
  ui --> client
end

%% --- Supabase Auth ---
subgraph SA["Eksterni servisi"]
  direction TB
  supaAuth["Supabase (Autentifikacija)"]:::storage
end

ui -- "Prijava i dohvaćanje tokena" --> supaAuth
auth -. "Dohvaćanje JWKS za validaciju ključa" .-> supaAuth

client -- "REST API pozivi (JWT)" --> API

%% --- Povezivanja: crawler -> trgovine (HTTP zahtjev) ---
extract -- "HTTP zahtjevi" --> konzum
extract -- "HTTP zahtjevi" --> spar
extract -- "HTTP zahtjevi" --> lidl
extract -- "HTTP zahtjevi" --> kaufland
extract -- "HTTP zahtjevi" --> plodine
extract -- "HTTP zahtjevi" --> eurospin
extract -- "HTTP zahtjevi" --> metro
extract -- "HTTP zahtjevi" --> ntl
extract -- "HTTP zahtjevi" --> ribola
extract -- "HTTP zahtjevi" --> studenac
extract -- "HTTP zahtjevi" --> tommy
extract -- "HTTP zahtjevi" --> vrutak
extract -- "HTTP zahtjevi" --> zabac

%% --- Stilovi ---
classDef src fill:#f6b6b6,stroke:#b03a3a,stroke-width:2px,color:#111;
classDef crawl fill:#bfe0ff,stroke:#2b6cb0,stroke-width:2px,color:#111;
classDef storage fill:#e6e6e6,stroke:#666,stroke-width:1.5px,color:#111;
classDef etl fill:#ffe6a6,stroke:#b08900,stroke-width:2px,color:#111;
classDef api fill:#d7f2d7,stroke:#2f855a,stroke-width:2px,color:#111;
classDef front fill:#f3b3c1,stroke:#b03a3a,stroke-width:2px,color:#111;
classDef db fill:#b9e6e6,stroke:#2c7a7b,stroke-width:2px,color:#111;
classDef sched fill:#ffd6cc,stroke:#b45309,stroke-width:2px,color:#111;
