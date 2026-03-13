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

**Razvoj (s hot reload):**
```bash
docker-compose up -d
```

### Konfiguracija (.env)

- `POSTGRES_PASSWORD` - lozinka baze podataka
- `BASE_URL` - javni API URL
- `DEBUG` - `false` za produkciju
- `TIMEZONE` - `Europe/Zagreb`
- `DB_RETENTION_DAYS` - broj dana price podataka za čuvanje (`0` = bez brisanja)
- `SEARCH_FTS_WEIGHT` - težina FTS ranka u product pretrazi
- `SEARCH_PREFIX_WEIGHT` - težina prefix podudaranja u product pretrazi
- `SEARCH_TRIGRAM_WEIGHT` - težina trigram podudaranja u product pretrazi
- `SEARCH_TRIGRAM_THRESHOLD_SHORT` - minimalni trigram score za kratke upite
- `SEARCH_TRIGRAM_THRESHOLD_LONG` - minimalni trigram score za duže upite
- `SEARCH_TRIGRAM_LONG_QUERY_LEN` - duljina upita od koje se koristi LONG threshold
- `GOOGLE_MAPS_API_KEY` - Google Maps API ključ za automatsko geokodiranje trgovina
- `GOOGLE_MAPS_TIMEOUT_SECONDS` - timeout po API pozivu u sekundama
- `GOOGLE_MAPS_REQUEST_DELAY_SECONDS` - pauza između API poziva radi kvota
- `GOOGLE_MAPS_MAX_RETRIES` - broj ponovnih pokušaja za privremene API greške
- `GOOGLE_MAPS_RETRY_BACKOFF_SECONDS` - početni backoff delay za retry
- `GOOGLE_MAPS_LANGUAGE` - jezik rezultata upita (npr. `hr`)
- `GOOGLE_MAPS_REGION` - regionalni bias rezultata (npr. `hr`)
- `GOOGLE_MAPS_COUNTRY_HINT` - dodatni country hint u queryju (npr. `Croatia`)
- `GOOGLE_MAPS_ENABLE_GEOCODING_FALLBACK` - fallback na Geocoding API kada Places ne vrati rezultat

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

Pretraga trgovina po `city` i `address` je case-insensitive i accent-insensitive
(npr. `Šibenik` = `Sibenik`, te `đ` ≈ `dj`) i ne mijenja originalne vrijednosti
pohranjene u bazi.

### Baza podataka

```bash
# Pristup bazi
docker-compose exec db psql -U cijene_user -d cijene

# Kreiranje korisnika (za autentificirane endpointe)
INSERT INTO users (name, api_key, is_active) VALUES ('Ime', 'secret-key', TRUE);

# Backup
docker-compose exec db pg_dump -U cijene_user cijene > backup.sql
```

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