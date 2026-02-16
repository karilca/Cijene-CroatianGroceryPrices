import datetime
import logging
import os
import re
from urllib.parse import unquote

from bs4 import BeautifulSoup
from crawler.store.models import Product, Store

from .base import BaseCrawler

logger = logging.getLogger(__name__)


class ZabacCrawler(BaseCrawler):
    """Crawler for Žabac store prices."""

    CHAIN = "zabac"
    BASE_URL = "https://zabacfoodoutlet.hr/cjenik/"

    # Regex to parse store information from the filename
    # Format: Cjenik-Zabac-Food-Outlet-PJ-<store_id>-<address>.csv
    # Example: Cjenik-Zabac-Food-Outlet-PJ-11-Savska-Cesta-206.csv
    STORE_FILENAME_PATTERN = re.compile(r".*PJ-(?P<store_id>\d+)-(?P<address>.+?)(?:_\d+)*\.csv$")
    NEW_FILENAME_PATTERN = re.compile(
        r"Supermarket(?P<street>.+)-(?P<number>[^-]+)-(?P<city>[^-]+)-(?P<zip>\d+)-.+-((?P<id>[^-]+))\.csv$"
    )

    # Mapping for price fields from CSV columns
    # Mapping for price fields from CSV columns
    PRICE_MAP = {
        # field: (column_name, is_required)
        "price": ("Mpc", False),
        "unit_price": ("Mpc", False),  # Use same as price
    }

    # Mapping for other product fields from CSV columns
    FIELD_MAP = {
        "product_id": ("Artikl", True),
        "barcode": ("Barcode", False),
        "product": ("Naziv artikla / usluge", True),
        "brand": ("Marka", False),
        "quantity": ("Gramaža", False),
        "category": ("Naziv grupe artikla", False),
    }

    def parse_index(self, content: str) -> list[str]:
        """
        Parse the Žabac index page to extract CSV links.

        Args:
            content: HTML content of the index page

        Returns:
            List of absolute CSV URLs on the page
        """
        soup = BeautifulSoup(content, "html.parser")
        urls = []

        for link_tag in soup.select('a[href$=".csv"]'):
            href = str(link_tag.get("href"))
            urls.append(href)

        return list(set(urls))  # Return unique URLs

    def parse_store_info(self, url: str) -> Store:
        """
        Extracts store information from a CSV download URL.

        Example URL:
        https://zabacfoodoutlet.hr/wp-content/uploads/2025/05/Cjenik-Zabac-Food-Outlet-PJ-11-Savska-Cesta-206.csv
        https://zabacfoodoutlet.hr/wp-content/uploads/2026/01/SupermarketDubrava-256L-Zagreb-10000-16.1.2026-7.00h-C164.csv

        Args:
            url: CSV download URL with store information in the filename

        Returns:
            Store object with parsed store information
        """
        logger.debug(f"Parsing store information from Zabac URL: {url}")

        filename = unquote(os.path.basename(url))

        check_match = self.STORE_FILENAME_PATTERN.match(filename)
        if check_match:
            data = check_match.groupdict()
            store_id = data["store_id"]
            # Address: "Savska-Cesta-206" -> "Savska Cesta 206"
            address_raw = data["address"]
            street_address = address_raw.replace("-", " ")

            store = Store(
                chain=self.CHAIN,
                store_type="",
                store_id=f"PJ-{store_id}",
                name=f"Žabac PJ-{store_id}",
                street_address=street_address,
                zipcode="",
                city="",
                items=[],
            )
            logger.info(
                f"Parsed Žabac store: {store.name}, Address: {store.street_address}"
            )
            return store

        match_new = self.NEW_FILENAME_PATTERN.match(filename)
        if match_new:
            data = match_new.groupdict()
            street = data["street"]
            number = data["number"]
            city = data["city"]
            zip_code = data["zip"]
            store_id = data["id"]
            
            street_address = f"{street} {number}"
            
            store = Store(
                 chain=self.CHAIN,
                 store_type="supermarket",
                 store_id=f"SM-{store_id}",
                 name=f"Žabac {city} {street}",
                 street_address=street_address,
                 zipcode=zip_code,
                 city=city,
                 items=[]
            )
            logger.info(
                f"Parsed Žabac store (new format): {store.name}, Address: {store.street_address}"
            )
            return store

        raise ValueError(f"Invalid CSV filename format for Zabac: {filename}")

    def get_store_prices(self, csv_url: str) -> list[Product]:
        """
        Fetch and parse store prices from a Žabac CSV URL.
        The CSV is semicolon-separated and windows-1250 encoded.

        Args:
            csv_url: URL to the CSV file containing prices

        Returns:
            List of Product objects
        """
        try:
            content = self.fetch_text(csv_url, encodings=["windows-1250", "utf-8"])
            return self.parse_csv(content, delimiter=",")
        except Exception as e:
            logger.error(
                f"Failed to get Žabac store prices from {csv_url}: {e}",
                exc_info=True,
            )
            return []

    def get_index(self, date: datetime.date) -> list[str]:
        """
        Fetch and parse the Žabac index page to get CSV URLs.

        Note: Žabac only shows current CSV files, so the date parameter is ignored.

        Args:
            date: The date parameter (ignored for Žabac)

        Returns:
            List of all CSV URLs available on the index page.
        """
        logger.warning(
            f"Žabac crawler ignores date parameter ({date:%Y-%m-%d}) - "
            "only current CSV files are available"
        )

        content = self.fetch_text(self.BASE_URL)

        if not content:
            logger.warning(f"No content found at Žabac index URL: {self.BASE_URL}")
            return []

        all_urls = self.parse_index(content)

        if not all_urls:
            logger.warning("No Žabac CSV URLs found on index page")

        return all_urls

    def get_all_products(self, date: datetime.date) -> list[Store]:
        """
        Main method to fetch and parse all Žabac store, product, and price info.

        Note: Date parameter is ignored as Žabac only provides current prices.

        Args:
            date: The date parameter (ignored for Žabac)

        Returns:
            List of Store objects with their products.
        """
        csv_links = self.get_index(date)

        if not csv_links:
            logger.warning("No Žabac CSV links found")
            return []

        stores = []
        for url in csv_links:
            try:
                store = self.parse_store_info(url)
                products = self.get_store_prices(url)
            except ValueError as ve:
                logger.error(
                    f"Skipping store due to parsing error from URL {url}: {ve}",
                    exc_info=False,
                )
                continue
            except Exception as e:
                logger.error(
                    f"Error processing Žabac store from {url}: {e}", exc_info=True
                )
                continue

            if not products:
                logger.warning(f"No products found for Žabac store at {url}, skipping.")
                continue

            store.items = products
            stores.append(store)

        return stores

    def fix_product_data(self, data: dict) -> dict:
        """
        Clean and fix Žabac-specific product data.

        Args:
            data: Dictionary containing the row data

        Returns:
            The cleaned data
        """
        if "product" in data and data["product"]:
            data["product"] = data["product"].strip()

        # Ensure required fields are present
        if not data.get("unit"):
            data["unit"] = "kom"
            
        if not data.get("brand"):
            data["brand"] = ""
            
        if not data.get("quantity"):
            data["quantity"] = ""
            
        if not data.get("category"):
            data["category"] = ""

        # Call parent method for common fixups
        return super().fix_product_data(data)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    crawler = ZabacCrawler()
    stores = crawler.crawl(datetime.date.today())
    print(stores[0])
    print(stores[0].items[0])
