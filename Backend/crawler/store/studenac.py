import datetime
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, as_completed, wait
import logging
import re
from typing import Optional, Tuple

from lxml import etree  # type: ignore

from crawler.store.models import Store

from .base import BaseCrawler

logger = logging.getLogger(__name__)


class StudenacCrawler(BaseCrawler):
    """
    Crawler for Studenac store prices.

    This class handles downloading and parsing price data from Studenac's website.
    It fetches the ZIP file containing XML files for each store, extracts them,
    and parses the XML data to create a structured representation of stores and their products.
    """

    CHAIN = "studenac"
    BASE_URL = "https://www.studenac.hr"
    STORE_WORKERS = 4
    TIMEOUT = 120.0  # Longer timeout for ZIP download

    PRICE_MAP = {
        "price": ("MaloprodajnaCijena", False),
        "unit_price": ("CijenaPoJedinici", False),
        "special_price": ("MaloprodajnaCijenaAkcija", False),
        "best_price_30": ("NajnizaCijena", False),
        "anchor_price": ("SidrenaCijena", False),
    }

    FIELD_MAP = {
        "product": ("NazivProizvoda", False),
        "product_id": ("SifraProizvoda", True),
        "brand": ("MarkaProizvoda", False),
        "quantity": ("NetoKolicina", False),
        "unit": ("JedinicaMjere", False),
        "barcode": ("Barkod", False),
        "category": ("KategorijeProizvoda", False),
    }

    def parse_address(self, address: str) -> Tuple[str, str]:
        """
        Parse the address string into street address and city components.

        Args:
            address: Address string in format "<street> <number> <CITY>"

        Returns:
            Tuple of (street_address, city)
        """
        logger.debug("Parsing address: %s", address)

        try:
            # The regex matches the last set of uppercase words (city)
            # and everything before it (street address)
            pattern = r"^(.*?)([A-ZČĆĐŠŽ][A-ZČĆĐŠŽ\s]+)$"
            match = re.match(pattern, address)

            if match:
                street_address, city = match.groups()
                return (
                    street_address.strip().title(),
                    city.strip().title(),
                )

            logger.warning("Failed to parse address: %s", address)
            return address.strip().title(), ""
        except Exception as e:
            logger.warning("Error parsing address %s: %s", address, e, exc_info=True)
            return address.strip().title(), ""

    def parse_xml(self, xml_content: bytes) -> Optional[Store]:
        """
        Parse XML content into a unified Store object.

        Args:
            xml_content: XML content as bytes

        Returns:
            Store object with parsed store and product information,
            or None if parsing fails
        """
        try:
            root = etree.fromstring(xml_content)

            # Extract store information
            store_node = root.xpath("//ProdajniObjekt")[0]
            store_type = store_node.xpath("Oblik/text()")[0].lower()
            store_id = store_node.xpath("Oznaka/text()")[0]
            store_code = store_id
            address = store_node.xpath("Adresa/text()")[0]

            street_address, city = self.parse_address(address)

            store = Store(
                chain=self.CHAIN,
                name=f"Studenac {store_code}",
                store_type=store_type.lower(),
                store_id=store_id,
                city=city,
                street_address=street_address,
                items=[],
            )

            logger.debug(
                "Parsed store: %s (%s), %s, %s, %s",
                store.name,
                store_id,
                store.store_type,
                store.city,
                store.street_address,
            )

            # Extract product information
            products = []
            for product_elem in store_node.xpath("Proizvodi/Proizvod"):
                try:
                    product = self.parse_xml_product(product_elem)
                    products.append(product)
                except Exception as e:
                    logger.warning(
                        "Failed to parse product: %s: %s",
                        etree.tostring(product_elem),
                        e,
                        exc_info=True,
                    )
                    continue

            store.items = products
            logger.debug("Parsed %s products for store %s", len(products), store.name)
            return store

        except Exception as e:
            logger.error("Failed to parse XML: %s", e, exc_info=True)
            return None

    def get_all_products(self, date: datetime.date) -> list[Store]:
        """
        Main method to fetch and parse all products from Studenac's price lists.

        Args:
            date: The date for which to fetch the price list

        Returns:
            Tuple with the date and the list of Store objects,
            each containing its products.

        Raises:
            ValueError: If the price list cannot be fetched or parsed
        """
        stores = []
        zip_url = f"{self.BASE_URL}/cjenici/PROIZVODI-{date:%Y-%m-%d}.zip"

        def process_store_file(filename: str, content: bytes) -> Store | None:
            logger.debug("Processing file: %s", filename)
            return self.parse_xml(content)

        zip_entries = self.get_zip_contents(zip_url, ".xml")
        n_workers = self.STORE_WORKERS

        if n_workers <= 1:
            for filename, content in zip_entries:
                store = process_store_file(filename, content)
                if store:
                    stores.append(store)
            return stores

        logger.info("Processing Studenac ZIP entries with %s workers", n_workers)

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
    crawler = StudenacCrawler()
    stores = crawler.crawl(datetime.date.today())
    print(stores[0])
    print(stores[0].items[0])
