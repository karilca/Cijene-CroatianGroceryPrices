# Algoritam optimizacije košarice

Ovaj dokument opisuje kako funkcionira algoritam koji korisniku preporučuje u kojim trgovinama da kupi proizvode iz košarice uz minimalne troškove i udaljenost.

---

## Pretpostavke

Prije opisa algoritma, važno je naglasiti ključne pretpostavke na kojima se temelji cijeli sustav:

| Broj | Pretpostavka | Razlog |
|------|-------------|--------|
| 1 | Svaka fizička lokacija trgovine ima vlastite cijene i koordinate | Podržava i lance s jedinstvenim cijenama i lokacije s individualnim cijenama |
| 2 | Cijene su po jedinici; ukupno = cijena × količina | Standardno prehrambeno cijenovništvo |
| 3 | Udaljenost se računa ravnom linijom (Haversine formula) | Dobar pokazatelj; udaljenost vožnje je planirana za verziju 2 |
| 4 | Korisnik želi kupiti sve proizvode | Ako nešto nije dostupno, ostatak košarice se i dalje optimizira |
| 5 | Nema ograničenja zaliha u trgovinama | Pretpostavljamo da prodavaonica neće ostati bez robe |
| 6 | Cilj brzine odgovora: manje od 500 ms | Uobičajeni zahtjev za mobilne aplikacije |
| 7 | Tipičan unos: 5–30 proizvoda, 10–100 obližnjih trgovina | Realistično za hrvatski grad |
| 8 | Sve cijene su u EUR | Hrvatska je uvela EUR u siječnju 2023; nema potrebe za pretvorbom valuta |
| 9 | Postoji konfigurabilni maksimalni polumjer pretraživanja (zadano: 15 km) | Smanjuje prostor pretrage; nitko ne vozi 50 km zbog namirnica |
| 10 | Maksimalni broj posjećenih trgovina je 5 | Praktično ograničenje za svakodnevnu kupnju |

---

## 1. Definicija problema

### 1.1 Ulazni podaci

Algoritam prima sljedeće ulazne podatke:

- Popis proizvoda u košarici s količinama
- GPS koordinate korisnika
- Popis obližnjih trgovina s cijenama
- Odabrani način rada (greedy, balanced, conservative)
- Maksimalna udaljenost i maksimalni broj trgovina

Za svaki par (proizvod, trgovina) ili postoji cijena, ili je proizvod nedostupan u toj trgovini.

### 1.2 Što algoritam odlučuje

Algoritam dodjeljuje svakom proizvodu iz košarice točno jednu trgovinu u kojoj će ga korisnik kupiti. Ova dodjela mora zadovoljiti sve uvjete i minimizirati zadanu funkciju cilja.

### 1.3 Izvedene veličine

Na temelju dodjele računaju se tri ključne veličine:

- **Ukupni trošak košarice** — suma cijena svih proizvoda pomnoženih s količinama
- **Prosječna udaljenost do posjećenih trgovina** — prosječna Haversine udaljenost
- **Broj posjećenih trgovina** — koliko različitih lokacija korisnik mora posjetiti

### 1.4 Ograničenja

Svaka dodjela mora zadovoljiti ova ograničenja:

- Proizvod se može dodijeliti samo onoj trgovini koja ga ima na zalihi
- Svaki dostupan proizvod mora biti dodijeljen nekoj trgovini
- Sve odabrane trgovine moraju biti unutar zadanog polumjera
- Ukupni broj posjećenih trgovina ne smije prelaziti postavljeni maksimum

### 1.5 Funkcija cilja

Algoritam minimizira složenu ocjenu koja kombinira sva tri kriterija:

```
ocjena = w_c × normaliziraniTrošak + w_d × normaliziranaUdaljenost + w_k × normaliziraniStores
```

Vrijednosti `w_c`, `w_d` i `w_k` su težine koje ovise o odabranom načinu rada i uvijek zbrajaju na 1,0. Sve tri veličine su normalizirane na raspon [0, 1] kako bi bile međusobno usporedive.

---

## 2. Klasifikacija problema

### 2.1 Vrsta problema

Optimizacija košarice spada u kategoriju kombinatoričke optimizacije. Konkretno, kombinira elemente nekoliko klasičnih problema:

| Klasični problem | Veza s košaricom |
|-----------------|-----------------|
| Uncapacitated Facility Location | Trgovine su "objekti"; "otvoriti objekt" znači posjetiti trgovinu |
| Generalized Assignment Problem | Dodjela proizvoda trgovinama s različitim cijenama po kombinaciji |
| Weighted Set Cover | Pronalaženje minimalnog skupa trgovina koji pokriva sve proizvode |
| Višekriterijska optimizacija | Tri suprotstavljena cilja kombinirana vaganjem |

