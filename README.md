# Projekt Cijene

Ovaj repozitorij sadrži izvorni kod za projekt praćenja i usporedbe cijena u hrvatskim trgovačkim lancima. Sustav se sastoji od pozadinskog dijela za prikupljanje i obradu podataka te korisničkog sučelja za pregled i pretraživanje artikala.

## Tehnološki stack

* Backend: Python, FastAPI, PostgreSQL 17
* Crawler: Python s podacima u CSV/ZIP formatu
* Frontend: React 19, TypeScript, TailwindCSS
* Infrastruktura: Docker, Docker Compose

## Arhitektura sustava

Projekt je podijeljen u dvije glavne komponente:

* Backend: Pozadinski sustav razvijen u programskom jeziku Python. Zadužen je za redovito prikupljanje podataka iz različitih trgovina, ETL obradu i pružanje FastAPI sučelja. Baza podataka koja se koristi je PostgreSQL 17.
* Frontend: Korisničko sučelje razvijeno u tehnologiji React 19 uz korištenje TypeScripta. Omogućava korisnicima pretraživanje proizvoda, pregled cijena i usporedbu po lancima i lokacijama.

Detaljni dijagram toka sustava dostupan je u datoteci [mermaid_chart.md](mermaid_chart.md).

## Preduvjeti

* Docker i Docker Compose (za pokretanje cijelog sustava)
* Node.js 18+ i npm (samo za lokalni razvoj Frontenda)

## Brzo pokretanje

```bash
cd Backend
cp .env.docker.example .env
# Uredite .env prema potrebi
docker-compose up -d
```

Napomena: backend koristi jedan predložak varijabli okruženja, `Backend/.env.docker.example`, koji se kopira u `.env`.

API servis bit ce dostupan na `http://localhost:8080`.

## Struktura repozitorija i upute

Za detaljne upute o pokretanju, konfiguraciji i razvoju pojedinog dijela sustava, molimo proučite specifične dokumente unutar pripadajućih direktorija:

* [Backend dokumentacija](Backend/README.md)
* [Frontend dokumentacija](Frontend/README.md)

## Podrzani trgovacki lanci

Sustav trenutno prikuplja podatke iz sljedecih trgovina:
Konzum, Lidl, Plodine, Spar, Tommy, Studenac, Kaufland, Eurospin, Metro, Zabac, Vrutak, Ribola, NTL
