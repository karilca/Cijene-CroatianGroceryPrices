# Algoritam optimizacije košarice

Ovaj dokument opisuje kako aplikacija odabire u kojim trgovinama korisnik treba kupiti proizvode iz košarice, s ciljem uštede novca i vremena.

---

## Što algoritam radi

Kad korisnik doda proizvode u košaricu, algoritam prolazi kroz sve obližnje trgovine i pronalazi najpovoljniju kombinaciju — uzimajući u obzir cijene, udaljenost i broj trgovina koje bi korisnik morao posjetiti.

Korisnik može birati između tri načina rada koji određuju što mu je važnije:

| Način rada | Prioritet |
|------------|-----------|
| **Greedy** | Što jeftiniji ukupni trošak, čak i ako to znači više trgovina |
| **Balanced** | Dobar omjer cijene i praktičnosti |
| **Conservative** | Što manje trgovina i što bliže, uz prihvatljivu cijenu |

---

## Pretpostavke

- Svaka fizička lokacija trgovine ima svoje cijene i koordinate
- Udaljenost se računa ravnom linijom (Haversine formula); navigacija po cestama planirana je za kasniju verziju
- Korisnik želi kupiti sve proizvode iz košarice; ako neki nije dostupan, ostatak se i dalje optimizira
- Sve cijene su u eurima
- Zadani polumjer pretrage je 15 km; nitko ne vozi 50 km zbog namirnica
- Maksimalni broj posjećenih trgovina je 5
- Cilj je da odgovor stigne za manje od 500 ms

---

## Kako algoritam funkcionira

### Korak 1 — Učitavanje i filtriranje

Algoritam prvo učita sve cijene za tražene proizvode, pa izračuna udaljenost do svake trgovine. Zatim ukloni:

- Trgovine koje su predaleko (više od 15 km)
- Trgovine koje ne prodaju ni jedan proizvod iz košarice
- Trgovine koje su "lošije" od neke druge — ako je trgovina A bliža i jeftinija od trgovine B za sve proizvode koje nudi, B se uklanja kao suvišna

### Korak 2 — Traženje najboljeg rješenja

Algoritam isprobava sve moguće kombinacije jedne, dvije, tri (itd.) trgovine, sve do zadanog maksimuma. Za svaku kombinaciju provjeri može li pokriti sve proizvode iz košarice. Ako može, za svaki proizvod odabire najjeftiniju dostupnu trgovinu unutar te kombinacije i bilježi rezultat.

Kad se broj filtriranih trgovina poveća iznad 20, egzaktna enumeracija postaje prespora, pa se koristi heuristika: algoritam krene od nekoliko dobrih početnih rješenja (najjeftinije po proizvodu, najbliža pojedinačna trgovina, najbolji parovi) i iterativno ih poboljšava dok nema više napretka.

U API odgovoru se to signalizira kroz `metadata.algorithmUsed = "heuristic_ranked_subset_search"` i warning `HEURISTIC_FALLBACK_USED`.

### Korak 3 — Ocjenjivanje

Kad su sakupljena sva kandidatna rješenja, svako dobiva ocjenu koja kombinira tri faktora:

```
ocjena = (težina troška × normalizirani trošak)
       + (težina udaljenosti × normalizirana udaljenost)
       + (težina broja trgovina × normalizirani broj trgovina)
```

Sve tri vrijednosti se normaliziraju na skalu od 0 do 1 kako bi bile usporedive. Težine ovise o odabranom načinu rada:

| Način rada | Težina troška | Težina udaljenosti | Težina broja trgovina |
|------------|:---:|:---:|:---:|
| Greedy | 0,70 | 0,15 | 0,15 |
| Balanced | 0,40 | 0,30 | 0,30 |
| Conservative | 0,15 | 0,40 | 0,45 |

### Korak 4 — Odabir i odgovor

Vraća se rješenje s najnižom ocjenom za odabrani način rada. Uz glavnu preporuku, odgovor sadrži i alternativna rješenja za ostala dva načina rada, popis nedostupnih proizvoda te informacije o tome koliko je trajao izračun.

---

## Rubni slučajevi

- **Proizvod nije dostupan ni u jednoj obližnjoj trgovini** — dodaje se na popis nedostupnih, ostatak košarice se optimizira normalno, a korisnik dobiva obavijest
- **Korisnikova lokacija nije dostupna** — filtriranje po udaljenosti se isključuje, težina udaljenosti postavlja se na nulu
- **Koordinate trgovine nisu dostupne** — dodjeljuje joj se maksimalna udaljenost kao pesimistična pretpostavka
- **Izjednačeni rezultati** — prednost dobiva rješenje s manje trgovina, zatim bliže, zatim jeftinije
- **Samo jedan proizvod u košarici** — vraća se jednostavno sortiranje trgovina po cijeni, enumeracija nije potrebna

---

## Razrađeni primjer