### 2.2 Analiza složenosti

Minimizacija broja posjećenih trgovina sama po sebi svodi se na problem Minimum Set Cover koji je NP-težak u općem slučaju. Međutim, uz ograničenje maksimalnog broja trgovina (zadano 5) i uz agresivno filtriranje po udaljenosti, prostor pretrage postaje praktično rješiv.

### 2.3 Ključna opservacija koja olakšava rješenje

Ako je skup posjećenih trgovina fiksiran, optimalna dodjela svakog pojedinog proizvoda je trivijalna — svaki proizvod se kupuje u najjeftinijoj dostupnoj trgovini unutar tog skupa. Dakle, problem se svodi na **pronalaženje optimalnog podskupa trgovina**, a ne na optimiziranje dodjele svakog pojedinog proizvoda zasebno.

---

## 3. Pristupi rješavanju

### 3.1 Egzaktni pristup: enumeracija podskupova

**Kada se koristi:** kada je broj filtriranih trgovina manji ili jednak 20 (pokriva oko 99% realnih unosa).

**Princip rada:**

Algoritam prolazi kroz sve moguće kombinacije od 1 do `maxStores` trgovina. Za svaku kombinaciju provjerava je li skup "izvediv" — može li pokriti sve proizvode. Ako jest, za svaki proizvod odabire najjeftiniju dostupnu trgovinu unutar tog skupa i bilježi rezultat kao kandidatno rješenje.

```
EGZAKTNA-ENUMERACIJA(proizvodi, trgovine, mod):
  kandidati ← prazan popis

  za k od 1 do maxStores:
    za svaki podskup T od k trgovina:
      ako T ne pokriva sve proizvode: preskoči

      dodjela ← {}
      ukupniTrošak ← 0
      posjećene ← prazan skup

      za svaki proizvod p:
        najboljaTrgovina ← najjeftinija trgovina za p unutar T
        dodjela[p] ← najboljaTrgovina
        ukupniTrošak ← ukupniTrošak + cijena × količina
        posjećene ← posjećene + {najboljaTrgovina}

      prosječnaUdaljenost ← prosjek udaljenosti posjećenih trgovina
      kandidati.dodaj({dodjela, ukupniTrošak, prosječnaUdaljenost, |posjećene|})

  NORMALIZIRAJ-I-OCIJENI(kandidati, mod)
  vrati kandidata s najnižom ocjenom
```

**Vremenski zahtjevi** za tipične veličine unosa:

| Broj trgovina | Max posjeta | Evaluiranih podskupova | Procijenjeno vrijeme |
|:---:|:---:|---:|:---:|
| 10 | 5 | 637 | < 1 ms |
| 15 | 5 | 4 944 | ~2 ms |
| 20 | 5 | 21 700 | ~5 ms |
| 20 | 3 | 1 350 | < 1 ms |

**Optimizacije smanjivanjem broja kandidatnih trgovina:**

Prije enumeracije primjenjuju se tri koraka filtriranja:

1. Uklanjaju se sve trgovine izvan zadanog polumjera
2. Uklanjaju se sve trgovine koje ne nude ni jedan proizvod iz košarice
3. Primjenjuje se "dominance pruning" — ako je trgovina A bliža korisniku i jeftinija ili jednako jeftina za svaki proizvod koji nudi kao i trgovina B, tada se B uklanja kao suvišna

### 3.2 Heuristički pristup: pohlepna konstrukcija i lokalno pretraživanje

**Kada se koristi:** kada je broj filtriranih trgovina veći od 20, ili kao brzi put kada je latencija kritična.

Heuristika radi u četiri faze:

**Faza 1 — Inicijalna rješenja (seed):**
- Rješenje A: svaki proizvod se kupuje u najjeftinijoj dostupnoj trgovini (minimizira trošak, ignorira udobnost)
- Rješenje B: za svaku pojedinačnu trgovinu koja pokriva cijelu košaricu, generira se rješenje s jednom trgovinom
- Rješenje C: za svaki par od prvih 10 najkonkurentnijih trgovina, generira se rješenje s dvije trgovine

**Faza 2 — Konsolidacija:**
Za svako početno rješenje pokušava se ukloniti jedna od posjećenih trgovina tako da se njeni proizvodi prenesu na ostale. Ako je to moguće i poboljšava ocjenu, promjena se prihvaća. Ponavlja se dok god ima poboljšanja.

**Faza 3 — Lokalno pretraživanje:**
Za svaki proizvod u dodjeli, isprobavaju se sve alternativne trgovine. Ako premještanje proizvoda u drugu trgovinu poboljšava ocjenu, promjena se prihvaća. Ponavlja se dok god ima poboljšanja.

