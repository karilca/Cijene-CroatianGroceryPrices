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