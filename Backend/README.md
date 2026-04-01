# Cijene API

Servis za preuzimanje javnih podataka o cijenama proizvoda u trgovačkim lancima u Republici Hrvatskoj.

**Podržani trgovački lanci:** Konzum, Lidl, Plodine, Spar, Tommy, Studenac, Kaufland, Eurospin, Metro, Žabac, Vrutak, Ribola, NTL

Popis trgovačkih lanaca preuzet sa [IamMusavaRibica/cijene.org](https://github.com/IamMusavaRibica/cijene.org) (AGPL).

## Arhitektura

- **Crawler** (`crawler/`) - preuzima podatke s web stranica trgovačkih lanaca
- **API** (`service/`) - FastAPI web servis za pristup podacima
- **Baza podataka** - PostgreSQL 17

## Instalacija (Docker Compose)

```bash
cp .env.docker.example .env
# Uredite .env prema potrebi
```

**Produkcija:**
```bash
docker-compose -f docker-compose.yml up -d
```

**Produkcija + Redis cache profil:**
```bash
docker-compose -f docker-compose.yml --profile cache up -d
```

**Razvoj (s hot reload):**
```bash
docker-compose up -d
```

### Konfiguracija (.env)

- `POSTGRES_PASSWORD` - lozinka baze podataka
- `BASE_URL` - javni API URL
- `CORS_ALLOW_ORIGINS` - dozvoljeni frontend origini za CORS (zarezom odvojeni)
- `DEBUG` - `false` za produkciju
- `TIMEZONE` - `Europe/Zagreb`
- `DB_RETENTION_DAYS` - broj dana price podataka za čuvanje (`0` = bez brisanja)
- `AUDIT_LOG_RETENTION_DAYS` - broj dana čuvanja admin audit log zapisa (default `90`)
- `SEARCH_FTS_WEIGHT` - težina FTS ranka u product pretrazi
- `SEARCH_PREFIX_WEIGHT` - težina prefix podudaranja u product pretrazi
- `SEARCH_TRIGRAM_WEIGHT` - težina trigram podudaranja u product pretrazi
- `SEARCH_TRIGRAM_THRESHOLD_SHORT` - minimalni trigram score za kratke upite
- `SEARCH_TRIGRAM_THRESHOLD_LONG` - minimalni trigram score za duže upite
- `SEARCH_TRIGRAM_LONG_QUERY_LEN` - duljina upita od koje se koristi LONG threshold
- `CART_OPTIMIZE_DEFAULT_MAX_DISTANCE_KM` - zadani maksimalni radijus za optimizer košarice (km)
- `CART_OPTIMIZE_DEFAULT_MAX_STORES` - zadani maksimalni broj trgovina u optimizeru
- `CART_OPTIMIZE_ENUM_STORE_LIMIT` - prag broja kandidatskih trgovina; iznad praga optimizer prelazi na heuristički fallback
- `CART_OPTIMIZE_CACHE_ENABLED` - uključuje/isključuje cache za `/v1/cart/optimize`
- `CART_OPTIMIZE_CACHE_BACKEND` - backend cache-a (`memory`, `redis`, `none`)
- `CART_OPTIMIZE_CACHE_TTL_SECONDS` - trajanje cache unosa u sekundama (default `900`)
- `CART_OPTIMIZE_CACHE_LOCATION_BUCKET_M` - grupiranje korisničke lokacije za cache key u metrima (default `200`)
- `CART_OPTIMIZE_CACHE_VERSION` - verzioniranje cache ključa za siguran invalidate pri promjenama algoritma
- `CART_OPTIMIZE_CACHE_REDIS_URL` - Redis URL kada je backend postavljen na `redis`
- `CART_OPTIMIZE_TUNING_ENABLED` - uključuje dinamičko prilagođavanje težina po mode-u na temelju feedbacka
- `CART_OPTIMIZE_TUNING_LOOKBACK_DAYS` - period (u danima) koji ulazi u izračun acceptance rate-a
- `CART_OPTIMIZE_TUNING_MIN_FEEDBACK_SAMPLES` - minimalni broj feedback zapisa po mode-u prije aktivacije tuninga
- `CART_OPTIMIZE_TUNING_ACCEPTANCE_THRESHOLD` - prag prihvaćanja ispod kojeg se dominantna težina smanjuje
- `CART_OPTIMIZE_TUNING_DELTA` - korak promjene težina (±), default `0.05`
- `CART_OPTIMIZE_TUNING_CACHE_TTL_SECONDS` - TTL cache-a za izračun aktivnih tuning delta vrijednosti
- `GOOGLE_MAPS_API_KEY` - Google Maps API ključ za automatsko geokodiranje trgovina
- `GOOGLE_MAPS_TIMEOUT_SECONDS` - timeout po API pozivu u sekundama
- `GOOGLE_MAPS_REQUEST_DELAY_SECONDS` - pauza između API poziva radi kvota
- `GOOGLE_MAPS_MAX_RETRIES` - broj ponovnih pokušaja za privremene API greške
- `GOOGLE_MAPS_RETRY_BACKOFF_SECONDS` - početni backoff delay za retry
- `GOOGLE_MAPS_LANGUAGE` - jezik rezultata upita (npr. `hr`)
- `GOOGLE_MAPS_REGION` - regionalni bias rezultata (npr. `hr`)
- `GOOGLE_MAPS_COUNTRY_HINT` - dodatni country hint u queryju (npr. `Croatia`)
- `GOOGLE_MAPS_ENABLE_GEOCODING_FALLBACK` - fallback na Geocoding API kada Places ne vrati rezultat
- `SUPABASE_URL` - URL vašeg Supabase projekta (obavezno za `/v1/*`, koristi se za JWKS provjeru tokena)
- `SUPABASE_JWT_SECRET` - opcionalni legacy fallback (stari shared-secret JWT model)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase Secret key (`sb_secret_...`, opcionalno; za admin sync operacije)

## Korištenje

### Crawler

```bash
docker-compose run --rm crawler
```

Crawler opcije: `-l` listanje lanaca, `-d` datum, `-c` odabir lanaca, `-h` pomoć.

```bash
docker-compose run --rm crawler uv run -m crawler.cli.crawl -l
```

Paralelizacija crawlera:

- `-w` / `--workers` definira maksimalan broj trgovačkih lanaca koji se crawlaju istovremeno.
- Efektivni paralelizam je `min(workers, broj_odabranih_lanaca)`.

Primjeri:

```bash
# Paralelno crawlanje svih lanaca (6 worker-a)
docker-compose run --rm crawler uv run -m crawler.cli.crawl /app/data -w 6

# Samo odabrani lanci, 3 paralelna workera
docker-compose run --rm crawler uv run -m crawler.cli.crawl /app/data -c konzum,lidl,spar -w 3
```

### Uvoz i obrada podataka

```bash
# Uvoz podataka
docker-compose exec api uv run -m service.db.import /app/data/YYYY-MM-DD

# Enrichment podataka
docker-compose exec api uv run -m service.db.enrich -s enrichment/stores.csv
docker-compose exec api uv run -m service.db.enrich -p enrichment/products.csv

# Izračun statistika
docker-compose exec api uv run -m service.db.stats YYYY-MM-DD
```

**Opcije uvoza:** `-s` preskače statistike (brže), `-d` debug info.

### Provjera trgovina bez koordinata

Skripta izvozi trgovine koje nemaju `lat` ili `lon` u TXT datoteku.
Sadržaj je CSV-kompatibilan (`id,chain_code,code,type,address,city,zipcode,lat,lon,phone`)
u istom redoslijedu kao `enrichment/stores.csv`, pa podatke možeš lako dopuniti i koristiti dalje.

```bash
# Export u timestamped datoteku (lokalno: ./output/...)
docker compose exec api uv run -m service.db.export_missing_store_coords

# Export u točno određenu datoteku
docker compose exec api uv run -m service.db.export_missing_store_coords -o /app/data/missing_stores.txt
```

Napomena: unutar kontejnera izlaz ide u `/app/data`, što je mapirano na lokalni `./output` direktorij.

### Automatska popuna koordinata, telefona i postanskog broja (Google Maps API)

Skripta pronalazi trgovine bez koordinata u bazi, pokušava dohvatiti `lat/lon`,
telefon i `zipcode` preko Google Places/Geocoding API-ja (telefon i `zipcode`
samo ako su trenutno prazni), te appenda samo nove retke u `enrichment/stores.csv`
(postojeći retci ostaju netaknuti, osim kada je uključen `--fill-existing`).

```bash
# Dry-run (default): ne zapisuje u enrichment/stores.csv
docker compose exec api uv run -m service.db.enrich_missing_store_coords

# Primjena promjena: append samo novih redaka
docker compose exec api uv run -m service.db.enrich_missing_store_coords --apply

# Dopuni postojece retke samo za prazna polja (lat/lon/phone/zipcode)
docker compose exec api uv run -m service.db.enrich_missing_store_coords --fill-existing --apply

# Dopuni postojece retke i odmah primijeni promjene u bazi
docker compose exec api uv run -m service.db.enrich_missing_store_coords --fill-existing --apply --apply-db

# Primjer s limitom i report datotekom
docker compose exec api uv run -m service.db.enrich_missing_store_coords --apply --limit 20 --report /app/data/google_lookup_report.csv

# Opcionalno: nakon appenda odmah pokreni DB enrichment
docker compose exec api uv run -m service.db.enrich_missing_store_coords --apply --apply-db
```

Napomena: `GOOGLE_MAPS_API_KEY` mora biti postavljen u `.env`, a za telefon je
potreban Places Details response za pronađeni `place_id`.

### Automatizirano dnevno prikupljanje (Linux)

Skripta `daily-crawl.sh` automatizira dnevno prikupljanje i uvoz podataka. Pokreće crawler, a zatim uvozi podatke za trenutni datum.

**Postavljanje:**

```bash
# Prilagodite putanju u skripti
nano daily-crawl.sh
# Promijenite "cd /DATA/AppData/cijene-api" na vašu putanju

# Učinite skriptu izvršnom
chmod +x daily-crawl.sh
```

**Cron job (automatsko pokretanje):**

```bash
# Otvorite crontab editor
crontab -e

# Dodajte liniju za pokretanje svaki dan u 9:00
0 9 * * * /putanja/do/cijene-api/daily-crawl.sh >> /var/log/cijene-crawl.log 2>&1
```

### API

Servis dostupan na `http://localhost:8000`

Read endpointi pod `/v1/*` koriste Supabase JWT autentikaciju.
Nakon registracije i prijave u Frontendu nije potreban ručni unos `api_key` u bazu.
Admin sync prema Supabase Auth koristi `SUPABASE_SERVICE_ROLE_KEY` (Secret key).

Feedback endpoint za optimizer:

```bash
POST /v1/cart/optimize/feedback
```

Admin status tuninga i metrike po mode-u:

```bash
GET /v1/admin/cart-optimizer/tuning-status
```

Pretraga trgovina po `city` i `address` je case-insensitive i accent-insensitive
(npr. `Šibenik` = `Sibenik`, te `đ` ≈ `dj`) i ne mijenja originalne vrijednosti
pohranjene u bazi.

### Baza podataka

```bash
# Pristup bazi
docker-compose exec db psql -U cijene_user -d cijene

# Postavi korisnika na admin rolu (role_id=2)
UPDATE users
SET role_id = 2
WHERE id = <USER_ID>;

# Provjera
SELECT id, name, role_id
FROM users
WHERE id = <USER_ID>;

# Backup
docker-compose exec db pg_dump -U cijene_user cijene > backup.sql
```

Napomena: ručno kreiranje `api_key` korisnika više nije potrebno za standardni rad
pretrage proizvoda, lanaca i trgovina kroz `/v1/*`.

### Benchmark optimizera košarice

Za usporedbu exact i heuristic grane optimizatora koristi skriptu:

```bash
docker compose exec api uv run -m service.tools.cart_optimizer_benchmark
```

Korisne opcije:

```bash
docker compose exec api uv run -m service.tools.cart_optimizer_benchmark \
	--scenarios 60 \
	--cart-size 18 \
	--store-count 32 \
	--heuristic-limit 12 \
	--output /app/data/cart_optimizer_benchmark.json
```

Skripta ispisuje P50/P95 latenciju i quality gap (% razlika troška heuristic vs exact),
te fallback rate za heuristički path.

## Održavanje

```bash
docker-compose ps              # Status
docker-compose logs -f api     # Logovi
docker-compose pull && docker-compose up -d --build  # Ažuriranje
docker-compose down            # Zaustavljanje
docker-compose down -v         # Zaustavljanje + brisanje baze
```

## Napomene

**Windows:** Postavite `PYTHONUTF8=1` ili koristite `-X utf8` flag za Python.

**Enrichment podaci:** `enrichment/products.csv` sadrži pročišćene podatke za otprilike 30 000 proizvoda.