**Faza 4 — Odabir najboljeg:**
Sva generirana rješenja se normaliziraju i ocijenjuju. Vraća se ono s najnižom ocjenom.

**Vremenski zahtjev:** za 15 kandidata, 5 iteracija, 30 proizvoda i 50 trgovina — oko 112 500 operacija, što je manje od 5 ms.

### 3.3 Usporedba pristupa

| Kriterij | Egzaktni | Heuristički |
|---------|:---:|:---:|
| Garancija optimalnosti | Globalni optimum | Lokalni optimum (u praksi blizu optimalnog) |
| Latencija (15 trgovina, 30 proizvoda) | ~2 ms | ~3 ms |
| Latencija (50 trgovina, 30 proizvoda) | Neizvedivo | ~5 ms |
| Složenost implementacije | Srednja | Viša |
| Ovisnost o filtriranju | Visoka (treba ≤ 20 trgovina) | Niska |

**Preporučena hibridna strategija:**

```
ako broj filtriranih trgovina ≤ 20:
    koristi egzaktnu enumeraciju     // garantira optimalnost
inače:
    koristi heuristički pristup      // blizu-optimalno, vremenski ograničeno
```

---

## 4. Načini rada

### 4.1 Definicija težina po načinu rada

Svaki način rada odražava drugačiji prioritet korisnika. Težine određuju koliko svaki od tri kriterija (trošak, udaljenost, broj trgovina) utječe na konačnu ocjenu:

| Način rada | Težina troška | Težina udaljenosti | Težina broja trgovina | Namjera |
|------------|:---:|:---:|:---:|:---|
| **Greedy** | 0,70 | 0,15 | 0,15 | "Uštedi mi što više novca, čak i ako moram obilaziti više trgovina." |
| **Balanced** | 0,40 | 0,30 | 0,30 | "Dobra cijena, ali neka bude i praktično." |
| **Conservative** | 0,15 | 0,40 | 0,45 | "Jedna obližnja trgovina — ne treba mi daleko, ali ni preplaćivati." |

### 4.2 Normalizacija

Sve tri metrike normaliziraju se na raspon [0, 1] metodom min-max, primijenjenom na sve kandidatne dodjele koje su evaluirane za taj zahtjev:

```
normaliziraniTrošak(a) = (trošak(a) - minTrošak) / (maxTrošak - minTrošak)
normaliziranaUdaljenost(a) = (udaljenost(a) - minUdaljenost) / (maxUdaljenost - minUdaljenost)
normaliziraniStores(a) = (stores(a) - minStores) / (maxStores - minStores)
```

Ako su svi kandidati jednaki za neku metriku (max = min), normalizirana vrijednost postavlja se na 0 za sve — ta metrika tada ne utječe na rangiranje, što je ispravno ponašanje.

**Zašto min-max normalizacija, a ne alternative:**

| Alternativa | Problem |
|------------|---------|
| Z-score | Može davati negativne vrijednosti; težine postaju neintuitivne |
| Fiksna referenca (npr. dijeli s 10 km) | Zahtijeva ručno podešavanje po gradu ili državi |
| Rang-bazirana | Gubi informaciju o veličini razlike (€0,50 razlika = €5 razlika) |
| Min-max po kandidatima | Prilagođava se stvarnim podacima; sve vrijednosti su u [0, 1]; čuva relativne razmjere |

### 4.3 Podešavanje težina

| Signal iz korisničkog ponašanja | Preporučena prilagodba |
|--------------------------------|----------------------|
| Korisnici u Greedy načinu odbijaju preporuke s više trgovina | Povećaj težinu broja trgovina s 0,15 na 0,20–0,25 |
| Korisnici u Conservative načinu prelaze na Greedy | Smanji težinu troška s 0,15 (oni ipak mare za cijenu) |
| Gradski korisnici se žale na udaljenost | Povećaj težinu udaljenosti globalno za 0,05–0,10 |
| Korisnici iz ruralnih područja ne mogu koristiti rezultate | Smanji težinu udaljenosti, povećaj težinu troška |

---

## 5. Potpuni pseudokod

### 5.1 Strukture podataka

