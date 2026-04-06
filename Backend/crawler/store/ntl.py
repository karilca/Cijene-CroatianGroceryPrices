import datetime
import logging
import os
import re
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, as_completed, wait
from urllib.parse import unquote, quote_plus

from bs4 import BeautifulSoup
from crawler.store.models import Product, Store

from .base import BaseCrawler

logger = logging.getLogger(__name__)


class NtlCrawler(BaseCrawler):
    """Crawler for NTL store prices."""

    CHAIN = "ntl"
    BASE_URL = "https://ntl.hr/cjenik"
    STORE_WORKERS = 8
    HISTORY_LOOKUP_WORKERS = 8

    # Regex to parse store information from the filename
    # Format: Supermarket_Ljudevita Gaja 1_DUGA RESA_10103_263_25052025_07_22_36.csv
    STORE_FILENAME_PATTERN = re.compile(
        r"(?P<store_type>[^_]+)_(?P<street_address>[^_]+)_(?P<city>[^_]+)_(?P<store_id>\d+)_.*\.csv$"
    )

    # Mapping for price fields from CSV columns
    PRICE_MAP = {
        # field: (column_name, is_required)
        "price": ("Maloprodajna cijena", False),
        "unit_price": ("Cijena za jedinicu mjere", False),
        "special_price": ("MPC za vrijeme posebnog oblika prodaje", False),
        "anchor_price": ("Sidrena cijena na 2.5.2025", False),
    }

    # Mapping for other product fields from CSV columns
    FIELD_MAP = {
        "product_id": ("Šifra proizvoda", True),
        "barcode": ("Barkod", False),
        "product": ("Naziv proizvoda", True),
        "brand": ("Marka proizvoda", False),
        "quantity": ("Neto količina", False),
        "unit": ("Jedinica mjere", False),
        "category": ("Kategorija proizvoda", False),
    }

    def parse_index(self, content: str) -> list[str]:
        """
        Parse the NTL index page to extract CSV links.

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

        return list(dict.fromkeys(urls))  # Return unique URLs

    def get_store_list(self) -> list[str]:
        """
        Get list of all available stores from the main page dropdown.

        Returns:
            List of store names
        """
        content = self.fetch_text(self.BASE_URL)
        if not content:
            logger.warning("No content found at NTL index URL: %s", self.BASE_URL)
            return []

        soup = BeautifulSoup(content, "html.parser")
        stores = []

        select_element = soup.find("select")
        if not select_element:
            logger.warning("No store dropdown found on the NTL index page")
            return []

        options = select_element.select("option[value]")
        for option in options:
            store_value = option.get("value", "").strip()
            if store_value and not store_value.startswith("Odaberi"):
                stores.append(store_value)

        logger.info("Found %s stores in NTL dropdown", len(stores))
        return stores

    def get_historical_csv_for_date(
        self,
        store_name: str,
        target_date: datetime.date,
    ) -> str | None:
        """
        Get historical CSV URL for a specific store and date.

        Args:
            store_name: Store name from dropdown
            target_date: Date to find CSV for

        Returns:
            CSV URL if found, None if not available
        """
        archive_url = f"{self.BASE_URL}?pageName=archeive&archive_file_name={quote_plus(store_name)}"
        logger.debug("Fetching archive page for %s: %s", store_name, archive_url)

        try:
            content = self.fetch_text(archive_url)
            if not content:
                logger.warning("No content found at archive URL: %s", archive_url)
                return None

            soup = BeautifulSoup(content, "html.parser")

            target_date_str = target_date.strftime("%d-%m-%Y")

            for row in soup.select("table tr"):
                cells = row.find_all("td")
                if len(cells) >= 4:  # Expect at least 4 cells: #, store, date, download
                    date_cell = cells[2].get_text().strip()
                    if date_cell == target_date_str:
                        # Find the download link in the last cell
                        download_link = cells[-1].select_one("a[href$='.csv']")
                        if download_link:
                            csv_url = download_link.get("href")
                            logger.info(
                                "Found historical CSV for %s on %s: %s",
                                store_name,
                                target_date_str,
                                csv_url,
                            )
                            return csv_url

            logger.debug("No historical data found for %s on %s", store_name, target_date_str)
            return None

        except Exception as e:
            logger.error(
                "Error fetching historical data for %s: %s",
                store_name,
                e,
                exc_info=True,
            )
            return None

    def parse_store_info(self, url: str) -> Store:
        """
        Extracts store information from a CSV download URL.

        Example URL:
        https://www.ntl.hr/csv_files/Supermarket_Ljudevita Gaja 1_DUGA RESA_10103_263_25052025_07_22_36.csv

        Args:
            url: CSV download URL with store information in the filename

        Returns:
            Store object with parsed store information
        """
        logger.debug("Parsing store information from NTL URL: %s", url)

        filename = unquote(os.path.basename(url))

        match = self.STORE_FILENAME_PATTERN.match(filename)
        if not match:
            raise ValueError(f"Invalid CSV filename format for NTL: {filename}")

        data = match.groupdict()

        store_type = data["store_type"].lower()
        street_address = data["street_address"]
        city = data["city"].title()
        store_id = data["store_id"]

        store = Store(
            chain=self.CHAIN,
            store_type=store_type,
            store_id=store_id,
            name=f"NTL {city}",
            street_address=street_address,
            zipcode="",  # Zipcode is not available in the filename
            city=city,
            items=[],
        )

        logger.info(
            "Parsed NTL store: %s, Address: %s, City: %s",
            store.name,
            store.street_address,
            store.city,
        )
        return store

    def get_store_prices(self, csv_url: str) -> list[Product]:
        """
        Fetch and parse store prices from an NTL CSV URL.
        The CSV is semicolon-separated and windows-1250 encoded.

        Args:
            csv_url: URL to the CSV file containing prices

        Returns:
            List of Product objects
        """
        try:
            content = self.fetch_text(csv_url, encodings=["windows-1250"])
            return list(self.parse_csv(content, delimiter=";"))
        except Exception as e:
            logger.error(
                "Failed to get NTL store prices from %s: %s",
                csv_url,
                e,
                exc_info=True,
            )
            return []

    def get_index(self, date: datetime.date) -> list[str]:
        """
        Fetch and parse the NTL index page to get CSV URLs.

        Args:
            date: The date to fetch CSV files for

        Returns:
            List of CSV URLs available for the given date.
        """
        today = datetime.date.today()

        if date == today:
            logger.info("Fetching current CSV files for today (%s)", f"{date:%Y-%m-%d}")

            content = self.fetch_text(self.BASE_URL)
            if not content:
                logger.warning("No content found at NTL index URL: %s", self.BASE_URL)
                return []

            all_urls = self.parse_index(content)
            if not all_urls:
                logger.warning("No NTL CSV URLs found on index page")

            return all_urls
        else:
            logger.info("Fetching historical CSV files for date (%s)", f"{date:%Y-%m-%d}")

            stores = self.get_store_list()
            if not stores:
                logger.warning("No stores found in dropdown")
                return []

            historical_urls = []
            n_workers = min(self.HISTORY_LOOKUP_WORKERS, len(stores))
            if n_workers <= 1:
                for store_name in stores:
                    csv_url = self.get_historical_csv_for_date(store_name, date)
                    if csv_url:
                        historical_urls.append(csv_url)
            else:
                logger.info(
                    "Looking up historical NTL CSVs for %s stores with %s workers",
                    len(stores),
                    n_workers,
                )

                def lookup_store(store_name: str) -> str | None:
                    return self.get_historical_csv_for_date(store_name, date)

                with ThreadPoolExecutor(max_workers=n_workers) as executor:
                    inflight: set[Future[str | None]] = set()

                    for store_name in stores:
                        if len(inflight) >= n_workers:
                            done, inflight = wait(inflight, return_when=FIRST_COMPLETED)
                            for future in done:
                                csv_url = future.result()
                                if csv_url:
                                    historical_urls.append(csv_url)

                        inflight.add(executor.submit(lookup_store, store_name))

                    for future in as_completed(inflight):
                        csv_url = future.result()
                        if csv_url:
                            historical_urls.append(csv_url)

            if not historical_urls:
                raise ValueError(f"No stores found for date {date:%Y-%m-%d}")

            logger.info(
                "Found %s historical CSV files for %s",
                len(historical_urls),
                f"{date:%Y-%m-%d}",
            )
            return historical_urls

    def _process_store_url(self, url: str) -> Store | None:
        try:
            store = self.parse_store_info(url)
            products = self.get_store_prices(url)
        except ValueError as ve:
            logger.error(
                f"Skipping store due to parsing error from URL {url}: {ve}",
                exc_info=False,
            )
            return None
        except Exception as e:
            logger.error("Error processing NTL store from %s: %s", url, e, exc_info=True)
            return None

        if not products:
            logger.warning("No products found for NTL store at %s, skipping.", url)
            return None

        store.items = products
        return store

    def get_all_products(self, date: datetime.date) -> list[Store]:
        """
        Main method to fetch and parse all NTL store, product, and price info.

        Args:
            date: The date to fetch data for

        Returns:
            List of Store objects with their products.
        """
        csv_links = self.get_index(date)

        if not csv_links:
            logger.warning("No NTL CSV links found for date %s", f"{date:%Y-%m-%d}")
            return []

        stores = []

        n_workers = min(self.STORE_WORKERS, len(csv_links))
        if n_workers <= 1:
            for url in csv_links:
                store = self._process_store_url(url)
                if store:
                    stores.append(store)
            return stores

        logger.info(
            "Processing %s NTL stores with %s workers",
            len(csv_links),
            n_workers,
        )

        with ThreadPoolExecutor(max_workers=n_workers) as executor:
            inflight: set[Future[Store | None]] = set()

            for url in csv_links:
                if len(inflight) >= n_workers:
                    done, inflight = wait(inflight, return_when=FIRST_COMPLETED)
                    for future in done:
                        store = future.result()
                        if store:
                            stores.append(store)

                inflight.add(executor.submit(self._process_store_url, url))

            for future in as_completed(inflight):
                store = future.result()
                if store:
                    stores.append(store)

        return stores

    def fix_product_data(self, data: dict) -> dict:
        """
        Clean and fix NTL-specific product data.

        Args:
            data: Dictionary containing the row data

        Returns:
            The cleaned data
        """
        if "product" in data and data["product"]:
            data["product"] = data["product"].strip()

        # Call parent method for common fixups
        return super().fix_product_data(data)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    crawler = NtlCrawler()
    stores = crawler.crawl(datetime.date.today())
    print(stores[0])
    print(stores[0].items[0])
