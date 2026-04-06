import datetime
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, as_completed, wait
import logging
import os
from typing import List

from bs4 import BeautifulSoup
from crawler.store.models import Product, Store

from .base import BaseCrawler

logger = logging.getLogger(__name__)


class EurospinCrawler(BaseCrawler):
    """Crawler for Eurospin store prices."""

    CHAIN = "eurospin"
    BASE_URL = "https://www.eurospin.hr"
    INDEX_URL = f"{BASE_URL}/cjenik/"
    STORE_WORKERS = 4

    # Mapping for price fields
    PRICE_MAP = {
        # field: (column, is_required)
        "price": ("MALOPROD.CIJENA(EUR)", True),
        "unit_price": ("CIJENA_ZA_JEDINICU_MJERE", True),
        "special_price": ("MPC_POSEB.OBLIK_PROD", False),
        "best_price_30": ("NAJNIŽA_MPC_U_30DANA", False),
        "anchor_price": ("SIDRENA_CIJENA", False),
    }

    # Mapping for other fields
    FIELD_MAP = {
        "product": ("NAZIV_PROIZVODA", True),
        "product_id": ("ŠIFRA_PROIZVODA", True),
        "brand": ("MARKA_PROIZVODA", False),
        "quantity": ("NETO_KOLIČINA", False),
        "unit": ("JEDINICA_MJERE", False),
        "barcode": ("BARKOD", False),
        "category": ("KATEGORIJA_PROIZVODA", False),
    }

    STORE_ID_MAP = {
        "Ulica hrvatskog preporoda 70 Dugo Selo": "310032",
        "Ulica Rimske centurijacije 100": "310013",
        "Ulica Juraja Dobrile 1C": "310006",
        "Zagrebacka ul 49G": "310012",
        "Gacka ulica 70": "310017",
        "Ulica Istarskih narodnjaka 17 Stop Shop": "310027",
        "Zagrebacka cesta 162A": "310018",
        "Ulica Ote Horvata 1 33000 Virovitica": "310036",
        "Cesta Dalmatinskih brigada 7a": "310030",
        "Celine 2": "310009",
        "Ulica Mate Vlašica 51A": "310010",
        "Koprivnicka ulica 34A": "310033",
        "Ulica Furicevo 20": "310016",
        "Zvonarska ulica 63": "310035",
        "Ulica Petra Svacica 2B": "310014",
        "Zagrebacka 52": "310004",
        "Ulica Matije Gupca 59": "310021",
        "Ulica Mihovila P Miškine 5": "310024",
        "4 Gardijske Brigade 1": "310003",
        "Ulica hrvatskih branitelja 2": "310005",
        "Ulica Ante Starcevica 20": "310019",
        "I Štefanovecki zavoj 12": "310002",
        "Štrmac 303": "310026",
        "Ljudevita Šestica 7": "310037",
        "Ulica Vlahe Paljetka 7": "310011",
        "Ulica Veceslava Holjevca 15": "310034",
        "Stop shop": "310028",
        "Solinska ulica 84": "310015",
        "Obrtnicka ulica 2": "310008",
        "Ulica kralja Tomislava 47A": "310007",
        "Žutska ulica broj 1": "310023",
    }

    def parse_index(self, content: str) -> list[str]:
        """
        Parse the Eurospin index page to extract ZIP links.

        Args:
            content: HTML content of the index page

        Returns:
            List of ZIP urls on the page
        """
        soup = BeautifulSoup(content, "html.parser")
        urls = []

        csv_options = soup.select("option[value$='.zip']")
        for option in csv_options:
            href = str(option.get("value"))
            if href.startswith(("http://", "https://")):
                urls.append(href)
            else:
                urls.append(f"{self.BASE_URL}{href}")

        return list(dict.fromkeys(urls))

    def parse_store_info(self, url: str) -> Store:
        """
        Extracts store information from a CSV download URL.

        Example filename:
            supermarket-Zvonarska_ulica_63-Vinkovci-32100-23.05.2025-7.30.csv:
        https://www.eurospin.hr/wp-content/themes/eurospin/documenti-prezzi/supermarket-310037-Ljudevita_Šestica_7-Karlovac-123456-21.05.2025-7.30.csv

        Args:
            url: CSV download URL with store information in the filename

        Returns:
            Store object with parsed store information
        """
        logger.debug("Parsing store information from URL: %s", url)

        filename = os.path.basename(url)
        parts = filename.split("-")

        if len(parts) < 6:
            raise ValueError(f"Invalid CSV filename format: {filename}")

        if len(parts) == 6:
            addr = parts[1].replace("_", " ")
            store_id = self.STORE_ID_MAP.get(addr, addr)
            logger.debug(
                "Store ID missing, assuming '%s' based on address '%s'",
                store_id,
                addr,
            )
            parts.insert(1, store_id)

        store_type = parts[0].lower()
        store_id = parts[1]
        street_address = parts[2].replace("_", " ")
        city = parts[3]

        # Valid zipcode is 5 digits
        zipcode = parts[4] if len(parts[4]) == 5 and parts[4].isdigit() else ""

        store = Store(
            chain=self.CHAIN,
            store_type=store_type,
            store_id=store_id,
            name=f"{self.CHAIN.capitalize()} {city}",
            street_address=street_address,
            zipcode=zipcode,
            city=city,
            items=[],
        )

        logger.info(
            "Parsed store: %s, %s, %s, %s",
            store.store_type,
            store.street_address,
            store.zipcode,
            store.city,
        )
        return store

    def get_store_prices(self, content: bytes) -> List[Product]:
        """
        Fetch and parse store prices from a CSV URL.

        Args:
            csv_url: URL to the CSV file containing prices

        Returns:
            List of Product objects
        """
        try:
            return list(self.parse_csv(content.decode("windows-1250"), delimiter=";"))
        except Exception as e:
            logger.error("Failed to get store prices: %s", e, exc_info=True)
            return []

    def get_index(self, date: datetime.date) -> str | None:
        """
        Fetch and parse the index page to get ZIP URL for the specified date.

        Args:
            date: The date to search for in the price list.

        Returns:
            URL to the zip file containing CSVs with prices, or None if not found.
        """
        content = self.fetch_text(self.INDEX_URL)

        if not content:
            logger.warning("No content found at %s", self.INDEX_URL)
            return None

        all_urls = self.parse_index(content)
        date_str = f"{date.day:02d}.{date.month:02d}.{date.year}"

        for url in all_urls:
            filename = os.path.basename(url)
            if date_str in filename:
                return url
        else:
            logger.warning("No URLs found matching date %s", date_str)
            return None

    def get_all_products(self, date: datetime.date) -> list[Store]:
        """
        Main method to fetch and parse all store, product and price info.

        Args:
            date: The date to search for in the price list.

        Returns:
            List of Store objects with their products.

        Raises:
            ValueError: If no price list is found for the given date.
        """
        zip_url = self.get_index(date)

        if not zip_url:
            logger.warning("ZIP archive URL not found for date %s", date)
            return []

        stores = []

        def process_store_file(filename: str, content: bytes) -> Store | None:
            try:
                store = self.parse_store_info(filename)
                products = self.get_store_prices(content)
            except Exception as e:
                logger.error(
                    "Error processing store from %s: %s",
                    filename,
                    e,
                    exc_info=True,
                )
                return None

            if not products:
                logger.warning("No products found in %s, skipping", filename)
                return None

            store.items = products
            return store

        zip_entries = self.get_zip_contents(zip_url, ".csv")
        n_workers = self.STORE_WORKERS

        if n_workers <= 1:
            for filename, content in zip_entries:
                store = process_store_file(filename, content)
                if store:
                    stores.append(store)
            return stores

        logger.info("Processing Eurospin ZIP entries with %s workers", n_workers)

        with ThreadPoolExecutor(max_workers=n_workers) as executor:
            inflight: set[Future[Store | None]] = set()

            for filename, content in zip_entries:
                if len(inflight) >= n_workers:
                    done, inflight = wait(inflight, return_when=FIRST_COMPLETED)
                    for future in done:
                        store = future.result()
                        if store:
                            stores.append(store)

                inflight.add(executor.submit(process_store_file, filename, content))

            for future in as_completed(inflight):
                store = future.result()
                if store:
                    stores.append(store)

        return stores


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    crawler = EurospinCrawler()
    stores = crawler.crawl(datetime.date.today())
    print(stores[0])
    print(stores[0].items[0])