```
TIPOVI:

  Proizvod:
    id:       String
    naziv:    String
    količina: Integer ≥ 1

  Trgovina:
    id:         String
    naziv:      String
    lanac:      String
    lat:        Float
    lon:        Float
    udaljenost: Float    // km od korisnika, izračunato

  UnosCijene:
    idProizvoda: String
    idTrgovine:  String
    jedCijena:   Float

  Dodjela:
    mapiranje:       Map<IdProizvoda, IdTrgovine>
    ukupniTrošak:    Float
    prosječnaUdalj:  Float
    brojTrgovina:    Integer
    posjećeneTrg:    Set<IdTrgovine>

  OcijenjenaDodjela extends Dodjela:
    normTrošak:   Float    // [0, 1]
    normUdalj:    Float    // [0, 1]
    normTrgovine: Float    // [0, 1]
    složenaOcjena: Float   // vagana suma

  RezultatOptimizacije:
    preporučeno:  OcijenjenaDodjela
    alternative:  List<OcijenjenaDodjela>    // po ostalim načinima rada
    nedostupno:   List<Proizvod>
    metapodaci:   {algoritmKorišten, vrijemeMs, evaluiraneTragovine}
```

### 5.2 Cjelokupni tok

```
FUNKCIJA OptimiziraiKosaricu(proizvodi, lokacijaKorisnika, mod, maxKm=15, maxTrg=5):

  // KORAK 1: UČITAVANJE PODATAKA
  matricaCijena ← UČITAJ-MATRICU-CIJENA(proizvodi)
  sveTrgovine   ← UČITAJ-TRGOVINE-S-CIJENAMA(matricaCijena)

  za svaku t u sveTrgovine:
    t.udaljenost ← HAVERSINE(lokacijaKorisnika, (t.lat, t.lon))

  // KORAK 2: FILTRIRANJE I PROVJERA IZVEDIVOSTI
  bližnjeTrg ← {t | t.udaljenost ≤ maxKm}
  relevantneTrg ← {t ∈ bližnjeTrg | postoji p: cijena(p, t) dostupna}
  relevantneTrg ← UKLONI-DOMINIRANE(relevantneTrg, proizvodi, matricaCijena)

  nedostupni ← []
  dostupniProizvodi ← []
  za svaki p u proizvodi:
    ako nema t u relevantneTrg s cijenom za p:
      nedostupni.dodaj(p)
    inače:
      dostupniProizvodi.dodaj(p)

  ako je dostupniProizvodi prazan:
    vrati GREŠKA("Nema dostupnih proizvoda u obližnjim trgovinama")

  // KORAK 3: OPTIMIZACIJA
  m ← broj relevantneTrg

  ako m ≤ 20:
    kandidati ← EGZAKTNA-ENUMERACIJA(dostupniProizvodi, relevantneTrg, matricaCijena, maxTrg)
  inače:
    kandidati ← HEURISTIČKA-OPTIMIZACIJA(dostupniProizvodi, relevantneTrg, matricaCijena, mod, maxTrg)

  // KORAK 4: NORMALIZACIJA I OCJENJIVANJE
  za svaki mod_i u {greedy, balanced, conservative}:
    tezine ← DOHVATI-TEZINE(mod_i)
    za svaki kandidat k u kandidati:
      k.ocjena[mod_i] ← tezine.wc × NORM(k.ukupniTrošak, minTrošak, maxTrošak)
                       + tezine.wd × NORM(k.prosječnaUdalj, minUdalj, maxUdalj)
                       + tezine.wk × NORM(k.brojTrgovina, minTrg, maxTrg)

  // KORAK 5: ODABIR I ODGOVOR
  preporučeno ← kandidat s najnižom k.ocjena[mod]
  alternative ← {mod_i ≠ mod → kandidat s najnižom k.ocjena[mod_i]}

  vrati RezultatOptimizacije {preporučeno, alternative, nedostupni, metapodaci}


FUNKCIJA HAVERSINE(lok1, lok2):
  R ← 6371.0                          // polumjer Zemlje u km
  φ1 ← lok1.lat × π / 180
  φ2 ← lok2.lat × π / 180
  Δφ ← (lok2.lat - lok1.lat) × π / 180
  Δλ ← (lok2.lon - lok1.lon) × π / 180
  a ← sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
  vrati R × 2 × atan2(√a, √(1−a))


FUNKCIJA DOHVATI-TEZINE(mod):
  prema mod:
    "greedy":       vrati {wc: 0.70, wd: 0.15, wk: 0.15}
    "balanced":     vrati {wc: 0.40, wd: 0.30, wk: 0.30}
    "conservative": vrati {wc: 0.15, wd: 0.40, wk: 0.45}


FUNKCIJA SIGURNA-NORMALIZACIJA(vrijednost, min, max):
  ako max = min: vrati 0.0
  vrati (vrijednost - min) / (max - min)
```

### 5.3 Rubni slučajevi