### Ulazni podaci

**Lokacija korisnika:** centar Zagreba

**Košarica:**

| Proizvod | Količina |
|---------|:---:|
| Mlijeko 1L (Dukat) | 2 |
| Bijeli kruh 500g | 1 |
| Jaja (10 komada) | 1 |
| Pileća prsa 1kg | 1 |
| Maslinovo ulje 1L | 1 |

**Dostupne trgovine s cijenama (EUR):**

| Proizvod | Konzum (2 km) | Lidl (4 km) | Spar (1 km) | Kaufland (6 km) |
|---------|:---:|:---:|:---:|:---:|
| Mlijeko 1L | 1,20 | 0,95 | 1,15 | 0,99 |
| Kruh 500g | 1,50 | 1,29 | 1,69 | 1,35 |
| Jaja 10 kom | 2,49 | 1,99 | 2,39 | 2,19 |
| Pileća prsa 1kg | 7,99 | 6,49 | 8,49 | 6,99 |
| Maslinovo ulje 1L | 5,99 | — | 6,49 | 5,49 |

Maslinovo ulje nije dostupno u Lidlu, pa Lidl sam nije izvedivo rješenje.

### Kandidatna rješenja

| Trgovine | Ukupni trošak | Prosj. udaljenost | Br. trgovina |
|:---------|:---:|:---:|:---:|
| Spar | €21,36 | 1,0 km | 1 |
| Konzum | €20,37 | 2,0 km | 1 |
| Kaufland | €18,00 | 6,0 km | 1 |
| Konzum + Spar | €20,17 | 1,5 km | 2 |
| Lidl + Konzum | €17,66 | 3,0 km | 2 |
| Lidl + Spar | €18,16 | 2,5 km | 2 |
| **Lidl + Kaufland** | **€17,16** | **5,0 km** | **2** |

### Rezultati po načinu rada

| Način rada | Preporuka | Trošak | Udaljenost | Br. trgovina |
|------------|:---|:---:|:---:|:---:|
| **Greedy** | Lidl + Kaufland | €17,16 | 5,0 km | 2 |
| **Balanced** | Konzum | €20,37 | 2,0 km | 1 |
| **Conservative** | Spar | €21,36 | 1,0 km | 1 |

Greedy štedi €4,20 u usporedbi s Conservative (19,7% jeftinije), ali korisnik mora posjetiti dvije trgovine udaljene prosječno 5 km. Balanced bira Konzum jer je €3,21 jeftiniji od Spara, a samo 1 km dalje — dobar kompromis. Conservative bira Spar jer je najbliži, bez obzira na nešto višu cijenu.

---

## Plan implementacije

### Tjedan 1–2 — Baza podataka

- Tablice `products`, `stores`, `prices` u PostgreSQL-u
- Scraper za hrvatske lance: Konzum, Lidl, Spar, Kaufland, Plodine, Studenac, Tommy
- Endpoint koji vraća cijene filtriranih proizvoda po lokaciji

### Tjedan 3 — Osnovna verzija algoritma

- Implementacija Haversine funkcije, filtriranja, enumeracije i normalizacije
- Sva tri načina rada s hardkodiranim težinama
- Obrada rubnih slučajeva (nedostupni proizvodi, nema lokacije, izjednačenost)

### Tjedan 4 — Testiranje

- Jedinični testovi koji reproduciraju gornji primjer s točno očekivanim rezultatima
- Provjera da Greedy uvijek vraća trošak manji ili jednak Balanced i Conservative
- Test opterećenja: 50 istovremenih zahtjeva, P95 ispod 300 ms

### Tjedan 5 — Heuristika i infrastruktura

- Heuristički pristup kao pričuva za slučaj kada je broj obližnjih trgovina veći od 20
- Predmemoriranje odgovora (TTL 15 min; location bucket ~200 m; backend `memory` ili `redis`)
- Strukturirano zapisivanje: `algorithmUsed`, `computationTimeMs`, `storesConsidered`, `candidatesEvaluated`, `heuristicFallback`, `cacheHit`

### Tjedan 6+ — Praćenje i podešavanje

- Praćenje koje načine rada korisnici biraju i prihvaćaju li preporuku (`cart_optimize_runs`, `cart_optimize_feedback`)
- Feedback API: `POST /v1/cart/optimize/feedback` (korisno / nije korisno)
- Ako je stopa prihvaćanja nekog moda ispod 25%, dominantna težina moda se smanjuje za `0.05`; iznad `75%` povećava se za `0.05`
- Evaluacija dodavanja procijenjene udaljenosti vožnje umjesto ravne linije

---

*Ovaj dizajn pokriva tipičan slučaj (do 20 obližnjih trgovina) egzaktnom metodom koja garantira optimalan rezultat, a za gušće sredine postoji heuristička pričuva koja daje blizu-optimalno rješenje za manje od 5 ms.*