```
RUBNI SLUČAJEVI:

1. Proizvod nedostupan u svim obližnjim trgovinama:
   → Dodaje se na popis "nedostupno"
   → Ostatak košarice se optimizira normalno
   → Odgovor sadrži oznaku "djelomično_ispunjeno: true"
   → Korisnik vidi poruku npr. "Maslinovo ulje nije dostupno unutar 15 km"

2. Niti jedna pojedinačna trgovina ne pokriva cijelu košaricu:
   → Normalan rad; algoritam prirodno odabire rješenja s više trgovina
   → Ako ni kombinacija SVIH trgovina ne pokriva sve: tretira kao slučaj 1

3. Korisnikove koordinate nisu dostupne:
   → Težina udaljenosti postavlja se na 0,0; ostatak se proporcionalno raspodjeljuje
   → Filtriranje po udaljenosti se isključuje (koriste se sve trgovine u bazi)
   → Odgovor sadrži oznaku "optimizacija_udaljenosti_nedostupna: true"

4. Koordinate trgovine nisu dostupne:
   → Takva trgovina se isključuje iz izračuna udaljenosti
   → Njoj se dodjeljuje udaljenost jednaka maxKm (pesimistična pretpostavka)
   → Označava se kao "procjenjena_udaljenost: true"

5. Jednaki složeni rezultati (izjednačenost):
   → Leksikografski redoslijed razrješavanja:
     1. Manji broj trgovina
     2. Manja prosječna udaljenost
     3. Manji ukupni trošak
     4. Deterministično sortiranje po ID-u trgovine (za reproducibilnost)

6. Samo jedan proizvod u košarici:
   → Poseban slučaj: razvrstaj trgovine po cijeni, filtriraj po udaljenosti
   → Vrati najjeftiniju dostupnu trgovinu unutar maxKm
   → Enumeracija podskupova nije potrebna

7. Svi proizvodi dostupni u točno jednoj jedinstvenoj kombinaciji:
   → Postoji samo jedna izvediva dodjela; vrati je
   → Svi načini rada daju identičan rezultat
```

### 5.4 Vremenska složenost po fazama

| Faza | Složenost | Tipično vrijeme |
|------|----------|:--------------:|
| Učitavanje podataka | O(n × m) | 10–50 ms (baza) |
| Računanje udaljenosti | O(m) | < 1 ms |
| Filtriranje i dominancija | O(m² × n) | < 1 ms |
| Egzaktna enumeracija | O(C(m', maxTrg) × n) | 1–5 ms |
| Heuristika (pričuva) | O(c × I × n × m') | 2–10 ms |
| Normalizacija i ocjenjivanje | O(broj kandidata) | < 1 ms |
| **Ukupno** | | **15–70 ms** |

---

## 6. Razrađeni primjer

### 6.1 Ulazni podaci

**Lokacija korisnika:** centar Zagreba (45.8150°S, 15.9819°I)

**Košarica — 5 proizvoda:**

| Proizvod | Količina |
|---------|:-------:|
| Mlijeko 1L (Dukat) | 2 |
| Bijeli kruh 500g | 1 |
| Jaja (10 komada) | 1 |
| Pileća prsa 1kg | 1 |
| Maslinovo ulje 1L | 1 |

**4 obližnje trgovine s cijenama (EUR):**

| Proizvod | A: Konzum (2 km) | B: Lidl (4 km) | C: Spar (1 km) | D: Kaufland (6 km) |
|---------|:---:|:---:|:---:|:---:|
| Mlijeko 1L | 1,20 | 0,95 | 1,15 | 0,99 |
| Kruh 500g | 1,50 | 1,29 | 1,69 | 1,35 |
| Jaja 10 kom | 2,49 | 1,99 | 2,39 | 2,19 |
| Pileća prsa 1kg | 7,99 | 6,49 | 8,49 | 6,99 |
| Maslinovo ulje 1L | 5,99 | — | 6,49 | 5,49 |

Maslinovo ulje **nije dostupno** u Lidlu (trgovina B).

### 6.2 Enumeracija rješenja

Lidl sam nije izvediv jer ne nudi maslinovo ulje. Svi ostali podskupovi od 1 i 2 trgovine se evaluiraju. Nakon de-duplikacije dobivamo **7 izvedivnih dodjela:**

| Br. | Posjećene trgovine | Ukupni trošak | Prosj. udaljenost | Br. trgovina |
|:--:|:---|:---:|:---:|:---:|
| 1 | Spar | €21,36 | 1,0 km | 1 |
| 2 | Konzum | €20,37 | 2,0 km | 1 |
| 3 | Kaufland | €18,00 | 6,0 km | 1 |
| 4 | Konzum + Spar | €20,17 | 1,5 km | 2 |
| 5 | Lidl + Konzum | €17,66 | 3,0 km | 2 |
| 6 | Lidl + Spar | €18,16 | 2,5 km | 2 |
| 7 | Lidl + Kaufland | €17,16 | 5,0 km | 2 |

**Detaljan trošak za rješenje br. 7 (najjeftinije):**

| Proizvod | Trgovina | Cijena/kom | Kom | Stavka |
|---------|---------|:---:|:---:|:---:|
| Mlijeko 1L | Lidl | €0,95 | 2 | €1,90 |
| Kruh 500g | Lidl | €1,29 | 1 | €1,29 |
| Jaja 10 kom | Lidl | €1,99 | 1 | €1,99 |
| Pileća prsa 1kg | Lidl | €6,49 | 1 | €6,49 |
| Maslinovo ulje 1L | Kaufland | €5,49 | 1 | €5,49 |
| | | | **Ukupno** | **€17,16** |

### 6.3 Normalizacija

**Rasponi po svim 7 rješenjima:**

| Metrika | Minimum | Maximum | Raspon |
|--------|:---:|:---:|:---:|
| Trošak | €17,16 | €21,36 | €4,20 |
| Prosj. udaljenost | 1,0 km | 6,0 km | 5,0 km |
| Broj trgovina | 1 | 2 | 1 |

**Normalizirane vrijednosti (niže = bolje):**

| Br. | Trgovine | Norm. trošak | Norm. udaljenost | Norm. trgovine |
|:--:|:---|:---:|:---:|:---:|
| 1 | {Spar} | 1,000 | 0,000 | 0,000 |
| 2 | {Konzum} | 0,764 | 0,200 | 0,000 |
| 3 | {Kaufland} | 0,200 | 1,000 | 0,000 |
| 4 | {Konzum, Spar} | 0,717 | 0,100 | 1,000 |
| 5 | {Lidl, Konzum} | 0,119 | 0,400 | 1,000 |
| 6 | {Lidl, Spar} | 0,238 | 0,300 | 1,000 |
| 7 | {Lidl, Kaufland} | 0,000 | 0,800 | 1,000 |

### 6.4 Ocjene po načinima rada

**Greedy** (wc=0,70, wd=0,15, wk=0,15):

| Br. | Trgovine | Ocjena |
|:--:|:---|:---:|
| 1 | {Spar} | 0,700 |
| 2 | {Konzum} | 0,565 |
| 3 | {Kaufland} | 0,290 |
| 4 | {Konzum, Spar} | 0,667 |
| 5 | {Lidl, Konzum} | 0,293 |
| 6 | {Lidl, Spar} | 0,362 |
| **7** | **{Lidl, Kaufland}** | **0,270 ✓** |

**Balanced** (wc=0,40, wd=0,30, wk=0,30):

| Br. | Trgovine | Ocjena |
|:--:|:---|:---:|
| 1 | {Spar} | 0,400 |
| **2** | **{Konzum}** | **0,366 ✓** |
| 3 | {Kaufland} | 0,380 |
| 4 | {Konzum, Spar} | 0,617 |
| 5 | {Lidl, Konzum} | 0,468 |
| 6 | {Lidl, Spar} | 0,485 |
| 7 | {Lidl, Kaufland} | 0,540 |

**Conservative** (wc=0,15, wd=0,40, wk=0,45):

| Br. | Trgovine | Ocjena |
|:--:|:---|:---:|
| **1** | **{Spar}** | **0,150 ✓** |
| 2 | {Konzum} | 0,195 |
| 3 | {Kaufland} | 0,430 |
| 4 | {Konzum, Spar} | 0,598 |
| 5 | {Lidl, Konzum} | 0,628 |
| 6 | {Lidl, Spar} | 0,606 |
| 7 | {Lidl, Kaufland} | 0,770 |

### 6.5 Interpretacija rezultata

| Način rada | Pobjednik | Ukupni trošak | Br. trgovina | Prosj. udaljenost | Zašto |
|------------|:---|:---:|:---:|:---:|:---|
| **Greedy** | Lidl + Kaufland | **€17,16** | 2 | 5,0 km | Najjeftinija kombinacija; vrijedi posjetiti 2 trgovine |
| **Balanced** | Konzum (samo) | €20,37 | **1** | **2,0 km** | Jedna umjereno jeftina bliska trgovina; najbolji kompromis |
| **Conservative** | Spar (samo) | €21,36 | **1** | **1,0 km** | Najbliža trgovina; prihvatljivo platiti €4,20 više radi maksimalne praktičnosti |

Greedy štedi €4,20 (19,7%) u usporedbi s Conservative, ali zahtijeva posjet dvjema trgovinama s prosječnom udaljenošću od 5 km. Balanced pronalazi srednje rješenje — Konzum na 2 km je €3,21 jeftiniji od Spara i samo 1 km dalje. Conservative bira fizički najbližu trgovinu jer težina udaljenosti dominira nad cijenom.

---

## 7. Produkcijsko okruženje

### 7.1 API ugovor

**Zahtjev:**

```json
POST /api/v1/cart/optimize

{
  "products": [
    { "id": "milk-1l-dukat",      "quantity": 2 },
    { "id": "bread-white-500g",   "quantity": 1 },
    { "id": "eggs-10-free-range", "quantity": 1 },
    { "id": "chicken-breast-1kg", "quantity": 1 },
    { "id": "olive-oil-1l",       "quantity": 1 }
  ],
  "userLocation": {
    "latitude":  45.8150,
    "longitude": 15.9819
  },
  "mode": "balanced",
  "options": {
    "maxDistanceKm": 15,
    "maxStores": 5
  }
}
```

**Odgovor:**

```json
{
  "recommendation": {
    "mode": "balanced",
    "totalCost": 20.37,
    "currency": "EUR",
    "storesVisited": 1,
    "averageDistanceKm": 2.0,
    "score": 0.366,
    "assignments": [
      {
        "store": {
          "id": "konzum-vukovarska-58",
          "name": "Konzum",
          "address": "Vukovarska 58, Zagreb",
          "chain": "Konzum",
          "latitude": 45.8055,
          "longitude": 15.9750,
          "distanceKm": 2.0
        },
        "items": [
          {
            "productId": "milk-1l-dukat",
            "productName": "Mlijeko Dukat 1L",
            "quantity": 2,
            "unitPrice": 1.20,
            "lineTotal": 2.40
          }
        ],
        "subtotal": 20.37
      }
    ],
    "unavailableProducts": [],
    "savingsVsCheapestSingleStore": {
      "baselineStore": "Kaufland",
      "baselineCost": 18.00,
      "savings": -2.37,
      "note": "Balanced način rada žrtvovao je €2,37 za 4 km manje putovanja i jednu trgovinu"
    }
  },
  "alternatives": {
    "greedy": {
      "totalCost": 17.16,
      "storesVisited": 2,
      "averageDistanceKm": 5.0,
      "score": 0.270,
      "storeNames": ["Lidl", "Kaufland"],
      "savingsVsRecommended": 3.21
    },
    "conservative": {
      "totalCost": 21.36,
      "storesVisited": 1,
      "averageDistanceKm": 1.0,
      "score": 0.150,
      "storeNames": ["Spar"],
      "additionalCostVsRecommended": 0.99
    }
  },
  "metadata": {
    "algorithmUsed": "exact_subset_enumeration",
    "computationTimeMs": 12,
    "storesConsidered": 4,
    "candidatesEvaluated": 7,
    "pricesAsOf": "2026-03-30T08:00:00Z"
  }
}
```

**Odgovor pri djelomičnoj dostupnosti:**

```json
{
  "recommendation": { },
  "unavailableProducts": [
    {
      "productId": "truffle-oil-250ml",
      "productName": "Tartufo ulje 250ml",
      "reason": "NOT_STOCKED_NEARBY",
      "nearestAvailableDistanceKm": 32.5
    }
  ],
  "warnings": ["PARTIAL_FULFILLMENT"]
}
```

### 7.2 Predmemoriranje

| Sloj | Što se sprema | TTL | Poništavanje |
|------|:-------------|:---:|:------------|
| Matrica cijena | Cijene proizvoda po trgovini | 1–6 sati | Webhook od scraper pipeline |
| Metapodaci trgovina | Koordinate, naziv, lanac, radno vrijeme | 24 sata | Dnevno osvježavanje |
| Udaljenosti korisnik → trgovina | Haversine udaljenosti za sesiju | Trajanje sesije | Ponovo izračunaj ako korisnik pomakne > 500 m |
| Rezultati optimizacije | Cijeli odgovor, ključ = hash(proizvodi + lokacijska ćelija + mod) | 15–30 min | Poništi pri ažuriranju cijena |
| Bitmap dostupnosti | Dostupnost po parovima (proizvod, trgovina) | 1–6 sati | Poravnato s osvježavanjem cijena |

**Grupiranje lokacija za ključeve predmemorije:** koordinate korisnika zaokružuju se na mrežu od ~200 m:

```
bucket_lat = round(lat × 200) / 200
bucket_lon = round(lon × 200) / 200
kljuc = hash(sortirani(id_proizvoda) + bucket_lat + bucket_lon + mod)
```

### 7.3 Procjena kvalitete

**Izvanmrežni KPI-ovi:**

| KPI | Definicija | Cilj |
|-----|-----------|:----:|
| Odstupanje od optimalnog | Postotak razlike između heurističkog i egzaktnog rješenja na uzorku | < 3% |
| Stopa pokrivenosti | Postotak košarica u kojima su svi proizvodi pronađeni | > 98% |
| Diferencijacija načina rada | Koliko se razlikuju izlazi različitih modova | > 30% |
| Latencija P95 | 95. percentil vremena odgovora | < 200 ms |

**Mrežni KPI-ovi (zahtijevaju podatke o interakciji korisnika):**

| KPI | Definicija | Cilj |
|-----|-----------|:----:|
| Stopa prihvaćanja preporuke | Postotak slučajeva kada korisnik slijedi preporučeni plan | > 40% |
| Stopa promjene načina rada | Postotak korisnika koji pregledaju alternativni mod | Praćenje za uvid |
| Stopa završetka košarice | Postotak korisnika koji kupe sve preporučene stavke | > 60% |
| Stopa povratka | Postotak korisnika koji ponovo koriste optimizator unutar 7 dana | > 30% |

---

## 8. Plan prve implementacije

### Korak 1 — Temelj podataka (1.–2. tjedan)

Izgradnja matrice cijena i baze podataka trgovina.

- Dizajn sheme: tablice `products`, `stores`, `prices` u PostgreSQL-u
- Implementacija scraper/import pipeline za hrvatske lance (Konzum, Lidl, Spar, Kaufland, Plodine, Studenac, Tommy)
- REST endpoint koji vraća filtriranu matricu cijena: `GET /api/v1/prices?productIds=...&lat=...&lon=...&radiusKm=15`
- Dodavanje stupca `in_stock` na tablicu cijena za brzu provjeru dostupnosti

### Korak 2 — Osnovna verzija algoritma (3. tjedan)

Implementacija algoritma iz ovog dokumenta koristeći **samo egzaktnu enumeraciju** (bez heuristike).

- Implementirati: `HAVERSINE`, `UKLONI-DOMINIRANE`, `EGZAKTNA-ENUMERACIJA`, `SIGURNA-NORMALIZACIJA`, `DOHVATI-TEZINE`
- Hardkodirane tri kombinacije težina za Greedy / Balanced / Conservative
- Izgradnja `POST /api/v1/cart/optimize` endpointa koji odgovara API ugovoru iz poglavlja 7.1
- Obrada rubnih slučajeva: nedostupni proizvodi, nedostajuće koordinate, jedan proizvod, izjednačenost

### Korak 3 — Testiranje i validacija (4. tjedan)

Provjera ispravnosti i performansi u realnim uvjetima.

- Jedinični testovi koji reproduciraju razrađeni primjer iz poglavlja 6 (točni očekivani izlazi za sva 3 moda)
- Generiranje 100 sintetičkih košarica (nasumičnih 5–30 proizvoda), provjera da egzaktna metoda radi < 100 ms za sve
- Provjera: Greedy uvijek vraća trošak ≤ Balanced ≤ Conservative
- Opterećenje: 50 istovremenih zahtjeva, P95 < 300 ms

### Korak 4 — Heuristička pričuva i produkcijsko ojačanje (5. tjedan)

Dodavanje heuristike za veće skupove trgovina i produkcijska infrastruktura.

- Implementacija `HEURISTIČKA-OPTIMIZACIJA` kao pričuve za slučaj kada je m' > 20
- Test odstupanja: na 1000 nasumičnih unosa (m' ≤ 20) usporedi heurističke i egzaktne rezultate; potvrdi da je razlika < 3%
- Dodavanje predmemoriranja odgovora (Redis, 15-minutni TTL, lokacijski grupirani ključevi)
- Strukturirano zapisivanje: veličina unosa, korišteni algoritam, vrijeme izračuna, odabrani mod, trošak rezultata

### Korak 5 — Povratna veza korisnika i podešavanje težina (6.+ tjedan)

Zatvaranje petlje s stvarnim podacima o ponašanju korisnika.

- Instrumentacija klijenta: prati koji mod korisnici biraju, prihvaćaju li preporuku i mijenjaju li mod
- Nakon 2 tjedna podataka: analiziraj stopu prihvaćanja po modu; ako je za neki mod < 25%, prilagodi težine za ±0,05 i ponovo implementiraj
- Postavljanje okvira za A/B testiranje za kontinuiranu optimizaciju težina
- Evaluacija dodavanja estimirane udaljenosti vožnje (umjesto ravne linije) ili "Prilagođenog" načina rada s klizačima za wc, wd, wk

---

*Ovaj dizajn daje optimalni algoritam za tipični slučaj (do 20 obližnjih trgovina), pouzdanu pričuvu za guste gradske zone, jasnu diferencijaciju načina rada s podešivim težinama, te konkretan put od prototipa do produkcije u otprilike 6 tjedana.*
